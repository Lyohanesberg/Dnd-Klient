
import { GoogleGenAI, Chat, Content, FunctionDeclaration, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Character, Message, Sender } from '../types';

const API_KEY = process.env.API_KEY || '';

// Initialize the client safely
let ai: GoogleGenAI | null = null;
try {
  if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } else {
    console.warn("API_KEY is missing in environment variables.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI:", error);
}

// --- RETRY LOGIC ---

const retryRequest = async <T>(
  fn: () => Promise<T>, 
  retries: number = 3, 
  delay: number = 2000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check for Rate Limit (429) or Service Unavailable (503)
    const errorCode = error?.status || error?.code || error?.response?.status;
    
    // Sometimes the error object structure varies, check message too
    const isRateLimit = errorCode === 429 || errorCode === 503 || 
                        (error?.message && error.message.includes('429'));

    if (isRateLimit && retries > 0) {
      console.warn(`Gemini API Rate Limit (${errorCode}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// --- TOOLS DEFINITIONS ---

const updateHpTool: FunctionDeclaration = {
  name: 'update_hp',
  description: 'Updates the character\'s current HP. Use negative numbers for damage, positive for healing.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.INTEGER,
        description: 'The amount of HP to change. E.g., -5 for damage, 5 for healing.',
      },
      reason: {
        type: Type.STRING,
        description: 'Short explanation for the log (e.g., "Goblin arrow", "Healing potion").',
      },
    },
    required: ['amount', 'reason'],
  },
};

const modifyInventoryTool: FunctionDeclaration = {
  name: 'modify_inventory',
  description: 'Adds or removes an item from the character\'s inventory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      item: {
        type: Type.STRING,
        description: 'The name of the item.',
      },
      action: {
        type: Type.STRING,
        enum: ['add', 'remove'],
        description: 'Whether to add or remove the item.',
      },
    },
    required: ['item', 'action'],
  },
};

const requestRollTool: FunctionDeclaration = {
  name: 'request_roll',
  description: 'Requests the player to make a die roll (Ability Check, Saving Throw, or Attack Roll). Use this when the outcome is uncertain. The game pauses until the user rolls.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      ability: { 
        type: Type.STRING, 
        description: 'The ability score to use (strength, dexterity, constitution, intelligence, wisdom, charisma) or "initiative".' 
      },
      skill: { 
        type: Type.STRING, 
        description: 'Optional skill (athletics, perception, stealth, etc.).' 
      },
      dc: { 
        type: Type.INTEGER, 
        description: 'Target Difficulty Class (DC).' 
      },
      reason: { 
        type: Type.STRING, 
        description: 'Short explanation for the user (e.g., "To lift the rock", "To dodge the trap").' 
      }
    },
    required: ['ability', 'reason']
  }
};

const updateLocationTool: FunctionDeclaration = {
  name: 'update_location',
  description: 'Updates the current location/scene. Use this when the characters move to a new significant area to generate a new background.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the location (e.g. "The Prancing Pony", "Dark Forest")' },
      description: { type: Type.STRING, description: 'Visual description for image generation.' }
    },
    required: ['name', 'description']
  }
};

const updateQuestTool: FunctionDeclaration = {
  name: 'update_quest',
  description: 'Adds a new quest or updates an existing one. Use this to track objectives.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Short title of the quest.' },
      description: { type: Type.STRING, description: 'Brief description of the objective.' },
      status: { 
        type: Type.STRING, 
        enum: ['active', 'completed', 'failed'],
        description: 'Current status of the quest.' 
      },
      id: { type: Type.STRING, description: 'Unique ID for the quest. Use "new" for a new quest, or pass the existing title to update it.' }
    },
    required: ['title', 'status', 'id']
  }
};

const addNoteTool: FunctionDeclaration = {
  name: 'add_note',
  description: 'Adds a note to the player\'s journal about an important NPC, location, or lore fact. Use this to "remember" key details for the player.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the note (e.g., "Count Strahd", "The Golden Key").' },
      content: { type: Type.STRING, description: 'The details to remember.' },
      type: { 
        type: Type.STRING, 
        enum: ['npc', 'location', 'lore', 'other'],
        description: 'Category of the note.' 
      }
    },
    required: ['title', 'content', 'type']
  }
};

const manageCombatTool: FunctionDeclaration = {
  name: 'manage_combat',
  description: 'Manages the combat tracker UI. Use this to start combat, update initiative order/health status, or end combat.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['start', 'end', 'update'],
        description: 'start: opens tracker. end: closes tracker. update: refreshes the list of combatants.',
      },
      combatants: {
        type: Type.ARRAY,
        description: 'List of combatants. Required for "update".',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            initiative: { type: Type.INTEGER },
            type: { type: Type.STRING, enum: ['player', 'enemy', 'ally'] },
            isCurrentTurn: { type: Type.BOOLEAN },
            hpStatus: { type: Type.STRING, description: 'Optional status like "Здоровий", "Поранений", "При смерті"' }
          },
          required: ['name', 'initiative', 'type']
        }
      }
    },
    required: ['action']
  }
};

const dmTools = [updateHpTool, modifyInventoryTool, requestRollTool, updateLocationTool, updateQuestTool, addNoteTool, manageCombatTool];

// ------------------------

// Helper to calculate D&D 5e Modifiers from Scores
const getMod = (score: number): string => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const getSystemInstruction = (character: Character, summary?: string): string => {
  const summarySection = summary 
    ? `\n### 0. ІСТОРІЯ ПРИГОД (КОНТЕКСТ)\nОсь короткий підсумок того, що сталося раніше. Використовуй це, щоб пам'ятати події:\n${summary}\n` 
    : "";

  return `
Ти — професійний Майстер Підземель (Dungeon Master, DM) для гри Dungeons & Dragons 5th Edition (SRD).
Твоя мова — Українська. Твій стиль — атмосферний, справедливий, але суворий щодо правил.
${summarySection}
### 1. ДЕТАЛІ ПЕРСОНАЖА
Гравець керує героєм:
- **Ім'я:** ${character.name}
- **Раса/Клас:** ${character.race} ${character.class} (${character.level} рівень)
- **Зовнішність:** ${character.appearance}
- **Стан здоров'я:** HP ${character.hp}/${character.maxHp} (Поточні/Макс). Якщо HP = 0, персонаж непритомний.
- **Захист (AC):** ${character.ac}
- **Характеристики:** STR ${character.stats.strength}, DEX ${character.stats.dexterity}, CON ${character.stats.constitution}, INT ${character.stats.intelligence}, WIS ${character.stats.wisdom}, CHA ${character.stats.charisma}.
- **Інвентар:** ${character.inventory.join(', ')}.

### 2. КЕРУВАННЯ СТАНОМ ГРИ (Functions)
Ти маєш повний контроль над світом через інструменти. ВИКОРИСТОВУЙ ЇХ АКТИВНО.
- **HP/Інвентар:** \`update_hp\`, \`modify_inventory\`.
- **Кидки:** \`request_roll\` (для Атаки, Перевірок, Рятувальних кидків).
- **Світ:** \`update_location\` (при зміні сцени).
- **Квести:** \`update_quest\` (видача або оновлення завдань).
- **Пам'ять/Журнал:** \`add_note\`. Якщо гравець дізнається ім'я важливого NPC, назву міста або частину легенди — ОБОВ'ЯЗКОВО запиши це в журнал. Це твоя "пам'ять".
- **Бій:** \`manage_combat\` (для відображення ініціативи та ходу бою).

### 3. ПРАВИЛА ГРИ
- Не грай за гравця. Опиши ситуацію і запитай: "Що ти робиш?".
- Використовуй Markdown для форматування.
- Будь уважним до деталей. Якщо гравець записує щось у журнал, використовуй \`add_note\`.

### 4. БІЙ (Combat Mode)
1. Початок: \`manage_combat(action='start')\`.
2. Ініціатива: \`request_roll(ability="initiative")\`.
3. Оновлення: \`manage_combat(action='update', combatants=[...])\`.
4. Кінець: \`manage_combat(action='end')\`.

Починай гру.
`;
};

const MODEL_CONFIG = {
  temperature: 0.9,
  topK: 40,
  topP: 0.95,
};

// Wrapper to safely send messages with retry logic
export const sendWithRetry = async (chat: Chat, message: any): Promise<GenerateContentResponse> => {
  return retryRequest(() => chat.sendMessage({ message }));
};

export const createDMSession = async (character: Character, summary?: string): Promise<Chat | null> => {
  if (!ai) return null;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: getSystemInstruction(character, summary),
        tools: [{ functionDeclarations: dmTools }],
        ...MODEL_CONFIG
      }
    });
    
    return chat;
  } catch (error) {
    console.error("Error creating chat session:", error);
    return null;
  }
};

export const resumeDMSession = async (character: Character, messages: Message[], summary?: string): Promise<Chat | null> => {
  if (!ai) return null;

  // Convert app Message format to Gemini Content format
  const history: Content[] = messages
    .filter(msg => !msg.isError)
    .map(msg => {
      let role = 'user';
      let text = msg.text;

      if (msg.sender === Sender.AI) {
        role = 'model';
      } else if (msg.sender === Sender.System) {
        role = 'user';
        text = `[System Info]: ${msg.text}`;
      }

      return {
        role: role,
        parts: [{ text: text }]
      };
    });

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: getSystemInstruction(character, summary),
        tools: [{ functionDeclarations: dmTools }],
        ...MODEL_CONFIG
      },
      history: history
    });
    
    return chat;
  } catch (error) {
    console.error("Error resuming chat session:", error);
    return null;
  }
};

export const generateCharacterAvatar = async (character: Character): Promise<string | null> => {
  if (!ai) return null;

  const importantItems = character.inventory.slice(0, 4).join(', ');
  
  const prompt = `
    Dungeons and Dragons character portrait.
    Race: ${character.race}.
    Class: ${character.class}.
    
    PHYSICAL APPEARANCE (Must preserve): ${character.appearance || 'Heroic, detailed face'}.
    
    CURRENT EQUIPMENT (Must display):
    Wearing/Holding: ${importantItems}.
    
    Style: High quality digital fantasy painting, semi-realistic, dramatic lighting, concept art style, oil painting texture, detailed background.
    Shot: Upper body or portrait.
  `;

  try {
    const response = await retryRequest(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    }));

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      const base64ImageBytes = part.inlineData.data;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating character avatar:", error);
    return null;
  }
};

export const generateLocationImage = async (description: string): Promise<string | null> => {
  if (!ai) return null;

  const prompt = `
    Top-down Tabletop RPG Battle Map.
    Scene: ${description}.
    
    Perspective: Orthographic top-down view (90 degrees), perfect for a 2D grid.
    Style: High quality fantasy digital art, detailed textures, neutral lighting, realistic scale.
    Constraint: NO GRID LINES on the image (grid is applied by overlay). NO UI elements.
    The image should look like a playable battle map for D&D.
  `;

  try {
    const response = await retryRequest(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    }));

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      const base64ImageBytes = part.inlineData.data;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating location image:", error);
    return null;
  }
};

export const generateStorySummary = async (currentSummary: string, recentMessages: Message[]): Promise<string> => {
  if (!ai) return currentSummary;

  const conversationText = recentMessages
    .map(m => `${m.sender === Sender.User ? 'Player' : m.sender === Sender.AI ? 'DM' : 'System'}: ${m.text}`)
    .join('\n');

  const prompt = `
    Act as a scribe summarizing a D&D session.
    
    PREVIOUS SUMMARY:
    ${currentSummary || "The adventure has just begun."}
    
    NEW EVENTS:
    ${conversationText}
    
    TASK:
    Update the summary to include the new events. Keep it concise (max 200 words). 
    Focus on key plot points, decisions, and character status changes.
    Write in Ukrainian. Literary style (chronicles).
  `;

  try {
    const response = await retryRequest(() => ai!.models.generateContent({
      model: 'gemini-2.5-flash', // Use fast model for background tasks
      contents: prompt,
    }));

    return response.text || currentSummary;
  } catch (error) {
    console.error("Error generating summary:", error);
    return currentSummary;
  }
};

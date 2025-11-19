
import React, { useState, useRef, useEffect } from 'react';
import { createDMSession, resumeDMSession, generateLocationImage, generateStorySummary } from './services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Character, DEFAULT_CHARACTER, Message, Sender, PendingRoll, LocationState, Quest, CombatState, Note } from './types';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';
import Journal from './components/Journal';
import Typewriter from './components/Typewriter';
import CombatTracker from './components/CombatTracker';
import CloudSaves from './components/CloudSaves';
import { 
  Send, Sword, Scroll, Loader2, 
  Crosshair, Wand2, Music, Shield, Ghost, Axe, Hammer, Leaf, Skull, HandMetal, MapPin, Image as ImageIcon, Book, Cloud
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Simple utility to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  const [character, setCharacter] = useState<Character>(DEFAULT_CHARACTER);
  const [gameStarted, setGameStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [storySummary, setStorySummary] = useState<string>("");
  const [combatState, setCombatState] = useState<CombatState>({ isActive: false, combatants: [] });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'sheet'>('sheet');
  const [pendingRoll, setPendingRoll] = useState<PendingRoll | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showCloudSaves, setShowCloudSaves] = useState(false);
  
  const [location, setLocation] = useState<LocationState>({
    name: "Невідома Локація",
    description: "Тьмяне світло факелів...",
    isGenerating: false
  });
  
  // Chat session reference
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeTab, pendingRoll]);

  // --- AUTO-SUMMARIZATION LOGIC ---
  // Trigger summary update every 10 messages to keep memory fresh
  useEffect(() => {
     if (gameStarted && messages.length > 0 && messages.length % 10 === 0) {
        const updateSummary = async () => {
           // Take the last 10 messages
           const recent = messages.slice(-10);
           const newSummary = await generateStorySummary(storySummary, recent);
           setStorySummary(newSummary);
        };
        updateSummary();
     }
  }, [messages.length, gameStarted]);


  // Get dynamic icon based on character class
  const getClassIcon = (className: string) => {
    const c = className.toLowerCase();
    const iconClass = "text-white w-6 h-6";
    
    if (c.includes('слідопит') || c.includes('ranger')) return <Crosshair className={iconClass} />;
    if (c.includes('воїн') || c.includes('fighter')) return <Sword className={iconClass} />;
    if (c.includes('чарівник') || c.includes('wizard')) return <Wand2 className={iconClass} />;
    if (c.includes('чародій') || c.includes('sorcerer')) return <SparklesIcon className={iconClass} />;
    if (c.includes('жрець') || c.includes('cleric')) return <Hammer className={iconClass} />;
    if (c.includes('плут') || c.includes('злодій') || c.includes('rogue')) return <Ghost className={iconClass} />;
    if (c.includes('бард') || c.includes('bard')) return <Music className={iconClass} />;
    if (c.includes('варвар') || c.includes('barbarian')) return <Axe className={iconClass} />;
    if (c.includes('паладин') || c.includes('paladin')) return <Shield className={iconClass} />;
    if (c.includes('друїд') || c.includes('druid')) return <Leaf className={iconClass} />;
    if (c.includes('чаклун') || c.includes('warlock')) return <Skull className={iconClass} />;
    if (c.includes('монах') || c.includes('monk')) return <HandMetal className={iconClass} />;
    
    return <Sword className={iconClass} />;
  };

  const getGameState = () => {
    return {
      character,
      messages,
      location,
      quests,
      notes,
      storySummary,
      combatState,
      timestamp: Date.now()
    };
  };

  const saveGame = () => {
    const gameState = getGameState();
    try {
      localStorage.setItem('dnd_campaign_save', JSON.stringify(gameState));
    } catch (e) {
      console.error("Failed to save game locally", e);
    }
  };

  const handleLoadGameData = async (gameState: any) => {
    try {
        // Restore State
        if (gameState.character) setCharacter(gameState.character);
        if (gameState.messages) setMessages(gameState.messages);
        if (gameState.location) setLocation(gameState.location);
        if (gameState.quests) setQuests(gameState.quests);
        if (gameState.notes) setNotes(gameState.notes);
        if (gameState.storySummary) setStorySummary(gameState.storySummary);
        if (gameState.combatState) setCombatState(gameState.combatState);
        
        setGameStarted(true);
        setActiveTab('chat');
  
        // Reconnect to AI with history AND summary
        const session = await resumeDMSession(
            gameState.character || DEFAULT_CHARACTER, 
            gameState.messages || [], 
            gameState.storySummary
        );
        
        if (session) {
          chatSessionRef.current = session;
          setMessages(prev => [...prev, {
            id: generateId(),
            text: "*[Система]: Гра успішно завантажена.*",
            sender: Sender.System,
            timestamp: Date.now()
          }]);
        } else {
           setMessages(prev => [...prev, {
            id: generateId(),
            text: "Помилка відновлення зв'язку з Майстром.",
            sender: Sender.System,
            timestamp: Date.now(),
            isError: true
          }]);
        }
      } catch (e) {
        console.error("Failed to parse loaded game", e);
        alert("Помилка обробки файлу збереження.");
      }
  };

  const loadGame = async () => {
    try {
      const savedData = localStorage.getItem('dnd_campaign_save');
      if (!savedData) {
        alert("Не знайдено локальних збережень.");
        return;
      }
      setIsLoading(true);
      const gameState = JSON.parse(savedData);
      await handleLoadGameData(gameState);
    } catch (e) {
      console.error("Failed to load game", e);
      alert("Помилка завантаження файлу збереження.");
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    setIsLoading(true);
    setGameStarted(true);
    setActiveTab('chat');

    const session = await createDMSession(character, storySummary);
    if (session) {
      chatSessionRef.current = session;
      try {
        await sendMessage("Починай пригоду. Опиши де я і що відбувається.", Sender.User, true);
      } catch (error) {
         setMessages([
          { id: generateId(), text: "Помилка з'єднання з магічним ефіром. Перевірте API ключ.", sender: Sender.System, timestamp: Date.now(), isError: true }
        ]);
      }
    } else {
      setMessages([
          { id: generateId(), text: "API Key is missing. Please configure your environment.", sender: Sender.System, timestamp: Date.now(), isError: true }
      ]);
    }
    setIsLoading(false);
  };

  // --- CORE GAME LOOP LOGIC ---

  const handleUpdateLocation = async (name: string, description: string) => {
    setLocation(prev => ({ ...prev, name, description, isGenerating: true }));
    
    // Trigger background generation
    try {
        const imageUrl = await generateLocationImage(description);
        if (imageUrl) {
            setLocation(prev => ({ ...prev, imageUrl, isGenerating: false }));
        } else {
            setLocation(prev => ({ ...prev, isGenerating: false }));
        }
    } catch (e) {
        console.error(e);
        setLocation(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const executeFunctionCall = (name: string, args: any): string => {
    let result = "Function executed.";
    
    if (name === 'update_hp') {
      const amount = args.amount as number;
      const reason = args.reason as string;
      
      setCharacter(prev => {
        const newHp = Math.min(prev.maxHp, Math.max(0, prev.hp + amount));
        return { ...prev, hp: newHp };
      });

      const changeStr = amount > 0 ? `+${amount}` : `${amount}`;
      const msgText = `HP змінено: ${changeStr} (${reason})`;
      
      setMessages(prev => [...prev, {
        id: generateId(),
        text: `**[Система]:** ${msgText}`,
        sender: Sender.System,
        timestamp: Date.now()
      }]);
      
      result = `Success. HP updated. Current HP: ${character.hp + amount}/${character.maxHp}.`;
    } 
    else if (name === 'modify_inventory') {
      const item = args.item as string;
      const action = args.action as 'add' | 'remove';
      
      setCharacter(prev => {
        let newInv = [...prev.inventory];
        if (action === 'add') {
          newInv.push(item);
        } else {
          const index = newInv.findIndex(i => i.toLowerCase().includes(item.toLowerCase()));
          if (index > -1) newInv.splice(index, 1);
        }
        return { ...prev, inventory: newInv };
      });

      const actionStr = action === 'add' ? "Отримано" : "Втрачено";
      setMessages(prev => [...prev, {
        id: generateId(),
        text: `**[Система]:** ${actionStr} предмет: *${item}*`,
        sender: Sender.System,
        timestamp: Date.now()
      }]);

      result = `Success. Item ${action}ed.`;
    }
    else if (name === 'update_location') {
        const locName = args.name;
        const locDesc = args.description;
        
        // We don't await the image here to keep the chat flowing, but we trigger it
        handleUpdateLocation(locName, locDesc);
        
        result = `Location updated to ${locName}. Background image generation triggered.`;
    }
    else if (name === 'update_quest') {
        const { id, title, description, status } = args;
        const questId = id === 'new' ? generateId() : id;
        
        setQuests(prev => {
           const existing = prev.findIndex(q => q.title === title || q.id === id);
           const newQuest: Quest = {
             id: questId,
             title,
             description: description || (existing >= 0 ? prev[existing].description : ''),
             status: status
           };
           
           if (existing >= 0) {
             const updated = [...prev];
             updated[existing] = { ...updated[existing], ...newQuest };
             return updated;
           } else {
             return [newQuest, ...prev];
           }
        });

        let statusMsg = "";
        if (status === 'active') statusMsg = "Новий Квест";
        if (status === 'completed') statusMsg = "Квест Виконано";
        if (status === 'failed') statusMsg = "Квест Провалено";

        setMessages(prev => [...prev, {
            id: generateId(),
            text: `**[Журнал]:** ${statusMsg}: *${title}*`,
            sender: Sender.System,
            timestamp: Date.now()
        }]);

        result = `Quest updated: ${title} is now ${status}.`;
    }
    else if (name === 'add_note') {
        const { title, content, type } = args;
        const newNote: Note = {
          id: generateId(),
          title,
          content,
          type,
          timestamp: Date.now()
        };
        
        setNotes(prev => [newNote, ...prev]);
        
        setMessages(prev => [...prev, {
          id: generateId(),
          text: `**[Щоденник]:** Новий запис про *${title}*`,
          sender: Sender.System,
          timestamp: Date.now()
        }]);

        result = "Note added to journal.";
    }
    else if (name === 'manage_combat') {
        const action = args.action as 'start' | 'end' | 'update';
        const combatants = args.combatants || [];

        if (action === 'start') {
            setCombatState({ isActive: true, combatants: [] });
            setMessages(prev => [...prev, {
                id: generateId(),
                text: `**[БІЙ ПОЧАВСЯ]** Кидайте ініціативу!`,
                sender: Sender.System,
                timestamp: Date.now()
            }]);
            result = "Combat started. UI opened.";
        } else if (action === 'end') {
             setCombatState({ isActive: false, combatants: [] });
             setMessages(prev => [...prev, {
                id: generateId(),
                text: `**[БІЙ ЗАВЕРШЕНО]**`,
                sender: Sender.System,
                timestamp: Date.now()
            }]);
             result = "Combat ended. UI closed.";
        } else if (action === 'update') {
             setCombatState(prev => ({
                 ...prev,
                 isActive: true,
                 combatants: combatants
             }));
             result = "Combatants updated.";
        }
    }

    return result;
  };

  // Unified handler for processing AI responses (text + tools)
  const processAIResponse = async (response: GenerateContentResponse) => {
    let currentResponse = response;
    let loopCount = 0;

    // Display initial text if any
    if (currentResponse.text) {
      setMessages(prev => [...prev, {
        id: generateId(),
        text: currentResponse.text,
        sender: Sender.AI,
        timestamp: Date.now()
      }]);
    }

    // Loop to handle auto-tools, breaking if human interaction (roll) is needed
    while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && loopCount < 5) {
      loopCount++;
      const functionResponses = [];
      let requiresUserInteraction = false;

      for (const call of currentResponse.functionCalls) {
        console.log("Tool Call:", call.name, call.args);

        if (call.name === 'request_roll') {
           // Wait for user!
           requiresUserInteraction = true;
           setPendingRoll({
             callId: call.id,
             ability: (call.args as any).ability,
             skill: (call.args as any).skill,
             dc: (call.args as any).dc,
             reason: (call.args as any).reason,
             otherResponses: functionResponses // Store other auto-results to send back later
           });
        } else {
           // Execute auto-tool
           const result = executeFunctionCall(call.name, call.args);
           functionResponses.push({
             functionResponse: {
               name: call.name,
               response: { result: result },
               id: call.id
             }
           });
        }
      }

      if (requiresUserInteraction) {
        // Stop processing, wait for user to roll. 
        // The functionResponses gathered SO FAR in this loop iteration will be stored in pendingRoll.otherResponses
        // and sent together with the roll result.
        setIsLoading(false);
        return; 
      }

      // If only auto-tools, send results back and continue
      setIsLoading(true);
      currentResponse = await chatSessionRef.current!.sendMessage({ message: functionResponses });
      
      if (currentResponse.text) {
        setMessages(prev => [...prev, {
          id: generateId(),
          text: currentResponse.text,
          sender: Sender.AI,
          timestamp: Date.now()
        }]);
      }
    }
    setIsLoading(false);
  };

  const sendMessage = async (content: string, type: Sender = Sender.User, isInit = false) => {
    if ((!content.trim() && !isInit) || !chatSessionRef.current || isLoading) return;

    if (!isInit) {
      const newMessage: Message = {
        id: generateId(),
        text: content,
        sender: type,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMessage]);
      setInputValue("");
    }
    
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: content });
      await processAIResponse(response);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: generateId(),
        text: "Майстер підземелля втратив думку... (Помилка мережі або логіки)",
        sender: Sender.System,
        timestamp: Date.now(),
        isError: true
      }]);
      setIsLoading(false);
    }
  };

  const resolvePendingRoll = async (rollTotal: number) => {
    if (!pendingRoll || !chatSessionRef.current) return;

    setPendingRoll(null); // Clear UI
    setIsLoading(true);

    // Construct the response for the roll
    const rollResponse = {
       functionResponse: {
          name: 'request_roll',
          id: pendingRoll.callId,
          response: { result: `Player rolled: ${rollTotal}` }
       }
    };

    // Combine with any other auto-tool responses that were pending
    const allResponses = [...pendingRoll.otherResponses, rollResponse];

    try {
      const response = await chatSessionRef.current.sendMessage({ message: allResponses });
      await processAIResponse(response);
    } catch (error) {
      console.error("Error resolving roll:", error);
      setIsLoading(false);
    }
  };

  const handleDiceRoll = (resultMessage: string) => {
    // If there is a pending roll, we don't just log it, we assume the user is fulfilling the request.
    // Extract number from string like "[🎲 Кидок d20]: **15**"
    if (pendingRoll) {
       const match = resultMessage.match(/\*\*(\d+)\*\*/);
       if (match) {
         const val = parseInt(match[1]);
         // Add modifiers based on pendingRoll.ability
         // Simplified: just using raw roll + mod. Ideally we should ask CharacterSheet logic.
         let mod = 0;
         if (pendingRoll.ability === 'initiative') mod = Math.floor((character.stats.dexterity - 10) / 2);
         else if (pendingRoll.ability) {
            const statName = pendingRoll.ability.toLowerCase() as keyof typeof character.stats;
            if (character.stats[statName] !== undefined) {
               mod = Math.floor((character.stats[statName] - 10) / 2);
            }
         }
         
         const total = val + mod;
         const finalMsg = `[🎲 ${pendingRoll.ability} Check]: Rolled ${val} + ${mod} = **${total}**`;
         
         setMessages(prev => [...prev, {
            id: generateId(),
            text: finalMsg,
            sender: Sender.System,
            timestamp: Date.now()
         }]);

         resolvePendingRoll(total);
         return;
       }
    }

    // Normal manual roll
    sendMessage(resultMessage, Sender.System);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-950 text-stone-200 overflow-hidden relative">
      <Journal 
        quests={quests} 
        notes={notes}
        storySummary={storySummary} 
        isOpen={showJournal} 
        onClose={() => setShowJournal(false)} 
      />
      <CombatTracker combatState={combatState} />
      <CloudSaves 
        isOpen={showCloudSaves}
        onClose={() => setShowCloudSaves(false)}
        getCurrentGameState={getGameState}
        onLoadGame={handleLoadGameData}
      />
      
      {/* Navbar */}
      <header className="h-16 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center border-2 border-amber-500 shadow-glow transition-all duration-500">
            {getClassIcon(character.class)}
          </div>
          <h1 className="text-xl md:text-2xl text-amber-500 font-bold tracking-wider fantasy-font">
            D&D AI Master
          </h1>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-2">
           <button
              onClick={() => setShowCloudSaves(true)}
              className="p-2 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-500 transition-colors"
              title="Хмарні збереження"
           >
              <Cloud className="w-5 h-5" />
           </button>

           {gameStarted && (
              <button 
                onClick={() => setShowJournal(true)}
                className="p-2 rounded hover:bg-stone-800 text-amber-500 relative"
                title="Журнал"
              >
                <Book className="w-5 h-5" />
                {quests.some(q => q.status === 'active') && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
           )}

           {/* Mobile Tabs Toggle */}
           {gameStarted && (
            <div className="md:hidden flex bg-stone-800 rounded p-1 ml-2">
              <button 
                onClick={() => setActiveTab('sheet')}
                className={`p-2 rounded ${activeTab === 'sheet' ? 'bg-stone-700 text-amber-400' : 'text-stone-500'}`}
              >
                <Scroll className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`p-2 rounded ${activeTab === 'chat' ? 'bg-stone-700 text-amber-400' : 'text-stone-500'}`}
              >
                <Sword className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex relative">
        
        {/* Left Panel: Character Sheet */}
        <aside className={`
          absolute md:relative z-20 w-full md:w-1/3 lg:w-1/4 h-full transition-transform duration-300 ease-in-out bg-stone-950 md:translate-x-0 md:border-r border-stone-800
          ${activeTab === 'sheet' ? 'translate-x-0' : '-translate-x-full'}
          ${!gameStarted ? 'translate-x-0 w-full md:w-full lg:w-full items-center justify-center flex' : ''}
        `}>
          <div className={`h-full p-4 ${!gameStarted ? 'max-w-2xl w-full' : ''}`}>
            <CharacterSheet 
              character={character} 
              onChange={setCharacter} 
              readOnly={gameStarted}
              onStartGame={!gameStarted ? startGame : undefined}
              onSaveGame={gameStarted ? saveGame : undefined}
              onLoadGame={!gameStarted ? loadGame : undefined}
            />
          </div>
        </aside>

        {/* Right Panel: Chat Interface */}
        {gameStarted && (
          <section 
            className={`
                absolute md:relative w-full md:w-2/3 lg:w-3/4 h-full flex flex-col transition-all duration-500 bg-cover bg-center
                ${activeTab === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}
            style={{ 
                backgroundImage: location.imageUrl ? `url(${location.imageUrl})` : "url('https://www.transparenttextures.com/patterns/dark-matter.png')",
            }}
          >
            {/* Dark Overlay for Text Readability & Combat Tint */}
            <div className={`absolute inset-0 backdrop-blur-[1px] pointer-events-none transition-colors duration-1000
                ${combatState.isActive ? 'bg-red-950/80 shadow-[inset_0_0_100px_rgba(220,38,38,0.3)]' : 'bg-stone-950/90'}
            `} />

            {/* Location Header */}
            <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0">
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="text-amber-100 font-bold text-lg fantasy-font tracking-wide leading-none drop-shadow-md">
                            {location.name}
                        </h2>
                        {location.isGenerating && (
                             <div className="text-[10px] text-amber-500 flex items-center gap-1 animate-pulse">
                                 <ImageIcon className="w-3 h-3" /> Генерую візуалізацію...
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 relative z-10 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
              {messages.map((msg, index) => {
                 // Determine if we should use Typewriter effect:
                 // It must be the LAST message, it must be from AI, and not an error.
                 const isLastMessage = index === messages.length - 1;
                 const isAI = msg.sender === Sender.AI;
                 
                 return (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[90%] md:max-w-[80%] rounded-lg p-4 text-base leading-relaxed shadow-lg backdrop-blur-sm
                      ${msg.sender === Sender.User 
                        ? 'bg-stone-800/90 text-stone-200 border border-stone-600 rounded-br-none' 
                        : msg.sender === Sender.System
                          ? 'bg-stone-900/80 text-amber-500 text-sm italic border border-dashed border-amber-900 w-full text-center'
                          : 'bg-stone-950/85 text-stone-300 border border-amber-900/50 rounded-bl-none shadow-amber-900/10'}
                      ${msg.isError ? 'border-red-800 text-red-400' : ''}
                    `}>
                      {msg.sender === Sender.AI && (
                        <div className="text-amber-700 text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-600"></span> DM
                        </div>
                      )}
                      {msg.sender === Sender.User && (
                        <div className="text-stone-500 text-xs font-bold mb-1 uppercase tracking-wider text-right">
                          {character.name}
                        </div>
                      )}
                      
                      {isLastMessage && isAI && !msg.isError ? (
                         <Typewriter text={msg.text} onComplete={() => { /* Optional: trigger sfx */ }} />
                      ) : (
                         <div className="markdown-content prose prose-invert prose-p:my-1 prose-strong:text-amber-500 prose-em:text-stone-400">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                         </div>
                      )}
                    </div>
                  </div>
                 );
              })}
              
              {isLoading && !pendingRoll && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-stone-900/90 rounded-lg p-4 border border-stone-800 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                    <span className="text-stone-500 text-sm italic">Майстер думає...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending Roll Overlay/Modal */}
            {pendingRoll && (
                <div className="absolute top-16 left-4 right-4 md:left-1/4 md:right-1/4 z-40 animate-in zoom-in duration-300">
                    <div className="bg-stone-900/95 border-2 border-amber-500 rounded-lg p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center text-center gap-4 backdrop-blur-md">
                         <div className="text-amber-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">Майстер вимагає перевірки!</div>
                         <h3 className="text-3xl fantasy-font text-stone-100">
                            {pendingRoll.ability.toUpperCase()} CHECK
                            {pendingRoll.dc && <span className="text-stone-500 ml-2 text-xl">DC {pendingRoll.dc}</span>}
                         </h3>
                         <p className="text-stone-400 italic">"{pendingRoll.reason}"</p>
                         <div className="bg-black/40 rounded p-2 text-xs text-stone-500">
                            Киньте d20 на панелі нижче. Результат буде автоматично зараховано.
                         </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-stone-950 p-0 shrink-0 z-30 relative border-t border-stone-800">
              <DiceRoller onRoll={(msg) => handleDiceRoll(msg)} />
              
              <div className="p-4 flex gap-2 bg-stone-900">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                  placeholder={pendingRoll ? "Киньте кубик..." : "Що ви робите? (напр. 'Я оглядаю кімнату')"}
                  className="flex-1 bg-stone-800 border border-stone-700 text-stone-200 rounded px-4 py-3 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 placeholder-stone-600 disabled:opacity-50"
                  disabled={isLoading || !!pendingRoll}
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim() || !!pendingRoll}
                  className="bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded px-6 flex items-center justify-center transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

          </section>
        )}
      </main>
    </div>
  );
}

// Little local component for Sparkles to reuse same sizing
const SparklesIcon = ({className}: {className: string}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" />
  </svg>
);


export enum Sender {
  User = 'user',
  AI = 'model',
  System = 'system'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isError?: boolean;
}

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Character {
  name: string;
  race: string;
  class: string;
  level: number;
  stats: AbilityScores;
  inventory: string[];
  appearance: string; // New field for visual description
  hp: number;
  maxHp: number;
  ac: number;
  avatarUrl?: string;
}

export interface LocationState {
  name: string;
  description: string;
  imageUrl?: string;
  isGenerating: boolean;
}

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
}

export type NoteType = 'npc' | 'location' | 'lore' | 'other';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  timestamp: number;
}

export interface Combatant {
  name: string;
  initiative: number;
  type: 'player' | 'enemy' | 'ally';
  isCurrentTurn: boolean;
  hpStatus?: string; // e.g. "Здоровий", "Поранений", "При смерті"
}

export interface CombatState {
  isActive: boolean;
  combatants: Combatant[];
}

export interface PendingRoll {
  callId: string;
  ability: string;
  skill?: string;
  dc?: number;
  reason: string;
  otherResponses: any[]; // To store responses from other tools called in the same turn
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

export const DND_CLASSES = [
  "Варвар",
  "Бард",
  "Воїн",
  "Друїд",
  "Жрець",
  "Монах",
  "Паладин",
  "Плут",
  "Слідопит",
  "Чародій",
  "Чаклун",
  "Чарівник"
];

interface ClassPreset {
  hitDie: number;
  primaryStats: (keyof AbilityScores)[]; // Priority order for Standard Array
  inventory: string[];
  armorType: 'none' | 'light' | 'medium' | 'heavy' | 'unarmored_barb' | 'unarmored_monk';
  baseAc: number; // Armor value (e.g. 11 for Leather, 16 for Chain Mail)
}

export const CLASS_PRESETS: Record<string, ClassPreset> = {
  "Варвар": {
    hitDie: 12,
    primaryStats: ['strength', 'constitution', 'dexterity', 'wisdom', 'charisma', 'intelligence'],
    inventory: ["Велика сокира", "Дві ручні сокири", "Набір мандрівника", "Дротики (4)"],
    armorType: 'unarmored_barb',
    baseAc: 10
  },
  "Бард": {
    hitDie: 8,
    primaryStats: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Рапіра", "Набір дипломата", "Лютня", "Шкіряна броня", "Кинджал"],
    armorType: 'light',
    baseAc: 11 // Leather
  },
  "Воїн": {
    hitDie: 10,
    primaryStats: ['strength', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'charisma'],
    inventory: ["Кольчуга", "Довгий меч", "Щит", "Арбалет легкий", "Набір дослідника підземель"],
    armorType: 'heavy', // Chain Mail
    baseAc: 16
  },
  "Друїд": {
    hitDie: 8,
    primaryStats: ['wisdom', 'constitution', 'dexterity', 'intelligence', 'charisma', 'strength'],
    inventory: ["Дерев'яний щит", "Скімітар", "Шкіряна броня", "Набір мандрівника", "Фокус друїда"],
    armorType: 'light', // Leather + Shield logic handled manually or simplified
    baseAc: 11
  },
  "Жрець": {
    hitDie: 8,
    primaryStats: ['wisdom', 'strength', 'constitution', 'charisma', 'intelligence', 'dexterity'],
    inventory: ["Булава", "Луската броня", "Легкий арбалет", "Набір священика", "Щит", "Священний символ"],
    armorType: 'medium', // Scale Mail
    baseAc: 14
  },
  "Монах": {
    hitDie: 8,
    primaryStats: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
    inventory: ["Короткий меч", "Набір дослідника підземель", "Дротики (10)"],
    armorType: 'unarmored_monk',
    baseAc: 10
  },
  "Паладин": {
    hitDie: 10,
    primaryStats: ['strength', 'charisma', 'constitution', 'wisdom', 'intelligence', 'dexterity'],
    inventory: ["Бойовий молот", "Щит", "Дротики (5)", "Кольчуга", "Священний символ", "Набір мандрівника"],
    armorType: 'heavy',
    baseAc: 16
  },
  "Плут": {
    hitDie: 8,
    primaryStats: ['dexterity', 'intelligence', 'charisma', 'constitution', 'wisdom', 'strength'],
    inventory: ["Рапіра", "Короткий лук", "Набір злодія", "Шкіряна броня", "Два кинджали", "Стріли (20)"],
    armorType: 'light',
    baseAc: 11
  },
  "Слідопит": {
    hitDie: 10,
    primaryStats: ['dexterity', 'wisdom', 'constitution', 'strength', 'intelligence', 'charisma'],
    inventory: ["Луската броня", "Два коротких меча", "Набір мандрівника", "Довгий лук", "Стріли (20)"],
    armorType: 'medium',
    baseAc: 14
  },
  "Чародій": {
    hitDie: 6,
    primaryStats: ['charisma', 'constitution', 'dexterity', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Легкий арбалет", "Фокус чародія", "Набір дослідника підземель", "Два кинджали", "Стріли (20)"],
    armorType: 'none',
    baseAc: 10
  },
  "Чаклун": {
    hitDie: 8,
    primaryStats: ['charisma', 'dexterity', 'constitution', 'wisdom', 'intelligence', 'strength'],
    inventory: ["Легкий арбалет", "Фокус", "Шкіряна броня", "Набір вченого", "Два кинджали", "Стріли (20)"],
    armorType: 'light',
    baseAc: 11
  },
  "Чарівник": {
    hitDie: 6,
    primaryStats: ['intelligence', 'constitution', 'dexterity', 'wisdom', 'charisma', 'strength'],
    inventory: ["Книга заклять", "Фокус", "Набір вченого", "Сумка з компонентами"],
    armorType: 'none',
    baseAc: 10
  }
};

export const DEFAULT_CHARACTER: Character = {
  name: "Арагорн",
  race: "Людина",
  class: "Слідопит",
  level: 1,
  stats: {
    strength: 12,
    dexterity: 15,
    constitution: 13,
    intelligence: 10,
    wisdom: 14,
    charisma: 8
  },
  inventory: ["Луската броня", "Два коротких меча", "Набір мандрівника", "Довгий лук", "Стріли (20)"],
  appearance: "Високий, темне волосся, суворий погляд, носить зелений плащ з капюшоном.",
  hp: 11, // 10 (d10) + 1 (Con Mod from 13)
  maxHp: 11,
  ac: 16 // 14 (Scale Mail) + 2 (Dex, capped at 2 for Medium Armor)
};

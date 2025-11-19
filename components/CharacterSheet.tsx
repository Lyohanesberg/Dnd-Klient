
import React, { useState } from 'react';
import { Character, AbilityScores, DND_CLASSES, CLASS_PRESETS } from '../types';
import { Shield, Heart, Zap, Backpack, Sword, Save, Download, User, Loader2, Sparkles, Eye, ChevronDown, RefreshCw, Dna } from 'lucide-react';
import { generateCharacterAvatar } from '../services/geminiService';

interface CharacterSheetProps {
  character: Character;
  onChange: (char: Character) => void;
  readOnly?: boolean;
  onStartGame?: () => void;
  onSaveGame?: () => void;
  onLoadGame?: () => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ 
  character, 
  onChange, 
  readOnly = false, 
  onStartGame,
  onSaveGame,
  onLoadGame
}) => {
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  // Helper to get modifier
  const getModVal = (score: number) => Math.floor((score - 10) / 2);

  const handleStatChange = (stat: keyof AbilityScores, value: string) => {
    const numValue = parseInt(value) || 0;
    const newStats = {
      ...character.stats,
      [stat]: numValue
    };
    
    onChange({
      ...character,
      stats: newStats
    });
  };

  const applyClassDefaults = (className: string) => {
    const preset = CLASS_PRESETS[className];
    if (!preset) return;

    // 1. Standard Array Distribution [15, 14, 13, 12, 10, 8] based on priority
    const standardArray = [15, 14, 13, 12, 10, 8];
    const newStats = { ...character.stats };
    
    preset.primaryStats.forEach((stat, index) => {
      if (index < standardArray.length) {
        newStats[stat] = standardArray[index];
      }
    });

    // 2. Calculate Modifiers
    const conMod = getModVal(newStats.constitution);
    const dexMod = getModVal(newStats.dexterity);
    const wisMod = getModVal(newStats.wisdom);

    // 3. Calculate HP (Max Hit Die + Con Mod)
    const maxHp = Math.max(1, preset.hitDie + conMod); // HP can't be < 1

    // 4. Calculate AC
    let ac = 10;
    switch (preset.armorType) {
      case 'heavy':
        ac = preset.baseAc; // Dex doesn't add to heavy
        break;
      case 'medium':
        ac = preset.baseAc + Math.min(dexMod, 2); // Max 2 dex bonus
        break;
      case 'light':
        ac = preset.baseAc + dexMod;
        break;
      case 'unarmored_barb':
        ac = 10 + dexMod + conMod;
        break;
      case 'unarmored_monk':
        ac = 10 + dexMod + wisMod;
        break;
      case 'none':
      default:
        ac = 10 + dexMod;
    }
    
    // Add Shield bonus manually if needed by checking inventory strings
    if (preset.inventory.some(i => i.toLowerCase().includes('щит'))) {
        ac += 2;
    }

    onChange({
      ...character,
      class: className,
      level: 1, // Always reset to 1 on new class selection
      stats: newStats,
      hp: maxHp,
      maxHp: maxHp,
      ac: ac,
      inventory: preset.inventory
    });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClass = e.target.value;
    applyClassDefaults(newClass);
  };

  const handleInfoChange = <K extends keyof Character>(field: K, value: Character[K]) => {
    onChange({
      ...character,
      [field]: value
    });
  };

  const handleSaveClick = () => {
    if (onSaveGame) {
      onSaveGame();
      setSaveFeedback("Гру збережено!");
      setTimeout(() => setSaveFeedback(null), 2000);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!character.race || !character.class) {
      alert("Вкажіть Расу та Клас перед генерацією портрету.");
      return;
    }
    
    setIsGeneratingAvatar(true);
    try {
      const avatarUrl = await generateCharacterAvatar(character);
      if (avatarUrl) {
        handleInfoChange('avatarUrl', avatarUrl);
      } else {
        alert("Не вдалося згенерувати зображення. Спробуйте пізніше або перевірте API ключ.");
      }
    } catch (e) {
      console.error(e);
      alert("Помилка генерації.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const getModifierString = (score: number) => {
    const mod = getModVal(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const inputClass = "w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-200 focus:border-amber-500 focus:outline-none transition-colors text-sm";
  const labelClass = "block text-xs text-stone-500 uppercase mb-1 font-bold tracking-wider";

  const currentPreset = CLASS_PRESETS[character.class];
  const hitDieDisplay = currentPreset ? `d${currentPreset.hitDie}` : '?';

  return (
    <div className="bg-stone-800 rounded-lg shadow-lg overflow-hidden border border-stone-700 h-full flex flex-col">
      {/* Header */}
      <div className="bg-stone-900 p-4 border-b border-stone-700">
        <h2 className="text-xl text-amber-500 fantasy-font flex items-center gap-2">
           <Shield className="w-5 h-5" /> Лист Персонажа
        </h2>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        {/* Avatar Section */}
        <div className="flex justify-center mb-4 relative group">
          <div className="w-32 h-32 rounded-full border-4 border-stone-700 bg-stone-900 overflow-hidden shadow-xl relative transition-transform hover:scale-105">
            {character.avatarUrl ? (
              <img src={character.avatarUrl} alt="Character Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-600">
                <User className="w-16 h-16" />
              </div>
            )}
            
            {isGeneratingAvatar && (
               <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                 <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
               </div>
            )}

            {!isGeneratingAvatar && (
              <div 
                 className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" 
                 onClick={handleGenerateAvatar}
                 title="Клікніть, щоб оновити портрет на основі поточного спорядження"
              >
                 <span className="text-amber-500 text-xs font-bold flex flex-col items-center gap-1 text-center px-2">
                    <Sparkles className="w-4 h-4" />
                    {readOnly ? "ОНОВИТИ" : "СТВОРИТИ"}
                 </span>
              </div>
            )}
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ім'я</label>
            <input 
              type="text" 
              value={character.name} 
              onChange={(e) => handleInfoChange('name', e.target.value)}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
           <div className="relative">
            <label className={labelClass}>Клас</label>
            {readOnly ? (
              <input 
                type="text" 
                value={character.class} 
                disabled={true}
                className={inputClass}
              />
            ) : (
              <div className="relative group">
                <select 
                  value={character.class} 
                  onChange={handleClassChange}
                  className={`${inputClass} appearance-none cursor-pointer pr-8`}
                >
                  {DND_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1.5 w-4 h-4 text-stone-500 pointer-events-none" />
                {/* Tooltip for auto-stats */}
                <div className="hidden group-hover:block absolute z-50 bottom-full left-0 mb-2 w-56 p-2 bg-black/90 text-xs text-stone-300 rounded shadow-xl border border-stone-600">
                   Зміна класу автоматично встановлює 1-й рівень, характеристики (Standard Array) та інвентар.
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Раса</label>
            <input 
              type="text" 
              value={character.race} 
              onChange={(e) => handleInfoChange('race', e.target.value)}
              disabled={readOnly}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
             <div className="flex-1">
                <label className={labelClass}>Рівень</label>
                <input 
                  type="number" 
                  value={character.level} 
                  onChange={(e) => handleInfoChange('level', parseInt(e.target.value) || 1)}
                  disabled={readOnly} 
                  className={inputClass}
                  min={1}
                  max={20}
                />
             </div>
             <div className="w-1/3">
                <label className={labelClass}>HD</label>
                <div className="flex items-center justify-center h-[30px] bg-stone-900 border border-stone-700 rounded text-xs font-bold text-stone-400">
                   {hitDieDisplay}
                </div>
             </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="w-full">
            <label className={labelClass}><Eye className="inline w-3 h-3 mr-1"/> Зовнішність (Для Генерації)</label>
            <textarea 
              value={character.appearance || ""} 
              onChange={(e) => handleInfoChange('appearance', e.target.value)}
              disabled={readOnly}
              className={`${inputClass} h-16 resize-none`}
              placeholder="Опишіть зовнішність (колір очей, волосся, особливі прикмети)..."
            />
        </div>

        {/* Combat Stats */}
        <div className="bg-stone-900/50 p-3 rounded border border-stone-700/50">
          <h3 className="text-stone-400 text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Heart className="w-4 h-4 text-red-600" /> Бойові Параметри
          </h3>
          <div className="flex gap-4">
             <div className="flex-1 text-center">
                <label className={labelClass}>AC (Захист)</label>
                <div className="relative flex items-center justify-center h-12">
                    <Shield className="w-10 h-10 text-stone-700 absolute" />
                    <input 
                        type="number" 
                        value={character.ac}
                        onChange={(e) => handleInfoChange('ac', parseInt(e.target.value) || 10)}
                        disabled={readOnly}
                        className="w-full text-center bg-transparent text-xl font-bold text-amber-500 focus:outline-none z-10 relative"
                    />
                </div>
             </div>
             <div className="flex-1 text-center border-l border-stone-700 pl-4">
                <label className={labelClass}>Здоров'я (HP)</label>
                <div className="flex items-center justify-center gap-2 h-12">
                    <input 
                        type="number" 
                        value={character.hp}
                        onChange={(e) => handleInfoChange('hp', parseInt(e.target.value) || 0)}
                        className="w-14 text-right bg-stone-800/50 rounded px-1 text-xl font-bold text-red-500 border border-stone-600 focus:border-red-500 focus:outline-none"
                        title="Поточні HP (Можна змінювати)"
                    />
                    <span className="text-stone-500 text-xl">/</span>
                    <input 
                        type="number" 
                        value={character.maxHp}
                        onChange={(e) => handleInfoChange('maxHp', parseInt(e.target.value) || 1)}
                        disabled={readOnly}
                        className="w-14 text-left bg-transparent text-sm font-bold text-stone-400 focus:outline-none"
                        title="Максимальні HP"
                    />
                </div>
             </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div className="flex justify-between items-end border-b border-stone-700 pb-1 mb-3">
             <h3 className="text-stone-400 text-sm font-bold flex items-center gap-2">
               <Zap className="w-4 h-4 text-amber-600" /> Характеристики
             </h3>
             {!readOnly && (
                <button 
                  onClick={() => applyClassDefaults(character.class)}
                  className="text-[10px] text-amber-600 hover:text-amber-500 flex items-center gap-1 uppercase font-bold tracking-wider transition-colors"
                  title="Скинути до стандартних значень класу"
                >
                  <RefreshCw className="w-3 h-3" /> Авто-розподіл
                </button>
             )}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(character.stats) as Array<keyof AbilityScores>).map((stat) => (
              <div key={stat} className="bg-stone-900 p-2 rounded border border-stone-700 text-center">
                <label className="block text-[10px] text-stone-500 uppercase mb-1 truncate">
                  {stat.slice(0,3)}
                </label>
                {readOnly ? (
                  <div className="text-lg font-bold text-stone-200">{character.stats[stat]}</div>
                ) : (
                  <input 
                    type="number" 
                    value={character.stats[stat]}
                    onChange={(e) => handleStatChange(stat, e.target.value)}
                    className="w-full bg-transparent text-center font-bold text-stone-200 focus:outline-none"
                  />
                )}
                <div className="text-xs text-amber-600 font-bold mt-1">
                  {getModifierString(character.stats[stat])}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <div>
           <h3 className="text-stone-400 text-sm font-bold mb-3 border-b border-stone-700 pb-1 flex items-center gap-2">
            <Backpack className="w-4 h-4 text-amber-600" /> Інвентар
          </h3>
          {readOnly ? (
            <ul className="list-disc list-inside text-sm text-stone-300 space-y-1 pl-2">
              {character.inventory.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : (
            <textarea 
              value={character.inventory.join('\n')}
              onChange={(e) => handleInfoChange('inventory', e.target.value.split('\n'))}
              className="w-full bg-stone-900 border border-stone-700 rounded p-2 text-sm text-stone-300 h-32 focus:border-amber-500 focus:outline-none"
              placeholder="Один предмет на рядок..."
            />
          )}
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 bg-stone-900 border-t border-stone-700 flex flex-col gap-3">
        
        {/* Start Game Mode (Setup) */}
        {!readOnly && (
          <div className="flex flex-col gap-2">
            {onStartGame && (
              <button 
                onClick={onStartGame}
                disabled={!character.name}
                className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded shadow-lg border border-amber-500 text-lg fantasy-font tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sword className="w-5 h-5" /> ПОЧАТИ ПРИГОДУ
              </button>
            )}
            {onLoadGame && (
               <button 
                onClick={onLoadGame}
                className="w-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 font-bold py-2 px-4 rounded border border-stone-600 text-sm tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> ЗАВАНТАЖИТИ ГРУ
              </button>
            )}
            <div className="text-xs text-center text-stone-500 mt-1">
               Редагування дозволено до початку гри (окрім HP)
            </div>
          </div>
        )}

        {/* In-Game Mode */}
        {readOnly && onSaveGame && (
          <button 
            onClick={handleSaveClick}
            className="w-full bg-stone-800 hover:bg-stone-700 text-amber-500 font-bold py-2 px-4 rounded border border-stone-600 shadow text-sm tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> 
            {saveFeedback || "ЗБЕРЕГТИ ГРУ"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CharacterSheet;

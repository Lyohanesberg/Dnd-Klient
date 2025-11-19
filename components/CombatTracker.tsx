
import React from 'react';
import { CombatState } from '../types';
import { Swords, Skull, User, Shield } from 'lucide-react';

interface CombatTrackerProps {
  combatState: CombatState;
}

const CombatTracker: React.FC<CombatTrackerProps> = ({ combatState }) => {
  if (!combatState.isActive) return null;

  return (
    <div className="fixed right-4 top-32 md:top-36 z-30 w-64 md:w-72 animate-in slide-in-from-right duration-500">
      <div className="bg-stone-950/90 border-2 border-red-900 rounded-lg shadow-[0_0_20px_rgba(153,27,27,0.5)] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 to-stone-900 p-3 border-b border-red-900 flex items-center justify-between">
          <h3 className="text-red-500 font-bold fantasy-font tracking-widest text-sm flex items-center gap-2 uppercase">
             <Swords className="w-4 h-4" /> Бій
          </h3>
          <span className="text-[10px] text-stone-500 uppercase">Ініціатива</span>
        </div>

        {/* List */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
          {combatState.combatants.length === 0 ? (
            <div className="p-4 text-center text-stone-500 text-xs italic">
              Очікування кидків ініціативи...
            </div>
          ) : (
            <ul className="divide-y divide-stone-800">
              {combatState.combatants.map((c, idx) => {
                const isCurrent = c.isCurrentTurn;
                const isPlayer = c.type === 'player';
                const isEnemy = c.type === 'enemy';

                return (
                  <li 
                    key={idx} 
                    className={`
                      relative p-3 flex items-center justify-between transition-all duration-300
                      ${isCurrent ? 'bg-red-900/20' : 'bg-transparent'}
                    `}
                  >
                    {/* Active Indicator Strip */}
                    {isCurrent && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_8px_#dc2626]" />
                    )}

                    <div className="flex items-center gap-3 pl-2">
                      {/* Avatar/Icon */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center border shadow-inner
                        ${isPlayer ? 'bg-amber-900/50 border-amber-600 text-amber-500' : ''}
                        ${isEnemy ? 'bg-stone-800 border-stone-600 text-red-500' : ''}
                        ${c.type === 'ally' ? 'bg-blue-900/30 border-blue-600 text-blue-400' : ''}
                      `}>
                        {isPlayer ? <User className="w-4 h-4" /> : isEnemy ? <Skull className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </div>

                      <div className="flex flex-col">
                         <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-stone-400'}`}>
                            {c.name}
                         </span>
                         {c.hpStatus && (
                           <span className={`text-[10px] font-bold uppercase ${
                             c.hpStatus.toLowerCase().includes('смерт') || c.hpStatus.toLowerCase().includes('dead') 
                               ? 'text-stone-600' 
                               : 'text-red-400'
                           }`}>
                             {c.hpStatus}
                           </span>
                         )}
                      </div>
                    </div>

                    <div className="text-stone-500 font-mono text-sm font-bold">
                      {c.initiative}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CombatTracker;

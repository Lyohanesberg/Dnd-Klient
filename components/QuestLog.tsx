
import React from 'react';
import { Quest } from '../types';
import { Scroll, CheckCircle2, XCircle, Circle, X } from 'lucide-react';

interface QuestLogProps {
  quests: Quest[];
  isOpen: boolean;
  onClose: () => void;
}

const QuestLog: React.FC<QuestLogProps> = ({ quests, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl overflow-hidden transform scale-100 transition-all relative">
        
        {/* Header */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-900/20 p-4 border-b border-amber-800 flex justify-between items-center">
          <h2 className="text-xl text-amber-500 fantasy-font flex items-center gap-2 tracking-wider">
             <Scroll className="w-6 h-6" /> Журнал Завдань
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-stone-950 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {quests.length === 0 ? (
            <div className="text-center text-stone-500 italic py-8">
              У вас поки немає активних завдань. Пригоди попереду!
            </div>
          ) : (
            <div className="space-y-4">
              {quests.map((quest) => (
                <div key={quest.id} className="border border-stone-800 bg-stone-900/50 rounded p-3 transition-all hover:border-stone-600">
                  <div className="flex items-start justify-between gap-3">
                     <div className="flex-1">
                        <h3 className={`font-bold text-sm mb-1 ${
                           quest.status === 'completed' ? 'text-green-500 line-through opacity-70' : 
                           quest.status === 'failed' ? 'text-red-500 line-through opacity-70' : 
                           'text-amber-100'
                        }`}>
                          {quest.title}
                        </h3>
                        <p className="text-xs text-stone-400 leading-relaxed">{quest.description}</p>
                     </div>
                     <div className="shrink-0 mt-1">
                        {quest.status === 'active' && <Circle className="w-4 h-4 text-amber-500" />}
                        {quest.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {quest.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decorative Footer */}
        <div className="bg-stone-900 p-2 border-t border-stone-800 text-center text-[10px] text-stone-600 uppercase tracking-widest">
           Слідкуйте за своїм шляхом
        </div>
      </div>
    </div>
  );
};

export default QuestLog;

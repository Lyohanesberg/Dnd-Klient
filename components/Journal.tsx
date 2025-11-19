
import React, { useState } from 'react';
import { Quest, Note, NoteType } from '../types';
import { Scroll, Book, CheckCircle2, XCircle, Circle, X, Feather, Map, User, HelpCircle, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface JournalProps {
  quests: Quest[];
  notes: Note[];
  storySummary?: string;
  isOpen: boolean;
  onClose: () => void;
}

const Journal: React.FC<JournalProps> = ({ quests, notes, storySummary, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quests' | 'notes' | 'story'>('quests');

  if (!isOpen) return null;

  const getNoteIcon = (type: NoteType) => {
    switch (type) {
      case 'npc': return <User className="w-4 h-4 text-amber-400" />;
      case 'location': return <Map className="w-4 h-4 text-green-400" />;
      case 'lore': return <Book className="w-4 h-4 text-purple-400" />;
      default: return <Feather className="w-4 h-4 text-stone-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[70vh] bg-stone-900 border-2 border-amber-800 rounded-lg shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header & Tabs */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-amber-950/40 p-0 border-b border-amber-800 flex justify-between items-center relative z-10">
          <div className="flex items-end px-4 pt-4 gap-2">
             <button 
               onClick={() => setActiveTab('quests')}
               className={`px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-colors text-xs md:text-sm ${activeTab === 'quests' ? 'bg-stone-900 text-amber-500 border-t border-l border-r border-amber-800' : 'bg-stone-950/50 text-stone-500 hover:text-stone-300'}`}
             >
               <Scroll className="w-4 h-4" /> <span className="hidden md:inline">Завдання</span>
             </button>
             <button 
               onClick={() => setActiveTab('notes')}
               className={`px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-colors text-xs md:text-sm ${activeTab === 'notes' ? 'bg-stone-900 text-amber-500 border-t border-l border-r border-amber-800' : 'bg-stone-950/50 text-stone-500 hover:text-stone-300'}`}
             >
               <Book className="w-4 h-4" /> <span className="hidden md:inline">Щоденник</span>
             </button>
             <button 
               onClick={() => setActiveTab('story')}
               className={`px-4 py-2 rounded-t-lg font-bold flex items-center gap-2 transition-colors text-xs md:text-sm ${activeTab === 'story' ? 'bg-stone-900 text-amber-500 border-t border-l border-r border-amber-800' : 'bg-stone-950/50 text-stone-500 hover:text-stone-300'}`}
             >
               <History className="w-4 h-4" /> <span className="hidden md:inline">Історія</span>
             </button>
          </div>

          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors mr-4 mb-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-stone-950 flex overflow-hidden relative">
            
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                 {activeTab === 'quests' ? <Scroll className="w-64 h-64" /> : activeTab === 'notes' ? <Feather className="w-64 h-64" /> : <History className="w-64 h-64" />}
            </div>

            <div className="w-full p-6 overflow-y-auto custom-scrollbar z-10">
              
              {/* Quests Tab */}
              {activeTab === 'quests' && (
                <div className="space-y-4">
                    <h2 className="text-lg fantasy-font text-stone-400 border-b border-stone-800 pb-2 mb-4">Активні та завершені завдання</h2>
                    {quests.length === 0 ? (
                        <div className="text-center text-stone-600 italic py-8">
                        Сторінки пусті... Пригоди ще попереду.
                        </div>
                    ) : (
                        quests.map((quest) => (
                        <div key={quest.id} className="border border-stone-800 bg-stone-900/80 rounded p-4 transition-all hover:border-stone-600 shadow-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <h3 className={`font-bold text-base mb-2 ${
                                    quest.status === 'completed' ? 'text-green-500 line-through decoration-stone-600' : 
                                    quest.status === 'failed' ? 'text-red-500 line-through decoration-stone-600' : 
                                    'text-amber-100'
                                    }`}>
                                    {quest.title}
                                    </h3>
                                    <p className="text-sm text-stone-400 leading-relaxed font-serif">{quest.description}</p>
                                </div>
                                <div className="shrink-0 mt-1 bg-stone-950 p-1 rounded-full border border-stone-800">
                                    {quest.status === 'active' && <Circle className="w-5 h-5 text-amber-500" />}
                                    {quest.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                    {quest.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                            </div>
                        </div>
                        ))
                    )}
                </div>
              )}

              {/* Notes Tab (Lorebook) */}
              {activeTab === 'notes' && (
                  <div className="space-y-6">
                     <h2 className="text-lg fantasy-font text-stone-400 border-b border-stone-800 pb-2 mb-4">Нотатки про світ</h2>
                     {notes.length === 0 ? (
                        <div className="text-center text-stone-600 italic py-8">
                            Ви ще не дізналися нічого вартого запису.
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {notes.map((note) => (
                                <div key={note.id} className="bg-stone-900/80 border border-stone-800 p-3 rounded hover:bg-stone-800 transition-colors">
                                    <div className="flex items-center gap-2 mb-2 border-b border-stone-800 pb-1">
                                        {getNoteIcon(note.type)}
                                        <span className="text-amber-500 font-bold text-sm uppercase tracking-wider">{note.type}</span>
                                        <span className="text-stone-600 text-xs ml-auto">
                                            {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <h4 className="text-stone-200 font-bold mb-1">{note.title}</h4>
                                    <p className="text-xs text-stone-400 leading-relaxed font-serif">{note.content}</p>
                                </div>
                            ))}
                        </div>
                     )}
                  </div>
              )}

               {/* Story Tab (Summary) */}
               {activeTab === 'story' && (
                  <div className="space-y-6">
                     <h2 className="text-lg fantasy-font text-stone-400 border-b border-stone-800 pb-2 mb-4">Хроніки Пригод</h2>
                     {!storySummary ? (
                        <div className="text-center text-stone-600 italic py-8">
                            Історія лише починається...
                        </div>
                     ) : (
                        <div className="prose prose-invert prose-amber max-w-none">
                           <div className="bg-stone-900/50 p-6 rounded-lg border border-stone-800 font-serif leading-loose text-stone-300 shadow-inner">
                              <ReactMarkdown>{storySummary}</ReactMarkdown>
                           </div>
                        </div>
                     )}
                     <div className="text-xs text-stone-600 text-center mt-4">
                        *Цей літопис оновлюється автоматично в міру ваших подорожей*
                     </div>
                  </div>
              )}

            </div>
        </div>

        {/* Decorative Footer */}
        <div className="bg-stone-900 p-2 border-t border-stone-800 text-center text-[10px] text-stone-600 uppercase tracking-widest flex justify-center gap-4">
           <span>D&D Campaign Companion</span>
           <span>•</span>
           <span>Journal v1.1</span>
        </div>
      </div>
    </div>
  );
};

export default Journal;

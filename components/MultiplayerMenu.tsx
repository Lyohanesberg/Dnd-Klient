
import React, { useState } from 'react';
import { Users, Copy, LogIn, Play } from 'lucide-react';
import { createSession, joinSession } from '../services/firebaseService';

interface MultiplayerMenuProps {
  onHost: (sessionId: string) => void;
  onJoin: (sessionId: string) => void;
  currentSessionId: string | null;
  isHost: boolean;
  gameState: any; // Pass current state to upload when hosting
}

const MultiplayerMenu: React.FC<MultiplayerMenuProps> = ({ onHost, onJoin, currentSessionId, isHost, gameState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHost = async () => {
    setIsLoading(true);
    try {
      // Extract relevant state to sync
      const initialState = {
        location: gameState.location,
        combatState: gameState.combatState,
        mapTokens: gameState.mapTokens,
        quests: gameState.quests,
        notes: gameState.notes,
        storySummary: gameState.storySummary,
        messages: gameState.messages
      };
      
      const id = await createSession(initialState);
      onHost(id);
      setIsOpen(false);
    } catch (e: any) {
      console.error(e);
      setError("Помилка створення сесії (перевірте Firebase Config)");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinInput) return;
    setIsLoading(true);
    try {
      const exists = await joinSession(joinInput.trim().toUpperCase());
      if (exists) {
        onJoin(joinInput.trim().toUpperCase());
        setIsOpen(false);
      } else {
        setError("Сесію не знайдено");
      }
    } catch (e: any) {
      console.error(e);
      setError("Помилка з'єднання");
    } finally {
      setIsLoading(false);
    }
  };

  const copyId = () => {
    if (currentSessionId) {
      navigator.clipboard.writeText(currentSessionId);
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded flex items-center gap-2 transition-colors ${currentSessionId ? 'bg-green-900/30 text-green-400 border border-green-800' : 'hover:bg-stone-800 text-stone-400'}`}
        title="Мультиплеєр"
      >
        <Users className="w-5 h-5" />
        {currentSessionId && <span className="text-xs font-bold hidden md:inline">ONLINE</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-stone-900 border border-stone-700 rounded shadow-2xl p-4 animate-in fade-in zoom-in duration-200">
          <h3 className="text-stone-200 font-bold mb-4 flex items-center gap-2">
             <Users className="w-4 h-4 text-amber-500" /> Мультиплеєр
          </h3>

          {error && (
             <div className="bg-red-900/20 border border-red-800 text-red-400 text-xs p-2 rounded mb-3">
                {error}
             </div>
          )}

          {!currentSessionId ? (
            <div className="space-y-4">
              <div className="border-b border-stone-800 pb-4">
                <button 
                   onClick={handleHost}
                   disabled={isLoading}
                   className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                   <Play className="w-4 h-4" /> Створити Гру (Host)
                </button>
                <p className="text-[10px] text-stone-500 mt-1 text-center">
                  Ви будете керувати ШІ та світом.
                </p>
              </div>

              <div>
                 <div className="flex gap-2 mb-2">
                    <input 
                       type="text" 
                       value={joinInput}
                       onChange={(e) => setJoinInput(e.target.value)}
                       placeholder="ID Сесії..."
                       className="flex-1 bg-stone-800 border border-stone-600 text-stone-200 text-sm rounded px-2 py-1 focus:border-amber-500 focus:outline-none"
                    />
                    <button 
                       onClick={handleJoin}
                       disabled={isLoading || !joinInput}
                       className="bg-stone-700 hover:bg-stone-600 text-stone-200 p-2 rounded disabled:opacity-50"
                    >
                       <LogIn className="w-4 h-4" />
                    </button>
                 </div>
                 <p className="text-[10px] text-stone-500 text-center">
                    Приєднатися як гравець.
                 </p>
              </div>
            </div>
          ) : (
             <div className="space-y-4">
                <div className="bg-black/40 p-3 rounded border border-stone-800 text-center">
                   <div className="text-[10px] text-stone-500 uppercase mb-1">ID Сесії</div>
                   <div className="flex items-center justify-center gap-2">
                      <code className="text-xl text-amber-500 font-bold tracking-widest">
                         {currentSessionId}
                      </code>
                      <button onClick={copyId} className="text-stone-400 hover:text-white">
                         <Copy className="w-4 h-4" />
                      </button>
                   </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-xs">
                   <span className={`w-2 h-2 rounded-full ${isHost ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                   <span className="text-stone-400">Ви: </span>
                   <span className="font-bold text-stone-200">{isHost ? "HOST (DM)" : "PLAYER"}</span>
                </div>

                <div className="text-[10px] text-stone-500 text-center">
                   {isHost 
                     ? "Ваш клієнт обробляє ШІ запити." 
                     : "Дані синхронізуються з хостом."}
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiplayerMenu;

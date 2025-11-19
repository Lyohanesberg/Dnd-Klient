
import React, { useState, useRef, useEffect } from 'react';
import { createDMSession, resumeDMSession, generateLocationImage, generateStorySummary, sendWithRetry } from './services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { Character, DEFAULT_CHARACTER, Message, Sender, PendingRoll, LocationState, Quest, CombatState, Note, MapToken, TokenPosition } from './types';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';
import Journal from './components/Journal';
import Typewriter from './components/Typewriter';
import CombatTracker from './components/CombatTracker';
import CloudSaves from './components/CloudSaves';
import AudioController from './components/AudioController';
import BattleMap from './components/BattleMap';
import MultiplayerMenu from './components/MultiplayerMenu';
import { subscribeToSession, sendMessageToSession, updateSessionState } from './services/firebaseService';
import { AudioProvider, useAudio } from './contexts/AudioContext';
import { 
  Send, Sword, Scroll, Loader2, 
  Crosshair, Wand2, Music, Shield, Ghost, Axe, Hammer, Leaf, Skull, HandMetal, MapPin, Image as ImageIcon, Book, Cloud, Map as MapIcon, MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Simple utility to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const AppContent = () => {
  const [character, setCharacter] = useState<Character>(DEFAULT_CHARACTER);
  const [gameStarted, setGameStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [storySummary, setStorySummary] = useState<string>("");
  const [combatState, setCombatState] = useState<CombatState>({ isActive: false, combatants: [] });
  const [mapTokens, setMapTokens] = useState<MapToken[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'sheet'>('sheet');
  const [viewMode, setViewMode] = useState<'chat' | 'map'>('chat'); 
  const [pendingRoll, setPendingRoll] = useState<PendingRoll | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showCloudSaves, setShowCloudSaves] = useState(false);
  
  // Multiplayer State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);

  const [location, setLocation] = useState<LocationState>({
    name: "Невідома Локація",
    description: "Тьмяне світло факелів...",
    isGenerating: false
  });
  
  // Audio Context
  const { playTrack, playSfx, initializeAudio } = useAudio();

  // Chat session reference
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- MULTIPLAYER SYNC LOGIC ---

  // 1. Listener: Sync state FROM Firebase when in multiplayer
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, (data) => {
       // Sync Chat (Always append new ones, but simplistic replace works for MVP)
       if (data.messages && data.messages.length > messages.length) {
          setMessages(data.messages);
          playSfx('neutral');
       }

       // Sync World State
       // If I am NOT the host, I accept the world truth.
       // If I AM the host, I don't overwrite my local state from DB unless it changed by someone else (handled via optimistic updates usually, but here we assume Host is source of truth for Logic)
       // Actually, let's allow clients to move tokens, so Host must listen to Token changes too.
       
       if (!isHost) {
           if (data.location) setLocation(data.location);
           if (data.combatState) setCombatState(data.combatState);
           if (data.mapTokens) setMapTokens(data.mapTokens);
           if (data.quests) setQuests(data.quests);
           if (data.notes) setNotes(data.notes);
           if (data.storySummary) setStorySummary(data.storySummary);
       } else {
           // Host listens for Token moves from players
           if (JSON.stringify(data.mapTokens) !== JSON.stringify(mapTokens)) {
               setMapTokens(data.mapTokens);
           }
           
           // Host listens for new messages to trigger AI
           if (data.messages && data.messages.length > messages.length) {
               const newMsgs = data.messages;
               setMessages(newMsgs);
               
               // Check if the last message is from a USER and Host wasn't the one sending it (or even if Host sent it)
               // We need to trigger AI response if the last message is User and we are Host
               const lastMsg = newMsgs[newMsgs.length - 1];
               if (lastMsg.sender === Sender.User) {
                   triggerAIResponseForMultiplayer(lastMsg.text, newMsgs);
               }
           }
       }
    });

    return () => unsubscribe();
  }, [sessionId, isHost, messages.length]); // dependency on length to detect changes

  // 2. Broadcaster: Sync state TO Firebase (Only Host does this for World State)
  // We wrap these in a function to call manually when state changes significantly
  const syncWorldState = async () => {
      if (!sessionId || !isHost) return;
      await updateSessionState(sessionId, {
          location,
          combatState,
          quests,
          notes,
          storySummary,
          mapTokens // Host is authority on tokens usually, but we allow client moves below
      });
  };

  // Sync specifically when components update critical state
  useEffect(() => { if(sessionId && isHost) syncWorldState(); }, [location, combatState, quests, notes, storySummary]);

  // Special case: Map Tokens can be moved by anyone.
  // If Client moves token -> updates local -> updates Firebase.
  // If Host moves token -> updates local -> updates Firebase.
  const handleTokenUpdateMultiplayer = async (newTokens: MapToken[]) => {
      if (!sessionId) return;
      await updateSessionState(sessionId, { mapTokens: newTokens });
  };


  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, activeTab, pendingRoll, viewMode]);

  // --- AUDIO TRIGGERS ---
  
  useEffect(() => {
      if (gameStarted) {
          if (combatState.isActive) {
              playTrack('combat');
              // Auto-switch to map on combat start if not already there
              if (viewMode === 'chat') setViewMode('map');
          } else {
              playTrack('exploration');
          }
      }
  }, [combatState.isActive, gameStarted]);

  useEffect(() => {
      if (!combatState.isActive && gameStarted) {
          const desc = location.description.toLowerCase();
          const name = location.name.toLowerCase();
          
          if (name.includes('таверн') || desc.includes('таверн') || desc.includes('людн') || desc.includes('місто')) {
              playTrack('tavern');
          } else if (name.includes('підземел') || desc.includes('темр') || desc.includes('страх')) {
              playTrack('dungeon');
          } else {
              playTrack('exploration');
          }
      }
  }, [location, combatState.isActive, gameStarted]);


  // --- MAP SYNC LOGIC ---
  useEffect(() => {
     if (combatState.isActive && combatState.combatants.length > 0 && isHost) { // Only Host spawns tokens
         setMapTokens(prevTokens => {
             const newTokens = [...prevTokens];
             let changed = false;

             combatState.combatants.forEach((c, idx) => {
                 const existing = newTokens.find(t => t.id === c.name);
                 if (!existing) {
                     let x = c.type === 'player' ? 2 + (idx % 3) : 17 - (idx % 3);
                     let y = 5 + idx; 
                     newTokens.push({
                         id: c.name,
                         type: c.type,
                         position: { x, y },
                         size: 1
                     });
                     changed = true;
                 }
             });
             
             if (changed && sessionId) {
                 // Defer update to avoid render loop, or rely on the useEffect hooks
             }
             return changed ? newTokens : prevTokens;
         });
     }
  }, [combatState.combatants, combatState.isActive, isHost]);

  const handleMoveToken = (id: string, newPos: TokenPosition) => {
      const newTokens = mapTokens.map(t => t.id === id ? { ...t, position: newPos } : t);
      setMapTokens(newTokens);
      playSfx('click');
      
      if (sessionId) {
          handleTokenUpdateMultiplayer(newTokens);
      }
  };


  // --- AUTO-SUMMARIZATION LOGIC ---
  useEffect(() => {
     if (gameStarted && isHost && messages.length > 0 && messages.length % 10 === 0) {
        const updateSummary = async () => {
           const recent = messages.slice(-10);
           const newSummary = await generateStorySummary(storySummary, recent);
           setStorySummary(newSummary);
        };
        updateSummary();
     }
  }, [messages.length, gameStarted, isHost]);


  const getClassIcon = (className: string) => {
    const c = className.toLowerCase();
    const iconClass = "text-white w-6 h-6";
    if (c.includes('слідопит') || c.includes('ranger')) return <Crosshair className={iconClass} />;
    if (c.includes('воїн') || c.includes('fighter')) return <Sword className={iconClass} />;
    if (c.includes('чарівник') || c.includes('wizard')) return <Wand2 className={iconClass} />;
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
      mapTokens,
      timestamp: Date.now()
    };
  };

  const saveGame = () => {
    const gameState = getGameState();
    try {
      localStorage.setItem('dnd_campaign_save', JSON.stringify(gameState));
      playSfx('success');
    } catch (e) {
      console.error("Failed to save game locally", e);
      playSfx('error');
    }
  };

  const handleLoadGameData = async (gameState: any) => {
    try {
        if (gameState.character) setCharacter(gameState.character);
        if (gameState.messages) setMessages(gameState.messages);
        if (gameState.location) setLocation(gameState.location);
        if (gameState.quests) setQuests(gameState.quests);
        if (gameState.notes) setNotes(gameState.notes);
        if (gameState.storySummary) setStorySummary(gameState.storySummary);
        if (gameState.combatState) setCombatState(gameState.combatState);
        if (gameState.mapTokens) setMapTokens(gameState.mapTokens);
        
        setGameStarted(true);
        setActiveTab('chat');
        initializeAudio(); 
  
        // Resuming AI session (Host only effectively uses this)
        const session = await resumeDMSession(
            gameState.character || DEFAULT_CHARACTER, 
            gameState.messages || [], 
            gameState.storySummary
        );
        
        if (session) {
          chatSessionRef.current = session;
          const sysMsg = {
            id: generateId(),
            text: "*[Система]: Гра успішно завантажена.*",
            sender: Sender.System,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, sysMsg]);
          // Don't sync load message to multiplayer history to avoid spam
          playSfx('success');
        }
      } catch (e) {
        console.error(e);
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
      console.error(e);
      alert("Помилка завантаження.");
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    initializeAudio(); 
    setIsLoading(true);
    setGameStarted(true);
    setActiveTab('chat');

    if (!sessionId || isHost) {
        const session = await createDMSession(character, storySummary);
        if (session) {
            chatSessionRef.current = session;
            try {
                // Only Host or Single player triggers initial text
                await sendMessage("Починай пригоду. Опиши де я і що відбувається.", Sender.User, true);
            } catch (error) {
               // error handling
            }
        }
    } else {
        // Client joining doesn't start new AI session, just enters view
        setMessages(prev => [...prev, {
            id: generateId(),
            text: "Ви приєдналися до гри. Очікуйте дій Майстра...",
            sender: Sender.System,
            timestamp: Date.now()
        }]);
    }
    setIsLoading(false);
  };

  // --- CORE GAME LOOP LOGIC ---

  const handleUpdateLocation = async (name: string, description: string) => {
    setLocation(prev => ({ ...prev, name, description, isGenerating: true }));
    try {
        const imageUrl = await generateLocationImage(description);
        setLocation(prev => ({ ...prev, imageUrl: imageUrl || undefined, isGenerating: false }));
    } catch (e) {
        setLocation(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const executeFunctionCall = (name: string, args: any): string => {
    let result = "Function executed.";
    
    if (name === 'update_hp') {
      const amount = args.amount as number;
      const reason = args.reason as string;
      setCharacter(prev => ({ ...prev, hp: Math.min(prev.maxHp, Math.max(0, prev.hp + amount)) }));
      
      const changeStr = amount > 0 ? `+${amount}` : `${amount}`;
      const msg = {
        id: generateId(),
        text: `**[Система]:** HP змінено: ${changeStr} (${reason})`,
        sender: Sender.System,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, msg]);
      if (sessionId && isHost) sendMessageToSession(sessionId, msg);
      
      if (amount < 0) playSfx('error'); 
      result = `HP updated. Current: ${character.hp + amount}/${character.maxHp}.`;
    } 
    else if (name === 'update_location') {
        handleUpdateLocation(args.name, args.description);
        result = `Location updated to ${args.name}.`;
    }
    // ... (Other tool implementations remain similar, ensuring updates trigger sync via hooks)
    else if (name === 'manage_combat') {
        const action = args.action;
        if (action === 'start') setCombatState({ isActive: true, combatants: [] });
        else if (action === 'end') setCombatState({ isActive: false, combatants: [] });
        else if (action === 'update') setCombatState(prev => ({ ...prev, isActive: true, combatants: args.combatants }));
        
        const msg = {
             id: generateId(),
             text: `**[БІЙ]:** ${action.toUpperCase()}`,
             sender: Sender.System,
             timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
        if (sessionId && isHost) sendMessageToSession(sessionId, msg);
    }

    return result;
  };

  const processAIResponse = async (response: GenerateContentResponse) => {
    let currentResponse = response;
    let loopCount = 0;

    if (currentResponse.text) {
      const msg = {
        id: generateId(),
        text: currentResponse.text,
        sender: Sender.AI,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, msg]);
      if (sessionId && isHost) sendMessageToSession(sessionId, msg);
    }

    while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && loopCount < 5) {
      loopCount++;
      const functionResponses = [];
      let requiresUserInteraction = false;

      for (const call of currentResponse.functionCalls) {
        if (call.name === 'request_roll') {
           requiresUserInteraction = true;
           setPendingRoll({
             callId: call.id,
             ability: (call.args as any).ability,
             skill: (call.args as any).skill,
             dc: (call.args as any).dc,
             reason: (call.args as any).reason,
             otherResponses: functionResponses 
           });
           playSfx('neutral');
        } else {
           const result = executeFunctionCall(call.name, call.args);
           functionResponses.push({
             functionResponse: { name: call.name, response: { result: result }, id: call.id }
           });
        }
      }

      if (requiresUserInteraction) {
        setIsLoading(false);
        return; 
      }

      setIsLoading(true);
      currentResponse = await sendWithRetry(chatSessionRef.current!, functionResponses);
      
      if (currentResponse.text) {
        const msg = {
            id: generateId(),
            text: currentResponse.text,
            sender: Sender.AI,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
        if (sessionId && isHost) sendMessageToSession(sessionId, msg);
      }
    }
    setIsLoading(false);
  };

  // Function specifically for Host to react to incoming multiplayer messages
  const triggerAIResponseForMultiplayer = async (lastUserText: string, fullHistory: Message[]) => {
      if (isLoading || !chatSessionRef.current) return;
      setIsLoading(true);
      try {
           // We need to ensure chatSessionRef's history matches reality.
           // For simplicty in this implementation, we just send the last text. 
           // A more robust solution would reset chat history if out of sync.
           const response = await sendWithRetry(chatSessionRef.current, lastUserText);
           await processAIResponse(response);
      } catch (e) {
          console.error(e);
          setIsLoading(false);
      }
  };

  const sendMessage = async (content: string, type: Sender = Sender.User, isInit = false) => {
    if ((!content.trim() && !isInit) || isLoading) return;

    const newMessage: Message = {
        id: generateId(),
        text: content,
        sender: type,
        timestamp: Date.now()
    };

    if (!isInit) {
      setMessages(prev => [...prev, newMessage]);
      setInputValue("");
    }

    // If Multiplayer
    if (sessionId) {
        await sendMessageToSession(sessionId, newMessage);
        // If Client: We are done. Host will see message via listener and trigger AI.
        if (!isHost) return;
    }
    
    // If Host or Single Player, run AI
    if (!chatSessionRef.current) return;
    setIsLoading(true);

    try {
      const response = await sendWithRetry(chatSessionRef.current, content);
      await processAIResponse(response);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: generateId(),
        text: "Майстер задумався...",
        sender: Sender.System,
        timestamp: Date.now(),
        isError: true
      }]);
      setIsLoading(false);
    }
  };

  const handleDiceRoll = (resultMessage: string) => {
    // Handle pending rolls (Tool interactions)
    if (pendingRoll && chatSessionRef.current) {
        // Logic matches single player, but Host executes it
        // If client rolls, they send text. Host needs to manually intercept "Rolled X" text to satisfy tool?
        // For MVP: PendingRolls are UI blocking only for the person who triggered them (usually Host in single player context).
        // In Multiplayer, ideally only the player requested rolls.
        // Implementation limitation: Currently only Host runs AI, so PendingRoll shows on Host screen.
        
       const match = resultMessage.match(/\*\*(\d+)\*\*/);
       if (match) {
         const val = parseInt(match[1]);
         const total = val; // Simplified calc
         
         const finalMsg = {
            id: generateId(),
            text: `[🎲 CHECK]: Result **${total}**`,
            sender: Sender.System,
            timestamp: Date.now()
         };

         setMessages(prev => [...prev, finalMsg]);
         if(sessionId && isHost) sendMessageToSession(sessionId, finalMsg);

         // Resolve tool
         setPendingRoll(null);
         setIsLoading(true);
         
         const rollResponse = {
            functionResponse: {
                name: 'request_roll',
                id: pendingRoll.callId,
                response: { result: `Rolled: ${total}` }
            }
         };
         const allResponses = [...pendingRoll.otherResponses, rollResponse];
         
         // Resume AI
         sendWithRetry(chatSessionRef.current, allResponses).then(processAIResponse);
         return;
       }
    }

    // Standard Roll
    sendMessage(resultMessage, Sender.User); // Use User sender so Host AI sees it
  };

  // Multiplayer Setup Handlers
  const onHostSession = (id: string) => {
      setSessionId(id);
      setIsHost(true);
      playSfx('success');
  };

  const onJoinSession = (id: string) => {
      setSessionId(id);
      setIsHost(false);
      playSfx('success');
      // Load initial state listener will handle the rest
      setGameStarted(true);
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
          <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center border-2 border-amber-500 shadow-glow">
            {getClassIcon(character.class)}
          </div>
          <h1 className="text-xl md:text-2xl text-amber-500 font-bold tracking-wider fantasy-font hidden md:block">
            D&D AI Master
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
           <MultiplayerMenu 
              onHost={onHostSession} 
              onJoin={onJoinSession} 
              currentSessionId={sessionId}
              isHost={isHost}
              gameState={getGameState()}
           />

           {gameStarted && <AudioController />}
        
           <button onClick={() => setShowCloudSaves(true)} className="p-2 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-500">
              <Cloud className="w-5 h-5" />
           </button>

           {gameStarted && (
              <button onClick={() => setShowJournal(true)} className="p-2 rounded hover:bg-stone-800 text-amber-500 relative">
                <Book className="w-5 h-5" />
                {quests.some(q => q.status === 'active') && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              </button>
           )}

           {gameStarted && (
            <div className="md:hidden flex bg-stone-800 rounded p-1 ml-2">
              <button onClick={() => setActiveTab('sheet')} className={`p-2 rounded ${activeTab === 'sheet' ? 'bg-stone-700 text-amber-400' : 'text-stone-500'}`}>
                <Scroll className="w-5 h-5" />
              </button>
              <button onClick={() => setActiveTab('chat')} className={`p-2 rounded ${activeTab === 'chat' ? 'bg-stone-700 text-amber-400' : 'text-stone-500'}`}>
                <Sword className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex relative">
        
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

        {gameStarted && (
          <section 
            className={`
                absolute md:relative w-full md:w-2/3 lg:w-3/4 h-full flex flex-col transition-all duration-500 bg-cover bg-center
                ${activeTab === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}
            style={{ backgroundImage: location.imageUrl ? `url(${location.imageUrl})` : "url('https://www.transparenttextures.com/patterns/dark-matter.png')" }}
          >
            <div className={`absolute inset-0 backdrop-blur-[1px] pointer-events-none transition-colors duration-1000 ${combatState.isActive ? 'bg-red-950/80' : 'bg-stone-950/90'}`} />

            <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/80 to-transparent shrink-0">
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="text-amber-100 font-bold text-lg fantasy-font tracking-wide leading-none drop-shadow-md">
                            {location.name}
                        </h2>
                        {location.isGenerating && <div className="text-[10px] text-amber-500 flex items-center gap-1 animate-pulse"><ImageIcon className="w-3 h-3" /> Генерую візуалізацію...</div>}
                    </div>
                </div>
                
                <div className="flex bg-black/50 rounded-lg p-1 backdrop-blur-md border border-stone-700">
                     <button onClick={() => setViewMode('chat')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'chat' ? 'bg-stone-700 text-amber-500' : 'text-stone-400'}`}>
                        <MessageSquare className="w-3 h-3" /> Чат
                     </button>
                     <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'map' ? 'bg-stone-700 text-amber-500' : 'text-stone-400'}`}>
                        <MapIcon className="w-3 h-3" /> Мапа
                     </button>
                </div>
            </div>
            
            {viewMode === 'map' && (
                <div className="flex-1 relative z-10 p-4 overflow-hidden">
                     <div className="w-full h-full bg-stone-900 border border-stone-700 rounded-lg overflow-hidden shadow-2xl">
                         <BattleMap 
                            tokens={mapTokens}
                            combatants={combatState.combatants}
                            backgroundImage={location.imageUrl}
                            onMoveToken={handleMoveToken}
                         />
                     </div>
                </div>
            )}

            {viewMode === 'chat' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-4 relative z-10 scrollbar-thin">
                {messages.map((msg, index) => {
                    const isLastMessage = index === messages.length - 1;
                    return (
                    <div key={msg.id} className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                        max-w-[90%] md:max-w-[80%] rounded-lg p-4 text-base leading-relaxed shadow-lg backdrop-blur-sm
                        ${msg.sender === Sender.User ? 'bg-stone-800/90 text-stone-200 border border-stone-600' : msg.sender === Sender.System ? 'bg-stone-900/80 text-amber-500 text-sm italic' : 'bg-stone-950/85 text-stone-300 border border-amber-900/50'}
                        `}>
                        {msg.sender === Sender.AI && <div className="text-amber-700 text-xs font-bold mb-1 uppercase">DM</div>}
                        {msg.sender === Sender.User && <div className="text-stone-500 text-xs font-bold mb-1 uppercase text-right">{character.name}</div>}
                        
                        {isLastMessage && msg.sender === Sender.AI && !msg.isError ? (
                            <Typewriter text={msg.text} />
                        ) : (
                            <div className="markdown-content prose prose-invert prose-p:my-1 prose-strong:text-amber-500"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
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
            )}

            {pendingRoll && (
                <div className="absolute top-16 left-4 right-4 md:left-1/4 md:right-1/4 z-40 animate-in zoom-in duration-300">
                    <div className="bg-stone-900/95 border-2 border-amber-500 rounded-lg p-6 shadow-lg flex flex-col items-center text-center gap-4 backdrop-blur-md">
                         <div className="text-amber-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">Майстер вимагає перевірки!</div>
                         <h3 className="text-3xl fantasy-font text-stone-100">{pendingRoll.ability.toUpperCase()} CHECK</h3>
                         <p className="text-stone-400 italic">"{pendingRoll.reason}"</p>
                    </div>
                </div>
            )}

            <div className="bg-stone-950 p-0 shrink-0 z-30 relative border-t border-stone-800">
              <DiceRoller onRoll={(msg) => handleDiceRoll(msg)} />
              
              <div className="p-4 flex gap-2 bg-stone-900">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                  placeholder={pendingRoll ? "Киньте кубик..." : "Що ви робите?"}
                  className="flex-1 bg-stone-800 border border-stone-700 text-stone-200 rounded px-4 py-3 focus:border-amber-600 focus:outline-none"
                  disabled={isLoading || !!pendingRoll}
                />
                <button onClick={() => sendMessage(inputValue)} disabled={isLoading || !inputValue.trim() || !!pendingRoll} className="bg-amber-700 hover:bg-amber-600 text-white rounded px-6 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

          </section>
        )}
      </main>
    </div>
  );
};

export default function App() {
    return (
        <AudioProvider>
            <AppContent />
        </AudioProvider>
    );
}

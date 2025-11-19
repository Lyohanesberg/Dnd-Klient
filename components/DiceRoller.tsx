import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CuboidIcon, TriangleIcon, HexagonIcon, Dna } from 'lucide-react'; 

interface DiceRollerProps {
  onRoll: (result: string) => void;
}

type DieType = 4 | 6 | 8 | 10 | 12 | 20;

const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll }) => {
  const [rollingDie, setRollingDie] = useState<DieType | null>(null);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const rollDie = (sides: DieType, name: string) => {
    setRollingDie(sides);
    setShowResult(false);
    setRollResult(null);

    // 1. Start Animation phase
    setTimeout(() => {
      // 2. Calculate Result
      const result = Math.floor(Math.random() * sides) + 1;
      setRollResult(result);
      setShowResult(true);

      // 3. Send to Chat after user sees it briefly
      setTimeout(() => {
        const message = `[🎲 Кидок ${name}]: **${result}**`;
        onRoll(message);
        
        // 4. Reset UI
        setTimeout(() => {
           setRollingDie(null);
        }, 500);
      }, 1500);
    }, 1000); // Duration of "shaking"
  };

  return (
    <>
      {/* Rolling Overlay - Portaled to body to escape z-index/transform contexts */}
      {rollingDie && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
           <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-300">
              <div className={`relative w-48 h-48 flex items-center justify-center transition-all duration-500 ${showResult ? 'scale-110' : 'animate-dice-shake'}`}>
                 <DieGraphic sides={rollingDie} result={showResult ? rollResult : null} />
              </div>
              <div className="text-amber-500 text-2xl font-bold fantasy-font tracking-widest uppercase drop-shadow-lg">
                {showResult ? `Результат: ${rollResult}` : 'Кидаємо...'}
              </div>
           </div>
        </div>,
        document.body
      )}

      {/* Inline Styles for Shake Animation */}
      <style>{`
        @keyframes dice-shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .animate-dice-shake {
          animation: dice-shake 0.5s infinite;
        }
      `}</style>

      {/* Dice Panel */}
      <div className="p-4 bg-stone-900 border-t border-stone-700 shadow-2xl relative z-10">
        <h3 className="text-amber-500 text-sm font-bold mb-3 uppercase tracking-widest text-center flex items-center justify-center gap-2">
            <span>Панель Кубиків</span>
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          <DiceButton sides={4} label="d4" icon={<DieIcon4 />} onClick={() => rollDie(4, 'd4')} disabled={!!rollingDie} />
          <DiceButton sides={6} label="d6" icon={<DieIcon6 />} onClick={() => rollDie(6, 'd6')} disabled={!!rollingDie} />
          <DiceButton sides={8} label="d8" icon={<DieIcon8 />} onClick={() => rollDie(8, 'd8')} disabled={!!rollingDie} />
          <DiceButton sides={10} label="d10" icon={<DieIcon10 />} onClick={() => rollDie(10, 'd10')} disabled={!!rollingDie} />
          <DiceButton sides={12} label="d12" icon={<DieIcon12 />} onClick={() => rollDie(12, 'd12')} disabled={!!rollingDie} />
          <DiceButton 
            sides={20} 
            label="d20" 
            icon={<DieIcon20 />} 
            customClass="border-amber-500 bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 ring-1 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            onClick={() => rollDie(20, 'd20')} 
            disabled={!!rollingDie} 
          />
        </div>
      </div>
    </>
  );
};

// --- Graphics & Icons ---

const DieGraphic: React.FC<{sides: DieType, result: number | null}> = ({sides, result}) => {
    const baseClass = "w-full h-full drop-shadow-[0_0_15px_rgba(217,119,6,0.5)] filter";
    const textClass = "fill-white text-4xl font-bold anchor-middle text-center dominant-baseline-middle drop-shadow-md";

    // Inner function to render text centered
    const renderText = () => result !== null && (
        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fontSize="40" fill="#fff" fontWeight="bold" style={{ textShadow: '2px 2px 4px #000' }}>
            {result}
        </text>
    );

    switch (sides) {
        case 4:
            return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                    <polygon points="50,5 95,90 5,90" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                    <path d="M50,5 L50,55 L95,90" fill="rgba(0,0,0,0.2)" />
                    {renderText()}
                </svg>
            );
        case 6:
            return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                    <rect x="10" y="10" width="80" height="80" rx="10" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                    <rect x="10" y="50" width="80" height="40" fill="rgba(0,0,0,0.1)" rx="10" />
                    {renderText()}
                </svg>
            );
        case 8:
             return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                    <polygon points="50,2 95,50 50,98 5,50" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="50" y1="2" x2="50" y2="98" stroke="#f59e0b" strokeWidth="1" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="#f59e0b" strokeWidth="1" />
                    <polygon points="50,50 95,50 50,98" fill="rgba(0,0,0,0.2)" />
                    {renderText()}
                </svg>
            );
        case 10:
            return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                    <polygon points="50,2 95,40 50,98 5,40" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                    <line x1="50" y1="2" x2="50" y2="98" stroke="#f59e0b" strokeWidth="1" />
                    <line x1="5" y1="40" x2="95" y2="40" stroke="#f59e0b" strokeWidth="1" />
                     <polygon points="50,40 95,40 50,98" fill="rgba(0,0,0,0.2)" />
                    {renderText()}
                </svg>
            );
        case 12:
             return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                   <polygon points="50,2 95,35 78,90 22,90 5,35" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                   <polygon points="50,50 78,90 22,90" fill="rgba(0,0,0,0.2)" />
                   {renderText()}
                </svg>
            );
        case 20:
            return (
                <svg viewBox="0 0 100 100" className={baseClass}>
                    <path d="M50 2 L93 25 L93 75 L50 98 L7 75 L7 25 Z" fill="#b45309" stroke="#f59e0b" strokeWidth="2" />
                    <path d="M50 2 L93 25 L50 50 L7 25 Z" fill="rgba(255,255,255,0.1)" />
                    <path d="M7 25 L50 50 L50 98 L7 75 Z" fill="rgba(0,0,0,0.2)" />
                    <path d="M93 25 L93 75 L50 98 L50 50 Z" fill="rgba(0,0,0,0.1)" />
                    {renderText()}
                </svg>
            );
        default:
            return null;
    }
};

// --- Icons for Buttons ---
const DieIcon4 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2L20 20H4L12 2Z" /></svg>;
const DieIcon6 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
const DieIcon8 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2L22 12L12 22L2 12L12 2Z" /></svg>;
const DieIcon10 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2L22 10L12 22L2 10L12 2Z" /></svg>; // Simplified
const DieIcon12 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 2L21 8.5V17.5L12 22L3 17.5V8.5L12 2Z" /></svg>; // Hex as proxy for D12

// Updated D20 Icon - Solid/Filled look as requested
const DieIcon20 = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 drop-shadow-md">
       {/* Solid background shapes to look like an 'image' */}
       <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#92400e" stroke="#fcd34d" />
       <path d="M2 7V17L12 22L22 17V7L12 12L2 7Z" fill="#78350f" stroke="#fcd34d" />
       <path d="M12 22V12" stroke="#fcd34d" />
       <path d="M12 12L2 7" stroke="#fcd34d" />
       <path d="M12 12L22 7" stroke="#fcd34d" />
    </svg>
);

interface DiceButtonProps {
  sides: number;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  customClass?: string;
}

const DiceButton: React.FC<DiceButtonProps> = ({ sides, label, icon, onClick, disabled, customClass }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex flex-col items-center justify-center w-14 h-14 rounded-lg
        border border-stone-600 bg-stone-800 text-stone-300
        transition-all duration-200 active:scale-95 hover:border-amber-500 hover:text-white hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${customClass || ''}
      `}
    >
      <div className="mb-1 transition-transform group-hover:scale-110 text-stone-400 group-hover:text-amber-500">
        {icon}
      </div>
      <span className="text-[10px] font-bold leading-none">{label}</span>
    </button>
  );
};

export default DiceRoller;
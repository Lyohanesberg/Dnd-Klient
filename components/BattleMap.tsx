
import React, { useState, useRef, useEffect } from 'react';
import { MapToken, TokenPosition, Combatant } from '../types';
import { User, Skull, Shield, Move } from 'lucide-react';

interface BattleMapProps {
  tokens: MapToken[];
  combatants: Combatant[];
  backgroundImage?: string;
  onMoveToken: (id: string, newPos: TokenPosition) => void;
}

const GRID_SIZE = 40; // pixels
const GRID_COLS = 20;
const GRID_ROWS = 15;

const BattleMap: React.FC<BattleMapProps> = ({ tokens, combatants, backgroundImage, onMoveToken }) => {
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get combatant details for a token
  const getCombatant = (id: string) => combatants.find(c => c.name === id);

  const handleMouseDown = (e: React.MouseEvent, tokenId: string) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate offset within the token to prevent jumping
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
        setDraggingToken(tokenId);
        setDragOffset({
            x: x - token.position.x * GRID_SIZE,
            y: y - token.position.y * GRID_SIZE
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingToken && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;

        // Snap to grid
        const gridX = Math.max(0, Math.min(GRID_COLS - 1, Math.round(x / GRID_SIZE)));
        const gridY = Math.max(0, Math.min(GRID_ROWS - 1, Math.round(y / GRID_SIZE)));

        onMoveToken(draggingToken, { x: gridX, y: gridY });
    }
    setDraggingToken(null);
    setMousePos(null);
  };

  // Calculate distance if dragging
  const getDragDistance = () => {
      if (!draggingToken || !mousePos) return null;
      const token = tokens.find(t => t.id === draggingToken);
      if (!token) return null;

      const currentX = token.position.x;
      const currentY = token.position.y;
      
      // Projected grid position
      const rawX = mousePos.x - dragOffset.x;
      const rawY = mousePos.y - dragOffset.y;
      const gridX = Math.round(rawX / GRID_SIZE);
      const gridY = Math.round(rawY / GRID_SIZE);

      // Euclidean distance in feet (1 square = 5ft)
      const dx = Math.abs(gridX - currentX);
      const dy = Math.abs(gridY - currentY);
      
      // D&D 5e rule: Diagonal is 5ft (simplified) or 5-10-5 (variant). 
      // Simplified for UI: Chebyshev distance (max(dx, dy) * 5) is common in standard grid rules
      const dist = Math.max(dx, dy) * 5;
      
      return `${dist} ft`;
  };

  return (
    <div 
        className="w-full h-full flex items-center justify-center bg-stone-900 p-4 overflow-auto select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div 
        ref={containerRef}
        className="relative shadow-2xl border-4 border-stone-800"
        style={{
            width: GRID_COLS * GRID_SIZE,
            height: GRID_ROWS * GRID_SIZE,
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
      >
        {/* Dark Overlay for atmosphere */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Grid Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" width="100%" height="100%">
            <defs>
                <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                    <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Distance Indicator */}
        {draggingToken && getDragDistance() && (
             <div 
                className="absolute z-50 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none border border-white/20"
                style={{
                    left: mousePos?.x,
                    top: (mousePos?.y || 0) - 40
                }}
             >
                 {getDragDistance()}
             </div>
        )}

        {/* Tokens */}
        {tokens.map((token) => {
            const combatant = getCombatant(token.id);
            const isDragging = draggingToken === token.id;
            
            // Position calculation: use mouse pos if dragging, else grid pos
            let left = token.position.x * GRID_SIZE;
            let top = token.position.y * GRID_SIZE;
            
            if (isDragging && mousePos) {
                left = mousePos.x - dragOffset.x;
                top = mousePos.y - dragOffset.y;
            }

            const colorClass = token.type === 'player' 
                ? 'border-blue-500 bg-blue-900/80 text-blue-200' 
                : token.type === 'enemy'
                    ? 'border-red-500 bg-red-900/80 text-red-200'
                    : 'border-green-500 bg-green-900/80 text-green-200';

            return (
                <div
                    key={token.id}
                    onMouseDown={(e) => handleMouseDown(e, token.id)}
                    className={`
                        absolute rounded-full border-2 flex items-center justify-center cursor-grab active:cursor-grabbing
                        shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-transform hover:scale-110
                        ${colorClass}
                        ${isDragging ? 'z-50 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'z-10'}
                    `}
                    style={{
                        width: GRID_SIZE - 4,
                        height: GRID_SIZE - 4,
                        left: left + 2,
                        top: top + 2,
                        transition: isDragging ? 'none' : 'all 0.2s ease-out'
                    }}
                    title={token.id}
                >
                    {token.type === 'player' ? <User className="w-5 h-5" /> : 
                     token.type === 'enemy' ? <Skull className="w-5 h-5" /> : 
                     <Shield className="w-5 h-5" />}
                    
                    {/* Initiative badge */}
                    <div className="absolute -top-2 -right-2 bg-black border border-stone-600 rounded-full w-5 h-5 flex items-center justify-center text-[9px] text-white">
                        {combatant?.initiative || 0}
                    </div>
                </div>
            );
        })}
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-[10px] text-stone-400 pointer-events-none border border-stone-700">
         Перетягуйте токени • 1 клітинка = 5 футів
      </div>
    </div>
  );
};

export default BattleMap;

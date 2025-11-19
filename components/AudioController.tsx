
import React, { useState } from 'react';
import { useAudio } from '../contexts/AudioContext';
import { Volume2, VolumeX, Music } from 'lucide-react';

const AudioController: React.FC = () => {
  const { isMuted, volume, toggleMute, setVolume, isPlaying } = useAudio();
  const [showSlider, setShowSlider] = useState(false);

  return (
    <div 
        className="relative flex items-center"
        onMouseEnter={() => setShowSlider(true)}
        onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={toggleMute}
        className={`p-2 rounded transition-colors ${isPlaying ? 'text-amber-500 hover:bg-stone-800' : 'text-stone-600 hover:text-stone-400'}`}
        title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Slider Popup */}
      <div className={`
          absolute top-full right-0 mt-2 bg-stone-900 border border-stone-700 p-3 rounded shadow-xl z-50 flex flex-col items-center gap-2 w-32
          transition-all duration-200 origin-top
          ${showSlider ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        <div className="flex items-center gap-2 w-full">
            <Music className="w-3 h-3 text-stone-500" />
            <span className="text-[10px] text-stone-400 uppercase font-bold">Гучність</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>
    </div>
  );
};

export default AudioController;

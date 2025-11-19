
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { playUiClick, playDiceShake, playDiceRoll, playNotification } from '../utils/audioSynth';

// --- Music Tracks ---
// Using royalty-free placeholder URLs. In a real production app, these should be hosted files.
const TRACKS = {
  exploration: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=fantasy-atmosphere-116630.mp3", // Calm fantasy ambient
  combat: "https://cdn.pixabay.com/download/audio/2022/03/22/audio_c0316b8627.mp3?filename=action-drum-loop-103568.mp3", // Drums/Action
  tavern: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=medieval-market-16571.mp3", // Bustling
  dungeon: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_4f719e8c6b.mp3?filename=dark-drone-26755.mp3", // Eerie
};

type MusicType = keyof typeof TRACKS;

interface AudioContextType {
  isMuted: boolean;
  volume: number;
  currentTrack: MusicType;
  isPlaying: boolean;
  toggleMute: () => void;
  setVolume: (val: number) => void;
  playTrack: (type: MusicType) => void;
  playSfx: (type: 'click' | 'dice_shake' | 'dice_roll' | 'success' | 'error' | 'neutral') => void;
  initializeAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3); // Default 30%
  const [currentTrack, setCurrentTrack] = useState<MusicType>('exploration');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize Audio Element
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;
    
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const initializeAudio = () => {
     if (isInitialized) return;
     // User interaction required to unlock audio context
     setIsInitialized(true);
     // Start playing current track if not started
     if (!isPlaying && audioRef.current) {
         playTrack(currentTrack);
     }
  };

  const playTrack = async (type: MusicType) => {
    if (!audioRef.current) return;
    
    // If changing track or starting fresh
    if (currentTrack !== type || !isPlaying) {
        setCurrentTrack(type);
        audioRef.current.src = TRACKS[type];
        audioRef.current.volume = isMuted ? 0 : volume;
        
        try {
            await audioRef.current.play();
            setIsPlaying(true);
        } catch (e) {
            console.warn("Autoplay blocked or failed", e);
            setIsPlaying(false);
        }
    }
  };

  const toggleMute = () => {
      setIsMuted(prev => !prev);
  };

  const playSfx = (type: string) => {
      if (isMuted) return;
      
      switch (type) {
          case 'click': playUiClick(); break;
          case 'dice_shake': playDiceShake(); break;
          case 'dice_roll': playDiceRoll(); break;
          case 'success': playNotification('success'); break;
          case 'error': playNotification('error'); break;
          default: playNotification('neutral');
      }
  };

  return (
    <AudioContext.Provider value={{
      isMuted,
      volume,
      currentTrack,
      isPlaying,
      toggleMute,
      setVolume,
      playTrack,
      playSfx,
      initializeAudio
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

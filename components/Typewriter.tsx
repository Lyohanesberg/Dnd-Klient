
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    
    let i = 0;
    const intervalId = setInterval(() => {
      if (i >= text.length) {
        clearInterval(intervalId);
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }
      
      // To speed up markdown parsing avoid breaking tag sequences, 
      // we can chunk by words or just accept the flicker. 
      // For standard Markdown, character by character is usually fine but fast.
      // Let's do small chunks for better performance
      const chunk = text.slice(i, i + 2); 
      setDisplayedText(prev => prev + chunk);
      i += 2;
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  // If text changes completely (different message), reset.
  // Note: ReactMarkdown handles the partial markdown strings relatively well.
  
  return (
    <div className="markdown-content prose prose-invert prose-p:my-1 prose-strong:text-amber-500 prose-em:text-stone-400">
       <ReactMarkdown>{displayedText}</ReactMarkdown>
    </div>
  );
};

export default Typewriter;

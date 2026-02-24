import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box } from '../types';
import { Plus, Rocket } from 'lucide-react';

interface GridBoxProps {
  box: Box;
  onClick: () => void;
  selectedCategory: string;
}

export const GridBox: React.FC<GridBoxProps> = ({ box, onClick, selectedCategory }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isOccupied = box.status === 'active';

  React.useEffect(() => {
    setImageError(false);
  }, [box.logo_url]);

  const isMatch = useMemo(() => {
    const categoryFilter = selectedCategory !== 'All';
    
    // If it's an empty slot, it only "matches" if no filters are active
    if (!isOccupied) {
      return !categoryFilter;
    }

    const matchesCategory = !categoryFilter || box.category === selectedCategory;

    return matchesCategory;
  }, [selectedCategory, isOccupied, box.category]);

  const isDimmed = selectedCategory !== 'All' && !isMatch;

  return (
    <div className={`relative ${isHovered ? 'z-50' : 'z-0'} transition-opacity duration-300 ${isDimmed ? 'opacity-20 grayscale' : 'opacity-100'}`}>
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`
          relative w-full aspect-[3/2] cursor-pointer overflow-hidden transition-colors duration-150
          ${isOccupied ? 'bg-white shadow-sm border-0' : 'bg-empty hover:bg-hover-empty border-0'}
          ${!isOccupied && isHovered ? 'border-2 border-sky' : ''}
          focus:outline-none focus:ring-2 focus:ring-sky focus:ring-offset-2
        `}
        aria-label={
          isOccupied 
            ? `${box.startup_name} — Click to visit their website.` 
            : `Slot ${box.id} — Available. Click to advertise your startup.`
        }
      >
        {isOccupied ? (
          <div className="w-full h-full p-2 flex items-center justify-center relative">
            {box.logo_url && !imageError ? (
              <img
                src={box.logo_url}
                alt={box.startup_name}
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 opacity-20">
                <Rocket size={24} className="text-ink" />
                <span className="text-[8px] font-black uppercase tracking-widest text-ink">
                  {imageError ? 'Logo Error' : 'No Logo'}
                </span>
              </div>
            )}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#1A1A2E]"
                />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              animate={isHovered ? { 
                scale: [1, 1.2, 1],
              } : { scale: 1 }}
              transition={{
                scale: { 
                  duration: 2, 
                  repeat: isHovered ? Infinity : 0, 
                  ease: "easeInOut" 
                }
              }}
            >
              <Plus 
                className={`transition-colors duration-200 ${isHovered ? 'text-sky' : 'text-[#9CA3AF]/40'}`} 
                size={18} 
              />
            </motion.div>
          </div>
        )}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && isOccupied && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ delay: 0.2, duration: 0.12 }}
            className="absolute z-[100] top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-[220px] bg-ink text-white p-3 rounded-[6px] text-center shadow-lg pointer-events-none"
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-bottom-[6px] border-b-ink" />
            <p className="font-bold text-[13px]">{box.startup_name}</p>
            {box.inventor_name && (
              <p className="text-[10px] text-sky font-black uppercase tracking-widest mt-1">
                By {box.inventor_name}
              </p>
            )}
            {box.tagline && (
              <p className="text-[13px] text-white/70 font-normal mt-0.5 leading-tight">
                {box.tagline}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

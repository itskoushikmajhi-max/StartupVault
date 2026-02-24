import React from 'react';
import { motion } from 'motion/react';
import { Box } from '../types';
import { GridBox } from './GridBox';

interface GridProps {
  boxes: Box[];
  onBoxClick: (box: Box) => void;
  selectedCategory: string;
  isLoading: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.005,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
};

export const Grid: React.FC<GridProps> = ({ boxes, onBoxClick, selectedCategory, isLoading }) => {
  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-8 py-10">
      {isLoading ? (
        <div className="grid grid-cols-5 md:grid-cols-10 gap-[10px]">
          {Array.from({ length: 100 }).map((_, i) => (
            <div 
              key={`skeleton-${i}`} 
              className="w-full aspect-[3/2] bg-empty animate-pulse rounded-[4px]"
            />
          ))}
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-5 md:grid-cols-10 gap-[10px]"
        >
          {boxes.length > 0 ? (
            boxes.map((box) => (
              <motion.div key={box.id} variants={itemVariants}>
                <GridBox 
                  box={box} 
                  onClick={() => onBoxClick(box)} 
                  selectedCategory={selectedCategory}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-muted font-mono text-sm uppercase tracking-widest">No slots found.</p>
            </div>
          )}
        </motion.div>
      )}
    </section>
  );
};

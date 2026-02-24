import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FormErrorProps {
  message: string | null;
}

export const FormError: React.FC<FormErrorProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 mb-6"
        >
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">Error</span>
            <p className="text-xs text-red-700 font-medium leading-relaxed">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

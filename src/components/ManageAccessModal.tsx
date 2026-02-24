import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Hash, ArrowRight, Loader2 } from 'lucide-react';
import { FormError } from './FormError';
import { Box } from '../types';

interface ManageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (id: number, key: string, box: Box) => void;
}

export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({ isOpen, onClose, onAuth }) => {
  const [id, setId] = useState('');
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      setError('Please enter a valid Slot ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/box/${numericId}/auth?key=${key}`);
      if (response.ok) {
        const data = await response.json();
        onAuth(numericId, key, data.box);
        // Reset form for next time
        setId('');
        setKey('');
      } else {
        const data = await response.json();
        setError(data.error || 'Authentication failed. Please check your Slot ID and Secret Key.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#1A1A2E]/70 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-[400px] bg-white p-8 shadow-2xl rounded-lg"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-sky/10 text-sky rounded-full flex items-center justify-center mx-auto mb-4">
                <Key size={24} />
              </div>
              <h2 className="text-xl font-bold text-ink">Manage Your Slot</h2>
              <p className="text-xs text-muted mt-1 uppercase tracking-widest font-black">Authentication Required</p>
            </div>

            <FormError message={error} />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Hash size={12} className="text-sky" />
                  Slot ID
                </label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 42"
                  className="w-full h-12 px-4 border border-empty focus:border-sky focus:outline-none transition-colors text-ink text-sm font-mono"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Key size={12} className="text-sky" />
                  Secret Key
                </label>
                <input
                  required
                  type="password"
                  placeholder="Enter your secret key"
                  className="w-full h-12 px-4 border border-empty focus:border-sky focus:outline-none transition-colors text-ink text-sm font-mono"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[52px] bg-ink text-white font-bold text-[14px] tracking-[0.05em] uppercase hover:bg-sky transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px] disabled:bg-empty disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

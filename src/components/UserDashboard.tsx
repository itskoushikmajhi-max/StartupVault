import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Save, LogOut, AlertCircle } from 'lucide-react';
import { Box } from '../types';
import { CATEGORIES } from '../constants';
import { FormError } from './FormError';

interface UserDashboardProps {
  boxId: number;
  secretKey: string;
  initialData: Box;
  onClose: () => void;
  onUpdate: (updatedBox: Box) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ boxId, secretKey, initialData, onClose, onUpdate }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startup_name: initialData.startup_name || '',
    tagline: initialData.tagline || '',
    category: initialData.category || CATEGORIES[0],
    logo_url: initialData.logo_url || '',
    target_url: initialData.target_url || '',
    inventor_name: initialData.inventor_name || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/box/${boxId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret_key: secretKey,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.box);
        onClose();
      } else {
        setError('Failed to update details. Please try again.');
      }
    } catch (error) {
      console.error('Update error:', error);
      setError('A network error occurred while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "w-full h-12 px-4 border border-empty focus:border-sky focus:outline-none transition-colors text-ink text-sm";
  const labelClasses = "block text-[14px] font-semibold text-ink mb-2";

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-[520px] bg-white p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-ink transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-surface border border-empty rounded flex items-center justify-center p-1">
              <img src={formData.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <h2 className="text-[22px] font-semibold text-ink">Manage Slot #{boxId}</h2>
              <p className="text-xs text-muted uppercase font-black tracking-widest">Dashboard</p>
            </div>
          </div>

          <FormError message={error} />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClasses}>Startup Name</label>
              <input
                required
                type="text"
                className={inputClasses}
                placeholder="Enter your startup name"
                value={formData.startup_name}
                onChange={(e) => setFormData({ ...formData, startup_name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClasses}>Inventor Name</label>
              <input
                required
                type="text"
                className={inputClasses}
                placeholder="Enter inventor name"
                value={formData.inventor_name}
                onChange={(e) => setFormData({ ...formData, inventor_name: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[14px] font-semibold text-ink">Short Tagline</label>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  {formData.tagline.length} / 80
                </span>
              </div>
              <input
                required
                maxLength={80}
                type="text"
                className={inputClasses}
                placeholder="Enter a short tagline"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClasses}>Category</label>
              <select
                required
                className={inputClasses}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Logo URL</label>
              <input
                required
                type="url"
                className={inputClasses}
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClasses}>Website URL</label>
              <input
                required
                type="url"
                className={inputClasses}
                placeholder="https://yourstartup.com"
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-grow h-[52px] bg-ink text-white font-bold text-[16px] tracking-[0.02em] hover:bg-sky transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px] disabled:bg-empty"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-[52px] h-[52px] bg-white text-ink border border-empty hover:border-ink transition-all flex items-center justify-center"
                title="Cancel"
              >
                <LogOut size={20} />
              </button>
            </div>
          </form>
          
          <div className="mt-8 p-4 bg-surface border border-empty rounded-lg">
            <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-2">Your Secret Key</p>
            <div className="font-mono text-[11px] break-all bg-white p-2 border border-empty rounded select-all">
              {secretKey}
            </div>
            <p className="text-[9px] text-muted mt-2 italic">Keep this key safe. You need it to edit your slot details later.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

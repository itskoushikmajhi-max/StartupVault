import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Upload, Link as LinkIcon, Save, AlertCircle } from 'lucide-react';
import { Box } from '../types';
import { CATEGORIES } from '../constants';
import { FormError } from './FormError';

interface BuyingPortalProps {
  box: Box | null;
  onClose: () => void;
  onSuccess: (newBox: Box) => void;
}

export const BuyingPortal: React.FC<BuyingPortalProps> = ({ box, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [purchasedBox, setPurchasedBox] = useState<Box | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoMethod, setLogoMethod] = useState<'url' | 'upload'>('url');
  const [formData, setFormData] = useState({
    startup_name: '',
    tagline: '',
    category: CATEGORIES[0],
    logo_url: '',
    target_url: '',
    inventor_name: '',
    email: ''
  });
  const [logoDimensions, setLogoDimensions] = useState<{ width: number, height: number } | null>(null);

  if (!box) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('File size too large. Please use an image under 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 400; // Optimal size for the grid boxes

          // Maintain aspect ratio while resizing
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Use high-quality image smoothing
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }
          
          const resizedDataUrl = canvas.toDataURL('image/png');
          setFormData({ ...formData, logo_url: resizedDataUrl });
          setLogoDimensions({ width: img.width, height: img.height });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: box.id,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSecretKey(data.secret_key);
        setPurchasedBox(data.box);
        setStep(3);
      } else {
        setError('Failed to purchase slot. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setError('A network error occurred while finalizing your purchase.');
    } finally {
      setIsLoading(false);
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

          <h2 className="text-[22px] font-semibold text-ink mb-6">
            {step === 1 ? `Claiming Slot #${box.id}` : step === 2 ? 'Confirm Your Details' : 'Success!'}
          </h2>

          <FormError message={error} />

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div>
                <label className={labelClasses}>Startup Name</label>
                <input
                  required
                  type="text"
                  className={inputClasses}
                  placeholder="Acme Inc."
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
                  placeholder="Jane Doe"
                  value={formData.inventor_name}
                  onChange={(e) => setFormData({ ...formData, inventor_name: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[14px] font-semibold text-ink">Short Tagline</label>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.tagline.length >= 70 ? 'text-sky' : 'text-muted'}`}>
                    {formData.tagline.length} / 80
                  </span>
                </div>
                <input
                  required
                  maxLength={80}
                  type="text"
                  className={inputClasses}
                  placeholder="The world's best widget maker."
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
                <label className={labelClasses}>Startup Logo</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoMethod('url');
                      setFormData({ ...formData, logo_url: '' });
                      setLogoDimensions(null);
                    }}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-bold border transition-all ${logoMethod === 'url' ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-empty hover:border-ink/20'}`}
                  >
                    <LinkIcon size={14} />
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoMethod('upload');
                      setFormData({ ...formData, logo_url: '' });
                      setLogoDimensions(null);
                    }}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-bold border transition-all ${logoMethod === 'upload' ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-empty hover:border-ink/20'}`}
                  >
                    <Upload size={14} />
                    Upload
                  </button>
                </div>

                {logoMethod === 'url' ? (
                  <input
                    required
                    type="url"
                    className={inputClasses}
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  />
                ) : (
                  <div className="relative">
                    <input
                      required={!formData.logo_url}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`w-full h-12 px-4 border border-dashed border-empty flex items-center justify-between transition-colors ${formData.logo_url ? 'bg-sky/5 border-sky/30' : 'bg-surface'}`}>
                      <span className="text-sm text-muted truncate max-w-[200px]">
                        {formData.logo_url ? 'Logo selected' : 'Choose logo file...'}
                      </span>
                      <Upload size={16} className="text-muted" />
                    </div>
                  </div>
                )}
                {formData.logo_url && logoMethod === 'upload' && (
                  <div className="mt-3 p-4 bg-surface border border-empty rounded-lg flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-empty rounded flex items-center justify-center p-1 shrink-0">
                      <img src={formData.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted uppercase font-black tracking-widest">Logo Preview</span>
                      {logoDimensions && (
                        <span className="text-xs font-mono text-ink/60">
                          {logoDimensions.width} × {logoDimensions.height} px
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-[11px] text-muted">Use a square or rectangular logo with transparent background.</p>
                  <p className="text-[11px] font-bold text-sky/80 uppercase tracking-tight">Max file size: 2MB</p>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Website URL</label>
                <input
                  required
                  type="url"
                  className={inputClasses}
                  placeholder="https://acme.com"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClasses}>Contact Email</label>
                <input
                  required
                  type="email"
                  className={inputClasses}
                  placeholder="founder@acme.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="w-full h-[52px] bg-ink text-white font-bold text-[16px] tracking-[0.02em] hover:bg-sky transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px]"
              >
                Review Details →
              </button>
            </form>
          ) : step === 2 ? (
            <div className="space-y-8">
              <div className="bg-surface p-6 border border-empty rounded-lg space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-empty">
                  <div className="w-16 h-16 bg-white border border-empty rounded flex items-center justify-center p-1 shrink-0">
                    <img src={formData.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-lg">{formData.startup_name}</h3>
                    <p className="text-xs text-muted uppercase font-black tracking-widest">By {formData.inventor_name}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Category</p>
                    <p className="font-medium text-ink">{formData.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Website</p>
                    <p className="font-medium text-ink truncate">{formData.target_url}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Tagline</p>
                    <p className="font-medium text-ink italic">"{formData.tagline}"</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  disabled={isLoading}
                  onClick={handleFinalSubmit}
                  className="w-full h-[52px] bg-ink text-white font-bold text-[16px] tracking-[0.02em] hover:bg-sky transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px] disabled:bg-empty disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Finalizing...
                    </>
                  ) : (
                    'Confirm & Purchase Slot →'
                  )}
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => setStep(1)}
                  className="w-full h-[52px] bg-white text-ink border border-empty font-bold text-[16px] tracking-[0.02em] hover:border-ink transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px] disabled:opacity-50"
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 text-center">
              <div className="w-20 h-20 bg-sky/10 text-sky rounded-full flex items-center justify-center mx-auto mb-6">
                <Save size={40} />
              </div>
              <h3 className="text-2xl font-bold text-ink">Success!</h3>
              <p className="text-muted text-sm">Your slot has been claimed and is now live on the grid.</p>
              
              <div className="bg-surface p-6 border border-empty rounded-lg text-left space-y-4">
                <div>
                  <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Your Slot ID</p>
                  <div className="font-mono text-lg font-bold text-sky">
                    #{purchasedBox?.id || box.id}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted uppercase font-black tracking-widest mb-1">Your Secret Key</p>
                  <div className="font-mono text-xs break-all bg-white p-3 border border-empty rounded select-all font-bold text-ink">
                    {secretKey}
                  </div>
                </div>
                
                <p className="text-[11px] text-muted italic">
                  <strong>Important:</strong> Save both your <strong>Slot ID</strong> and <strong>Secret Key</strong>! You will need them to edit your startup details in the future.
                </p>
              </div>

              <button
                onClick={() => purchasedBox && onSuccess(purchasedBox)}
                className="w-full h-[52px] bg-ink text-white font-bold text-[16px] tracking-[0.02em] hover:bg-sky transition-all duration-200 flex items-center justify-center gap-2 active:translate-y-[1px]"
              >
                Go to Grid →
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

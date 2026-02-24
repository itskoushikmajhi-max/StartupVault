import React from 'react';

interface SiteHeaderProps {}

export const SiteHeader: React.FC<SiteHeaderProps> = () => {
  return (
    <header className="w-full border-b border-[#EEEEEE] py-3 px-8 flex items-center justify-center">
      <div className="flex items-center gap-1">
        <span className="font-mono text-base font-bold text-ink">Startup</span>
        <span className="font-mono text-base font-bold text-sky">Vault</span>
      </div>
    </header>
  );
};

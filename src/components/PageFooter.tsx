import React from 'react';

export const PageFooter: React.FC = () => {
  return (
    <footer className="w-full bg-surface py-10 mt-16 border-t border-[#EEEEEE]">
      <div className="max-w-[1200px] mx-auto px-8 flex flex-col items-center">
        <p className="text-muted text-[11px] uppercase tracking-[0.06em]">
          © {new Date().getFullYear()} StartupVault. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

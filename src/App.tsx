import React, { useState, useEffect, useMemo } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { Grid } from './components/Grid';
import { PageFooter } from './components/PageFooter';
import { BuyingPortal } from './components/BuyingPortal';
import { UserDashboard } from './components/UserDashboard';
import { ManageAccessModal } from './components/ManageAccessModal';
import { Box } from './types';
import { CATEGORIES } from './constants';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardAuth, setDashboardAuth] = useState<{ id: number, key: string, box: Box } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const fetchBoxes = async (page: number) => {
    setIsLoading(true);
    setSetupError(null);
    try {
      const response = await fetch(`/api/boxes?page=${page}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        setSetupError(data.error);
        setBoxes([]);
        return;
      }

      setBoxes(data.boxes || []);
      setOccupiedCount(data.occupied || 0);
      
      if (data.pagination) {
        setTotalBoxes(data.pagination.total || 0);
        setTotalPages(data.pagination.totalPages || 1);
        setCurrentPage(data.pagination.page || 1);
      }
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
      setBoxes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes(currentPage);
  }, [currentPage]);

  const handleBoxClick = (box: Box) => {
    if (box.status === 'active') {
      window.open(box.target_url, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedBox(box);
      setIsPortalOpen(true);
    }
  };

  const handlePurchaseSuccess = (newBox: Box) => {
    setIsPortalOpen(false);
    setSelectedBox(null);
    
    // Update state optimistically
    setBoxes(prev => prev.map(b => b.id === newBox.id ? newBox : b));
    setOccupiedCount(prev => prev + 1);
    
    // Still fetch to ensure sync with pagination and other data
    fetchBoxes(currentPage);
  };

  const handleManageClick = () => {
    setIsAccessModalOpen(true);
  };

  const handleAuthSuccess = (id: number, key: string, box: Box) => {
    setDashboardAuth({ id, key, box });
    setIsAccessModalOpen(false);
    setIsDashboardOpen(true);
  };

  const closeDashboard = () => setIsDashboardOpen(false);
  const closePortal = () => setIsPortalOpen(false);
  const closeAccessModal = () => setIsAccessModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow">
        <div className="text-center mt-6 mb-8 px-4">
          <div className="inline-block bg-ink/5 px-4 py-2 rounded border border-ink/10">
            <h1 className="font-mono text-sm md:text-base font-medium text-ink tracking-tight">
              <span className="text-sky">&gt;</span> Limited Space, Unlimited Growth
              <span className="inline-block w-2 h-4 bg-sky ml-1 animate-pulse align-middle"></span>
            </h1>
          </div>
        </div>

        {/* Category Filter */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 mb-6">
          {setupError && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-700 font-bold uppercase tracking-widest text-xs">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Setup Required
              </div>
              <p className="text-sm text-amber-900 leading-relaxed max-w-2xl mx-auto">
                {setupError}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
            <div className="flex items-center gap-2 text-muted mr-2 shrink-0">
              <Filter size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Filter:</span>
            </div>
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${selectedCategory === 'All' ? 'bg-ink text-white border-ink' : 'bg-transparent text-ink/40 border-transparent hover:text-ink hover:border-empty'}`}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${selectedCategory === cat ? 'bg-ink text-white border-ink' : 'bg-transparent text-ink/40 border-transparent hover:text-ink hover:border-empty'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          {/* Occupied Slots Counter */}
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-ink/5 rounded text-[10px] font-mono font-bold uppercase tracking-[0.1em]">
              <span className="text-sky">{occupiedCount}</span>
              <span className="text-muted">/</span>
              <span className="text-ink">{totalBoxes}</span>
            </div>
          </div>
        </div>

        <Grid 
          boxes={boxes} 
          onBoxClick={handleBoxClick} 
          selectedCategory={selectedCategory}
          isLoading={isLoading}
        />

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-10 flex flex-col items-center gap-6">
          <button 
            onClick={handleManageClick}
            className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-muted hover:text-sky transition-all border border-empty px-6 py-2 rounded hover:border-sky/20 hover:bg-sky/5 active:translate-y-[1px]"
          >
            Manage Your Slot
          </button>
          
          {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 mb-12">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 rounded-full border border-empty hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`
                    w-10 h-10 rounded-full font-semibold text-sm transition-all
                    ${currentPage === page 
                      ? 'bg-ink text-white' 
                      : 'text-ink hover:bg-surface border border-transparent hover:border-empty'}
                  `}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 rounded-full border border-empty hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
        </div>
      </main>

      <PageFooter />

      {isPortalOpen && (
        <BuyingPortal 
          box={selectedBox} 
          onClose={closePortal} 
          onSuccess={handlePurchaseSuccess}
        />
      )}

      <ManageAccessModal 
        isOpen={isAccessModalOpen}
        onClose={closeAccessModal}
        onAuth={handleAuthSuccess}
      />

      {isDashboardOpen && dashboardAuth && (
        <UserDashboard 
          boxId={dashboardAuth.id}
          secretKey={dashboardAuth.key}
          initialData={dashboardAuth.box}
          onClose={closeDashboard}
          onUpdate={(updatedBox) => {
            setBoxes(prev => prev.map(b => b.id === updatedBox.id ? updatedBox : b));
            fetchBoxes(currentPage);
          }}
        />
      )}
    </div>
  );
}

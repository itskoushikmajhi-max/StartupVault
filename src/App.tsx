import React, { useState, useEffect, useMemo } from 'react';
import { SiteHeader } from './components/SiteHeader';
import { Grid } from './components/Grid';
import { PageFooter } from './components/PageFooter';
import { BuyingPortal } from './components/BuyingPortal';
import { UserDashboard } from './components/UserDashboard';
import { ManageAccessModal } from './components/ManageAccessModal';
import { Box } from './types';
import { CATEGORIES } from './constants';
import { ChevronLeft, ChevronRight, Filter, Rocket } from 'lucide-react';

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardAuth, setDashboardAuth] = useState<{ id: number, key: string, box: Box } | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [userSlots, setUserSlots] = useState<Box[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [occupiedCount, setOccupiedCount] = useState(0);
  const [setupRequired, setSetupRequired] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
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
      
      if (data.setupRequired || (!data.boxes || data.boxes.length === 0)) {
        setSetupRequired(true);
        setErrorType(data.errorType || (data.boxes?.length === 0 ? 'EMPTY_TABLE' : null));
        setSetupError(data.message || (data.boxes?.length === 0 ? 'The database is connected but no slots were found.' : null));
      } else {
        setSetupRequired(false);
      }
      
      if (data.pagination) {
        setTotalBoxes(data.pagination.total || 0);
        setTotalPages(data.pagination.totalPages || 1);
        setCurrentPage(data.pagination.page || 1);
      }

      if (!data.boxes || data.boxes.length === 0) {
        console.warn('No boxes returned from API. This might be due to Supabase RLS policies blocking access.');
      }
    } catch (error: any) {
      console.error('Failed to fetch boxes:', error);
      setSetupError(error.message || 'Failed to connect to the server. Please check your connection.');
      setBoxes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const user = event.data.user;
        setGithubUser(user);
        fetchUserSlots(user.id);
        console.log('GitHub User Connected:', user);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchUserSlots = async (githubId: string | number) => {
    try {
      const response = await fetch(`/api/user/slots?github_id=${githubId}`);
      if (response.ok) {
        const data = await response.json();
        setUserSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Failed to fetch user slots:', err);
    }
  };

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

  const handleManageSlot = (box: Box) => {
    setDashboardAuth({ id: box.id, key: box.secret_key || '', box });
    setIsDashboardOpen(true);
  };

  const closeDashboard = () => setIsDashboardOpen(false);
  const closePortal = () => setIsPortalOpen(false);
  const closeAccessModal = () => setIsAccessModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      
      <main className="flex-grow">
        {setupRequired ? (
          <div className="max-w-[800px] mx-auto px-4 md:px-8 mt-12 mb-20">
            <div className="bg-surface border-2 border-dashed border-empty p-8 rounded-xl text-center">
              <div className="w-16 h-16 bg-ink/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Rocket className="text-ink opacity-20" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-ink mb-4">Database Setup Required</h2>
              <p className="text-muted mb-8 max-w-md mx-auto leading-relaxed">
                {errorType === 'TABLE_MISSING' 
                  ? "The 'boxes' table was not found in your Supabase project. Please run the SQL below in your Supabase SQL Editor."
                  : "There was an issue connecting to your database. Please check your environment variables."}
              </p>

              <div className="bg-ink text-white p-6 rounded-lg text-left font-mono text-xs overflow-x-auto mb-8 shadow-xl">
                <pre className="whitespace-pre-wrap">
{`-- 1. Create Boxes Table
CREATE TABLE boxes (
  id int8 PRIMARY KEY,
  status text DEFAULT 'available',
  secret_key text,
  startup_name text,
  tagline text,
  category text,
  logo_url text,
  target_url text,
  inventor_name text,
  github_id text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Orders Table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id int8 REFERENCES boxes(id),
  startup_name text NOT NULL,
  inventor_name text NOT NULL,
  category text NOT NULL,
  target_url text NOT NULL,
  email text NOT NULL,
  payment_amount numeric DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Public Read Policy
CREATE POLICY "Public Read Access" ON boxes FOR SELECT TO anon USING (true);
REVOKE SELECT (secret_key) ON TABLE boxes FROM anon;`}
                </pre>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => fetchBoxes(1)}
                  className="w-full sm:w-auto px-8 py-4 bg-ink text-white font-bold uppercase tracking-widest hover:bg-sky transition-all rounded"
                >
                  I've run the SQL, Refresh Now
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/seed', { method: 'POST' });
                      if (res.ok) fetchBoxes(1);
                      else alert('Seeding failed. Please ensure the table exists.');
                    } catch (err) {
                      alert('Connection error.');
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-ink text-ink font-bold uppercase tracking-widest hover:bg-ink hover:text-white transition-all rounded"
                >
                  Try Auto-Seed
                </button>
              </div>
              
              {setupError && (
                <p className="mt-6 text-error text-[10px] font-mono uppercase tracking-widest">
                  Error: {setupError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* GitHub User Profile / My Slots */}
            {githubUser && (
              <div className="max-w-[1200px] mx-auto px-4 md:px-8 mt-8">
                <div className="bg-surface border border-empty p-6 rounded-lg flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img src={githubUser.avatar_url} alt={githubUser.login} className="w-12 h-12 rounded-full border border-empty" />
                    <div>
                      <p className="text-xs text-muted uppercase font-black tracking-widest">Connected as</p>
                      <h3 className="text-lg font-bold text-ink">@{githubUser.login}</h3>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {userSlots.length > 0 ? (
                      userSlots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => handleManageSlot(slot)}
                          className="px-4 py-2 bg-white border border-empty hover:border-sky text-ink text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          Manage Slot #{slot.id}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted italic">You don't own any slots yet.</p>
                    )}
                    <button 
                      onClick={() => { setGithubUser(null); setUserSlots([]); }}
                      className="px-4 py-2 text-muted hover:text-ink text-[10px] font-bold uppercase tracking-widest"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}

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
          </>
        )}
      </main>

      <PageFooter />

      {isPortalOpen && (
        <BuyingPortal 
          box={selectedBox} 
          onClose={closePortal} 
          onSuccess={handlePurchaseSuccess}
          githubUser={githubUser}
        />
      )}

      <ManageAccessModal 
        isOpen={isAccessModalOpen}
        onClose={closeAccessModal}
        onAuth={handleAuthSuccess}
        onGithubAuth={(user) => setGithubUser(user)}
      />

      {isDashboardOpen && dashboardAuth && (
        <UserDashboard 
          boxId={dashboardAuth.id}
          secretKey={dashboardAuth.key}
          githubId={githubUser?.id}
          initialData={dashboardAuth.box}
          onClose={closeDashboard}
          onUpdate={(updatedBox) => {
            setBoxes(prev => prev.map(b => b.id === updatedBox.id ? updatedBox : b));
            fetchBoxes(currentPage);
            if (githubUser) fetchUserSlots(githubUser.id);
          }}
        />
      )}
    </div>
  );
}

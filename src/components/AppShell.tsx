'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Link from 'next/link';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="bg-atelier-gradient min-h-screen text-on-surface font-body-md overflow-x-hidden">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-16 bg-white/40 backdrop-blur-xl shadow-sm border-b border-white/50">
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden material-symbols-outlined text-primary p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            menu
          </button>
          <span className="font-headline-md text-headline-md font-semibold text-primary tracking-tight">Biju Deesse</span>
          <div className="hidden md:flex gap-6">
            <Link href="/" className="font-label-caps text-label-caps text-primary border-b-2 border-primary py-5">
              Dashboard
            </Link>
            <Link href="/sales" className="font-label-caps text-label-caps text-on-surface-variant hover:bg-white/20 transition-colors py-5 px-2">
              Sales
            </Link>
            <Link href="/inventory" className="font-label-caps text-label-caps text-on-surface-variant hover:bg-white/20 transition-colors py-5 px-2">
              Inventory
            </Link>
            <Link href="/customers" className="font-label-caps text-label-caps text-on-surface-variant hover:bg-white/20 transition-colors py-5 px-2">
              Customers
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="bg-transparent border-none border-b border-outline-variant/50 pl-10 pr-4 py-2 font-label-caps text-label-caps rose-gold-glow focus:ring-0 w-64"
              placeholder="SEARCH PIECES..."
              type="text"
            />
          </div>
          <button className="material-symbols-outlined text-primary p-2 hover:bg-white/20 rounded-full transition-colors">notifications</button>
          <button className="material-symbols-outlined text-primary p-2 hover:bg-white/20 rounded-full transition-colors">settings</button>
          <div className="w-8 h-8 rounded-full bg-primary-fixed overflow-hidden border border-white/50">
            <img
              alt="Administrator Profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG8wWaKFgD0uTXFbnvchZJy0-eG660VOqYzQxMa5YCu6bCHft93k7vzz42bwF3R-vYnLc8fpE4x8-Q-8Qd642UfSWCsPAMQ6Vb-37fS6NfqqthHDsgwZOV2Fj47v_aRwyt7rL4PNgVOJPvKHpSiCzP7-YnYt0E0XJ5izee0bptXFIeuvdPAGrwIgCllEq6k4Thsi3lx8w9VX84KkMtmQhNV4az3whfvIF8hdelYEauxw8GknxnTi89Lq3KWb0SMaWFNwquzqEWmy8"
            />
          </div>
        </div>
      </header>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <main className={`pt-24 px-container-padding pb-section-margin transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {children}
      </main>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center lg:hidden hover:scale-105 active:scale-95 transition-all">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
          add
        </span>
      </button>
    </div>
  );
}

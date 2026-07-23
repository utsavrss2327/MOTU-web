'use client';

import React, { useEffect, useState } from 'react';
import { decompressSnapshot, downloadAsFile } from '@/lib/shareUtils';
import dynamic from 'next/dynamic';

const SharedViewer = dynamic(() => import('@/components/SharedViewer'), { ssr: false });

export default function SharedPage() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [noteName, setNoteName] = useState('Shared Notes');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const hash = window.location.hash.slice(1); // remove #
        if (!hash) {
          setError('No shared data found in the link. The link may be incomplete or expired.');
          setLoading(false);
          return;
        }

        // Parse params from hash: name=...&data=...
        const params = new URLSearchParams(hash);
        const dataParam = params.get('data');
        const nameParam = params.get('name');

        if (nameParam) setNoteName(decodeURIComponent(nameParam));

        if (!dataParam) {
          setError('No shared data found in the link.');
          setLoading(false);
          return;
        }

        const decompressed = await decompressSnapshot(dataParam);
        setSnapshot(decompressed);
      } catch (e: any) {
        console.error('Failed to decompress shared data:', e);
        setError('Failed to load shared notes. The link may be corrupted or incomplete.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDownload = () => {
    if (!snapshot) return;
    const safeName = noteName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'shared-notes';
    downloadAsFile(snapshot, `${safeName}.tldr`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Loading shared notes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F5] p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">Unable to Load Notes</h1>
          <p className="text-zinc-500 text-sm">{error}</p>
          <a
            href="/"
            className="inline-block mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-all shadow-sm"
          >
            Go to MOTU
          </a>
        </div>
      </div>
    );
  }

  // Count pages in snapshot
  const pageCount = snapshot
    ? Object.keys(snapshot.document.store).filter((k: string) => k.startsWith('page:')).length
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F5]">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-orange-200/60 bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-lg font-bold text-orange-600 hover:text-orange-700 transition-colors">MOTU</a>
          <span className="text-zinc-300">|</span>
          <div>
            <h1 className="text-sm font-semibold text-zinc-800">{noteName}</h1>
            <p className="text-xs text-zinc-400">{pageCount} page{pageCount !== 1 ? 's' : ''} shared</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download .tldr
          </button>
        </div>
      </header>

      {/* Tldraw Viewer */}
      <div className="flex-1 relative">
        {snapshot && <SharedViewer snapshot={snapshot} />}
      </div>
    </div>
  );
}

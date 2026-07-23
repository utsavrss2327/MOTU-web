'use client';

import React from 'react';
import { Tldraw } from 'tldraw';

class TldrawErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 text-white p-8 z-50">
          <h2 className="text-3xl font-bold mb-4">Canvas Crashed!</h2>
          <p className="mb-4">Please copy this error and send it to the developer:</p>
          <pre className="text-xs bg-black p-4 rounded max-w-4xl overflow-auto w-full">
            {this.state.error?.toString()}
            {"\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Save, Users, Cloud, ChevronLeft, ChevronRight, FilePlus, Share2, Download, Link2, Check, X } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import type { Editor as TldrawEditor, TLPage } from 'tldraw';
import { useMultiplayerState } from '@/hooks/useMultiplayerState';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToDrive } from '@/lib/googleDrive';
import { getIndexBetween, getIndexAbove } from '@tldraw/utils';
import { compressSnapshot, filterSnapshotByPages, downloadAsFile, MAX_URL_DATA_LENGTH } from '@/lib/shareUtils';
import { exportToPdf, exportToDocx } from '@/lib/exportFormats';

interface EditorProps {
  tabName: string;
  initialData?: any;
  initialImages?: string[];
  onDataLoaded?: () => void;
}

export default function Editor({ tabName, initialData, initialImages, onDataLoaded }: EditorProps) {
  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [pages, setPages] = useState<TLPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>('');

  const { isConnected } = useMultiplayerState(roomId || '');

  // Subscribe to page changes from the tldraw editor
  useEffect(() => {
    if (!editor) return;
    const updatePages = () => {
      setPages(editor.getPages());
      setCurrentPageId(editor.getCurrentPageId());
    };
    updatePages();
    // Listen for any store changes that affect pages
    const unsub = editor.store.listen(updatePages, { scope: 'document' });
    return () => unsub();
  }, [editor]);

  const currentPageIndex = pages.findIndex(p => p.id === currentPageId);

  const handleInsertPageAfter = useCallback(() => {
    if (!editor) return;
    const allPages = editor.getPages();
    const curIdx = allPages.findIndex(p => p.id === editor.getCurrentPageId());
    if (curIdx === -1) return;

    const currentPage = allPages[curIdx];
    const nextPage = allPages[curIdx + 1];

    // Compute the index key between current page and next page
    const newIndex = nextPage
      ? getIndexBetween(currentPage.index, nextPage.index)
      : getIndexAbove(currentPage.index);

    const pageNum = allPages.length + 1;
    editor.createPage({ name: `Page ${pageNum}`, index: newIndex });

    // Navigate to the newly created page
    const updatedPages = editor.getPages();
    const newPage = updatedPages.find(p => p.index === newIndex);
    if (newPage) {
      editor.setCurrentPage(newPage.id);
    }
  }, [editor]);

  const handlePrevPage = useCallback(() => {
    if (!editor || currentPageIndex <= 0) return;
    editor.setCurrentPage(pages[currentPageIndex - 1].id);
  }, [editor, pages, currentPageIndex]);

  const handleNextPage = useCallback(() => {
    if (!editor || currentPageIndex >= pages.length - 1) return;
    editor.setCurrentPage(pages[currentPageIndex + 1].id);
  }, [editor, pages, currentPageIndex]);

  useEffect(() => {
    // Check for room ID in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room) {
        setRoomId(room);
        console.log("Joined multiplayer room:", room);
      }
    }

    // Suppress specific tldraw NetworkError from Next.js error overlay
    const originalError = console.error;
    console.error = (...args) => {
      const msg = args[0];
      if (typeof msg === 'string' && msg.includes('NetworkError')) return;
      if (msg instanceof Error && msg.message.includes('NetworkError')) return;
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const handleMount = (editorInstance: TldrawEditor) => {
    setEditor(editorInstance);
    if (initialData) {
      try {
        editorInstance.loadSnapshot(initialData);
        onDataLoaded?.();
      } catch (err) {
        console.error("Failed to load snapshot", err);
      }
    } else if (initialImages && initialImages.length > 0) {
      const insertImages = async () => {
        let yOffset = 0;
        for (let i = 0; i < initialImages.length; i++) {
          const dataUrl = initialImages[i];
          const img = new Image();
          img.src = dataUrl;
          await new Promise(resolve => { img.onload = resolve; });
          
          // Generate unique IDs
          const assetId = `asset:pdf-page-${Date.now()}-${i}`;
          
          editorInstance.createAssets([{
            id: assetId as any,
            type: 'image',
            typeName: 'asset',
            props: {
              src: dataUrl,
              w: img.width,
              h: img.height,
              name: `Page ${i + 1}`,
              isAnimated: false,
              mimeType: 'image/png',
            },
            meta: {}
          }]);
          
          editorInstance.createShapes([{
            type: 'image',
            x: 0,
            y: yOffset,
            props: {
              assetId: assetId as any,
              w: img.width,
              h: img.height,
            }
          }]);
          
          yOffset += img.height + 40; // 40px gap
        }
        
        editorInstance.zoomToFit();
        onDataLoaded?.();
      };
      
      insertImages();
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const { accessToken } = useAuth();
  
  // Share modal state
  const [shareModal, setShareModal] = useState(false);
  const [shareMode, setShareMode] = useState<'all' | 'current' | 'select'>('all');
  const [selectedSharePages, setSelectedSharePages] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ url: string; copied: boolean } | null>(null);

  const openShareModal = () => {
    setShareModal(true);
    setShareMode('all');
    setSelectedSharePages(new Set());
    setShareResult(null);
  };

  const handleShare = async () => {
    if (!editor) return;
    setIsSharing(true);
    setShareResult(null);

    try {
      const snapshot = editor.getSnapshot();
      const allPages = editor.getPages();

      let pageIds: string[];
      if (shareMode === 'current') {
        pageIds = [editor.getCurrentPageId()];
      } else if (shareMode === 'select') {
        pageIds = allPages.filter(p => selectedSharePages.has(p.id)).map(p => p.id);
      } else {
        pageIds = allPages.map(p => p.id);
      }

      if (pageIds.length === 0) {
        showAlert('No Pages Selected', 'Please select at least one page to share.', 'error');
        setIsSharing(false);
        return;
      }

      const filtered = filterSnapshotByPages(snapshot, pageIds);
      const compressed = await compressSnapshot(filtered);

      if (compressed.length > MAX_URL_DATA_LENGTH) {
        // Too large for URL — download only
        downloadAsFile(filtered, `${tabName}.tldr`);
        showAlert(
          'File Downloaded',
          'Your notes are too large for a shareable link. A .tldr file has been downloaded instead — share it directly with your recipient.',
          'info'
        );
        setShareModal(false);
        setIsSharing(false);
        return;
      }

      const encodedName = encodeURIComponent(tabName);
      const url = `${window.location.origin}/shared#name=${encodedName}&data=${compressed}`;
      await navigator.clipboard.writeText(url);
      setShareResult({ url, copied: true });
    } catch (err: any) {
      console.error('Share failed:', err);
      showAlert('Share Failed', `Could not share notes: ${err.message}`, 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadFormat = async (format: 'tldr' | 'pdf' | 'docx') => {
    if (!editor) return;
    const snapshot = editor.getSnapshot();
    const allPages = editor.getPages();

    let pageIds: string[];
    if (shareMode === 'current') {
      pageIds = [editor.getCurrentPageId()];
    } else if (shareMode === 'select') {
      pageIds = allPages.filter(p => selectedSharePages.has(p.id)).map(p => p.id);
    } else {
      pageIds = allPages.map(p => p.id);
    }

    if (pageIds.length === 0) return;

    if (format === 'tldr') {
      const filtered = filterSnapshotByPages(snapshot, pageIds);
      downloadAsFile(filtered, `${tabName}.tldr`);
    } else if (format === 'pdf') {
      await exportToPdf(editor, pageIds, tabName);
    } else if (format === 'docx') {
      await exportToDocx(editor, pageIds, tabName);
    }
  };

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const handleDriveSync = async () => {
    if (!editor) return;
    if (!accessToken) {
      showAlert('Sign In Required', "You are not signed in. Please sign in to sync to Google Drive.", 'error');
      return;
    }
    
    setIsSyncing(true);
    try {
      const snapshot = editor.getSnapshot();
      
      await uploadToDrive(tabName, snapshot, accessToken);
      showAlert('Sync Complete', 'Successfully synced to Google Drive!', 'success');
    } catch (err: any) {
      console.error('Drive sync failed', err);
      if (err.message && err.message.includes('401')) {
        showAlert('Session Expired', 'Your Google session has expired. Please sign out from the sidebar and sign back in to refresh your connection.', 'error');
      } else {
        showAlert('Sync Failed', `Failed to sync to Google Drive. Check console for details.\n\nError: ${err.message}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    // The whiteboard automatically saves to localStorage via persistenceKey
    // We just provide visual feedback to reassure the user
    showAlert('Saved', "Saved successfully! Your changes are securely stored on your device.", 'success');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }}>
      <TldrawErrorBoundary>
        <Tldraw 
          persistenceKey={`freenotes-${tabName}`}
          onMount={handleMount}
        />
      </TldrawErrorBoundary>
      
      {/* Floating Custom Action Buttons - Positioned Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] pointer-events-auto flex items-center gap-2 flex-wrap justify-center w-full max-w-full px-2">
        {roomId && (
          <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-medium shadow-sm border ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
              : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
          }`}>
            <Users size={16} />
            <span>{isConnected ? 'Live' : 'Connecting...'}</span>
          </div>
        )}

        <button 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs sm:text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          onClick={handleSave}
          title="Save Notes"
        >
          <Save size={16} />
          <span className="hidden sm:inline">Save Notes</span>
        </button>

        <button 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs sm:text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
          onClick={handleDriveSync}
          disabled={isSyncing}
          title="Sync to Drive"
        >
          <Cloud size={16} />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync to Drive'}</span>
        </button>

        <button 
          onClick={openShareModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs sm:text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          title="Share Notes"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* Floating Page Navigation Bar - Bottom Left */}
      {pages.length > 0 && (
        <div className="absolute bottom-20 left-4 z-[50] pointer-events-auto">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md border border-orange-200/60 rounded-2xl shadow-lg shadow-orange-500/5 px-2 py-1.5">
            {/* Previous Page */}
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex <= 0}
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Indicator */}
            <span className="px-2 text-xs font-semibold text-zinc-700 tabular-nums select-none min-w-[60px] text-center">
              {currentPageIndex + 1} / {pages.length}
            </span>

            {/* Next Page */}
            <button
              onClick={handleNextPage}
              disabled={currentPageIndex >= pages.length - 1}
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-orange-200/60 mx-1" />

            {/* Insert Page After Current */}
            <button
              onClick={handleInsertPageAfter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
              title="Insert a new page after this one"
            >
              <FilePlus size={14} />
              <span className="hidden sm:inline">Insert Page</span>
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-orange-100">
            <div className="p-7">
              <h3 className={`text-xl font-bold mb-3 ${
                alertState.type === 'error' ? 'text-red-600' :
                alertState.type === 'success' ? 'text-emerald-600' :
                'text-indigo-600'
              }`}>
                {alertState.title}
              </h3>
              <p className="text-zinc-600 whitespace-pre-wrap">{alertState.message}</p>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                  className={`px-6 py-2.5 rounded-xl font-medium text-white shadow-sm transition-all ${
                    alertState.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                    alertState.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' :
                    'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-orange-100">
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-2">
              <h3 className="text-xl font-bold text-zinc-800">Share Notes</h3>
              <button
                onClick={() => setShareModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-7 pb-7">
              <p className="text-sm text-zinc-500 mb-5">Choose what to share from <span className="font-medium text-zinc-700">{tabName}</span></p>

              {/* Share Mode Options */}
              <div className="flex flex-col gap-2 mb-5">
                {(['all', 'current', 'select'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setShareMode(mode); setShareResult(null); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                      shareMode === mode
                        ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      shareMode === mode ? 'border-orange-500' : 'border-zinc-300'
                    }`}>
                      {shareMode === mode && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    {mode === 'all' && 'All Pages'}
                    {mode === 'current' && `Current Page (${pages[currentPageIndex]?.name || 'Page ' + (currentPageIndex + 1)})`}
                    {mode === 'select' && 'Select Specific Pages'}
                  </button>
                ))}
              </div>

              {/* Page Checkboxes (only when select mode) */}
              {shareMode === 'select' && (
                <div className="mb-5 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                  {pages.map((page, idx) => (
                    <label
                      key={page.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSharePages.has(page.id)}
                        onChange={(e) => {
                          const next = new Set(selectedSharePages);
                          if (e.target.checked) next.add(page.id); else next.delete(page.id);
                          setSelectedSharePages(next);
                          setShareResult(null);
                        }}
                        className="w-4 h-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-zinc-700">{page.name || `Page ${idx + 1}`}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Result - link copied */}
              {shareResult && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={16} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Link copied to clipboard!</span>
                  </div>
                  <p className="text-xs text-emerald-600/80 break-all font-mono leading-relaxed">
                    {shareResult.url.length > 120 ? shareResult.url.slice(0, 120) + '…' : shareResult.url}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShare}
                  disabled={isSharing || (shareMode === 'select' && selectedSharePages.size === 0)}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all shadow-sm"
                >
                  <Link2 size={16} />
                  {isSharing ? 'Generating…' : 'Copy Share Link'}
                </button>
                <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-3 py-2.5 bg-zinc-50 border-r border-zinc-200 text-zinc-500 flex items-center justify-center">
                    <Download size={16} />
                  </div>
                  <button
                    onClick={() => handleDownloadFormat('tldr')}
                    disabled={shareMode === 'select' && selectedSharePages.size === 0}
                    className="px-4 py-2.5 bg-white hover:bg-zinc-50 border-r border-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 font-medium text-sm transition-all"
                  >
                    .tldr
                  </button>
                  <button
                    onClick={() => handleDownloadFormat('pdf')}
                    disabled={shareMode === 'select' && selectedSharePages.size === 0}
                    className="px-4 py-2.5 bg-white hover:bg-zinc-50 border-r border-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 font-medium text-sm transition-all"
                  >
                    .pdf
                  </button>
                  <button
                    onClick={() => handleDownloadFormat('docx')}
                    disabled={shareMode === 'select' && selectedSharePages.size === 0}
                    className="px-4 py-2.5 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 font-medium text-sm transition-all"
                  >
                    .docx
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

import { Save, Users, Cloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Editor as TldrawEditor } from 'tldraw';
import { useMultiplayerState } from '@/hooks/useMultiplayerState';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToDrive } from '@/lib/googleDrive';

interface EditorProps {
  tabName: string;
  initialData?: any;
  initialImages?: string[];
  onDataLoaded?: () => void;
}

export default function Editor({ tabName, initialData, initialImages, onDataLoaded }: EditorProps) {
  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const { isConnected } = useMultiplayerState(roomId || '');

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
          onClick={() => {
            const newRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
            const url = `${window.location.origin}?room=${newRoomId}`;
            navigator.clipboard.writeText(url);
            showAlert('Link Copied', `Share link copied: ${url}\n\nNote: Multiplayer sync requires linking the Yjs doc to the tldraw store in Editor.tsx.`, 'info');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs sm:text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          title="Share"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

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
    </div>
  );
}

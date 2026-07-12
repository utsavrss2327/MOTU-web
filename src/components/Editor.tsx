'use client';

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
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

  const handleDriveSync = async () => {
    if (!editor) return;
    if (!accessToken) {
      alert("You are not signed in. Please sign in to sync to Google Drive.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const snapshot = editor.getSnapshot();
      
      await uploadToDrive(tabName, snapshot, accessToken);
      alert('Successfully synced to Google Drive!');
    } catch (err) {
      console.error('Drive sync failed', err);
      alert('Failed to sync to Google Drive. Check console for details.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    if (!editor) return;
    const snapshot = editor.getSnapshot();
    const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = tabName.replace(/\s+/g, '-').toLowerCase();
    a.download = `${safeName}.tldr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full relative">
      <Tldraw 
        className="w-full h-full"
        persistenceKey={`freenotes-${tabName}`}
        onMount={handleMount}
      />
      
      {/* Floating Buttons - Positioned top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] pointer-events-auto flex items-center gap-2">
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          onClick={handleSave}
        >
          <Save size={16} />
          <span>Save Notes</span>
        </button>

        <button 
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
          onClick={handleDriveSync}
          disabled={isSyncing}
        >
          <Cloud size={16} />
          <span>{isSyncing ? 'Syncing...' : 'Sync to Drive'}</span>
        </button>
      </div>

      {/* Multiplayer Live Badge */}
      {roomId && (
        <div className="absolute top-4 right-32 z-[2000] pointer-events-auto">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-sm border ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' 
              : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
          }`}>
            <Users size={16} />
            <span>{isConnected ? 'Live Sync Active' : 'Connecting...'}</span>
          </div>
        </div>
      )}

      {/* Floating Share Button - Top Right */}
      <div className="absolute top-4 right-4 z-[2000] pointer-events-auto">
        <button 
          onClick={() => {
            const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
            const url = `${window.location.origin}?room=${roomId}`;
            navigator.clipboard.writeText(url);
            alert(`Share link copied: ${url}\n\nNote: Multiplayer sync requires linking the Yjs doc to the tldraw store in Editor.tsx.`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Tldraw } from 'tldraw';
import type { Editor } from 'tldraw';

interface SharedViewerProps {
  snapshot: any;
  onMount?: (editor: Editor) => void;
}

export default function SharedViewer({ snapshot, onMount }: SharedViewerProps) {
  const handleMount = (editor: Editor) => {
    try {
      editor.loadSnapshot(snapshot);
      editor.updateInstanceState({ isReadonly: true });
      editor.zoomToFit();
      if (onMount) onMount(editor);
    } catch (err) {
      console.error('Failed to load shared snapshot:', err);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <Tldraw
        onMount={handleMount}
        inferDarkMode
      />
    </div>
  );
}

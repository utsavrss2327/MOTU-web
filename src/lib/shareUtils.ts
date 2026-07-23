/**
 * Share utilities for compressing, decompressing, and filtering tldraw snapshots.
 * Uses the native CompressionStream API (gzip) + base64url encoding.
 */

// --- Compression / Decompression ---

export async function compressSnapshot(data: any): Promise<string> {
  const json = JSON.stringify(data);
  const blob = new Blob([json]);
  const cs = new CompressionStream('gzip');
  const compressedStream = blob.stream().pipeThrough(cs);
  const buffer = await new Response(compressedStream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Convert to base64url (URL-safe base64)
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decompressSnapshot(base64url: string): Promise<any> {
  // Restore standard base64 from base64url
  let b64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Blob([bytes]).stream().pipeThrough(ds);
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text);
}

// --- Snapshot Filtering ---

/**
 * Filter a tldraw snapshot to only include the specified pages and their
 * shapes, assets, and bindings.
 */
export function filterSnapshotByPages(snapshot: any, selectedPageIds: string[]): any {
  const store = snapshot.document.store;
  const filteredStore: Record<string, any> = {};
  const pageIdSet = new Set(selectedPageIds);

  // Always include the document record
  if (store['document:document']) {
    filteredStore['document:document'] = store['document:document'];
  }

  // Include selected page records
  for (const [id, record] of Object.entries(store)) {
    if (id.startsWith('page:') && pageIdSet.has(id)) {
      filteredStore[id] = record;
    }
  }

  // Collect shapes belonging to selected pages.
  // Shapes can be nested (groups), so we walk the parentId chain.
  const shapeIds = new Set<string>();

  // First pass: shapes directly on selected pages
  for (const [id, record] of Object.entries(store) as [string, any][]) {
    if (id.startsWith('shape:') && pageIdSet.has(record.parentId)) {
      shapeIds.add(id);
    }
  }

  // Iterative pass: nested shapes (children of already-collected shapes)
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, record] of Object.entries(store) as [string, any][]) {
      if (id.startsWith('shape:') && !shapeIds.has(id) && shapeIds.has(record.parentId)) {
        shapeIds.add(id);
        changed = true;
      }
    }
  }

  // Add collected shapes
  for (const id of shapeIds) {
    filteredStore[id] = store[id];
  }

  // Collect asset IDs referenced by shapes
  const assetIds = new Set<string>();
  for (const id of shapeIds) {
    const shape = store[id] as any;
    if (shape.props?.assetId) {
      assetIds.add(shape.props.assetId);
    }
  }

  // Add referenced assets
  for (const [id] of Object.entries(store)) {
    if (id.startsWith('asset:') && assetIds.has(id)) {
      filteredStore[id] = store[id];
    }
  }

  // Add bindings where both endpoints are included shapes
  for (const [id, record] of Object.entries(store) as [string, any][]) {
    if (id.startsWith('binding:')) {
      if (shapeIds.has(record.fromId) && shapeIds.has(record.toId)) {
        filteredStore[id] = record;
      }
    }
  }

  return {
    document: {
      store: filteredStore,
      schema: snapshot.document.schema,
    },
    session: {
      ...snapshot.session,
      currentPageId: selectedPageIds[0],
      pageStates: snapshot.session?.pageStates?.filter(
        (ps: any) => pageIdSet.has(ps.pageId)
      ) || [],
    },
  };
}

// --- Download helper ---

export function downloadAsFile(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Max base64 length we allow in the URL hash (100 KB)
export const MAX_URL_DATA_LENGTH = 100_000;

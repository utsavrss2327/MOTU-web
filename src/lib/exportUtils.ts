import JSZip from 'jszip';
import { TreeItem } from '@/hooks/useFolderState';

export async function downloadFolderAsZip(folder: TreeItem, format: string) {
  const zip = new JSZip();
  
  const addToZip = (item: TreeItem, currentFolder: JSZip) => {
    if (item.type === 'folder') {
      const subFolder = currentFolder.folder(item.name);
      if (subFolder && item.children) {
        item.children.forEach(child => addToZip(child, subFolder));
      }
    } else if (item.type === 'document') {
      const persistenceKey = `freenotes-${item.name}`;
      const savedData = localStorage.getItem(persistenceKey);
      
      if (savedData) {
        if (format === 'tldr') {
          currentFolder.file(`${item.name}.tldr`, savedData);
        } else {
          // Native DOCX/EXCEL export of an infinite canvas whiteboard is not structurally possible on the client.
          // For these formats, we provide the raw data packaged in a text file indicating the limitation.
          // In a production app, we would use a headless browser on a server to generate a PDF or Image, 
          // and embed that image into a standard DOCX/PDF file.
          const msg = `This whiteboard document ("${item.name}") is a Freenotes infinite canvas.\n` +
                      `Native conversion to ${format.toUpperCase()} is not available offline.\n\n` +
                      `To view or edit this document, please import the following raw data back into Freenotes:\n\n` +
                      `=== RAW DATA BEGIN ===\n${savedData}\n=== RAW DATA END ===`;
          
          currentFolder.file(`${item.name}-${format}-export.txt`, msg);
        }
      }
    }
  };

  addToZip(folder, zip);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folder.name.replace(/\s+/g, '_')}_export.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

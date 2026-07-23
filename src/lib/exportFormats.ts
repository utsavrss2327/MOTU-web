import { Editor } from 'tldraw';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, ImageRun } from 'docx';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // data:image/png;base64,....
      resolve(dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

export async function exportToPdf(editor: Editor, pageIds: string[], filename: string) {
  const pdf = new jsPDF('landscape', 'pt', 'a4');
  
  // Save current page to restore later
  const originalPageId = editor.getCurrentPageId();

  for (let i = 0; i < pageIds.length; i++) {
    const pageId = pageIds[i];
    editor.setCurrentPage(pageId);
    
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      if (i > 0) pdf.addPage();
      continue;
    }
    
    const { blob, width, height } = await editor.toImage(shapeIds, { format: 'png', background: true, padding: 32 });
    const base64Str = await blobToBase64(blob);
    
    if (i > 0) pdf.addPage();
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const ratio = Math.min(pdfWidth / width, pdfHeight / height);
    const renderWidth = width * ratio;
    const renderHeight = height * ratio;
    
    const x = (pdfWidth - renderWidth) / 2;
    const y = (pdfHeight - renderHeight) / 2;
    
    pdf.addImage(base64Str, 'PNG', x, y, renderWidth, renderHeight);
  }
  
  // Restore original page
  editor.setCurrentPage(originalPageId);
  
  pdf.save(`${filename.replace(/\s+/g, '_')}.pdf`);
}

export async function exportToDocx(editor: Editor, pageIds: string[], filename: string) {
  // Save current page to restore later
  const originalPageId = editor.getCurrentPageId();
  
  const children = [];

  for (let i = 0; i < pageIds.length; i++) {
    const pageId = pageIds[i];
    editor.setCurrentPage(pageId);
    
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) continue;
    
    const { blob, width, height } = await editor.toImage(shapeIds, { format: 'png', background: true, padding: 32 });
    const arrayBuffer = await blobToArrayBuffer(blob);
    
    // Scale down image to fit DOCX page width (approx 600px max)
    const maxWidth = 600;
    const ratio = width > maxWidth ? maxWidth / width : 1;
    const renderWidth = Math.round(width * ratio);
    const renderHeight = Math.round(height * ratio);
    
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: arrayBuffer,
            transformation: {
              width: renderWidth,
              height: renderHeight,
            },
          }),
        ],
      })
    );
  }
  
  // Restore original page
  editor.setCurrentPage(originalPageId);

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

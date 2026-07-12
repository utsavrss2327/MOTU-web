'use client';

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });
import { Menu, Save, FileText, Plus, Upload, AlertCircle } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginScreen from "@/components/LoginScreen";

function AppContent() {
  const { accessToken } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All Notes');
  const [tabsWithDocuments, setTabsWithDocuments] = useState<string[]>(['Current Work']);

  const hasDocuments = tabsWithDocuments.includes(activeTab);

  const [uploadedData, setUploadedData] = useState<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateDocument = () => {
    if (!tabsWithDocuments.includes(activeTab)) {
      setTabsWithDocuments([...tabsWithDocuments, activeTab]);
    }
  };

  const handleUploadDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tldr,application/json,application/pdf';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      try {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          // Dynamically import pdfjs to avoid SSR issues
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
          
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          const images: string[] = [];
          
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High res
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            if (context) {
              await page.render({ canvasContext: context, viewport, canvas }).promise;
              images.push(canvas.toDataURL('image/png'));
            }
          }
          
          setUploadedImages(images);
          if (!tabsWithDocuments.includes(activeTab)) {
            setTabsWithDocuments([...tabsWithDocuments, activeTab]);
          }
        } else {
          // Standard tldr load
          const text = await file.text();
          const json = JSON.parse(text);
          setUploadedData(json);
          if (!tabsWithDocuments.includes(activeTab)) {
            setTabsWithDocuments([...tabsWithDocuments, activeTab]);
          }
        }
      } catch (err) {
        console.error("Failed to parse uploaded file", err);
        alert("Invalid file format or failed to parse PDF.");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  if (!accessToken) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-gray-100 font-sans text-zinc-900 relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <main className="flex-1 relative flex flex-col w-full h-full overflow-hidden">
        {/* Mobile Header - Only visible on small screens */}
        <header className="md:hidden flex items-center justify-between p-3 bg-gray-100 border-b border-gray-300 shrink-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-zinc-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-zinc-800">{activeTab}</span>
          <div className="w-10" /> {/* Spacer to center the title */}
        </header>

        <div className="flex-1 relative h-full w-full overflow-hidden">
          {hasDocuments ? (
            <Editor 
              key={activeTab}
              tabName={activeTab} 
              initialData={uploadedData} 
              initialImages={uploadedImages}
              onDataLoaded={() => {
                setUploadedData(null);
                setUploadedImages([]);
              }} 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 p-6 overflow-y-auto">
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl max-w-md w-full mb-8 text-sm flex items-start gap-3 shadow-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-1">Data Safety Warning</strong>
                  Notes are stored locally in this browser. If you clear your browser cache, your notes will be permanently deleted. Export frequently!
                </div>
              </div>

              <FileText size={64} className="mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-zinc-700 mb-2">No documents</h3>
              <p className="text-sm max-w-sm text-center text-zinc-600 mb-8">
                There are currently no documents in {activeTab}. Create a new document to get started.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button 
                  onClick={handleCreateDocument}
                  className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus size={18} />
                  <span>New Document</span>
                </button>
                <button 
                  onClick={handleUploadDocument}
                  className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium text-zinc-700 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-300 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Upload size={18} />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  // Use the environment variable if available, otherwise fallback to the hardcoded Client ID
  // to prevent Vercel environment variable configuration issues.
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID !== 'dummy-client-id' 
    ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID 
    : "850959529703-77eol7g1lm2o3drn1ad0lsaqmras9ivn.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

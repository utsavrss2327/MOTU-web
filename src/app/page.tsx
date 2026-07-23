'use client';

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });
import AllNotesDashboard from "@/components/AllNotesDashboard";
import { Menu, Save, FileText, Plus, Upload, AlertCircle } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginScreen from "@/components/LoginScreen";
import { useFolderState } from '@/hooks/useFolderState';

function AppContent() {
  const { accessToken } = useAuth();
  const folderState = useFolderState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All Notes');

  useEffect(() => {
    // Check if there is a tab requested in the URL
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
      // Clean up the URL to prevent reloading into it on subsequent refreshes if unwanted,
      // though leaving it is also fine. We'll just set the active tab.
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const [uploadedData, setUploadedData] = useState<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
        } else {
          // Standard tldr load
          const text = await file.text();
          const json = JSON.parse(text);
          setUploadedData(json);
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
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#FFF9F5] bg-paper font-sans text-zinc-900 relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        folderState={folderState}
      />
      
      <main className="flex-1 relative flex flex-col w-full h-full overflow-hidden">
        {/* Mobile Header - Only visible on small screens */}
        <header className="md:hidden flex items-center justify-between p-3 bg-transparent border-b border-orange-200/60 shrink-0 z-40">
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
          {activeTab === 'All Notes' ? (
            <AllNotesDashboard onOpenNote={setActiveTab} folderState={folderState} />
          ) : (
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

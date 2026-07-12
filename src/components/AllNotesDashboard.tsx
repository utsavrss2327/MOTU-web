import React, { useState, useMemo } from 'react';
import { useFolderState, TreeItem } from '@/hooks/useFolderState';
import { FileText, Search, Clock } from 'lucide-react';

interface Props {
  onOpenNote: (noteName: string) => void;
}

export default function AllNotesDashboard({ onOpenNote }: Props) {
  const { tree, isLoaded } = useFolderState();
  const [searchQuery, setSearchQuery] = useState('');

  const allDocuments = useMemo(() => {
    const docs: TreeItem[] = [];
    const traverse = (nodes: TreeItem[]) => {
      for (const node of nodes) {
        if (node.type === 'document') {
          // Prevent duplicates
          if (!docs.some(d => d.name === node.name)) {
            docs.push(node);
          }
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(tree);
    return docs;
  }, [tree]);

  const filteredDocuments = allDocuments.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-y-auto">
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">All Notes</h1>
            <p className="text-zinc-500 mt-1">You have {allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''} across all folders.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search all notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-sm rounded-xl pl-10 pr-4 py-2.5 border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none text-zinc-800 placeholder-zinc-400 shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <button
              key={doc.id}
              onClick={() => onOpenNote(doc.name)}
              className="group flex flex-col items-start p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left h-40 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 relative z-10">
                <FileText size={20} />
              </div>
              <h3 className="font-semibold text-zinc-800 truncate w-full group-hover:text-blue-600 transition-colors relative z-10">
                {doc.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-auto text-xs font-medium text-zinc-400 relative z-10">
                <Clock size={12} />
                <span>Document</span>
              </div>
            </button>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-200 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-semibold text-zinc-700 mb-1">No notes found</h3>
            <p className="text-zinc-500">
              {searchQuery ? `No notes matching "${searchQuery}"` : "You haven't created any notes yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFolderState, TreeItem } from '@/hooks/useFolderState';
import { FileText, Search, Clock, Folder, MoreVertical, Edit2, Trash2, FolderOpen, ArrowLeft } from 'lucide-react';

interface Props {
  onOpenNote: (noteName: string) => void;
}

export default function AllNotesDashboard({ onOpenNote }: Props) {
  const { tree, isLoaded, renameItem, deleteItem } = useFolderState();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  
  // To close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { currentFolder, allItems } = useMemo(() => {
    if (currentFolderId) {
      // Find current folder
      let foundFolder: TreeItem | null = null;
      const findFolder = (nodes: TreeItem[]) => {
        for (const node of nodes) {
          if (node.id === currentFolderId) {
            foundFolder = node;
            return;
          }
          if (node.children) findFolder(node.children);
        }
      };
      findFolder(tree);
      
      // If folder not found (maybe deleted), return to root
      if (!foundFolder) {
        return { currentFolder: null, allItems: [] as TreeItem[] };
      }
      
      // Return direct children for a nested view
      const children = foundFolder.children || [];
      return { currentFolder: foundFolder, allItems: children };
    }

    // Root view: Flatten all except library and folders
    const items: TreeItem[] = [];
    const traverse = (nodes: TreeItem[]) => {
      for (const node of nodes) {
        if (!items.some(d => d.name === node.name)) {
          items.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(tree);
    return { 
      currentFolder: null, 
      // Filter out the internal root folders 'library' and 'folders'
      allItems: items.filter(item => item.id !== 'library' && item.id !== 'folders') 
    };
  }, [tree, currentFolderId]);
  
  // Handle invalid current folder state
  useEffect(() => {
    if (currentFolderId && !currentFolder) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, currentFolder]);

  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'document') return -1;
    if (a.type === 'document' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  const handleRename = (id: string) => {
    if (editFolderName.trim()) {
      renameItem(id, editFolderName.trim());
    }
    setEditingFolderId(null);
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-y-auto">
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            {currentFolder ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentFolderId(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-zinc-600"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <FolderOpen className="text-amber-500" size={28} />
                  {currentFolder.name}
                </h1>
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">All Notes & Folders</h1>
            )}
            <p className="text-zinc-500 mt-1 ml-1">
              {currentFolder ? `Contents of ${currentFolder.name}` : `You have ${allItems.length} item${allItems.length !== 1 ? 's' : ''} across your workspace.`}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-sm rounded-xl pl-10 pr-4 py-2.5 border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none text-zinc-800 placeholder-zinc-400 shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {sortedItems.map(item => {
            const isEditing = editingFolderId === item.id;
            
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  if (!isEditing && item.type === 'document') {
                    onOpenNote(item.name);
                  } else if (!isEditing && item.type === 'folder') {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === item.id ? null : item.id);
                  }
                }}
                className={`group flex flex-col items-start p-5 bg-white border border-gray-200 rounded-2xl transition-all duration-200 text-left h-40 relative ${item.type === 'document' ? 'hover:border-blue-300 hover:shadow-lg cursor-pointer' : 'hover:border-amber-300 hover:shadow-lg cursor-pointer'}`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${item.type === 'folder' ? 'bg-amber-50' : 'bg-blue-50'}`} />
                
                <div className="w-full flex justify-between items-start relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 ${item.type === 'folder' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}
                  </div>
                  
                  {item.type === 'folder' && (
                    <div className="relative" ref={activeDropdown === item.id ? dropdownRef : null}>
                      {activeDropdown === item.id && (
                        <div className="absolute right-0 top-0 w-36 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentFolderId(item.id); setActiveDropdown(null); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-gray-50 text-left"
                          >
                            <FolderOpen size={16} className="text-blue-500" /> View
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditFolderName(item.name); setEditingFolderId(item.id); setActiveDropdown(null); }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-700 hover:bg-gray-50 text-left"
                          >
                            <Edit2 size={16} className="text-amber-500" /> Edit
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if(window.confirm(`Delete folder "${item.name}" and all contents?`)) {
                                deleteItem(item.id);
                              }
                              setActiveDropdown(null); 
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
                          >
                            <Trash2 size={16} className="text-red-500" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <input
                    autoFocus
                    value={editFolderName}
                    onChange={e => setEditFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(item.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                    onBlur={() => handleRename(item.id)}
                    onClick={e => e.stopPropagation()}
                    className="font-semibold text-zinc-800 w-full relative z-10 bg-white border border-blue-400 rounded px-1 outline-none"
                  />
                ) : (
                  <h3 className={`font-semibold text-zinc-800 truncate w-full transition-colors relative z-10 ${item.type === 'folder' ? 'group-hover:text-amber-600' : 'group-hover:text-blue-600'}`}>
                    {item.name}
                  </h3>
                )}
                
                <div className="flex items-center gap-1.5 mt-auto text-xs font-medium text-zinc-400 relative z-10">
                  {item.type === 'folder' ? (
                    <>
                      <Folder size={12} />
                      <span>{item.children?.length || 0} items</span>
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      <span>Document</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sortedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-200 text-zinc-400 rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen size={32} />
            </div>
            <h3 className="text-xl font-semibold text-zinc-700 mb-1">
              {currentFolder ? 'This folder is empty' : 'No items found'}
            </h3>
            <p className="text-zinc-500">
              {searchQuery ? `No items matching "${searchQuery}"` : "You haven't created any items here yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

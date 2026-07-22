import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFolderState, TreeItem } from '@/hooks/useFolderState';
import { FileText, Search, Clock, Folder, MoreVertical, Edit2, Trash2, FolderOpen, ArrowLeft, Plus, Download } from 'lucide-react';

export default function AllNotesDashboard({ onOpenNote, folderState }: { onOpenNote: (noteName: string) => void, folderState: ReturnType<typeof useFolderState> }) {
  const { tree, isLoaded, renameItem, deleteItem, addItem } = folderState;
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    type: 'prompt' | 'confirm';
    onSubmit: (value?: string) => void;
  }>({
    isOpen: false,
    title: '',
    type: 'prompt',
    onSubmit: () => {}
  });

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));
  
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
      const findFolder = (nodes: TreeItem[]): TreeItem | null => {
        for (const node of nodes) {
          if (node.id === currentFolderId) {
            return node;
          }
          if (node.children) {
            const found = findFolder(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const foundFolder = findFolder(tree);
      
      // If folder not found (maybe deleted), return to root
      if (!foundFolder) {
        return { currentFolder: null, allItems: [] as TreeItem[] };
      }
      
      // Return direct children for a nested view
      const children = foundFolder.children || [];
      return { currentFolder: foundFolder, allItems: children };
    }

    // Root view: Return direct children of the 'folders' node (where custom content lives)
    const foldersNode = tree.find(node => node.id === 'folders');
    return { 
      currentFolder: null, 
      allItems: foldersNode?.children || []
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
    <div className="flex flex-col h-full w-full bg-transparent overflow-y-auto">
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
          
          <div className="flex gap-3 relative w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-sm rounded-xl pl-10 pr-4 py-2.5 border border-orange-200/60 focus:ring-2 focus:ring-orange-500/50 outline-none text-zinc-800 placeholder-zinc-400 shadow-sm transition-all"
              />
            </div>
            <button 
              onClick={() => {
                setModalState({
                  isOpen: true,
                  title: 'Create New Folder',
                  placeholder: 'Folder name',
                  type: 'prompt',
                  onSubmit: (name) => {
                    if (name && name.trim()) {
                      addItem(currentFolderId || 'folders', name.trim(), 'folder');
                    }
                  }
                });
              }} 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50 rounded-xl font-medium transition-colors whitespace-nowrap"
            >
              <Plus size={18} /> <span className="hidden sm:inline">New Folder</span>
            </button>
            <button 
              onClick={() => {
                setModalState({
                  isOpen: true,
                  title: 'Create New Note',
                  placeholder: 'Note name',
                  type: 'prompt',
                  onSubmit: (name) => {
                    if (name && name.trim()) {
                      addItem(currentFolderId || 'folders', name.trim(), 'document');
                      onOpenNote(name.trim());
                    }
                  }
                });
              }} 
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange-400 to-rose-400 text-white hover:opacity-90 rounded-xl font-medium transition-colors shadow-sm shadow-orange-200 whitespace-nowrap"
            >
              <Plus size={18} /> <span className="hidden sm:inline">New Note</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {sortedItems.map(item => {
            const isEditing = editingFolderId === item.id;
            
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isEditing) {
                    if (item.type === 'folder') {
                      setCurrentFolderId(item.id);
                    } else {
                      onOpenNote(item.name);
                    }
                  }
                }}
                className={`group flex flex-col items-start p-5 bg-white border border-orange-100 rounded-2xl transition-all duration-200 text-left h-40 relative ${item.type === 'document' ? 'hover:border-orange-300 hover:shadow-lg cursor-pointer' : 'hover:border-rose-300 hover:shadow-lg cursor-pointer'}`}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${item.type === 'folder' ? 'bg-rose-50' : 'bg-orange-50'}`} />
                
                <div className="w-full flex justify-between items-start relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 ${item.type === 'folder' ? 'bg-rose-100/50 text-rose-500' : 'bg-orange-100/50 text-orange-500'}`}>
                    {item.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}
                  </div>
                  
                  {/* Hover Options Menu */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm z-20 gap-1 border border-orange-100 transition-all duration-200">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (item.type === 'folder') setCurrentFolderId(item.id); 
                        else onOpenNote(item.name);
                      }}
                      className="p-2 hover:bg-orange-50 rounded-lg text-orange-500 transition-colors"
                      title="View"
                    >
                      {item.type === 'folder' ? <FolderOpen size={16} /> : <FileText size={16} />}
                    </button>
                    {!item.isStatic && (
                      <>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditFolderName(item.name); 
                            setEditingFolderId(item.id); 
                          }}
                          className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalState({
                              isOpen: true,
                              title: 'Export Document',
                              placeholder: 'pdf, docs, excel, or tldr',
                              defaultValue: 'pdf',
                              type: 'prompt',
                              onSubmit: (format) => {
                                if (format) {
                                  const itemToExport = item.type === 'folder' ? item : {
                                    id: 'temp',
                                    name: item.name + '-export',
                                    type: 'folder' as const,
                                    children: [item]
                                  };
                                  import('@/lib/exportUtils').then(m => m.downloadFolderAsZip(itemToExport, format.toLowerCase()));
                                }
                              }
                            });
                          }}
                          className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setModalState({
                              isOpen: true,
                              title: `Delete "${item.name}"?`,
                              type: 'confirm',
                              onSubmit: () => {
                                deleteItem(item.id);
                              }
                            });
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
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
            <p className="text-zinc-500 mb-8">
              {searchQuery ? `No items matching "${searchQuery}"` : "You haven't created any items here yet."}
            </p>
            
            {!searchQuery && (
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mx-auto">
                <button 
                  onClick={() => {
                    setModalState({
                      isOpen: true,
                      title: 'Create New Folder',
                      placeholder: 'Folder name',
                      type: 'prompt',
                      onSubmit: (name) => {
                        if (name && name.trim()) {
                          addItem(currentFolderId || 'folders', name.trim(), 'folder');
                        }
                      }
                    });
                  }} 
                  className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-orange-200 transition-all hover:-translate-y-0.5"
                >
                  <Plus size={18} />
                  <span>New Folder</span>
                </button>
                <button 
                  onClick={() => {
                    setModalState({
                      isOpen: true,
                      title: 'Create New Note',
                      placeholder: 'Note name',
                      type: 'prompt',
                      onSubmit: (name) => {
                        if (name && name.trim()) {
                          addItem(currentFolderId || 'folders', name.trim(), 'document');
                          onOpenNote(name.trim());
                        }
                      }
                    });
                  }} 
                  className="flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium text-white bg-gradient-to-r from-orange-400 to-rose-400 hover:opacity-90 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                >
                  <Plus size={18} />
                  <span>New Note</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-orange-100">
            <div className="p-7">
              <h3 className="text-xl font-bold text-zinc-900 mb-5">{modalState.title}</h3>
              {modalState.type === 'prompt' && (
                <input
                  autoFocus
                  type="text"
                  placeholder={modalState.placeholder}
                  defaultValue={modalState.defaultValue}
                  className="w-full bg-orange-50/50 border border-orange-200/60 rounded-xl px-4 py-3 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder-zinc-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      modalState.onSubmit(e.currentTarget.value);
                      closeModal();
                    }
                    if (e.key === 'Escape') {
                      closeModal();
                    }
                  }}
                  id="modal-input"
                />
              )}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (modalState.type === 'prompt') {
                      const input = document.getElementById('modal-input') as HTMLInputElement;
                      modalState.onSubmit(input?.value);
                    } else {
                      modalState.onSubmit();
                    }
                    closeModal();
                  }}
                  className={`px-6 py-2.5 rounded-xl font-medium text-white shadow-sm transition-all ${
                    modalState.type === 'confirm' 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                      : 'bg-gradient-to-r from-orange-400 to-rose-400 hover:opacity-90 shadow-orange-200'
                  }`}
                >
                  {modalState.type === 'confirm' ? 'Delete' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

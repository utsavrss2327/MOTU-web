import React, { useState } from 'react';
import { Book, Folder, FileText, Settings, Plus, Star, Search, X, ChevronRight, ChevronDown, LogOut, Edit2, Trash2 } from 'lucide-react';
import { useFolderState, TreeItem } from '@/hooks/useFolderState';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tabName: string) => void;
}

export default function Sidebar({ isOpen, onClose, activeTab, onTabChange }: SidebarProps) {
  const { tree, toggleFolder, addItem, renameItem, deleteItem, isLoaded } = useFolderState();
  const { user, logout } = useAuth();

  const handleNavClick = (tabName: string) => {
    onTabChange(tabName);
    onClose();
  };

  const [createState, setCreateState] = useState<{type: 'folder' | 'document', parentId: string} | null>(null);
  const [newItemName, setNewItemName] = useState('');

  const handleCreate = () => {
    if (newItemName.trim() && createState) {
      addItem(createState.parentId, newItemName.trim(), createState.type);
      if (createState.type === 'document') {
        onTabChange(newItemName.trim());
        if (window.innerWidth < 768) {
          onClose();
        }
      }
    }
    setCreateState(null);
    setNewItemName('');
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar container */}
      <div className={`
        fixed md:relative z-50 w-64 h-full bg-gray-100/95 backdrop-blur-xl border-r border-gray-300 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 py-6 flex items-start justify-between border-b border-gray-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 mt-0.5">
              M
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-xl text-zinc-800 tracking-tight leading-tight">MOTU</h1>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                <span className="text-blue-600 font-extrabold text-[11px]">M</span>ap <span className="text-blue-600 font-extrabold text-[11px]">O</span>f <span className="text-blue-600 font-extrabold text-[11px]">T</span>houghts & <span className="text-blue-600 font-extrabold text-[11px]">U</span>nified-notes
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => setCreateState({ type: 'folder', parentId: 'folders' })}
              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              title="New Subject Folder"
            >
              <Plus size={18} className="text-zinc-600" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors md:hidden"
            >
              <X size={18} className="text-zinc-600" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mb-4 mt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-white/60 text-sm rounded-lg pl-9 pr-4 py-2 border border-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none text-zinc-800 placeholder-zinc-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6">
          {createState && (
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg mb-4 shadow-sm border border-blue-200">
              {createState.type === 'folder' ? <Folder size={16} className="text-blue-500" /> : <FileText size={16} className="text-zinc-500" />}
              <input
                autoFocus
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  } else if (e.key === 'Escape') {
                    setCreateState(null);
                    setNewItemName('');
                  }
                }}
                className="w-full bg-transparent text-sm text-zinc-800 outline-none"
                placeholder={`New ${createState.type}...`}
              />
              <button onClick={handleCreate} className="p-1 hover:bg-gray-100 rounded text-blue-600">
                <Plus size={16} />
              </button>
              <button onClick={() => { setCreateState(null); setNewItemName(''); }} className="p-1 hover:bg-gray-100 rounded text-red-500">
                <X size={16} />
              </button>
            </div>
          )}
          
          {isLoaded && tree.map(node => (
            <div key={node.id}>
              {node.type === 'folder' ? (
                <div>
                  <div className="flex items-center justify-between mb-2 px-1 cursor-pointer hover:opacity-80" onClick={() => toggleFolder(node.id)}>
                    <div className="flex items-center gap-1">
                      {node.isOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{node.name}</h2>
                    </div>
                  </div>
                  {node.isOpen && node.children && (
                    <nav className="space-y-1 pl-2">
                      <TreeRenderer 
                        nodes={node.children} 
                        activeTab={activeTab} 
                        onTabChange={handleNavClick} 
                        toggleFolder={toggleFolder} 
                        onCreate={(parentId, type) => setCreateState({ parentId, type })}
                        onRename={renameItem}
                        onDelete={deleteItem}
                      />
                    </nav>
                  )}
                </div>
              ) : (
                <NavItem 
                  icon={<FileText size={18} />} 
                  label={node.name} 
                  active={activeTab === node.name} 
                  onClick={() => handleNavClick(node.name)} 
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 pb-12 mt-auto border-t border-gray-300 space-y-2">
          {user && (
            <div className="flex items-center gap-3 w-full p-2 text-sm text-zinc-900 bg-white/50 rounded-lg mb-2 shadow-sm border border-gray-200">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-300" />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-semibold truncate">{user.name}</span>
                <span className="text-xs text-zinc-500 truncate">{user.email}</span>
              </div>
            </div>
          )}
          
          <button className="flex items-center gap-3 w-full p-2 text-sm text-zinc-700 hover:text-zinc-900 hover:bg-gray-200 rounded-lg transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function TreeRenderer({ 
  nodes, activeTab, onTabChange, toggleFolder, onCreate, onRename, onDelete 
}: { 
  nodes: TreeItem[], 
  activeTab: string, 
  onTabChange: (id: string) => void, 
  toggleFolder: (id: string) => void, 
  onCreate: (parentId: string, type: 'folder' | 'document') => void,
  onRename: (id: string, name: string) => void,
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <>
      {nodes.map(node => (
        <div key={node.id} className="w-full">
          {node.type === 'folder' ? (
            <div className="w-full group">
              <div className="flex items-center justify-between w-full rounded-lg transition-all duration-200 hover:bg-gray-200/60 text-zinc-700">
                <button 
                  onClick={() => toggleFolder(node.id)}
                  className="flex flex-1 items-center gap-2 p-2 overflow-hidden"
                >
                  {node.isOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                  <Folder size={16} className="text-blue-500 shrink-0" />
                  {editingId === node.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (editName.trim()) {
                            onRename(node.id, editName.trim());
                          }
                          setEditingId(null);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => {
                        if (editName.trim()) {
                          onRename(node.id, editName.trim());
                        }
                        setEditingId(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white px-1 text-sm rounded outline-none border border-blue-400 w-full"
                    />
                  ) : (
                    <span className="truncate">{node.name}</span>
                  )}
                </button>
                <div className="opacity-0 group-hover:opacity-100 flex items-center pr-2 shrink-0">
                   <button onClick={(e) => { e.stopPropagation(); onCreate(node.id, 'document'); if (!node.isOpen) toggleFolder(node.id); }} className="p-1 hover:bg-gray-300 rounded text-zinc-500 transition-colors" title="New Note">
                     <FileText size={14} />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onCreate(node.id, 'folder'); if (!node.isOpen) toggleFolder(node.id); }} className="p-1 hover:bg-gray-300 rounded text-zinc-500 transition-colors" title="New Folder">
                     <Folder size={14} />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); setEditName(node.name); setEditingId(node.id); }} className="p-1 hover:bg-gray-300 rounded text-blue-500 transition-colors" title="Rename Folder">
                     <Edit2 size={14} />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); if(window.confirm(`Are you sure you want to delete "${node.name}"? This will also delete all its contents.`)) onDelete(node.id); }} className="p-1 hover:bg-red-200 rounded text-red-500 transition-colors" title="Delete Folder">
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
              {node.isOpen && node.children && (
                <div className="pl-4 border-l border-gray-300 ml-3 mt-1 space-y-1">
                  <TreeRenderer nodes={node.children} activeTab={activeTab} onTabChange={onTabChange} toggleFolder={toggleFolder} onCreate={onCreate} onRename={onRename} onDelete={onDelete} />
                </div>
              )}
            </div>
          ) : (
            <NavItem 
              icon={<FileText size={18} />} 
              label={node.name} 
              active={activeTab === node.name} 
              onClick={() => onTabChange(node.name)} 
            />
          )}
        </div>
      ))}
    </>
  );
}

function NavItem({ icon, label, active = false, color = "text-zinc-600", onClick }: { icon: React.ReactNode, label: string, active?: boolean, color?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm transition-all duration-200 ${active ? 'bg-blue-100 text-blue-700 font-medium shadow-sm border border-blue-200/50' : 'hover:bg-gray-200/60 text-zinc-700'}`}
    >
      <div className={active ? 'text-blue-600' : color}>
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

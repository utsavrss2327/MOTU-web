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
  const { tree, toggleFolder, isLoaded } = useFolderState();
  const { user, logout } = useAuth();

  const handleNavClick = (tabName: string) => {
    onTabChange(tabName);
    onClose();
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
        fixed md:relative z-50 w-64 h-full bg-[#FFF9F5]/95 backdrop-blur-xl border-r border-orange-200/60 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 py-6 flex items-start justify-between border-b border-orange-200/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 mt-0.5">
              M
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-xl text-zinc-800 tracking-tight leading-tight">MOTU</h1>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">
                <span className="text-orange-500 font-extrabold text-[11px]">M</span>ap <span className="text-orange-500 font-extrabold text-[11px]">O</span>f <span className="text-orange-500 font-extrabold text-[11px]">T</span>houghts & <span className="text-orange-500 font-extrabold text-[11px]">U</span>nified-notes
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-300" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-white/60 text-sm rounded-lg pl-9 pr-4 py-2 border border-orange-200/60 focus:ring-2 focus:ring-orange-500/50 outline-none text-zinc-800 placeholder-zinc-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6">
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
        <div className="p-4 pb-12 mt-auto border-t border-orange-200/60 space-y-2">
          {user && (
            <div className="flex items-center gap-3 w-full p-2 text-sm text-zinc-900 bg-white/50 rounded-lg mb-2 shadow-sm border border-orange-200/50">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-orange-200" />
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
  nodes, activeTab, onTabChange, toggleFolder
}: { 
  nodes: TreeItem[], 
  activeTab: string, 
  onTabChange: (id: string) => void, 
  toggleFolder: (id: string) => void
}) {
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
                  {node.isOpen ? <ChevronDown size={14} className="shrink-0 text-orange-400" /> : <ChevronRight size={14} className="shrink-0 text-orange-400" />}
                  <Folder size={16} className="text-orange-400 shrink-0" />
                  <span className="truncate">{node.name}</span>
                </button>
              </div>
              {node.isOpen && node.children && (
                <div className="pl-4 border-l border-orange-200 ml-3 mt-1 space-y-1">
                  <TreeRenderer nodes={node.children} activeTab={activeTab} onTabChange={onTabChange} toggleFolder={toggleFolder} />
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
      className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm transition-all duration-200 ${active ? 'bg-orange-100/50 text-orange-700 font-medium shadow-sm border border-orange-200/50' : 'hover:bg-orange-50 text-zinc-700'}`}
    >
      <div className={active ? 'text-orange-500' : color}>
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

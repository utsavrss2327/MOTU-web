import React from 'react';
import { Book, Folder, FileText, Settings, Plus, Star, Search, X, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
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
        fixed md:relative z-50 w-64 h-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border-r border-gray-200 dark:border-zinc-700 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 py-6 flex items-start justify-between border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 mt-0.5">
              M
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-xl text-zinc-800 dark:text-zinc-100 tracking-tight leading-tight">MOTU</h1>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                <span className="text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">M</span>ap <span className="text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">O</span>f <span className="text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">T</span>houghts & <span className="text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">U</span>nified-notes
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
              <Plus size={18} className="text-zinc-600 dark:text-zinc-300" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors md:hidden"
            >
              <X size={18} className="text-zinc-600 dark:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-gray-100/50 dark:bg-zinc-700/50 text-sm rounded-lg pl-9 pr-4 py-2 border-none focus:ring-2 focus:ring-blue-500/50 outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-all"
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
                      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{node.name}</h2>
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
        <div className="p-4 pb-12 mt-auto border-t border-gray-200 dark:border-zinc-700 space-y-2">
          {user && (
            <div className="flex items-center gap-3 w-full p-2 text-sm text-zinc-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-700/50 rounded-lg mb-2">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700" />
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-semibold truncate">{user.name}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</span>
              </div>
            </div>
          )}
          
          <button className="flex items-center gap-3 w-full p-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full p-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function TreeRenderer({ nodes, activeTab, onTabChange, toggleFolder }: { nodes: TreeItem[], activeTab: string, onTabChange: (id: string) => void, toggleFolder: (id: string) => void }) {
  return (
    <>
      {nodes.map(node => (
        <div key={node.id} className="w-full">
          {node.type === 'folder' ? (
            <div className="w-full">
              <button 
                onClick={() => toggleFolder(node.id)}
                className="flex items-center gap-2 w-full p-2 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300"
              >
                {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={16} className="text-blue-500" />
                <span>{node.name}</span>
              </button>
              {node.isOpen && node.children && (
                <div className="pl-4 border-l border-gray-200 dark:border-zinc-700 ml-3 mt-1 space-y-1">
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

function NavItem({ icon, label, active = false, color = "text-zinc-600 dark:text-zinc-400", onClick }: { icon: React.ReactNode, label: string, active?: boolean, color?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-2 rounded-lg text-sm transition-all duration-200 ${active ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium' : 'hover:bg-gray-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300'}`}
    >
      <div className={active ? 'text-blue-600 dark:text-blue-400' : color}>
        {icon}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

import { useState, useEffect } from 'react';

export type ItemType = 'folder' | 'document';

export interface TreeItem {
  id: string;
  name: string;
  type: ItemType;
  children?: TreeItem[];
  isOpen?: boolean;
}

const defaultTree: TreeItem[] = [
  {
    id: 'library',
    name: 'Library',
    type: 'folder',
    isOpen: true,
    children: [
      { id: 'Current Work', name: 'Current Work', type: 'document' },
      { id: 'All Notes', name: 'All Notes', type: 'document' },
      { id: 'Favorites', name: 'Favorites', type: 'document' },
      { id: 'Recent', name: 'Recent', type: 'document' }
    ]
  },
  {
    id: 'folders',
    name: 'Folders',
    type: 'folder',
    isOpen: true,
    children: [
      { id: 'Personal', name: 'Personal', type: 'document' },
      { id: 'Work', name: 'Work', type: 'document' },
      { id: 'Ideas', name: 'Ideas', type: 'document' }
    ]
  }
];

export function useFolderState() {
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('freenotes-folders');
    if (saved) {
      try {
        setTree(JSON.parse(saved));
      } catch (e) {
        setTree(defaultTree);
      }
    } else {
      setTree(defaultTree);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('freenotes-folders', JSON.stringify(tree));
    }
  }, [tree, isLoaded]);

  const toggleFolder = (id: string) => {
    const toggleInTree = (nodes: TreeItem[]): TreeItem[] => {
      return nodes.map(node => {
        if (node.id === id && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleInTree(node.children) };
        }
        return node;
      });
    };
    setTree(toggleInTree(tree));
  };

  const addItem = (parentId: string, name: string, type: ItemType) => {
    const newId = `${name}-${Date.now()}`;
    const newItem: TreeItem = { id: newId, name, type, children: type === 'folder' ? [] : undefined };

    const addInTree = (nodes: TreeItem[]): TreeItem[] => {
      return nodes.map(node => {
        if (node.id === parentId && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newItem], isOpen: true };
        }
        if (node.children) {
          return { ...node, children: addInTree(node.children) };
        }
        return node;
      });
    };
    setTree(addInTree(tree));
  };

  return { tree, toggleFolder, addItem, isLoaded };
}

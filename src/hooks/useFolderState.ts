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
      { id: 'All Notes', name: 'All Notes', type: 'document' }
    ]
  },
  {
    id: 'folders',
    name: 'Folders',
    type: 'folder',
    isOpen: true,
    children: []
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

  const renameItem = (id: string, newName: string) => {
    const renameInTree = (nodes: TreeItem[]): TreeItem[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: renameInTree(node.children) };
        }
        return node;
      });
    };
    setTree(renameInTree(tree));
  };

  const deleteItem = (id: string) => {
    const deleteInTree = (nodes: TreeItem[]): TreeItem[] => {
      return nodes
        .filter(node => node.id !== id)
        .map(node => {
          if (node.children) {
            return { ...node, children: deleteInTree(node.children) };
          }
          return node;
        });
    };
    setTree(deleteInTree(tree));
  };

  return { tree, toggleFolder, addItem, renameItem, deleteItem, isLoaded };
}

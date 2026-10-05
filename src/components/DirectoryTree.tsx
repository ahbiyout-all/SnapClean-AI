import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { PhotoRecord } from '../services/db';

export interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
  files: PhotoRecord[];
  totalFiles?: number;
}

interface DirectoryTreeExplorerProps {
  tree: DirectoryNode;
  onSelect: (path: string) => void;
  onScan?: (path: string) => void;
  selectedPaths: string[];
}

const TreeNode: React.FC<{ 
  node: DirectoryNode, 
  onSelect: (path: string) => void, 
  onScan?: (path: string) => void,
  selectedPaths: string[], 
  level?: number 
}> = ({ node, onSelect, onScan, selectedPaths, level = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedPaths.includes(node.path);

  const hasChildren = node.children.length > 0;
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 cursor-pointer rounded-lg px-2 group/item ${isSelected ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
            e.stopPropagation();
            if (hasChildren && (e.target as HTMLElement).closest('.chevron')) {
              setExpanded(!expanded);
            } else {
              onSelect(node.path);
            }
        }}
      >
        <div className="chevron flex items-center justify-center w-4 h-4 hover:bg-white/10 rounded transition-colors" onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}>
          {hasChildren ? (
            expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
          ) : null}
        </div>
        
        <Folder size={14} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
        <span className={`text-[11px] truncate flex-1 ${isSelected ? 'text-indigo-100 font-semibold' : 'text-slate-300'}`}>
          {node.name || 'Root'}
        </span>

        <div className="flex items-center gap-2">
          {node.totalFiles !== undefined && node.totalFiles > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 font-medium">
              {node.totalFiles}
            </span>
          )}
          
          {onScan && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onScan(node.path);
              }}
              className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-indigo-600/20 rounded text-indigo-400 transition-all"
              title="Scan this folder"
            >
              <ImageIcon size={12} />
            </button>
          )}
        </div>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="border-l border-white/5 ml-[15px]">
          {node.children.map((child, idx) => (
            <TreeNode 
              key={`${child.path}-${idx}`} 
              node={child} 
              onSelect={onSelect} 
              onScan={onScan}
              selectedPaths={selectedPaths} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DirectoryTreeExplorer = ({ tree, onSelect, onScan, selectedPaths }: DirectoryTreeExplorerProps) => {
    return (
        <div className="overflow-y-auto custom-scrollbar max-h-64 pr-2 -mx-1">
            <TreeNode node={tree} onSelect={onSelect} onScan={onScan} selectedPaths={selectedPaths} />
        </div>
    )
}

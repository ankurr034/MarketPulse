import React, { useState, useRef } from 'react';
import { Pin, X, GripVertical } from 'lucide-react';

/**
 * PinnedItemsStrip
 * Horizontal, draggable strip of pinned categories/sectors with localStorage persistence.
 * Supports HTML5 drag-and-drop reordering, active highlighting, quick unpinning, and touch scrolling.
 */
export default function PinnedItemsStrip({
  items = [],
  activeId = null,
  onSelect,
  onUnpin,
  onReorder,
  title = 'Pinned',
  emptyMessage = 'Pin categories or sectors for 1-click quick access'
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const stripRef = useRef(null);

  // Drag-and-drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex && sourceIndex >= 0 && sourceIndex < items.length) {
      const updated = [...items];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      if (onReorder) {
        onReorder(updated);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (!items || items.length === 0) {
    return (
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <Pin size={12} className="text-amber-500/70 shrink-0" />
          <span className="text-[11px] font-medium leading-none">
            {emptyMessage}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
          Click <Pin size={10} className="inline text-amber-500 mx-0.5" /> to pin
        </span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 shadow-2xs">
      {/* Label / Badge */}
      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0 uppercase tracking-wider pr-1 border-r border-slate-200 dark:border-slate-800">
        <Pin size={12} className="fill-amber-500 text-amber-500" />
        <span className="hidden sm:inline font-mono text-[10px]">{title}</span>
        <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black">
          {items.length}
        </span>
      </div>

      {/* Horizontal Scrollable Pinned Chips */}
      <div
        ref={stripRef}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap min-w-0 flex-1 py-0.5"
      >
        {items.map((item, index) => {
          const itemId = item.id || item.key || item.name;
          const isActive = activeId === itemId;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={itemId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all select-none shrink-0 cursor-pointer ${
                isDragging ? 'opacity-40 scale-95 border-blue-400' : ''
              } ${
                isDragOver ? 'ring-2 ring-blue-500 border-blue-500' : ''
              } ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold ring-2 ring-blue-500/30'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
              onClick={() => onSelect && onSelect(item)}
              title="Click to view; drag to reorder"
            >
              {/* Drag Handle */}
              <div 
                className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 -ml-0.5"
                title="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical size={11} className={isActive ? 'text-blue-200' : 'text-slate-400'} />
              </div>

              {/* Parent badge for subcategories */}
              {item.parentLabel && (
                <span className={`text-[9px] uppercase font-mono px-1 py-0.2 rounded border ${
                  isActive 
                    ? 'bg-blue-700/80 text-blue-100 border-blue-500' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {item.parentLabel}
                </span>
              )}

              {/* Label */}
              <span className="font-semibold text-[11px] sm:text-xs whitespace-nowrap">
                {item.label || item.name}
              </span>

              {/* Count badge if available */}
              {item.count != null && (
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {item.count}
                </span>
              )}

              {/* Unpin Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUnpin) onUnpin(itemId);
                }}
                className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ml-0.5 ${
                  isActive ? 'hover:bg-blue-700 text-blue-100 hover:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Unpin"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

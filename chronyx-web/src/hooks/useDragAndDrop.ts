import { useState, useCallback } from "react";

interface DragItem {
  id: string;
  index: number;
}

export const useDragAndDrop = <T extends { id: string }>(
  items: T[],
  onReorder: (reorderedItems: T[]) => void
) => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, item: T, index: number) => {
    setDraggedItem({ id: item.id, index });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    
    // Add dragging class for styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("opacity-50");
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedItem(null);
    setDragOverIndex(null);
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("opacity-50");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedItem && draggedItem.index !== index) {
      setDragOverIndex(index);
    }
  }, [draggedItem]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.index === targetIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedItem.index, 1);
    newItems.splice(targetIndex, 0, removed);
    
    onReorder(newItems);
    setDraggedItem(null);
    setDragOverIndex(null);
  }, [draggedItem, items, onReorder]);

  const getDragProps = useCallback((item: T, index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, item, index),
    onDragEnd: handleDragEnd,
    onDragOver: (e: React.DragEvent) => handleDragOver(e, index),
    onDragLeave: handleDragLeave,
    onDrop: (e: React.DragEvent) => handleDrop(e, index),
  }), [handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]);

  return {
    draggedItem,
    dragOverIndex,
    getDragProps,
    isDragging: draggedItem !== null,
  };
};

export default useDragAndDrop;

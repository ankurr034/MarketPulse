import React, { createContext, useContext, useState } from 'react';

const WorkbenchContext = createContext();

export function WorkbenchProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const pin = (item) => {
    setItems((prev) => {
      // Check if already pinned
      if (prev.some(i => i.type === item.type && i.id === item.id)) {
        return prev;
      }
      
      if (prev.length >= 6) {
        showToast('Maximum 6 items allowed in Comparison Workbench');
        return prev;
      }
      
      return [...prev, item];
    });
  };

  const unpin = (type, id) => {
    setItems((prev) => prev.filter(i => !(i.type === type && i.id === id)));
  };

  const clear = () => {
    setItems([]);
  };

  const isPinned = (type, id) => {
    return items.some(i => i.type === type && i.id === id);
  };

  const toggleWorkbench = () => setIsOpen(prev => !prev);

  return (
    <WorkbenchContext.Provider value={{
      items,
      pin,
      unpin,
      clear,
      isPinned,
      isOpen,
      setIsOpen,
      toggleWorkbench,
      toastMessage
    }}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  return useContext(WorkbenchContext);
}

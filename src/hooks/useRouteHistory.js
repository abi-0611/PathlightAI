import { useState, useEffect } from 'react';

export function useRouteHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const item = window.localStorage.getItem('pathlight_history');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  const addHistoryItem = (route) => {
    try {
      const newItem = {
        ...route,
        timestamp: Date.now()
      };
      setHistory(prev => {
        const next = [newItem, ...prev].slice(0, 50); // Keep last 50
        window.localStorage.setItem('pathlight_history', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const removeHistoryItem = (id) => {
    try {
      setHistory(prev => {
        const next = prev.filter(item => item.id !== id);
        window.localStorage.setItem('pathlight_history', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearHistory = () => {
    try {
      window.localStorage.removeItem('pathlight_history');
      setHistory([]);
    } catch (error) {
      console.error(error);
    }
  };

  return { history, addHistoryItem, removeHistoryItem, clearHistory };
}

import { useEffect, useRef } from 'react';

export default function useKeyboardShortcuts(shortcuts) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if the user is typing in an input, textarea, or select
      const isInputFocused =
        document.activeElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) ||
        document.activeElement?.isContentEditable);

      // Allow Escape to work even in inputs (to blur them, close modals, etc.)
      if (isInputFocused && event.key !== 'Escape') {
        return;
      }

      const handler = shortcutsRef.current[event.key];
      if (handler) {
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

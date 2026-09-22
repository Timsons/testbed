import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SHORTCUTS } from './shortcutDefs.js';
import QuickSearchModal from './QuickSearchModal.jsx';
import ShortcutsHelpModal from './ShortcutsHelpModal.jsx';

const CHORD_TIMEOUT_MS = 1200;

// The #1 keyboard-shortcut bug: firing while the user is typing. Anything
// editable — a field, a select, a contenteditable area — opts out entirely.
function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const pendingChordRef = useRef(false);
  const chordTimerRef = useRef(null);
  const anyModalOpenRef = useRef(false);

  useEffect(() => {
    anyModalOpenRef.current = quickSearchOpen || helpOpen;
  }, [quickSearchOpen, helpOpen]);

  useEffect(() => {
    function clearChord() {
      pendingChordRef.current = false;
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }

    function runShortcut(shortcut) {
      if (shortcut.to) {
        navigate(shortcut.to);
      } else if (shortcut.action === 'quick-search') {
        setQuickSearchOpen(true);
      } else if (shortcut.action === 'help') {
        setHelpOpen(true);
      }
    }

    function handleKeyDown(event) {
      if (isEditableTarget(event.target)) return;
      // A modal (quick search / help) is already open — let its own local
      // handlers (Escape, arrow keys, Enter) own the keyboard instead of
      // letting a stray "g d" navigate the page underneath it.
      if (anyModalOpenRef.current) return;

      const mod = event.metaKey || event.ctrlKey;

      // Mid-chord: the next keypress either completes it or cancels it —
      // either way nothing else should fire from this same keypress.
      if (pendingChordRef.current) {
        const second = event.key.toUpperCase();
        clearChord();
        const match = SHORTCUTS.find(
          (s) => s.type === 'sequence' && s.keys[1].toUpperCase() === second
        );
        if (match) {
          event.preventDefault();
          runShortcut(match);
        }
        return;
      }

      if (mod) {
        const match = SHORTCUTS.find(
          (s) => s.type === 'combo' && s.keys[1].toUpperCase() === event.key.toUpperCase()
        );
        if (match) {
          event.preventDefault();
          runShortcut(match);
        }
        // Never fall through to single/sequence handling on a modded key —
        // that would misfire e.g. Cmd+G as a chord-start.
        return;
      }

      if (event.altKey) return;

      const singleMatch = SHORTCUTS.find((s) => s.type === 'single' && s.keys[0] === event.key);
      if (singleMatch) {
        event.preventDefault();
        runShortcut(singleMatch);
        return;
      }

      if (
        event.key.toLowerCase() === 'g' &&
        SHORTCUTS.some((s) => s.type === 'sequence' && s.keys[0] === 'G')
      ) {
        pendingChordRef.current = true;
        chordTimerRef.current = setTimeout(clearChord, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearChord();
    };
  }, [navigate]);

  return (
    <>
      {quickSearchOpen && <QuickSearchModal onClose={() => setQuickSearchOpen(false)} />}
      {helpOpen && <ShortcutsHelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}

export default KeyboardShortcuts;

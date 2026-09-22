// Single source of truth for every keyboard shortcut in the app.
// KeyboardShortcuts.jsx matches keypresses against this list, and
// ShortcutsHelpModal.jsx renders the help list from it — add a shortcut here
// and both the behavior and the "?" help modal pick it up automatically.
//
// type: 'combo'    — a modifier held with a key, e.g. Mod+K ("Mod" = Cmd on
//                     Mac, Ctrl elsewhere).
// type: 'sequence' — a chord: press the first key, then the second within
//                     the timeout window.
// type: 'single'   — one bare keypress.
//
// Either `to` (a route to navigate to) or `action` (a named UI action handled
// in KeyboardShortcuts.jsx) says what happens when it fires.
export const SHORTCUTS = [
  {
    id: 'quick-search',
    type: 'combo',
    keys: ['Mod', 'K'],
    action: 'quick-search',
    description: 'Open quick search',
    category: 'General',
  },
  {
    id: 'help',
    type: 'single',
    keys: ['?'],
    action: 'help',
    description: 'Show this shortcuts list',
    category: 'General',
  },
  {
    id: 'go-dashboard',
    type: 'sequence',
    keys: ['G', 'D'],
    to: '/dashboard',
    description: 'Go to Dashboard',
    category: 'Navigation',
  },
  {
    id: 'go-test-cases',
    type: 'sequence',
    keys: ['G', 'T'],
    to: '/test-cases',
    description: 'Go to Test Cases',
    category: 'Navigation',
  },
  {
    id: 'go-bugs',
    type: 'sequence',
    keys: ['G', 'B'],
    to: '/bugs',
    description: 'Go to Bugs',
    category: 'Navigation',
  },
  {
    id: 'go-runs',
    type: 'sequence',
    keys: ['G', 'R'],
    to: '/test-runs',
    description: 'Go to Test Runs',
    category: 'Navigation',
  },
];

export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
}

// Human-readable key caps for the help modal, e.g. ['⌘', 'K'] or ['G', 'then', 'D'].
export function formatShortcutKeys(shortcut, isMac) {
  const label = (key) => (key === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : key);

  if (shortcut.type === 'sequence') {
    return [label(shortcut.keys[0]), 'then', label(shortcut.keys[1])];
  }
  return shortcut.keys.map(label);
}

import { useEffect, useRef } from 'react';
import { SHORTCUTS, formatShortcutKeys, isMacPlatform } from './shortcutDefs.js';

function groupByCategory(shortcuts) {
  const groups = new Map();
  for (const shortcut of shortcuts) {
    const list = groups.get(shortcut.category) || [];
    list.push(shortcut);
    groups.set(shortcut.category, list);
  }
  return groups;
}

function ShortcutsHelpModal({ onClose }) {
  const isMac = isMacPlatform();
  const groups = groupByCategory(SHORTCUTS);
  const modalRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal shortcuts-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-help-title"
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="shortcuts-help-title">Keyboard Shortcuts</h2>
        {Array.from(groups.entries()).map(([category, shortcuts]) => (
          <section key={category} className="shortcuts-help-group">
            <h3>{category}</h3>
            <ul className="shortcuts-help-list">
              {shortcuts.map((shortcut) => (
                <li key={shortcut.id}>
                  <span>{shortcut.description}</span>
                  <span className="shortcuts-help-keys">
                    {formatShortcutKeys(shortcut, isMac).map((token, index) =>
                      token === 'then' ? (
                        <span key={index} className="shortcuts-help-then">
                          then
                        </span>
                      ) : (
                        <kbd key={index}>{token}</kbd>
                      )
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelpModal;

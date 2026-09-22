import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/test-cases', label: 'Test Cases' },
  { to: '/test-suites', label: 'Suites' },
  { to: '/test-runs', label: 'Runs' },
  { to: '/bugs', label: 'Bugs' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
];

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close the mobile menu on an outside click or Escape — a NavLink click
  // navigates but doesn't unmount this component, so it needs to be told.
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="nav" ref={navRef}>
      <div className="nav-bar">
        <NavLink to="/" end className="nav-brand" onClick={closeMenu}>
          <Logo />
          Testbed
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav-links"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>

        <nav
          id="primary-nav-links"
          className={menuOpen ? 'nav-links nav-links-open' : 'nav-links'}
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Nav;

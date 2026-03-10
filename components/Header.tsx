export function Header() {
  const glyphDots = Array.from({ length: 12 });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button aria-label="Signal menu" className="topbar-glyph" type="button">
          <span className="topbar-glyph-grid" aria-hidden="true">
            {glyphDots.map((_, index) => (
              <span key={index} className="glyph-dot" />
            ))}
          </span>
        </button>

        <div className="brand-lockup" aria-label="Nothing Ground Signal">
          <span className="brand-heavy">Nothing</span>
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-light">Ground Signal</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-location">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          <span>BERLIN, DE</span>
        </div>
        <div className="topbar-divider" />
        <div className="topbar-status">
          <div className="status-dot" />
          <span>SYS.ONLINE</span>
        </div>
      </div>
    </header>
  );
}

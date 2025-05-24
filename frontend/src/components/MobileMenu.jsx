import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../context/GameContext';

const MobileMenu = ({ isOpen, setIsOpen }) => {
  const { tcorvax, catNips, energy, eggs, formatResource, isMobile, gameMode } = useContext(GameContext);
  const [hiddenDuringBattle, setHiddenDuringBattle] = useState(false);
  
  // Update visibility based on game mode
  useEffect(() => {
    // Hide menu button during battle mode
    setHiddenDuringBattle(gameMode === 'battle');
  }, [gameMode]);

  // Don't show the mobile menu button on desktop or during battle
  if (!isMobile || hiddenDuringBattle) {
    return null;
  }

  return (
    <>
      {/* Mobile burger menu button */}
      <button 
        className="mobile-menu-btn" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          zIndex: 10001, // Keep this the highest z-index
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: hiddenDuringBattle ? 0 : 1,
          pointerEvents: hiddenDuringBattle ? 'none' : 'auto',
          transform: hiddenDuringBattle ? 'translateY(-50px)' : 'translateY(0)'
        }}
      >
        ≡ Menu
      </button>
      
      {/* Mobile mini-HUD - hide when menu is open or during battle */}
      {!isOpen && !hiddenDuringBattle && (
        <div className="mobile-hud" style={{
          display: 'flex',
          flexWrap: 'wrap',
          position: 'fixed',
          top: '60px',
          left: '10px',
          right: '10px',
          height: 'auto',
          minHeight: '40px',
          zIndex: 8000, // Below messages and side panel
          padding: '5px',
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: '10px',
          margin: 0,
          border: '1px solid rgba(76, 175, 80, 0.3)',
          boxShadow: '0 5px 10px rgba(0, 0, 0, 0.3)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: hiddenDuringBattle ? 0 : 1,
          transform: hiddenDuringBattle ? 'translateY(-50px)' : 'translateY(0)'
        }}>
          <div className="mobile-resource">
            💎 <span id="mobile-tcorvax">{formatResource(tcorvax)}</span>
          </div>
          <div className="mobile-resource">
            🐱 <span id="mobile-catnips">{formatResource(catNips)}</span>
          </div>
          <div className="mobile-resource">
            ⚡ <span id="mobile-energy">{formatResource(energy)}</span>
          </div>
          <div className="mobile-resource">
            🥚 <span id="mobile-eggs">{formatResource(eggs)}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileMenu;

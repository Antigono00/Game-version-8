// src/App.jsx - Updated with Room Navigation and z-index fixes
import { useContext, useEffect } from 'react';
import { GameContext } from './context/GameContext';
import TelegramLogin from './components/TelegramLogin';
import GameCanvas from './components/GameCanvas';
import SidePanel from './components/SidePanel';
import MobileMenu from './components/MobileMenu';
import WelcomeMessage from './components/WelcomeMessage';
import LowCorvaxMessage from './components/LowCorvaxMessage';
import HelpButton from './components/HelpButton';
import MobileRadixWrapper from './components/MobileRadixWrapper';
import RoomUnlockMessage from './components/RoomUnlockMessage';
import BattleGame from './components/BattleGame'; // Import BattleGame component

// Import the Radix Connect Provider & Button
import { RadixConnectProvider } from './context/RadixConnectContext';
import RadixConnectButton from './context/RadixConnectButton';

// The same dApp address you had before
const dAppDefinitionAddress =
  'account_rdx129994zq674n4mturvkqz7cz9t7gmtn5sjspxv7py2ahqnpdvxjsqum';

function App() {
  const {
    isLoggedIn,
    showWelcomeMessage,
    isPanelOpen,
    setIsPanelOpen,
    loadGameFromServer,
    setAssetsLoaded,
    isMobile,
    showRoomUnlockMessage,
    showBattleGame,
    setShowBattleGame
  } = useContext(GameContext);

  // Preload images
  useEffect(() => {
    const imagePaths = [
      '/assets/Background.png',
      '/assets/Background2.png', // Add second room background
      '/assets/Player.png',
      '/assets/CatsLair.png',
      '/assets/Reactor.png',
      '/assets/Amplifier.png',
      '/assets/Incubator.png',
      '/assets/FomoHit.png'
    ];
    console.log('Starting to load assets...');

    const preloadImages = async () => {
      try {
        for (const src of imagePaths) {
          console.log(`Loading image from ${src}...`);
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              console.log(`Successfully loaded image: ${src}`);
              resolve(true);
            };
            img.onerror = () => {
              console.warn(`Failed to load image: ${src}`);
              resolve(true);
            };
            img.src = src;
          });
        }
        console.log('All images have been attempted to load.');
      } catch (err) {
        console.error('Preloading error:', err);
      }
      setAssetsLoaded(true);
    };
    preloadImages();
  }, [setAssetsLoaded]);

  // Load game data once user is logged in (Telegram side)
  useEffect(() => {
    if (isLoggedIn) {
      loadGameFromServer();
    }
  }, [isLoggedIn, loadGameFromServer]);

  // Wrap everything in the RadixConnectProvider
  return (
    <RadixConnectProvider dAppDefinitionAddress={dAppDefinitionAddress}>
      {/* Z-index styles for proper mobile layering */}
      <style jsx>{`
        .app-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .game-container {
          position: relative;
          z-index: 100;
        }
        
        .game-container.mobile {
          position: relative;
          z-index: 5000; /* Below mobile HUD and side panel but above most other elements */
        }
        
        /* Fixed z-index hierarchy for mobile UI */
        .mobile-menu-btn {
          z-index: 10001 !important; /* Highest */
        }
        
        .low-corvax-message {
          z-index: 10010 !important; /* Highest for messages */
        }
        
        .side-panel {
          z-index: 9999 !important; /* Very high but below message */
        }
        
        .mobile-hud {
          z-index: 8000 !important; /* High but below side panel */
        }
        
        .room-navigation {
          z-index: 7000 !important; /* Below mobile HUD */
        }

        /* Battle Game overlay should be above most content */
        .battle-game {
          z-index: 9995 !important; /* Higher than game content but below menus */
        }
      `}</style>

      <div className="app-container">
        {!isLoggedIn && <TelegramLogin />}

        {isLoggedIn && !isMobile && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 2000,
              backgroundColor: 'rgba(30, 30, 30, 0.8)',
              padding: '10px',
              borderRadius: '10px',
              boxShadow: '0 0 15px rgba(76, 175, 80, 0.3)',
              backdropFilter: 'blur(5px)'
            }}
          >
            {/* Only show the standard button on desktop */}
            <RadixConnectButton />
          </div>
        )}
        
        {/* Add our custom mobile Radix wrapper */}
        {isLoggedIn && <MobileRadixWrapper />}

        <MobileMenu isOpen={isPanelOpen} setIsOpen={setIsPanelOpen} />

        <div className={`game-container ${isMobile ? 'mobile' : ''}`}>
          <SidePanel isOpen={isPanelOpen || !isMobile} />
          <GameCanvas />
        </div>

        {showWelcomeMessage && <WelcomeMessage />}
        <LowCorvaxMessage />
        
        {/* Add Room Unlock Message */}
        {showRoomUnlockMessage && <RoomUnlockMessage />}
        
        {/* Add the Help Button - only show when logged in */}
        {isLoggedIn && <HelpButton />}
        
        {/* Add Battle Game overlay */}
        {showBattleGame && (
          <BattleGame onClose={() => setShowBattleGame(false)} />
        )}
      </div>
    </RadixConnectProvider>
  );
}

export default App;

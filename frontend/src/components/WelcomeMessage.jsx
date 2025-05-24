// src/components/WelcomeMessage.jsx
import { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const WelcomeMessage = () => {
  const { setShowWelcomeMessage, isMobile } = useContext(GameContext);
  
  // Function to close the welcome message
  const handleClose = () => setShowWelcomeMessage(false);
  
  return (
    <div className="welcome-message">
      <h1>Welcome to Corvax Lab!</h1>
      
      {/* Mobile-only sticky top button */}
      {isMobile && (
        <div style={{
          position: 'sticky',
          top: '10px',
          zIndex: 5,
          textAlign: 'center',
          marginBottom: '15px'
        }}>
          <button 
            onClick={handleClose}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              cursor: 'pointer',
              width: '80%',
              maxWidth: '250px'
            }}
          >
            Start Playing
          </button>
        </div>
      )}
      
      {/* New section about Evolving Creatures */}
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px', 
        background: 'rgba(33, 150, 243, 0.15)', 
        borderRadius: '8px',
        border: '1px solid rgba(33, 150, 243, 0.3)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#2196F3' }}>🥚 Evolving Creatures</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          Start your adventure by minting your own unique creature:
        </p>
        
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Mint a creature egg and receive a bonus item</li>
          <li>Each creature is inspired by a Radix project</li>
          <li>To upgrade stats and evolve, feed your creature with the token of its associated Radix project</li>
          <li>Collect rare species with different abilities and specialty stats</li>
          <li>No TCorvax needed - start minting right away!</li>
        </ul>
      </div>
      
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px', 
        background: 'rgba(76, 175, 80, 0.1)', 
        borderRadius: '8px' 
      }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          Build your lab, produce resources, and create a thriving economy!
        </p>
        
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Start with a <strong style={{ color: '#4CAF50' }}>Cat's Lair</strong> to produce Cat Nips</li>
          <li>Build a <strong style={{ color: '#2196F3' }}>Reactor</strong> to convert Cat Nips into TCorvax and Energy</li>
          <li>Add an <strong style={{ color: '#9C27B0' }}>Amplifier</strong> to boost your production</li>
          <li>Unlock more advanced machines as you progress!</li>
        </ul>
      </div>
      
      <div style={{ 
        display: 'flex',
        gap: '15px',
        margin: '20px 0',
        textAlign: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          flex: '1',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          minWidth: isMobile ? '100%' : '140px'
        }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#4CAF50' }}>Desktop Controls</h3>
          <p style={{ margin: '0' }}>
            <span className="key">↑</span>
            <span className="key">↓</span>
            <span className="key">←</span>
            <span className="key">→</span> 
            to move
          </p>
          <p style={{ margin: '5px 0 0 0' }}>
            <span className="key">Space</span> to activate
          </p>
        </div>
        
        <div style={{ 
          flex: '1',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          minWidth: isMobile ? '100%' : '140px'
        }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#4CAF50' }}>Mobile Controls</h3>
          <p style={{ margin: '0' }}>
            <strong>Tap</strong> to move
          </p>
          <p style={{ margin: '5px 0 0 0' }}>
            <strong>Tap Machine</strong> to activate
          </p>
        </div>
      </div>
      
      <div style={{ 
        padding: '10px', 
        background: 'rgba(0, 0, 0, 0.2)', 
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0' }}>
          Click the <strong style={{ color: '#7e57c2' }}>?</strong> help button anytime for detailed instructions.
        </p>
      </div>
      
      {/* Only show the bottom button for desktop users */}
      {!isMobile && (
        <button onClick={handleClose}>
          Start Playing
        </button>
      )}
    </div>
  );
};

export default WelcomeMessage;

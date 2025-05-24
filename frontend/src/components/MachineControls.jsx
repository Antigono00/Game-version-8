// src/components/MachineControls.jsx
import { useContext, useState } from 'react';
import { GameContext } from '../context/GameContext';
import FomoHitMinter from './FomoHitMinter';
import MoveMachines from './MoveMachines';

function MachineControls() {
  const {
    canBuildMachine,
    canAfford,
    calculateMachineCost,
    buildMachine,
    upgradeMachine,
    machineTypes,
    machines,
    formatResource,
    player,
    isMobile,
    setSelectedMachineToMove,
    setShowCreatureMinter,
    creatureNfts, // Access to creatures for battle button
    showBattleGame,
    setShowBattleGame
  } = useContext(GameContext);

  // State for accordion - CHANGED to start with all sections collapsed (null)
  const [activeSection, setActiveSection] = useState(null);

  // State for NFT minting
  const [showMinter, setShowMinter] = useState(false);
  const [selectedFomoHit, setSelectedFomoHit] = useState(null);

  // Group machines by type for the upgrade section
  const machinesByType = machines.reduce((acc, machine) => {
    if (!acc[machine.type]) {
      acc[machine.type] = [];
    }
    acc[machine.type].push(machine);
    return acc;
  }, {});

  // Toggle sections - only one section open at a time
  const toggleSection = (section) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  // Handle build machine
  const handleBuild = (type) => {
    // Get player's center position to build near them
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    // Offset slightly so the machine doesn't interfere with the player
    const buildX = playerCenterX + 20;
    const buildY = playerCenterY + 20;
    
    // Build the machine at the player's position
    buildMachine(type, buildX, buildY);
  };

  // Handle upgrade machine
  const handleUpgrade = (machineId) => {
    upgradeMachine(machineId);
  };

  // Handle FOMO HIT NFT minting
  const handleFomoHitClick = (machine) => {
    // If this is the first time activating (NFT needs to be minted)
    if (machine.lastActivated === 0) {
      setSelectedFomoHit(machine);
      setShowMinter(true);
    }
  };
  
  // Handle Evolving Creatures minter
  const handleEvolvingCreaturesClick = () => {
    setShowCreatureMinter(true); // Update the GameContext state
  };
  
  // Handle Battle game
  const handleBattleClick = () => {
    setShowBattleGame(true);
  };

  // Compact format for resource cost
  const formatCost = (cost) => {
    if (!cost) return "Free";
    
    return Object.entries(cost).map(([resource, amount]) => {
      const resourceIcon = resource === 'tcorvax' ? '💎' : 
                           resource === 'catNips' ? '🐱' : 
                           resource === 'energy' ? '⚡' : 
                           resource === 'eggs' ? '🥚' : '';
      return `${resourceIcon}${amount}`;
    }).join(' ');
  };

  return (
    <>
      <div className="machine-controls">
        <div style={{ 
          marginBottom: '15px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '10px', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Mint Creature Button */}
          <button
            onClick={handleEvolvingCreaturesClick}
            className="creature-mint-button"
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '8px 15px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            🥚 Mint Creature
          </button>
          
          {/* Battle Arena Button - show only if user has creatures */}
          {creatureNfts && creatureNfts.length > 0 && (
            <button
              onClick={handleBattleClick}
              className="battle-arena-button"
              style={{
                backgroundColor: '#FF5722',
                color: 'white',
                padding: '8px 15px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              ⚔️ Battle Arena
            </button>
          )}
        </div>
          
        {/* Build Machines Section */}
        <div className="accordion-section">
          <div 
            className="accordion-header" 
            onClick={() => toggleSection('build')}
          >
            <h3>
              {activeSection === 'build' ? '▼' : '▶'} Build Machines
            </h3>
          </div>
          
          {activeSection === 'build' && (
            <div className="accordion-content">
              {Object.keys(machineTypes).map((type) => {
                const cost = calculateMachineCost(type);
                const canBuild = canBuildMachine(type);
                const affordable = canAfford(cost);
                const machineInfo = machineTypes[type];
                
                // For reactor, check if it's the third one and add special requirements message
                const isThirdReactor = type === 'reactor' && (machines.filter(m => m.type === 'reactor').length === 2);
                
                return (
                  <div key={type} className={`machine-button-container ${!canBuild || !affordable ? 'disabled' : ''}`}>
                    <button
                      id={`build-${type}`}
                      disabled={!canBuild || !affordable}
                      onClick={() => handleBuild(type)}
                      className={`machine-button machine-${type}`}
                      style={{
                        backgroundColor: machineInfo.baseColor,
                        opacity: (!canBuild || !affordable) ? 0.5 : 1,
                        position: 'relative'
                      }}
                    >
                      <span className="machine-icon">{machineInfo.icon}</span>
                      <span className="machine-name">{machineInfo.name}</span>
                      <span className="machine-cost">{formatCost(cost)}</span>
                    </button>
                    
                    {/* Special message for third reactor requirements */}
                    {isThirdReactor && !canBuild && (
                      <div className="requirement-text critical">
                        Requires Incubator & FOMO HIT
                      </div>
                    )}
                    
                    {/* Standard requirement messages */}
                    {!canBuild && !affordable && type === 'incubator' && (
                      <div className="requirement-text critical">
                        Requires max level machines
                      </div>
                    )}
                    {!canBuild && !affordable && type === 'fomoHit' && (
                      <div className="requirement-text critical">
                        Build all other machines first
                      </div>
                    )}
                    {!affordable && canBuild && (
                      <div className="requirement-text critical">Not enough resources</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Upgrade Machines Section */}
        <div className="accordion-section">
          <div 
            className="accordion-header" 
            onClick={() => toggleSection('upgrade')}
          >
            <h3>
              {activeSection === 'upgrade' ? '▼' : '▶'} Upgrade Machines
            </h3>
          </div>
          
          {activeSection === 'upgrade' && (
            <div className="accordion-content">
              {Object.entries(machinesByType).map(([type, machineList]) => {
                const machineInfo = machineTypes[type];
                if (!machineInfo) {
                  return null;
                }
                
                return (
                  <div key={type} className="machine-group">
                    <div className="machine-group-header">
                      <span className="machine-icon">{machineInfo.icon}</span>
                      <span className="machine-name">{machineInfo.name}</span>
                    </div>
                    
                    {machineList.map((machine) => {
                      // FOMO HIT doesn't have level upgrades, only NFT minting on first activation
                      if (type === 'fomoHit') {
                        return (
                          <div key={machine.id} className="machine-item">
                            <button
                              className="upgrade-button special-action"
                              onClick={() => handleFomoHitClick(machine)}
                              style={{ backgroundColor: machineInfo.baseColor }}
                            >
                              {machine.lastActivated === 0 ? 
                                '🔥 Mint NFT' : 
                                '✓ NFT Minted'}
                            </button>
                          </div>
                        );
                      }
                      
                      // Define maxLevel based on machine type
                      const maxLevel = type === 'amplifier' ? 5 : 
                                    type === 'incubator' ? 2 : 3;
                      const isMaxLevel = machine.level >= maxLevel;
                      
                      return (
                        <div key={machine.id} className="machine-item">
                          <div className="machine-level">
                            Level {machine.level}{isMaxLevel ? ' (MAX)' : ''}
                          </div>
                          
                          {!isMaxLevel && (
                            <button
                              id={`level-up-${type}-${machine.id}`}
                              onClick={() => handleUpgrade(machine.id)}
                              className="upgrade-button"
                              style={{ backgroundColor: machineInfo.baseColor }}
                            >
                              LVL {machine.level} → {machine.level + 1}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Move Machines Section */}
        <div className="accordion-section">
          <div 
            className="accordion-header" 
            onClick={() => toggleSection('move')}
          >
            <h3>
              {activeSection === 'move' ? '▼' : '▶'} Move Machines
            </h3>
          </div>
          
          {activeSection === 'move' && (
            <div className="accordion-content">
              <MoveMachines />
            </div>
          )}
        </div>
        
        {/* FOMO HIT Minter Dialog */}
        {showMinter && selectedFomoHit && (
          <FomoHitMinter 
            machineId={selectedFomoHit.id} 
            onClose={() => setShowMinter(false)} 
          />
        )}
      </div>
    </>
  );
}

export default MachineControls;

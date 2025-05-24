// src/components/battle/BattleHeader.jsx
import React from 'react';

const BattleHeader = ({ turn, playerEnergy, enemyEnergy, difficulty, activePlayer }) => {
  const getDifficultyColor = (diff) => {
    switch (diff.toLowerCase()) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'hard': return '#FF9800';
      case 'expert': return '#FF5722';
      default: return '#4CAF50';
    }
  };
  
  return (
    <div className="battle-header">
      <div className="battle-info">
        <div className="turn-counter">
          <span className="turn-label">Turn</span>
          <span className="turn-number">{turn}</span>
        </div>
        
        <div className="difficulty-indicator" 
          style={{ backgroundColor: getDifficultyColor(difficulty) }}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </div>
        
        <div className="active-player-indicator">
          {activePlayer === 'player' ? (
            <span className="player-active">Your Turn</span>
          ) : (
            <span className="enemy-active">Enemy Turn</span>
          )}
        </div>
      </div>
      
      <div className="energy-displays">
        <div className="player-energy">
          <div className="energy-label">Your Energy</div>
          <div className="energy-value">{playerEnergy}</div>
          <div className="energy-bar-container">
            <div className="energy-bar" 
              style={{ width: `${Math.min(100, (playerEnergy / 15) * 100)}%` }} />
          </div>
        </div>
        
        <div className="enemy-energy">
          <div className="energy-label">Enemy Energy</div>
          <div className="energy-value">{enemyEnergy}</div>
          <div className="energy-bar-container">
            <div className="energy-bar enemy" 
              style={{ width: `${Math.min(100, (enemyEnergy / 15) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleHeader;

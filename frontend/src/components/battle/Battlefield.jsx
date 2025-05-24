// src/components/battle/Battlefield.jsx - Fixed JSX Syntax with Improved Layout
import React from 'react';
import CreatureCard from './CreatureCard';
import BattleLog from './BattleLog';
import ActionPanel from './ActionPanel';

// Helper function to get max field size based on difficulty
const getMaxFieldSize = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 3;
    case 'medium': return 4;
    case 'hard': return 5;
    case 'expert': return 6;
    default: return 3;
  }
};

const Battlefield = ({ 
  playerField = [], 
  enemyField = [], 
  activePlayer,
  difficulty = 'easy',
  onCreatureSelect,
  selectedCreature,
  targetCreature,
  isDesktop = false,
  // Props passed through from BattleGame for desktop sidebars
  battleLog,
  availableActions,
  onAction,
  disabled,
  availableTools,
  availableSpells
}) => {
  // Use dynamic max field size based on difficulty
  const maxEnemyFieldSize = getMaxFieldSize(difficulty);
  const maxPlayerFieldSize = 3; // Player is always limited to 3 for balance
  
  // Determine if we should apply the large-field class based on enemy field size
  const enemyFieldClass = maxEnemyFieldSize > 3 ? 'battlefield-enemy large-field' : 'battlefield-enemy';
  
  return (
    <div className="battlefield">
      {/* Enemy field (top) */}
      <div className={enemyFieldClass}>
        {enemyField.map((creature) => (
          <CreatureCard 
            key={creature.id}
            creature={creature}
            isEnemy={true}
            isSelected={targetCreature && targetCreature.id === creature.id}
            isTarget={targetCreature && targetCreature.id === creature.id}
            onClick={() => onCreatureSelect(creature, true)}
          />
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, maxEnemyFieldSize - enemyField.length) }).map((_, index) => (
          <div key={`empty-enemy-${index}`} className="creature-slot empty" />
        ))}
      </div>
      
      {/* Center divider with game information */}
      <div className="battlefield-center-container">
        <div className="battlefield-center">
          {activePlayer === 'player' 
            ? "👉 Your turn - select a creature to act" 
            : "Enemy is thinking..."}
        </div>
      </div>
      
      {/* Player field section with sidebars on desktop */}
      {isDesktop ? (
        <div className="battlefield-player-section">
          {/* Left sidebar - Battle Log - Note we wrap in a container div to control dimensions */}
          <div className="battle-log-sidebar">
            <BattleLog log={battleLog} />
          </div>
          
          {/* Player field (center) */}
          <div className="battlefield-player">
            {playerField.map((creature) => (
              <CreatureCard 
                key={creature.id}
                creature={creature}
                isEnemy={false}
                isSelected={selectedCreature && selectedCreature.id === creature.id}
                isTarget={false}
                onClick={() => onCreatureSelect(creature, false)}
              />
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, maxPlayerFieldSize - playerField.length) }).map((_, index) => (
              <div key={`empty-player-${index}`} className="creature-slot empty" />
            ))}
          </div>
          
          {/* Right sidebar - Action Panel - Note we wrap in a container div to control dimensions */}
          <div className="action-panel-sidebar">
            <ActionPanel 
              selectedCreature={selectedCreature}
              targetCreature={targetCreature}
              availableActions={availableActions}
              onAction={onAction}
              disabled={disabled}
              availableTools={availableTools}
              availableSpells={availableSpells}
            />
          </div>
        </div>
      ) : (
        // Mobile layout - just player field
        <div className="battlefield-player">
          {playerField.map((creature) => (
            <CreatureCard 
              key={creature.id}
              creature={creature}
              isEnemy={false}
              isSelected={selectedCreature && selectedCreature.id === creature.id}
              isTarget={false}
              onClick={() => onCreatureSelect(creature, false)}
            />
          ))}
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, maxPlayerFieldSize - playerField.length) }).map((_, index) => (
            <div key={`empty-player-${index}`} className="creature-slot empty" />
          ))}
        </div>
      )}
    </div>
  );
};

export default Battlefield;

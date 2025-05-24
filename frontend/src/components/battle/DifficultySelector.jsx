// src/components/battle/DifficultySelector.jsx
import React, { useState } from 'react';

const DifficultySelector = ({ onSelectDifficulty, onStartBattle, creatureCount, difficulty: currentDifficulty }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentDifficulty || 'easy');
  
  const difficulties = [
    { id: 'easy', name: 'Easy', description: 'For beginners. Enemy creatures are weaker and AI makes simple decisions.' },
    { id: 'medium', name: 'Medium', description: 'Balanced challenge. Enemy creatures are evenly matched with yours.' },
    { id: 'hard', name: 'Hard', description: 'For experienced players. Enemy creatures are stronger and AI makes smart decisions.' },
    { id: 'expert', name: 'Expert', description: 'Ultimate challenge. Enemy creatures are much stronger and AI plays optimally.' }
  ];
  
  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'hard': return '#FF9800';
      case 'expert': return '#FF5722';
      default: return '#4CAF50';
    }
  };
  
  const handleDifficultySelect = (difficultyId) => {
    setSelectedDifficulty(difficultyId);
    onSelectDifficulty(difficultyId);
  };
  
  const handleStartBattle = () => {
    onStartBattle();
  };
  
  return (
    <div className="difficulty-selector">
      <h2>Battle Arena</h2>
      
      <div className="difficulty-description">
        <p>Choose a difficulty level to start a battle with your creatures.</p>
        <p>You have {creatureCount} creatures available for battle.</p>
      </div>
      
      <div className="difficulty-options">
        {difficulties.map(difficulty => (
          <div 
            key={difficulty.id}
            className={`difficulty-option ${selectedDifficulty === difficulty.id ? 'selected' : ''}`}
            onClick={() => handleDifficultySelect(difficulty.id)}
            style={{
              borderColor: selectedDifficulty === difficulty.id ? 
                getDifficultyColor(difficulty.id) : 'transparent'
            }}
          >
            <div className="difficulty-header" 
              style={{ backgroundColor: getDifficultyColor(difficulty.id) }}>
              {difficulty.name}
            </div>
            <div className="difficulty-content">
              <p>{difficulty.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="battle-controls">
        <button 
          className="start-battle-btn"
          onClick={handleStartBattle}
          style={{ backgroundColor: getDifficultyColor(selectedDifficulty) }}
          disabled={creatureCount === 0}
        >
          {creatureCount === 0 ? 'No Creatures Available' : 'Start Battle!'}
        </button>
      </div>
    </div>
  );
};

export default DifficultySelector;

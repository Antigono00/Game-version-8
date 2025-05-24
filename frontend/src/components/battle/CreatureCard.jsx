// src/components/battle/CreatureCard.jsx - UPDATED WITH MOBILE SUPPORT
import React, { useState, useEffect } from 'react';
import { getRarityColor } from '../../utils/uiHelpers';
import { getPlaceholderForForm } from '../../utils/enemyPlaceholders';

const CreatureCard = ({ 
  creature, 
  isEnemy = false, 
  onClick, 
  isSelected = false, 
  isTarget = false,
  disabled = false,
  simplified = false,
  dataPower,
  dataDefense
}) => {
  const [imageError, setImageError] = useState(false);
  
  if (!creature) return null;
  
  // Reset image error when creature changes
  useEffect(() => {
    setImageError(false);
  }, [creature.id, creature.image_url]);
  
  const handleImageError = () => {
    console.log(`Image failed to load for ${creature.species_name}, using placeholder`);
    setImageError(true);
  };
  
  const getImageSrc = () => {
    if (imageError || !creature.image_url) {
      return getPlaceholderForForm(creature.form || 0);
    }
    return creature.image_url;
  };
  
  const healthPercentage = creature.battleStats 
    ? (creature.currentHealth / creature.battleStats.maxHealth) * 100 
    : 100;
    
  const healthStatus = healthPercentage <= 25 ? 'critical' : healthPercentage <= 50 ? 'low' : 'normal';
  
  const cardClasses = [
    'creature-card',
    isEnemy && 'enemy',
    isSelected && 'selected',
    isTarget && 'target',
    creature.isDefending && 'defending',
    disabled && 'disabled'
  ].filter(Boolean).join(' ');
  
  const handleClick = (e) => {
    if (!disabled && onClick) {
      e.stopPropagation();
      onClick(creature, isEnemy);
    }
  };
  
  // Get specialty stats for highlighting
  const specialtyStats = creature.specialty_stats || [];
  
  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      data-rarity={creature.rarity}
    >
      {/* Header */}
      <div className="creature-card-header">
        <span className="creature-name">{creature.species_name}</span>
        <span className="creature-form">F{creature.form || 0}</span>
      </div>
      
      {/* Image */}
      <div className="creature-image-container">
        <img 
          src={getImageSrc()}
          alt={creature.species_name}
          className={`creature-image ${imageError ? 'image-fallback' : ''}`}
          onError={handleImageError}
        />
      </div>
      
      {/* Footer with health and stats */}
      <div 
        className="creature-card-footer"
        data-power={dataPower}
        data-defense={dataDefense}
      >
        {/* Health Bar */}
        <div className="health-bar-container">
          <div 
            className="health-bar" 
            style={{ width: `${healthPercentage}%` }}
            data-health={healthStatus}
          />
          <span className="health-text">
            {creature.currentHealth}/{creature.battleStats?.maxHealth || 0}
          </span>
        </div>
        
        {/* Stats Grid - Hidden on simplified mobile view */}
        {!simplified && creature.battleStats && (
          <div className="mini-stats">
            <div className={`mini-stat ${specialtyStats.includes('strength') ? 'primary' : ''}`}>
              <span className="stat-icon">⚔️</span>
              <span className="stat-value">{creature.battleStats.physicalAttack}</span>
            </div>
            <div className={`mini-stat ${specialtyStats.includes('magic') ? 'primary' : ''}`}>
              <span className="stat-icon">✨</span>
              <span className="stat-value">{creature.battleStats.magicalAttack}</span>
            </div>
            <div className={`mini-stat ${specialtyStats.includes('speed') ? 'primary' : ''}`}>
              <span className="stat-icon">⚡</span>
              <span className="stat-value">{creature.battleStats.initiative}</span>
            </div>
            <div className={`mini-stat ${specialtyStats.includes('stamina') ? 'primary' : ''}`}>
              <span className="stat-icon">🛡️</span>
              <span className="stat-value">{creature.battleStats.physicalDefense}</span>
            </div>
            <div className={`mini-stat ${specialtyStats.includes('energy') ? 'primary' : ''}`}>
              <span className="stat-icon">🔮</span>
              <span className="stat-value">{creature.battleStats.magicalDefense}</span>
            </div>
            <div className="mini-stat special-slot">
              {creature.rarity === 'Legendary' && <span className="rarity-indicator">★</span>}
              {creature.rarity === 'Epic' && <span className="rarity-indicator">◆</span>}
              {creature.rarity === 'Rare' && <span className="rarity-indicator">♦</span>}
            </div>
          </div>
        )}
      </div>
      
      {/* Status Effects */}
      {creature.activeEffects && creature.activeEffects.length > 0 && (
        <div className="status-effects">
          {creature.activeEffects.map((effect, index) => (
            <div 
              key={index} 
              className={`status-icon ${effect.type}`}
              title={effect.name}
            >
              {effect.type === 'buff' ? '↑' : '↓'}
            </div>
          ))}
        </div>
      )}
      
      {/* Defending Shield */}
      {creature.isDefending && (
        <div className="defending-shield">🛡️</div>
      )}
    </div>
  );
};

export default CreatureCard;

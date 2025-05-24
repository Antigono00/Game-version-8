// src/components/battle/ActionPanel.jsx - Improved Desktop and Mobile Layout
import React, { useState } from 'react';
import ToolSpellModal from './ToolSpellModal';

const ActionPanel = ({ 
  selectedCreature, 
  targetCreature, 
  availableActions, 
  onAction, 
  disabled,
  availableTools,
  availableSpells
}) => {
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const isDesktop = window.innerWidth >= 769;
  
  if (!selectedCreature) {
    return (
      <div className="action-panel" style={{ zIndex: 30 }}>
        <div className="action-info">
          Select a creature to perform actions
        </div>
      </div>
    );
  }
  
  // Determine if special button should be shown
  const hasSpecialItems = (availableTools && availableTools.length > 0) || 
                        (availableSpells && availableSpells.length > 0);
  
  // Prepare special items for the modal
  const specialItems = {
    tool: availableTools || [],
    spell: availableSpells || []
  };
  
  // Get button configuration based on available actions
  const getButtonConfig = () => {
    const configs = [];
    
    if (availableActions.includes('deploy')) {
      configs.push({
        type: 'deploy',
        label: 'Deploy',
        icon: '📍',
        color: 'deploy',
        action: () => onAction({ type: 'deploy' }, null, selectedCreature)
      });
    }
    
    if (availableActions.includes('attack')) {
      configs.push({
        type: 'attack',
        label: 'Attack',
        icon: '⚔️',
        color: 'attack',
        action: () => onAction({ type: 'attack' }, targetCreature, selectedCreature),
        disabled: !targetCreature
      });
    }
    
    if ((availableActions.includes('useTool') || availableActions.includes('useSpell')) && hasSpecialItems) {
      configs.push({
        type: 'special',
        label: 'Special',
        icon: '✨',
        color: 'special',
        action: () => setShowSpecialModal(true)
      });
    }
    
    if (availableActions.includes('defend')) {
      configs.push({
        type: 'defend',
        label: 'Defend',
        icon: '🛡️',
        color: 'defend',
        action: () => onAction({ type: 'defend' }, null, selectedCreature)
      });
    }
    
    // Always show full "End Turn" text for clarity
    configs.push({
      type: 'end-turn',
      label: 'End Turn',
      icon: '⏭️',
      color: 'end-turn',
      action: () => onAction({ type: 'endTurn' })
    });
    
    return configs;
  };
  
  const buttonConfigs = getButtonConfig();
  
  return (
    <div className={`action-panel ${disabled ? 'disabled' : ''}`} style={{ zIndex: 30 }}>
      <div className="selected-info">
        <div className="selection-summary">
          <span className="selected-creature">
            {selectedCreature.species_name}
            {targetCreature && (
              <>
                <span className="action-arrow"> → </span>
                <span className="target-creature">{targetCreature.species_name}</span>
              </>
            )}
          </span>
        </div>
        
        {isDesktop && (
          <div className="creature-stats-summary">
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-icon">❤️</span>
                <span className="stat-value">{selectedCreature.currentHealth}/{selectedCreature.battleStats?.maxHealth}</span>
              </div>
              
              <div className="summary-stat">
                <span className="stat-icon">⚔️</span>
                <span className="stat-value">{Math.max(
                  selectedCreature.battleStats?.physicalAttack || 0,
                  selectedCreature.battleStats?.magicalAttack || 0
                )}</span>
              </div>
              
              <div className="summary-stat">
                <span className="stat-icon">🛡️</span>
                <span className="stat-value">{Math.max(
                  selectedCreature.battleStats?.physicalDefense || 0,
                  selectedCreature.battleStats?.magicalDefense || 0
                )}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="action-buttons">
        {buttonConfigs.map(config => (
          <button 
            key={config.type}
            className={`action-btn ${config.color}`}
            onClick={config.action}
            disabled={disabled || config.disabled}
            title={config.label}
          >
            <span className="btn-icon">{config.icon}</span>
            <span className="btn-label">{config.label}</span>
          </button>
        ))}
      </div>
      
      {/* Special items modal */}
      {showSpecialModal && (
        <ToolSpellModal 
          items={specialItems}
          showTabs={true}
          onSelect={(item) => {
            setShowSpecialModal(false);
            
            // Determine if it's a tool or spell
            if (item.tool_type && item.tool_effect) {
              onAction({ type: 'useTool', tool: item }, targetCreature, selectedCreature);
            } else if (item.spell_type && item.spell_effect) {
              onAction({ type: 'useSpell', spell: item }, targetCreature, selectedCreature);
            }
          }}
          onClose={() => setShowSpecialModal(false)}
        />
      )}
    </div>
  );
};

export default ActionPanel;

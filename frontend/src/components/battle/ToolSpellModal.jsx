// src/components/battle/ToolSpellModal.jsx - IMPROVED VERSION
import React, { useState } from 'react';

const ToolSpellModal = ({ items, type, onSelect, onClose, showTabs = false }) => {
  // State to track active tab when in combined special mode
  const [activeTab, setActiveTab] = useState(type || 'tool');
  
  // If there's no items or the array is empty, show a message
  if (!items || items.length === 0) {
    return (
      <div className="tool-spell-modal-overlay" onClick={onClose}>
        <div className="tool-spell-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>No {type}s Available</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-content">
            <p>You don't have any {type}s to use right now.</p>
            <button className="action-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }
  
  // Function to handle item selection
  const handleItemSelect = (item) => {
    onSelect(item);
  };
  
  // If using the special mode with tabs, filter items by active tab
  let displayedItems = items;
  
  // If we're in the tabbed special mode, prepare the UI accordingly
  if (showTabs && typeof items === 'object' && !Array.isArray(items)) {
    // Get the correct items based on active tab
    displayedItems = items[activeTab] || [];
    
    // Tabs-based layout for tools and spells combined
    return (
      <div className="tool-spell-modal-overlay" onClick={onClose}>
        <div className="tool-spell-modal special-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Select a Special Item</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-content">
            {/* Tabs for tools and spells */}
            <div className="modal-tabs">
              <div 
                className={`tab ${activeTab === 'tool' ? 'active' : ''}`}
                onClick={() => setActiveTab('tool')}
              >
                Tools
              </div>
              <div 
                className={`tab ${activeTab === 'spell' ? 'active' : ''}`}
                onClick={() => setActiveTab('spell')}
              >
                Spells
              </div>
            </div>
            
            {/* No items message if the current tab has no items */}
            {displayedItems.length === 0 && (
              <p>You don't have any {activeTab}s to use right now.</p>
            )}
            
            {/* Items grid for the current tab */}
            {displayedItems.length > 0 && (
              <div className="items-grid">
                {displayedItems.map(item => (
                  <div 
                    key={item.id}
                    className="item-card"
                    onClick={() => handleItemSelect(item)}
                  >
                    <img 
                      src={item.image_url || `/assets/${activeTab}_default.png`}
                      alt={item.name}
                      className="item-image"
                    />
                    
                    <div className="item-details">
                      <div className="item-name">{item.name}</div>
                      
                      <div className="item-properties">
                        <div className="item-type">
                          Affects: {activeTab === 'tool' ? item.tool_type : item.spell_type}
                        </div>
                        <div className="item-effect">
                          Effect: {activeTab === 'tool' ? item.tool_effect : item.spell_effect}
                        </div>
                      </div>
                      
                      <div className="item-description">
                        {getItemDescription(item, activeTab)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Standard single-type modal
  return (
    <div className="tool-spell-modal-overlay" onClick={onClose}>
      <div className="tool-spell-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select a {type === 'tool' ? 'Tool' : 'Spell'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="items-grid">
            {displayedItems.map(item => (
              <div 
                key={item.id}
                className="item-card"
                onClick={() => handleItemSelect(item)}
              >
                <img 
                  src={item.image_url || `/assets/${type}_default.png`}
                  alt={item.name}
                  className="item-image"
                />
                
                <div className="item-details">
                  <div className="item-name">{item.name}</div>
                  
                  <div className="item-properties">
                    <div className="item-type">
                      Affects: {type === 'tool' ? item.tool_type : item.spell_type}
                    </div>
                    <div className="item-effect">
                      Effect: {type === 'tool' ? item.tool_effect : item.spell_effect}
                    </div>
                  </div>
                  
                  <div className="item-description">
                    {getItemDescription(item, type)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get item description
function getItemDescription(item, type) {
  if (type === 'tool') {
    switch (item.tool_effect) {
      case 'Surge':
        return 'Provides a powerful but short-lived boost to stats.';
      case 'Shield':
        return 'Grants defensive protection against attacks.';
      case 'Echo':
        return 'Creates a repeating effect that lasts longer.';
      case 'Drain':
        return 'Converts defensive stats to offensive power.';
      case 'Charge':
        return 'Builds up power over time for a strong finish.';
      default:
        return `Enhances ${item.tool_type} attributes.`;
    }
  } else {
    switch (item.spell_effect) {
      case 'Surge':
        return 'Deals high immediate damage to the target.';
      case 'Shield':
        return 'Creates a protective magical barrier.';
      case 'Echo':
        return 'Applies effects that repeat over multiple turns.';
      case 'Drain':
        return 'Steals life force from the target to heal the caster.';
      case 'Charge':
        return 'Requires preparation but delivers a powerful effect.';
      default:
        return `Magical spell affecting ${item.spell_type}.`;
    }
  }
}

export default ToolSpellModal;

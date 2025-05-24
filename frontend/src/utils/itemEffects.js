// src/utils/itemEffects.js - BALANCED FOR STRATEGIC GAMEPLAY

// BALANCED: Get tool effect details with reasonable impact
export const getToolEffect = (tool) => {
  // Validate input - prevent null/undefined access
  if (!tool || !tool.tool_effect || !tool.tool_type) {
    console.error("Invalid tool data:", tool);
    // Return safe default values to prevent crashes
    return {
      statChanges: { physicalDefense: 2 },
      duration: 1
    };
  }

  const effect = tool.tool_effect;
  const type = tool.tool_type;
  
  // BALANCED: Base effects with strategic impact
  const baseEffects = {
    energy: { 
      statChanges: { energyCost: -1 }, // Reduced from -2
      energyGain: 2, // Reduced from 3
      duration: 3
    },
    strength: { 
      statChanges: { physicalAttack: 5 }, // Reduced from 8
      duration: 3
    },
    magic: { 
      statChanges: { magicalAttack: 5 }, // Reduced from 8
      duration: 3
    },
    stamina: { 
      statChanges: { physicalDefense: 5 }, // Reduced from 8
      healthChange: 10, // Reduced from 15
      duration: 3
    },
    speed: { 
      statChanges: { initiative: 5, dodgeChance: 3 }, // Reduced values
      duration: 3
    }
  };
  
  // Ensure we have a valid base effect, with fallback
  const baseEffect = baseEffects[type] || { 
    statChanges: { physicalAttack: 3 },
    duration: 3
  };
  
  switch (effect) {
    case 'Surge':
      // BALANCED: Strong but short effect
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = value * 2; // Reduced from 3
          return acc;
        }, {}),
        healthChange: (baseEffect.healthChange || 0) * 1.5, // Reduced from 2
        duration: 1
      };
      
    case 'Shield':
      // BALANCED: Defensive effect
      return {
        statChanges: { 
          physicalDefense: 10, // Reduced from 15
          magicalDefense: 10,  // Reduced from 15
          maxHealth: 15        // Reduced from 20
        },
        healthChange: 8, // Reduced from 10
        duration: 3
      };
      
    case 'Echo':
      // BALANCED: Repeating effect with moderate scaling
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = Math.round(value * 0.7); // Reduced from 0.8
          return acc;
        }, {}),
        healthOverTime: Math.round((baseEffect.healthChange || 0) * 0.25), // Reduced from 0.3
        duration: 5
      };
      
    case 'Drain':
      // BALANCED: Risk/reward stat conversion
      return {
        statChanges: {
          physicalAttack: 8,   // Reduced from 12
          magicalAttack: 8,    // Reduced from 12
          physicalDefense: -3, // Reduced penalty from -4
          magicalDefense: -3   // Reduced penalty from -4
        },
        healthChange: 5, // Reduced from 8
        duration: 3
      };
      
    case 'Charge':
      // BALANCED: Builds up over time
      return {
        statChanges: {}, // No immediate effect
        chargeEffect: {
          targetStat: Object.keys(baseEffect.statChanges || {})[0] || "physicalAttack",
          perTurnBonus: 3, // Reduced from 5
          maxTurns: 3,     // Reduced from 4
          finalBurst: 15   // Reduced from 20
        },
        duration: 3
      };
      
    // Default case - use the base effect
    default:
      return {
        ...baseEffect,
        statChanges: Object.entries(baseEffect.statChanges || {}).reduce((acc, [stat, value]) => {
          acc[stat] = Math.round(value * 1.1); // Reduced from 1.2
          return acc;
        }, {}),
        healthChange: Math.round((baseEffect.healthChange || 0) * 1.1)
      };
  }
};

// BALANCED: Get spell effect details with strategic impact
export const getSpellEffect = (spell, casterMagic = 5) => {
  // Validate input to prevent null/undefined access
  if (!spell || !spell.spell_effect || !spell.spell_type) {
    console.error("Invalid spell data:", spell);
    // Return safe default values
    return {
      damage: 5,
      duration: 1
    };
  }

  const effect = spell.spell_effect;
  const type = spell.spell_type;
  
  // BALANCED: Magic power modifier with reasonable scaling
  const magicPower = 1 + (casterMagic * 0.15); // Reduced from 0.25
  
  // BALANCED: Base effects with strategic damage/healing
  const baseEffects = {
    energy: { 
      statChanges: { energyCost: -2 }, // Reduced from -3
      energyGain: 5, // Reduced from 8
      duration: 2
    },
    strength: { 
      damage: 20 * magicPower, // Reduced from 30
      statChanges: { physicalAttack: 6 }, // Reduced from 10
      duration: 2
    },
    magic: { 
      damage: 18 * magicPower, // Reduced from 28
      statChanges: { magicalAttack: 6, magicalDefense: 3 }, // Reduced values
      duration: 2
    },
    stamina: { 
      healing: 25 * magicPower, // Reduced from 35
      statChanges: { physicalDefense: 5 }, // Reduced from 8
      duration: 2
    },
    speed: { 
      statChanges: { 
        initiative: 8,       // Reduced from 12
        dodgeChance: 5,      // Reduced from 8
        criticalChance: 5    // Reduced from 8
      },
      duration: 2
    }
  };
  
  // Ensure we have a valid base effect, with fallback
  const baseEffect = baseEffects[type] || { 
    damage: 10 * magicPower, // Reduced from 15
    duration: 2
  };
  
  switch (effect) {
    case 'Surge':
      // BALANCED: High damage spell
      return {
        damage: (baseEffect.damage || 15) * 2.5, // Reduced from 3.5
        criticalChance: 15, // Reduced from 25
        armorPiercing: true,
        duration: 0 // No lingering effect
      };
      
    case 'Shield':
      // BALANCED: Protective spell
      return {
        statChanges: {
          physicalDefense: 12,  // Reduced from 18
          magicalDefense: 12,   // Reduced from 18
          maxHealth: 20         // Reduced from 25
        },
        healing: 15 * magicPower, // Reduced from 20
        damageReduction: 0.2,     // Reduced from 0.3
        duration: 3
      };
      
    case 'Echo':
      // BALANCED: Damage/healing over time
      return {
        healthOverTime: baseEffect.healing 
          ? Math.round((baseEffect.healing / 3) * magicPower) // Reduced from /2
          : baseEffect.damage 
            ? Math.round(-(baseEffect.damage / 3) * magicPower) // Reduced from /2
            : 0,
        statEffect: baseEffect.statChanges ? 
          Object.entries(baseEffect.statChanges).reduce((acc, [stat, value]) => {
            acc[stat] = Math.round(value * 0.3); // Reduced from 0.4
            return acc;
          }, {}) : {},
        duration: 3
      };
      
    case 'Drain':
      // BALANCED: Life drain spell
      return {
        damage: 18 * magicPower,     // Reduced from 25
        selfHeal: 10 * magicPower,   // Reduced from 15
        statDrain: {                 
          physicalAttack: -3,        // Reduced from -5
          magicalAttack: -3
        },
        statGain: {                  
          physicalAttack: 2,         // Reduced from 3
          magicalAttack: 2
        },
        duration: 2
      };
      
    case 'Charge':
      // BALANCED: Charged attack spell
      return {
        prepareEffect: {
          name: 'Charging Spell',
          turns: 1,
          damage: 35 * magicPower,    // Reduced from 50
          areaEffect: true,
          stunChance: 0.2             // Reduced from 0.3
        },
        chargeBonus: 5 * magicPower, // Reduced from 10
        duration: 1
      };
      
    // Default case - use the base effect
    default:
      return {
        ...baseEffect,
        damage: (baseEffect.damage || 0) * 1.2, // Reduced from 1.3
        healing: (baseEffect.healing || 0) * 1.2, // Reduced from 1.3
        statChanges: baseEffect.statChanges ? 
          Object.entries(baseEffect.statChanges).reduce((acc, [stat, value]) => {
            acc[stat] = Math.round(value * 1.15); // Reduced from 1.25
            return acc;
          }, {}) : undefined
      };
  }
};

// Calculate effect power based on multiple factors
export const calculateEffectPower = (item, casterStats, difficulty = 'medium') => {
  let powerMultiplier = 1.0;
  
  // Difficulty scaling (reduced impact)
  switch (difficulty) {
    case 'easy': powerMultiplier *= 0.9; break;
    case 'medium': powerMultiplier *= 1.0; break;
    case 'hard': powerMultiplier *= 1.1; break;    // Reduced from 1.2
    case 'expert': powerMultiplier *= 1.2; break;  // Reduced from 1.4
  }
  
  // Caster stats scaling (for spells)
  if (casterStats && item.spell_type) {
    const relevantStat = casterStats[item.spell_type] || 5;
    powerMultiplier *= (1 + (relevantStat - 5) * 0.05); // Reduced from 0.1
  }
  
  // Item rarity scaling (reduced impact)
  if (item.rarity) {
    switch (item.rarity) {
      case 'Legendary': powerMultiplier *= 1.3; break; // Reduced from 1.5
      case 'Epic': powerMultiplier *= 1.2; break;      // Reduced from 1.3
      case 'Rare': powerMultiplier *= 1.1; break;
    }
  }
  
  return powerMultiplier;
};

// Get contextual effect description
export const getEffectDescription = (item, effectPower = 1.0) => {
  const effect = item.tool_effect || item.spell_effect;
  const type = item.tool_type || item.spell_type;
  const isSpell = !!item.spell_type;
  
  const powerLevel = effectPower >= 1.3 ? 'powerful' :
                    effectPower >= 1.1 ? 'effective' :
                    effectPower >= 1.0 ? 'standard' : 'weak';
  
  switch (effect) {
    case 'Surge':
      return isSpell ? 
        `Unleashes a ${powerLevel} burst of ${type} energy, dealing immediate damage.` :
        `Provides a ${powerLevel} but short-lived boost to ${type} capabilities.`;
        
    case 'Shield':
      return isSpell ?
        `Creates a ${powerLevel} magical barrier that absorbs damage and heals.` :
        `Grants ${powerLevel} defensive protection and resilience.`;
        
    case 'Echo':
      return isSpell ?
        `Applies ${powerLevel} effects that repeat over multiple turns.` :
        `Creates a ${powerLevel} repeating effect with extended duration.`;
        
    case 'Drain':
      return isSpell ?
        `Steals life force from the target with ${powerLevel} efficiency.` :
        `Converts defensive power to offense in a ${powerLevel} way.`;
        
    case 'Charge':
      return isSpell ?
        `Requires preparation but delivers a ${powerLevel} delayed effect.` :
        `Builds up power over time for a ${powerLevel} payoff.`;
        
    default:
      return isSpell ?
        `A ${powerLevel} magical effect affecting ${type}.` :
        `Enhances ${type} attributes in a ${powerLevel} way.`;
  }
};

// Calculate combo effects when multiple items are used
export const calculateComboEffect = (effects) => {
  if (!effects || effects.length < 2) return null;
  
  const comboBonus = {
    statChanges: {},
    damage: 0,
    healing: 0,
    duration: 0
  };
  
  // Synergy bonuses for combining effects (reduced values)
  const synergyPairs = [
    ['Surge', 'Drain'],   // Damage + Life steal
    ['Shield', 'Echo'],   // Defense + Duration
    ['Charge', 'Surge'],  // Buildup + Burst
    ['Drain', 'Echo'],    // Sustained drain
    ['Shield', 'Charge']  // Protected buildup
  ];
  
  effects.forEach((effect, index) => {
    effects.slice(index + 1).forEach(otherEffect => {
      const pair = [effect.name, otherEffect.name];
      const reversePair = [otherEffect.name, effect.name];
      
      if (synergyPairs.some(synergyPair => 
        (synergyPair[0] === pair[0] && synergyPair[1] === pair[1]) ||
        (synergyPair[0] === reversePair[0] && synergyPair[1] === reversePair[1])
      )) {
        // Add reduced synergy bonus
        comboBonus.damage += 5;      // Reduced from 10
        comboBonus.healing += 3;     // Reduced from 5
        comboBonus.duration += 1;
        
        // Add stat synergies
        Object.keys(effect.statChanges || {}).forEach(stat => {
          comboBonus.statChanges[stat] = (comboBonus.statChanges[stat] || 0) + 1; // Reduced from 2
        });
      }
    });
  });
  
  return Object.keys(comboBonus.statChanges).length > 0 || 
         comboBonus.damage > 0 || 
         comboBonus.healing > 0 ? comboBonus : null;
};

// Process timed effects (for effects that change over time)
export const processTimedEffect = (effect, currentTurn, startTurn) => {
  const turnsPassed = currentTurn - startTurn;
  
  if (effect.chargeEffect) {
    // Charge effects get stronger over time (reduced scaling)
    const chargeMultiplier = 1 + (turnsPassed * 0.15); // Reduced from 0.2
    return {
      ...effect,
      statChanges: Object.entries(effect.statChanges || {}).reduce((acc, [stat, value]) => {
        acc[stat] = Math.round(value * chargeMultiplier);
        return acc;
      }, {}),
      damage: (effect.damage || 0) * chargeMultiplier,
      healing: (effect.healing || 0) * chargeMultiplier
    };
  }
  
  if (effect.echoEffect) {
    // Echo effects have variable intensity
    const echoIntensity = 0.8 + Math.sin(turnsPassed * Math.PI / 3) * 0.3; // Reduced from 0.4
    return {
      ...effect,
      healthOverTime: Math.round((effect.healthOverTime || 0) * echoIntensity)
    };
  }
  
  return effect;
};

// Get visual effect data for UI animations
export const getVisualEffectData = (effect) => {
  const effectName = effect.tool_effect || effect.spell_effect || 'default';
  
  const visualEffects = {
    'Surge': {
      color: '#FFD700',
      animation: 'pulse-gold',
      particles: 'lightning',
      duration: 600,
      intensity: 'high'
    },
    'Shield': {
      color: '#4FC3F7',
      animation: 'shield-glow',
      particles: 'sparkles',
      duration: 1000,
      intensity: 'medium'
    },
    'Echo': {
      color: '#E1BEE7',
      animation: 'wave-ripple',
      particles: 'rings',
      duration: 1500,
      intensity: 'low'
    },
    'Drain': {
      color: '#F44336',
      animation: 'drain-spiral',
      particles: 'smoke',
      duration: 1200,
      intensity: 'high'
    },
    'Charge': {
      color: '#FF9800',
      animation: 'charge-buildup',
      particles: 'energy',
      duration: 2000,
      intensity: 'building'
    }
  };
  
  return visualEffects[effectName] || {
    color: '#FFFFFF',
    animation: 'fade',
    particles: 'none',
    duration: 500,
    intensity: 'low'
  };
};

// NEW: Calculate item efficiency score for AI
export const calculateItemEfficiency = (item, target, gameState) => {
  let efficiency = 0;
  
  // Base efficiency from rarity
  const rarityScores = { 'Legendary': 40, 'Epic': 30, 'Rare': 20, 'Common': 10 };
  efficiency += rarityScores[item.rarity] || 10;
  
  // Context-based efficiency
  if (item.tool_effect === 'Shield' || item.spell_effect === 'Shield') {
    // Shield is more efficient on low-health targets
    const healthPercent = target.currentHealth / (target.battleStats?.maxHealth || 50);
    efficiency += (1 - healthPercent) * 50;
  } else if (item.tool_effect === 'Surge' || item.spell_effect === 'Surge') {
    // Surge is more efficient when about to attack
    if (gameState.plannedActions?.includes('attack')) {
      efficiency += 30;
    }
  } else if (item.tool_effect === 'Drain' || item.spell_effect === 'Drain') {
    // Drain is efficient when both dealing and taking damage
    if (target.currentHealth < target.battleStats?.maxHealth * 0.7) {
      efficiency += 25;
    }
  }
  
  // Cost efficiency (tools are free, spells cost energy)
  if (item.spell_type) {
    efficiency -= 10; // Spells have an energy cost penalty
  }
  
  return efficiency;
};

// NEW: Get recommended item usage
export const getRecommendedItemUsage = (availableItems, creatures, gameState) => {
  const recommendations = [];
  
  availableItems.forEach(item => {
    creatures.forEach(creature => {
      const efficiency = calculateItemEfficiency(item, creature, gameState);
      
      if (efficiency > 30) { // Threshold for recommendation
        recommendations.push({
          item: item,
          target: creature,
          efficiency: efficiency,
          reason: getRecommendationReason(item, creature, efficiency)
        });
      }
    });
  });
  
  // Sort by efficiency
  recommendations.sort((a, b) => b.efficiency - a.efficiency);
  
  return recommendations.slice(0, 3); // Return top 3 recommendations
};

// Get recommendation reason
const getRecommendationReason = (item, creature, efficiency) => {
  const effect = item.tool_effect || item.spell_effect;
  
  if (effect === 'Shield' && creature.currentHealth < creature.battleStats?.maxHealth * 0.5) {
    return `${creature.species_name} is low on health and needs protection`;
  } else if (effect === 'Surge' && efficiency > 50) {
    return `Boost ${creature.species_name}'s attack for maximum damage`;
  } else if (effect === 'Echo') {
    return `Apply lasting effects to ${creature.species_name}`;
  } else if (effect === 'Drain') {
    return `Convert ${creature.species_name}'s defense to offense`;
  } else if (effect === 'Charge') {
    return `Build up ${creature.species_name}'s power for later`;
  }
  
  return `Use on ${creature.species_name} for strategic advantage`;
};

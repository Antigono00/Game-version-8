// src/utils/battleCore.js - ENHANCED WITH BALANCED MECHANICS AND ITEM INTEGRATION
import { getToolEffect, getSpellEffect, calculateEffectPower } from './itemEffects';
import { calculateDamage, calculateDerivedStats, getRarityMultiplier, getFormMultiplier } from './battleCalculations';

// BALANCED: Get maximum energy with reasonable scaling
const getMaxEnergy = (creatures, difficulty = 'medium') => {
  let baseEnergy = 15; // Reduced from 20
  
  // Difficulty-based energy scaling
  switch (difficulty) {
    case 'easy': baseEnergy = 12; break;
    case 'medium': baseEnergy = 15; break;
    case 'hard': baseEnergy = 18; break;
    case 'expert': baseEnergy = 20; break;
  }
  
  // Reduced energy bonus from creature count
  const creatureBonus = Math.floor(creatures.length * 0.25); // Reduced from 0.5
  
  return baseEnergy + creatureBonus;
};

// Helper function to recalculate stats after modifications
const recalculateDerivedStats = (creature) => {
  // Validate input
  if (!creature || !creature.stats) {
    console.error("Cannot recalculate stats for invalid creature:", creature);
    return creature.battleStats || {};
  }

  // Use the same calculation logic as the initial stat calculation
  const freshDerivedStats = calculateDerivedStats(creature);
  
  // Apply any active temporary modifications from effects
  const modifiedStats = { ...freshDerivedStats };
  
  if (creature.activeEffects && Array.isArray(creature.activeEffects)) {
    creature.activeEffects.forEach(effect => {
      if (effect && effect.statEffect) {
        Object.entries(effect.statEffect).forEach(([stat, value]) => {
          if (modifiedStats[stat] !== undefined) {
            modifiedStats[stat] += value;
            // Ensure stats don't go below reasonable minimums
            if (stat.includes('Attack') || stat.includes('Defense')) {
              modifiedStats[stat] = Math.max(1, modifiedStats[stat]);
            } else if (stat === 'maxHealth') {
              modifiedStats[stat] = Math.max(10, modifiedStats[stat]);
            } else if (stat === 'initiative' || stat.includes('Chance')) {
              modifiedStats[stat] = Math.max(0, modifiedStats[stat]);
            }
          }
        });
      }
    });
  }
  
  // Apply any permanent stat modifications from items, combinations, etc.
  if (creature.permanentModifications) {
    Object.entries(creature.permanentModifications).forEach(([stat, value]) => {
      if (modifiedStats[stat] !== undefined) {
        modifiedStats[stat] += value;
      }
    });
  }
  
  // Apply combination bonuses if present
  if (creature.combination_level && creature.combination_level > 0) {
    const combinationMultiplier = 1 + (creature.combination_level * 0.08); // Reduced from 0.1
    
    // Apply combination bonus to all stats
    Object.keys(modifiedStats).forEach(stat => {
      if (typeof modifiedStats[stat] === 'number' && !stat.includes('Chance') && stat !== 'energyCost') {
        modifiedStats[stat] = Math.round(modifiedStats[stat] * combinationMultiplier);
      }
    });
  }
  
  // Ensure health doesn't exceed max health after recalculation
  if (creature.currentHealth && creature.currentHealth > modifiedStats.maxHealth) {
    creature.currentHealth = modifiedStats.maxHealth;
  }
  
  return modifiedStats;
};

// Get description for effect types
const getEffectDescription = (effectType, powerLevel = 'normal') => {
  const descriptions = {
    'Surge': {
      'weak': 'Minor surge of power',
      'normal': 'Surge of enhanced abilities',
      'strong': 'Powerful surge of overwhelming might',
      'maximum': 'Ultimate surge of devastating power'
    },
    'Shield': {
      'weak': 'Basic protective barrier',
      'normal': 'Solid defensive enhancement',
      'strong': 'Powerful defensive fortress',
      'maximum': 'Impenetrable defensive barrier'
    },
    'Echo': {
      'weak': 'Faint repeating effect',
      'normal': 'Resonating enhancement',
      'strong': 'Powerful echoing phenomenon',
      'maximum': 'Overwhelming echo cascade'
    },
    'Drain': {
      'weak': 'Minor energy drain',
      'normal': 'Life force absorption',
      'strong': 'Powerful vampiric drain',
      'maximum': 'Devastating soul drain'
    },
    'Charge': {
      'weak': 'Slow power buildup',
      'normal': 'Steady power accumulation',
      'strong': 'Rapid power concentration',
      'maximum': 'Explosive power convergence'
    }
  };
  
  return descriptions[effectType]?.[powerLevel] || `${effectType.toLowerCase()} effect`;
};

// BALANCED: Process a full turn of battle
export const processTurn = (gameState, difficulty = 'medium') => {
  const newState = {...gameState};
  
  // Energy regeneration with balanced scaling
  const maxPlayerEnergy = getMaxEnergy(newState.playerField, difficulty);
  const maxEnemyEnergy = getMaxEnergy(newState.enemyField, difficulty);
  
  newState.playerEnergy = Math.min(
    newState.playerEnergy + calculateEnergyRegen(newState.playerField, difficulty),
    maxPlayerEnergy
  );
  
  newState.enemyEnergy = Math.min(
    newState.enemyEnergy + calculateEnergyRegen(newState.enemyField, difficulty),
    maxEnemyEnergy
  );
  
  // Apply ongoing effects
  newState.playerField = applyOngoingEffects(newState.playerField, difficulty);
  newState.enemyField = applyOngoingEffects(newState.enemyField, difficulty);
  
  // Remove defeated creatures with death effects
  newState.playerField = processDefeatedCreatures(newState.playerField, newState.enemyField);
  newState.enemyField = processDefeatedCreatures(newState.enemyField, newState.playerField);
  
  // Process draw phase with balanced hand limits
  const maxHandSize = getMaxHandSize(difficulty);
  
  if (newState.playerHand.length < maxHandSize && newState.playerDeck.length > 0) {
    const drawnCard = newState.playerDeck[0];
    newState.playerHand.push(drawnCard);
    newState.playerDeck = newState.playerDeck.slice(1);
  }
  
  if (newState.enemyHand.length < maxHandSize && newState.enemyDeck.length > 0) {
    const drawnCard = newState.enemyDeck[0];
    newState.enemyHand.push(drawnCard);
    newState.enemyDeck = newState.enemyDeck.slice(1);
  }
  
  return newState;
};

// BALANCED: Calculate energy regeneration
export const calculateEnergyRegen = (creatures, difficulty = 'medium') => {
  let baseRegen = 3;
  
  // Difficulty-based base regen
  switch (difficulty) {
    case 'easy': baseRegen = 2; break;
    case 'medium': baseRegen = 3; break;
    case 'hard': baseRegen = 4; break;
    case 'expert': baseRegen = 5; break;
  }
  
  // Energy contributions from creatures (reduced scaling)
  const energyContribution = creatures.reduce((total, creature) => {
    if (!creature.stats || !creature.stats.energy) return total;
    
    // Base energy contribution
    let contribution = creature.stats.energy * 0.1; // Reduced from 0.3
    
    // Rarity bonuses (reduced)
    switch (creature.rarity) {
      case 'Legendary': contribution *= 1.3; break;
      case 'Epic': contribution *= 1.2; break;
      case 'Rare': contribution *= 1.1; break;
    }
    
    // Form bonuses
    contribution *= (1 + (creature.form || 0) * 0.05);
    
    return total + contribution;
  }, 0);
  
  // Specialty stat bonuses (reduced)
  const specialtyBonus = creatures.reduce((total, creature) => {
    if (creature.specialty_stats && creature.specialty_stats.includes('energy')) {
      return total + 0.5; // Reduced from 1
    }
    return total;
  }, 0);
  
  return Math.round(baseRegen + energyContribution + specialtyBonus);
};

// Get max hand size based on difficulty
export const getMaxHandSize = (difficulty) => {
  switch (difficulty) {
    case 'easy': return 5;
    case 'medium': return 4;
    case 'hard': return 3;
    case 'expert': return 3;
    default: return 4;
  }
};

// Apply creature effects
export const applyOngoingEffects = (creatures, difficulty = 'medium') => {
  if (!creatures || !Array.isArray(creatures)) {
    console.error("Invalid creatures array:", creatures);
    return [];
  }

  return creatures.map(creature => {
    // Skip creatures with missing properties
    if (!creature || !creature.battleStats) return creature;
    
    const updatedCreature = {...creature};
    let statsModified = false;
    
    // Process active effects
    updatedCreature.activeEffects = (updatedCreature.activeEffects || [])
      .map(effect => {
        // Skip effects with missing data
        if (!effect) return null;
        
        // Apply stat effects with balanced scaling
        if (effect.statEffect) {
          Object.entries(effect.statEffect).forEach(([stat, value]) => {
            if (updatedCreature.battleStats[stat] !== undefined) {
              // Scale effect value by difficulty (reduced scaling)
              let scaledValue = value;
              switch (difficulty) {
                case 'hard': scaledValue = Math.round(value * 1.1); break;
                case 'expert': scaledValue = Math.round(value * 1.2); break;
              }
              
              updatedCreature.battleStats[stat] += scaledValue;
              statsModified = true;
            }
          });
        }
        
        // Health effects with balanced scaling
        if (effect.healthEffect) {
          let healthChange = effect.healthEffect;
          
          // Scale health effects by difficulty
          switch (difficulty) {
            case 'hard': healthChange = Math.round(healthChange * 1.15); break;
            case 'expert': healthChange = Math.round(healthChange * 1.25); break;
          }
          
          // Rarity scaling (reduced)
          switch (updatedCreature.rarity) {
            case 'Legendary': healthChange = Math.round(healthChange * 1.2); break;
            case 'Epic': healthChange = Math.round(healthChange * 1.15); break;
            case 'Rare': healthChange = Math.round(healthChange * 1.1); break;
          }
          
          const previousHealth = updatedCreature.currentHealth;
          updatedCreature.currentHealth = Math.min(
            updatedCreature.battleStats.maxHealth,
            Math.max(0, updatedCreature.currentHealth + healthChange)
          );
          
          // Log significant health changes
          const actualChange = updatedCreature.currentHealth - previousHealth;
          if (Math.abs(actualChange) >= 5) {
            console.log(`${updatedCreature.species_name} ${actualChange > 0 ? 'healed' : 'damaged'} for ${Math.abs(actualChange)} (${effect.name})`);
          }
        }
        
        // Process special effect types
        if (effect.type === 'charge' && effect.chargeEffect) {
          // Charge effects get stronger over time
          const remainingTurns = effect.duration;
          const totalTurns = effect.chargeEffect.maxTurns || 3;
          const chargeProgress = (totalTurns - remainingTurns) / totalTurns;
          
          if (chargeProgress >= 1.0 && effect.chargeEffect.finalBurst) {
            // Apply final burst effect
            const burstDamage = effect.chargeEffect.finalBurst;
            updatedCreature.nextAttackBonus = (updatedCreature.nextAttackBonus || 0) + burstDamage;
            console.log(`${updatedCreature.species_name} charged effect ready! Next attack gains ${burstDamage} damage.`);
          }
        }
        
        // Reduce duration
        return {
          ...effect,
          duration: effect.duration - 1
        };
      })
      .filter(effect => effect && effect.duration > 0); // Remove expired or invalid effects
    
    // If stats were modified, recalculate derived stats
    if (statsModified) {
      updatedCreature.battleStats = recalculateDerivedStats(updatedCreature);
    }
    
    // Process special creature states
    if (updatedCreature.isDefending) {
      // Defending creatures get reduced bonuses
      if (difficulty === 'hard' || difficulty === 'expert') {
        updatedCreature.battleStats.physicalDefense += 1; // Reduced from 2
        updatedCreature.battleStats.magicalDefense += 1;  // Reduced from 2
      }
    }
    
    return updatedCreature;
  });
};

// Process defeated creatures and apply death effects
const processDefeatedCreatures = (creatures, opposingCreatures = []) => {
  const survivingCreatures = [];
  
  creatures.forEach(creature => {
    if (creature.currentHealth > 0) {
      survivingCreatures.push(creature);
    } else {
      // Apply balanced death effects based on creature properties
      if (creature.rarity === 'Legendary') {
        console.log(`${creature.species_name} (Legendary) was defeated! Their sacrifice empowers allies!`);
        // Death rattle effect - empower remaining creatures (reduced)
        survivingCreatures.forEach(ally => {
          ally.battleStats.physicalAttack += 2; // Reduced from 3
          ally.battleStats.magicalAttack += 2;  // Reduced from 3
          
          // Add a temporary effect to track this bonus
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: `${creature.species_name}'s Final Gift`,
            icon: '👑',
            type: 'legendary_blessing',
            description: 'Empowered by a fallen legendary creature',
            duration: 5, // Reduced from 999 - now temporary
            statEffect: {
              physicalAttack: 2,
              magicalAttack: 2
            }
          });
        });
      } else if (creature.specialty_stats && creature.specialty_stats.includes('energy')) {
        console.log(`Energy specialist ${creature.species_name} was defeated! Releasing stored energy!`);
        // Energy burst - restore energy to allies
        survivingCreatures.forEach(ally => {
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: 'Energy Release',
            icon: '⚡',
            type: 'energy_burst',
            description: 'Energized by released power',
            duration: 2, // Reduced from 3
            statEffect: {
              energyCost: -1
            }
          });
        });
      } else if (creature.rarity === 'Epic') {
        console.log(`Epic creature ${creature.species_name} was defeated! Their essence lingers!`);
        // Epic death effect - minor stat boost to allies
        survivingCreatures.forEach(ally => {
          if (!ally.activeEffects) ally.activeEffects = [];
          ally.activeEffects.push({
            id: Date.now() + Math.random(),
            name: 'Epic Essence',
            icon: '💜',
            type: 'epic_blessing',
            description: 'Blessed by epic essence',
            duration: 3, // Reduced from 5
            statEffect: {
              physicalAttack: 1,
              magicalAttack: 1
            }
          });
        });
      }
      
      // NEW: Revenge mechanic - opposing creatures get minor penalty when defeating strong creatures
      if (creature.rarity === 'Legendary' || creature.rarity === 'Epic') {
        opposingCreatures.forEach(enemy => {
          if (!enemy.activeEffects) enemy.activeEffects = [];
          enemy.activeEffects.push({
            id: Date.now() + Math.random(),
            name: 'Guilty Conscience',
            icon: '😰',
            type: 'debuff',
            description: 'Shaken by defeating a powerful foe',
            duration: 2,
            statEffect: {
              initiative: -2,
              dodgeChance: -1
            }
          });
        });
      }
    }
  });
  
  return survivingCreatures;
};

// Process attack action with balanced mechanics
export const processAttack = (attacker, defender, attackType = 'auto') => {
  // Validate input
  if (!attacker || !defender || !attacker.battleStats || !defender.battleStats) {
    return {
      updatedAttacker: attacker,
      updatedDefender: defender,
      battleLog: "Invalid attack - missing stats",
      damageResult: { damage: 0, isDodged: false, isCritical: false, effectiveness: 'normal' }
    };
  }
  
  // Clone creatures to avoid mutating original objects
  const attackerClone = JSON.parse(JSON.stringify(attacker));
  const defenderClone = JSON.parse(JSON.stringify(defender));
  
  // Determine attack type if set to auto
  if (attackType === 'auto') {
    attackType = attackerClone.battleStats.physicalAttack >= attackerClone.battleStats.magicalAttack 
      ? 'physical' 
      : 'magical';
  }
  
  // Apply charge bonuses if available
  if (attackerClone.nextAttackBonus) {
    if (attackType === 'physical') {
      attackerClone.battleStats.physicalAttack += attackerClone.nextAttackBonus;
    } else {
      attackerClone.battleStats.magicalAttack += attackerClone.nextAttackBonus;
    }
    // Consume the bonus
    delete attackerClone.nextAttackBonus;
    console.log(`${attackerClone.species_name} unleashes charged attack!`);
  }
  
  // Calculate damage with balanced system
  const damageResult = calculateDamage(attackerClone, defenderClone, attackType);
  
  // Apply damage with additional effects
  if (!damageResult.isDodged) {
    // Base damage
    defenderClone.currentHealth = Math.max(0, defenderClone.currentHealth - damageResult.damage);
    
    // Critical hit effects (reduced impact)
    if (damageResult.isCritical) {
      // Critical hits may apply additional effects
      if (Math.random() < 0.2) { // Reduced from 0.3
        const bonusEffect = {
          id: Date.now(),
          name: 'Critical Strike Trauma',
          icon: '💥',
          type: 'debuff',
          description: 'Suffering from critical strike',
          duration: 1, // Reduced from 2
          statEffect: {
            physicalDefense: -2, // Reduced from -3
            magicalDefense: -2   // Reduced from -3
          }
        };
        
        defenderClone.activeEffects = [...(defenderClone.activeEffects || []), bonusEffect];
      }
    }
    
    // Effectiveness bonuses (reduced)
    if (damageResult.effectiveness === 'very effective' || damageResult.effectiveness === 'effective') {
      // Effective attacks may cause additional effects
      if (Math.random() < 0.25) { // Reduced from 0.4
        const statusEffect = {
          id: Date.now() + 1,
          name: 'Elemental Weakness',
          icon: '⚡',
          type: 'debuff',
          description: 'Vulnerable to attacks',
          duration: 2, // Reduced from 3
          statEffect: {
            physicalDefense: -1, // Reduced from -2
            magicalDefense: -1   // Reduced from -2
          }
        };
        
        defenderClone.activeEffects = [...(defenderClone.activeEffects || []), statusEffect];
      }
    }
  }
  
  // Create detailed battle log entry
  let logMessage = '';
  
  if (damageResult.isDodged) {
    logMessage = `${attackerClone.species_name}'s ${attackType} attack was dodged by ${defenderClone.species_name}!`;
  } else {
    logMessage = `${attackerClone.species_name} used ${attackType} attack on ${defenderClone.species_name}`;
    
    if (damageResult.isCritical) {
      logMessage += ' (Critical Hit!)';
    }
    
    if (damageResult.effectiveness !== 'normal') {
      logMessage += ` - ${damageResult.effectiveness}!`;
    }
    
    if (damageResult.damageType && damageResult.damageType !== 'normal') {
      logMessage += ` [${damageResult.damageType}]`;
    }
    
    logMessage += ` dealing ${damageResult.damage} damage.`;
    
    // Death message
    if (defenderClone.currentHealth <= 0) {
      if (defenderClone.rarity === 'Legendary') {
        logMessage += ` ${defenderClone.species_name} falls in battle!`;
      } else if (defenderClone.rarity === 'Epic') {
        logMessage += ` ${defenderClone.species_name} has been defeated!`;
      } else {
        logMessage += ` ${defenderClone.species_name} was defeated!`;
      }
    } else if (defenderClone.currentHealth < defenderClone.battleStats.maxHealth * 0.2) {
      logMessage += ` ${defenderClone.species_name} is critically wounded!`;
    } else if (defenderClone.currentHealth < defenderClone.battleStats.maxHealth * 0.5) {
      logMessage += ` ${defenderClone.species_name} is wounded!`;
    }
  }
  
  return {
    updatedAttacker: attackerClone,
    updatedDefender: defenderClone,
    battleLog: logMessage,
    damageResult
  };
};

// Apply tool effect with balanced scaling
export const applyTool = (creature, tool, difficulty = 'medium') => {
  // Validate input
  if (!creature || !tool) {
    console.error("Tool application failed - missing creature or tool:", { creature, tool });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  if (!creature.battleStats) {
    console.error("Tool application failed - creature missing battleStats:", creature);
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Make a deep copy of the creature to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // Get tool effect with balanced power scaling
  const basePowerMultiplier = calculateEffectPower(tool, creature.stats, difficulty);
  const toolEffect = getToolEffect(tool);
  
  if (!toolEffect) {
    console.error("Tool application failed - invalid tool effect:", { tool, toolEffect });
    return {
      updatedCreature: creature,
      toolEffect: null
    };
  }
  
  // Scale effects by power multiplier (with caps)
  const scaledToolEffect = {
    ...toolEffect,
    statChanges: toolEffect.statChanges ? 
      Object.entries(toolEffect.statChanges).reduce((acc, [stat, value]) => {
        // Cap stat changes to prevent extreme values
        const cappedValue = Math.min(Math.abs(value), 10) * Math.sign(value);
        acc[stat] = Math.round(cappedValue * Math.min(basePowerMultiplier, 1.5));
        return acc;
      }, {}) : {},
    healthChange: toolEffect.healthChange ? 
      Math.round(Math.min(toolEffect.healthChange * basePowerMultiplier, 50)) : 0, // Cap healing
    duration: toolEffect.duration || 1
  };
  
  // Apply stat changes with validation
  if (scaledToolEffect.statChanges && typeof scaledToolEffect.statChanges === 'object') {
    Object.entries(scaledToolEffect.statChanges).forEach(([stat, value]) => {
      if (creatureClone.battleStats[stat] !== undefined) {
        creatureClone.battleStats[stat] = Math.max(0, creatureClone.battleStats[stat] + value);
      }
    });
  }
  
  // Add active effect with better tracking
  if (scaledToolEffect.duration > 0) {
    const powerLevel = basePowerMultiplier >= 1.3 ? 'strong' :
                     basePowerMultiplier >= 1.1 ? 'normal' : 'weak';
    
    creatureClone.activeEffects = [
      ...(creatureClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: `${tool.name || "Tool"} Effect`,
        icon: getToolIcon(tool.tool_effect),
        type: tool.tool_type || "enhancement",
        description: getEffectDescription(tool.tool_effect || "enhancement", powerLevel),
        duration: scaledToolEffect.duration,
        statEffect: scaledToolEffect.statChanges || {},
        healthEffect: scaledToolEffect.healthOverTime || 0,
        powerLevel: powerLevel
      }
    ];
  }
  
  // Apply healing with scaling
  if (scaledToolEffect.healthChange && scaledToolEffect.healthChange > 0) {
    const oldHealth = creatureClone.currentHealth;
    creatureClone.currentHealth = Math.min(
      creatureClone.currentHealth + scaledToolEffect.healthChange,
      creatureClone.battleStats.maxHealth
    );
    
    const actualHealing = creatureClone.currentHealth - oldHealth;
    console.log(`${tool.name} healed ${creatureClone.species_name} for ${actualHealing} health`);
  }
  
  // Recalculate derived stats after tool application
  creatureClone.battleStats = recalculateDerivedStats(creatureClone);
  
  return {
    updatedCreature: creatureClone,
    toolEffect: scaledToolEffect
  };
};

// Apply spell effect with balanced power
export const applySpell = (caster, target, spell, difficulty = 'medium') => {
  // Validate input
  if (!caster || !target || !spell) {
    console.error("Spell application failed - missing parameters:", { caster, target, spell });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  if (!caster.stats || !target.battleStats) {
    console.error("Spell application failed - missing stats:", { 
      casterStats: caster.stats, 
      targetBattleStats: target.battleStats 
    });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // Deep clone to avoid mutations
  const targetClone = JSON.parse(JSON.stringify(target));
  const casterClone = JSON.parse(JSON.stringify(caster));
  
  // Get spell effect with balanced power scaling
  const casterMagic = caster.stats.magic || 5;
  const basePowerMultiplier = calculateEffectPower(spell, caster.stats, difficulty);
  const spellEffect = getSpellEffect(spell, casterMagic);
  
  if (!spellEffect) {
    console.error("Spell application failed - invalid spell effect:", { spell, spellEffect });
    return {
      updatedCaster: caster,
      updatedTarget: target,
      spellEffect: null
    };
  }
  
  // Scale spell effects by power multiplier (with caps)
  const scaledSpellEffect = {
    ...spellEffect,
    damage: spellEffect.damage ? 
      Math.round(Math.min(spellEffect.damage * basePowerMultiplier, 100)) : 0, // Cap damage
    healing: spellEffect.healing ? 
      Math.round(Math.min(spellEffect.healing * basePowerMultiplier, 80)) : 0, // Cap healing
    selfHeal: spellEffect.selfHeal ? 
      Math.round(Math.min(spellEffect.selfHeal * basePowerMultiplier, 40)) : 0, // Cap self heal
    statChanges: spellEffect.statChanges ? 
      Object.entries(spellEffect.statChanges).reduce((acc, [stat, value]) => {
        // Cap stat changes
        const cappedValue = Math.min(Math.abs(value), 12) * Math.sign(value);
        acc[stat] = Math.round(cappedValue * Math.min(basePowerMultiplier, 1.5));
        return acc;
      }, {}) : {}
  };
  
  // Apply direct damage with critical chance
  if (scaledSpellEffect.damage) {
    let finalDamage = scaledSpellEffect.damage;
    
    // Spell critical hits based on caster's magic (reduced chance)
    const critChance = Math.min(3 + Math.floor(casterMagic * 0.3), 15); // Reduced from 0.5
    const isCritical = Math.random() * 100 <= critChance;
    
    if (isCritical) {
      finalDamage = Math.round(finalDamage * 1.5); // Reduced from 1.8
      console.log(`${spell.name} critical hit! Damage increased to ${finalDamage}`);
    }
    
    // Apply armor piercing for high-level spells (reduced effectiveness)
    if (scaledSpellEffect.armorPiercing || basePowerMultiplier >= 1.3) {
      // Ignore 20% of target's defenses (reduced from 30%)
      const defenseMitigation = Math.round(finalDamage * 0.2);
      finalDamage += defenseMitigation;
      console.log(`Spell pierces armor for additional ${defenseMitigation} damage`);
    }
    
    console.log(`Applying spell damage: ${finalDamage} to ${targetClone.species_name}`);
    targetClone.currentHealth = Math.max(0, targetClone.currentHealth - finalDamage);
    
    // Update the effect with actual damage dealt
    scaledSpellEffect.actualDamage = finalDamage;
    scaledSpellEffect.wasCritical = isCritical;
  }
  
  // Apply healing effects
  if (scaledSpellEffect.healing && caster.id === target.id) {
    const oldHealth = targetClone.currentHealth;
    targetClone.currentHealth = Math.min(
      targetClone.currentHealth + scaledSpellEffect.healing,
      targetClone.battleStats.maxHealth
    );
    
    const actualHealing = targetClone.currentHealth - oldHealth;
    console.log(`${spell.name} healed ${targetClone.species_name} for ${actualHealing} health`);
  }
  
  // Apply self healing for drain spells
  if (scaledSpellEffect.selfHeal && caster.id !== target.id) {
    const oldCasterHealth = casterClone.currentHealth;
    casterClone.currentHealth = Math.min(
      casterClone.currentHealth + scaledSpellEffect.selfHeal,
      casterClone.battleStats.maxHealth
    );
    
    const actualSelfHeal = casterClone.currentHealth - oldCasterHealth;
    console.log(`${casterClone.species_name} drained ${actualSelfHeal} health from ${targetClone.species_name}`);
  }
  
  // Apply stat changes with duration tracking
  if (scaledSpellEffect.statChanges && Object.keys(scaledSpellEffect.statChanges).length > 0) {
    Object.entries(scaledSpellEffect.statChanges).forEach(([stat, value]) => {
      if (targetClone.battleStats[stat] !== undefined) {
        targetClone.battleStats[stat] = Math.max(0, targetClone.battleStats[stat] + value);
      }
    });
  }
  
  // Add active effect with detailed tracking
  if (scaledSpellEffect.duration > 0) {
    const powerLevel = basePowerMultiplier >= 1.3 ? 'strong' :
                     basePowerMultiplier >= 1.1 ? 'normal' : 'weak';
    
    targetClone.activeEffects = [
      ...(targetClone.activeEffects || []),
      {
        id: Date.now() + Math.random(),
        name: `${spell.name || "Spell"} Effect`,
        icon: getSpellIcon(spell.spell_effect),
        type: spell.spell_type || "magic",
        description: getEffectDescription(spell.spell_effect || "magic", powerLevel),
        duration: scaledSpellEffect.duration,
        statEffect: scaledSpellEffect.statChanges || {},
        healthEffect: scaledSpellEffect.healthOverTime || 0,
        casterMagic: casterMagic,
        powerLevel: powerLevel
      }
    ];
  }
  
  // Recalculate derived stats after spell effects
  if (Object.keys(scaledSpellEffect.statChanges || {}).length > 0) {
    targetClone.battleStats = recalculateDerivedStats(targetClone);
  }
  
  return {
    updatedCaster: casterClone,
    updatedTarget: targetClone,
    spellEffect: scaledSpellEffect
  };
};

// Put creature in defensive stance with balanced bonuses
export const defendCreature = (creature, difficulty = 'medium') => {
  // Validate input
  if (!creature || !creature.battleStats) {
    console.error("Defend action failed - missing creature or battleStats:", creature);
    return creature;
  }
  
  // Deep clone to avoid mutations
  const creatureClone = JSON.parse(JSON.stringify(creature));
  
  // Add defensive bonus with balanced scaling
  creatureClone.isDefending = true;
  
  // Calculate balanced defense boosts
  const baseDefenseBoost = difficulty === 'expert' ? 0.5 : 
                          difficulty === 'hard' ? 0.4 :
                          difficulty === 'medium' ? 0.3 : 0.25;
  
  const physicalDefenseBoost = Math.round(creatureClone.battleStats.physicalDefense * baseDefenseBoost);
  const magicalDefenseBoost = Math.round(creatureClone.battleStats.magicalDefense * baseDefenseBoost);
  
  // Rarity bonus (reduced)
  let rarityBonus = 0;
  switch (creatureClone.rarity) {
    case 'Legendary': rarityBonus = 3; break;
    case 'Epic': rarityBonus = 2; break;
    case 'Rare': rarityBonus = 1; break;
    default: rarityBonus = 0; break;
  }
  
  // Apply defense boost to battle stats
  creatureClone.battleStats = {
    ...creatureClone.battleStats,
    physicalDefense: creatureClone.battleStats.physicalDefense + physicalDefenseBoost + rarityBonus,
    magicalDefense: creatureClone.battleStats.magicalDefense + magicalDefenseBoost + rarityBonus
  };
  
  // Add defensive effect
  creatureClone.activeEffects = [
    ...(creatureClone.activeEffects || []),
    {
      id: Date.now(),
      name: 'Defensive Stance',
      icon: '🛡️',
      type: 'defense',
      description: `Defensive posture (+${physicalDefenseBoost + rarityBonus} defense)`,
      duration: 1,
      statEffect: {
        physicalDefense: physicalDefenseBoost + rarityBonus,
        magicalDefense: magicalDefenseBoost + rarityBonus
      },
      damageReduction: 0.05, // 5% damage reduction (reduced from 10%)
      counterAttackChance: difficulty === 'expert' ? 0.1 : 0.05 // Reduced counter chance
    }
  ];
  
  // Recalculate stats after defense bonuses
  creatureClone.battleStats = recalculateDerivedStats(creatureClone);
  
  return creatureClone;
};

// Helper function to get appropriate icon for tool effects
const getToolIcon = (toolEffect) => {
  const icons = {
    'Surge': '⚡',
    'Shield': '🛡️',
    'Echo': '🔊',
    'Drain': '🩸',
    'Charge': '🔋'
  };
  return icons[toolEffect] || '🔧';
};

// Helper function to get appropriate icon for spell effects
const getSpellIcon = (spellEffect) => {
  const icons = {
    'Surge': '💥',
    'Shield': '✨',
    'Echo': '🌊',
    'Drain': '🌙',
    'Charge': '☄️'
  };
  return icons[spellEffect] || '✨';
};

// NEW: Calculate combo damage bonus
export const calculateComboBonus = (consecutiveActions) => {
  if (consecutiveActions <= 1) return 1.0;
  
  // Balanced combo scaling - caps at 25% bonus
  const bonusPerAction = 0.05;
  const maxBonus = 0.25;
  
  return 1 + Math.min(consecutiveActions * bonusPerAction, maxBonus);
};

// NEW: Process energy momentum effects
export const processEnergyMomentum = (energySpent, currentMomentum) => {
  // Energy momentum provides bonus regen based on spending
  const momentumGain = Math.floor(energySpent / 5); // Gain 1 momentum per 5 energy spent
  const newMomentum = currentMomentum + momentumGain;
  
  // Calculate bonus regen from momentum
  const bonusRegen = Math.floor(newMomentum / 10); // 1 bonus regen per 10 momentum
  
  return {
    newMomentum: newMomentum,
    bonusRegen: bonusRegen
  };
};

// NEW: Check for field synergies
export const checkFieldSynergies = (creatures) => {
  const synergies = [];
  
  // Check for species synergies
  const speciesCount = {};
  creatures.forEach(creature => {
    const species = creature.species_id;
    speciesCount[species] = (speciesCount[species] || 0) + 1;
  });
  
  Object.entries(speciesCount).forEach(([species, count]) => {
    if (count >= 2) {
      synergies.push({
        type: 'species',
        species: species,
        count: count,
        bonus: count * 0.1 // 10% bonus per same species
      });
    }
  });
  
  // Check for stat synergies
  const statPairs = [
    ['strength', 'stamina'],
    ['magic', 'energy'],
    ['speed', 'strength']
  ];
  
  for (const [stat1, stat2] of statPairs) {
    const hasFirst = creatures.some(c => c.specialty_stats?.includes(stat1));
    const hasSecond = creatures.some(c => c.specialty_stats?.includes(stat2));
    
    if (hasFirst && hasSecond) {
      synergies.push({
        type: 'stats',
        stats: [stat1, stat2],
        bonus: 0.15 // 15% bonus for stat pairs
      });
    }
  }
  
  return synergies;
};

// src/utils/difficultySettings.js - BALANCED DIFFICULTY SYSTEM
import { 
  getRandomCreatureTemplate, 
  createEnemyCreature 
} from './enemyCreatures';

// ===== BALANCED DIFFICULTY SETTINGS =====
// Define settings for each difficulty level - PROPERLY SCALED
export const getDifficultySettings = (difficulty) => {
  const settings = {
    easy: {
      enemyStatsMultiplier: 0.9,     // Slightly weaker enemies
      enemyCreatureLevel: {
        min: 0, // Form 0 creatures
        max: 1  // Up to Form 1 creatures
      },
      enemyRarity: {
        common: 0.7,
        rare: 0.25,
        epic: 0.05,
        legendary: 0
      },
      initialHandSize: 2,
      enemyDeckSize: 4,
      maxFieldSize: 4,               // Balanced field size
      enemyAILevel: 1,
      enemyEnergyRegen: 2,
      rewardMultiplier: 0.5,
      multiActionChance: 0.2,        // 20% chance for multiple actions
      aggressionLevel: 0.3           // 30% aggression
    },
    
    medium: {
      enemyStatsMultiplier: 1.0,     // Equal strength
      enemyCreatureLevel: {
        min: 0, // Form 0-2 creatures
        max: 2
      },
      enemyRarity: {
        common: 0.5,
        rare: 0.35,
        epic: 0.15,
        legendary: 0
      },
      initialHandSize: 3,
      enemyDeckSize: 5,
      maxFieldSize: 5,
      enemyAILevel: 2,
      enemyEnergyRegen: 3,
      rewardMultiplier: 1.0,
      multiActionChance: 0.4,        // 40% chance for multiple actions
      aggressionLevel: 0.5           // 50% aggression
    },
    
    hard: {
      enemyStatsMultiplier: 1.2,     // 20% stronger
      enemyCreatureLevel: {
        min: 1, // Form 1-3 creatures
        max: 3
      },
      enemyRarity: {
        common: 0.2,
        rare: 0.4,
        epic: 0.3,
        legendary: 0.1
      },
      initialHandSize: 3,
      enemyDeckSize: 6,
      maxFieldSize: 5,
      enemyAILevel: 3,
      enemyEnergyRegen: 4,
      rewardMultiplier: 1.5,
      multiActionChance: 0.6,        // 60% chance for multiple actions
      aggressionLevel: 0.7           // 70% aggression
    },
    
    expert: {
      enemyStatsMultiplier: 1.5,     // 50% stronger
      enemyCreatureLevel: {
        min: 2, // Form 2-3 creatures
        max: 3
      },
      enemyRarity: {
        common: 0,
        rare: 0.3,
        epic: 0.5,
        legendary: 0.2
      },
      initialHandSize: 4,
      enemyDeckSize: 7,
      maxFieldSize: 6,
      enemyAILevel: 4,
      enemyEnergyRegen: 5,
      rewardMultiplier: 2.0,
      multiActionChance: 0.8,        // 80% chance for multiple actions
      aggressionLevel: 0.85          // 85% aggression
    }
  };
  
  return settings[difficulty] || settings.medium;
};

// ===== ENEMY CREATURE GENERATION =====
// Generate enemy creatures based on difficulty - BALANCED FOR FAIR GAMEPLAY
export const generateEnemyCreatures = (difficulty, count = 5, playerCreatures = []) => {
  const settings = getDifficultySettings(difficulty);
  
  // Use the deck size from settings
  const maxCreatureCount = settings.enemyDeckSize || 5;
  const adjustedCount = Math.min(count, maxCreatureCount);
  
  const creatures = [];

  // Create a pool of species templates from player creatures or use defaults
  const speciesPool = [];
  
  if (playerCreatures && playerCreatures.length > 0) {
    // Extract unique species from player creatures
    const playerSpeciesIds = new Set();
    
    playerCreatures.forEach(creature => {
      if (creature.species_id) {
        playerSpeciesIds.add(creature.species_id);
      }
    });
    
    // Convert to array
    Array.from(playerSpeciesIds).forEach(speciesId => {
      speciesPool.push(speciesId);
    });
  }
  
  // ===== BALANCED ENEMY GENERATION =====
  for (let i = 0; i < adjustedCount; i++) {
    // Generate a creature with appropriate rarity
    const rarity = selectRarity(settings.enemyRarity);
    
    // Generate form level within allowed range
    let form;
    if (difficulty === 'expert') {
      // Expert has higher chance for max form
      form = Math.random() < 0.6 ? settings.enemyCreatureLevel.max : 
             Math.floor(Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)) + settings.enemyCreatureLevel.min;
    } else if (difficulty === 'hard') {
      // Hard has balanced distribution
      form = Math.floor(
        Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)
      ) + settings.enemyCreatureLevel.min;
    } else {
      // Easy/Medium bias toward lower forms
      form = Math.random() < 0.7 ? settings.enemyCreatureLevel.min : 
             Math.floor(Math.random() * (settings.enemyCreatureLevel.max - settings.enemyCreatureLevel.min + 1)) + settings.enemyCreatureLevel.min;
    }
    
    // Select a species ID - either from player creatures or random
    let speciesId;
    if (speciesPool.length > 0) {
      speciesId = speciesPool[Math.floor(Math.random() * speciesPool.length)];
    } else {
      // Get a random template if we don't have player species
      const template = getRandomCreatureTemplate();
      speciesId = template.id;
    }
    
    // Generate stats aligned with balanced gameplay
    const stats = generateEnemyStats(rarity, form, settings.enemyStatsMultiplier);
    
    // Determine specialty stats
    let specialtyStats = [];
    
    // Based on the species, create appropriate specialty stats
    const statTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
    
    // Balanced specialty count
    const specialtyCount = (difficulty === 'hard' || difficulty === 'expert') ? 
      (Math.random() < 0.6 ? 2 : 1) : // 60% chance for 2 specialty stats on harder
      (Math.random() < 0.3 ? 2 : 1);  // 30% chance for 2 specialty stats on easier
    
    for (let j = 0; j < specialtyCount; j++) {
      // Select a random stat that's not already included
      const availableStats = statTypes.filter(stat => !specialtyStats.includes(stat));
      const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
      specialtyStats.push(randomStat);
    }
    
    // Create the enemy creature
    const creature = createEnemyCreature(speciesId, form, rarity, stats);
    
    // Add specialty stats to the creature
    creature.specialty_stats = specialtyStats;
    
    // Add any form-specific evolution boosts
    applyEvolutionBoosts(creature, form);
    
    // Add random stat upgrades to simulate player progression
    addRandomStatUpgrades(creature, form, difficulty);
    
    // Add combination bonuses on harder difficulties
    if ((difficulty === 'hard' || difficulty === 'expert') && Math.random() < 0.3) {
      const combinationLevel = Math.floor(Math.random() * 2) + 1; // 1-2 combination levels
      creature.combination_level = combinationLevel;
      applyCombinationBonuses(creature, combinationLevel);
    }
    
    creatures.push(creature);
  }
  
  return creatures;
};

// ===== ENEMY ITEMS GENERATION =====

/**
 * Generate enemy tools based on difficulty
 * @param {string} difficulty - The difficulty level
 * @param {number} count - Number of tools to generate
 * @returns {Array} Array of enemy tools
 */
export const generateEnemyTools = (difficulty, count = 2) => {
  const settings = getDifficultySettings(difficulty);
  const tools = [];
  
  // Tool types and effects
  const toolTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
  const toolEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
  
  // Rarity distribution based on difficulty
  const rarityDistribution = {
    easy: { Common: 0.8, Rare: 0.2, Epic: 0, Legendary: 0 },
    medium: { Common: 0.6, Rare: 0.3, Epic: 0.1, Legendary: 0 },
    hard: { Common: 0.4, Rare: 0.4, Epic: 0.15, Legendary: 0.05 },
    expert: { Common: 0.2, Rare: 0.4, Epic: 0.3, Legendary: 0.1 }
  };
  
  const distribution = rarityDistribution[difficulty] || rarityDistribution.medium;
  
  for (let i = 0; i < count; i++) {
    // Select random type and effect
    const toolType = toolTypes[Math.floor(Math.random() * toolTypes.length)];
    const toolEffect = toolEffects[Math.floor(Math.random() * toolEffects.length)];
    
    // Generate rarity
    const rarity = selectItemRarity(distribution);
    
    // Create tool object
    const tool = {
      id: `enemy_tool_${Date.now()}_${i}`,
      name: `${rarity} ${toolEffect} ${toolType.charAt(0).toUpperCase() + toolType.slice(1)} Tool`,
      tool_type: toolType,
      tool_effect: toolEffect,
      rarity: rarity,
      image_url: `/assets/tools/${toolType}_${toolEffect.toLowerCase()}.png`,
      description: generateToolDescription(toolType, toolEffect, rarity),
      power_level: calculateItemPowerLevel(rarity, difficulty),
      usage_cost: 0 // Tools are free
    };
    
    tools.push(tool);
  }
  
  return tools;
};

/**
 * Generate enemy spells based on difficulty
 * @param {string} difficulty - The difficulty level
 * @param {number} count - Number of spells to generate
 * @returns {Array} Array of enemy spells
 */
export const generateEnemySpells = (difficulty, count = 2) => {
  const settings = getDifficultySettings(difficulty);
  const spells = [];
  
  // Spell types and effects
  const spellTypes = ['energy', 'strength', 'magic', 'stamina', 'speed'];
  const spellEffects = ['Surge', 'Shield', 'Echo', 'Drain', 'Charge'];
  
  // Rarity distribution (spells are generally rarer than tools)
  const rarityDistribution = {
    easy: { Common: 0.7, Rare: 0.25, Epic: 0.05, Legendary: 0 },
    medium: { Common: 0.5, Rare: 0.35, Epic: 0.13, Legendary: 0.02 },
    hard: { Common: 0.3, Rare: 0.4, Epic: 0.25, Legendary: 0.05 },
    expert: { Common: 0.1, Rare: 0.3, Epic: 0.45, Legendary: 0.15 }
  };
  
  const distribution = rarityDistribution[difficulty] || rarityDistribution.medium;
  
  for (let i = 0; i < count; i++) {
    // Select random type and effect
    const spellType = spellTypes[Math.floor(Math.random() * spellTypes.length)];
    const spellEffect = spellEffects[Math.floor(Math.random() * spellEffects.length)];
    
    // Generate rarity
    const rarity = selectItemRarity(distribution);
    
    // Create spell object
    const spell = {
      id: `enemy_spell_${Date.now()}_${i}`,
      name: `${rarity} ${spellEffect} ${spellType.charAt(0).toUpperCase() + spellType.slice(1)} Spell`,
      spell_type: spellType,
      spell_effect: spellEffect,
      rarity: rarity,
      image_url: `/assets/spells/${spellType}_${spellEffect.toLowerCase()}.png`,
      description: generateSpellDescription(spellType, spellEffect, rarity),
      power_level: calculateItemPowerLevel(rarity, difficulty),
      mana_cost: 4 // Standard spell cost
    };
    
    spells.push(spell);
  }
  
  return spells;
};

/**
 * Generate a balanced set of enemy items (tools and spells)
 * @param {string} difficulty - The difficulty level
 * @returns {Object} Object containing tools and spells arrays
 */
export const generateEnemyItems = (difficulty) => {
  const settings = getDifficultySettings(difficulty);
  
  // Calculate item counts based on difficulty
  const itemCounts = {
    easy: { tools: 1, spells: 0 },     // Easy: Only basic tools
    medium: { tools: 2, spells: 1 },   // Medium: Tools + some spells
    hard: { tools: 2, spells: 2 },     // Hard: Balanced tools and spells
    expert: { tools: 3, spells: 3 }    // Expert: Many powerful items
  };
  
  const counts = itemCounts[difficulty] || itemCounts.medium;
  
  return {
    tools: generateEnemyTools(difficulty, counts.tools),
    spells: generateEnemySpells(difficulty, counts.spells)
  };
};

// ===== COMPREHENSIVE ENEMY GENERATION =====

/**
 * Generate complete enemy loadout (creatures + items)
 * @param {string} difficulty - The difficulty level
 * @param {number} creatureCount - Number of creatures to generate
 * @param {Array} playerCreatures - Player's creatures for adaptive generation
 * @returns {Object} Complete enemy loadout with creatures, tools, and spells
 */
export const generateCompleteEnemyLoadout = (difficulty, creatureCount, playerCreatures = []) => {
  const creatures = generateEnemyCreatures(difficulty, creatureCount, playerCreatures);
  const items = generateEnemyItems(difficulty);
  
  return {
    creatures,
    tools: items.tools,
    spells: items.spells,
    difficulty: difficulty,
    settings: getDifficultySettings(difficulty)
  };
};

// ===== PRIVATE HELPER FUNCTIONS =====

// Select rarity based on probability distribution (for creatures)
function selectRarity(rarityDistribution) {
  const rnd = Math.random();
  let cumulativeProbability = 0;
  
  for (const [rarity, probability] of Object.entries(rarityDistribution)) {
    cumulativeProbability += probability;
    if (rnd <= cumulativeProbability) {
      return rarity.charAt(0).toUpperCase() + rarity.slice(1); // Capitalize
    }
  }
  
  return 'Common'; // Fallback
}

/**
 * Select item rarity based on probability distribution (for items)
 * @private
 */
function selectItemRarity(distribution) {
  const random = Math.random();
  let cumulative = 0;
  
  for (const [rarity, probability] of Object.entries(distribution)) {
    cumulative += probability;
    if (random <= cumulative) {
      return rarity;
    }
  }
  
  return 'Common'; // Fallback
}

// Generate stats based on balanced scaling
function generateEnemyStats(rarity, form, statsMultiplier) {
  // Base stats based on rarity (per technical documentation)
  let baseStats;
  switch (rarity) {
    case 'Legendary':
      baseStats = { energy: 8, strength: 8, magic: 8, stamina: 8, speed: 8 };
      break;
    case 'Epic':
      baseStats = { energy: 7, strength: 7, magic: 7, stamina: 7, speed: 7 };
      break;
    case 'Rare':
      baseStats = { energy: 6, strength: 6, magic: 6, stamina: 6, speed: 6 };
      break;
    default: // Common
      baseStats = { energy: 5, strength: 5, magic: 5, stamina: 5, speed: 5 };
  }
  
  // Apply difficulty multiplier to make enemies appropriately challenging
  const stats = {};
  for (const [stat, value] of Object.entries(baseStats)) {
    // Apply the difficulty multiplier with some variance
    const variance = 0.9 + (Math.random() * 0.2); // ±10% variance
    stats[stat] = Math.round(value * statsMultiplier * variance);
    
    // Ensure stats don't go below 1 or above reasonable maximums
    stats[stat] = Math.max(1, Math.min(15, stats[stat]));
  }
  
  return stats;
}

// Apply evolution boosts to creature stats based on form
function applyEvolutionBoosts(creature, form) {
  if (!creature || !creature.stats) return;
  
  // No boosts for Form 0 (Egg)
  if (form === 0) return;
  
  const stats = creature.stats;
  
  // Form 1 boost: +1 to all stats
  if (form >= 1) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 1;
    });
  }
  
  // Form 2 boost: +1 to all stats and +1 to specialty stats
  if (form >= 2) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 1;
      
      // Add an extra boost to specialty stats
      if (creature.specialty_stats && creature.specialty_stats.includes(stat)) {
        stats[stat] += 1;
      }
    });
  }
  
  // Form 3 boost: +2 to all stats
  if (form >= 3) {
    Object.keys(stats).forEach(stat => {
      stats[stat] += 2;
    });
  }
}

// Add random stat upgrades to simulate player progression
function addRandomStatUpgrades(creature, form, difficulty) {
  if (!creature || !creature.stats) return;
  
  const stats = creature.stats;
  
  // Determine number of upgrades based on form and difficulty
  let totalUpgrades = form * 3; // Base upgrades per form
  
  // Add balanced upgrades for harder difficulties
  switch (difficulty) {
    case 'easy':
      totalUpgrades += 0;
      break;
    case 'medium':
      totalUpgrades += 2;
      break;
    case 'hard':
      totalUpgrades += 4;
      break;
    case 'expert':
      totalUpgrades += 6;
      break;
  }
  
  // Apply random upgrades with bias toward specialty stats
  for (let i = 0; i < totalUpgrades; i++) {
    let statToUpgrade;
    
    // 50% chance to upgrade a specialty stat if available
    if (creature.specialty_stats && creature.specialty_stats.length > 0 && Math.random() < 0.5) {
      statToUpgrade = creature.specialty_stats[Math.floor(Math.random() * creature.specialty_stats.length)];
    } else {
      // Select a random stat to upgrade
      const availableStats = Object.keys(stats);
      statToUpgrade = availableStats[Math.floor(Math.random() * availableStats.length)];
    }
    
    // Add upgrade points
    stats[statToUpgrade] += 1;
  }
}

// Apply combination bonuses for enhanced creatures
function applyCombinationBonuses(creature, combinationLevel) {
  if (!creature || !creature.stats || !creature.specialty_stats) return;
  
  const stats = creature.stats;
  
  // Each combination level adds bonuses to specialty stats
  creature.specialty_stats.forEach(stat => {
    if (stats[stat] !== undefined) {
      stats[stat] += combinationLevel; // +1 per combination level to specialty stats
    }
  });
  
  // Set the combination level on the creature
  creature.combination_level = combinationLevel;
}

/**
 * Calculate item power level based on rarity and difficulty
 * @private
 */
function calculateItemPowerLevel(rarity, difficulty) {
  let basePower = 1.0;
  
  // Rarity multipliers
  switch (rarity) {
    case 'Legendary': basePower = 1.6; break;
    case 'Epic': basePower = 1.4; break;
    case 'Rare': basePower = 1.2; break;
    case 'Common': basePower = 1.0; break;
  }
  
  // Difficulty multipliers
  const difficultyMultipliers = {
    easy: 0.9,
    medium: 1.0,
    hard: 1.1,
    expert: 1.2
  };
  
  return basePower * (difficultyMultipliers[difficulty] || 1.0);
}

/**
 * Generate tool description
 * @private
 */
function generateToolDescription(toolType, toolEffect, rarity) {
  const rarityAdjectives = {
    Common: 'basic',
    Rare: 'enhanced',
    Epic: 'powerful',
    Legendary: 'legendary'
  };
  
  const typeDescriptions = {
    energy: 'energy manipulation',
    strength: 'physical enhancement',
    magic: 'magical amplification',
    stamina: 'endurance boosting',
    speed: 'agility enhancement'
  };
  
  const effectDescriptions = {
    Surge: 'provides a powerful but temporary boost',
    Shield: 'offers protective enhancement',
    Echo: 'creates lasting effects over time',
    Drain: 'converts defensive power to offense',
    Charge: 'builds up power for devastating results'
  };
  
  const adjective = rarityAdjectives[rarity] || 'basic';
  const typeDesc = typeDescriptions[toolType] || 'enhancement';
  const effectDesc = effectDescriptions[toolEffect] || 'enhances abilities';
  
  return `A ${adjective} tool for ${typeDesc} that ${effectDesc}.`;
}

/**
 * Generate spell description
 * @private
 */
function generateSpellDescription(spellType, spellEffect, rarity) {
  const rarityAdjectives = {
    Common: 'minor',
    Rare: 'potent',
    Epic: 'powerful',
    Legendary: 'legendary'
  };
  
  const typeDescriptions = {
    energy: 'energy',
    strength: 'force',
    magic: 'arcane',
    stamina: 'vitality',
    speed: 'temporal'
  };
  
  const effectDescriptions = {
    Surge: 'unleashes immediate powerful effects',
    Shield: 'creates protective magical barriers',
    Echo: 'resonates with lasting magical effects',
    Drain: 'siphons life force and power',
    Charge: 'builds magical energy for explosive release'
  };
  
  const adjective = rarityAdjectives[rarity] || 'minor';
  const typeDesc = typeDescriptions[spellType] || 'magical';
  const effectDesc = effectDescriptions[spellEffect] || 'affects the target';
  
  return `A ${adjective} ${typeDesc} spell that ${effectDesc}.`;
}

// NEW: Get difficulty-specific battle tips
export const getDifficultyTips = (difficulty) => {
  const tips = {
    easy: [
      "Enemy creatures are slightly weaker than yours",
      "AI will make basic tactical decisions",
      "Good for learning game mechanics"
    ],
    medium: [
      "Enemy creatures match your power level",
      "AI uses strategic deployments and attacks",
      "Expect some tool usage from enemies"
    ],
    hard: [
      "Enemy creatures are 20% stronger",
      "AI makes optimal decisions most of the time",
      "Enemies use tools and spells effectively"
    ],
    expert: [
      "Enemy creatures are 50% stronger",
      "AI plays near-perfectly with multi-action turns",
      "Prepare for intense battles with powerful items"
    ]
  };
  
  return tips[difficulty] || tips.medium;
};

// NEW: Calculate difficulty rating for matchmaking
export const calculateDifficultyRating = (playerCreatures, difficulty) => {
  // Calculate average player power
  const playerPower = playerCreatures.reduce((total, creature) => {
    const statSum = Object.values(creature.stats || {}).reduce((sum, stat) => sum + stat, 0);
    const formBonus = (creature.form || 0) * 10;
    const rarityBonus = { 'Legendary': 20, 'Epic': 15, 'Rare': 10, 'Common': 5 }[creature.rarity] || 5;
    return total + statSum + formBonus + rarityBonus;
  }, 0) / Math.max(playerCreatures.length, 1);
  
  // Apply difficulty multiplier
  const difficultyMultipliers = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.3,
    expert: 1.7
  };
  
  const enemyPower = playerPower * (difficultyMultipliers[difficulty] || 1.0);
  
  return {
    playerRating: Math.round(playerPower),
    enemyRating: Math.round(enemyPower),
    balanced: Math.abs(playerPower - enemyPower) < playerPower * 0.2
  };
};

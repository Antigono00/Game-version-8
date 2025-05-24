// src/utils/battleAI.js - FIXED VERSION WITH ALL CORRECTIONS
import { getDifficultySettings } from './difficultySettings';

// Get max enemy field size based on difficulty
const getMaxEnemyFieldSize = (difficulty) => {
  const settings = getDifficultySettings(difficulty);
  return settings.maxFieldSize || 3;
};

// FIXED: Enhanced AI action determination with proper energy validation and unique creature instances
export const determineAIAction = (
  difficulty, 
  enemyHand, 
  enemyField, 
  playerField, 
  enemyTools = [], 
  enemySpells = [], 
  enemyEnergy = 10
) => {
  console.log(`AI Turn - Difficulty: ${difficulty}, Energy: ${enemyEnergy}, Hand: ${enemyHand.length}, Field: ${enemyField.length}`);
  console.log(`Available items - Tools: ${enemyTools.length}, Spells: ${enemySpells.length}`);
  
  // Get difficulty settings for advanced AI behavior
  const difficultySettings = getDifficultySettings(difficulty);
  const maxFieldSize = getMaxEnemyFieldSize(difficulty);
  
  // FIXED: Ensure we always return a valid action
  try {
    // Check if we have any valid actions available
    const hasCreaturesInHand = enemyHand.length > 0;
    const hasCreaturesOnField = enemyField.length > 0;
    const hasEnergyToAct = enemyEnergy > 0;
    
    // If we have no creatures anywhere and no energy, end turn
    if (!hasCreaturesInHand && !hasCreaturesOnField) {
      console.log("AI: No creatures available, ending turn");
      return { type: 'endTurn' };
    }
    
    // If we have no energy at all, end turn
    if (!hasEnergyToAct) {
      console.log("AI: No energy available, ending turn");
      return { type: 'endTurn' };
    }
    
    // Check if multi-action turn should be executed
    const shouldMultiAction = Math.random() < (difficultySettings.multiActionChance || 0.3);
    const hasEnergyForMultiple = enemyEnergy >= 4; // At least 2 actions worth
    
    // Multi-action planning system with item usage
    const actionPlan = planOptimalActionsWithItems(
      difficulty,
      enemyHand,
      enemyField,
      playerField,
      enemyTools,
      enemySpells,
      enemyEnergy,
      maxFieldSize,
      difficultySettings
    );
    
    if (actionPlan && actionPlan.length > 0) {
      // FIXED: Validate all actions have valid data
      const validActions = actionPlan.filter(action => {
        if (action.type === 'deploy' && !action.creature) return false;
        if (action.type === 'attack' && (!action.attacker || !action.target)) return false;
        if (action.type === 'defend' && !action.creature) return false;
        if (action.type === 'useTool' && (!action.tool || !action.target)) return false;
        if (action.type === 'useSpell' && (!action.spell || !action.caster || !action.target)) return false;
        return true;
      });
      
      if (validActions.length === 0) {
        console.log("AI: No valid actions found, ending turn");
        return { type: 'endTurn' };
      }
      
      // Return array of actions for multi-action turns
      if (shouldMultiAction && hasEnergyForMultiple && validActions.length > 1) {
        console.log(`AI executing MULTI-ACTION turn with ${validActions.length} actions`);
        const maxActions = difficulty === 'expert' ? 5 : 
                          difficulty === 'hard' ? 4 : 
                          difficulty === 'medium' ? 3 : 2;
        
        const multiActions = validActions.slice(0, Math.min(maxActions, validActions.length));
        console.log(`Returning ${multiActions.length} actions for multi-action turn`);
        return multiActions;
      } else {
        // Return single action
        console.log('Returning single action');
        return validActions[0];
      }
    }
    
    // Fallback to single action if planning fails
    const singleAction = determineSingleActionWithItems(
      difficulty, 
      enemyHand, 
      enemyField, 
      playerField, 
      enemyTools, 
      enemySpells, 
      enemyEnergy, 
      maxFieldSize
    );
    
    // FIXED: Ensure we always return a valid action
    if (!singleAction || singleAction.type === undefined) {
      console.log("AI: Fallback - ending turn");
      return { type: 'endTurn' };
    }
    
    return singleAction;
    
  } catch (error) {
    console.error("AI Error:", error);
    return { type: 'endTurn' };
  }
};

// FIXED: Enhanced multi-action planning with proper energy tracking and unique instances
const planOptimalActionsWithItems = (
  difficulty, 
  enemyHand, 
  enemyField, 
  playerField, 
  enemyTools, 
  enemySpells, 
  enemyEnergy, 
  maxFieldSize, 
  settings
) => {
  const actions = [];
  let remainingEnergy = enemyEnergy;
  let currentField = [...enemyField];
  let currentHand = [...enemyHand];
  let availableTools = [...enemyTools];
  let availableSpells = [...enemySpells];
  
  // FIXED: Track deployed creature IDs to prevent duplicates
  const deployedCreatureIds = new Set();
  
  // Calculate board state priorities
  const boardAnalysis = analyzeCompleteBoardState(
    enemyField, 
    playerField, 
    enemyHand, 
    enemyEnergy, 
    difficulty
  );
  
  console.log("Enhanced Board Analysis:", boardAnalysis);
  
  // PRIORITY 0: Use defensive items if in critical danger
  if (boardAnalysis.criticalCreatures.length > 0 && availableTools.length > 0 && remainingEnergy >= 0) {
    const defensiveItem = findBestDefensiveItem(availableTools, boardAnalysis.criticalCreatures[0]);
    if (defensiveItem) {
      actions.push({
        type: 'useTool',
        tool: defensiveItem,
        target: boardAnalysis.criticalCreatures[0],
        energyCost: 0,
        priority: 'critical'
      });
      availableTools = availableTools.filter(t => t.id !== defensiveItem.id);
    }
  }
  
  // PRIORITY 1: Lethal spell combos if available
  if (remainingEnergy >= 4 && availableSpells.length > 0) {
    const lethalSpellCombo = findLethalSpellSequence(
      currentField, 
      playerField, 
      availableSpells, 
      remainingEnergy
    );
    if (lethalSpellCombo.length > 0) {
      console.log("Found lethal spell combo!");
      // Add all lethal spell actions
      lethalSpellCombo.forEach(spellAction => {
        if (remainingEnergy >= spellAction.energyCost) {
          actions.push(spellAction);
          remainingEnergy -= spellAction.energyCost;
          availableSpells = availableSpells.filter(s => s.id !== spellAction.spell.id);
        }
      });
    }
  }
  
  // PRIORITY 2: Emergency defense for valuable creatures
  if (boardAnalysis.immediateThreats.length > 0 && remainingEnergy >= 1) {
    for (const threat of boardAnalysis.immediateThreats) {
      if (remainingEnergy >= 1 && !threat.isDefending && actions.length < 8) {
        // Check if we have a shield tool for this creature
        const shieldTool = availableTools.find(t => 
          t.tool_effect === 'Shield' || t.tool_type === 'stamina'
        );
        
        if (shieldTool) {
          actions.push({
            type: 'useTool',
            tool: shieldTool,
            target: threat,
            energyCost: 0,
            priority: 'emergency'
          });
          availableTools = availableTools.filter(t => t.id !== shieldTool.id);
        } else if (remainingEnergy >= 1) {
          actions.push({
            type: 'defend',
            creature: threat,
            energyCost: 1,
            priority: 'emergency'
          });
          remainingEnergy -= 1;
        }
      }
    }
  }
  
  // PRIORITY 3: Aggressive deployment based on board state
  const deploymentAnalysis = analyzeDeploymentStrategy(
    currentField, 
    currentHand, 
    playerField, 
    remainingEnergy, 
    maxFieldSize, 
    boardAnalysis
  );
  
  if (deploymentAnalysis.shouldDeploy) {
    const deploymentActions = planDeploymentWave(
      currentHand, 
      currentField, 
      playerField, 
      remainingEnergy, 
      maxFieldSize, 
      deploymentAnalysis.urgency,
      difficulty,
      deployedCreatureIds
    );
    
    for (const deployment of deploymentActions) {
      if (remainingEnergy >= deployment.energyCost && currentField.length < maxFieldSize) {
        // FIXED: Ensure we don't deploy the same creature twice
        if (!deployedCreatureIds.has(deployment.creature.id)) {
          actions.push(deployment);
          remainingEnergy -= deployment.energyCost;
          currentField.push(deployment.creature);
          currentHand = currentHand.filter(c => c.id !== deployment.creature.id);
          deployedCreatureIds.add(deployment.creature.id);
        }
      }
    }
  }
  
  // PRIORITY 4: Offensive spells before attacks
  if (remainingEnergy >= 4 && availableSpells.length > 0 && playerField.length > 0) {
    const offensiveSpell = selectBestOffensiveSpell(
      availableSpells, 
      currentField, 
      playerField, 
      remainingEnergy
    );
    
    if (offensiveSpell && remainingEnergy >= 4) {
      actions.push({
        type: 'useSpell',
        spell: offensiveSpell.spell,
        caster: offensiveSpell.caster,
        target: offensiveSpell.target,
        energyCost: 4,
        priority: 'offensive'
      });
      remainingEnergy -= 4;
      availableSpells = availableSpells.filter(s => s.id !== offensiveSpell.spell.id);
    }
  }
  
  // PRIORITY 5: Attack buffs before attacking
  if (currentField.length > 0 && playerField.length > 0 && availableTools.length > 0) {
    const bestAttacker = findStrongestAttacker(currentField);
    const attackBuff = availableTools.find(t => 
      t.tool_effect === 'Surge' || t.tool_type === 'strength' || t.tool_type === 'magic'
    );
    
    if (attackBuff && bestAttacker && remainingEnergy >= 2) {
      actions.push({
        type: 'useTool',
        tool: attackBuff,
        target: bestAttacker,
        energyCost: 0,
        priority: 'buff'
      });
      availableTools = availableTools.filter(t => t.id !== attackBuff.id);
    }
  }
  
  // PRIORITY 6: Coordinated multi-attack strategy
  if (boardAnalysis.shouldAttackAggressively && remainingEnergy >= 2) {
    const attackSequence = planCoordinatedAttacks(
      currentField, 
      playerField, 
      remainingEnergy, 
      settings.aggressionLevel,
      boardAnalysis
    );
    
    for (const attack of attackSequence) {
      if (remainingEnergy >= attack.energyCost && actions.length < 10) {
        actions.push(attack);
        remainingEnergy -= attack.energyCost;
      }
    }
  }
  
  // PRIORITY 7: Utility items and positioning
  if (remainingEnergy >= 1 && currentField.length > 0) {
    const utilityActions = planUtilityActions(
      currentField, 
      playerField, 
      availableTools, 
      remainingEnergy, 
      actions
    );
    for (const utilityAction of utilityActions) {
      if (remainingEnergy >= (utilityAction.energyCost || 0)) {
        actions.push(utilityAction);
        remainingEnergy -= (utilityAction.energyCost || 0);
      }
    }
  }
  
  console.log(`AI planned ${actions.length} actions with items:`, 
    actions.map(a => `${a.type}(cost:${a.energyCost})`)
  );
  
  // FIXED: Strictly validate energy costs before returning
  const validatedActions = [];
  let totalEnergyCost = 0;
  
  for (const action of actions) {
    const actionCost = action.energyCost || 0;
    if (totalEnergyCost + actionCost <= enemyEnergy) {
      // FIXED: Ensure action has all required properties
      if (validateAction(action)) {
        validatedActions.push(action);
        totalEnergyCost += actionCost;
      }
    } else {
      console.log(`Skipping action ${action.type} - would exceed energy budget (${totalEnergyCost + actionCost} > ${enemyEnergy})`);
      break;
    }
  }
  
  return validatedActions;
};

// FIXED: Validate action has all required properties
const validateAction = (action) => {
  switch (action.type) {
    case 'deploy':
      return action.creature && action.creature.id && action.creature.battleStats;
    case 'attack':
      return action.attacker && action.target && action.attacker.id && action.target.id;
    case 'defend':
      return action.creature && action.creature.id;
    case 'useTool':
      return action.tool && action.target && action.tool.id && action.target.id;
    case 'useSpell':
      return action.spell && action.caster && action.target && 
             action.spell.id && action.caster.id && action.target.id;
    case 'endTurn':
      return true;
    default:
      return false;
  }
};

// Analyze complete board state including item options
const analyzeCompleteBoardState = (enemyField, playerField, enemyHand, enemyEnergy, difficulty) => {
  const analysis = {
    enemyTotalPower: 0,
    playerTotalPower: 0,
    enemyAvgHealth: 0,
    playerAvgHealth: 0,
    immediateThreats: [],
    criticalCreatures: [],
    weakEnemies: [],
    shouldAttackAggressively: false,
    fieldControlRatio: 0,
    energyEfficiency: enemyEnergy / Math.max(enemyField.length, 1),
    handQuality: 0,
    boardTension: 0
  };
  
  // Calculate total power and health
  enemyField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.enemyTotalPower += power;
    analysis.enemyAvgHealth += (creature.currentHealth / creature.battleStats?.maxHealth || 1);
    
    // Identify creatures in immediate danger
    const healthPercent = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    if (healthPercent < 0.3) {
      analysis.immediateThreats.push(creature);
    }
    if (healthPercent < 0.15 || (creature.rarity === 'Legendary' && healthPercent < 0.25)) {
      analysis.criticalCreatures.push(creature);
    }
  });
  
  playerField.forEach(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    analysis.playerTotalPower += power;
    analysis.playerAvgHealth += (creature.currentHealth / creature.battleStats?.maxHealth || 1);
    
    // Identify weak player creatures we can easily defeat
    if (creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.4) {
      analysis.weakEnemies.push(creature);
    }
  });
  
  // Calculate averages
  if (enemyField.length > 0) {
    analysis.enemyAvgHealth /= enemyField.length;
  }
  if (playerField.length > 0) {
    analysis.playerAvgHealth /= playerField.length;
  }
  
  // Calculate hand quality
  analysis.handQuality = enemyHand.reduce((quality, creature) => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    const cost = creature.battleStats?.energyCost || 3;
    return quality + (power / cost);
  }, 0) / Math.max(enemyHand.length, 1);
  
  // Calculate board tension (how close to winning/losing)
  analysis.boardTension = Math.abs(analysis.enemyTotalPower - analysis.playerTotalPower) / 
    Math.max(analysis.enemyTotalPower, analysis.playerTotalPower, 1);
  
  // Determine aggression strategy with enhanced logic
  analysis.fieldControlRatio = enemyField.length / Math.max(playerField.length, 1);
  
  // More nuanced aggression determination
  const powerAdvantage = analysis.enemyTotalPower > analysis.playerTotalPower * 1.2;
  const healthAdvantage = analysis.enemyAvgHealth > analysis.playerAvgHealth * 1.3;
  const numericalAdvantage = analysis.fieldControlRatio >= 1.5;
  const canFinishTargets = analysis.weakEnemies.length >= 2;
  const highTension = analysis.boardTension > 0.6;
  
  analysis.shouldAttackAggressively = (
    powerAdvantage ||
    healthAdvantage ||
    numericalAdvantage ||
    canFinishTargets ||
    (difficulty === 'hard' || difficulty === 'expert') ||
    (highTension && analysis.enemyTotalPower >= analysis.playerTotalPower)
  );
  
  return analysis;
};

// Analyze deployment strategy based on multiple factors
const analyzeDeploymentStrategy = (enemyField, enemyHand, playerField, energy, maxFieldSize, boardAnalysis) => {
  const currentFieldUtilization = enemyField.length / maxFieldSize;
  const hasEnergyReserves = energy >= 6;
  const handHasQuality = boardAnalysis.handQuality > 5;
  
  // Multi-factor deployment decision
  const factors = {
    fieldSpace: currentFieldUtilization < 0.8, // Still have 20% field space
    energyAvailable: energy >= 3,
    numericalDisadvantage: enemyField.length < playerField.length,
    powerDeficit: boardAnalysis.enemyTotalPower < boardAnalysis.playerTotalPower * 0.8,
    criticalMass: enemyField.length < 3, // Need at least 3 creatures for synergy
    handQuality: handHasQuality,
    aggression: boardAnalysis.shouldAttackAggressively
  };
  
  // Calculate deployment score
  let deploymentScore = 0;
  if (factors.fieldSpace) deploymentScore += 2;
  if (factors.energyAvailable) deploymentScore += 1;
  if (factors.numericalDisadvantage) deploymentScore += 3;
  if (factors.powerDeficit) deploymentScore += 3;
  if (factors.criticalMass) deploymentScore += 2;
  if (factors.handQuality) deploymentScore += 1;
  if (factors.aggression) deploymentScore += 1;
  
  // Determine urgency level
  let urgency = 'normal';
  if (enemyField.length === 0) urgency = 'critical';
  else if (deploymentScore >= 8) urgency = 'high';
  else if (deploymentScore >= 5) urgency = 'medium';
  
  return {
    shouldDeploy: deploymentScore >= 3 && factors.fieldSpace && factors.energyAvailable,
    urgency: urgency,
    deploymentScore: deploymentScore,
    recommendedDeployments: Math.min(
      Math.floor(deploymentScore / 3),
      maxFieldSize - enemyField.length,
      Math.floor(energy / 3)
    )
  };
};

// FIXED: Plan deployment wave ensuring unique creatures
const planDeploymentWave = (
  enemyHand, 
  currentField, 
  playerField, 
  availableEnergy, 
  maxFieldSize, 
  urgency, 
  difficulty,
  deployedCreatureIds
) => {
  const deployments = [];
  const fieldSpace = maxFieldSize - currentField.length;
  
  // Sort hand by deployment priority
  const prioritizedHand = [...enemyHand].map(creature => ({
    creature,
    score: calculateDeploymentScore(creature, currentField, playerField, difficulty)
  })).sort((a, b) => b.score - a.score);
  
  // Determine how many to deploy based on urgency
  let targetDeployments = 1;
  switch (urgency) {
    case 'critical': 
      targetDeployments = Math.min(fieldSpace, 3, Math.floor(availableEnergy / 3));
      break;
    case 'high': 
      targetDeployments = Math.min(fieldSpace, 2, Math.floor(availableEnergy / 4));
      break;
    case 'medium': 
      targetDeployments = Math.min(fieldSpace, 2, Math.floor(availableEnergy / 5));
      break;
    default: 
      targetDeployments = 1;
  }
  
  // Select creatures for deployment
  let energySpent = 0;
  for (const entry of prioritizedHand) {
    const cost = entry.creature.battleStats?.energyCost || 3;
    
    // FIXED: Check if creature already deployed
    if (deployedCreatureIds && deployedCreatureIds.has(entry.creature.id)) {
      console.log(`Skipping creature ${entry.creature.id} - already deployed`);
      continue;
    }
    
    if (deployments.length < targetDeployments && 
        energySpent + cost <= availableEnergy &&
        currentField.length + deployments.length < maxFieldSize) {
      
      // Check for synergy with existing field
      const synergyBonus = calculateFieldSynergy(entry.creature, [...currentField, ...deployments.map(d => d.creature)]);
      
      deployments.push({
        type: 'deploy',
        creature: entry.creature,
        energyCost: cost,
        priority: urgency,
        synergyScore: synergyBonus
      });
      
      energySpent += cost;
    }
  }
  
  return deployments;
};

// Calculate deployment score for a creature
const calculateDeploymentScore = (creature, currentField, playerField, difficulty) => {
  let score = 0;
  
  // Base stats score
  const statTotal = Object.values(creature.stats || {}).reduce((sum, val) => sum + val, 0);
  score += statTotal * 2;
  
  // Attack power score (weighted heavily)
  const attackPower = Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  );
  score += attackPower * 3;
  
  // Health score
  score += (creature.battleStats?.maxHealth || 50);
  
  // Rarity and form bonuses
  const rarityMultipliers = { 'Legendary': 2.0, 'Epic': 1.6, 'Rare': 1.3, 'Common': 1.0 };
  score *= (rarityMultipliers[creature.rarity] || 1.0);
  score *= (1 + (creature.form || 0) * 0.3);
  
  // Type advantage scoring against player field
  let typeAdvantageScore = 0;
  playerField.forEach(playerCreature => {
    if (hasTypeAdvantage(creature, playerCreature)) {
      typeAdvantageScore += 25;
    }
  });
  score += typeAdvantageScore;
  
  // Synergy with current field
  const synergyScore = calculateFieldSynergy(creature, currentField);
  score += synergyScore * 10;
  
  // Energy efficiency
  const energyCost = creature.battleStats?.energyCost || 3;
  score = score / energyCost;
  
  // Difficulty adjustments
  if (difficulty === 'expert' || difficulty === 'hard') {
    // Prefer higher-cost, higher-impact creatures
    if (energyCost >= 5) score *= 1.2;
  }
  
  return score;
};

// Calculate field synergy between creatures
const calculateFieldSynergy = (newCreature, existingField) => {
  let synergyScore = 0;
  
  existingField.forEach(fieldCreature => {
    // Same species synergy
    if (newCreature.species_id === fieldCreature.species_id) {
      synergyScore += 2;
    }
    
    // Complementary stats synergy
    const synergies = [
      { stat1: 'strength', stat2: 'stamina', bonus: 1.5 },
      { stat1: 'magic', stat2: 'energy', bonus: 1.5 },
      { stat1: 'speed', stat2: 'strength', bonus: 1 },
      { stat1: 'stamina', stat2: 'magic', bonus: 1 },
      { stat1: 'energy', stat2: 'speed', bonus: 1 }
    ];
    
    for (const synergy of synergies) {
      if ((newCreature.stats?.[synergy.stat1] || 0) > 7 && 
          (fieldCreature.stats?.[synergy.stat2] || 0) > 7) {
        synergyScore += synergy.bonus;
      }
    }
    
    // Specialty stats synergy
    if (newCreature.specialty_stats && fieldCreature.specialty_stats) {
      const sharedSpecialties = newCreature.specialty_stats.filter(s => 
        fieldCreature.specialty_stats.includes(s)
      );
      synergyScore += sharedSpecialties.length * 0.5;
    }
  });
  
  return synergyScore;
};

// Check type advantage
const hasTypeAdvantage = (attacker, defender) => {
  if (!attacker.stats || !defender.stats) return false;
  
  const advantages = [
    { strong: 'strength', weak: 'stamina' },
    { strong: 'stamina', weak: 'speed' },
    { strong: 'speed', weak: 'magic' },
    { strong: 'magic', weak: 'energy' },
    { strong: 'energy', weak: 'strength' }
  ];
  
  for (const adv of advantages) {
    if ((attacker.stats[adv.strong] || 0) > 7 && (defender.stats[adv.weak] || 0) > 6) {
      return true;
    }
  }
  
  return false;
};

// Find best defensive item for a creature
const findBestDefensiveItem = (tools, targetCreature) => {
  const defensiveTools = tools.filter(tool => 
    tool.tool_effect === 'Shield' || 
    tool.tool_type === 'stamina' ||
    (tool.tool_type === 'energy' && tool.tool_effect === 'Echo')
  );
  
  if (defensiveTools.length === 0) return null;
  
  // Score tools based on creature needs
  return defensiveTools.reduce((best, current) => {
    if (!best) return current;
    
    const bestScore = scoreDefensiveTool(best, targetCreature);
    const currentScore = scoreDefensiveTool(current, targetCreature);
    
    return currentScore > bestScore ? current : best;
  }, null);
};

// Score defensive tool effectiveness
const scoreDefensiveTool = (tool, creature) => {
  let score = 0;
  
  // Shield effect is best for low health
  if (tool.tool_effect === 'Shield') {
    const healthPercent = creature.currentHealth / (creature.battleStats?.maxHealth || 50);
    score += (1 - healthPercent) * 100;
  }
  
  // Stamina tools for tanks
  if (tool.tool_type === 'stamina' && (creature.stats?.stamina || 0) > 7) {
    score += 50;
  }
  
  // Rarity bonus
  const rarityScores = { 'Legendary': 40, 'Epic': 30, 'Rare': 20, 'Common': 10 };
  score += rarityScores[tool.rarity] || 10;
  
  return score;
};

// Find lethal spell sequence
const findLethalSpellSequence = (enemyField, playerField, spells, availableEnergy) => {
  if (playerField.length === 0 || spells.length === 0) return [];
  
  const actions = [];
  let totalDamageNeeded = playerField.reduce((sum, c) => sum + c.currentHealth, 0);
  let remainingEnergy = availableEnergy;
  
  // Find damage spells
  const damageSpells = spells.filter(spell => 
    spell.spell_effect === 'Surge' || 
    spell.spell_type === 'strength' || 
    spell.spell_type === 'magic'
  );
  
  if (damageSpells.length === 0) return [];
  
  // Calculate potential spell damage
  let totalSpellDamage = 0;
  const spellActions = [];
  
  for (const spell of damageSpells) {
    if (remainingEnergy >= 4) {
      const caster = findBestSpellCaster(enemyField, spell);
      if (caster) {
        const target = findBestSpellTarget(playerField, spell);
        const estimatedDamage = estimateSpellDamage(spell, caster, target);
        
        totalSpellDamage += estimatedDamage;
        spellActions.push({
          type: 'useSpell',
          spell: spell,
          caster: caster,
          target: target,
          energyCost: 4,
          estimatedDamage: estimatedDamage,
          priority: 'lethal'
        });
        
        remainingEnergy -= 4;
        
        // Stop if we have enough damage
        if (totalSpellDamage >= totalDamageNeeded * 0.8) {
          break;
        }
      }
    }
  }
  
  // Only return spell actions if they're truly lethal or close to it
  if (totalSpellDamage >= totalDamageNeeded * 0.8) {
    return spellActions;
  }
  
  return [];
};

// Find best caster for a spell
const findBestSpellCaster = (field, spell) => {
  if (field.length === 0) return null;
  
  // Find caster with highest magic stat for the spell type
  return field.reduce((best, current) => {
    if (!best) return current;
    
    const bestMagic = best.stats?.magic || 0;
    const currentMagic = current.stats?.magic || 0;
    
    // Bonus for matching spell type to creature specialty
    let bestScore = bestMagic;
    let currentScore = currentMagic;
    
    if (best.specialty_stats?.includes(spell.spell_type)) bestScore += 5;
    if (current.specialty_stats?.includes(spell.spell_type)) currentScore += 5;
    
    return currentScore > bestScore ? current : best;
  }, null);
};

// Find best target for a spell
const findBestSpellTarget = (targets, spell) => {
  if (targets.length === 0) return null;
  
  // For damage spells, target weakest enemy
  if (spell.spell_effect === 'Surge' || spell.spell_type === 'strength') {
    return targets.reduce((weakest, current) => {
      if (!weakest) return current;
      return current.currentHealth < weakest.currentHealth ? current : weakest;
    }, null);
  }
  
  // For other spells, target highest threat
  return targets.reduce((best, current) => {
    if (!best) return current;
    
    const bestThreat = Math.max(
      best.battleStats?.physicalAttack || 0,
      best.battleStats?.magicalAttack || 0
    );
    const currentThreat = Math.max(
      current.battleStats?.physicalAttack || 0,
      current.battleStats?.magicalAttack || 0
    );
    
    return currentThreat > bestThreat ? current : best;
  }, null);
};

// Estimate spell damage
const estimateSpellDamage = (spell, caster, target) => {
  const casterMagic = caster.stats?.magic || 5;
  const baseDamage = 20; // Base spell damage
  
  // Apply magic scaling
  let damage = baseDamage * (1 + casterMagic * 0.15);
  
  // Apply spell effect multipliers
  if (spell.spell_effect === 'Surge') damage *= 1.5;
  
  // Apply rarity multipliers
  const rarityMultipliers = { 'Legendary': 1.5, 'Epic': 1.3, 'Rare': 1.1, 'Common': 1.0 };
  damage *= rarityMultipliers[spell.rarity] || 1.0;
  
  // Rough defense calculation
  const defense = target.battleStats?.magicalDefense || 0;
  damage = Math.max(1, damage - defense);
  
  return Math.floor(damage);
};

// Select best offensive spell
const selectBestOffensiveSpell = (spells, enemyField, playerField, energy) => {
  if (spells.length === 0 || enemyField.length === 0 || playerField.length === 0) return null;
  
  let bestOption = null;
  let bestScore = -1;
  
  for (const spell of spells) {
    for (const caster of enemyField) {
      for (const target of playerField) {
        const score = scoreSpellOption(spell, caster, target, playerField);
        
        if (score > bestScore) {
          bestScore = score;
          bestOption = {
            spell: spell,
            caster: caster,
            target: target
          };
        }
      }
    }
  }
  
  return bestOption;
};

// Score spell option
const scoreSpellOption = (spell, caster, target, allTargets) => {
  let score = 0;
  
  // Base damage estimate
  const damage = estimateSpellDamage(spell, caster, target);
  score += damage * 2;
  
  // Elimination bonus
  if (damage >= target.currentHealth) {
    score += 100;
  }
  
  // Target priority
  const targetThreat = Math.max(
    target.battleStats?.physicalAttack || 0,
    target.battleStats?.magicalAttack || 0
  );
  score += targetThreat;
  
  // Caster efficiency
  if (caster.specialty_stats?.includes('magic')) {
    score += 20;
  }
  
  // AOE potential (if spell could affect multiple targets)
  if (spell.spell_effect === 'Echo' || spell.spell_type === 'energy') {
    score += allTargets.length * 10;
  }
  
  return score;
};

// Find strongest attacker
const findStrongestAttacker = (field) => {
  if (field.length === 0) return null;
  
  return field.reduce((strongest, current) => {
    if (!strongest) return current;
    
    const strongestAttack = Math.max(
      strongest.battleStats?.physicalAttack || 0,
      strongest.battleStats?.magicalAttack || 0
    );
    const currentAttack = Math.max(
      current.battleStats?.physicalAttack || 0,
      current.battleStats?.magicalAttack || 0
    );
    
    return currentAttack > strongestAttack ? current : strongest;
  }, null);
};

// Plan coordinated attacks with better targeting
const planCoordinatedAttacks = (enemyField, playerField, availableEnergy, aggressionLevel, boardAnalysis) => {
  const attacks = [];
  const availableAttackers = enemyField.filter(creature => !creature.isDefending);
  let remainingEnergy = availableEnergy;
  
  // Create target priority list
  const targetPriorities = analyzeTargetPriorities(playerField, boardAnalysis);
  
  // Calculate maximum attacks based on energy and aggression
  const maxAttacks = Math.floor(remainingEnergy / 2);
  const targetAttacks = Math.ceil(maxAttacks * aggressionLevel);
  
  // Assign attackers to targets optimally
  const assignments = assignAttackersToTargets(
    availableAttackers, 
    targetPriorities, 
    targetAttacks
  );
  
  // Convert assignments to actions
  for (const assignment of assignments) {
    if (attacks.length < targetAttacks && remainingEnergy >= 2) {
      attacks.push({
        type: 'attack',
        attacker: assignment.attacker,
        target: assignment.target,
        energyCost: 2,
        priority: 'coordinated',
        expectedDamage: assignment.expectedDamage
      });
      remainingEnergy -= 2;
    }
  }
  
  return attacks;
};

// Analyze and prioritize targets
const analyzeTargetPriorities = (playerField, boardAnalysis) => {
  return playerField.map(target => {
    const healthRatio = target.currentHealth / (target.battleStats?.maxHealth || 50);
    const threat = Math.max(
      target.battleStats?.physicalAttack || 0,
      target.battleStats?.magicalAttack || 0
    );
    
    let priority = 0;
    
    // High priority for low health targets (easy eliminations)
    if (healthRatio < 0.3) priority += 100;
    else if (healthRatio < 0.5) priority += 50;
    
    // High priority for high threat targets
    priority += threat * 2;
    
    // Extra priority for legendary/epic creatures
    if (target.rarity === 'Legendary') priority += 40;
    else if (target.rarity === 'Epic') priority += 25;
    
    // Bonus for targets we have type advantage against
    if (boardAnalysis.weakEnemies.includes(target)) {
      priority += 30;
    }
    
    return {
      target: target,
      priority: priority,
      healthRatio: healthRatio,
      threat: threat
    };
  }).sort((a, b) => b.priority - a.priority);
};

// Assign attackers to targets optimally
const assignAttackersToTargets = (attackers, targetPriorities, maxAssignments) => {
  const assignments = [];
  const usedAttackers = new Set();
  const targetDamage = new Map();
  
  // First pass: Try to eliminate high-priority targets
  for (const targetInfo of targetPriorities) {
    const target = targetInfo.target;
    const remainingHealth = target.currentHealth - (targetDamage.get(target.id) || 0);
    
    if (remainingHealth <= 0) continue;
    
    // Find best attacker for this target
    let bestAttacker = null;
    let bestDamage = 0;
    
    for (const attacker of attackers) {
      if (usedAttackers.has(attacker.id)) continue;
      
      const damage = estimateAttackDamage(attacker, target);
      
      // Prefer attackers that can eliminate or deal significant damage
      const damageScore = damage >= remainingHealth ? damage + 100 : damage;
      
      if (damageScore > bestDamage) {
        bestDamage = damage;
        bestAttacker = attacker;
      }
    }
    
    if (bestAttacker && assignments.length < maxAssignments) {
      assignments.push({
        attacker: bestAttacker,
        target: target,
        expectedDamage: bestDamage
      });
      
      usedAttackers.add(bestAttacker.id);
      targetDamage.set(target.id, (targetDamage.get(target.id) || 0) + bestDamage);
    }
  }
  
  // Second pass: Assign remaining attackers
  for (const attacker of attackers) {
    if (usedAttackers.has(attacker.id) || assignments.length >= maxAssignments) continue;
    
    // Find best target for this attacker
    const bestTarget = targetPriorities.find(t => true)?.target;
    
    if (bestTarget) {
      assignments.push({
        attacker: attacker,
        target: bestTarget,
        expectedDamage: estimateAttackDamage(attacker, bestTarget)
      });
    }
  }
  
  return assignments;
};

// Plan utility actions with items
const planUtilityActions = (enemyField, playerField, availableTools, remainingEnergy, existingActions) => {
  const utilityActions = [];
  
  // Don't use more than 2 utility actions per turn
  if (existingActions.filter(a => a.priority === 'utility').length >= 2) {
    return utilityActions;
  }
  
  // Echo tools for sustained advantage
  const echoTools = availableTools.filter(t => t.tool_effect === 'Echo');
  if (echoTools.length > 0 && enemyField.length > 0) {
    const target = enemyField.reduce((best, current) => {
      if (!best) return current;
      
      const bestValue = calculateCreatureValue(best);
      const currentValue = calculateCreatureValue(current);
      
      return currentValue > bestValue ? current : best;
    }, null);
    
    if (target) {
      utilityActions.push({
        type: 'useTool',
        tool: echoTools[0],
        target: target,
        energyCost: 0,
        priority: 'utility'
      });
    }
  }
  
  // Add defensive positioning if we have energy
  if (remainingEnergy >= 1 && enemyField.length > 0) {
    const needsDefense = enemyField.find(creature => 
      !creature.isDefending && 
      creature.currentHealth < creature.battleStats?.maxHealth * 0.7 &&
      creature.currentHealth > creature.battleStats?.maxHealth * 0.3
    );
    
    if (needsDefense) {
      utilityActions.push({
        type: 'defend',
        creature: needsDefense,
        energyCost: 1,
        priority: 'utility'
      });
    }
  }
  
  return utilityActions;
};

// Calculate creature value
const calculateCreatureValue = (creature) => {
  let value = 0;
  
  // Stats value
  const totalStats = Object.values(creature.stats || {}).reduce((sum, val) => sum + val, 0);
  value += totalStats;
  
  // Combat value
  const attack = Math.max(
    creature.battleStats?.physicalAttack || 0,
    creature.battleStats?.magicalAttack || 0
  );
  value += attack * 2;
  
  // Rarity value
  const rarityValues = { 'Legendary': 50, 'Epic': 30, 'Rare': 15, 'Common': 5 };
  value += rarityValues[creature.rarity] || 5;
  
  // Form value
  value += (creature.form || 0) * 10;
  
  return value;
};

// Helper: Estimate attack damage
const estimateAttackDamage = (attacker, defender) => {
  const attackerPhysical = attacker.battleStats?.physicalAttack || 0;
  const attackerMagical = attacker.battleStats?.magicalAttack || 0;
  const defenderPhysical = defender.battleStats?.physicalDefense || 0;
  const defenderMagical = defender.battleStats?.magicalDefense || 0;
  
  // Calculate both attack types and use the better one
  const physicalDamage = Math.max(1, attackerPhysical - defenderPhysical * 0.5);
  const magicalDamage = Math.max(1, attackerMagical - defenderMagical * 0.5);
  
  return Math.max(physicalDamage, magicalDamage);
};

// FIXED: Single action determination with better validation
const determineSingleActionWithItems = (
  difficulty, 
  enemyHand, 
  enemyField, 
  playerField, 
  enemyTools, 
  enemySpells, 
  enemyEnergy, 
  maxFieldSize
) => {
  try {
    // Use enhanced AI functions based on difficulty
    let action;
    switch (difficulty) {
      case 'easy':
        action = determineEasyAIActionWithItems(
          enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
        );
        break;
      case 'medium':
        action = determineMediumAIActionWithItems(
          enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
        );
        break;
      case 'hard':
        action = determineHardAIActionWithItems(
          enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
        );
        break;
      case 'expert':
        action = determineExpertAIActionWithItems(
          enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
        );
        break;
      default:
        action = { type: 'endTurn' };
    }
    
    // FIXED: Validate action before returning
    if (!action || !validateAction(action)) {
      console.log("Invalid action returned, ending turn");
      return { type: 'endTurn' };
    }
    
    return action;
  } catch (error) {
    console.error("Error in determineSingleActionWithItems:", error);
    return { type: 'endTurn' };
  }
};

// FIXED: Easy AI with proper validation
const determineEasyAIActionWithItems = (
  enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
) => {
  // If no field and no energy to deploy, end turn
  if (enemyField.length === 0 && enemyEnergy < 3) {
    return { type: 'endTurn' };
  }
  
  // PRIORITY 1: Use healing tool if any creature is low
  if (enemyField.length > 0 && enemyTools.length > 0) {
    const woundedCreature = enemyField.find(c => 
      c.currentHealth < (c.battleStats?.maxHealth || 50) * 0.4
    );
    
    if (woundedCreature) {
      const healingTool = enemyTools.find(t => 
        t.tool_type === 'stamina' || t.tool_effect === 'Shield'
      );
      
      if (healingTool) {
        return {
          type: 'useTool',
          tool: healingTool,
          target: woundedCreature,
          energyCost: 0
        };
      }
    }
  }
  
  // PRIORITY 2: Attack first (85% chance)
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 2) {
    if (Math.random() < 0.85) {
      const availableAttackers = enemyField.filter(c => !c.isDefending);
      if (availableAttackers.length > 0) {
        const attacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];
        const target = playerField.reduce((weakest, current) => {
          if (!weakest) return current;
          return current.currentHealth < weakest.currentHealth ? current : weakest;
        }, null);
        
        if (attacker && target) {
          return {
            type: 'attack',
            attacker: attacker,
            target: target,
            energyCost: 2
          };
        }
      }
    }
  }
  
  // PRIORITY 3: Deploy if field is weak
  if (enemyField.length < Math.min(3, maxFieldSize) && enemyHand.length > 0) {
    const affordableCreatures = enemyHand.filter(creature => {
      const energyCost = creature.battleStats?.energyCost || 3;
      return energyCost <= enemyEnergy;
    });
    
    if (affordableCreatures.length > 0) {
      // Pick strongest affordable creature
      const bestCreature = affordableCreatures.reduce((best, current) => {
        if (!best) return current;
        
        const bestPower = Math.max(
          best.battleStats?.physicalAttack || 0,
          best.battleStats?.magicalAttack || 0
        );
        const currentPower = Math.max(
          current.battleStats?.physicalAttack || 0,
          current.battleStats?.magicalAttack || 0
        );
        
        return currentPower > bestPower ? current : best;
      }, null);
      
      if (bestCreature) {
        return {
          type: 'deploy',
          creature: bestCreature,
          energyCost: bestCreature.battleStats?.energyCost || 3
        };
      }
    }
  }
  
  // PRIORITY 4: Defend if needed
  if (enemyField.length > 0 && enemyEnergy >= 1) {
    const vulnerableCreature = enemyField.find(creature => 
      !creature.isDefending && 
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.3
    );
    
    if (vulnerableCreature) {
      return {
        type: 'defend',
        creature: vulnerableCreature,
        energyCost: 1
      };
    }
  }
  
  return { type: 'endTurn' };
};

// Medium AI with strategic item usage
const determineMediumAIActionWithItems = (
  enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
) => {
  // If no field and no energy to deploy, end turn
  if (enemyField.length === 0 && enemyEnergy < 3) {
    return { type: 'endTurn' };
  }
  
  // PRIORITY 1: Strategic spell usage
  if (enemySpells.length > 0 && enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 4) {
    const offensiveSpell = enemySpells.find(s => 
      s.spell_effect === 'Surge' || s.spell_type === 'strength' || s.spell_type === 'magic'
    );
    
    if (offensiveSpell) {
      const caster = findBestSpellCaster(enemyField, offensiveSpell);
      const target = playerField.reduce((weakest, current) => {
        if (!weakest) return current;
        return current.currentHealth < weakest.currentHealth ? current : weakest;
      }, null);
      
      if (caster && target) {
        const estimatedDamage = estimateSpellDamage(offensiveSpell, caster, target);
        
        // Use spell if it would eliminate target or deal significant damage
        if (estimatedDamage >= target.currentHealth || estimatedDamage >= 30) {
          return {
            type: 'useSpell',
            spell: offensiveSpell,
            caster: caster,
            target: target,
            energyCost: 4
          };
        }
      }
    }
  }
  
  // PRIORITY 2: Attack buff before attacking
  if (enemyField.length > 0 && playerField.length > 0 && enemyTools.length > 0 && enemyEnergy >= 2) {
    const strongAttacker = findStrongestAttacker(enemyField);
    const attackBuff = enemyTools.find(t => 
      t.tool_effect === 'Surge' || t.tool_type === 'strength'
    );
    
    if (strongAttacker && attackBuff) {
      return {
        type: 'useTool',
        tool: attackBuff,
        target: strongAttacker,
        energyCost: 0
      };
    }
  }
  
  // PRIORITY 3: Aggressive attacks with good matchups
  if (enemyField.length >= playerField.length && enemyEnergy >= 2 && playerField.length > 0) {
    const bestAttack = findOptimalAttack(enemyField, playerField);
    
    if (bestAttack) {
      return {
        type: 'attack',
        attacker: bestAttack.attacker,
        target: bestAttack.target,
        energyCost: 2
      };
    }
  }
  
  // PRIORITY 4: Strategic deployment
  const deploymentNeeded = enemyField.length < playerField.length || 
                          enemyField.length < Math.min(4, maxFieldSize);
  
  if (deploymentNeeded && enemyHand.length > 0) {
    const boardState = analyzeCompleteBoardState(enemyField, playerField, enemyHand, enemyEnergy, 'medium');
    const bestCreature = selectBestCreatureForDeployment(
      enemyHand, enemyField, playerField, enemyEnergy, 'medium'
    );
    
    if (bestCreature) {
      const energyCost = bestCreature.battleStats?.energyCost || 3;
      if (enemyEnergy >= energyCost) {
        return {
          type: 'deploy',
          creature: bestCreature,
          energyCost: energyCost
        };
      }
    }
  }
  
  // PRIORITY 5: Defensive tools for valuable creatures
  if (enemyField.length > 0 && enemyTools.length > 0) {
    const valuableCreature = enemyField.find(creature => 
      (creature.rarity === 'Epic' || creature.rarity === 'Legendary') &&
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.6
    );
    
    if (valuableCreature) {
      const defensiveTool = findBestDefensiveItem(enemyTools, valuableCreature);
      if (defensiveTool) {
        return {
          type: 'useTool',
          tool: defensiveTool,
          target: valuableCreature,
          energyCost: 0
        };
      }
    }
  }
  
  // PRIORITY 6: Any available attack
  if (enemyField.length > 0 && playerField.length > 0 && enemyEnergy >= 2) {
    const attacker = enemyField.find(creature => !creature.isDefending);
    const target = playerField[0];
    
    if (attacker && target) {
      return {
        type: 'attack',
        attacker: attacker,
        target: target,
        energyCost: 2
      };
    }
  }
  
  // PRIORITY 7: Defend if necessary
  if (enemyField.length > 0 && enemyEnergy >= 1) {
    const needsDefense = enemyField.find(creature => 
      !creature.isDefending && 
      creature.currentHealth < (creature.battleStats?.maxHealth || 50) * 0.4
    );
    
    if (needsDefense) {
      return {
        type: 'defend',
        creature: needsDefense,
        energyCost: 1
      };
    }
  }
  
  return { type: 'endTurn' };
};

// Find optimal attack pairing
const findOptimalAttack = (attackers, defenders) => {
  let bestPairing = null;
  let bestScore = -1;
  
  attackers.forEach(attacker => {
    if (attacker.isDefending) return;
    
    defenders.forEach(defender => {
      const damage = estimateAttackDamage(attacker, defender);
      let score = damage;
      
      // Bonus for elimination
      if (damage >= defender.currentHealth) score += 50;
      
      // Bonus for type advantage
      if (hasTypeAdvantage(attacker, defender)) score += 20;
      
      // Consider target value
      if (defender.rarity === 'Legendary') score += 20;
      else if (defender.rarity === 'Epic') score += 15;
      
      if (score > bestScore) {
        bestScore = score;
        bestPairing = { attacker, target: defender };
      }
    });
  });
  
  return bestPairing;
};

// Select best creature for deployment
const selectBestCreatureForDeployment = (hand, field, playerField, energy, difficulty) => {
  const affordableCreatures = hand.filter(creature => 
    (creature.battleStats?.energyCost || 3) <= energy
  );
  
  if (affordableCreatures.length === 0) return null;
  
  // Score each creature
  const scoredCreatures = affordableCreatures.map(creature => ({
    creature,
    score: calculateDeploymentScore(creature, field, playerField, difficulty)
  }));
  
  // Sort by score and return the best
  scoredCreatures.sort((a, b) => b.score - a.score);
  
  return scoredCreatures[0]?.creature || null;
};

// Hard AI with advanced item combos
const determineHardAIActionWithItems = (
  enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
) => {
  // If no creatures and no way to deploy, end turn
  if (enemyField.length === 0 && (enemyHand.length === 0 || enemyEnergy < 3)) {
    return { type: 'endTurn' };
  }
  
  const boardAnalysis = analyzeCompleteBoardState(
    enemyField, playerField, enemyHand, enemyEnergy, 'hard'
  );
  
  // PRIORITY 1: Lethal spell/attack combo
  const lethalCombo = findLethalCombo(
    enemyField, playerField, enemyTools, enemySpells, enemyEnergy
  );
  
  if (lethalCombo) {
    return lethalCombo.actions[0]; // Return first action of combo
  }
  
  // PRIORITY 2: Power spike deployment
  if (boardAnalysis.fieldControlRatio < 1.2 && enemyField.length < maxFieldSize) {
    const powerDeployment = planPowerSpikeDeployment(
      enemyHand, enemyField, playerField, enemyEnergy, maxFieldSize
    );
    
    if (powerDeployment && enemyField.length < Math.min(5, maxFieldSize)) {
      return powerDeployment;
    }
  }
  
  // PRIORITY 3: Synergistic tool usage
  if (enemyTools.length > 0 && enemyField.length > 0) {
    const synergisticPlay = findSynergisticToolPlay(
      enemyTools, enemyField, playerField, boardAnalysis
    );
    
    if (synergisticPlay) {
      return synergisticPlay;
    }
  }
  
  // PRIORITY 4: Optimal spell timing
  if (enemySpells.length > 0 && enemyEnergy >= 4) {
    const optimalSpell = findOptimalSpellTiming(
      enemySpells, enemyField, playerField, boardAnalysis
    );
    
    if (optimalSpell) {
      return optimalSpell;
    }
  }
  
  // PRIORITY 5: Coordinated assault
  if (boardAnalysis.shouldAttackAggressively && enemyEnergy >= 2) {
    const assault = planCoordinatedAssault(
      enemyField, playerField, enemyEnergy, boardAnalysis
    );
    
    if (assault) {
      return assault;
    }
  }
  
  // PRIORITY 6: Value trades
  const valueTrade = findValueTrade(enemyField, playerField, enemyEnergy);
  if (valueTrade) {
    return valueTrade;
  }
  
  // PRIORITY 7: Emergency defense
  if (boardAnalysis.immediateThreats.length > 0) {
    const defense = planEmergencyDefense(
      enemyField, enemyTools, boardAnalysis.immediateThreats[0]
    );
    
    if (defense) {
      return defense;
    }
  }
  
  return { type: 'endTurn' };
};

// Find lethal combination of spells and attacks
const findLethalCombo = (field, playerField, tools, spells, energy) => {
  const totalPlayerHealth = playerField.reduce((sum, c) => sum + c.currentHealth, 0);
  let actions = [];
  let totalDamage = 0;
  let energyUsed = 0;
  
  // First, calculate spell damage potential
  for (const spell of spells) {
    if (energyUsed + 4 <= energy) {
      const caster = findBestSpellCaster(field, spell);
      const target = playerField[0]; // Simplified targeting
      
      if (caster && target) {
        const damage = estimateSpellDamage(spell, caster, target);
        totalDamage += damage;
        energyUsed += 4;
        
        actions.push({
          type: 'useSpell',
          spell: spell,
          caster: caster,
          target: target,
          energyCost: 4
        });
      }
    }
  }
  
  // Then add attack damage
  const remainingEnergy = energy - energyUsed;
  const maxAttacks = Math.floor(remainingEnergy / 2);
  const attackers = field.filter(c => !c.isDefending);
  
  for (let i = 0; i < Math.min(maxAttacks, attackers.length); i++) {
    const attacker = attackers[i];
    const target = playerField[0]; // Simplified
    
    if (attacker && target) {
      const damage = estimateAttackDamage(attacker, target);
      totalDamage += damage;
      
      actions.push({
        type: 'attack',
        attacker: attacker,
        target: target,
        energyCost: 2
      });
    }
  }
  
  // Check if lethal
  if (totalDamage >= totalPlayerHealth * 0.9) {
    return { actions, totalDamage };
  }
  
  return null;
};

// Plan power spike deployment
const planPowerSpikeDeployment = (hand, field, playerField, energy, maxFieldSize) => {
  const affordableCreatures = hand.filter(c => 
    (c.battleStats?.energyCost || 3) <= energy
  );
  
  if (affordableCreatures.length === 0) return null;
  
  // Find creatures that would create power spikes
  const spikeCreatures = affordableCreatures.filter(creature => {
    const power = Math.max(
      creature.battleStats?.physicalAttack || 0,
      creature.battleStats?.magicalAttack || 0
    );
    
    // High power, legendary/epic, or synergistic
    return power > 30 || 
           creature.rarity === 'Legendary' || 
           creature.rarity === 'Epic' ||
           calculateFieldSynergy(creature, field) > 3;
  });
  
  if (spikeCreatures.length > 0) {
    const best = spikeCreatures[0];
    return {
      type: 'deploy',
      creature: best,
      energyCost: best.battleStats?.energyCost || 3
    };
  }
  
  return null;
};

// Find synergistic tool play
const findSynergisticToolPlay = (tools, field, playerField, boardAnalysis) => {
  // Look for tool + creature combos
  
  // Surge + High attack creature
  const surgeTool = tools.find(t => t.tool_effect === 'Surge');
  if (surgeTool) {
    const bestAttacker = findStrongestAttacker(field);
    if (bestAttacker && playerField.length > 0) {
      return {
        type: 'useTool',
        tool: surgeTool,
        target: bestAttacker,
        energyCost: 0
      };
    }
  }
  
  // Shield + Valuable low health creature
  const shieldTool = tools.find(t => t.tool_effect === 'Shield');
  if (shieldTool && boardAnalysis.immediateThreats.length > 0) {
    const mostValuable = boardAnalysis.immediateThreats.reduce((best, current) => {
      if (!best) return current;
      
      const bestValue = calculateCreatureValue(best);
      const currentValue = calculateCreatureValue(current);
      
      return currentValue > bestValue ? current : best;
    }, null);
    
    if (mostValuable) {
      return {
        type: 'useTool',
        tool: shieldTool,
        target: mostValuable,
        energyCost: 0
      };
    }
  }
  
  // Echo + Creature about to attack multiple times
  const echoTool = tools.find(t => t.tool_effect === 'Echo');
  if (echoTool && boardAnalysis.shouldAttackAggressively) {
    const bestTarget = field[0]; // Simplified
    return {
      type: 'useTool',
      tool: echoTool,
      target: bestTarget,
      energyCost: 0
    };
  }
  
  return null;
};

// Find optimal spell timing
const findOptimalSpellTiming = (spells, field, playerField, boardAnalysis) => {
  // Prioritize spells based on board state
  
  if (boardAnalysis.weakEnemies.length >= 2) {
    // AOE or high damage spell
    const damageSpell = spells.find(s => 
      s.spell_effect === 'Surge' || s.spell_type === 'magic'
    );
    
    if (damageSpell) {
      const caster = findBestSpellCaster(field, damageSpell);
      const target = boardAnalysis.weakEnemies[0];
      
      if (caster && target) {
        return {
          type: 'useSpell',
          spell: damageSpell,
          caster: caster,
          target: target,
          energyCost: 4
        };
      }
    }
  }
  
  return null;
};

// Plan coordinated assault
const planCoordinatedAssault = (field, playerField, energy, boardAnalysis) => {
  const availableAttackers = field.filter(c => !c.isDefending);
  
  if (availableAttackers.length === 0 || playerField.length === 0) return null;
  
  // Find best single attack for hard AI
  let bestScore = -1;
  let bestAttack = null;
  
  availableAttackers.forEach(attacker => {
    playerField.forEach(target => {
      const damage = estimateAttackDamage(attacker, target);
      let score = damage;
      
      // Heavily weight eliminations
      if (damage >= target.currentHealth) score += 100;
      
      // Weight by target threat
      const targetThreat = Math.max(
        target.battleStats?.physicalAttack || 0,
        target.battleStats?.magicalAttack || 0
      );
      score += targetThreat * 0.5;
      
      if (score > bestScore) {
        bestScore = score;
        bestAttack = {
          type: 'attack',
          attacker: attacker,
          target: target,
          energyCost: 2
        };
      }
    });
  });
  
  return bestAttack;
};

// Find value trades
const findValueTrade = (field, playerField, energy) => {
  if (energy < 2 || field.length === 0 || playerField.length === 0) return null;
  
  // Look for trades where we eliminate higher value targets
  const trades = [];
  
  field.forEach(attacker => {
    if (attacker.isDefending) return;
    
    playerField.forEach(target => {
      const damage = estimateAttackDamage(attacker, target);
      
      if (damage >= target.currentHealth) {
        const ourValue = calculateCreatureValue(attacker);
        const theirValue = calculateCreatureValue(target);
        
        trades.push({
          attacker: attacker,
          target: target,
          valueRatio: theirValue / Math.max(ourValue, 1),
          damage: damage
        });
      }
    });
  });
  
  // Sort by value ratio (higher = better trade)
  trades.sort((a, b) => b.valueRatio - a.valueRatio);
  
  if (trades.length > 0 && trades[0].valueRatio > 0.8) {
    return {
      type: 'attack',
      attacker: trades[0].attacker,
      target: trades[0].target,
      energyCost: 2
    };
  }
  
  return null;
};

// Plan emergency defense
const planEmergencyDefense = (field, tools, threatenedCreature) => {
  // First try tools
  if (tools.length > 0) {
    const defensiveTool = findBestDefensiveItem(tools, threatenedCreature);
    if (defensiveTool) {
      return {
        type: 'useTool',
        tool: defensiveTool,
        target: threatenedCreature,
        energyCost: 0
      };
    }
  }
  
  // Then defend action
  if (!threatenedCreature.isDefending) {
    return {
      type: 'defend',
      creature: threatenedCreature,
      energyCost: 1
    };
  }
  
  return null;
};

// Expert AI with perfect play and item mastery
const determineExpertAIActionWithItems = (
  enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
) => {
  // Expert AI uses the enhanced multi-action planning system
  const settings = getDifficultySettings('expert');
  const actionPlan = planOptimalActionsWithItems(
    'expert', 
    enemyHand, 
    enemyField, 
    playerField, 
    enemyTools, 
    enemySpells, 
    enemyEnergy, 
    maxFieldSize, 
    settings
  );
  
  if (actionPlan && actionPlan.length > 0) {
    return actionPlan[0];
  }
  
  // Fallback to hard AI logic
  return determineHardAIActionWithItems(
    enemyHand, enemyField, playerField, enemyTools, enemySpells, enemyEnergy, maxFieldSize
  );
};

// Get tool effectiveness for AI decision making
const getToolEffectiveness = (tool, target, boardState) => {
  let score = 0;
  
  // Base score from rarity
  const rarityScores = { 'Legendary': 40, 'Epic': 30, 'Rare': 20, 'Common': 10 };
  score += rarityScores[tool.rarity] || 10;
  
  // Effect-specific scoring
  switch (tool.tool_effect) {
    case 'Surge':
      // Best on high attack creatures
      const attackPower = Math.max(
        target.battleStats?.physicalAttack || 0,
        target.battleStats?.magicalAttack || 0
      );
      score += attackPower * 2;
      break;
      
    case 'Shield':
      // Best on low health valuable creatures
      const healthPercent = target.currentHealth / (target.battleStats?.maxHealth || 50);
      score += (1 - healthPercent) * 50;
      score += calculateCreatureValue(target) * 0.5;
      break;
      
    case 'Echo':
      // Best on creatures with good stats overall
      score += Object.values(target.stats || {}).reduce((sum, val) => sum + val, 0);
      break;
      
    case 'Drain':
      // Best when we need offense
      if (boardState && boardState.shouldAttackAggressively) {
        score += 30;
      }
      break;
      
    case 'Charge':
      // Best when we have time to build up
      if (boardState && boardState.boardTension < 0.5) {
        score += 25;
      }
      break;
  }
  
  return score;
};

// Helper: Get rarity value
const getRarityValue = (rarity) => {
  switch (rarity) {
    case 'Legendary': return 4;
    case 'Epic': return 3;
    case 'Rare': return 2;
    default: return 1;
  }
};

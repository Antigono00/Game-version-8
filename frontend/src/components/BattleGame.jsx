// src/components/BattleGame.jsx - FIXED PRODUCTION VERSION
import React, { useState, useEffect, useContext, useCallback, useReducer } from 'react';
import { GameContext } from '../context/GameContext';
import { useRadixConnect } from '../context/RadixConnectContext';
import Battlefield from './battle/Battlefield';
import PlayerHand from './battle/PlayerHand';
import ActionPanel from './battle/ActionPanel';
import BattleLog from './battle/BattleLog';
import BattleHeader from './battle/BattleHeader';
import DifficultySelector from './battle/DifficultySelector';
import BattleResult from './battle/BattleResult';
import { calculateDerivedStats } from '../utils/battleCalculations';
import { determineAIAction } from '../utils/battleAI';
import { processAttack, applyTool, applySpell, defendCreature } from '../utils/battleCore';
import { generateEnemyCreatures, getDifficultySettings, generateEnemyItems } from '../utils/difficultySettings';

// BALANCED CONSTANTS for strategic gameplay
const ATTACK_ENERGY_COST = 2;           
const DEFEND_ENERGY_COST = 1;           
const BASE_ENERGY_REGEN = 3;            
const SPELL_ENERGY_COST = 4;            
const TOOL_ENERGY_COST = 0;             
const MAX_ENERGY = 15;                  
const ENERGY_DECAY_RATE = 0.1;          

// Action types for our reducer
const ACTIONS = {
  START_BATTLE: 'START_BATTLE',
  DEPLOY_CREATURE: 'DEPLOY_CREATURE',
  ENEMY_DEPLOY_CREATURE: 'ENEMY_DEPLOY_CREATURE',
  UPDATE_CREATURE: 'UPDATE_CREATURE',
  ATTACK: 'ATTACK',
  USE_TOOL: 'USE_TOOL',
  USE_SPELL: 'USE_SPELL',
  DEFEND: 'DEFEND',
  DRAW_CARD: 'DRAW_CARD',
  REGENERATE_ENERGY: 'REGENERATE_ENERGY',
  APPLY_ENERGY_DECAY: 'APPLY_ENERGY_DECAY',
  SET_ACTIVE_PLAYER: 'SET_ACTIVE_PLAYER',
  INCREMENT_TURN: 'INCREMENT_TURN',
  SET_GAME_STATE: 'SET_GAME_STATE',
  APPLY_ONGOING_EFFECTS: 'APPLY_ONGOING_EFFECTS',
  ADD_LOG: 'ADD_LOG',
  SPEND_ENERGY: 'SPEND_ENERGY',
  EXECUTE_AI_ACTION: 'EXECUTE_AI_ACTION',
  EXECUTE_AI_ACTION_SEQUENCE: 'EXECUTE_AI_ACTION_SEQUENCE',
  COMBO_BONUS: 'COMBO_BONUS'
};

// FIXED: Calculate energy cost for a creature (higher forms cost MORE)
const calculateCreatureEnergyCost = (creature) => {
  // Base cost depends on form: Form 0 = 5, Form 1 = 6, Form 2 = 7, Form 3 = 8
  let energyCost = 5; // Base cost for form 0
  
  // Add cost based on form
  if (creature.form !== undefined && creature.form !== null) {
    energyCost += creature.form; // Form 0 = 5, Form 1 = 6, Form 2 = 7, Form 3 = 8
  }
  
  // No additional cost modifiers for rarity to keep it simple
  // This keeps the costs exactly as requested: 5, 6, 7, 8
  
  return energyCost;
};

// ENHANCED Battle state reducer with better energy management
const battleReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.START_BATTLE:
      return {
        ...state,
        gameState: 'battle',
        playerDeck: action.playerDeck,
        playerHand: action.playerHand,
        playerField: [],
        enemyDeck: action.enemyDeck,
        enemyHand: action.enemyHand,
        enemyField: [],
        playerEnergy: 10,
        enemyEnergy: 10,       
        turn: 1,
        activePlayer: 'player',
        battleLog: [{
          id: Date.now(),
          turn: 1,
          message: `Battle started! Difficulty: ${action.difficulty.charAt(0).toUpperCase() + action.difficulty.slice(1)} - Prepare for intense combat!`
        }],
        playerTools: action.playerTools,
        playerSpells: action.playerSpells,
        enemyTools: action.enemyTools || [],
        enemySpells: action.enemySpells || [],
        difficulty: action.difficulty,
        consecutiveActions: { player: 0, enemy: 0 },
        energyMomentum: { player: 0, enemy: 0 }
      };
    
    case ACTIONS.DEPLOY_CREATURE:
      const deployEnergyCost = action.energyCost || action.creature.battleStats.energyCost || 3;
      
      // FIXED: Prevent negative energy
      if (state.playerEnergy < deployEnergyCost) {
        console.error("Not enough energy to deploy creature");
        return state;
      }
      
      return {
        ...state,
        playerHand: state.playerHand.filter(c => c.id !== action.creature.id),
        playerField: [...state.playerField, action.creature],
        playerEnergy: Math.max(0, state.playerEnergy - deployEnergyCost),
        consecutiveActions: { ...state.consecutiveActions, player: state.consecutiveActions.player + 1 },
        energyMomentum: { ...state.energyMomentum, player: state.energyMomentum.player + deployEnergyCost }
      };
    
    case ACTIONS.ENEMY_DEPLOY_CREATURE:
      console.log(`REDUCER: Deploying enemy creature ${action.creature.species_name} to field`);
      
      const enemyDeployCost = action.energyCost || action.creature.battleStats.energyCost || 3;
      
      // FIXED: Prevent negative energy and duplicate deployment
      if (state.enemyEnergy < enemyDeployCost) {
        console.error("Enemy doesn't have enough energy to deploy");
        return state;
      }
      
      // FIXED: Check if creature already on field
      if (state.enemyField.some(c => c.id === action.creature.id)) {
        console.error("Creature already deployed!");
        return state;
      }
      
      const newEnemyField = [...state.enemyField, action.creature];
      
      return {
        ...state,
        enemyHand: state.enemyHand.filter(c => c.id !== action.creature.id),
        enemyField: newEnemyField,
        enemyEnergy: Math.max(0, state.enemyEnergy - enemyDeployCost),
        consecutiveActions: { ...state.consecutiveActions, enemy: state.consecutiveActions.enemy + 1 },
        energyMomentum: { ...state.energyMomentum, enemy: state.energyMomentum.enemy + enemyDeployCost }
      };
    
    case ACTIONS.UPDATE_CREATURE:
      if (action.isPlayer) {
        return {
          ...state,
          playerField: state.playerField.map(c => 
            c.id === action.creature.id ? action.creature : c
          )
        };
      } else {
        return {
          ...state,
          enemyField: state.enemyField.map(c => 
            c.id === action.creature.id ? action.creature : c
          )
        };
      }
    
    case ACTIONS.ATTACK:
      const { attackResult } = action;
      const isPlayerAttacker = state.playerField.some(c => c.id === attackResult.updatedAttacker.id);
      const isPlayerDefender = state.playerField.some(c => c.id === attackResult.updatedDefender.id);
      
      // Apply combo damage bonus for consecutive attacks
      let comboMultiplier = 1.0;
      if (isPlayerAttacker && state.consecutiveActions.player > 1) {
        comboMultiplier = 1 + (state.consecutiveActions.player * 0.05);
      } else if (!isPlayerAttacker && state.consecutiveActions.enemy > 1) {
        comboMultiplier = 1 + (state.consecutiveActions.enemy * 0.05);
      }
      
      // FIXED: Validate energy before spending
      if (isPlayerAttacker && state.playerEnergy < action.energyCost) {
        console.error("Not enough energy for attack");
        return state;
      }
      if (!isPlayerAttacker && state.enemyEnergy < action.energyCost) {
        console.error("Enemy doesn't have enough energy for attack");
        return state;
      }
      
      // Spend energy for attack
      const updatedPlayerEnergy = isPlayerAttacker 
        ? Math.max(0, state.playerEnergy - action.energyCost)
        : state.playerEnergy;
        
      const updatedEnemyEnergy = !isPlayerAttacker 
        ? Math.max(0, state.enemyEnergy - action.energyCost)
        : state.enemyEnergy;
      
      return {
        ...state,
        playerEnergy: updatedPlayerEnergy,
        enemyEnergy: updatedEnemyEnergy,
        playerField: state.playerField.map(c => {
          if (isPlayerAttacker && c.id === attackResult.updatedAttacker.id) {
            return attackResult.updatedAttacker;
          }
          if (isPlayerDefender && c.id === attackResult.updatedDefender.id) {
            return attackResult.updatedDefender;
          }
          return c;
        }).filter(c => c.currentHealth > 0),
        enemyField: state.enemyField.map(c => {
          if (!isPlayerAttacker && c.id === attackResult.updatedAttacker.id) {
            return attackResult.updatedAttacker;
          }
          if (!isPlayerDefender && c.id === attackResult.updatedDefender.id) {
            return attackResult.updatedDefender;
          }
          return c;
        }).filter(c => c.currentHealth > 0),
        consecutiveActions: isPlayerAttacker 
          ? { ...state.consecutiveActions, player: state.consecutiveActions.player + 1 }
          : { ...state.consecutiveActions, enemy: state.consecutiveActions.enemy + 1 },
        energyMomentum: isPlayerAttacker
          ? { ...state.energyMomentum, player: state.energyMomentum.player + action.energyCost }
          : { ...state.energyMomentum, enemy: state.energyMomentum.enemy + action.energyCost }
      };
    
    case ACTIONS.USE_TOOL:
      const isPlayerToolTarget = state.playerField.some(c => c.id === action.result.updatedCreature.id);
      
      if (!action.result || !action.result.updatedCreature) {
        console.error("Invalid tool result:", action.result);
        return state;
      }
      
      return {
        ...state,
        playerField: isPlayerToolTarget
          ? state.playerField.map(c => c.id === action.result.updatedCreature.id ? action.result.updatedCreature : c)
          : state.playerField,
        enemyField: !isPlayerToolTarget
          ? state.enemyField.map(c => c.id === action.result.updatedCreature.id ? action.result.updatedCreature : c)
          : state.enemyField,
        playerTools: action.isPlayerTool ? state.playerTools.filter(t => t.id !== action.tool.id) : state.playerTools,
        enemyTools: action.isEnemyTool ? state.enemyTools.filter(t => t.id !== action.tool.id) : state.enemyTools,
        consecutiveActions: action.isPlayerTool
          ? { ...state.consecutiveActions, player: state.consecutiveActions.player + 1 }
          : { ...state.consecutiveActions, enemy: state.consecutiveActions.enemy + 1 }
      };
    
    case ACTIONS.USE_SPELL:
      const { spellResult, spell } = action;
      
      if (!spellResult || !spellResult.updatedCaster || !spellResult.updatedTarget) {
        console.error("Invalid spell result:", spellResult);
        return state;
      }
      
      const isPlayerCaster = state.playerField.some(c => c.id === spellResult.updatedCaster.id);
      const isPlayerTarget = state.playerField.some(c => c.id === spellResult.updatedTarget.id);
      
      // FIXED: Validate energy
      if (isPlayerCaster && state.playerEnergy < (action.energyCost || SPELL_ENERGY_COST)) {
        console.error("Not enough energy for spell");
        return state;
      }
      if (!isPlayerCaster && state.enemyEnergy < (action.energyCost || SPELL_ENERGY_COST)) {
        console.error("Enemy doesn't have enough energy for spell");
        return state;
      }
      
      return {
        ...state,
        playerField: state.playerField.map(c => {
          if (isPlayerCaster && c.id === spellResult.updatedCaster.id) {
            return spellResult.updatedCaster;
          }
          if (isPlayerTarget && c.id === spellResult.updatedTarget.id) {
            return spellResult.updatedTarget;
          }
          return c;
        }).filter(c => c.currentHealth > 0),
        enemyField: state.enemyField.map(c => {
          if (!isPlayerCaster && c.id === spellResult.updatedCaster.id) {
            return spellResult.updatedCaster;
          }
          if (!isPlayerTarget && c.id === spellResult.updatedTarget.id) {
            return spellResult.updatedTarget;
          }
          return c;
        }).filter(c => c.currentHealth > 0),
        playerEnergy: isPlayerCaster ? Math.max(0, state.playerEnergy - (action.energyCost || SPELL_ENERGY_COST)) : state.playerEnergy,
        enemyEnergy: !isPlayerCaster ? Math.max(0, state.enemyEnergy - (action.energyCost || SPELL_ENERGY_COST)) : state.enemyEnergy,
        playerSpells: isPlayerCaster ? state.playerSpells.filter(s => s.id !== spell.id) : state.playerSpells,
        enemySpells: action.isEnemySpell ? state.enemySpells.filter(s => s.id !== spell.id) : state.enemySpells,
        consecutiveActions: isPlayerCaster
          ? { ...state.consecutiveActions, player: state.consecutiveActions.player + 1 }
          : { ...state.consecutiveActions, enemy: state.consecutiveActions.enemy + 1 },
        energyMomentum: isPlayerCaster
          ? { ...state.energyMomentum, player: state.energyMomentum.player + (action.energyCost || SPELL_ENERGY_COST) }
          : { ...state.energyMomentum, enemy: state.energyMomentum.enemy + (action.energyCost || SPELL_ENERGY_COST) }
      };
    
    case ACTIONS.DEFEND:
      const isPlayerDefending = state.playerField.some(c => c.id === action.updatedCreature.id);
      
      // FIXED: Validate energy
      if (isPlayerDefending && state.playerEnergy < DEFEND_ENERGY_COST) {
        console.error("Not enough energy to defend");
        return state;
      }
      if (!isPlayerDefending && state.enemyEnergy < DEFEND_ENERGY_COST) {
        console.error("Enemy doesn't have enough energy to defend");
        return state;
      }
      
      const playerEnergyAfterDefend = isPlayerDefending 
        ? Math.max(0, state.playerEnergy - DEFEND_ENERGY_COST)
        : state.playerEnergy;
        
      const enemyEnergyAfterDefend = !isPlayerDefending 
        ? Math.max(0, state.enemyEnergy - DEFEND_ENERGY_COST)
        : state.enemyEnergy;
      
      return {
        ...state,
        playerEnergy: playerEnergyAfterDefend,
        enemyEnergy: enemyEnergyAfterDefend,
        playerField: isPlayerDefending
          ? state.playerField.map(c => c.id === action.updatedCreature.id ? action.updatedCreature : c)
          : state.playerField,
        enemyField: !isPlayerDefending
          ? state.enemyField.map(c => c.id === action.updatedCreature.id ? action.updatedCreature : c)
          : state.enemyField,
        consecutiveActions: isPlayerDefending
          ? { ...state.consecutiveActions, player: state.consecutiveActions.player + 1 }
          : { ...state.consecutiveActions, enemy: state.consecutiveActions.enemy + 1 }
      };
    
    case ACTIONS.SPEND_ENERGY:
      if (action.player === 'player') {
        return {
          ...state,
          playerEnergy: Math.max(0, state.playerEnergy - action.amount)
        };
      } else {
        return {
          ...state,
          enemyEnergy: Math.max(0, state.enemyEnergy - action.amount)
        };
      }
    
    case ACTIONS.DRAW_CARD:
      if (action.player === 'player') {
        if (state.playerDeck.length === 0) return state;
        const drawnCard = state.playerDeck[0];
        return {
          ...state,
          playerHand: [...state.playerHand, drawnCard],
          playerDeck: state.playerDeck.slice(1)
        };
      } else {
        if (state.enemyDeck.length === 0) return state;
        const drawnCard = state.enemyDeck[0];
        return {
          ...state,
          enemyHand: [...state.enemyHand, drawnCard],
          enemyDeck: state.enemyDeck.slice(1)
        };
      }
    
    case ACTIONS.REGENERATE_ENERGY:
      // Apply energy momentum bonus
      const playerMomentumBonus = Math.floor(state.energyMomentum.player / 10);
      const enemyMomentumBonus = Math.floor(state.energyMomentum.enemy / 10);
      
      return {
        ...state,
        playerEnergy: Math.min(MAX_ENERGY, state.playerEnergy + action.playerRegen + playerMomentumBonus),
        enemyEnergy: Math.min(MAX_ENERGY, state.enemyEnergy + action.enemyRegen + enemyMomentumBonus),
        energyMomentum: { player: 0, enemy: 0 }
      };
    
    case ACTIONS.APPLY_ENERGY_DECAY:
      // Apply energy decay to prevent hoarding
      const playerDecay = Math.floor(state.playerEnergy * ENERGY_DECAY_RATE);
      const enemyDecay = Math.floor(state.enemyEnergy * ENERGY_DECAY_RATE);
      
      return {
        ...state,
        playerEnergy: Math.max(0, state.playerEnergy - playerDecay),
        enemyEnergy: Math.max(0, state.enemyEnergy - enemyDecay)
      };
    
    case ACTIONS.SET_ACTIVE_PLAYER:
      // Reset consecutive actions when switching players
      return {
        ...state,
        activePlayer: action.player,
        consecutiveActions: { player: 0, enemy: 0 }
      };
    
    case ACTIONS.INCREMENT_TURN:
      return {
        ...state,
        turn: state.turn + 1
      };
    
    case ACTIONS.SET_GAME_STATE:
      return {
        ...state,
        gameState: action.gameState
      };
    
    case ACTIONS.APPLY_ONGOING_EFFECTS: {
      // Process player field effects
      const processedPlayerField = state.playerField.map(creature => {
        let updatedCreature = { ...creature };
        
        // Process active effects
        const activeEffects = updatedCreature.activeEffects || [];
        if (activeEffects.length > 0) {
          const remainingEffects = [];
          let effectLog = [];
          
          activeEffects.forEach(effect => {
            if (!effect) return;
            
            // Apply effect
            if (effect.healthEffect) {
              const previousHealth = updatedCreature.currentHealth;
              updatedCreature.currentHealth = Math.min(
                updatedCreature.battleStats.maxHealth,
                Math.max(0, updatedCreature.currentHealth + effect.healthEffect)
              );
              
              const healthChange = updatedCreature.currentHealth - previousHealth;
              if (healthChange !== 0) {
                const changeType = healthChange > 0 ? 'healed' : 'damaged';
                const amount = Math.abs(healthChange);
                effectLog.push(`${updatedCreature.species_name} ${changeType} for ${amount} from ${effect.name}`);
              }
            }
            
            if (effect.statEffect) {
              Object.entries(effect.statEffect).forEach(([stat, value]) => {
                if (updatedCreature.battleStats[stat] !== undefined) {
                  updatedCreature.battleStats[stat] += value;
                }
              });
            }
            
            const updatedEffect = { ...effect, duration: effect.duration - 1 };
            
            if (updatedEffect.duration > 0) {
              remainingEffects.push(updatedEffect);
            } else {
              effectLog.push(`${effect.name} effect has expired on ${updatedCreature.species_name}`);
            }
          });
          
          updatedCreature.activeEffects = remainingEffects;
          
          if (effectLog.length > 0 && action.addLog) {
            action.addLog(effectLog.join('. '));
          }
        }
        
        // Reset defending status
        if (updatedCreature.isDefending) {
          updatedCreature.isDefending = false;
        }
        
        return updatedCreature;
      });
      
      // Process enemy field effects
      const processedEnemyField = state.enemyField.map(creature => {
        let updatedCreature = { ...creature };
        
        const activeEffects = updatedCreature.activeEffects || [];
        if (activeEffects.length > 0) {
          const remainingEffects = [];
          let effectLog = [];
          
          activeEffects.forEach(effect => {
            if (!effect) return;
            
            if (effect.healthEffect) {
              const previousHealth = updatedCreature.currentHealth;
              updatedCreature.currentHealth = Math.min(
                updatedCreature.battleStats.maxHealth,
                Math.max(0, updatedCreature.currentHealth + effect.healthEffect)
              );
              
              const healthChange = updatedCreature.currentHealth - previousHealth;
              if (healthChange !== 0) {
                const changeType = healthChange > 0 ? 'healed' : 'damaged';
                const amount = Math.abs(healthChange);
                effectLog.push(`Enemy ${updatedCreature.species_name} ${changeType} for ${amount} from ${effect.name}`);
              }
            }
            
            if (effect.statEffect) {
              Object.entries(effect.statEffect).forEach(([stat, value]) => {
                if (updatedCreature.battleStats[stat] !== undefined) {
                  updatedCreature.battleStats[stat] += value;
                }
              });
            }
            
            const updatedEffect = { ...effect, duration: effect.duration - 1 };
            
            if (updatedEffect.duration > 0) {
              remainingEffects.push(updatedEffect);
            } else {
              effectLog.push(`${effect.name} effect has expired on Enemy ${updatedCreature.species_name}`);
            }
          });
          
          updatedCreature.activeEffects = remainingEffects;
          
          if (effectLog.length > 0 && action.addLog) {
            action.addLog(effectLog.join('. '));
          }
        }
        
        if (updatedCreature.isDefending) {
          updatedCreature.isDefending = false;
        }
        
        return updatedCreature;
      });
      
      // Filter out defeated creatures
      const updatedPlayerField = action.updatedPlayerField || 
        processedPlayerField.filter(c => c.currentHealth > 0);
      
      const updatedEnemyField = action.updatedEnemyField || 
        processedEnemyField.filter(c => c.currentHealth > 0);
      
      return {
        ...state,
        playerField: updatedPlayerField,
        enemyField: updatedEnemyField
      };
    }
    
    case ACTIONS.ADD_LOG:
      return {
        ...state,
        battleLog: [...state.battleLog, {
          id: Date.now() + Math.random(),
          turn: state.turn,
          message: action.message
        }]
      };
    
    case ACTIONS.EXECUTE_AI_ACTION:
      // Handle a single AI action with proper state management
      const { aiAction } = action;
      let updatedState = { ...state };
      
      switch (aiAction.type) {
        case 'deploy':
          if (aiAction.creature) {
            // FIXED: Validate energy and prevent duplicates
            const deployCost = aiAction.energyCost || 3;
            if (updatedState.enemyEnergy < deployCost) {
              console.error("AI tried to deploy without enough energy");
              break;
            }
            if (updatedState.enemyField.some(c => c.id === aiAction.creature.id)) {
              console.error("AI tried to deploy duplicate creature");
              break;
            }
            
            updatedState.enemyHand = updatedState.enemyHand.filter(c => c.id !== aiAction.creature.id);
            updatedState.enemyField = [...updatedState.enemyField, aiAction.creature];
            updatedState.enemyEnergy = Math.max(0, updatedState.enemyEnergy - deployCost);
            updatedState.consecutiveActions.enemy += 1;
            updatedState.energyMomentum.enemy += deployCost;
          }
          break;
          
        case 'attack':
          if (aiAction.attacker && aiAction.target) {
            const attackCost = aiAction.energyCost || 2;
            if (updatedState.enemyEnergy < attackCost) {
              console.error("AI tried to attack without enough energy");
              break;
            }
            
            const attackResult = processAttack(aiAction.attacker, aiAction.target);
            updatedState.enemyEnergy = Math.max(0, updatedState.enemyEnergy - attackCost);
            updatedState.consecutiveActions.enemy += 1;
            updatedState.energyMomentum.enemy += attackCost;
            
            // Update creatures based on attack results
            updatedState.playerField = updatedState.playerField.map(c => 
              c.id === attackResult.updatedDefender.id ? attackResult.updatedDefender : c
            ).filter(c => c.currentHealth > 0);
            
            updatedState.enemyField = updatedState.enemyField.map(c => 
              c.id === attackResult.updatedAttacker.id ? attackResult.updatedAttacker : c
            );
          }
          break;
          
        case 'defend':
          if (aiAction.creature) {
            const defendCost = aiAction.energyCost || 1;
            if (updatedState.enemyEnergy < defendCost) {
              console.error("AI tried to defend without enough energy");
              break;
            }
            
            const updatedDefender = defendCreature(aiAction.creature, state.difficulty);
            updatedState.enemyEnergy = Math.max(0, updatedState.enemyEnergy - defendCost);
            updatedState.consecutiveActions.enemy += 1;
            
            updatedState.enemyField = updatedState.enemyField.map(c => 
              c.id === updatedDefender.id ? updatedDefender : c
            );
          }
          break;
          
        case 'useTool':
          if (aiAction.tool && aiAction.target) {
            const result = applyTool(aiAction.target, aiAction.tool, state.difficulty);
            
            if (result && result.updatedCreature) {
              const isEnemyTarget = updatedState.enemyField.some(c => c.id === aiAction.target.id);
              
              if (isEnemyTarget) {
                updatedState.enemyField = updatedState.enemyField.map(c => 
                  c.id === result.updatedCreature.id ? result.updatedCreature : c
                );
              } else {
                updatedState.playerField = updatedState.playerField.map(c => 
                  c.id === result.updatedCreature.id ? result.updatedCreature : c
                );
              }
              
              updatedState.enemyTools = updatedState.enemyTools.filter(t => t.id !== aiAction.tool.id);
              updatedState.consecutiveActions.enemy += 1;
            }
          }
          break;
          
        case 'useSpell':
          if (aiAction.spell && aiAction.caster && aiAction.target) {
            const spellCost = aiAction.energyCost || SPELL_ENERGY_COST;
            if (updatedState.enemyEnergy < spellCost) {
              console.error("AI tried to cast spell without enough energy");
              break;
            }
            
            const spellResult = applySpell(aiAction.caster, aiAction.target, aiAction.spell, state.difficulty);
            
            if (spellResult) {
              updatedState.enemyEnergy = Math.max(0, updatedState.enemyEnergy - spellCost);
              updatedState.consecutiveActions.enemy += 1;
              updatedState.energyMomentum.enemy += spellCost;
              
              // Update caster and target
              updatedState.enemyField = updatedState.enemyField.map(c => {
                if (c.id === spellResult.updatedCaster.id) return spellResult.updatedCaster;
                if (c.id === spellResult.updatedTarget.id) return spellResult.updatedTarget;
                return c;
              }).filter(c => c.currentHealth > 0);
              
              updatedState.playerField = updatedState.playerField.map(c => {
                if (c.id === spellResult.updatedTarget.id) return spellResult.updatedTarget;
                return c;
              }).filter(c => c.currentHealth > 0);
              
              updatedState.enemySpells = updatedState.enemySpells.filter(s => s.id !== aiAction.spell.id);
            }
          }
          break;
      }
      
      return updatedState;
    
    case ACTIONS.EXECUTE_AI_ACTION_SEQUENCE:
      // Handle multiple AI actions in sequence
      let newState = { ...state };
      
      for (const aiAction of action.actionSequence) {
        // FIXED: Validate each action in the sequence
        const actionCost = aiAction.energyCost || 0;
        if (newState.enemyEnergy < actionCost) {
          console.log(`Skipping AI action ${aiAction.type} - not enough energy`);
          continue;
        }
        
        // Process each action in the sequence
        switch (aiAction.type) {
          case 'deploy':
            if (newState.enemyField.some(c => c.id === aiAction.creature.id)) {
              console.log("Skipping duplicate deployment");
              continue;
            }
            newState.enemyHand = newState.enemyHand.filter(c => c.id !== aiAction.creature.id);
            newState.enemyField = [...newState.enemyField, aiAction.creature];
            newState.enemyEnergy = Math.max(0, newState.enemyEnergy - aiAction.energyCost);
            break;
            
          case 'attack':
            const attackResult = processAttack(aiAction.attacker, aiAction.target);
            newState.enemyEnergy = Math.max(0, newState.enemyEnergy - aiAction.energyCost);
            
            // Update creatures based on attack results
            newState.playerField = newState.playerField.map(c => 
              c.id === attackResult.updatedDefender.id ? attackResult.updatedDefender : c
            ).filter(c => c.currentHealth > 0);
            
            newState.enemyField = newState.enemyField.map(c => 
              c.id === attackResult.updatedAttacker.id ? attackResult.updatedAttacker : c
            );
            break;
            
          case 'defend':
            const updatedDefender = defendCreature(aiAction.creature);
            newState.enemyEnergy = Math.max(0, newState.enemyEnergy - aiAction.energyCost);
            
            newState.enemyField = newState.enemyField.map(c => 
              c.id === updatedDefender.id ? updatedDefender : c
            );
            break;
        }
      }
      
      return newState;
    
    case ACTIONS.COMBO_BONUS:
      // Apply combo bonuses for consecutive actions
      const comboLevel = action.player === 'player' 
        ? state.consecutiveActions.player 
        : state.consecutiveActions.enemy;
      
      if (comboLevel >= 3) {
        // Apply a bonus effect to all creatures
        const field = action.player === 'player' ? 'playerField' : 'enemyField';
        
        return {
          ...state,
          [field]: state[field].map(creature => ({
            ...creature,
            battleStats: {
              ...creature.battleStats,
              physicalAttack: creature.battleStats.physicalAttack + 2,
              magicalAttack: creature.battleStats.magicalAttack + 2
            }
          }))
        };
      }
      
      return state;
    
    default:
      return state;
  }
};

const BattleGame = ({ onClose }) => {
  const { creatureNfts, toolNfts, spellNfts, addNotification } = useContext(GameContext);
  const { connected, accounts } = useRadixConnect();
  
  // ========== UI STATE ==========
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [targetCreature, setTargetCreature] = useState(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [actionInProgress, setActionInProgress] = useState(false);
  
  // ========== BATTLE STATE ==========
  const [state, dispatch] = useReducer(battleReducer, {
    gameState: 'setup',
    turn: 1,
    activePlayer: 'player',
    difficulty: 'easy',
    
    // Player state
    playerDeck: [],
    playerHand: [],
    playerField: [],
    playerEnergy: 10,
    playerTools: [],
    playerSpells: [],
    
    // Enemy state
    enemyDeck: [],
    enemyHand: [],
    enemyField: [],
    enemyEnergy: 10,
    enemyTools: [],
    enemySpells: [],
    
    // Battle log
    battleLog: [],
    
    // Combat tracking
    consecutiveActions: { player: 0, enemy: 0 },
    energyMomentum: { player: 0, enemy: 0 }
  });
  
  // Destructure state for easier access
  const {
    gameState,
    turn,
    activePlayer,
    playerDeck,
    playerHand,
    playerField,
    playerEnergy,
    playerTools,
    playerSpells,
    enemyDeck,
    enemyHand,
    enemyField,
    enemyEnergy,
    enemyTools,
    enemySpells,
    battleLog,
    consecutiveActions,
    energyMomentum
  } = state;
  
  // ========== INITIALIZATION ==========
  useEffect(() => {
    if (creatureNfts && creatureNfts.length > 0) {
      const battleCreatures = creatureNfts.map(creature => {
        const derivedStats = calculateDerivedStats(creature);
        
        return {
          ...creature,
          battleStats: derivedStats,
          currentHealth: derivedStats.maxHealth,
          activeEffects: [],
          isDefending: false
        };
      });
    }
  }, [creatureNfts]);
  
  // ========== BATTLE LOG ==========
  const addToBattleLog = useCallback((message) => {
    dispatch({ type: ACTIONS.ADD_LOG, message });
  }, []);
  
  // ========== BATTLE MECHANICS ==========
  // Regenerate energy with balanced scaling
  const regenerateEnergy = useCallback(() => {
    // Calculate player energy bonus from total energy stats of deployed creatures
    let playerTotalEnergy = 0;
    playerField.forEach(creature => {
      if (creature.stats && creature.stats.energy) {
        playerTotalEnergy += creature.stats.energy;
      }
    });
    // For every 50 energy points total, get +1 energy per turn
    const playerBonus = Math.floor(playerTotalEnergy / 50);
    
    // Calculate enemy energy bonus from total energy stats of deployed creatures
    let enemyTotalEnergy = 0;
    enemyField.forEach(creature => {
      if (creature.stats && creature.stats.energy) {
        enemyTotalEnergy += creature.stats.energy;
      }
    });
    // For every 50 energy points total, get +1 energy per turn
    const enemyBonus = Math.floor(enemyTotalEnergy / 50);
    
    // Add difficulty-based energy regen bonuses for enemies
    const difficultySettings = getDifficultySettings(difficulty);
    const enemyDifficultyBonus = Math.floor(difficultySettings.enemyEnergyRegen || 0) - 2;
    
    // Total regeneration amounts
    const playerRegen = BASE_ENERGY_REGEN + playerBonus;
    const enemyRegen = BASE_ENERGY_REGEN + enemyBonus + enemyDifficultyBonus;
    
    console.log(`Energy Regen - Player: +${playerRegen} (${playerTotalEnergy} total energy), Enemy: +${enemyRegen} (${enemyTotalEnergy} total energy)`);
    
    dispatch({ type: ACTIONS.REGENERATE_ENERGY, playerRegen, enemyRegen });
    
    if (activePlayer === 'player') {
      addToBattleLog(`You gained +${playerRegen} energy. (${playerTotalEnergy} total creature energy)`);
    } else {
      addToBattleLog(`Enemy gained +${enemyRegen} energy.`);
    }
  }, [activePlayer, playerField, enemyField, difficulty, addToBattleLog]);
  
  // Apply energy decay to prevent hoarding
  const applyEnergyDecay = useCallback(() => {
    if (playerEnergy > 10 || enemyEnergy > 10) {
      dispatch({ type: ACTIONS.APPLY_ENERGY_DECAY });
      console.log("Applied energy decay to prevent hoarding");
    }
  }, [playerEnergy, enemyEnergy]);
  
  // Apply ongoing effects
  const applyOngoingEffects = useCallback(() => {
    console.log("Applying ongoing effects...");
    
    dispatch({ 
      type: ACTIONS.APPLY_ONGOING_EFFECTS,
      addLog: addToBattleLog
    });
  }, [dispatch, addToBattleLog]);
  
  // Check for win condition
  const checkWinCondition = useCallback(() => {
    const result = enemyField.length === 0 && enemyHand.length === 0 && enemyDeck.length === 0;
    return result;
  }, [enemyField, enemyHand, enemyDeck]);
  
  // Check for loss condition  
  const checkLossCondition = useCallback(() => {
    const result = playerField.length === 0 && playerHand.length === 0 && playerDeck.length === 0;
    return result;
  }, [playerField, playerHand, playerDeck]);
  
  // ========== PLAYER ACTIONS ==========
  // Deploy a creature from hand to field
  const deployCreature = useCallback((creature) => {
    if (!creature) return;
    
    // Get max field size for player
    const maxPlayerFieldSize = 4;
    
    if (playerField.length >= maxPlayerFieldSize) {
      addToBattleLog("Your battlefield is full! Cannot deploy more creatures.");
      return;
    }
    
    const energyCost = creature.battleStats.energyCost || 3;
    if (playerEnergy < energyCost) {
      addToBattleLog(`Not enough energy to deploy ${creature.species_name}. Needs ${energyCost} energy.`);
      return;
    }
    
    dispatch({ type: ACTIONS.DEPLOY_CREATURE, creature, energyCost });
    
    // Check for deployment combo
    let comboMessage = '';
    if (consecutiveActions.player > 0) {
      comboMessage = ` Combo x${consecutiveActions.player + 1}!`;
    }
    
    addToBattleLog(`You deployed ${creature.species_name} to the battlefield! (-${energyCost} energy)${comboMessage}`);
    
    console.log(`Deployed ${creature.species_name} to player field`);
  }, [playerField, playerEnergy, consecutiveActions, addToBattleLog]);
  
  // Attack with a creature
  const attackCreature = useCallback((attacker, defender) => {
    if (!attacker || !defender) {
      addToBattleLog("Invalid attack - missing attacker or defender");
      return;
    }
    
    const isPlayerAttacker = playerField.some(c => c.id === attacker.id);
    if (isPlayerAttacker && playerEnergy < ATTACK_ENERGY_COST) {
      addToBattleLog(`Not enough energy to attack. Needs ${ATTACK_ENERGY_COST} energy.`);
      return;
    }
    
    // Calculate attack type (physical or magical)
    const attackType = attacker.battleStats.physicalAttack > attacker.battleStats.magicalAttack 
      ? 'physical' 
      : 'magical';
    
    // Process attack
    const attackResult = processAttack(attacker, defender, attackType);
    
    // Update attacker and defender in state
    dispatch({ 
      type: ACTIONS.ATTACK, 
      attackResult,
      energyCost: ATTACK_ENERGY_COST
    });
    
    // Add combo message if applicable
    let comboMessage = '';
    if (isPlayerAttacker && consecutiveActions.player > 0) {
      comboMessage = ` Combo x${consecutiveActions.player + 1}!`;
    }
    
    // Log attack result and energy cost
    const energyMessage = isPlayerAttacker ? ` (-${ATTACK_ENERGY_COST} energy)` : '';
    addToBattleLog(attackResult.battleLog + energyMessage + comboMessage);
  }, [playerField, playerEnergy, consecutiveActions, addToBattleLog]);
  
  // Use a tool on a creature
  const useTool = useCallback((tool, targetCreature, isPlayerTool = true) => {
    if (!tool || !targetCreature) {
      addToBattleLog("Invalid tool use - missing tool or target");
      return;
    }
    
    console.log("Using tool:", tool);
    console.log("Target creature:", targetCreature);
    
    const result = applyTool(targetCreature, tool, difficulty);
    
    if (!result || !result.updatedCreature) {
      addToBattleLog(`Failed to use ${tool.name || "tool"}.`);
      return;
    }
    
    dispatch({ 
      type: ACTIONS.USE_TOOL, 
      result, 
      tool,
      isPlayerTool,
      isEnemyTool: !isPlayerTool
    });
    
    const isPlayerTarget = playerField.some(c => c.id === targetCreature.id);
    const targetDescription = isPlayerTarget ? targetCreature.species_name : `enemy ${targetCreature.species_name}`;
    
    addToBattleLog(`${tool.name || "Tool"} was used on ${targetDescription}.`);
    
    if (result.toolEffect) {
      if (result.toolEffect.statChanges) {
        const statChanges = Object.entries(result.toolEffect.statChanges)
          .map(([stat, value]) => `${stat} ${value > 0 ? '+' : ''}${value}`)
          .join(', ');
        
        if (statChanges) {
          addToBattleLog(`Effect: ${statChanges}`);
        }
      }
      
      if (result.toolEffect.healthChange && result.toolEffect.healthChange > 0) {
        addToBattleLog(`Healed for ${result.toolEffect.healthChange} health.`);
      }
    }
  }, [playerField, difficulty, addToBattleLog]);
  
  // Cast a spell
  const useSpell = useCallback((spell, caster, target, isPlayerSpell = true) => {
    if (!spell || !caster) {
      addToBattleLog("Invalid spell cast - missing spell or caster");
      return;
    }
    
    const energyCost = SPELL_ENERGY_COST;
    
    if (isPlayerSpell && playerEnergy < energyCost) {
      addToBattleLog(`Not enough energy to cast ${spell.name}. Needs ${energyCost} energy.`);
      return;
    }
    
    const effectiveTarget = target || caster;
    
    const spellResult = applySpell(caster, effectiveTarget, spell, difficulty);
    
    if (!spellResult) {
      addToBattleLog(`Failed to cast ${spell.name}.`);
      return;
    }
    
    dispatch({ 
      type: ACTIONS.USE_SPELL, 
      spellResult, 
      spell, 
      energyCost,
      isEnemySpell: !isPlayerSpell
    });
    
    const targetText = target && target.id !== caster.id 
      ? `on ${playerField.some(c => c.id === target.id) ? '' : 'enemy '}${target.species_name}` 
      : 'on self';
      
    addToBattleLog(`${caster.species_name} cast ${spell.name} ${targetText}. (-${energyCost} energy)`);
    
    if (spellResult.spellEffect && spellResult.spellEffect.damage) {
      addToBattleLog(`The spell dealt ${spellResult.spellEffect.damage} damage!`);
    }
    
    if (spellResult.spellEffect && spellResult.spellEffect.healing) {
      addToBattleLog(`The spell healed for ${spellResult.spellEffect.healing} health!`);
    }
  }, [playerEnergy, playerField, difficulty, addToBattleLog]);
  
  // Put a creature in defensive stance
  const defendCreatureAction = useCallback((creature) => {
    if (!creature) {
      addToBattleLog("Invalid defend action - no creature selected");
      return;
    }
    
    const isPlayerCreature = playerField.some(c => c.id === creature.id);
    if (isPlayerCreature && playerEnergy < DEFEND_ENERGY_COST) {
      addToBattleLog(`Not enough energy to defend. Needs ${DEFEND_ENERGY_COST} energy.`);
      return;
    }
    
    const updatedCreature = defendCreature(creature, difficulty);
    
    dispatch({ type: ACTIONS.DEFEND, updatedCreature });
    
    const energyCost = isPlayerCreature ? ` (-${DEFEND_ENERGY_COST} energy)` : '';
    addToBattleLog(
      `${isPlayerCreature ? '' : 'Enemy '}${creature.species_name} took a defensive stance!${energyCost}`
    );
  }, [playerField, playerEnergy, difficulty, addToBattleLog]);
  
  // ========== BATTLE INITIALIZATION ==========
  const initializeBattle = useCallback(() => {
    if (!creatureNfts || creatureNfts.length === 0) {
      addNotification("You need creatures to battle!", 400, 300, "#FF5722");
      return;
    }
    
    // FIXED: Create battle-ready versions of player creatures with proper energy costs
    const battleCreatures = creatureNfts.map(creature => {
      const derivedStats = calculateDerivedStats(creature);
      const energyCost = calculateCreatureEnergyCost(creature);
      
      return {
        ...creature,
        battleStats: {
          ...derivedStats,
          energyCost: energyCost
        },
        currentHealth: derivedStats.maxHealth,
        activeEffects: [],
        isDefending: false
      };
    });
    
    // Get the difficulty settings
    const diffSettings = getDifficultySettings(difficulty);
    
    // Generate enemy deck
    const enemyCreatures = generateEnemyCreatures(difficulty, diffSettings.enemyDeckSize, battleCreatures);
    
    // FIXED: Calculate battle stats for enemy creatures with proper energy costs
    const enemyWithStats = enemyCreatures.map((creature, index) => {
      const derivedStats = calculateDerivedStats(creature);
      const energyCost = calculateCreatureEnergyCost(creature);
      
      console.log(`Enemy ${creature.species_name} (${creature.rarity}, Form ${creature.form}):`);
      console.log(`Base stats:`, creature.stats);
      console.log(`Derived stats:`, derivedStats);
      console.log(`Energy cost:`, energyCost);
      
      return {
        ...creature,
        battleStats: {
          ...derivedStats,
          energyCost: energyCost
        },
        currentHealth: derivedStats.maxHealth,
        activeEffects: [],
        isDefending: false
      };
    });
    
    // Draw initial hands
    const playerInitialHandSize = Math.min(3, battleCreatures.length);
    const playerInitialHand = battleCreatures.slice(0, playerInitialHandSize);
    const remainingDeck = battleCreatures.slice(playerInitialHandSize);
    
    const enemyInitialHandSize = diffSettings.initialHandSize;
    const enemyInitialHand = enemyWithStats.slice(0, enemyInitialHandSize);
    const remainingEnemyDeck = enemyWithStats.slice(enemyInitialHandSize);
    
    const initialPlayerTools = toolNfts || [];
    const initialPlayerSpells = spellNfts || [];
    
    // Generate enemy items
    const enemyItems = generateEnemyItems(difficulty);
    const enemyTools = enemyItems.tools || [];
    const enemySpells = enemyItems.spells || [];
    
    console.log(`Generated ${enemyTools.length} enemy tools and ${enemySpells.length} enemy spells for ${difficulty} difficulty`);
    
    // Initialize the game state
    dispatch({
      type: ACTIONS.START_BATTLE,
      playerDeck: remainingDeck,
      playerHand: playerInitialHand,
      playerTools: initialPlayerTools,
      playerSpells: initialPlayerSpells,
      enemyDeck: remainingEnemyDeck,
      enemyHand: enemyInitialHand,
      enemyTools: enemyTools,
      enemySpells: enemySpells,
      difficulty
    });
    
    addToBattleLog(`Your turn. The enemy has ${enemyTools.length + enemySpells.length} special items!`);
  }, [creatureNfts, toolNfts, spellNfts, difficulty, addNotification, addToBattleLog]);
  
  // ========== ENEMY AI ==========
  // Execute enemy turn
  const handleEnemyTurn = useCallback(() => {
    console.log("Enemy turn. Energy:", enemyEnergy, "Hand:", enemyHand.length, "Field:", enemyField.length);
    console.log("Enemy tools:", enemyTools.length, "Enemy spells:", enemySpells.length);
    
    setActionInProgress(true);
    
    // Get the current game state
    const currentGameState = {
      enemyHand,
      enemyField,
      playerField,
      enemyTools,
      enemySpells,
      enemyEnergy,
      difficulty,
      turn,
      enemyDeck,
      playerDeck
    };
    
    // Use enhanced AI to determine action
    const aiAction = determineAIAction(
      difficulty,
      enemyHand,
      enemyField,
      playerField,
      enemyTools,
      enemySpells,
      enemyEnergy
    );
    
    console.log("AI determined action:", aiAction);
    
    // FIXED: Handle endTurn action properly
    if (aiAction.type === 'endTurn') {
      console.log("AI ending turn immediately");
      setTimeout(() => finishEnemyTurn(), 500);
      return;
    }
    
    // Check if it's an array of actions (multi-action) or single action
    if (Array.isArray(aiAction)) {
      // Multi-action sequence
      console.log(`AI executing ${aiAction.length} actions`);
      executeActionSequence(aiAction, 0);
    } else {
      // Single action
      executeAIAction(aiAction);
    }
  }, [
    difficulty, 
    enemyHand, 
    enemyField, 
    playerField,
    enemyTools,
    enemySpells,
    enemyEnergy,
    turn,
    enemyDeck,
    playerDeck
  ]);
  
  // Execute a sequence of AI actions
  const executeActionSequence = useCallback((actionSequence, index) => {
    if (index >= actionSequence.length) {
      // Sequence complete - finish the turn
      console.log("Action sequence complete, finishing turn");
      setTimeout(() => finishEnemyTurn(), 500);
      return;
    }
    
    const action = actionSequence[index];
    console.log(`Executing AI action ${index + 1}/${actionSequence.length}: ${action.type}`);
    
    // Execute the current action
    executeSingleAIAction(action);
    
    // Schedule the next action
    setTimeout(() => {
      executeActionSequence(actionSequence, index + 1);
    }, 800);
  }, []);
  
  // Execute a single AI action
  const executeSingleAIAction = useCallback((aiAction) => {
    console.log("Executing single AI action:", aiAction.type);
    
    // FIXED: Check for endTurn action
    if (aiAction.type === 'endTurn') {
      addToBattleLog("Enemy ended their turn.");
      return;
    }
    
    switch(aiAction.type) {
      case 'deploy':
        if (!aiAction.creature) {
          console.log("AI Error: No creature to deploy");
          break;
        }
        
        const energyCost = aiAction.energyCost || aiAction.creature.battleStats?.energyCost || 3;
        
        if (enemyEnergy < energyCost) {
          console.log("AI Error: Not enough energy to deploy");
          break;
        }
        
        console.log("AI deploying creature:", aiAction.creature.species_name, "Cost:", energyCost);
        
        dispatch({
          type: ACTIONS.ENEMY_DEPLOY_CREATURE,
          creature: aiAction.creature,
          energyCost
        });
        
        addToBattleLog(`Enemy deployed ${aiAction.creature.species_name} to the battlefield! (-${energyCost} energy)`);
        break;
        
      case 'attack':
        if (!aiAction.attacker || !aiAction.target) {
          console.log("AI Error: Missing attacker or target");
          break;
        }
        
        const attackCost = aiAction.energyCost || ATTACK_ENERGY_COST;
        
        if (enemyEnergy < attackCost) {
          console.log("AI Error: Not enough energy to attack");
          break;
        }
        
        console.log("AI attacking with:", aiAction.attacker.species_name, "Target:", aiAction.target.species_name);
        
        const attackResult = processAttack(aiAction.attacker, aiAction.target);
        
        dispatch({
          type: ACTIONS.ATTACK,
          attackResult,
          energyCost: attackCost
        });
        
        addToBattleLog(`Enemy: ${attackResult.battleLog} (-${attackCost} energy)`);
        break;
        
      case 'defend':
        if (!aiAction.creature) {
          console.log("AI Error: No creature to defend");
          break;
        }
        
        const defendCost = aiAction.energyCost || DEFEND_ENERGY_COST;
        
        if (enemyEnergy < defendCost) {
          console.log("AI Error: Not enough energy to defend");
          break;
        }
        
        console.log("AI defending with:", aiAction.creature.species_name);
        
        const updatedDefender = defendCreature(aiAction.creature, difficulty);
        
        dispatch({
          type: ACTIONS.DEFEND,
          updatedCreature: updatedDefender
        });
        
        addToBattleLog(`Enemy ${aiAction.creature.species_name} took a defensive stance! (-${defendCost} energy)`);
        break;
        
      case 'useTool':
        if (!aiAction.tool || !aiAction.target) {
          console.log("AI Error: Missing tool or target");
          break;
        }
        
        console.log("AI using tool:", aiAction.tool.name, "on", aiAction.target.species_name);
        
        const toolResult = applyTool(aiAction.target, aiAction.tool, difficulty);
        
        if (toolResult && toolResult.updatedCreature) {
          dispatch({
            type: ACTIONS.USE_TOOL,
            result: toolResult,
            tool: aiAction.tool,
            isPlayerTool: false,
            isEnemyTool: true
          });
          
          addToBattleLog(`Enemy used ${aiAction.tool.name} on ${aiAction.target.species_name}!`);
        }
        break;
        
      case 'useSpell':
        if (!aiAction.spell || !aiAction.caster || !aiAction.target) {
          console.log("AI Error: Missing spell, caster, or target");
          break;
        }
        
        const spellCost = aiAction.energyCost || SPELL_ENERGY_COST;
        
        if (enemyEnergy < spellCost) {
          console.log("AI Error: Not enough energy for spell");
          break;
        }
        
        console.log("AI casting spell:", aiAction.spell.name);
        
        const spellResult = applySpell(aiAction.caster, aiAction.target, aiAction.spell, difficulty);
        
        if (spellResult) {
          dispatch({
            type: ACTIONS.USE_SPELL,
            spellResult,
            spell: aiAction.spell,
            energyCost: spellCost,
            isEnemySpell: true
          });
          
          const targetName = aiAction.target.id === aiAction.caster.id ? 'themselves' : aiAction.target.species_name;
          addToBattleLog(`Enemy ${aiAction.caster.species_name} cast ${aiAction.spell.name} on ${targetName}! (-${spellCost} energy)`);
        }
        break;
        
      default:
        console.log("Unknown AI action type:", aiAction.type);
    }
  }, [enemyEnergy, difficulty, addToBattleLog]);
  
  // Execute AI action wrapper
  const executeAIAction = useCallback((aiAction) => {
    console.log("Executing AI action:", aiAction);
    
    // FIXED: Handle endTurn action immediately
    if (aiAction.type === 'endTurn') {
      addToBattleLog("Enemy ended their turn.");
      setTimeout(() => finishEnemyTurn(), 500);
      return;
    }
    
    // Execute the action
    executeSingleAIAction(aiAction);
    
    // Schedule next action or end turn
    setTimeout(() => {
      // Check if AI has more energy and can perform another action
      const currentEnemyEnergy = state.enemyEnergy;
      const canMultiAction = Math.random() < (getDifficultySettings(difficulty).multiActionChance || 0.3);
      
      if (canMultiAction && currentEnemyEnergy >= 2 && aiAction.type !== 'endTurn') {
        // AI can perform another action
        console.log("AI performing another action...");
        handleEnemyTurn();
      } else {
        // End enemy turn
        finishEnemyTurn();
      }
    }, 1000);
  }, [difficulty, state.enemyEnergy, executeSingleAIAction, addToBattleLog]);
  
  // Finish the enemy turn
  const finishEnemyTurn = useCallback(() => {
    console.log("Finishing enemy turn...");
    
    // Apply ongoing effects
    dispatch({ type: ACTIONS.APPLY_ONGOING_EFFECTS, addLog: addToBattleLog });
    
    // Apply energy decay
    applyEnergyDecay();
    
    // Increment turn counter
    dispatch({ type: ACTIONS.INCREMENT_TURN });
    
    // Switch back to player turn
    dispatch({ type: ACTIONS.SET_ACTIVE_PLAYER, player: 'player' });
    
    // Draw cards
    const maxHandSize = 5;
    if (playerHand.length < maxHandSize && playerDeck.length > 0) {
      dispatch({ type: ACTIONS.DRAW_CARD, player: 'player' });
      addToBattleLog(`You drew ${playerDeck[0].species_name}.`);
    }
    
    if (enemyHand.length < getDifficultySettings(difficulty).initialHandSize + 1 && enemyDeck.length > 0) {
      dispatch({ type: ACTIONS.DRAW_CARD, player: 'enemy' });
      addToBattleLog(`Enemy drew a card.`);
    }
    
    // Regenerate energy
    regenerateEnergy();
    
    // Check for combo bonuses
    if (consecutiveActions.enemy >= 3) {
      dispatch({ type: ACTIONS.COMBO_BONUS, player: 'enemy' });
      addToBattleLog("Enemy achieved a combo bonus!");
    }
    
    addToBattleLog(`Turn ${turn + 1} - Your turn.`);
    
    setActionInProgress(false);
    console.log("Enemy turn complete");
  }, [
    playerHand,
    playerDeck,
    enemyHand,
    enemyDeck,
    difficulty,
    turn,
    consecutiveActions,
    regenerateEnergy,
    applyEnergyDecay,
    addToBattleLog
  ]);
  
  // Process enemy turn wrapper
  const processEnemyTurn = useCallback(() => {
    console.log("Starting enemy turn...");
    
    setTimeout(() => {
      if (gameState === 'battle') {
        handleEnemyTurn();
      } else {
        setActionInProgress(false);
      }
    }, 750);
  }, [gameState, handleEnemyTurn]);
  
  // ========== EVENT HANDLERS ==========
  // Handle player action
  const handlePlayerAction = useCallback((action, targetCreature, sourceCreature) => {
    if (actionInProgress || activePlayer !== 'player' || gameState !== 'battle') {
      console.log("Ignoring player action - not player turn or action in progress");
      return;
    }
    
    console.log("Player action:", action.type);
    
    const clearSelections = () => {
      setSelectedCreature(null);
      setTargetCreature(null);
    };
    
    switch(action.type) {
      case 'deploy':
        setActionInProgress(true);
        deployCreature(sourceCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'attack':
        if (playerEnergy < ATTACK_ENERGY_COST) {
          addToBattleLog(`Not enough energy to attack. Needs ${ATTACK_ENERGY_COST} energy.`);
          return;
        }
        
        setActionInProgress(true);
        attackCreature(sourceCreature, targetCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'useTool':
        setActionInProgress(true);
        useTool(action.tool, sourceCreature, true);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'useSpell':
        setActionInProgress(true);
        useSpell(action.spell, sourceCreature, targetCreature, true);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'defend':
        if (playerEnergy < DEFEND_ENERGY_COST) {
          addToBattleLog(`Not enough energy to defend. Needs ${DEFEND_ENERGY_COST} energy.`);
          return;
        }
        
        setActionInProgress(true);
        defendCreatureAction(sourceCreature);
        clearSelections();
        setTimeout(() => setActionInProgress(false), 300);
        break;
        
      case 'endTurn':
        setActionInProgress(true);
        clearSelections();
        
        // Check for combo bonuses before ending turn
        if (consecutiveActions.player >= 3) {
          dispatch({ type: ACTIONS.COMBO_BONUS, player: 'player' });
          addToBattleLog("You achieved a combo bonus! All creatures gain +2 attack!");
        }
        
        // Apply ongoing effects for player's turn
        dispatch({ type: ACTIONS.APPLY_ONGOING_EFFECTS, addLog: addToBattleLog });
        
        // Apply energy decay
        applyEnergyDecay();
        
        // Set active player to enemy
        dispatch({ type: ACTIONS.SET_ACTIVE_PLAYER, player: 'enemy' });
        addToBattleLog(`Turn ${turn} - Enemy's turn.`);
        
        // Handle enemy turn
        setTimeout(() => {
          if (gameState === 'battle') {
            processEnemyTurn();
          } else {
            setActionInProgress(false);
          }
        }, 750);
        break;
        
      default:
        addToBattleLog('Invalid action');
    }
  }, [
    gameState,
    activePlayer,
    actionInProgress,
    turn,
    playerEnergy,
    consecutiveActions,
    deployCreature,
    attackCreature,
    useTool,
    useSpell,
    defendCreatureAction,
    applyEnergyDecay,
    addToBattleLog,
    processEnemyTurn
  ]);
  
  // Handle creature selection
  const handleCreatureSelect = useCallback((creature, isEnemy) => {
    if (activePlayer !== 'player' || actionInProgress) return;
    
    if (isEnemy) {
      setTargetCreature(prevTarget => {
        return prevTarget && prevTarget.id === creature.id ? null : creature;
      });
    } else {
      setSelectedCreature(prevSelected => {
        return prevSelected && prevSelected.id === creature.id ? null : creature;
      });
    }
  }, [activePlayer, actionInProgress]);
  
  // Handle card selection from hand
  const handleSelectCard = useCallback((creature) => {
    if (activePlayer !== 'player' || actionInProgress) return;
    
    setSelectedCreature(prevSelected => {
      return prevSelected && prevSelected.id === creature.id ? null : creature;
    });
    setTargetCreature(null);
  }, [activePlayer, actionInProgress]);
  
  // Get available actions for the selected creature
  const getAvailableActions = useCallback((selectedCreature, targetCreature) => {
    if (!selectedCreature) return [];
    
    const actions = [];
    
    if (playerHand.some(c => c.id === selectedCreature.id)) {
      actions.push('deploy');
    }
    
    if (playerField.some(c => c.id === selectedCreature.id)) {
      if (targetCreature && enemyField.some(c => c.id === targetCreature.id) && playerEnergy >= ATTACK_ENERGY_COST) {
        actions.push('attack');
      }
      
      if (playerTools.length > 0) {
        actions.push('useTool');
      }
      
      if (playerSpells.length > 0 && playerEnergy >= SPELL_ENERGY_COST) {
        actions.push('useSpell');
      }
      
      if (playerEnergy >= DEFEND_ENERGY_COST) {
        actions.push('defend');
      }
    }
    
    actions.push('endTurn');
    
    return actions;
  }, [playerHand, playerField, enemyField, playerTools, playerSpells, playerEnergy]);
  
  // ========== EFFECTS ==========
  // Check win conditions
  useEffect(() => {
    if (gameState !== 'battle') {
      return;
    }
    
    // Add delay to ensure state has updated
    const timeoutId = setTimeout(() => {
      if (gameState !== 'battle') {
        return;
      }
      
      console.log('Win condition check:', {
        enemyField: enemyField.length,
        enemyHand: enemyHand.length, 
        enemyDeck: enemyDeck.length,
        playerField: playerField.length,
        playerHand: playerHand.length,
        playerDeck: playerDeck.length
      });
      
      if (checkWinCondition()) {
        console.log('VICTORY!');
        dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'victory' });
        addToBattleLog("Victory! You've defeated all enemy creatures!");
        setActionInProgress(false);
      } else if (checkLossCondition()) {
        console.log('DEFEAT!');
        dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'defeat' });
        addToBattleLog("Defeat! All your creatures have been defeated!");
        setActionInProgress(false);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [
    gameState, 
    enemyField.length, 
    enemyHand.length, 
    enemyDeck.length, 
    playerField.length, 
    playerHand.length, 
    playerDeck.length, 
    checkWinCondition, 
    checkLossCondition, 
    addToBattleLog
  ]);
  
  // ========== RENDER ==========
  const isDesktop = window.innerWidth >= 769;
  
  return (
    <div className="battle-game-overlay">
      <div className="battle-game" data-difficulty={difficulty}>
        {gameState === 'setup' && (
          <DifficultySelector 
            onSelectDifficulty={setDifficulty} 
            onStartBattle={initializeBattle}
            creatureCount={creatureNfts?.length || 0} 
            difficulty={difficulty}
          />
        )}
        
        {gameState === 'battle' && (
          <>
            <BattleHeader 
              turn={turn} 
              playerEnergy={playerEnergy} 
              enemyEnergy={enemyEnergy}
              difficulty={difficulty}
              activePlayer={activePlayer}
              maxEnergy={MAX_ENERGY}
              consecutiveActions={consecutiveActions}
              energyMomentum={energyMomentum}
            />
            
            <div className="battle-content-wrapper">
              <div className="battle-main-area">
                <div className="battlefield-container">
                  <Battlefield 
                    playerField={playerField}
                    enemyField={enemyField}
                    activePlayer={activePlayer}
                    difficulty={difficulty}
                    onCreatureSelect={handleCreatureSelect}
                    selectedCreature={selectedCreature}
                    targetCreature={targetCreature}
                    isDesktop={isDesktop}
                    battleLog={battleLog}
                    availableActions={getAvailableActions(selectedCreature, targetCreature)}
                    onAction={handlePlayerAction}
                    disabled={activePlayer !== 'player' || actionInProgress}
                    availableTools={playerTools}
                    availableSpells={playerSpells}
                  />
                </div>
                
                <PlayerHand 
                  hand={playerHand}
                  onSelectCard={handleSelectCard}
                  disabled={activePlayer !== 'player' || actionInProgress}
                  selectedCreature={selectedCreature}
                  selectedCardId={selectedCreature?.id}
                  hasFieldSelection={selectedCreature && playerField.some(c => c.id === selectedCreature.id)}
                  hasHandSelection={selectedCreature && playerHand.some(c => c.id === selectedCreature.id)}
                />
              </div>
              
              {!isDesktop && (
                <>
                  <ActionPanel 
                    selectedCreature={selectedCreature}
                    targetCreature={targetCreature}
                    availableActions={getAvailableActions(selectedCreature, targetCreature)}
                    onAction={handlePlayerAction}
                    disabled={activePlayer !== 'player' || actionInProgress}
                    availableTools={playerTools}
                    availableSpells={playerSpells}
                  />
                  
                  <BattleLog log={battleLog} />
                </>
              )}
            </div>
          </>
        )}
        
        {(gameState === 'victory' || gameState === 'defeat') && (
          <BattleResult 
            result={gameState} 
            onPlayAgain={() => dispatch({ type: ACTIONS.SET_GAME_STATE, gameState: 'setup' })}
            onClose={onClose}
            stats={{
              turns: turn,
              remainingCreatures: playerField.length + playerHand.length,
              enemiesDefeated: (getDifficultySettings(difficulty).enemyDeckSize || 5) - (enemyField.length + enemyHand.length),
              combosAchieved: Math.max(consecutiveActions.player, consecutiveActions.enemy)
            }}
            difficulty={difficulty}
          />
        )}
      </div>
    </div>
  );
};

export default BattleGame;

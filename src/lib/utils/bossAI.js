import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import {
  BOSS_SKILL_TYPES,
  SKILL_TARGET_TYPE,
  getBossSkill
} from '$lib/config/bossConfig.js';
import {
  getCurrentPhase,
  getAvailableSkills,
  findSkillTarget,
  addSkillWarning,
  executeBossSkill,
  tickSkillCooldowns,
  checkPhaseChange,
  getBossEffectiveMoveRange,
  getBossEffectiveAttackRange,
  getBossEffectiveAttack,
  getBossEffectiveDefense,
  applyBossDamageReduction,
  checkBossVictoryCondition,
  checkBossDefeatCondition
} from './bossLogic.js';
import {
  getMoveRange,
  getAttackRange,
  findPath,
  getUnitAt,
  calculateDamage,
  isHardCC,
  getTerrain
} from './gameLogic.js';

/**
 * @typedef {import('./cardSystem').Unit} Unit
 * @typedef {import('../config/bossConfig').BossConfig} BossConfig
 * @typedef {import('../config/bossConfig').BossSkill} BossSkill
 * @typedef {import('./bossLogic').BossState} BossState
 * @typedef {import('./bossLogic').SkillTargetResult} SkillTargetResult
 * @typedef {import('./bossLogic').BossSkillExecutionResult} BossSkillExecutionResult
 */

/**
 * @typedef {object} BossAIDecision
 * @property {'move' | 'attack' | 'skill' | 'wait'} actionType
 * @property {BossSkill | null} [skill]
 * @property {SkillTargetResult | null} [skillTarget]
 * @property {{x: number, y: number} | null} [moveTarget]
 * @property {Unit | null} [attackTarget]
 * @property {number} priority
 * @property {string} reason
 */

/**
 * @typedef {object} BossAITurnResult
 * @property {BossSkillExecutionResult[]} skillResults
 * @property {{fromX: number, fromY: number, toX: number, toY: number} | null} moveResult
 * @property {{targetId: string, damage: number} | null} attackResult
 * @property {string[]} messages
 * @property {boolean} phaseChanged
 * @property {number} newPhaseId
 * @property {boolean} gameOver
 * @property {string} [gameResult]
 */

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function getManhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @returns {Unit | null}
 */
function findNearestEnemy(bossUnit, units) {
  const enemies = units.filter(u => u.faction !== bossUnit.faction && u.currentHp > 0);
  if (enemies.length === 0) return null;

  let nearest = enemies[0];
  let minDist = Infinity;

  for (const enemy of enemies) {
    const dist = getManhattanDistance(bossUnit.x, bossUnit.y, enemy.x, enemy.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  }

  return nearest;
}

/**
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {{x: number, y: number} | null}
 */
function findBestMovePosition(bossUnit, units, boardLayout, bossState, bossConfig) {
  const moveRange = getBossEffectiveMoveRange(bossUnit, bossState, bossConfig);
  const layout = boardLayout || boardConfig.layout;
  const tileEffects = {};
  const weatherType = 'sunny';

  const moveTiles = getMoveRange(bossUnit, units, layout, tileEffects, weatherType);
  if (moveTiles.length === 0) return null;

  const nearestEnemy = findNearestEnemy(bossUnit, units);
  if (!nearestEnemy) return null;

  const attackRange = getBossEffectiveAttackRange(bossUnit, bossState, bossConfig);

  let bestTile = null;
  let bestScore = -Infinity;

  for (const tile of moveTiles) {
    if (tile.cost > moveRange) continue;

    const occupiedUnit = getUnitAt(tile.x, tile.y, units);
    if (occupiedUnit && occupiedUnit.id !== bossUnit.id) continue;

    let score = 0;

    const distToEnemy = getManhattanDistance(tile.x, tile.y, nearestEnemy.x, nearestEnemy.y);
    if (distToEnemy <= attackRange) {
      score += 100;
    }

    score -= distToEnemy * 2;

    const terrain = getTerrain(tile.x, tile.y, layout);
    if (terrain?.defenseBonus) {
      score += terrain.defenseBonus * 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTile = { x: tile.x, y: tile.y };
    }
  }

  return bestTile;
}

/**
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {Unit | null}
 */
function findBestAttackTarget(bossUnit, units, bossState, bossConfig) {
  const attackRange = getBossEffectiveAttackRange(bossUnit, bossState, bossConfig);
  const weatherType = 'sunny';
  const attackTiles = getAttackRange(bossUnit, units, weatherType);

  if (attackTiles.length === 0) return null;

  let bestTarget = null;
  let bestScore = -Infinity;

  for (const tile of attackTiles) {
    const target = tile.target;
    if (!target || target.currentHp <= 0) continue;

    const terrain = getTerrain(target.x, target.y, null);
    const damage = calculateDamage(bossUnit, target, terrain || null);

    let score = 0;
    score += damage * 2;

    if (damage >= target.currentHp) {
      score += 200;
    }

    const targetConfig = unitConfig[/** @type {any} */ (target.type)];
    if (targetConfig?.cost) {
      score += targetConfig.cost / 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }

  return bestTarget;
}

/**
 * @param {BossSkill} skill
 * @param {SkillTargetResult | null} targetResult
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @returns {number}
 */
function evaluateSkillPriority(skill, targetResult, bossUnit, bossState) {
  if (!targetResult) return -1;

  let priority = 0;
  const affectedEnemies = targetResult.affectedUnits.length;

  switch (skill.type) {
    case BOSS_SKILL_TYPES.AOE_CIRCLE:
    case BOSS_SKILL_TYPES.AOE_FAN:
    case BOSS_SKILL_TYPES.AOE_LINE:
      priority += affectedEnemies * 50;
      if (skill.effect.damage) {
        priority += skill.effect.damage * affectedEnemies;
      }
      if (skill.effect.statusType) {
        priority += 30 * affectedEnemies;
      }
      break;

    case BOSS_SKILL_TYPES.DEBUFF_AREA:
      priority += affectedEnemies * 40;
      if (skill.effect.statusType) {
        priority += 25 * affectedEnemies;
      }
      break;

    case BOSS_SKILL_TYPES.SUMMON:
      priority += 60;
      const summonCount = skill.effect.summonCount || 1;
      priority += summonCount * 20;
      break;

    case BOSS_SKILL_TYPES.BUFF_SELF:
      priority += 40;
      if (skill.effect.buffType === 'attackBoost') {
        priority += skill.effect.buffValue * 100;
      }
      break;

    case BOSS_SKILL_TYPES.HEAL_SELF:
      const hpPercent = bossUnit.currentHp / bossUnit.maxHp;
      if (hpPercent < 0.5) {
        priority += 80;
        priority += (1 - hpPercent) * 100;
      } else {
        priority += 10;
      }
      break;

    case BOSS_SKILL_TYPES.CHARGE:
      priority += 70;
      if (skill.effect.damage) {
        priority += skill.effect.damage;
      }
      break;
  }

  if (skill.warningTurns && skill.warningTurns > 0) {
    priority -= 10;
  }

  return priority;
}

/**
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {BossAIDecision | null}
 */
export function makeBossAIDecision(bossUnit, units, boardLayout, bossState, bossConfig) {
  if (isHardCC(bossUnit)) {
    return {
      actionType: 'wait',
      skill: null,
      skillTarget: null,
      moveTarget: null,
      attackTarget: null,
      priority: 0,
      reason: '被控制，无法行动'
    };
  }

  const availableSkills = getAvailableSkills(bossState, bossConfig);
  /** @type {BossAIDecision[]} */
  const decisions = [];

  for (const skill of availableSkills) {
    const targetResult = findSkillTarget(skill, bossUnit, units, boardLayout);
    if (targetResult) {
      const priority = evaluateSkillPriority(skill, targetResult, bossUnit, bossState);
      decisions.push({
        actionType: 'skill',
        skill,
        skillTarget: targetResult,
        moveTarget: null,
        attackTarget: null,
        priority,
        reason: `技能: ${skill.name}`
      });
    }
  }

  const attackTarget = findBestAttackTarget(bossUnit, units, bossState, bossConfig);
  if (attackTarget) {
    const terrain = getTerrain(attackTarget.x, attackTarget.y, boardLayout || null);
    const damage = calculateDamage(bossUnit, attackTarget, terrain || null);
    const priority = damage >= attackTarget.currentHp ? 150 : 80;

    decisions.push({
      actionType: 'attack',
      skill: null,
      skillTarget: null,
      moveTarget: null,
      attackTarget,
      priority,
      reason: `攻击: ${unitConfig[/** @type {any} */ (attackTarget.type)].name}`
    });
  }

  if (!bossUnit.hasMoved) {
    const moveTarget = findBestMovePosition(bossUnit, units, boardLayout, bossState, bossConfig);
    if (moveTarget && (moveTarget.x !== bossUnit.x || moveTarget.y !== bossUnit.y)) {
      decisions.push({
        actionType: 'move',
        skill: null,
        skillTarget: null,
        moveTarget,
        attackTarget: null,
        priority: 60,
        reason: '移动接近敌人'
      });
    }
  }

  if (decisions.length === 0) {
    return {
      actionType: 'wait',
      skill: null,
      skillTarget: null,
      moveTarget: null,
      attackTarget: null,
      priority: 0,
      reason: '无可用行动'
    };
  }

  decisions.sort((a, b) => b.priority - a.priority);
  return decisions[0];
}

/**
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @param {number} currentTurn
 * @param {any} tileEffects
 * @returns {BossAITurnResult}
 */
export function executeBossAITurn(bossUnit, units, boardLayout, bossState, bossConfig, currentTurn, tileEffects) {
  /** @type {BossAITurnResult} */
  const result = {
    skillResults: [],
    moveResult: null,
    attackResult: null,
    messages: [],
    phaseChanged: false,
    newPhaseId: bossState.currentPhaseId,
    gameOver: false
  };

  bossState.bossTurnCount++;

  const phaseChangeResult = checkPhaseChange(bossUnit, bossState, bossConfig, currentTurn);
  if (phaseChangeResult.phaseChanged) {
    bossState.currentPhaseId = phaseChangeResult.newPhaseId;
    bossState.phaseHistory.push(String(phaseChangeResult.newPhaseId));
    result.phaseChanged = true;
    result.newPhaseId = phaseChangeResult.newPhaseId;
    result.messages.push(phaseChangeResult.message);

    if (bossState.isInvulnerable) {
      const victoryCondition = bossConfig.victoryCondition;
      if (victoryCondition.type === 'destroy_summons' &&
          bossState.summonKillCount >= (victoryCondition.summonKillCount || 0)) {
        bossState.isInvulnerable = false;
        result.messages.push(`${bossConfig.name}的护盾消失了！现在可以对其造成伤害！`);
      }
    }
  }

  const pendingWarnings = Object.values(bossState.skillWarnings).filter(w => w.remainingTurns <= 0);
  for (const warning of pendingWarnings) {
    const skill = getBossSkill(warning.skillId);
    if (skill) {
      const targetResult = {
        targetX: warning.targetX,
        targetY: warning.targetY,
        affectedTiles: [],
        affectedUnits: []
      };

      const enemies = units.filter(u => u.faction !== bossUnit.faction && u.currentHp > 0);
      for (const enemy of enemies) {
        const dist = getManhattanDistance(warning.targetX, warning.targetY, enemy.x, enemy.y);
        if (dist <= (skill.aoeRadius || 2)) {
          targetResult.affectedUnits.push(enemy);
        }
      }

      const skillResult = executeBossSkill(skill, bossUnit, targetResult, units, bossState, bossConfig, boardLayout);
      result.skillResults.push(skillResult);
      result.messages.push(...skillResult.messages);

      if (bossState.skillCooldowns[skill.id] !== undefined) {
        bossState.skillCooldowns[skill.id] = skill.cooldown;
      }
    }
  }

  const decision = makeBossAIDecision(bossUnit, units, boardLayout, bossState, bossConfig);
  if (!decision) return result;

  switch (decision.actionType) {
    case 'skill':
      if (decision.skill && decision.skillTarget) {
        if (decision.skill.warningTurns && decision.skill.warningTurns > 0) {
          addSkillWarning(decision.skill, decision.skillTarget, bossState);
          result.messages.push(`${bossConfig.name}正在准备${decision.skill.name}！目标区域已标记！`);
        } else {
          const skillResult = executeBossSkill(
            decision.skill,
            bossUnit,
            decision.skillTarget,
            units,
            bossState,
            bossConfig,
            boardLayout
          );
          result.skillResults.push(skillResult);
          result.messages.push(...skillResult.messages);

          if (bossState.skillCooldowns[decision.skill.id] !== undefined) {
            bossState.skillCooldowns[decision.skill.id] = decision.skill.cooldown;
          }
        }
      }
      break;

    case 'move':
      if (decision.moveTarget) {
        const layout = boardLayout || boardConfig.layout;
        const weatherType = 'sunny';
        const pathResult = findPath(
          { x: bossUnit.x, y: bossUnit.y },
          { x: decision.moveTarget.x, y: decision.moveTarget.y },
          units,
          bossUnit,
          layout,
          tileEffects,
          weatherType
        );

        if (pathResult && pathResult.path.length > 0) {
          result.moveResult = {
            fromX: bossUnit.x,
            fromY: bossUnit.y,
            toX: decision.moveTarget.x,
            toY: decision.moveTarget.y
          };
          bossUnit.x = decision.moveTarget.x;
          bossUnit.y = decision.moveTarget.y;
          bossUnit.hasMoved = true;
          result.messages.push(`${bossConfig.name}移动到(${decision.moveTarget.x}, ${decision.moveTarget.y})`);
        }
      }
      break;

    case 'attack':
      if (decision.attackTarget) {
        const terrain = getTerrain(decision.attackTarget.x, decision.attackTarget.y, boardLayout || null);
        let damage = calculateDamage(bossUnit, decision.attackTarget, terrain || null);
        damage = Math.max(1, damage);

        decision.attackTarget.currentHp = Math.max(0, decision.attackTarget.currentHp - damage);
        bossUnit.hasAttacked = true;
        bossUnit.attackCount = (bossUnit.attackCount || 0) + 1;

        result.attackResult = {
          targetId: decision.attackTarget.id,
          damage
        };
        result.messages.push(`${bossConfig.name}攻击${unitConfig[/** @type {any} */ (decision.attackTarget.type)].name}，造成${damage}点伤害！`);
      }
      break;

    case 'wait':
      result.messages.push(`${bossConfig.name}本回合无行动`);
      break;
  }

  tickSkillCooldowns(bossState, bossConfig);

  const victoryCheck = checkBossVictoryCondition(units, bossState, bossConfig, currentTurn);
  if (victoryCheck.victory) {
    result.gameOver = true;
    result.gameResult = 'victory';
    result.messages.push(victoryCheck.message || '胜利！');
  }

  const defeatCheck = checkBossDefeatCondition(units, bossState, bossConfig, currentTurn);
  if (defeatCheck.defeat) {
    result.gameOver = true;
    result.gameResult = 'defeat';
    result.messages.push(defeatCheck.message || '失败！');
  }

  return result;
}

/**
 * @param {Unit} bossUnit
 * @param {number} incomingDamage
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function calculateBossDamageTaken(bossUnit, incomingDamage, bossState, bossConfig) {
  if (bossState.isInvulnerable) {
    return 0;
  }

  let damage = applyBossDamageReduction(incomingDamage, bossUnit, bossState, bossConfig);

  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  if (currentPhase?.statModifiers?.defenseMultiplier) {
    const defense = getBossEffectiveDefense(bossUnit, bossState, bossConfig);
    damage = Math.max(1, damage - Math.floor(defense * 0.5));
  }

  return damage;
}

/**
 * @param {Unit} killedUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 */
export function onUnitKilled(killedUnit, bossState, bossConfig) {
  if (killedUnit.isSummon && killedUnit.faction === bossConfig.faction) {
    bossState.summonKillCount++;

    if (bossState.isInvulnerable) {
      const victoryCondition = bossConfig.victoryCondition;
      if (victoryCondition.type === 'destroy_summons' &&
          bossState.summonKillCount >= (victoryCondition.summonKillCount || 0)) {
        bossState.isInvulnerable = false;
      }
    }
  }
}

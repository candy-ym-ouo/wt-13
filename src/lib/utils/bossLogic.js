import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, STATUS_EFFECT_TYPES } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import {
  BOSS_SKILL_TYPES,
  BOSS_PHASE_TRIGGER,
  BOSS_VICTORY_CONDITION,
  BOSS_DEFEAT_CONDITION,
  SKILL_TARGET_TYPE,
  getBossConfig,
  getBossSkill
} from '$lib/config/bossConfig.js';
import {
  getTerrain,
  getUnitAt,
  calculateDamage,
  hasStatusEffect,
  isImmuneToStatus,
  checkStatusApplication,
  findSummonPosition,
  checkSummonFeasibility,
  getStatusResistance
} from './gameLogic.js';

/**
 * @typedef {import('./cardSystem').Unit} Unit
 * @typedef {import('../config/bossConfig').BossConfig} BossConfig
 * @typedef {import('../config/bossConfig').BossPhase} BossPhase
 * @typedef {import('../config/bossConfig').BossSkill} BossSkill
 */

/**
 * @typedef {object} BossState
 * @property {string} bossId
 * @property {string} unitId
 * @property {number} currentPhaseId
 * @property {Record<string, number>} skillCooldowns
 * @property {Record<string, {skillId: string, targetX: number, targetY: number, remainingTurns: number}>} skillWarnings
 * @property {number} summonKillCount
 * @property {number} bossTurnCount
 * @property {boolean} isInvulnerable
 * @property {string[]} phaseHistory
 */

/**
 * @typedef {object} SkillTargetResult
 * @property {number} targetX
 * @property {number} targetY
 * @property {{x: number, y: number}[]} affectedTiles
 * @property {Unit[]} affectedUnits
 */

/**
 * @typedef {object} BossSkillExecutionResult
 * @property {string} skillId
 * @property {string} skillName
 * @property {Unit[]} damagedUnits
 * @property {{unitId: string, damage: number}[]} damages
 * @property {{unitId: string, statusType: string, duration: number, value: number, resisted: boolean}[]} statusApplications
 * @property {Unit[]} summonedUnits
 * @property {{type: string, value: number, duration: number}[]} selfBuffs
 * @property {number} selfHeal
 * @property {string[]} messages
 */

/**
 * @typedef {object} PhaseChangeResult
 * @property {number} oldPhaseId
 * @property {number} newPhaseId
 * @property {string} message
 * @property {boolean} phaseChanged
 */

/**
 * @typedef {object} BossVictoryCheckResult
 * @property {boolean} victory
 * @property {string} [condition]
 * @property {string} [message]
 */

/**
 * @typedef {object} BossDefeatCheckResult
 * @property {boolean} defeat
 * @property {string} [condition]
 * @property {string} [message]
 */

/**
 * @param {BossConfig} bossConfig
 * @param {string} unitId
 * @returns {BossState}
 */
export function createInitialBossState(bossConfig, unitId) {
  const skillCooldowns = {};
  for (const skill of bossConfig.skills) {
    skillCooldowns[skill.id] = 0;
  }

  return {
    bossId: bossConfig.id,
    unitId,
    currentPhaseId: 1,
    skillCooldowns,
    skillWarnings: {},
    summonKillCount: 0,
    bossTurnCount: 0,
    isInvulnerable: bossConfig.victoryCondition.type === BOSS_VICTORY_CONDITION.DESTROY_SUMMONS,
    phaseHistory: ['1']
  };
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {BossPhase | null}
 */
export function getCurrentPhase(bossUnit, bossState, bossConfig) {
  return bossConfig.phases.find(p => p.id === bossState.currentPhaseId) || null;
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @param {number} currentTurn
 * @returns {PhaseChangeResult}
 */
export function checkPhaseChange(bossUnit, bossState, bossConfig, currentTurn) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  if (!currentPhase) return { oldPhaseId: bossState.currentPhaseId, newPhaseId: bossState.currentPhaseId, message: '', phaseChanged: false };

  const hpPercent = (bossUnit.currentHp / bossUnit.maxHp) * 100;

  const nextPhases = bossConfig.phases
    .filter(p => p.id > bossState.currentPhaseId)
    .sort((a, b) => a.id - b.id);

  for (const phase of nextPhases) {
    let shouldTrigger = false;

    switch (phase.trigger.type) {
      case BOSS_PHASE_TRIGGER.HP_PERCENT:
        shouldTrigger = hpPercent <= (phase.trigger.hpPercent || 0);
        break;
      case BOSS_PHASE_TRIGGER.TURN_COUNT:
        shouldTrigger = bossState.bossTurnCount >= (phase.trigger.turnCount || 0);
        break;
      case BOSS_PHASE_TRIGGER.SUMMON_COUNT:
        shouldTrigger = bossState.summonKillCount >= (phase.trigger.turnCount || 0);
        break;
    }

    if (shouldTrigger) {
      return {
        oldPhaseId: bossState.currentPhaseId,
        newPhaseId: phase.id,
        message: phase.phaseChangeMessage || `进入${phase.name}阶段！`,
        phaseChanged: true
      };
    }
  }

  return { oldPhaseId: bossState.currentPhaseId, newPhaseId: bossState.currentPhaseId, message: '', phaseChanged: false };
}

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
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {string[][] | null} [boardLayout]
 * @returns {{x: number, y: number}[]}
 */
export function getCircleAOETiles(cx, cy, radius, boardLayout) {
  const layout = boardLayout || boardConfig.layout;
  const tiles = [];
  const height = layout.length;
  const width = layout[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (getManhattanDistance(cx, cy, x, y) <= radius) {
        tiles.push({ x, y });
      }
    }
  }

  return tiles;
}

/**
 * @param {number} startX
 * @param {number} startY
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} length
 * @param {number} width
 * @param {string[][] | null} [boardLayout]
 * @returns {{x: number, y: number}[]}
 */
export function getLineAOETiles(startX, startY, targetX, targetY, length, width, boardLayout) {
  const layout = boardLayout || boardConfig.layout;
  const tiles = [];
  const height = layout.length;
  const widthCount = layout[0].length;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let stepX = 0, stepY = 0;
  if (absDx > absDy) {
    stepX = dx > 0 ? 1 : -1;
  } else {
    stepY = dy > 0 ? 1 : -1;
  }

  for (let i = 0; i < length; i++) {
    const cx = startX + stepX * i;
    const cy = startY + stepY * i;

    for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
      let tileX = cx, tileY = cy;
      if (stepX !== 0) {
        tileY = cy + w;
      } else {
        tileX = cx + w;
      }

      if (tileX >= 0 && tileX < widthCount && tileY >= 0 && tileY < height) {
        tiles.push({ x: tileX, y: tileY });
      }
    }
  }

  return tiles;
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} radius
 * @param {number} angleDeg
 * @param {string[][] | null} [boardLayout]
 * @returns {{x: number, y: number}[]}
 */
export function getFanAOETiles(cx, cy, targetX, targetY, radius, angleDeg, boardLayout) {
  const layout = boardLayout || boardConfig.layout;
  const tiles = [];
  const height = layout.length;
  const width = layout[0].length;

  const dx = targetX - cx;
  const dy = targetY - cy;
  const targetAngle = Math.atan2(dy, dx);
  const halfAngle = (angleDeg * Math.PI / 180) / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = getManhattanDistance(cx, cy, x, y);
      if (dist > radius || dist === 0) continue;

      const tileAngle = Math.atan2(y - cy, x - cx);
      let angleDiff = Math.abs(tileAngle - targetAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff <= halfAngle) {
        tiles.push({ x, y });
      }
    }
  }

  return tiles;
}

/**
 * @param {BossSkill} skill
 * @param {Unit} bossUnit
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @returns {SkillTargetResult | null}
 */
export function findSkillTarget(skill, bossUnit, units, boardLayout) {
  const enemies = units.filter(u => u.faction !== bossUnit.faction && u.currentHp > 0);
  if (enemies.length === 0) return null;

  let targetX = bossUnit.x;
  let targetY = bossUnit.y;

  switch (skill.targetType) {
    case SKILL_TARGET_TYPE.SELF:
      targetX = bossUnit.x;
      targetY = bossUnit.y;
      break;

    case SKILL_TARGET_TYPE.NEAREST_ENEMY: {
      let nearest = enemies[0];
      let minDist = Infinity;
      for (const enemy of enemies) {
        const dist = getManhattanDistance(bossUnit.x, bossUnit.y, enemy.x, enemy.y);
        if (dist < minDist && dist <= skill.range) {
          minDist = dist;
          nearest = enemy;
        }
      }
      if (minDist === Infinity) return null;
      targetX = nearest.x;
      targetY = nearest.y;
      break;
    }

    case SKILL_TARGET_TYPE.MOST_ENEMIES: {
      let bestX = bossUnit.x;
      let bestY = bossUnit.y;
      let maxEnemies = 0;
      const radius = skill.aoeRadius || 2;

      for (const enemy of enemies) {
        const dist = getManhattanDistance(bossUnit.x, bossUnit.y, enemy.x, enemy.y);
        if (dist > skill.range) continue;

        const aoeTiles = getCircleAOETiles(enemy.x, enemy.y, radius, boardLayout);
        let count = 0;
        for (const tile of aoeTiles) {
          if (getUnitAt(tile.x, tile.y, units)?.faction !== bossUnit.faction) {
            count++;
          }
        }

        if (count > maxEnemies) {
          maxEnemies = count;
          bestX = enemy.x;
          bestY = enemy.y;
        }
      }

      if (maxEnemies === 0) return null;
      targetX = bestX;
      targetY = bestY;
      break;
    }

    case SKILL_TARGET_TYPE.RANDOM_ENEMY: {
      const inRange = enemies.filter(e =>
        getManhattanDistance(bossUnit.x, bossUnit.y, e.x, e.y) <= skill.range
      );
      if (inRange.length === 0) return null;
      const random = inRange[Math.floor(Math.random() * inRange.length)];
      targetX = random.x;
      targetY = random.y;
      break;
    }

    case SKILL_TARGET_TYPE.ALL_ENEMIES:
      targetX = bossUnit.x;
      targetY = bossUnit.y;
      break;
  }

  let affectedTiles = [];
  switch (skill.type) {
    case BOSS_SKILL_TYPES.AOE_CIRCLE:
    case BOSS_SKILL_TYPES.DEBUFF_AREA:
      affectedTiles = getCircleAOETiles(targetX, targetY, skill.aoeRadius || 2, boardLayout);
      break;
    case BOSS_SKILL_TYPES.AOE_LINE:
      affectedTiles = getLineAOETiles(bossUnit.x, bossUnit.y, targetX, targetY, skill.lineLength || 5, skill.lineWidth || 1, boardLayout);
      break;
    case BOSS_SKILL_TYPES.AOE_FAN:
      affectedTiles = getFanAOETiles(bossUnit.x, bossUnit.y, targetX, targetY, skill.aoeRadius || 3, skill.fanAngle || 90, boardLayout);
      break;
    case BOSS_SKILL_TYPES.CHARGE:
      affectedTiles = [{ x: targetX, y: targetY }];
      break;
    default:
      affectedTiles = [{ x: targetX, y: targetY }];
  }

  const affectedUnits = [];
  for (const tile of affectedTiles) {
    const unit = getUnitAt(tile.x, tile.y, units);
    if (unit && unit.faction !== bossUnit.faction && unit.currentHp > 0) {
      affectedUnits.push(unit);
    }
  }

  return {
    targetX,
    targetY,
    affectedTiles,
    affectedUnits
  };
}

/**
 * @param {BossSkill} skill
 * @param {Unit} bossUnit
 * @param {SkillTargetResult} targetResult
 * @param {Unit[]} units
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @param {string[][] | null} [boardLayout]
 * @returns {BossSkillExecutionResult}
 */
export function executeBossSkill(skill, bossUnit, targetResult, units, bossState, bossConfig, boardLayout) {
  /** @type {BossSkillExecutionResult} */
  const result = {
    skillId: skill.id,
    skillName: skill.name,
    damagedUnits: [],
    damages: [],
    statusApplications: [],
    summonedUnits: [],
    selfBuffs: [],
    selfHeal: 0,
    messages: []
  };

  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const statModifiers = currentPhase?.statModifiers || {};
  const attackMultiplier = statModifiers.attackMultiplier || 1.0;

  switch (skill.type) {
    case BOSS_SKILL_TYPES.AOE_CIRCLE:
    case BOSS_SKILL_TYPES.AOE_LINE:
    case BOSS_SKILL_TYPES.AOE_FAN:
    case BOSS_SKILL_TYPES.DEBUFF_AREA:
    case BOSS_SKILL_TYPES.CHARGE: {
      for (const targetUnit of targetResult.affectedUnits) {
        const terrain = getTerrain(targetUnit.x, targetUnit.y, boardLayout || null);
        let damage = skill.effect.damage || 0;
        damage = Math.floor(damage * attackMultiplier);

        const actualDamage = calculateDamage(
          { ...bossUnit, attack: bossConfig.baseAttack * attackMultiplier },
          targetUnit,
          terrain
        );

        const finalDamage = Math.max(1, Math.floor(actualDamage * (skill.effect.damageMultiplier || 1)));
        targetUnit.currentHp = Math.max(0, targetUnit.currentHp - finalDamage);

        result.damagedUnits.push(targetUnit);
        result.damages.push({ unitId: targetUnit.id, damage: finalDamage });
        result.messages.push(`${skill.name}对${unitConfig[/** @type {any} */ (targetUnit.type)].name}造成${finalDamage}点伤害！`);

        if (skill.effect.statusType && skill.effect.statusChance) {
          const resistance = getStatusResistance(targetUnit, skill.effect.statusType, /** @type {any} */ (targetUnit.type));
          const applicationChance = skill.effect.statusChance * (1 - resistance);

          if (Math.random() < applicationChance && !isImmuneToStatus(targetUnit, skill.effect.statusType)) {
            const statusEffect = {
              type: skill.effect.statusType,
              duration: skill.effect.statusDuration || 2,
              value: skill.effect.statusValue
            };

            if (!targetUnit.statusEffects) targetUnit.statusEffects = [];
            targetUnit.statusEffects.push(statusEffect);

            result.statusApplications.push({
              unitId: targetUnit.id,
              statusType: skill.effect.statusType,
              duration: skill.effect.statusDuration || 2,
              value: skill.effect.statusValue || 0,
              resisted: false
            });
          } else {
            result.statusApplications.push({
              unitId: targetUnit.id,
              statusType: skill.effect.statusType,
              duration: 0,
              value: 0,
              resisted: true
            });
          }
        }
      }
      break;
    }

    case BOSS_SKILL_TYPES.SUMMON: {
      const summonType = skill.effect.summonUnitType || 'infantry';
      const summonCount = skill.effect.summonCount || 1;
      const feasibility = checkSummonFeasibility(units, bossUnit.faction);

      if (feasibility.canSummon) {
        const actualCount = Math.min(summonCount, feasibility.maxCount - feasibility.currentCount);

        for (let i = 0; i < actualCount; i++) {
          const positionResult = findSummonPosition(units, bossUnit.faction, null, boardLayout, null);

          if (positionResult.position) {
            const unitConfigData = unitConfig[/** @type {any} */ (summonType)];
            const newUnit = {
              id: `summon_${Date.now()}_${i}_${bossUnit.id}`,
              type: summonType,
              faction: bossUnit.faction,
              x: positionResult.position.x,
              y: positionResult.position.y,
              currentHp: unitConfigData.hp,
              maxHp: unitConfigData.hp,
              hasMoved: false,
              hasAttacked: false,
              attackCount: 0,
              buffs: [],
              stunned: 0,
              morale: 80,
              winStreak: 0,
              statusEffects: [],
              isSummon: true,
              summonedBy: bossUnit.id
            };

            units.push(newUnit);
            result.summonedUnits.push(newUnit);
            result.messages.push(`召唤了${unitConfigData.name}！`);
          }
        }
      } else {
        result.messages.push(feasibility.reason || '无法召唤更多单位');
      }
      break;
    }

    case BOSS_SKILL_TYPES.BUFF_SELF: {
      const buff = {
        type: skill.effect.buffType || 'attackBoost',
        value: skill.effect.buffValue || 0,
        duration: skill.effect.buffDuration || 2,
        source: skill.id
      };

      if (!bossUnit.buffs) bossUnit.buffs = [];
      bossUnit.buffs.push(buff);

      result.selfBuffs.push({
        type: buff.type,
        value: buff.value,
        duration: buff.duration
      });
      result.messages.push(`${skill.name}！获得${buff.type}效果！`);
      break;
    }

    case BOSS_SKILL_TYPES.HEAL_SELF: {
      const healAmount = skill.effect.healAmount || 0;
      bossUnit.currentHp = Math.min(bossUnit.maxHp, bossUnit.currentHp + healAmount);
      result.selfHeal = healAmount;
      result.messages.push(`${skill.name}！恢复${healAmount}点生命值！`);
      break;
    }
  }

  return result;
}

/**
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 */
export function tickSkillCooldowns(bossState, bossConfig) {
  for (const skillId of Object.keys(bossState.skillCooldowns)) {
    if (bossState.skillCooldowns[skillId] > 0) {
      bossState.skillCooldowns[skillId]--;
    }
  }

  for (const warningId of Object.keys(bossState.skillWarnings)) {
    bossState.skillWarnings[warningId].remainingTurns--;
    if (bossState.skillWarnings[warningId].remainingTurns <= 0) {
      delete bossState.skillWarnings[warningId];
    }
  }
}

/**
 * @param {BossSkill} skill
 * @param {SkillTargetResult} targetResult
 * @param {BossState} bossState
 */
export function addSkillWarning(skill, targetResult, bossState) {
  if (skill.warningTurns && skill.warningTurns > 0) {
    bossState.skillWarnings[skill.id] = {
      skillId: skill.id,
      targetX: targetResult.targetX,
      targetY: targetResult.targetY,
      remainingTurns: skill.warningTurns
    };
  }
}

/**
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {BossSkill[]}
 */
export function getAvailableSkills(bossState, bossConfig) {
  const currentPhase = bossConfig.phases.find(p => p.id === bossState.currentPhaseId);
  if (!currentPhase) return [];

  return bossConfig.skills.filter(skill =>
    currentPhase.availableSkillIds.includes(skill.id) &&
    (bossState.skillCooldowns[skill.id] || 0) <= 0
  );
}

/**
 * @param {Unit[]} units
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @param {number} currentTurn
 * @returns {BossVictoryCheckResult}
 */
export function checkBossVictoryCondition(units, bossState, bossConfig, currentTurn) {
  const condition = bossConfig.victoryCondition;
  const bossUnit = units.find(u => u.id === bossState.unitId);
  const playerUnits = units.filter(u => u.faction !== bossConfig.faction && u.currentHp > 0);

  switch (condition.type) {
    case BOSS_VICTORY_CONDITION.KILL_BOSS:
      if (!bossUnit || bossUnit.currentHp <= 0) {
        return {
          victory: true,
          condition: condition.type,
          message: `击败了${bossConfig.name}！胜利！`
        };
      }
      break;

    case BOSS_VICTORY_CONDITION.SURVIVE_TURNS:
      if (bossState.bossTurnCount >= (condition.turnCount || 0)) {
        return {
          victory: true,
          condition: condition.type,
          message: `成功坚持${condition.turnCount}回合！胜利！`
        };
      }
      break;

    case BOSS_VICTORY_CONDITION.DESTROY_SUMMONS:
      if (bossState.summonKillCount >= (condition.summonKillCount || 0)) {
        if (bossUnit && bossUnit.currentHp <= 0) {
          return {
            victory: true,
            condition: condition.type,
            message: `击败了足够的召唤物并消灭了${bossConfig.name}！胜利！`
          };
        }
      }
      break;
  }

  return { victory: false };
}

/**
 * @param {Unit[]} units
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @param {number} currentTurn
 * @returns {BossDefeatCheckResult}
 */
export function checkBossDefeatCondition(units, bossState, bossConfig, currentTurn) {
  const condition = bossConfig.defeatCondition;
  const bossUnit = units.find(u => u.id === bossState.unitId);
  const playerUnits = units.filter(u => u.faction !== bossConfig.faction && u.currentHp > 0);

  switch (condition.type) {
    case BOSS_DEFEAT_CONDITION.ALL_UNITS_DEAD:
      if (playerUnits.length === 0) {
        return {
          defeat: true,
          condition: condition.type,
          message: '所有友方单位阵亡！失败！'
        };
      }
      break;

    case BOSS_DEFEAT_CONDITION.TURN_LIMIT_EXCEEDED:
      if (bossState.bossTurnCount >= (condition.turnLimit || 999)) {
        return {
          defeat: true,
          condition: condition.type,
          message: `超过${condition.turnLimit}回合！失败！`
        };
      }
      break;

    case BOSS_DEFEAT_CONDITION.BOSS_REACHES_TARGET:
      if (bossUnit && condition.targetPosition) {
        const dist = getManhattanDistance(bossUnit.x, bossUnit.y, condition.targetPosition.x, condition.targetPosition.y);
        if (dist <= 1) {
          return {
            defeat: true,
            condition: condition.type,
            message: `${bossConfig.name}到达了目标位置！失败！`
          };
        }
      }
      break;
  }

  return { defeat: false };
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function getBossEffectiveAttack(bossUnit, bossState, bossConfig) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const modifiers = currentPhase?.statModifiers || {};
  return bossConfig.baseAttack * (modifiers.attackMultiplier || 1.0);
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function getBossEffectiveDefense(bossUnit, bossState, bossConfig) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const modifiers = currentPhase?.statModifiers || {};
  return bossConfig.baseDefense * (modifiers.defenseMultiplier || 1.0);
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function getBossEffectiveMoveRange(bossUnit, bossState, bossConfig) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const modifiers = currentPhase?.statModifiers || {};
  return bossConfig.baseMoveRange + (modifiers.moveRangeBonus || 0);
}

/**
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function getBossEffectiveAttackRange(bossUnit, bossState, bossConfig) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const modifiers = currentPhase?.statModifiers || {};
  return bossConfig.baseAttackRange + (modifiers.attackRangeBonus || 0);
}

/**
 * @param {number} incomingDamage
 * @param {Unit} bossUnit
 * @param {BossState} bossState
 * @param {BossConfig} bossConfig
 * @returns {number}
 */
export function applyBossDamageReduction(incomingDamage, bossUnit, bossState, bossConfig) {
  const currentPhase = getCurrentPhase(bossUnit, bossState, bossConfig);
  const modifiers = currentPhase?.statModifiers || {};
  const reduction = modifiers.damageReduction || 0;
  return Math.floor(incomingDamage * (1 - reduction));
}

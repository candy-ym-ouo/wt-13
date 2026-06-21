import { boardConfig, tileEffectConfig, TILE_EFFECT_TYPES } from '$lib/config/boardConfig';
import { unitConfig, STATUS_EFFECT_TYPES, getStatusInfo, COUNTER_RELATIONSHIPS, COUNTER_LABELS, SYNERGY_CONFIG, SPECIALIZATION_CONFIG, MOVE_SKILL_TYPES, MOVE_SKILL_INFO } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';

/**
 * @typedef {import('./cardSystem').Unit} Unit
 * @typedef {import('./cardSystem').StatusEffect} StatusEffect
 */

/**
 * @typedef {object} TerrainInfo
 * @property {string} name
 * @property {number} color
 * @property {number} moveCost
 * @property {number} defenseBonus
 * @property {number} moraleBonus
 * @property {boolean} [passable]
 * @property {boolean} [isBase]
 * @property {string} [faction]
 * @property {string} type
 */

/**
 * @typedef {object} TileEffect
 * @property {string} type
 * @property {number} duration
 * @property {number} x
 * @property {number} y
 * @property {string} source
 */

/**
 * @typedef {object} TileEffectResult
 * @property {string} unitId
 * @property {number} damage
 * @property {string[]} messages
 * @property {{unitId: string, statusType: string, duration: number, value?: number}[]} statusApplications
 */

/**
 * @typedef {object} MoraleTier
 * @property {number} min
 * @property {number} max
 * @property {number} damageMultiplier
 * @property {string} label
 */

/**
 * @typedef {object} MoveTile
 * @property {number} x
 * @property {number} y
 * @property {number} cost
 */

/**
 * @typedef {object} AttackTile
 * @property {number} x
 * @property {number} y
 * @property {Unit} target
 */

/**
 * @typedef {object} PathResult
 * @property {MoveTile[]} path
 * @property {number} cost
 */

/**
 * @typedef {object} VictoryResult
 * @property {string} winner
 * @property {string} condition
 */

/**
 * @typedef {object} BaseState
 * @property {string} faction
 * @property {number} x
 * @property {number} y
 * @property {number} durability
 * @property {number} maxDurability
 * @property {number} captureProgress
 * @property {string} capturingFaction
 * @property {number} repairPerTurn
 */

/**
 * @typedef {object} BaseSettlementResult
 * @property {BaseState[]} bases
 * @property {string[]} messages
 * @property {VictoryResult | null} victory
 */

/**
 * @typedef {object} FactionScoreBreakdown
 * @property {number} baseDurabilityScore
 * @property {number} survivingUnitsScore
 * @property {number} unitHpScore
 * @property {number} killCountScore
 * @property {number} captureProgressScore
 * @property {number} totalScore
 */

/**
 * @typedef {object} ScoreSettlementResult
 * @property {'red' | 'blue' | 'draw'} winner
 * @property {string} condition
 * @property {{red: FactionScoreBreakdown, blue: FactionScoreBreakdown}} scores
 * @property {number} scoreDiff
 */

/**
 * @typedef {keyof typeof unitConfig} UnitType
 * @typedef {keyof typeof boardConfig.terrain} TerrainType
 */

/**
 * @param {Unit} unit
 * @param {string} statusType
 * @returns {StatusEffect | null}
 */
export function getStatusEffect(unit, statusType) {
  if (!unit.statusEffects || unit.statusEffects.length === 0) return null;
  return unit.statusEffects.find(s => s.type === statusType) || null;
}

/**
 * @param {Unit} unit
 * @param {string} statusType
 * @returns {boolean}
 */
export function hasStatusEffect(unit, statusType) {
  return getStatusEffect(unit, statusType) !== null;
}

/**
 * @param {Unit} unit
 * @returns {boolean}
 */
export function isHardCC(unit) {
  const hardTypes = [STATUS_EFFECT_TYPES.STUN, STATUS_EFFECT_TYPES.FREEZE];
  return hardTypes.some(t => hasStatusEffect(unit, t)) || unit.stunned > 0;
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {number}
 */
export function getEffectiveMoveRange(unit, unitType) {
  const config = unitConfig[unitType];
  let moveRange = config.moveRange;

  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  const growth = gameRules.experience.statGrowth;
  moveRange += (allocatedStats.move || 0) * growth.move;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.move) moveRange += bonuses.move;
  }

  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'moveBoost') {
        moveRange += /** @type {number} */ (buff.value);
      }
    }
  }

  const slowEffect = getStatusEffect(unit, STATUS_EFFECT_TYPES.SLOW);
  if (slowEffect) {
    const reduction = slowEffect.value ?? gameRules.statusEffects.slow.defaultMoveReduction;
    moveRange = Math.max(gameRules.statusEffects.slow.minMoveRange, moveRange - reduction);
  }

  return moveRange;
}

/**
 * @param {Unit} unit
 * @param {string} statusType
 * @param {UnitType} unitType
 * @returns {number}
 */
export function getStatusResistance(unit, statusType, unitType) {
  const config = unitConfig[unitType];
  let resistance = (config.statusResistance && config.statusResistance[statusType]) || 0;

  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'statusResistBoost') {
        resistance = Math.min(0.95, resistance + (buff.value || 0));
      }
    }
  }

  return resistance;
}

/**
 * @param {Unit} unit
 * @param {string} statusType
 * @param {UnitType} unitType
 * @returns {boolean}
 */
export function isImmuneToStatus(unit, statusType, unitType) {
  const config = unitConfig[unitType];
  const immunities = /** @type {string[]} */ (config.statusImmunities || []);
  return immunities.includes(statusType);
}

/**
 * @param {Unit} unit
 * @param {string} statusType
 * @param {number} duration
 * @param {UnitType} unitType
 * @returns {{ applied: boolean; duration: number; resisted: boolean; immune: boolean }}
 */
export function checkStatusApplication(unit, statusType, duration, unitType) {
  if (isImmuneToStatus(unit, statusType, unitType)) {
    return { applied: false, duration: 0, resisted: false, immune: true };
  }

  const resistance = getStatusResistance(unit, statusType, unitType);
  if (resistance > 0) {
    const roll = Math.random();
    if (roll < resistance) {
      return { applied: false, duration: 0, resisted: true, immune: false };
    }
  }

  return { applied: true, duration, resisted: false, immune: false };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string[][] | null} [boardLayout]
 * @returns {TerrainInfo | null}
 */
export function getTerrain(x, y, boardLayout) {
  if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) {
    return null;
  }
  const layout = boardLayout || boardConfig.layout;
  const terrainType = /** @type {TerrainType} */ (layout[y][x]);
  const terrainData = boardConfig.terrain[terrainType];
  return { ...terrainData, type: terrainType, moraleBonus: terrainData.moraleBonus ?? 0 };
}

/**
 * @param {Record<string, TileEffect>} tileEffects
 * @param {number} x
 * @param {number} y
 * @returns {TileEffect | null}
 */
export function getTileEffectAt(tileEffects, x, y) {
  if (!tileEffects) return null;
  return tileEffects[`${x},${y}`] || null;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Record<string, TileEffect> | null} tileEffects
 * @param {string[][] | null} [boardLayout]
 * @returns {number}
 */
export function getEffectiveMoveCost(x, y, tileEffects, boardLayout) {
  const terrain = getTerrain(x, y, boardLayout);
  if (!terrain) return 99;
  let cost = terrain.moveCost;
  const effect = getTileEffectAt(tileEffects || {}, x, y);
  if (effect) {
    const config = tileEffectConfig[/** @type {keyof typeof tileEffectConfig} */ (effect.type)];
    if (config) {
      cost += config.moveCostAdd;
    }
  }
  return cost;
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {string}
 */
export function getMoveSkillForUnit(unit, unitType) {
  const config = unitConfig[unitType];
  return config.moveSkill || MOVE_SKILL_TYPES.PENETRATE;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Record<string, TileEffect> | null} tileEffects
 * @param {string[][] | null} [boardLayout]
 * @param {string} [moveSkill]
 * @param {number} [pathStep]
 * @returns {number}
 */
export function getEffectiveMoveCostWithSkill(x, y, tileEffects, boardLayout, moveSkill, pathStep) {
  let cost = getEffectiveMoveCost(x, y, tileEffects, boardLayout);
  if (!moveSkill) return cost;

  const skillInfo = MOVE_SKILL_INFO[moveSkill];
  if (!skillInfo) return cost;

  if (moveSkill === MOVE_SKILL_TYPES.CHARGE) {
    if (pathStep === 0 && skillInfo.firstTileExtraCost) {
      cost += skillInfo.firstTileExtraCost;
    }
  }

  if (moveSkill === MOVE_SKILL_TYPES.PENETRATE) {
    if (skillInfo.terrainCostReduction && cost > 1) {
      cost = Math.max(1, cost - skillInfo.terrainCostReduction);
    }
  }

  if (moveSkill === MOVE_SKILL_TYPES.HALT) {
    if (skillInfo.terrainCostAdd) {
      cost += skillInfo.terrainCostAdd;
    }
  }

  return cost;
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {boolean}
 */
export function isUnitImmuneToDisplacement(unit, unitType) {
  const moveSkill = getMoveSkillForUnit(unit, unitType);
  if (moveSkill === MOVE_SKILL_TYPES.HALT) {
    return MOVE_SKILL_INFO[MOVE_SKILL_TYPES.HALT].immuneToDisplacement || false;
  }
  return false;
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {{ defenseBonus: number, moraleBonus: number }}
 */
export function getHaltStationaryBonus(unit, unitType) {
  const moveSkill = getMoveSkillForUnit(unit, unitType);
  if (moveSkill !== MOVE_SKILL_TYPES.HALT) return { defenseBonus: 0, moraleBonus: 0 };
  if (unit.hasMoved) return { defenseBonus: 0, moraleBonus: 0 };
  const skillInfo = MOVE_SKILL_INFO[MOVE_SKILL_TYPES.HALT];
  return {
    defenseBonus: skillInfo.stationaryDefenseBonus || 0,
    moraleBonus: skillInfo.stationaryMoraleBonus || 0
  };
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {{ attackBonus: number, duration: number }}
 */
export function getChargePostMoveBonus(unit, unitType) {
  const moveSkill = getMoveSkillForUnit(unit, unitType);
  if (moveSkill !== MOVE_SKILL_TYPES.CHARGE) return { attackBonus: 0, duration: 0 };
  if (!unit.hasMoved) return { attackBonus: 0, duration: 0 };
  const skillInfo = MOVE_SKILL_INFO[MOVE_SKILL_TYPES.CHARGE];
  return {
    attackBonus: skillInfo.postMoveAttackBonus || 0,
    duration: skillInfo.postMoveAttackBuffDuration || 1
  };
}

/**
 * @param {{x: number, y: number}[]} path
 * @param {Unit[]} units
 * @param {string} faction
 * @param {string} moveSkill
 * @returns {boolean}
 */
export function didPathPassThroughFriendly(path, units, faction, moveSkill) {
  if (moveSkill !== MOVE_SKILL_TYPES.PENETRATE) return false;
  for (const pos of path) {
    const unitAtPos = units.find(u => u.x === pos.x && u.y === pos.y);
    if (unitAtPos && unitAtPos.faction === faction) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Unit[]} units
 * @param {Record<string, TileEffect>} tileEffects
 * @returns {TileEffectResult[]}
 */
export function processTileEffectsOnUnits(units, tileEffects) {
  /** @type {TileEffectResult[]} */
  const results = [];
  if (!tileEffects) return results;

  for (const unit of units) {
    const effect = getTileEffectAt(tileEffects, unit.x, unit.y);
    if (!effect) continue;

    const config = tileEffectConfig[/** @type {keyof typeof tileEffectConfig} */ (effect.type)];
    if (!config) continue;

    const unitName = unitConfig[/** @type {UnitType} */ (unit.type)].name;
    const factionName = unit.faction === 'red' ? '红方' : '蓝方';
    let damage = 0;
    /** @type {string[]} */
    const messages = [];
    /** @type {{unitId: string, statusType: string, duration: number, value?: number}[]} */
    const statusApplications = [];

    if (config.damagePerTurn > 0) {
      damage = config.damagePerTurn;
      messages.push(`${factionName}${unitName} 受【${config.name}】地形效果，受到 ${damage} 点伤害`);
    }

    if (config.applyStatus) {
      statusApplications.push({
        unitId: unit.id,
        statusType: config.applyStatus,
        duration: config.applyStatusDuration || 1,
        value: config.applyStatusValue
      });
      const statusInfo = getStatusInfo(config.applyStatus);
      messages.push(`${factionName}${unitName} 受【${config.name}】地形效果，附加【${statusInfo.name}】状态`);
    }

    results.push({ unitId: unit.id, damage, messages, statusApplications });
  }

  return results;
}

/**
 * @param {Record<string, TileEffect>} tileEffects
 * @returns {Record<string, TileEffect>}
 */
export function tickTileEffects(tileEffects) {
  if (!tileEffects) return {};
  /** @type {Record<string, TileEffect>} */
  const newEffects = {};
  for (const [key, effect] of Object.entries(tileEffects)) {
    const newDuration = effect.duration - 1;
    if (newDuration > 0) {
      newEffects[key] = { ...effect, duration: newDuration };
    }
  }
  return newEffects;
}

/**
 * @param {number} morale
 * @returns {MoraleTier}
 */
export function getMoraleTier(morale) {
  const tiers = gameRules.morale.tiers;
  const clamped = Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, morale));
  const found = tiers.find(t => clamped >= t.min && clamped <= t.max);
  return found || tiers[Math.floor(tiers.length / 2)];
}

/**
 * @param {number} morale
 * @returns {number}
 */
export function getMoraleDamageMultiplier(morale) {
  return getMoraleTier(morale).damageMultiplier;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string[][] | null} [boardLayout]
 * @returns {boolean}
 */
export function isPassable(x, y, boardLayout) {
  const terrain = getTerrain(x, y, boardLayout);
  if (!terrain) return false;
  return terrain.passable !== false;
}

/**
 * @param {Unit} unit
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {MoveTile[]}
 */
export function getMoveRange(unit, units, boardLayout, tileEffects) {
  const moveRange = getEffectiveMoveRange(unit, /** @type {UnitType} */ (unit.type));
  const moveSkill = getMoveSkillForUnit(unit, /** @type {UnitType} */ (unit.type));
  const isCharge = moveSkill === MOVE_SKILL_TYPES.CHARGE;
  const isPenetrate = moveSkill === MOVE_SKILL_TYPES.PENETRATE;

  /** @type {Map<string, number>} */
  const visited = new Map();
  /** @type {{x: number, y: number, cost: number, step: number}[]} */
  const queue = [{ x: unit.x, y: unit.y, cost: 0, step: 0 }];
  visited.set(`${unit.x},${unit.y}`, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) continue;

    if (current.cost >= moveRange) continue;

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y, boardLayout)) continue;

      const newCost = current.cost + getEffectiveMoveCostWithSkill(neighbor.x, neighbor.y, tileEffects || null, boardLayout, moveSkill, current.step);

      if (newCost > moveRange) continue;

      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key) && /** @type {number} */ (visited.get(key)) <= newCost) continue;

      const unitAtPos = units.find(/** @param {Unit} u */ u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos) {
        if (unitAtPos.faction !== unit.faction) {
          if (!isCharge) continue;
        } else {
          if (!isPenetrate && unitAtPos.id !== unit.id) continue;
        }
      }

      visited.set(key, newCost);
      queue.push({ x: neighbor.x, y: neighbor.y, cost: newCost, step: current.step + 1 });
    }
  }

  /** @type {MoveTile[]} */
  const result = [];
  for (const [key, cost] of visited.entries()) {
    const [x, y] = key.split(',').map(Number);
    if (x === unit.x && y === unit.y) continue;
    const unitAtPos = units.find(/** @param {Unit} u */ u => u.x === x && u.y === y);
    if (unitAtPos) continue;
    result.push({ x, y, cost });
  }

  return result;
}

/**
 * @param {Unit} unit
 * @param {Unit[]} units
 * @returns {AttackTile[]}
 */
export function getAttackRange(unit, units) {
  const config = unitConfig[/** @type {UnitType} */ (unit.type)];
  let attackRange = config.attackRange;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unit.type]?.find(s => s.id === unit.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.attackRange) attackRange += bonuses.attackRange;
  }

  /** @type {AttackTile[]} */
  const result = [];

  for (let dy = -attackRange; dy <= attackRange; dy++) {
    for (let dx = -attackRange; dx <= attackRange; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > attackRange) continue;

      const x = unit.x + dx;
      const y = unit.y + dy;

      if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;

      const targetUnit = units.find(
        /** @param {Unit} u */
        u => u.x === x && u.y === y && u.faction !== unit.faction
      );
      if (targetUnit) {
        result.push({ x, y, target: targetUnit });
      }
    }
  }

  return result;
}

/**
 * @param {Unit} unit
 * @returns {{x: number, y: number}[]}
 */
export function getAttackRangeTiles(unit) {
  const config = unitConfig[/** @type {UnitType} */ (unit.type)];
  let attackRange = config.attackRange;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unit.type]?.find(s => s.id === unit.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.attackRange) attackRange += bonuses.attackRange;
  }

  /** @type {{x: number, y: number}[]} */
  const result = [];

  for (let dy = -attackRange; dy <= attackRange; dy++) {
    for (let dx = -attackRange; dx <= attackRange; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > attackRange) continue;

      const x = unit.x + dx;
      const y = unit.y + dy;

      if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;

      result.push({ x, y });
    }
  }

  return result;
}

/**
 * @typedef {object} ThreatTileData
 * @property {number} threatCount
 * @property {number} counterCount
 * @property {number} estimatedDamage
 * @property {string[]} threatTypes
 * @property {number} counterDamage
 */

/**
 * @param {Unit} enemy
 * @param {Unit[]} allUnits
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {{x: number, y: number}[]}
 */
export function getEnemyMoveAttackCoverage(enemy, allUnits, boardLayout, tileEffects) {
  const enemyType = /** @type {UnitType} */ (enemy.type);
  const attackRange = getEffectiveAttackRange(enemy, enemyType);
  const moveRange = getEffectiveMoveRange(enemy, enemyType);
  const moveSkill = getMoveSkillForUnit(enemy, enemyType);
  const isCharge = moveSkill === MOVE_SKILL_TYPES.CHARGE;
  const isPenetrate = moveSkill === MOVE_SKILL_TYPES.PENETRATE;

  /** @type {Set<string>} */
  const covered = new Set();

  if (enemy.hasMoved || isHardCC(enemy)) {
    for (let dy = -attackRange; dy <= attackRange; dy++) {
      for (let dx = -attackRange; dx <= attackRange; dx++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist === 0 || dist > attackRange) continue;
        const x = enemy.x + dx;
        const y = enemy.y + dy;
        if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;
        covered.add(`${x},${y}`);
      }
    }
    return Array.from(covered).map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
  }

  /** @type {Map<string, number>} */
  const visited = new Map();
  const queue = [{ x: enemy.x, y: enemy.y, cost: 0, step: 0 }];
  visited.set(`${enemy.x},${enemy.y}`, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) continue;
    if (current.cost > moveRange) continue;

    for (let dy = -attackRange; dy <= attackRange; dy++) {
      for (let dx = -attackRange; dx <= attackRange; dx++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist === 0 || dist > attackRange) continue;
        const tx = current.x + dx;
        const ty = current.y + dy;
        if (tx < 0 || tx >= boardConfig.width || ty < 0 || ty >= boardConfig.height) continue;
        covered.add(`${tx},${ty}`);
      }
    }

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y, boardLayout)) continue;
      const newCost = current.cost + getEffectiveMoveCostWithSkill(neighbor.x, neighbor.y, tileEffects || null, boardLayout, moveSkill, current.step);
      if (newCost > moveRange) continue;
      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key) && /** @type {number} */ (visited.get(key)) <= newCost) continue;
      const unitAtPos = allUnits.find(u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos) {
        if (unitAtPos.faction !== enemy.faction) {
          if (!isCharge) continue;
        } else {
          if (!isPenetrate && unitAtPos.id !== enemy.id) continue;
        }
      }
      visited.set(key, newCost);
      queue.push({ x: neighbor.x, y: neighbor.y, cost: newCost, step: current.step + 1 });
    }
  }

  return Array.from(covered).map(k => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  });
}

/**
 * @param {Unit} unit
 * @param {UnitType} unitType
 * @returns {number}
 */
function getEffectiveAttackRange(unit, unitType) {
  const config = unitConfig[unitType];
  let attackRange = config.attackRange;
  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.attackRange) attackRange += bonuses.attackRange;
  }
  return attackRange;
}

/**
 * @param {Unit} friendlyUnit
 * @param {{x: number, y: number}} position
 * @param {Unit[]} enemyUnits
 * @param {TerrainInfo | null} positionTerrain
 * @returns {{ counterCount: number, counterDamage: number, counterSources: { unitId: string, damage: number }[] }}
 */
export function getCounterThreatAtPosition(friendlyUnit, position, enemyUnits, positionTerrain) {
  const friendlyAtPos = { ...friendlyUnit, x: position.x, y: position.y };
  const counterDamageRatio = gameRules.combat.counterAttackDamageRatio;
  let counterCount = 0;
  let totalCounterDamage = 0;
  /** @type {{ unitId: string, damage: number }[]} */
  const counterSources = [];

  for (const enemy of enemyUnits) {
    if (isHardCC(enemy)) continue;
    const enemyType = /** @type {UnitType} */ (enemy.type);
    const enemyAtkRange = getEffectiveAttackRange(enemy, enemyType);
    const distance = Math.abs(enemy.x - position.x) + Math.abs(enemy.y - position.y);
    if (distance === 0 || distance > enemyAtkRange) continue;

    const rawCounter = calculateDamage(enemy, friendlyAtPos, positionTerrain);
    const counterDmg = Math.max(1, Math.floor(rawCounter * counterDamageRatio));
    const hasShield = friendlyAtPos.buffs?.some(b => b.type === 'shield');
    const actualDmg = hasShield ? 0 : counterDmg;

    counterCount++;
    totalCounterDamage += actualDmg;
    counterSources.push({ unitId: enemy.id, damage: actualDmg });
  }

  return { counterCount, counterDamage: totalCounterDamage, counterSources };
}

/**
 * @param {Unit[]} enemyUnits
 * @param {Unit} friendlyUnit
 * @param {Unit[]} allUnits
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {Map<string, ThreatTileData>}
 */
export function buildFullThreatMap(enemyUnits, friendlyUnit, allUnits, boardLayout, tileEffects) {
  /** @type {Map<string, ThreatTileData>} */
  const map = new Map();

  for (const enemy of enemyUnits) {
    if (isHardCC(enemy)) continue;
    const coverage = getEnemyMoveAttackCoverage(enemy, allUnits, boardLayout, tileEffects);
    for (const tile of coverage) {
      const key = `${tile.x},${tile.y}`;
      const existing = map.get(key) || { threatCount: 0, counterCount: 0, estimatedDamage: 0, threatTypes: [], counterDamage: 0 };
      existing.threatCount += 1;
      if (!existing.threatTypes.includes(enemy.type)) {
        existing.threatTypes.push(enemy.type);
      }
      map.set(key, existing);
    }
  }

  return map;
}

/**
 * @param {UnitType} attackerType
 * @param {UnitType} defenderType
 * @returns {number}
 */
export function getCounterMultiplier(attackerType, defenderType) {
  const counters = COUNTER_RELATIONSHIPS[attackerType];
  if (counters && counters[defenderType]) {
    return counters[defenderType];
  }
  return 1.0;
}

/**
 * @param {UnitType} attackerType
 * @param {UnitType} defenderType
 * @returns {{ label: string | null; isAdvantage: boolean }}
 */
export function getCounterInfo(attackerType, defenderType) {
  const counters = COUNTER_RELATIONSHIPS[attackerType];
  if (counters && counters[defenderType]) {
    const labels = COUNTER_LABELS[attackerType];
    return { label: labels?.[defenderType] || null, isAdvantage: true };
  }
  const reverseCounters = COUNTER_RELATIONSHIPS[defenderType];
  if (reverseCounters && reverseCounters[attackerType]) {
    const labels = COUNTER_LABELS[defenderType];
    return { label: labels?.[attackerType] || null, isAdvantage: false };
  }
  return { label: null, isAdvantage: false };
}

/**
 * @param {Unit} unit
 * @param {Unit[]} allUnits
 * @returns {{ buffs: { unitId: string; buff: { type: string; duration: number; value: number } }[]; messages: string[] }}
 */
export function calculateSynergyBonuses(unit, allUnits) {
  /** @type {{ unitId: string; buff: { type: string; duration: number; value: number } }[]} */
  const buffs = [];
  /** @type {string[]} */
  const messages = [];
  const unitType = /** @type {UnitType} */ (unit.type);

  for (const [, config] of Object.entries(SYNERGY_CONFIG)) {
    if (!config.requiredTypes.includes(unitType)) continue;

    const otherType = config.requiredTypes.find(t => t !== unitType) || config.requiredTypes[0];
    const nearbyAllies = allUnits.filter(u =>
      u.faction === unit.faction &&
      u.id !== unit.id &&
      u.type === otherType &&
      Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) <= config.range
    );

    if (nearbyAllies.length === 0) continue;

    const shouldApply =
      config.beneficiaryType === 'both' ||
      config.beneficiaryType === unitType;

    if (!shouldApply) continue;

    buffs.push({
      unitId: unit.id,
      buff: {
        type: config.effect.type,
        duration: config.effect.duration,
        value: config.effect.value
      }
    });

    const unitName = unitConfig[unitType].name;
    messages.push(`${unitName}触发【${config.name}】：${config.description}`);
  }

  return { buffs, messages };
}

/**
 * @param {Unit[]} units
 * @param {string} faction
 * @returns {{ allBuffs: { unitId: string; buff: { type: string; duration: number; value: number } }[]; messages: string[] }}
 */
export function calculateAllSynergies(units, faction) {
  /** @type {{ unitId: string; buff: { type: string; duration: number; value: number } }[]} */
  const allBuffs = [];
  /** @type {string[]} */
  const messages = [];
  const factionUnits = units.filter(u => u.faction === faction);

  for (const unit of factionUnits) {
    const result = calculateSynergyBonuses(unit, units);
    allBuffs.push(...result.buffs);
    messages.push(...result.messages);
  }

  return { allBuffs, messages };
}

/**
 * @param {Unit} attacker
 * @param {Unit} defender
 * @param {TerrainInfo | null} [terrain]
 * @returns {number}
 */
export function calculateDamage(attacker, defender, terrain) {
  const attackerConfig = unitConfig[/** @type {UnitType} */ (attacker.type)];
  const defenderConfig = unitConfig[/** @type {UnitType} */ (defender.type)];

  let attack = attackerConfig.attack;
  let defense = defenderConfig.defense;

  const growth = gameRules.experience.statGrowth;
  const atkAllocated = attacker.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  const defAllocated = defender.allocatedStats || { def: 0, hp: 0 };

  attack += atkAllocated.atk * growth.atk;
  defense += (defAllocated.def || 0) * growth.def;

  if (attacker.specialization) {
    const spec = SPECIALIZATION_CONFIG[attacker.type]?.find(s => s.id === attacker.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.atk) attack += bonuses.atk;
  }
  if (defender.specialization) {
    const spec = SPECIALIZATION_CONFIG[defender.type]?.find(s => s.id === defender.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.def) defense += bonuses.def;
  }

  if (attacker.buffs) {
    for (const buff of attacker.buffs) {
      if (buff.type === 'attackBoost') {
        attack *= (1 + /** @type {number} */ (buff.value));
      }
    }
  }

  if (defender.buffs) {
    for (const buff of defender.buffs) {
      if (buff.type === 'defenseBoost') {
        defense *= (1 + /** @type {number} */ (buff.value));
      }
      if (buff.type === 'haltDefense' && !defender.hasMoved) {
        defense *= (1 + /** @type {number} */ (buff.value));
      }
    }
  }

  if (gameRules.combat.terrainDefenseBonus && terrain) {
    defense += terrain.defenseBonus;
  }

  const effectiveMaxHp = attacker.maxHp || attackerConfig.hp;
  const hpRatio = attacker.currentHp / effectiveMaxHp;
  attack *= hpRatio;

  const moraleMul = getMoraleDamageMultiplier(attacker.morale ?? gameRules.morale.initial);
  attack *= moraleMul;

  const counterMul = getCounterMultiplier(attacker.type, defender.type);
  attack *= counterMul;

  if (attacker.specialization) {
    const spec = SPECIALIZATION_CONFIG[attacker.type]?.find(s => s.id === attacker.specialization);
    /** @type {any} */ const bonuses = spec?.bonuses;
    if (bonuses?.highHpBonus && (defender.currentHp / (defender.maxHp || defenderConfig.hp)) > 0.7) {
      attack *= (1 + bonuses.highHpBonus);
    }
  }

  if (defender.specialization) {
    const spec = SPECIALIZATION_CONFIG[defender.type]?.find(s => s.id === defender.specialization);
    /** @type {any} */
    const specBonuses = spec?.bonuses;
    if (specBonuses?.allyDamageReduction) {
      const range = specBonuses.allyDamageReductionRange || 2;
      const hasAlly = false;
      if (hasAlly) {
        attack *= (1 - (specBonuses.allyDamageReduction || 0));
      }
    }
  }

  let damage = Math.floor(attack * (100 / (100 + defense)));

  const frozen = hasStatusEffect(defender, STATUS_EFFECT_TYPES.FREEZE);
  if (frozen) {
    damage = Math.floor(damage * gameRules.statusEffects.freeze.extraDamageMultiplier);
  }

  return Math.max(1, damage);
}

/**
 * @param {{x: number, y: number}} start
 * @param {{x: number, y: number}} end
 * @param {Unit[]} units
 * @param {Unit} unit
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {PathResult | null}
 */
export function findPath(start, end, units, unit, boardLayout, tileEffects) {
  const moveRange = getEffectiveMoveRange(unit, /** @type {UnitType} */ (unit.type));
  const moveSkill = getMoveSkillForUnit(unit, /** @type {UnitType} */ (unit.type));
  const isCharge = moveSkill === MOVE_SKILL_TYPES.CHARGE;
  const isPenetrate = moveSkill === MOVE_SKILL_TYPES.PENETRATE;

  /** @type {Map<string, {x: number, y: number}>} */
  const openSet = new Map();
  /** @type {Map<string, string>} */
  const cameFrom = new Map();
  /** @type {Map<string, number>} */
  const gScore = new Map();
  /** @type {Map<string, number>} */
  const fScore = new Map();
  /** @type {Map<string, number>} */
  const stepMap = new Map();

  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;

  openSet.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));
  stepMap.set(startKey, 0);

  while (openSet.size > 0) {
    /** @type {string | null} */
    let currentKey = null;
    let lowestF = Infinity;
    for (const key of openSet.keys()) {
      const f = fScore.get(key) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentKey = key;
      }
    }

    if (currentKey === endKey) {
      /** @type {MoveTile[]} */
      const path = [];
      let key = currentKey;
      while (cameFrom.has(key)) {
        const [x, y] = key.split(',').map(Number);
        path.unshift({ x, y, cost: 0 });
        const prev = cameFrom.get(key);
        if (!prev) break;
        key = prev;
      }
      return { path, cost: gScore.get(endKey) ?? 0 };
    }

    if (!currentKey) break;
    const current = openSet.get(currentKey);
    if (!current) break;
    openSet.delete(currentKey);

    const currentStep = stepMap.get(currentKey) ?? 0;

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y, boardLayout)) continue;

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + getEffectiveMoveCostWithSkill(neighbor.x, neighbor.y, tileEffects || null, boardLayout, moveSkill, currentStep);

      if (tentativeG > moveRange) continue;

      const unitAtPos = units.find(/** @param {Unit} u */ u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos) {
        if (unitAtPos.faction !== unit.faction) {
          if (!isCharge) continue;
        } else {
          if (unitAtPos.id !== unit.id && !isPenetrate) continue;
        }
      }

      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
        stepMap.set(neighborKey, currentStep + 1);

        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, neighbor);
        }
      }
    }
  }

  return null;
}

/**
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {number}
 */
function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * @typedef {object} CombatPreviewModifier
 * @property {string} label
 * @property {string} value
 * @property {string} [color]
 */

/**
 * @typedef {object} CombatPreview
 * @property {number} estimatedDamage
 * @property {boolean} willKill
 * @property {number} defenderRemainingHp
 * @property {boolean} shieldBlocked
 * @property {boolean} canCounter
 * @property {boolean} willCounter
 * @property {number} counterDamage
 * @property {boolean} counterWillKill
 * @property {number} attackerRemainingHp
 * @property {CombatPreviewModifier[]} attackModifiers
 * @property {CombatPreviewModifier[]} terrainModifiers
 */

/**
 * @param {Unit} attacker
 * @param {Unit} defender
 * @param {TerrainInfo | null} [defenderTerrain]
 * @param {TerrainInfo | null} [attackerTerrain]
 * @returns {CombatPreview}
 */
export function calculateCombatPreview(attacker, defender, defenderTerrain, attackerTerrain) {
  const rawDamage = calculateDamage(attacker, defender, defenderTerrain);
  const hasShield = defender.buffs?.some(b => b.type === 'shield');
  const shieldBlocked = !!hasShield;
  const estimatedDamage = shieldBlocked ? 0 : rawDamage;
  const willKill = !shieldBlocked && defender.currentHp - estimatedDamage <= 0;
  const defenderRemainingHp = shieldBlocked ? defender.currentHp : Math.max(0, defender.currentHp - estimatedDamage);

  const defenderConfig = unitConfig[/** @type {UnitType} */ (defender.type)];
  const distance = Math.abs(attacker.x - defender.x) + Math.abs(attacker.y - defender.y);
  const canCounter = gameRules.combat.counterAttack
    && distance <= defenderConfig.attackRange
    && !isHardCC(defender);
  const willCounter = canCounter && !willKill;

  let counterDamage = 0;
  let counterWillKill = false;
  let attackerRemainingHp = attacker.currentHp;

  if (willCounter) {
    const fullCounterDamage = calculateDamage(defender, attacker, attackerTerrain);
    counterDamage = Math.max(1, Math.floor(fullCounterDamage * gameRules.combat.counterAttackDamageRatio));
    const attackerHasShield = attacker.buffs?.some(b => b.type === 'shield');
    if (attackerHasShield) {
      counterDamage = 0;
    }
    counterWillKill = counterDamage > 0 && attacker.currentHp - counterDamage <= 0;
    attackerRemainingHp = counterDamage > 0 ? Math.max(0, attacker.currentHp - counterDamage) : attacker.currentHp;
  }

  /** @type {CombatPreviewModifier[]} */
  const attackModifiers = [];

  const counterInfo = getCounterInfo(attacker.type, defender.type);
  if (counterInfo.isAdvantage && counterInfo.label) {
    attackModifiers.push({
      label: `克制·${counterInfo.label}`,
      value: `×${getCounterMultiplier(attacker.type, defender.type)}`,
      color: '#4caf50'
    });
  } else if (counterInfo.label) {
    const reverseInfo = getCounterInfo(defender.type, attacker.type);
    if (reverseInfo.isAdvantage) {
      attackModifiers.push({
        label: `被克·${counterInfo.label}`,
        value: `×${getCounterMultiplier(defender.type, attacker.type)}`,
        color: '#ef5350'
      });
    }
  }

  const attackerMorale = getMoraleTier(attacker.morale ?? 80);
  if (attackerMorale.damageMultiplier !== 1.0) {
    const isBoost = attackerMorale.damageMultiplier > 1.0;
    attackModifiers.push({
      label: `士气${attackerMorale.label}`,
      value: `×${attackerMorale.damageMultiplier}`,
      color: isBoost ? '#4caf50' : '#ef5350'
    });
  }

  const hpRatio = attacker.currentHp / attacker.maxHp;
  if (hpRatio < 1.0) {
    attackModifiers.push({
      label: '伤损比例',
      value: `×${hpRatio.toFixed(2)}`,
      color: '#f39c12'
    });
  }

  const atkBoost = attacker.buffs?.find(b => b.type === 'attackBoost');
  if (atkBoost) {
    attackModifiers.push({
      label: '攻击强化',
      value: `+${Math.round((atkBoost.value || 0) * 100)}%`,
      color: '#4caf50'
    });
  }

  const defBoost = defender.buffs?.find(b => b.type === 'defenseBoost');
  if (defBoost) {
    attackModifiers.push({
      label: '目标防御强化',
      value: `+${Math.round((defBoost.value || 0) * 100)}%`,
      color: '#ef5350'
    });
  }

  if (hasStatusEffect(defender, STATUS_EFFECT_TYPES.FREEZE)) {
    attackModifiers.push({
      label: '冰冻额外伤害',
      value: `×${gameRules.statusEffects.freeze.extraDamageMultiplier}`,
      color: '#00bcd4'
    });
  }

  if (shieldBlocked) {
    attackModifiers.push({
      label: '护盾抵消',
      value: '伤害归零',
      color: '#3498db'
    });
  }

  /** @type {CombatPreviewModifier[]} */
  const terrainModifiers = [];

  if (defenderTerrain && defenderTerrain.defenseBonus > 0) {
    terrainModifiers.push({
      label: `${defenderTerrain.name}防御加成`,
      value: `+${defenderTerrain.defenseBonus}`,
      color: '#8d6e63'
    });
  }

  if (defenderTerrain && defenderTerrain.moraleBonus > 0) {
    const isOwnBase = defenderTerrain.isBase && defenderTerrain.faction === defender.faction;
    const applies = isOwnBase || !defenderTerrain.isBase;
    if (applies) {
      terrainModifiers.push({
        label: `${defenderTerrain.name}士气加成`,
        value: `+${defenderTerrain.moraleBonus}`,
        color: '#66bb6a'
      });
    }
  }

  if (willCounter) {
    const defMorale = getMoraleTier(defender.morale ?? 80);
    terrainModifiers.push({
      label: `反击（×${gameRules.combat.counterAttackDamageRatio}）`,
      value: `${counterDamage} 伤害`,
      color: '#ff9800'
    });
    if (defMorale.damageMultiplier !== 1.0) {
      const isBoost = defMorale.damageMultiplier > 1.0;
      terrainModifiers.push({
        label: `反击方士气${defMorale.label}`,
        value: `×${defMorale.damageMultiplier}`,
        color: isBoost ? '#4caf50' : '#ef5350'
      });
    }
  } else if (gameRules.combat.counterAttack) {
    terrainModifiers.push({
      label: '无法反击',
      value: willKill ? '将被击杀' : (distance > defenderConfig.attackRange ? '超出射程' : '被控制'),
      color: '#9e9e9e'
    });
  }

  return {
    estimatedDamage,
    willKill,
    defenderRemainingHp,
    shieldBlocked,
    canCounter,
    willCounter,
    counterDamage,
    counterWillKill,
    attackerRemainingHp,
    attackModifiers,
    terrainModifiers
  };
}

/**
 * @param {Unit[]} units
 * @param {string} currentFaction
 * @param {string[][] | null} [boardLayout]
 * @param {BaseState[]} [bases]
 * @returns {VictoryResult | null}
 */
export function checkVictory(units, currentFaction, boardLayout, bases) {
  const enemyFaction = currentFaction === 'red' ? 'blue' : 'red';
  const enemyUnits = units.filter(/** @param {Unit} u */ u => u.faction === enemyFaction);

  if (gameRules.victoryConditions.destroyAll.enabled && enemyUnits.length === 0) {
    return { winner: currentFaction, condition: '消灭所有敌军' };
  }

  if (gameRules.victoryConditions.captureBase.enabled && bases && bases.length > 0) {
    const captureTurnsRequired = gameRules.victoryConditions.captureBase.captureTurnsRequired || 3;
    for (const base of bases) {
      if (base.faction === enemyFaction && base.captureProgress >= captureTurnsRequired) {
        const terrain = getTerrain(base.x, base.y, boardLayout);
        const baseName = terrain?.name || '敌方基地';
        return { winner: currentFaction, condition: `占领${baseName}` };
      }
    }
  }

  return null;
}

/**
 * @param {Unit[]} units
 * @param {BaseState[]} bases
 * @param {'red' | 'blue'} faction
 * @param {{red: number, blue: number}} killCounts
 * @returns {FactionScoreBreakdown}
 */
export function calculateFactionScore(units, bases, faction, killCounts) {
  const weights = gameRules.scoreSettlement;
  const factionUnits = units.filter(u => u.faction === faction);
  const factionBase = bases.find(b => b.faction === faction);
  const enemyFaction = faction === 'red' ? 'blue' : 'red';
  const enemyBase = bases.find(b => b.faction === enemyFaction);

  let baseDurabilityScore = 0;
  if (factionBase) {
    baseDurabilityScore = (factionBase.durability / factionBase.maxDurability) * weights.baseDurabilityMaxScore * weights.baseDurabilityWeight;
  }

  const survivingUnitsScore = factionUnits.length * weights.survivingUnitsWeight;

  let unitHpScore = 0;
  for (const unit of factionUnits) {
    const hpRatio = unit.currentHp / (unit.maxHp || 1);
    unitHpScore += hpRatio * weights.unitHpWeight * 100;
  }

  const killCountScore = (killCounts[faction] || 0) * weights.killCountWeight;

  let captureProgressScore = 0;
  if (enemyBase && enemyBase.capturingFaction === faction) {
    const captureTurnsRequired = gameRules.victoryConditions.captureBase.captureTurnsRequired || 3;
    captureProgressScore = (enemyBase.captureProgress / captureTurnsRequired) * weights.captureProgressWeight;
  }

  const totalScore = baseDurabilityScore + survivingUnitsScore + unitHpScore + killCountScore + captureProgressScore;

  return {
    baseDurabilityScore: Math.round(baseDurabilityScore * 10) / 10,
    survivingUnitsScore: Math.round(survivingUnitsScore * 10) / 10,
    unitHpScore: Math.round(unitHpScore * 10) / 10,
    killCountScore: Math.round(killCountScore * 10) / 10,
    captureProgressScore: Math.round(captureProgressScore * 10) / 10,
    totalScore: Math.round(totalScore * 10) / 10
  };
}

/**
 * @param {Unit[]} units
 * @param {BaseState[]} bases
 * @param {{red: number, blue: number}} killCounts
 * @returns {ScoreSettlementResult}
 */
export function calculateScoreSettlement(units, bases, killCounts) {
  const redScore = calculateFactionScore(units, bases, 'red', killCounts);
  const blueScore = calculateFactionScore(units, bases, 'blue', killCounts);
  const scoreDiff = Math.abs(redScore.totalScore - blueScore.totalScore);

  /** @type {'red' | 'blue' | 'draw'} */
  let winner;
  /** @type {string} */
  let condition;

  if (scoreDiff <= gameRules.scoreSettlement.drawScoreThreshold) {
    winner = 'draw';
    condition = `超时平局！双方分差 ${scoreDiff.toFixed(1)} 未超过阈值`;
  } else if (redScore.totalScore > blueScore.totalScore) {
    winner = 'red';
    condition = `超时判定！红方以 ${redScore.totalScore.toFixed(1)} : ${blueScore.totalScore.toFixed(1)} 获胜（分差 ${scoreDiff.toFixed(1)}）`;
  } else {
    winner = 'blue';
    condition = `超时判定！蓝方以 ${blueScore.totalScore.toFixed(1)} : ${redScore.totalScore.toFixed(1)} 获胜（分差 ${scoreDiff.toFixed(1)}）`;
  }

  return {
    winner,
    condition,
    scores: { red: redScore, blue: blueScore },
    scoreDiff: Math.round(scoreDiff * 10) / 10
  };
}

/**
 * @param {number} turn
 * @param {Unit[]} units
 * @param {BaseState[]} bases
 * @param {{red: number, blue: number}} killCounts
 * @returns {ScoreSettlementResult | null}
 */
export function checkTimeoutVictory(turn, units, bases, killCounts) {
  if (!gameRules.victoryConditions.timeout.enabled) return null;
  if (turn < gameRules.maxTurns) return null;
  return calculateScoreSettlement(units, bases, killCounts);
}

/**
 * @param {Unit[]} units
 * @param {number} x
 * @param {number} y
 * @returns {Unit | null}
 */
export function getUnitAt(units, x, y) {
  return units.find(/** @param {Unit} u */ u => u.x === x && u.y === y) || null;
}

/**
 * @param {BaseState[]} bases
 * @param {Unit[]} units
 * @param {string} currentFaction
 * @param {string[][] | null} [boardLayout]
 * @returns {BaseSettlementResult}
 */
export function settleBases(bases, units, currentFaction, boardLayout) {
  /** @type {string[]} */
  const messages = [];
  /** @type {VictoryResult | null} */
  let victoryResult = null;

  const captureRule = gameRules.victoryConditions.captureBase;
  const captureTurnsRequired = captureRule.captureTurnsRequired || 3;

  const newBases = bases.map(base => {
    const newBase = { ...base };
    const unitsOnBase = units.filter(u => u.x === base.x && u.y === base.y);
    const friendlyUnits = unitsOnBase.filter(u => u.faction === base.faction);
    const enemyUnits = unitsOnBase.filter(u => u.faction !== base.faction);

    const terrain = getTerrain(base.x, base.y, boardLayout);
    const baseName = terrain?.name || '基地';

    if (enemyUnits.length > 0 && friendlyUnits.length === 0) {
      const damagePerUnit = captureRule.durabilityDamagePerUnit || 5;
      const baseDamage = captureRule.durabilityDamagePerTurn || 15;
      const totalDamage = baseDamage + (enemyUnits.length - 1) * damagePerUnit;
      
      newBase.durability = Math.max(0, newBase.durability - totalDamage);
      messages.push(`${baseName} 受到 ${totalDamage} 点耐久损伤（${enemyUnits.length} 个敌军）`);

      if (newBase.durability <= 0) {
        const enemyFaction = enemyUnits[0].faction;
        if (newBase.capturingFaction === enemyFaction) {
          newBase.captureProgress += 1;
        } else {
          newBase.captureProgress = 1;
          newBase.capturingFaction = enemyFaction;
        }
        
        const factionName = enemyFaction === 'red' ? '红方' : '蓝方';
        messages.push(`${baseName} 耐久归零！${factionName} 占领进度：${newBase.captureProgress}/${captureTurnsRequired}`);

        if (newBase.captureProgress >= captureTurnsRequired) {
          victoryResult = {
            winner: enemyFaction,
            condition: `占领${baseName}`
          };
        }
      } else {
        newBase.captureProgress = 0;
        newBase.capturingFaction = '';
      }
    } else if (friendlyUnits.length > 0) {
      const baseRepair = newBase.repairPerTurn || 5;
      const garrisonBonus = captureRule.garrisonRepairBonus || 10;
      const totalRepair = baseRepair + garrisonBonus;
      
      if (newBase.durability < newBase.maxDurability) {
        newBase.durability = Math.min(newBase.maxDurability, newBase.durability + totalRepair);
        messages.push(`${baseName} 驻守修复 +${totalRepair} 耐久`);
      }
      
      if (newBase.captureProgress > 0) {
        newBase.captureProgress = 0;
        newBase.capturingFaction = '';
        messages.push(`${baseName} 占领进度已清除`);
      }
    } else {
      if (newBase.durability < newBase.maxDurability && newBase.captureProgress === 0) {
        const baseRepair = newBase.repairPerTurn || 5;
        newBase.durability = Math.min(newBase.maxDurability, newBase.durability + baseRepair);
      }
    }

    return newBase;
  });

  return {
    bases: newBases,
    messages,
    victory: victoryResult
  };
}

/**
 * @param {BaseState[]} bases
 * @param {string} faction
 * @returns {BaseState | null}
 */
export function getBaseByFaction(bases, faction) {
  return bases.find(b => b.faction === faction) || null;
}

/**
 * @param {BaseState[]} bases
 * @param {number} x
 * @param {number} y
 * @returns {BaseState | null}
 */
export function getBaseAt(bases, x, y) {
  return bases.find(b => b.x === x && b.y === y) || null;
}

/**
 * @param {Unit} unit
 * @param {string} factionName
 * @param {UnitType} unitType
 * @returns {{ damage: number; messages: string[] }}
 */
export function processTickStatusEffects(unit, factionName, unitType) {
  let totalDamage = 0;
  /** @type {string[]} */
  const messages = [];
  const unitName = unitConfig[unitType].name;

  const poison = getStatusEffect(unit, STATUS_EFFECT_TYPES.POISON);
  if (poison) {
    const dmg = poison.value ?? gameRules.statusEffects.poison.damagePerTurn;
    totalDamage += dmg;
    messages.push(`${factionName}${unitName} 中毒受到 ${dmg} 点伤害`);
  }

  const burn = getStatusEffect(unit, STATUS_EFFECT_TYPES.BURN);
  if (burn) {
    const dmg = burn.value ?? gameRules.statusEffects.burn.damagePerTurn;
    totalDamage += dmg;
    messages.push(`${factionName}${unitName} 燃烧受到 ${dmg} 点伤害`);
  }

  return { damage: totalDamage, messages };
}

/**
 * @param {Unit} unit
 * @param {number} pathLength
 * @returns {number}
 */
export function calculateBleedDamage(unit, pathLength) {
  if (pathLength <= 0) return 0;
  const bleed = getStatusEffect(unit, STATUS_EFFECT_TYPES.BLEED);
  if (!bleed) return 0;
  const perMove = bleed.value ?? gameRules.statusEffects.bleed.damagePerMove;
  return perMove * pathLength;
}

/**
 * @param {Unit} unit
 * @returns {StatusEffect[]}
 */
export function tickStatusEffects(unit) {
  if (!unit.statusEffects || unit.statusEffects.length === 0) return [];
  return unit.statusEffects
    .map(s => ({ ...s, duration: s.duration - 1 }))
    .filter(s => s.duration > 0);
}

/**
 * @param {Unit} unit
 * @returns {{ stunned: number; frozen: boolean; silenced: boolean; healBlocked: boolean }}
 */
export function getStatusFlags(unit) {
  return {
    stunned: unit.stunned && unit.stunned > 0 ? unit.stunned : (hasStatusEffect(unit, STATUS_EFFECT_TYPES.STUN) ? 999 : 0),
    frozen: hasStatusEffect(unit, STATUS_EFFECT_TYPES.FREEZE),
    silenced: hasStatusEffect(unit, STATUS_EFFECT_TYPES.SILENCE),
    healBlocked: hasStatusEffect(unit, STATUS_EFFECT_TYPES.HEAL_BLOCK)
  };
}

/**
 * @typedef {object} SummonCheckResult
 * @property {boolean} canSummon
 * @property {string | null} reason
 * @property {number} currentCount
 * @property {number} maxCount
 */

/**
 * @param {Unit[]} units
 * @param {string} faction
 * @returns {SummonCheckResult}
 */
export function checkSummonFeasibility(units, faction) {
  const summonRules = gameRules.summon;
  const maxUnits = summonRules.maxUnitsPerFaction;
  const factionUnits = units.filter(u => u.faction === faction);
  const currentCount = factionUnits.length;

  if (currentCount >= maxUnits) {
    return {
      canSummon: false,
      reason: `部队已满编（${currentCount}/${maxUnits}），无法继续召唤`,
      currentCount,
      maxCount: maxUnits
    };
  }

  return {
    canSummon: true,
    reason: null,
    currentCount,
    maxCount: maxUnits
  };
}

/**
 * @typedef {object} SummonTileValidation
 * @property {boolean} valid
 * @property {string | null} reason
 * @property {TerrainInfo | null} terrain
 */

/**
 * @param {number} x
 * @param {number} y
 * @param {Unit[]} units
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {SummonTileValidation}
 */
export function validateSummonTile(x, y, units, boardLayout, tileEffects) {
  if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) {
    return { valid: false, reason: '超出棋盘范围', terrain: null };
  }

  const terrain = getTerrain(x, y, boardLayout);
  if (!terrain) {
    return { valid: false, reason: '地形数据异常', terrain: null };
  }

  if (terrain.passable === false) {
    return { valid: false, reason: `${terrain.name}不可通行`, terrain };
  }

  const summonRules = gameRules.summon;
  if (summonRules.forbiddenTerrains.includes(terrain.type)) {
    return { valid: false, reason: `${terrain.name}禁止部署单位`, terrain };
  }

  const unitAtPos = getUnitAt(units, x, y);
  if (unitAtPos) {
    const unitName = unitConfig[/** @type {UnitType} */ (unitAtPos.type)].name;
    const factionName = unitAtPos.faction === 'red' ? '红方' : '蓝方';
    return { valid: false, reason: `被${factionName}${unitName}占据`, terrain };
  }

  if (tileEffects && summonRules.forbiddenTileEffects.length > 0) {
    const effect = getTileEffectAt(tileEffects, x, y);
    const forbiddenEffects = /** @type {string[]} */ (summonRules.forbiddenTileEffects);
    if (effect && forbiddenEffects.includes(effect.type)) {
      const effectConfig = tileEffectConfig[/** @type {keyof typeof tileEffectConfig} */ (effect.type)];
      return { valid: false, reason: `${effectConfig?.name || '异常'}地形效果阻挡`, terrain };
    }
  }

  return { valid: true, reason: null, terrain };
}

/**
 * @typedef {object} SummonCandidate
 * @property {number} x
 * @property {number} y
 * @property {number} priority
 * @property {number} distance
 * @property {TerrainInfo | null} terrain
 */

/**
 * @param {BaseState[] | null} bases
 * @param {string} faction
 * @param {string[][] | null} [boardLayout]
 * @returns {{x: number, y: number}[]}
 */
function getOwnBasePositions(bases, faction, boardLayout) {
  /** @type {{x: number, y: number}[]} */
  const positions = [];

  if (bases && bases.length > 0) {
    for (const base of bases) {
      if (base.faction === faction) {
        positions.push({ x: base.x, y: base.y });
      }
    }
  }

  if (positions.length === 0) {
    const layout = boardLayout || boardConfig.layout;
    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const terrainType = /** @type {keyof typeof boardConfig.terrain} */ (layout[y][x]);
        /** @type {any} */
        const terrain = boardConfig.terrain[terrainType];
        if (terrain && terrain.isBase && terrain.faction === faction) {
          positions.push({ x, y });
        }
      }
    }
  }

  return positions;
}

/**
 * @param {{x: number, y: number}} basePos
 * @param {number} radius
 * @returns {{x: number, y: number, distance: number}[]}
 */
function getAdjacentPositions(basePos, radius) {
  /** @type {{x: number, y: number, distance: number}[]} */
  const positions = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > radius) continue;
      positions.push({
        x: basePos.x + dx,
        y: basePos.y + dy,
        distance
      });
    }
  }
  return positions.sort((a, b) => a.distance - b.distance);
}

/**
 * @param {string} faction
 * @returns {{x: number, y: number}[]}
 */
function getOwnHalfPositions(faction) {
  /** @type {{x: number, y: number}[]} */
  const positions = [];
  const halfWidth = Math.floor(boardConfig.width / 2);
  const startX = faction === 'red' ? 0 : halfWidth;
  const endX = faction === 'red' ? halfWidth : boardConfig.width;

  for (let y = 0; y < boardConfig.height; y++) {
    for (let x = startX; x < endX; x++) {
      positions.push({ x, y });
    }
  }
  return positions;
}

/**
 * @typedef {object} SummonPositionResult
 * @property {boolean} found
 * @property {number} x
 * @property {number} y
 * @property {string | null} reason
 * @property {string} [tier]
 * @property {TerrainInfo | null} [terrain]
 */

/**
 * @param {Unit[]} units
 * @param {string} faction
 * @param {BaseState[] | null} [bases]
 * @param {string[][] | null} [boardLayout]
 * @param {Record<string, TileEffect> | null} [tileEffects]
 * @returns {SummonPositionResult}
 */
export function findSummonPosition(units, faction, bases, boardLayout, tileEffects) {
  const layout = boardLayout || boardConfig.layout;
  const summonRules = gameRules.summon;
  const basePositions = getOwnBasePositions(bases || null, faction, layout);

  /** @type {SummonCandidate[]} */
  const candidates = [];

  /** @type {Set<string>} */
  const checked = new Set();

  for (const base of basePositions) {
    const baseKey = `${base.x},${base.y}`;
    if (checked.has(baseKey)) continue;
    checked.add(baseKey);

    const validation = validateSummonTile(base.x, base.y, units, layout, tileEffects || null);
    if (validation.valid) {
      candidates.push({
        x: base.x,
        y: base.y,
        priority: 0,
        distance: 0,
        terrain: validation.terrain
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.distance - b.distance);
    return {
      found: true,
      x: candidates[0].x,
      y: candidates[0].y,
      reason: null,
      tier: '基地',
      terrain: candidates[0].terrain
    };
  }

  const searchRadius = summonRules.adjacentSearchRadius;
  for (const base of basePositions) {
    const adjacent = getAdjacentPositions(base, searchRadius);
    for (const pos of adjacent) {
      const key = `${pos.x},${pos.y}`;
      if (checked.has(key)) continue;
      checked.add(key);

      const validation = validateSummonTile(pos.x, pos.y, units, layout, tileEffects || null);
      if (validation.valid) {
        candidates.push({
          x: pos.x,
          y: pos.y,
          priority: 1,
          distance: pos.distance,
          terrain: validation.terrain
        });
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.distance - b.distance);
    return {
      found: true,
      x: candidates[0].x,
      y: candidates[0].y,
      reason: null,
      tier: '基地邻格',
      terrain: candidates[0].terrain
    };
  }

  if (summonRules.preferOwnHalf) {
    const ownPositions = getOwnHalfPositions(faction);
    for (const pos of ownPositions) {
      const key = `${pos.x},${pos.y}`;
      if (checked.has(key)) continue;
      checked.add(key);

      const validation = validateSummonTile(pos.x, pos.y, units, layout, tileEffects || null);
      if (validation.valid) {
        const distToNearestBase = basePositions.length > 0
          ? Math.min(...basePositions.map(b => Math.abs(b.x - pos.x) + Math.abs(b.y - pos.y)))
          : 99;
        candidates.push({
          x: pos.x,
          y: pos.y,
          priority: 2,
          distance: distToNearestBase,
          terrain: validation.terrain
        });
      }
    }
  }

  if (candidates.length === 0) {
    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const key = `${x},${y}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const validation = validateSummonTile(x, y, units, layout, tileEffects || null);
        if (validation.valid) {
          const distToNearestBase = basePositions.length > 0
            ? Math.min(...basePositions.map(b => Math.abs(b.x - x) + Math.abs(b.y - y)))
            : 99;
          candidates.push({
            x,
            y,
            priority: 3,
            distance: distToNearestBase,
            terrain: validation.terrain
          });
        }
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distance - b.distance;
    });
    const tier = candidates[0].priority === 2 ? '己方半场空位' : '全局空位';
    return {
      found: true,
      x: candidates[0].x,
      y: candidates[0].y,
      reason: null,
      tier,
      terrain: candidates[0].terrain
    };
  }

  return {
    found: false,
    x: -1,
    y: -1,
    reason: '棋盘无可用空位，所有可通行格子均被占据或为异常地形',
    tier: undefined,
    terrain: null
  };
}

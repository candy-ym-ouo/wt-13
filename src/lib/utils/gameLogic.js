import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, STATUS_EFFECT_TYPES, getStatusInfo, COUNTER_RELATIONSHIPS, COUNTER_LABELS, SYNERGY_CONFIG } from '$lib/config/unitConfig';
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
 * @returns {MoveTile[]}
 */
export function getMoveRange(unit, units, boardLayout) {
  const moveRange = getEffectiveMoveRange(unit, /** @type {UnitType} */ (unit.type));

  /** @type {Map<string, number>} */
  const visited = new Map();
  /** @type {{x: number, y: number, cost: number}[]} */
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
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

      const terrain = getTerrain(neighbor.x, neighbor.y, boardLayout);
      if (!terrain) continue;
      const newCost = current.cost + terrain.moveCost;

      if (newCost > moveRange) continue;

      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key) && /** @type {number} */ (visited.get(key)) <= newCost) continue;

      const unitAtPos = units.find(/** @param {Unit} u */ u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos && unitAtPos.faction !== unit.faction) continue;

      visited.set(key, newCost);
      queue.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
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
  const attackRange = config.attackRange;
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
    }
  }

  if (gameRules.combat.terrainDefenseBonus && terrain) {
    defense += terrain.defenseBonus;
  }

  const hpRatio = attacker.currentHp / attackerConfig.hp;
  attack *= hpRatio;

  const moraleMul = getMoraleDamageMultiplier(attacker.morale ?? gameRules.morale.initial);
  attack *= moraleMul;

  const counterMul = getCounterMultiplier(attacker.type, defender.type);
  attack *= counterMul;

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
 * @returns {PathResult | null}
 */
export function findPath(start, end, units, unit, boardLayout) {
  const moveRange = getEffectiveMoveRange(unit, /** @type {UnitType} */ (unit.type));

  /** @type {Map<string, {x: number, y: number}>} */
  const openSet = new Map();
  /** @type {Map<string, string>} */
  const cameFrom = new Map();
  /** @type {Map<string, number>} */
  const gScore = new Map();
  /** @type {Map<string, number>} */
  const fScore = new Map();

  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;

  openSet.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));

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

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y, boardLayout)) continue;

      const terrain = getTerrain(neighbor.x, neighbor.y, boardLayout);
      if (!terrain) continue;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + terrain.moveCost;

      if (tentativeG > moveRange) continue;

      const unitAtPos = units.find(/** @param {Unit} u */ u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos && unitAtPos.faction !== unit.faction) continue;
      if (unitAtPos && unitAtPos.faction === unit.faction && unitAtPos.id !== unit.id) continue;

      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));

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

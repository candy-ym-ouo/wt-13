import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, COUNTER_RELATIONSHIPS, STATUS_EFFECT_TYPES, getStatusInfo, MOVE_SKILL_INFO, MOVE_SKILL_TYPES } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import {
  getTerrain,
  getMoveRange,
  getAttackRange,
  buildFullThreatMap,
  getCounterThreatAtPosition,
  isHardCC,
  hasStatusEffect,
  getMoraleTier,
  calculateCombatPreview,
  getCounterInfo,
  getMoveSkillForUnit
} from '$lib/utils/gameLogic';
import { canAffordCard } from '$lib/utils/cardSystem';

/**
 * @typedef {import('./cardSystem').Unit} Unit
 * @typedef {import('./cardSystem').EventCard} EventCard
 * @typedef {import('../stores/gameStore').GameState} GameState
 */

/**
 * @typedef {object} MoveSuggestion
 * @property {number} x
 * @property {number} y
 * @property {number} score
 * @property {string} reason
 * @property {string[]} tags
 * @property {number} threatLevel
 * @property {number} defenseBonus
 * @property {number} moraleBonus
 * @property {number} attackCoverage
 * @property {boolean} isBase
 * @property {boolean} isCaptureOpportunity
 */

/**
 * @typedef {object} AttackSuggestion
 * @property {string} targetId
 * @property {number} x
 * @property {number} y
 * @property {number} score
 * @property {string} reason
 * @property {string[]} tags
 * @property {number} estimatedDamage
 * @property {number} counterDamage
 * @property {boolean} willKill
 * @property {boolean} counterWillKill
 * @property {boolean} hasAdvantage
 * @property {boolean} hasDisadvantage
 */

/**
 * @typedef {object} CardSuggestion
 * @property {string} cardInstanceId
 * @property {number} score
 * @property {string} reason
 * @property {string[]} tags
 * @property {string} cardType
 * @property {number} cost
 * @property {string} targetHint
 */

/**
 * @typedef {object} TacticalAnalysis
 * @property {MoveSuggestion[]} moveSuggestions
 * @property {AttackSuggestion[]} attackSuggestions
 * @property {CardSuggestion[]} cardSuggestions
 * @property {string[]} generalTips
 * @property {number} overallThreatLevel
 */

/**
 * 评估移动位置的战术价值
 * @param {Unit} unit
 * @param {{x: number, y: number}} pos
 * @param {GameState} state
 * @param {Map<string, any>} threatMap
 * @param {Unit[]} enemyUnits
 * @returns {MoveSuggestion}
 */
function evaluateMovePosition(unit, pos, state, threatMap, enemyUnits) {
  const layout = state.boardLayout || boardConfig.layout;
  const terrain = getTerrain(pos.x, pos.y, layout);
  const threatKey = `${pos.x},${pos.y}`;
  const threatData = threatMap.get(threatKey);
  const threatLevel = threatData ? threatData.threatCount : 0;
  const counterData = getCounterThreatAtPosition(unit, pos, enemyUnits, terrain);

  let score = 0;
  const tags = [];
  const reasons = [];

  const defenseBonus = terrain ? terrain.defenseBonus : 0;
  const moraleBonus = terrain ? terrain.moraleBonus : 0;
  const isBase = terrain?.isBase || false;

  score += defenseBonus * 8;
  if (defenseBonus >= 3) {
    tags.push('高防御');
    reasons.push(`高防御地形(+${defenseBonus})`);
  } else if (defenseBonus >= 2) {
    tags.push('防御');
    reasons.push(`防御加成(+${defenseBonus})`);
  }

  score += moraleBonus * 3;
  if (moraleBonus >= 5) {
    tags.push('士气');
    reasons.push(`士气加成(+${moraleBonus})`);
  }

  const effectiveThreat = Math.max(0, threatLevel - (defenseBonus >= 3 ? 1 : defenseBonus >= 2 ? 0.5 : 0));
  score -= effectiveThreat * 12;
  if (effectiveThreat >= 3) {
    tags.push('高危');
    reasons.push(`危险区域(${threatLevel}敌威胁)`);
  } else if (effectiveThreat >= 2) {
    tags.push('危险');
    reasons.push(`有威胁(${threatLevel}敌)`);
  } else if (effectiveThreat === 0) {
    tags.push('安全');
    reasons.push('安全区域');
    score += 5;
  }

  if (counterData.counterCount > 0) {
    score -= counterData.counterDamage * 0.5;
    if (counterData.counterDamage >= 20) {
      tags.push('反击风险');
      reasons.push(`反击伤害(${counterData.counterDamage})`);
    }
  }

  const tempUnit = { ...unit, x: pos.x, y: pos.y };
  const attackableTargets = getAttackRange(tempUnit, state.units);
  let attackCoverage = attackableTargets.length;
  let totalAttackValue = 0;
  let hasKillOpportunity = false;
  let hasCounterDanger = false;
  let hasAdvantageTarget = false;
  let maxDamage = 0;

  for (const tile of attackableTargets) {
    const enemy = tile.target;
    if (!enemy) continue;

    const defTerrain = getTerrain(enemy.x, enemy.y, layout);
    const atkTerrain = terrain || undefined;
    const preview = calculateCombatPreview(tempUnit, enemy, defTerrain || undefined, atkTerrain);

    let targetScore = 0;

    targetScore += preview.estimatedDamage * 1.0;
    if (preview.estimatedDamage > maxDamage) {
      maxDamage = preview.estimatedDamage;
    }

    if (preview.willKill) {
      targetScore += 45;
      hasKillOpportunity = true;
      tags.push('可击杀');
    }

    if (preview.shieldBlocked) {
      targetScore -= 20;
    }

    const counterInfo = getCounterInfo(tempUnit.type, enemy.type);
    if (counterInfo.isAdvantage) {
      targetScore += 20;
      hasAdvantageTarget = true;
      if (!tags.includes('克制位')) {
        tags.push('克制位');
        reasons.push('可攻击克制目标');
      }
    }
    const reverseCounter = getCounterInfo(enemy.type, tempUnit.type);
    if (reverseCounter.isAdvantage) {
      targetScore -= 10;
    }

    if (preview.willCounter) {
      targetScore -= preview.counterDamage * 0.7;
      if (preview.counterWillKill) {
        targetScore -= 50;
        hasCounterDanger = true;
        if (!tags.includes('反杀风险')) {
          tags.push('反杀风险');
        }
      }
    } else {
      targetScore += 8;
    }

    const defenderHpRatio = enemy.currentHp / enemy.maxHp;
    if (defenderHpRatio <= 0.3 && !preview.willKill) {
      targetScore += 12;
    }

    if (enemy.buffs && enemy.buffs.length > 0) {
      const hasAttackBoost = enemy.buffs.some(b => b.type === 'attackBoost');
      const hasDoubleAttack = enemy.buffs.some(b => b.type === 'doubleAttack');
      if (hasAttackBoost) targetScore += 10;
      if (hasDoubleAttack) targetScore += 12;
    }

    const enemyCfg = unitConfig[/** @type {keyof typeof unitConfig} */ (enemy.type)];
    if (enemyCfg.attack >= 35) {
      targetScore += 6;
    }

    const enemyBase = state.bases.find(b => b.faction !== tempUnit.faction);
    if (enemyBase) {
      const distToBase = Math.abs(enemy.x - enemyBase.x) + Math.abs(enemy.y - enemyBase.y);
      if (distToBase <= 2) {
        targetScore += 8;
      }
    }

    totalAttackValue += targetScore;
  }

  if (attackCoverage > 0) {
    score += totalAttackValue * 0.6;
    score += attackCoverage * 2;

    if (hasKillOpportunity && !reasons.includes('存在击杀机会')) {
      reasons.push('存在击杀机会');
    }
    if (hasCounterDanger && !reasons.includes('需注意反击')) {
      reasons.push('需注意反击');
    }
    if (maxDamage > 0) {
      reasons.push(`最高可造成${maxDamage}伤害`);
    }
    if (!hasAdvantageTarget && attackCoverage >= 2) {
      if (!tags.includes('火力位')) {
        tags.push('火力位');
      }
      reasons.push(`可覆盖${attackCoverage}个目标`);
    }
  }

  let isCaptureOpportunity = false;
  if (isBase && terrain) {
    if (terrain.faction !== unit.faction) {
      score += 25;
      isCaptureOpportunity = true;
      tags.push('占领');
      reasons.push('可占领敌方基地');
    } else if (terrain.faction === unit.faction) {
      score += 10;
      tags.push('回防');
      reasons.push('防守己方基地');
    }
  }

  const enemyBase = state.bases.find(b => b.faction !== unit.faction);
  if (enemyBase) {
    const distToEnemyBase = Math.abs(pos.x - enemyBase.x) + Math.abs(pos.y - enemyBase.y);
    score += Math.max(0, 15 - distToEnemyBase * 2);
  }

  const moveSkill = getMoveSkillForUnit(unit, /** @type {keyof typeof unitConfig} */ (unit.type));
  if (moveSkill === MOVE_SKILL_TYPES.CHARGE && attackCoverage > 0) {
    score += 8;
    tags.push('冲锋');
    reasons.push('冲锋加成可用');
  }
  if (moveSkill === MOVE_SKILL_TYPES.HALT && !unit.hasMoved) {
    score += 6;
  }

  return {
    x: pos.x,
    y: pos.y,
    score: Math.round(score),
    reason: reasons.length > 0 ? reasons.join('，') : '普通位置',
    tags,
    threatLevel,
    defenseBonus,
    moraleBonus,
    attackCoverage,
    isBase,
    isCaptureOpportunity
  };
}

/**
 * 评估攻击目标的战术价值
 * @param {Unit} attacker
 * @param {Unit} defender
 * @param {GameState} state
 * @returns {AttackSuggestion}
 */
function evaluateAttackTarget(attacker, defender, state) {
  const layout = state.boardLayout || boardConfig.layout;
  const defTerrain = getTerrain(defender.x, defender.y, layout);
  const atkTerrain = getTerrain(attacker.x, attacker.y, layout);
  const preview = calculateCombatPreview(attacker, defender, defTerrain || undefined, atkTerrain || undefined);

  let score = 0;
  const tags = [];
  const reasons = [];

  score += preview.estimatedDamage * 1.2;

  if (preview.willKill) {
    score += 50;
    tags.push('击杀');
    reasons.push('可击杀目标');
  }

  if (preview.shieldBlocked) {
    score -= 30;
    tags.push('护盾');
    reasons.push('目标有护盾');
  }

  const counterInfo = getCounterInfo(attacker.type, defender.type);
  if (counterInfo.isAdvantage) {
    score += 25;
    tags.push('克制');
    reasons.push(counterInfo.label || '兵种克制');
  }
  const reverseCounter = getCounterInfo(defender.type, attacker.type);
  if (reverseCounter.isAdvantage) {
    score -= 15;
    tags.push('被克');
    reasons.push('被目标克制');
  }

  if (preview.willCounter) {
    score -= preview.counterDamage * 0.8;
    if (preview.counterWillKill) {
      score -= 60;
      tags.push('反杀风险');
      reasons.push('可能被反击击杀');
    } else if (preview.counterDamage >= 20) {
      tags.push('高反击');
      reasons.push(`反击伤害${preview.counterDamage}`);
    }
  } else {
    score += 10;
    reasons.push('目标无法反击');
  }

  const defenderHpRatio = defender.currentHp / defender.maxHp;
  if (defenderHpRatio <= 0.3 && !preview.willKill) {
    score += 15;
    tags.push('残血');
    reasons.push('目标残血');
  }

  if (defender.buffs && defender.buffs.length > 0) {
    const hasAttackBoost = defender.buffs.some(b => b.type === 'attackBoost');
    const hasDoubleAttack = defender.buffs.some(b => b.type === 'doubleAttack');
    if (hasAttackBoost) {
      score += 12;
      tags.push('威胁目标');
      reasons.push('目标有攻击增益');
    }
    if (hasDoubleAttack) {
      score += 15;
      tags.push('高威胁');
      reasons.push('目标可连续攻击');
    }
  }

  const defenderCfg = unitConfig[/** @type {keyof typeof unitConfig} */ (defender.type)];
  if (defenderCfg.attack >= 35) {
    score += 8;
    tags.push('高攻目标');
  }

  const enemyBase = state.bases.find(b => b.faction !== attacker.faction);
  if (enemyBase) {
    const distToBase = Math.abs(defender.x - enemyBase.x) + Math.abs(defender.y - enemyBase.y);
    if (distToBase <= 2) {
      score += 10;
      tags.push('基地护卫');
      reasons.push('清除基地护卫');
    }
  }

  return {
    targetId: defender.id,
    x: defender.x,
    y: defender.y,
    score: Math.round(score),
    reason: reasons.length > 0 ? reasons.join('，') : '普通攻击',
    tags,
    estimatedDamage: preview.estimatedDamage,
    counterDamage: preview.counterDamage,
    willKill: preview.willKill,
    counterWillKill: preview.counterWillKill,
    hasAdvantage: counterInfo.isAdvantage,
    hasDisadvantage: reverseCounter.isAdvantage
  };
}

/**
 * 评估卡牌使用的战术价值
 * @param {EventCard} card
 * @param {Unit | null} selectedUnit
 * @param {GameState} state
 * @param {number} energy
 * @param {any[]} cooldowns
 * @returns {CardSuggestion | null}
 */
function evaluateCard(card, selectedUnit, state, energy, cooldowns) {
  const affordability = canAffordCard(card, energy, cooldowns);
  if (!affordability.canUse) return null;

  let score = 0;
  const tags = [];
  const reasons = [];
  let targetHint = '';

  const currentFaction = state.currentFaction;
  const friendlyUnits = state.units.filter(u => u.faction === currentFaction);
  const enemyUnits = state.units.filter(u => u.faction !== currentFaction);

  const effectType = card.effect.type;

  switch (effectType) {
    case 'heal': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        targetHint = '选择受伤的己方单位';
        score = 10;
      } else {
        const hpRatio = selectedUnit.currentHp / selectedUnit.maxHp;
        if (hpRatio < 0.5) {
          score = 35 + (1 - hpRatio) * 40;
          reasons.push('紧急治疗');
          tags.push('急需');
        } else if (hpRatio < 0.8) {
          score = 20 + (1 - hpRatio) * 20;
          reasons.push('恢复生命');
        } else {
          score = 5;
          tags.push('不急');
          reasons.push('血量充足');
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'attackBoost': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        const attackers = friendlyUnits.filter(u => !u.hasAttacked && !isHardCC(u));
        score = attackers.length > 0 ? 25 : 10;
        targetHint = '选择可攻击的己方单位';
      } else {
        if (selectedUnit.hasAttacked || isHardCC(selectedUnit)) {
          score = 5;
          reasons.push('本回合已行动');
          tags.push('效果有限');
        } else {
          score = 30;
          const nearbyEnemies = enemyUnits.filter(e => {
            const dist = Math.abs(e.x - selectedUnit.x) + Math.abs(e.y - selectedUnit.y);
            return dist <= (unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].attackRange + 2);
          });
          if (nearbyEnemies.length > 0) {
            score += nearbyEnemies.length * 8;
            reasons.push('附近有敌人');
            tags.push('高效');
          }
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'defenseBoost': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        score = 20;
        targetHint = '选择前排己方单位';
      } else {
        const threatMap = buildFullThreatMap(enemyUnits, selectedUnit, state.units, state.boardLayout || boardConfig.layout, state.tileEffects);
        const key = `${selectedUnit.x},${selectedUnit.y}`;
        const threat = threatMap.get(key);
        if (threat && threat.threatCount >= 2) {
          score = 40;
          tags.push('急需');
          reasons.push('面临高威胁');
        } else {
          score = 22;
          reasons.push('提升防御');
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'moveBoost': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        score = 15;
        targetHint = '选择需要机动的单位';
      } else {
        if (selectedUnit.hasMoved) {
          score = 5;
          tags.push('效果有限');
          reasons.push('已移动');
        } else {
          score = 25;
          const enemyBase = state.bases.find(b => b.faction !== selectedUnit.faction);
          if (enemyBase) {
            const dist = Math.abs(selectedUnit.x - enemyBase.x) + Math.abs(selectedUnit.y - enemyBase.y);
            if (dist <= 6) {
              score += 15;
              tags.push('推进');
              reasons.push('可加速推进');
            }
          }
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'damage': {
      if (enemyUnits.length > 0) {
        const weakest = enemyUnits.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
        score = 25 + (card.effect.value || 40) * 0.5;
        if (weakest.currentHp <= (card.effect.value || 40)) {
          score += 30;
          tags.push('可击杀');
          reasons.push('可直接击杀');
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (weakest.type)].name} 使用`;
      } else {
        score = 0;
      }
      break;
    }
    case STATUS_EFFECT_TYPES.STUN:
    case STATUS_EFFECT_TYPES.FREEZE: {
      if (enemyUnits.length > 0) {
        const dangerous = enemyUnits
          .filter(u => !isHardCC(u))
          .sort((a, b) => unitConfig[/** @type {keyof typeof unitConfig} */ (b.type)].attack - unitConfig[/** @type {keyof typeof unitConfig} */ (a.type)].attack);
        if (dangerous.length > 0) {
          const target = dangerous[0];
          score = 35;
          const canAttack = !target.hasAttacked;
          if (canAttack) {
            score += 15;
            tags.push('关键控制');
            reasons.push('控制高威胁目标');
          }
          targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (target.type)].name} 使用`;
        } else {
          score = 10;
        }
      } else {
        score = 0;
      }
      break;
    }
    case STATUS_EFFECT_TYPES.POISON:
    case STATUS_EFFECT_TYPES.BURN:
    case STATUS_EFFECT_TYPES.BLEED: {
      if (enemyUnits.length > 0) {
        const tanky = enemyUnits
          .filter(u => !hasStatusEffect(u, effectType))
          .sort((a, b) => b.maxHp - a.maxHp);
        if (tanky.length > 0) {
          score = 20 + (card.effect.value || 0) * 0.3 * (card.effect.duration || 0);
          targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (tanky[0].type)].name} 使用`;
          if (tanky[0].maxHp >= 120) {
            tags.push('对高血量');
            score += 10;
          }
        } else {
          score = 8;
        }
      } else {
        score = 0;
      }
      break;
    }
    case STATUS_EFFECT_TYPES.SLOW: {
      if (enemyUnits.length > 0) {
        const fast = enemyUnits
          .filter(u => !hasStatusEffect(u, STATUS_EFFECT_TYPES.SLOW))
          .sort((a, b) => unitConfig[/** @type {keyof typeof unitConfig} */ (b.type)].moveRange - unitConfig[/** @type {keyof typeof unitConfig} */ (a.type)].moveRange);
        if (fast.length > 0 && unitConfig[/** @type {keyof typeof unitConfig} */ (fast[0].type)].moveRange >= 4) {
          score = 28;
          tags.push('限制机动');
          reasons.push('限制高机动单位');
          targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (fast[0].type)].name} 使用`;
        } else {
          score = 12;
          targetHint = '选择敌方高机动单位';
        }
      } else {
        score = 0;
      }
      break;
    }
    case 'doubleAttack': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        const attackers = friendlyUnits.filter(u => !u.hasAttacked && !isHardCC(u));
        score = attackers.length > 0 ? 30 : 10;
        targetHint = '选择可攻击的高攻单位';
      } else {
        if (selectedUnit.hasAttacked || isHardCC(selectedUnit)) {
          score = 5;
          tags.push('效果有限');
        } else {
          const atk = unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].attack;
          score = 35 + atk * 0.3;
          tags.push('强力');
          reasons.push('可攻击两次');
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'summon': {
      const myBase = state.bases.find(b => b.faction === currentFaction);
      if (friendlyUnits.length < 8) {
        score = 28;
        if (myBase && myBase.durability < myBase.maxDurability * 0.5) {
          score += 15;
          tags.push('防守增援');
          reasons.push('基地危急需要增援');
        }
        targetHint = '在己方基地召唤';
      } else {
        score = 5;
        tags.push('满编');
        reasons.push('部队已满编');
      }
      break;
    }
    case 'reveal': {
      const myMarkers = state.enemyMarkers[/** @type {'red' | 'blue'} */ (currentFaction)];
      const totalEnemies = enemyUnits.length;
      const revealed = myMarkers.length;
      if (totalEnemies > revealed + 1) {
        score = 25;
        tags.push('情报');
        reasons.push('需要侦查敌军位置');
      } else {
        score = 8;
      }
      targetHint = '选择敌军可能位置释放';
      break;
    }
    case 'shield': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        score = 22;
        targetHint = '选择即将受攻击的单位';
      } else {
        const threatMap = buildFullThreatMap(enemyUnits, selectedUnit, state.units, state.boardLayout || boardConfig.layout, state.tileEffects);
        const key = `${selectedUnit.x},${selectedUnit.y}`;
        const threat = threatMap.get(key);
        if (threat && threat.threatCount >= 2) {
          score = 40;
          tags.push('保命');
          reasons.push('面临多重威胁');
        } else if (threat && threat.threatCount === 1) {
          score = 25;
        } else {
          score = 10;
        }
        targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
      }
      break;
    }
    case 'cleanse': {
      if (!selectedUnit || selectedUnit.faction !== currentFaction) {
        const debuffed = friendlyUnits.filter(u => u.statusEffects && u.statusEffects.length > 0);
        if (debuffed.length > 0) {
          score = 25 + debuffed.length * 5;
          tags.push('有用');
          targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (debuffed[0].type)].name} 使用`;
        } else {
          score = 5;
          tags.push('无用');
          reasons.push('无负面状态需要清除');
        }
      } else {
        const debuffs = selectedUnit.statusEffects?.filter(s => {
          const info = getStatusInfo(s.type);
          return info.isDebuff;
        }) || [];
        if (debuffs.length > 0) {
          score = 25 + debuffs.length * 8;
          const hasHardCC = debuffs.some(d => {
            const info = getStatusInfo(d.type);
            return info.isHardCC;
          });
          if (hasHardCC) {
            score += 20;
            tags.push('解除硬控');
          }
          targetHint = `对 ${unitConfig[/** @type {keyof typeof unitConfig} */ (selectedUnit.type)].name} 使用`;
        } else {
          score = 3;
          tags.push('无用');
        }
      }
      break;
    }
    case 'terrainChange': {
      score = 15;
      targetHint = '选择关键地形位置';
      break;
    }
    case 'tileEffect': {
      score = 20;
      tags.push('控场');
      targetHint = '选择敌军聚集区域';
      break;
    }
    default: {
      score = 15;
      targetHint = '选择合适目标';
    }
  }

  score -= card.cost * 2;
  if (energy <= card.cost + 1) {
    score -= 5;
  }

  const rarity = card.rarity;
  if (rarity === 'limited') score += 5;
  else if (rarity === 'rare') score += 2;

  if (score <= 0) return null;

  return {
    cardInstanceId: card.instanceId || card.id,
    score: Math.round(score),
    reason: reasons.length > 0 ? reasons.join('，') : '可用',
    tags,
    cardType: effectType,
    cost: card.cost,
    targetHint
  };
}

/**
 * 生成通用战术建议
 * @param {Unit | null} selectedUnit
 * @param {GameState} state
 * @returns {string[]}
 */
function generateGeneralTips(selectedUnit, state) {
  const tips = [];
  const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
  const friendlyUnits = state.units.filter(u => u.faction === currentFaction);
  const enemyUnits = state.units.filter(u => u.faction !== currentFaction);

  const myBase = state.bases.find(b => b.faction === currentFaction);
  const enemyBase = state.bases.find(b => b.faction !== currentFaction);

  if (myBase && myBase.durability < myBase.maxDurability * 0.4) {
    tips.push('⚠️ 基地耐久危急！优先回防或修复');
  }

  if (enemyBase && enemyBase.capturingFaction === currentFaction && enemyBase.captureProgress > 0) {
    const needTurns = gameRules.victoryConditions.captureBase.captureTurnsRequired - enemyBase.captureProgress;
    tips.push(`🏴 占领进度 ${enemyBase.captureProgress}/${gameRules.victoryConditions.captureBase.captureTurnsRequired}，还需${needTurns}回合`);
  }

  const ccUnits = friendlyUnits.filter(u => isHardCC(u));
  if (ccUnits.length > 0) {
    tips.push(`💫 ${ccUnits.length}个单位被硬控中`);
  }

  const lowMoraleUnits = friendlyUnits.filter(u => (u.morale ?? 80) < 50);
  if (lowMoraleUnits.length >= 2) {
    tips.push(`😰 ${lowMoraleUnits.length}个单位士气低落`);
  }

  const injuredUnits = friendlyUnits.filter(u => u.currentHp / u.maxHp < 0.4);
  if (injuredUnits.length >= 2) {
    tips.push(`💔 ${injuredUnits.length}个单位重伤`);
  }

  if (enemyUnits.length > 0) {
    const avgEnemyAtk = enemyUnits.reduce((sum, u) => sum + unitConfig[/** @type {keyof typeof unitConfig} */ (u.type)].attack, 0) / enemyUnits.length;
    if (avgEnemyAtk >= 32) {
      tips.push('⚔️ 敌方总体攻击力较高，注意防御');
    }
  }

  if (selectedUnit) {
    if (selectedUnit.hasMoved && selectedUnit.hasAttacked) {
      tips.push('该单位本回合已行动完毕');
    }
  }

  if (state.turn >= 15) {
    tips.push('📊 回合数较高，可考虑分数决胜策略');
  }

  return tips;
}

/**
 * 分析整体战术局势
 * @param {Unit | null} selectedUnit
 * @param {GameState | null} state
 * @param {EventCard[]} handCards
 * @param {number} energy
 * @param {any[]} cooldowns
 * @returns {TacticalAnalysis | null}
 */
export function analyzeTactics(selectedUnit, state, handCards, energy, cooldowns) {
  if (!state) return null;

  const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
  const enemyUnits = state.units.filter(u => u.faction !== currentFaction);
  const layout = state.boardLayout || boardConfig.layout;

  const moveSuggestions = [];
  const attackSuggestions = [];
  const cardSuggestions = [];

  let overallThreatLevel = 0;

  if (selectedUnit && selectedUnit.faction === currentFaction && !state.gameOver) {
    const ccLocked = isHardCC(selectedUnit);
    const threatMap = buildFullThreatMap(enemyUnits, selectedUnit, state.units, layout, state.tileEffects);

    for (const [, data] of threatMap.entries()) {
      overallThreatLevel += data.threatCount;
    }
    overallThreatLevel = Math.min(10, Math.round(overallThreatLevel / 3));

    if (!selectedUnit.hasMoved && !ccLocked) {
      const moveRange = getMoveRange(selectedUnit, state.units, layout, state.tileEffects);
      for (const tile of moveRange) {
        const evaluation = evaluateMovePosition(selectedUnit, tile, state, threatMap, enemyUnits);
        moveSuggestions.push(evaluation);
      }
      const currentPosEval = evaluateMovePosition(selectedUnit, { x: selectedUnit.x, y: selectedUnit.y }, state, threatMap, enemyUnits);
      currentPosEval.tags.push('原地');
      currentPosEval.reason = '保持原位，' + currentPosEval.reason;
      moveSuggestions.push(currentPosEval);

      moveSuggestions.sort((a, b) => b.score - a.score);
    }

    if (!selectedUnit.hasAttacked && !ccLocked) {
      const hasDoubleAttack = selectedUnit.buffs?.some(b => b.type === 'doubleAttack');
      const hasAttackedTwice = !!hasDoubleAttack && (selectedUnit.attackCount || 0) >= 2;
      if (!hasAttackedTwice) {
        const attackRange = getAttackRange(selectedUnit, state.units);
        for (const tile of attackRange) {
          const evaluation = evaluateAttackTarget(selectedUnit, tile.target, state);
          attackSuggestions.push(evaluation);
        }
        attackSuggestions.sort((a, b) => b.score - a.score);
      }
    }
  }

  for (const card of handCards || []) {
    if (card.cardState === 'active') continue;
    const evaluation = evaluateCard(card, selectedUnit, state, energy, cooldowns);
    if (evaluation) {
      cardSuggestions.push(evaluation);
    }
  }
  cardSuggestions.sort((a, b) => b.score - a.score);

  const generalTips = generateGeneralTips(selectedUnit, state);

  return {
    moveSuggestions: moveSuggestions.slice(0, 5),
    attackSuggestions: attackSuggestions.slice(0, 5),
    cardSuggestions: cardSuggestions.slice(0, 5),
    generalTips,
    overallThreatLevel
  };
}

/**
 * 获取战术等级颜色
 * @param {number} score
 * @returns {string}
 */
export function getTacticalScoreColor(score) {
  if (score >= 40) return '#2ecc71';
  if (score >= 20) return '#27ae60';
  if (score >= 0) return '#f1c40f';
  if (score >= -20) return '#e67e22';
  return '#e74c3c';
}

/**
 * 获取战术等级标签
 * @param {number} score
 * @returns {string}
 */
export function getTacticalScoreLabel(score) {
  if (score >= 40) return '极佳';
  if (score >= 25) return '优秀';
  if (score >= 10) return '良好';
  if (score >= 0) return '一般';
  if (score >= -15) return '较差';
  return '危险';
}

import { eventCards, cardConfig, CARD_CATEGORY, CARD_RARITY, cardRarityConfig } from '$lib/config/eventCardConfig';
import { STATUS_EFFECT_TYPES, unitConfig } from '$lib/config/unitConfig';
import { checkSummonFeasibility, findSummonPosition, getWeatherCardEffectModifier } from './gameLogic';

/**
 * @typedef {'instant' | 'sustain' | 'counter'} CardCategory
 */

/**
 * @typedef {keyof typeof unitConfig} UnitType
 */

/**
 * @typedef {object} CardEffect
 * @property {string} type
 * @property {number} [value]
 * @property {number} [duration]
 * @property {UnitType} [unitType]
 * @property {string} [terrain]
 * @property {string} [tileEffectType]
 * @property {number} [radius]
 */

/**
 * @typedef {object} EventCard
 * @property {string} id
 * @property {string} name
 * @property {CardCategory} category
 * @property {string} type
 * @property {string} description
 * @property {CardEffect} effect
 * @property {string} icon
 * @property {number} cost
 * @property {number} cooldown
 * @property {string} rarity
 * @property {number} weight
 * @property {string} [trigger]
 * @property {string} [instanceId]
 * @property {'available' | 'active' | 'cooling'} [cardState]
 * @property {number} [remainingDuration]
 * @property {number} [remainingCooldown]
 * @property {string} [targetUnitId]
 */

/**
 * @typedef {object} StatusEffect
 * @property {string} [id]
 * @property {string} type
 * @property {number} duration
 * @property {number} [value]
 * @property {string} [source]
 * @property {number} [weatherModifier]
 */

/**
 * @typedef {object} Unit
 * @property {string} id
 * @property {UnitType} type
 * @property {string} faction
 * @property {number} x
 * @property {number} y
 * @property {number} currentHp
 * @property {number} maxHp
 * @property {boolean} hasMoved
 * @property {boolean} hasAttacked
 * @property {number} attackCount
 * @property {any[]} buffs
 * @property {number} stunned
 * @property {number} morale
 * @property {number} winStreak
 * @property {StatusEffect[]} statusEffects
 * @property {Record<string, number>} [tempResistBoost]
 * @property {string} [persistentId]
 * @property {number} [exp]
 * @property {number} [level]
 * @property {number} [statPoints]
 * @property {{atk: number, def: number, hp: number, move: number}} [allocatedStats]
 * @property {string | null} [specialization]
 */

/**
 * @typedef {object} AppliedEffect
 * @property {string} type
 * @property {string} [unitId]
 * @property {number} [value]
 * @property {any} [buff]
 * @property {number} [duration]
 * @property {UnitType} [unitType]
 * @property {string} [faction]
 * @property {number} [x]
 * @property {number} [y]
 * @property {string} [terrain]
 * @property {StatusEffect} [statusEffect]
 * @property {boolean} [resisted]
 * @property {string} [tileEffectType]
 * @property {number} [radius]
 * @property {number} [weatherModifier]
 */

/**
 * @typedef {object} CooldownEntry
 * @property {string} cardId
 * @property {number} remainingCooldown
 */

/**
 * @typedef {object} RarityConfig
 * @property {number} baseWeight
 * @property {number} dupeWeightPenalty
 * @property {number} minTurn
 */

/**
 * @param {Record<string, number>} drawHistory
 * @param {number} pityCounter
 * @param {number} currentTurn
 * @param {string[]} [unlockedCardIds]
 * @returns {EventCard}
 */
export function drawCard(drawHistory, pityCounter, currentTurn, unlockedCardIds) {
  if (!drawHistory) drawHistory = {};
  if (!pityCounter) pityCounter = 0;
  if (!currentTurn) currentTurn = 1;

  /** @type {Record<string, RarityConfig & {pityThreshold?: number; maxDupeCount?: number}>} */
  const rarityCfgMap = /** @type {any} */ (cardRarityConfig);

  /** @type {EventCard[]} */
  let pool = /** @type {EventCard[]} */ (eventCards.filter(card => {
    const rarityCfg = rarityCfgMap[card.rarity];
    if (currentTurn < (rarityCfg?.minTurn || 1)) return false;
    if (unlockedCardIds && unlockedCardIds.length > 0) {
      return unlockedCardIds.includes(card.id);
    }
    return true;
  }));

  if (pool.length === 0) {
    pool = eventCards.filter(card => card.rarity === CARD_RARITY.BASIC).slice(0, 5);
  }

  let forcedRarity = null;
  if (pityCounter >= cardRarityConfig.pityThreshold) {
    forcedRarity = CARD_RARITY.RARE;
  }
  if (pityCounter >= cardRarityConfig.pityThreshold * 2) {
    forcedRarity = CARD_RARITY.LIMITED;
  }

  if (forcedRarity) {
    const forcedPool = pool.filter(c => c.rarity === forcedRarity);
    if (forcedPool.length > 0) {
      pool = forcedPool;
    }
  }

  const weightedPool = pool.map(card => {
    const rarityCfg = rarityCfgMap[card.rarity];
    let w = card.weight || rarityCfg?.baseWeight || 50;
    const dupeCount = drawHistory[card.id] || 0;
    if (dupeCount > 0) {
      const penalty = rarityCfg?.dupeWeightPenalty || 0.3;
      w *= Math.pow(penalty, Math.min(dupeCount, cardRarityConfig.maxDupeCount));
    }
    return { card, weight: Math.max(w, 1) };
  });

  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = weightedPool[0].card;
  for (const item of weightedPool) {
    roll -= item.weight;
    if (roll <= 0) {
      selected = item.card;
      break;
    }
  }

  return /** @type {EventCard} */ ({
    ...selected,
    cardState: 'available',
    remainingDuration: 0,
    remainingCooldown: 0
  });
}

/**
 * @param {number} currentTurn
 * @param {string[]} [unlockedCardIds]
 * @returns {EventCard[]}
 */
export function drawInitialHand(currentTurn, unlockedCardIds) {
  if (!currentTurn) currentTurn = 1;
  /** @type {EventCard[]} */
  const hand = [];
  /** @type {Record<string, number>} */
  const tempHistory = {};
  for (let i = 0; i < cardConfig.initialHandSize; i++) {
    const card = drawCard(tempHistory, 0, currentTurn, unlockedCardIds);
    tempHistory[card.id] = (tempHistory[card.id] || 0) + 1;
    hand.push({
      ...card,
      instanceId: String(Date.now() + i + Math.random())
    });
  }
  return hand;
}

/**
 * @param {EventCard | null | undefined} card
 * @param {number} currentEnergy
 * @param {CooldownEntry[]} cooldowns
 * @returns {{ canUse: boolean; reason?: string }}
 */
export function canAffordCard(card, currentEnergy, cooldowns) {
  if (!card) return { canUse: false, reason: '卡牌不存在' };

  const cdEntry = cooldowns.find(c => c.cardId === card.id);
  if (cdEntry && cdEntry.remainingCooldown > 0) {
    return { canUse: false, reason: `冷却中（还需 ${cdEntry.remainingCooldown} 回合）` };
  }

  if (currentEnergy < card.cost) {
    return { canUse: false, reason: `能量不足（需要 ${card.cost}，当前 ${currentEnergy}）` };
  }

  return { canUse: true };
}

const DEBUFF_EFFECT_TYPES = new Set([
  STATUS_EFFECT_TYPES.STUN,
  STATUS_EFFECT_TYPES.SLOW,
  STATUS_EFFECT_TYPES.HEAL_BLOCK,
  STATUS_EFFECT_TYPES.SILENCE,
  STATUS_EFFECT_TYPES.POISON,
  STATUS_EFFECT_TYPES.BURN,
  STATUS_EFFECT_TYPES.FREEZE,
  STATUS_EFFECT_TYPES.BLEED,
  'damage',
  'stun'
]);

/**
 * @param {EventCard | null | undefined} card
 * @param {Unit | null | undefined} selectedUnit
 * @param {Unit | null | undefined} targetUnit
 * @param {string} currentFaction
 * @returns {boolean}
 */
export function canUseCard(card, selectedUnit, targetUnit, currentFaction) {
  if (!card) return false;

  const isDebuff = DEBUFF_EFFECT_TYPES.has(card.effect.type);

  if (isDebuff) {
    return !!(targetUnit && targetUnit.faction !== currentFaction);
  }

  switch (card.effect.type) {
    case 'heal':
    case 'attackBoost':
    case 'defenseBoost':
    case 'moveBoost':
    case 'doubleAttack':
    case 'counterAttack':
    case 'shield':
    case 'cleanse':
    case 'statusResistBoost': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      return !!friendlyUnit;
    }
    case 'summon':
      return true;
    case 'terrainChange':
      return true;
    case 'tileEffect':
      return true;
    case 'reveal':
      return true;
    default:
      return false;
  }
}

/**
 * @param {EventCard | null | undefined} card
 * @param {any} gameState
 * @returns {{ canUse: boolean; reason?: string }}
 */
export function canUseSummonCard(card, gameState) {
  if (!card || card.effect.type !== 'summon') {
    return { canUse: false, reason: '不是召唤类卡牌' };
  }

  const feasibility = checkSummonFeasibility(
    gameState.units || [],
    gameState.currentFaction
  );

  if (!feasibility.canSummon) {
    return { canUse: false, reason: feasibility.reason || '无法召唤' };
  }

  const layout = gameState.boardLayout || null;
  const position = findSummonPosition(
    gameState.units || [],
    gameState.currentFaction,
    gameState.bases || null,
    layout,
    gameState.tileEffects || null
  );

  if (!position.found) {
    return { canUse: false, reason: position.reason || '无可用落点' };
  }

  return { canUse: true };
}

/**
 * @param {EventCard} card
 * @param {any} gameState
 * @param {Unit | null | undefined} selectedUnit
 * @param {Unit | null | undefined} targetUnit
 * @param {{x: number, y: number} | null | undefined} targetPos
 * @param {string} [weatherType='sunny']
 * @returns {AppliedEffect[]}
 */
export function applyCardEffect(card, gameState, selectedUnit, targetUnit, targetPos, weatherType = 'sunny') {
  /** @type {AppliedEffect[]} */
  const effects = [];
  const currentFaction = /** @type {string} */ (gameState.currentFaction);
  const effectType = card.effect.type;

  const weatherModifier = getWeatherCardEffectModifier(weatherType, card.id);
  const weatherAffected = weatherModifier !== 1.0;

  const isStatusDebuff = Object.values(STATUS_EFFECT_TYPES).includes(effectType);

  function adjustValue(baseValue) {
    if (baseValue === undefined || baseValue === null) return baseValue;
    const adjusted = Math.round(baseValue * weatherModifier);
    return adjusted;
  }

  if (isStatusDebuff) {
    if (targetUnit && targetUnit.faction !== currentFaction) {
      effects.push({
        type: 'applyStatus',
        unitId: targetUnit.id,
        statusEffect: {
          type: effectType,
          duration: card.effect.duration ?? 2,
          value: adjustValue(card.effect.value),
          source: card.id,
          weatherModifier
        }
      });
    }
    return effects;
  }

  switch (effectType) {
    case 'heal': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({ type: 'heal', unitId: friendlyUnit.id, value: adjustValue(card.effect.value), weatherModifier });
        if (card.id === 'divine_heal') {
          effects.push({ type: 'cleanse', unitId: friendlyUnit.id });
        }
      }
      break;
    }
    case 'attackBoost': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'attackBoost', value: adjustValue(card.effect.value), duration: card.effect.duration, weatherModifier }
        });
      }
      break;
    }
    case 'defenseBoost': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'defenseBoost', value: adjustValue(card.effect.value), duration: card.effect.duration, weatherModifier }
        });
        if (card.id === 'fortress') {
          effects.push({
            type: 'addBuff',
            unitId: friendlyUnit.id,
            buff: { type: 'statusResistBoost', value: 1.0, duration: card.effect.duration }
          });
        }
      }
      break;
    }
    case 'moveBoost': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'moveBoost', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    }
    case 'damage':
      if (targetUnit && targetUnit.faction !== currentFaction) {
        effects.push({ type: 'damage', unitId: targetUnit.id, value: adjustValue(card.effect.value), weatherModifier });
        if (card.id === 'meteor_strike') {
          effects.push({
            type: 'stun',
            unitId: targetUnit.id,
            duration: 1
          });
        }
      }
      break;
    case 'stun':
      if (targetUnit && targetUnit.faction !== currentFaction) {
        effects.push({
          type: 'applyStatus',
          unitId: targetUnit.id,
          statusEffect: {
            type: STATUS_EFFECT_TYPES.STUN,
            duration: card.effect.duration ?? 2,
            source: card.id
          }
        });
      }
      break;
    case 'summon':
      effects.push({ type: 'summon', unitType: card.effect.unitType, faction: currentFaction });
      break;
    case 'terrainChange':
      if (targetPos) {
        effects.push({ type: 'terrainChange', x: targetPos.x, y: targetPos.y, terrain: card.effect.terrain });
      }
      break;
    case 'tileEffect':
      if (targetPos) {
        const radius = card.effect.radius || 0;
        effects.push({
          type: 'tileEffect',
          x: targetPos.x,
          y: targetPos.y,
          tileEffectType: card.effect.tileEffectType,
          duration: card.effect.duration,
          radius
        });
        if (radius > 0) {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (Math.abs(dx) + Math.abs(dy) > radius) continue;
              effects.push({
                type: 'tileEffect',
                x: targetPos.x + dx,
                y: targetPos.y + dy,
                tileEffectType: card.effect.tileEffectType,
                duration: card.effect.duration,
                radius: 0
              });
            }
          }
        }
      }
      break;
    case 'doubleAttack': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'doubleAttack', duration: card.effect.duration }
        });
      }
      break;
    }
    case 'reveal':
      if (targetPos) {
        effects.push({
          type: 'reveal',
          duration: card.effect.duration,
          radius: card.effect.radius || 3,
          x: targetPos.x,
          y: targetPos.y
        });
      }
      break;
    case 'counterAttack': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'counterAttack', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    }
    case 'shield': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'shield', duration: card.effect.duration }
        });
      }
      break;
    }
    case 'cleanse': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({ type: 'cleanse', unitId: friendlyUnit.id });
      }
      break;
    }
    case 'statusResistBoost': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      if (friendlyUnit) {
        effects.push({
          type: 'addBuff',
          unitId: friendlyUnit.id,
          buff: { type: 'statusResistBoost', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    }
  }

  return effects;
}

/**
 * @param {EventCard[]} hand
 * @returns {{ hand: EventCard[], expiredCards: EventCard[] }}
 */
export function tickActiveCards(hand) {
  /** @type {EventCard[]} */
  const expiredCards = [];
  /** @type {EventCard[]} */
  const newHand = [];
  for (const card of hand) {
    if (card.cardState === 'active' && card.remainingDuration !== undefined) {
      const newDuration = card.remainingDuration - 1;
      if (newDuration <= 0) {
        expiredCards.push(card);
      } else {
        newHand.push({ ...card, remainingDuration: newDuration });
      }
    } else {
      newHand.push(card);
    }
  }
  return { hand: newHand, expiredCards };
}

/**
 * @param {CooldownEntry[]} cooldowns
 * @param {EventCard[]} expiredCards
 * @returns {CooldownEntry[]}
 */
export function addExpiredCardsToCooldowns(cooldowns, expiredCards) {
  /** @type {CooldownEntry[]} */
  const newCooldowns = [...cooldowns];
  for (const card of expiredCards) {
    const existing = newCooldowns.find(cd => cd.cardId === card.id);
    if (existing) {
      existing.remainingCooldown = Math.max(existing.remainingCooldown, card.cooldown);
    } else {
      newCooldowns.push({ cardId: card.id, remainingCooldown: card.cooldown });
    }
  }
  return newCooldowns;
}

/**
 * @param {CooldownEntry[]} cooldowns
 * @returns {CooldownEntry[]}
 */
export function tickCooldowns(cooldowns) {
  return cooldowns
    .map(cd => ({ ...cd, remainingCooldown: cd.remainingCooldown - 1 }))
    .filter(cd => cd.remainingCooldown > 0);
}

/**
 * @param {EventCard} card
 * @returns {EventCard}
 */
export function activateCard(card) {
  if (card.category === CARD_CATEGORY.SUSTAIN || card.category === CARD_CATEGORY.COUNTER) {
    return {
      ...card,
      cardState: 'active',
      remainingDuration: card.effect.duration || 1
    };
  }
  return { ...card, cardState: 'available' };
}

/**
 * @param {EventCard} card
 * @returns {CooldownEntry}
 */
export function createCooldownEntry(card) {
  return {
    cardId: card.id,
    remainingCooldown: card.cooldown
  };
}

/**
 * @param {number} currentEnergy
 * @returns {number}
 */
export function refillEnergy(currentEnergy) {
  return Math.min(currentEnergy + cardConfig.energyPerTurn, cardConfig.maxEnergy);
}

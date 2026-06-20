import { eventCards, cardConfig, CARD_CATEGORY } from '$lib/config/eventCardConfig';
import { STATUS_EFFECT_TYPES, unitConfig } from '$lib/config/unitConfig';

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
 * @property {string} [unitType]
 * @property {string} [terrain]
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
 */

/**
 * @typedef {object} AppliedEffect
 * @property {string} type
 * @property {string} [unitId]
 * @property {number} [value]
 * @property {any} [buff]
 * @property {number} [duration]
 * @property {string} [unitType]
 * @property {string} [faction]
 * @property {number} [x]
 * @property {number} [y]
 * @property {string} [terrain]
 * @property {StatusEffect} [statusEffect]
 * @property {boolean} [resisted]
 */

/**
 * @typedef {object} CooldownEntry
 * @property {string} cardId
 * @property {number} remainingCooldown
 */

/**
 * @returns {EventCard}
 */
export function drawCard() {
  const randomIndex = Math.floor(Math.random() * eventCards.length);
  return /** @type {EventCard} */ ({
    ...eventCards[randomIndex],
    cardState: 'available',
    remainingDuration: 0,
    remainingCooldown: 0
  });
}

/**
 * @returns {EventCard[]}
 */
export function drawInitialHand() {
  /** @type {EventCard[]} */
  const hand = [];
  for (let i = 0; i < cardConfig.initialHandSize; i++) {
    hand.push({
      ...drawCard(),
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
    case 'reveal':
      return true;
    default:
      return false;
  }
}

/**
 * @param {EventCard} card
 * @param {any} gameState
 * @param {Unit | null | undefined} selectedUnit
 * @param {Unit | null | undefined} targetUnit
 * @param {{x: number, y: number} | null | undefined} targetPos
 * @returns {AppliedEffect[]}
 */
export function applyCardEffect(card, gameState, selectedUnit, targetUnit, targetPos) {
  /** @type {AppliedEffect[]} */
  const effects = [];
  const currentFaction = /** @type {string} */ (gameState.currentFaction);
  const effectType = card.effect.type;

  const isStatusDebuff = Object.values(STATUS_EFFECT_TYPES).includes(effectType);

  if (isStatusDebuff) {
    if (targetUnit && targetUnit.faction !== currentFaction) {
      effects.push({
        type: 'applyStatus',
        unitId: targetUnit.id,
        statusEffect: {
          type: effectType,
          duration: card.effect.duration ?? 2,
          value: card.effect.value,
          source: card.id
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
        effects.push({ type: 'heal', unitId: friendlyUnit.id, value: card.effect.value });
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
          buff: { type: 'attackBoost', value: card.effect.value, duration: card.effect.duration }
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
          buff: { type: 'defenseBoost', value: card.effect.value, duration: card.effect.duration }
        });
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
        effects.push({ type: 'damage', unitId: targetUnit.id, value: card.effect.value });
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
      effects.push({ type: 'reveal', duration: card.effect.duration });
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

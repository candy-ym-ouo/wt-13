import { eventCards, cardConfig } from '$lib/config/eventCardConfig';

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
 * @property {string} type
 * @property {string} description
 * @property {CardEffect} effect
 * @property {string} icon
 * @property {string} [instanceId]
 */

/**
 * @typedef {object} Unit
 * @property {string} id
 * @property {string} type
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
 */

/**
 * @returns {EventCard}
 */
export function drawCard() {
  const randomIndex = Math.floor(Math.random() * eventCards.length);
  return /** @type {EventCard} */ ({ ...eventCards[randomIndex] });
}

/**
 * @returns {EventCard[]}
 */
export function drawInitialHand() {
  /** @type {EventCard[]} */
  const hand = [];
  for (let i = 0; i < cardConfig.initialHandSize; i++) {
    hand.push({ ...drawCard(), instanceId: String(Date.now() + i + Math.random()) });
  }
  return hand;
}

/**
 * @param {EventCard | null | undefined} card
 * @param {Unit | null | undefined} selectedUnit
 * @param {Unit | null | undefined} targetUnit
 * @param {string} currentFaction
 * @returns {boolean}
 */
export function canUseCard(card, selectedUnit, targetUnit, currentFaction) {
  if (!card) return false;

  switch (card.effect.type) {
    case 'heal':
    case 'attackBoost':
    case 'defenseBoost':
    case 'moveBoost':
    case 'doubleAttack': {
      const friendlyUnit = (selectedUnit && selectedUnit.faction === currentFaction)
        ? selectedUnit
        : (targetUnit && targetUnit.faction === currentFaction ? targetUnit : null);
      return !!friendlyUnit;
    }
    case 'damage':
    case 'stun':
      return !!(targetUnit && targetUnit.faction !== currentFaction);
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
  
  switch (card.effect.type) {
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
        effects.push({ type: 'stun', unitId: targetUnit.id, duration: card.effect.duration });
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
  }

  return effects;
}

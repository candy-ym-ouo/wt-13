import { eventCards, cardConfig } from '$lib/config/eventCardConfig';

export function drawCard() {
  const randomIndex = Math.floor(Math.random() * eventCards.length);
  return { ...eventCards[randomIndex] };
}

export function drawInitialHand() {
  const hand = [];
  for (let i = 0; i < cardConfig.initialHandSize; i++) {
    hand.push({ ...drawCard(), instanceId: Date.now() + i + Math.random() });
  }
  return hand;
}

export function canUseCard(card, unit, targetUnit, currentFaction) {
  if (!card) return false;

  switch (card.effect.type) {
    case 'heal':
    case 'attackBoost':
    case 'defenseBoost':
    case 'moveBoost':
    case 'doubleAttack':
      return unit && unit.faction === currentFaction;
    case 'damage':
    case 'stun':
      return targetUnit && targetUnit.faction !== currentFaction;
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

export function applyCardEffect(card, gameState, targetUnit, targetPos) {
  const effects = [];
  
  switch (card.effect.type) {
    case 'heal':
      if (targetUnit) {
        effects.push({ type: 'heal', unitId: targetUnit.id, value: card.effect.value });
      }
      break;
    case 'attackBoost':
      if (targetUnit) {
        effects.push({
          type: 'addBuff',
          unitId: targetUnit.id,
          buff: { type: 'attackBoost', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    case 'defenseBoost':
      if (targetUnit) {
        effects.push({
          type: 'addBuff',
          unitId: targetUnit.id,
          buff: { type: 'defenseBoost', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    case 'moveBoost':
      if (targetUnit) {
        effects.push({
          type: 'addBuff',
          unitId: targetUnit.id,
          buff: { type: 'moveBoost', value: card.effect.value, duration: card.effect.duration }
        });
      }
      break;
    case 'damage':
      if (targetUnit) {
        effects.push({ type: 'damage', unitId: targetUnit.id, value: card.effect.value });
      }
      break;
    case 'stun':
      if (targetUnit) {
        effects.push({ type: 'stun', unitId: targetUnit.id, duration: card.effect.duration });
      }
      break;
    case 'summon':
      effects.push({ type: 'summon', unitType: card.effect.unitType, faction: gameState.currentFaction });
      break;
    case 'terrainChange':
      if (targetPos) {
        effects.push({ type: 'terrainChange', x: targetPos.x, y: targetPos.y, terrain: card.effect.terrain });
      }
      break;
    case 'doubleAttack':
      if (targetUnit) {
        effects.push({
          type: 'addBuff',
          unitId: targetUnit.id,
          buff: { type: 'doubleAttack', duration: card.effect.duration }
        });
      }
      break;
    case 'reveal':
      effects.push({ type: 'reveal', duration: card.effect.duration });
      break;
  }

  return effects;
}

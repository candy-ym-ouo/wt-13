import { CARD_CATEGORY, CARD_RARITY, cardRarityConfig, eventCards } from './eventCardConfig';

export const DECK_RULES = {
  minCards: 8,
  maxCards: 15,
  maxSameCard: 2,
  maxRareCards: 4,
  maxLimitedCards: 2,
  requiredCategories: [CARD_CATEGORY.INSTANT],
  minInstantCards: 2,
  minSustainOrCounter: 1
};

export const DECK_STORAGE_KEY = 'card_deck_data';

export const DECK_SLOTS = {
  maxDecks: 5,
  defaultName: '军令卡组'
};

export const UNLOCK_CONDITIONS = {
  [CARD_RARITY.BASIC]: { requiredLevel: 1, requiredWins: 0, goldCost: 0 },
  [CARD_RARITY.RARE]: { requiredLevel: 3, requiredWins: 5, goldCost: 200 },
  [CARD_RARITY.LIMITED]: { requiredLevel: 8, requiredWins: 20, goldCost: 500 }
};

export const UNLOCK_ORDER = eventCards.map(card => card.id);

export const INITIAL_UNLOCKED_CARDS = eventCards
  .filter(card => card.rarity === CARD_RARITY.BASIC)
  .map(card => card.id);

export function getDeckValidationRules() {
  return { ...DECK_RULES };
}

export function getUnlockCost(/** @type {string} */ cardId) {
  const card = eventCards.find(c => c.id === cardId);
  if (!card) return null;
  return UNLOCK_CONDITIONS[card.rarity] || UNLOCK_CONDITIONS[CARD_RARITY.BASIC];
}

export function canUnlockCard(/** @type {string} */ cardId, /** @type {number} */ playerLevel, /** @type {number} */ playerWins, /** @type {number} */ playerGold) {
  const cost = getUnlockCost(cardId);
  if (!cost) return { canUnlock: false, reason: '未知卡牌' };
  if (playerLevel < cost.requiredLevel) {
    return { canUnlock: false, reason: `需要指挥官等级 ${cost.requiredLevel}` };
  }
  if (playerWins < cost.requiredWins) {
    return { canUnlock: false, reason: `需要 ${cost.requiredWins} 场胜利` };
  }
  if (playerGold < cost.goldCost) {
    return { canUnlock: false, reason: `需要 ${cost.goldCost} 金币` };
  }
  return { canUnlock: true, cost: cost.goldCost };
}

export function getDefaultDeckCardIds() {
  return [
    'heal', 'heal',
    'attack_boost', 'defense_boost',
    'damage', 'damage',
    'move_boost', 'cleanse',
    'reveal', 'terrain_change'
  ];
}

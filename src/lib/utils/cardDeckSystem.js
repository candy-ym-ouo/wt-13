import {
  DECK_RULES,
  DECK_STORAGE_KEY,
  DECK_SLOTS,
  UNLOCK_CONDITIONS,
  INITIAL_UNLOCKED_CARDS,
  getDefaultDeckCardIds,
  canUnlockCard as checkUnlockCondition
} from '$lib/config/cardDeckConfig';
import { eventCards, CARD_CATEGORY, CARD_RARITY, cardRarityConfig } from '$lib/config/eventCardConfig';

/**
 * @typedef {object} DeckData
 * @property {string} id
 * @property {string} name
 * @property {string[]} cardIds
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {{ rareCount: number, limitedCount: number, instantCount: number, sustainOrCounterCount: number, totalCount: number }} stats
 */

/**
 * @typedef {object} UnlockResult
 * @property {boolean} success
 * @property {string} reason
 * @property {string[]} newUnlocked
 * @property {number} goldCost
 */

/**
 * @typedef {object} DeckStoreData
 * @property {DeckData[]} decks
 * @property {string | null} activeDeckId
 * @property {string[]} unlockedCardIds
 * @property {number} unlockPity
 */

/**
 * @param {string} [name]
 * @param {string[]} [cardIds]
 * @returns {DeckData}
 */
export function createDeck(name, cardIds) {
  return {
    id: `deck_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || DECK_SLOTS.defaultName,
    cardIds: cardIds || [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * @param {string[]} cardIds
 * @param {string[]} unlockedCardIds
 * @returns {ValidationResult}
 */
export function validateDeck(cardIds, unlockedCardIds) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!cardIds || cardIds.length < DECK_RULES.minCards) {
    errors.push(`卡组至少需要 ${DECK_RULES.minCards} 张卡牌`);
  }
  if (cardIds && cardIds.length > DECK_RULES.maxCards) {
    errors.push(`卡组最多 ${DECK_RULES.maxCards} 张卡牌`);
  }

  if (unlockedCardIds && cardIds) {
    for (const cardId of cardIds) {
      if (!unlockedCardIds.includes(cardId)) {
        errors.push(`卡牌【${cardId}】尚未解锁`);
      }
    }
  }

  /** @type {Record<string, number>} */
  const cardCountMap = {};
  if (cardIds) {
    for (const cardId of cardIds) {
      cardCountMap[cardId] = (cardCountMap[cardId] || 0) + 1;
    }
  }

  for (const [cardId, count] of Object.entries(cardCountMap)) {
    if (count > DECK_RULES.maxSameCard) {
      const card = eventCards.find(c => c.id === cardId);
      const cardName = card ? card.name : cardId;
      errors.push(`【${cardName}】同名牌上限 ${DECK_RULES.maxSameCard} 张（当前 ${count} 张）`);
    }
  }

  let rareCount = 0;
  let limitedCount = 0;
  let instantCount = 0;
  let sustainOrCounterCount = 0;

  if (cardIds) {
    for (const cardId of cardIds) {
      const card = eventCards.find(c => c.id === cardId);
      if (!card) continue;
      if (card.rarity === CARD_RARITY.RARE) rareCount++;
      if (card.rarity === CARD_RARITY.LIMITED) limitedCount++;
      if (card.category === CARD_CATEGORY.INSTANT) instantCount++;
      if (card.category === CARD_CATEGORY.SUSTAIN || card.category === CARD_CATEGORY.COUNTER) {
        sustainOrCounterCount++;
      }
    }
  }

  if (rareCount > DECK_RULES.maxRareCards) {
    errors.push(`稀有卡牌上限 ${DECK_RULES.maxRareCards} 张（当前 ${rareCount} 张）`);
  }
  if (limitedCount > DECK_RULES.maxLimitedCards) {
    errors.push(`限定卡牌上限 ${DECK_RULES.maxLimitedCards} 张（当前 ${limitedCount} 张）`);
  }
  if (instantCount < DECK_RULES.minInstantCards) {
    errors.push(`至少需要 ${DECK_RULES.minInstantCards} 张即时类卡牌`);
  }
  if (sustainOrCounterCount < DECK_RULES.minSustainOrCounter) {
    warnings.push(`建议包含至少 ${DECK_RULES.minSustainOrCounter} 张持续或反制类卡牌`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { rareCount, limitedCount, instantCount, sustainOrCounterCount, totalCount: cardIds ? cardIds.length : 0 }
  };
}

/**
 * @param {DeckData} deck
 * @param {string} cardId
 * @param {string[]} unlockedCardIds
 * @returns {DeckData}
 */
export function addCardToDeck(deck, cardId, unlockedCardIds) {
  if (!deck) return deck;
  const currentCount = deck.cardIds.filter(/** @param {string} id */ id => id === cardId).length;
  if (currentCount >= DECK_RULES.maxSameCard) return deck;
  if (deck.cardIds.length >= DECK_RULES.maxCards) return deck;
  if (unlockedCardIds && !unlockedCardIds.includes(cardId)) return deck;

  const card = eventCards.find(c => c.id === cardId);
  if (!card) return deck;

  const rareCount = deck.cardIds.filter(/** @param {string} id */ id => {
    const c = eventCards.find(ec => ec.id === id);
    return c && c.rarity === CARD_RARITY.RARE;
  }).length;
  const limitedCount = deck.cardIds.filter(/** @param {string} id */ id => {
    const c = eventCards.find(ec => ec.id === id);
    return c && c.rarity === CARD_RARITY.LIMITED;
  }).length;

  if (card.rarity === CARD_RARITY.RARE && rareCount >= DECK_RULES.maxRareCards) return deck;
  if (card.rarity === CARD_RARITY.LIMITED && limitedCount >= DECK_RULES.maxLimitedCards) return deck;

  return {
    ...deck,
    cardIds: [...deck.cardIds, cardId],
    updatedAt: Date.now()
  };
}

/**
 * @param {DeckData} deck
 * @param {string} cardId
 * @returns {DeckData}
 */
export function removeCardFromDeck(deck, cardId) {
  if (!deck) return deck;
  const idx = deck.cardIds.indexOf(cardId);
  if (idx === -1) return deck;

  const newCardIds = [...deck.cardIds];
  newCardIds.splice(idx, 1);
  return {
    ...deck,
    cardIds: newCardIds,
    updatedAt: Date.now()
  };
}

/**
 * @param {DeckData} deck
 * @param {string} newName
 * @returns {DeckData}
 */
export function renameDeck(deck, newName) {
  if (!deck) return deck;
  return {
    ...deck,
    name: newName,
    updatedAt: Date.now()
  };
}

/**
 * @param {DeckData} deck
 * @returns {any[]}
 */
export function getDeckCardDetails(deck) {
  if (!deck) return [];
  return deck.cardIds.map(cardId => eventCards.find(c => c.id === cardId)).filter(Boolean);
}

/**
 * @param {DeckData} deck
 * @returns {{ totalCount: number, categoryCounts: Record<string, number>, rarityCounts: Record<string, number>, averageCost: string } | null}
 */
export function getDeckStats(deck) {
  if (!deck) return null;
  const details = getDeckCardDetails(deck);
  /** @type {Record<string, number>} */
  const categoryCounts = {};
  /** @type {Record<string, number>} */
  const rarityCounts = {};
  let totalCost = 0;

  for (const card of details) {
    categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;
    rarityCounts[card.rarity] = (rarityCounts[card.rarity] || 0) + 1;
    totalCost += card.cost;
  }

  return {
    totalCount: details.length,
    categoryCounts,
    rarityCounts,
    averageCost: details.length > 0 ? (totalCost / details.length).toFixed(1) : '0'
  };
}

/**
 * @param {string[]} unlockedCardIds
 * @param {string} cardId
 * @param {number} playerLevel
 * @param {number} playerWins
 * @param {number} playerGold
 * @returns {UnlockResult}
 */
export function unlockCard(unlockedCardIds, cardId, playerLevel, playerWins, playerGold) {
  if (unlockedCardIds.includes(cardId)) {
    return { success: false, reason: '该卡牌已解锁', newUnlocked: unlockedCardIds, goldCost: 0 };
  }

  const result = checkUnlockCondition(cardId, playerLevel, playerWins, playerGold);
  if (!result.canUnlock) {
    return { success: false, reason: result.reason || '条件不足', newUnlocked: unlockedCardIds, goldCost: 0 };
  }

  return {
    success: true,
    reason: '',
    newUnlocked: [...unlockedCardIds, cardId],
    goldCost: result.cost || 0
  };
}

/**
 * @param {DeckData | null} deck
 * @returns {string[]}
 */
export function getCardsForDrawPool(deck) {
  if (!deck || !deck.cardIds || deck.cardIds.length === 0) {
    return eventCards.map(c => c.id);
  }
  return [...deck.cardIds];
}

/**
 * @returns {DeckStoreData}
 */
export function createInitialDeckData() {
  const defaultCardIds = getDefaultDeckCardIds();
  const initialDeck = createDeck('默认卡组', defaultCardIds);

  return {
    decks: [initialDeck],
    activeDeckId: initialDeck.id,
    unlockedCardIds: [...INITIAL_UNLOCKED_CARDS],
    unlockPity: 0
  };
}

/**
 * @param {DeckStoreData} data
 * @returns {boolean}
 */
export function saveDeckData(data) {
  try {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @returns {DeckStoreData | null}
 */
export function loadDeckData() {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const defaults = createInitialDeckData();
    return {
      ...defaults,
      ...parsed,
      decks: parsed.decks || defaults.decks,
      unlockedCardIds: parsed.unlockedCardIds || defaults.unlockedCardIds
    };
  } catch (e) {
    return null;
  }
}

/**
 * @param {DeckData} deck
 * @param {string[]} unlockedCardIds
 * @returns {{ success: boolean, reason?: string, deck?: DeckData, validation?: ValidationResult }}
 */
export function selectDeckForBattle(deck, unlockedCardIds) {
  const validation = validateDeck(deck.cardIds, unlockedCardIds);
  if (!validation.valid) {
    return { success: false, reason: validation.errors.join('；'), validation };
  }
  return { success: true, deck, validation };
}

/**
 * @param {string[]} unlockedCardIds
 * @returns {{ total: number, unlocked: number, byRarity: Record<string, { total: number, unlocked: number }> }}
 */
export function getCardUnlockProgress(unlockedCardIds) {
  const total = eventCards.length;
  const unlocked = unlockedCardIds ? unlockedCardIds.length : 0;
  /** @type {Record<string, { total: number, unlocked: number }>} */
  const byRarity = {};
  for (const rarity of Object.values(CARD_RARITY)) {
    const totalRarity = eventCards.filter(c => c.rarity === rarity).length;
    const unlockedRarity = eventCards.filter(c => c.rarity === rarity && unlockedCardIds.includes(c.id)).length;
    byRarity[rarity] = { total: totalRarity, unlocked: unlockedRarity };
  }
  return { total, unlocked, byRarity };
}

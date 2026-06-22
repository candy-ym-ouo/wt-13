// @ts-nocheck
import { writable, derived, get } from 'svelte/store';
import { DECK_SLOTS } from '$lib/config/cardDeckConfig';
import {
  createDeck,
  validateDeck,
  addCardToDeck,
  removeCardFromDeck,
  renameDeck,
  getDeckCardDetails,
  getDeckStats,
  unlockCard as unlockCardCore,
  selectDeckForBattle,
  getCardsForDrawPool,
  createInitialDeckData,
  saveDeckData,
  loadDeckData,
  getCardUnlockProgress
} from '$lib/utils/cardDeckSystem';
import { legionStore } from '$lib/stores/legionStore.js';

function getCommanderLevelFromUnits(units) {
  if (!units || units.length === 0) return 1;
  let maxLevel = 1;
  for (const u of units) {
    if (u.level > maxLevel) maxLevel = u.level;
  }
  return maxLevel;
}

function getMergedUnlockedIds(cardDeckUnlocked, legionUnlocked) {
  const merged = new Set([...(cardDeckUnlocked || [])]);
  for (const id of (legionUnlocked || [])) {
    merged.add(id);
  }
  return Array.from(merged);
}

function createCardDeckStore() {
  const saved = loadDeckData();
  const legionData = get(legionStore);
  const mergedInitial = saved || createInitialDeckData();
  mergedInitial.unlockedCardIds = getMergedUnlockedIds(
    mergedInitial.unlockedCardIds,
    legionData?.unlockedCards || []
  );

  const { subscribe, set, update } = writable(mergedInitial);

  subscribe(state => {
    if (state) {
      saveDeckData(state);
    }
  });

  /** @type {any} */
  const store = {
    subscribe,
    set,
    update,

    reset: () => {
      const newData = createInitialDeckData();
      const legionDataNow = get(legionStore);
      newData.unlockedCardIds = getMergedUnlockedIds(
        newData.unlockedCardIds,
        legionDataNow?.unlockedCards || []
      );
      set(newData);
      return newData;
    },

    createDeck: (name) => update(state => {
      if (state.decks.length >= DECK_SLOTS.maxDecks) return state;
      const newDeck = createDeck(name);
      return { ...state, decks: [...state.decks, newDeck] };
    }),

    deleteDeck: (deckId) => update(state => {
      const newDecks = state.decks.filter(d => d.id !== deckId);
      let newActiveId = state.activeDeckId;
      if (state.activeDeckId === deckId) {
        newActiveId = newDecks.length > 0 ? newDecks[0].id : null;
      }
      return { ...state, decks: newDecks, activeDeckId: newActiveId };
    }),

    setActiveDeck: (deckId) => update(state => {
      if (!state.decks.some(d => d.id === deckId)) return state;
      return { ...state, activeDeckId: deckId };
    }),

    renameDeck: (deckId, newName) => update(state => {
      const newDecks = state.decks.map(d => d.id === deckId ? renameDeck(d, newName) : d);
      return { ...state, decks: newDecks };
    }),

    addCard: (deckId, cardId) => update(state => {
      const mergedUnlocked = getMergedUnlockedIds(state.unlockedCardIds, get(legionStore)?.unlockedCards || []);
      const newDecks = state.decks.map(d =>
        d.id === deckId ? addCardToDeck(d, cardId, mergedUnlocked) : d
      );
      return { ...state, decks: newDecks };
    }),

    removeCard: (deckId, cardId) => update(state => {
      const newDecks = state.decks.map(d =>
        d.id === deckId ? removeCardFromDeck(d, cardId) : d
      );
      return { ...state, decks: newDecks };
    }),

    unlockCard: (cardId) => {
      const legionData = get(legionStore);
      const playerLevel = getCommanderLevelFromUnits(legionData?.units || []);
      const playerWinsCount = legionData?.stats?.totalWins || 0;
      const playerGoldCount = legionData?.currency?.gold || 0;

      let finalState = null;
      update(state => {
        const mergedUnlocked = getMergedUnlockedIds(state.unlockedCardIds, legionData?.unlockedCards || []);
        const result = unlockCardCore(mergedUnlocked, cardId, playerLevel, playerWinsCount, playerGoldCount);
        if (!result.success) {
          finalState = { ...state, lastUnlockResult: { success: false, reason: result.reason } };
          return finalState;
        }

        if (result.goldCost > 0) {
          legionStore.addCurrency('gold', -result.goldCost);
        }
        legionStore.unlockCards([cardId]);

        finalState = {
          ...state,
          unlockedCardIds: result.newUnlocked,
          lastUnlockResult: { success: true, cardId, goldCost: result.goldCost }
        };
        return finalState;
      });
      return finalState?.lastUnlockResult;
    },

    clearUnlockResult: () => update(state => ({
      ...state,
      lastUnlockResult: null
    })),

    selectDeckForBattle: (deckId) => {
      let result = null;
      update(state => {
        const deck = state.decks.find(d => d.id === deckId);
        if (!deck) {
          result = { success: false, reason: '卡组不存在' };
          return state;
        }
        const mergedUnlocked = getMergedUnlockedIds(state.unlockedCardIds, get(legionStore)?.unlockedCards || []);
        result = selectDeckForBattle(deck, mergedUnlocked);
        if (result.success) {
          return { ...state, activeDeckId: deckId };
        }
        return state;
      });
      return result;
    },

    getActiveDeckCardIds: () => {
      let cardIds = [];
      const unsub = subscribe(state => {
        const deck = state.decks.find(d => d.id === state.activeDeckId);
        cardIds = deck ? getCardsForDrawPool(deck) : [];
      });
      unsub();
      return cardIds;
    },

    getUnlockedCardIds: () => {
      let ids = [];
      const unsub = subscribe(state => {
        ids = state.unlockedCardIds || [];
      });
      unsub();
      return ids;
    }
  };

  store.getMergedUnlockedCardIds = () => {
    const selfUnlocked = store.getUnlockedCardIds();
    const legionDataNow = get(legionStore);
    return getMergedUnlockedIds(selfUnlocked, legionDataNow?.unlockedCards || []);
  };

  return store;
}

export const cardDeckStore = createCardDeckStore();

export const commanderLevel = derived(legionStore, $legion => {
  return getCommanderLevelFromUnits($legion?.units || []);
});

export const playerWins = derived(legionStore, $legion => {
  return $legion?.stats?.totalWins || 0;
});

export const playerGold = derived(legionStore, $legion => {
  return $legion?.currency?.gold || 0;
});

export const mergedUnlockedCardIds = derived(
  [cardDeckStore, legionStore],
  ([$deck, $legion]) => getMergedUnlockedIds($deck?.unlockedCardIds || [], $legion?.unlockedCards || [])
);

export const activeDeck = derived(cardDeckStore, $store => {
  if (!$store.activeDeckId) return null;
  return $store.decks.find(d => d.id === $store.activeDeckId) || null;
});

export const activeDeckCardPool = derived(activeDeck, $deck => {
  return getCardsForDrawPool($deck || null);
});

export const activeDeckDetails = derived(activeDeck, $deck => {
  if (!$deck) return [];
  return getDeckCardDetails($deck);
});

export const activeDeckStats = derived(activeDeck, $deck => {
  if (!$deck) return null;
  return getDeckStats($deck);
});

export const activeDeckValidation = derived(
  [cardDeckStore, mergedUnlockedCardIds],
  ([$store, $merged]) => {
    const deck = $store.decks.find(d => d.id === $store.activeDeckId);
    if (!deck) return { valid: false, errors: ['未选择卡组'], warnings: [], stats: null };
    return validateDeck(deck.cardIds, $merged);
  }
);

export const unlockProgress = derived(
  [mergedUnlockedCardIds],
  ([$merged]) => getCardUnlockProgress($merged)
);

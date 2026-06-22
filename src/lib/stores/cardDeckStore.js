// @ts-nocheck
import { writable, derived } from 'svelte/store';
import { DECK_SLOTS } from '$lib/config/cardDeckConfig';
import {
  createDeck,
  validateDeck,
  addCardToDeck,
  removeCardFromDeck,
  renameDeck,
  getDeckCardDetails,
  getDeckStats,
  unlockCard,
  selectDeckForBattle,
  getCardsForDrawPool,
  createInitialDeckData,
  saveDeckData,
  loadDeckData,
  getCardUnlockProgress
} from '$lib/utils/cardDeckSystem';

function createCardDeckStore() {
  const saved = loadDeckData();
  const initial = saved || createInitialDeckData();

  const { subscribe, set, update } = writable(initial);

  subscribe(state => {
    if (state) {
      saveDeckData(state);
    }
  });

  return {
    subscribe,
    set,
    update,

    reset: () => {
      const newData = createInitialDeckData();
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
      const newDecks = state.decks.map(d =>
        d.id === deckId ? addCardToDeck(d, cardId, state.unlockedCardIds) : d
      );
      return { ...state, decks: newDecks };
    }),

    removeCard: (deckId, cardId) => update(state => {
      const newDecks = state.decks.map(d =>
        d.id === deckId ? removeCardFromDeck(d, cardId) : d
      );
      return { ...state, decks: newDecks };
    }),

    unlockCard: (cardId, playerLevel, playerWins, playerGold) => update(state => {
      const result = unlockCard(state.unlockedCardIds, cardId, playerLevel, playerWins, playerGold);
      if (!result.success) {
        return { ...state, lastUnlockResult: { success: false, reason: result.reason } };
      }
      return {
        ...state,
        unlockedCardIds: result.newUnlocked,
        lastUnlockResult: { success: true, cardId, goldCost: result.goldCost }
      };
    }),

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
        result = selectDeckForBattle(deck, state.unlockedCardIds);
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
}

export const cardDeckStore = createCardDeckStore();

export const activeDeck = derived(cardDeckStore, $store => {
  if (!$store.activeDeckId) return null;
  return $store.decks.find(d => d.id === $store.activeDeckId) || null;
});

export const activeDeckDetails = derived(activeDeck, $deck => {
  if (!$deck) return [];
  return getDeckCardDetails($deck);
});

export const activeDeckStats = derived(activeDeck, $deck => {
  if (!$deck) return null;
  return getDeckStats($deck);
});

export const activeDeckValidation = derived(cardDeckStore, $store => {
  const deck = $store.decks.find(d => d.id === $store.activeDeckId);
  if (!deck) return { valid: false, errors: ['未选择卡组'], warnings: [], stats: null };
  return validateDeck(deck.cardIds, $store.unlockedCardIds);
});

export const unlockProgress = derived(cardDeckStore, $store => {
  return getCardUnlockProgress($store.unlockedCardIds);
});

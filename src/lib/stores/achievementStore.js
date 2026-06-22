import { writable, derived } from 'svelte/store';
import {
  loadAchievementState,
  saveAchievementState,
  createInitialAchievementState,
  clearAchievementState,
  startBattleTracking,
  updateBattleStat,
  checkBattleAchievements,
  checkProgressAchievements,
  getAchievementProgress,
  calculateTotalPoints,
  claimAchievementReward,
  getUnlockedCardIds
} from '$lib/utils/achievementSystem.js';
import { ACHIEVEMENTS } from '$lib/config/achievementConfig.js';
import { legionStore } from './legionStore.js';

/**
 * @typedef {import('$lib/utils/achievementSystem.js').AchievementState} AchievementState
 * @typedef {import('$lib/utils/achievementSystem.js').Achievement} Achievement
 * @typedef {import('$lib/utils/achievementSystem.js').AchievementCondition} AchievementCondition
 * @typedef {import('$lib/utils/achievementSystem.js').AchievementRewards} AchievementRewards
 * @typedef {import('$lib/utils/achievementSystem.js').ClaimResult} ClaimResult
 * @typedef {import('$lib/utils/achievementSystem.js').ProgressData} ProgressData
 */

function createAchievementStore() {
  const savedState = loadAchievementState();
  const initialState = savedState || createInitialAchievementState();

  const { subscribe, set, update } = writable(initialState);

  let autoSaveEnabled = true;
  /** @type {Achievement[]} */
  let pendingToasts = [];

  function enableAutoSave() {
    autoSaveEnabled = true;
  }

  function disableAutoSave() {
    autoSaveEnabled = false;
  }

  subscribe(state => {
    if (autoSaveEnabled && state) {
      saveAchievementState(state);
    }
  });

  return {
    subscribe,
    set,
    update,
    enableAutoSave,
    disableAutoSave,

    reset: () => {
      const newState = createInitialAchievementState();
      set(newState);
      pendingToasts = [];
      return newState;
    },

    clearAll: () => {
      clearAchievementState();
      const newState = createInitialAchievementState();
      set(newState);
      pendingToasts = [];
      return newState;
    },

    getPendingToasts: () => pendingToasts,

    popToast: () => pendingToasts.shift(),

    startBattle: (/** @type {string[]} */ unitIds) => update(state => {
      return startBattleTracking(state, unitIds);
    }),

    recordKill: () => update(state => {
      return updateBattleStat(state, 'kill', 1);
    }),

    recordDamage: (/** @type {number} */ damage) => update(state => {
      return updateBattleStat(state, 'damage', damage);
    }),

    recordCardUsed: () => update(state => {
      return updateBattleStat(state, 'cardUsed', 1);
    }),

    recordSummon: () => update(state => {
      return updateBattleStat(state, 'summon', 1);
    }),

    recordCounterKill: () => update(state => {
      return updateBattleStat(state, 'counterKill', 1);
    }),

    recordDeath: () => update(state => {
      return updateBattleStat(state, 'death', 1);
    }),

    recordTurn: () => update(state => {
      return updateBattleStat(state, 'turn', 1);
    }),

    finishBattle: (/** @type {string} */ battleResult, /** @type {any} */ gameState) => update(state => {
      const result = checkBattleAchievements(state, battleResult, gameState);
      if (result.newlyUnlocked.length > 0) {
        pendingToasts.push(...result.newlyUnlocked);
      }
      return result.state;
    }),

    checkProgress: (/** @type {any} */ legionState, /** @type {any} */ guildState) => update(state => {
      const result = checkProgressAchievements(state, legionState, guildState);
      if (result.newlyUnlocked.length > 0) {
        pendingToasts.push(...result.newlyUnlocked);
      }
      return result.state;
    }),

    claimReward: (/** @type {string} */ achievementId) => {
      /** @type {ClaimResult} */
      let resultData = /** @type {ClaimResult} */ ({ success: false, reason: '未知错误' });
      update(state => {
        const result = claimAchievementReward(state, achievementId);
        resultData = result;
        if (result.success && result.rewards) {
          const rewards = result.rewards;
          
          if (rewards.gold > 0) {
            legionStore.addGold(rewards.gold);
          }
          
          if (rewards.exp > 0) {
            legionStore.addExpToAllUnits(rewards.exp);
          }
          
          if (rewards.cards && rewards.cards.length > 0) {
            legionStore.addCollectedCards(rewards.cards);
          }
          
          if (rewards.unlockCards && rewards.unlockCards.length > 0) {
            legionStore.unlockCards(rewards.unlockCards);
          }
          
          return result.state;
        }
        return state;
      });
      return resultData;
    },

    getProgress: (/** @type {Achievement} */ achievement) => {
      /** @type {ProgressData} */
      let progress = { current: 0, target: 1, percentage: 0, completed: false };
      subscribe(state => {
        progress = getAchievementProgress(state, achievement);
      })();
      return progress;
    }
  };
}

export const achievementStore = createAchievementStore();

export const totalAchievementPoints = derived(achievementStore, $state => {
  return calculateTotalPoints($state);
});

export const unlockedCount = derived(achievementStore, $state => {
  return Object.keys($state.unlocked).length;
});

export const totalAchievementsCount = derived(achievementStore, () => {
  return ACHIEVEMENTS.length;
});

export const unlockedCardIds = derived(achievementStore, $state => {
  return getUnlockedCardIds($state);
});

export const unlockedAchievements = derived(achievementStore, $state => {
  return ACHIEVEMENTS.filter(a => $state.unlocked[a.id]);
});

/**
 * @typedef {Object} AchievementWithProgress
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {string} rarity
 * @property {string} icon
 * @property {AchievementCondition[]} conditions
 * @property {AchievementRewards} rewards
 * @property {boolean} [isHidden]
 * @property {number} [stageOrder]
 * @property {boolean} unlocked
 * @property {ProgressData} progress
 * @property {boolean} claimed
 */

/** @typedef {Record<string, AchievementWithProgress[]>} AchievementsByCategory */

export const achievementsByCategory = derived(achievementStore, $state => {
  /** @type {AchievementsByCategory} */
  const grouped = {};
  for (const achievement of ACHIEVEMENTS) {
    if (!grouped[achievement.category]) {
      grouped[achievement.category] = [];
    }
    grouped[achievement.category].push({
      ...achievement,
      unlocked: !!$state.unlocked[achievement.id],
      progress: getAchievementProgress($state, achievement),
      claimed: !!$state.claimedRewards[achievement.id]
    });
  }
  return grouped;
});

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

function createAchievementStore() {
  const savedState = loadAchievementState();
  const initialState = savedState || createInitialAchievementState();

  const { subscribe, set, update } = writable(initialState);

  let autoSaveEnabled = true;
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

    startBattle: (unitIds) => update(state => {
      return startBattleTracking(state, unitIds);
    }),

    recordKill: () => update(state => {
      return updateBattleStat(state, 'kill', 1);
    }),

    recordDamage: (damage) => update(state => {
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

    finishBattle: (battleResult, gameState) => update(state => {
      const result = checkBattleAchievements(state, battleResult, gameState);
      if (result.newlyUnlocked.length > 0) {
        pendingToasts.push(...result.newlyUnlocked);
      }
      return result.state;
    }),

    checkProgress: (legionState) => update(state => {
      const result = checkProgressAchievements(state, legionState);
      if (result.newlyUnlocked.length > 0) {
        pendingToasts.push(...result.newlyUnlocked);
      }
      return result.state;
    }),

    claimReward: (achievementId) => {
      let resultData = { success: false };
      update(state => {
        const result = claimAchievementReward(state, achievementId);
        resultData = result;
        if (result.success) {
          return result.state;
        }
        return state;
      });
      return resultData;
    },

    getProgress: (achievement) => {
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

export const achievementsByCategory = derived(achievementStore, $state => {
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

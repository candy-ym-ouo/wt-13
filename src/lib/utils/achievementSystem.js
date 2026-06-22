import {
  ACHIEVEMENTS,
  CONDITION_TYPES,
  getAchievementById,
  ACHIEVEMENT_RARITY_CONFIG
} from '$lib/config/achievementConfig.js';
import { eventCards } from '$lib/config/eventCardConfig.js';

const ACHIEVEMENT_STORAGE_KEY = 'tactical_board_achievements';

export function createInitialAchievementState() {
  return {
    unlocked: {},
    progress: {},
    stats: {
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      totalKills: 0,
      totalDamageDealt: 0,
      totalGoldEarned: 0,
      totalExpEarned: 0,
      totalRecruits: 0,
      totalCardsUsed: 0,
      totalSummons: 0,
      totalCounterKills: 0,
      bestComboKills: 0,
      collectedCards: [],
      battleHistory: []
    },
    battleStats: {
      kills: 0,
      damageDealt: 0,
      cardsUsed: 0,
      summons: 0,
      counterKills: 0,
      comboKills: 0,
      deaths: 0,
      unitIdsAtStart: [],
      turnsPlayed: 0
    },
    claimedRewards: {}
  };
}

export function loadAchievementState() {
  try {
    const data = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return mergeAchievementState(createInitialAchievementState(), parsed);
    }
  } catch (e) {
    console.error('加载成就数据失败:', e);
  }
  return createInitialAchievementState();
}

function mergeAchievementState(defaultState, savedState) {
  if (!savedState) return defaultState;
  return {
    unlocked: { ...defaultState.unlocked, ...(savedState.unlocked || {}) },
    progress: { ...defaultState.progress, ...(savedState.progress || {}) },
    stats: { ...defaultState.stats, ...(savedState.stats || {}) },
    battleStats: { ...defaultState.battleStats, ...(savedState.battleStats || {}) },
    claimedRewards: { ...defaultState.claimedRewards, ...(savedState.claimedRewards || {}) }
  };
}

export function saveAchievementState(state) {
  try {
    localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('保存成就数据失败:', e);
    return false;
  }
}

export function clearAchievementState() {
  try {
    localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清除成就数据失败:', e);
    return false;
  }
}

export function resetBattleStats(state) {
  return {
    ...state,
    battleStats: {
      kills: 0,
      damageDealt: 0,
      cardsUsed: 0,
      summons: 0,
      counterKills: 0,
      comboKills: 0,
      deaths: 0,
      unitIdsAtStart: [],
      turnsPlayed: 0
    }
  };
}

export function startBattleTracking(state, unitIds) {
  return {
    ...state,
    battleStats: {
      ...state.battleStats,
      kills: 0,
      damageDealt: 0,
      cardsUsed: 0,
      summons: 0,
      counterKills: 0,
      comboKills: 0,
      deaths: 0,
      unitIdsAtStart: [...unitIds],
      turnsPlayed: 0
    }
  };
}

export function updateBattleStat(state, statType, value = 1) {
  const newBattleStats = { ...state.battleStats };
  const newStats = { ...state.stats };

  switch (statType) {
    case 'kill':
      newBattleStats.kills += value;
      newStats.totalKills += value;
      newBattleStats.comboKills += 1;
      newBattleStats.bestComboKills = Math.max(newBattleStats.bestComboKills, newBattleStats.comboKills);
      break;
    case 'damage':
      newBattleStats.damageDealt += value;
      newStats.totalDamageDealt += value;
      break;
    case 'cardUsed':
      newBattleStats.cardsUsed += value;
      newStats.totalCardsUsed += value;
      newBattleStats.comboKills = 0;
      break;
    case 'summon':
      newBattleStats.summons += value;
      newStats.totalSummons += value;
      break;
    case 'counterKill':
      newBattleStats.counterKills += value;
      newBattleStats.kills += value;
      newStats.totalCounterKills += value;
      newStats.totalKills += value;
      break;
    case 'death':
      newBattleStats.deaths += value;
      newBattleStats.comboKills = 0;
      break;
    case 'turn':
      newBattleStats.turnsPlayed += value;
      break;
  }

  return {
    ...state,
    battleStats: newBattleStats,
    stats: newStats
  };
}

export function checkBattleAchievements(state, battleResult, gameState) {
  const newlyUnlocked = [];
  let newState = { ...state };
  const stats = { ...newState.stats };
  const battleStats = newState.battleStats;

  stats.totalBattles += 1;
  if (battleResult === 'win') {
    stats.totalWins += 1;
    stats.currentWinStreak += 1;
    stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
  } else if (battleResult === 'lose') {
    stats.totalLosses += 1;
    stats.currentWinStreak = 0;
  } else {
    stats.totalDraws += 1;
  }

  newState.stats = stats;

  const conditionsToCheck = [
    { type: CONDITION_TYPES.WIN_BATTLE, value: battleResult === 'win' ? 1 : 0, requireValue: battleResult === 'win' },
    { type: CONDITION_TYPES.TOTAL_BATTLES, value: stats.totalBattles },
    { type: CONDITION_TYPES.WIN_STREAK, value: stats.currentWinStreak },
    { type: CONDITION_TYPES.KILL_COUNT, value: stats.totalKills },
    { type: CONDITION_TYPES.TOTAL_DAMAGE, value: battleStats.damageDealt, isBattleScope: true },
    { type: CONDITION_TYPES.TURN_LIMIT, value: battleStats.turnsPlayed, requireWin: battleResult === 'win' },
    { type: CONDITION_TYPES.NO_DEATHS, value: battleStats.deaths === 0 && battleResult === 'win' ? 1 : 0, requireValue: battleStats.deaths === 0 && battleResult === 'win' },
    { type: CONDITION_TYPES.PERFECT_VICTORY, value: (battleStats.turnsPlayed <= 5 && battleStats.deaths === 0 && battleResult === 'win') ? 1 : 0, requireValue: battleStats.turnsPlayed <= 5 && battleStats.deaths === 0 && battleResult === 'win' },
    { type: CONDITION_TYPES.CARDS_USED, value: battleStats.cardsUsed, isBattleScope: true, requireWin: battleResult === 'win' },
    { type: CONDITION_TYPES.SUMMON_COUNT, value: battleStats.summons, isBattleScope: true },
    { type: CONDITION_TYPES.COUNTER_KILL, value: stats.totalCounterKills },
    { type: CONDITION_TYPES.COMBO_KILL, value: battleStats.comboKills, isBattleScope: true }
  ];

  for (const achievement of ACHIEVEMENTS) {
    if (newState.unlocked[achievement.id]) continue;

    const allConditionsMet = achievement.conditions.every(condition => {
      const check = conditionsToCheck.find(c => c.type === condition.type);
      if (!check) return false;

      if (condition.requireWin && !check.requireWin) return false;
      if (check.requireValue !== undefined) {
        return check.requireValue;
      }

      return check.value >= condition.target;
    });

    if (allConditionsMet) {
      newState.unlocked[achievement.id] = {
        unlockedAt: Date.now(),
        battleIndex: stats.totalBattles
      };
      newlyUnlocked.push(achievement);
    }
  }

  return { state: newState, newlyUnlocked };
}

export function checkProgressAchievements(state, legionState) {
  const newlyUnlocked = [];
  let newState = { ...state };
  const stats = { ...newState.stats };

  if (legionState) {
    const unitCount = legionState.units?.length || 0;
    const maxLevel = legionState.units?.reduce((max, u) => Math.max(max, u.level || 1), 1) || 1;
    const hasPromotion = legionState.units?.some(u => (u.promotion || 0) > 0);
    const recruitCount = legionState.stats?.totalRecruits || 0;
    const goldEarned = legionState.currency?.gold || 0;
    const collectedCardIds = legionState.collectedCards || [];

    stats.totalRecruits = Math.max(stats.totalRecruits, recruitCount);
    stats.totalGoldEarned = Math.max(stats.totalGoldEarned, goldEarned);
    stats.collectedCards = Array.from(new Set([...stats.collectedCards, ...collectedCardIds]));

    newState.stats = stats;

    const conditionsToCheck = [
      { type: CONDITION_TYPES.COLLECT_UNITS, value: unitCount },
      { type: CONDITION_TYPES.COLLECT_CARDS, value: stats.collectedCards.length },
      { type: CONDITION_TYPES.UNIT_LEVEL, value: maxLevel },
      { type: CONDITION_TYPES.UNIT_PROMOTION, value: hasPromotion ? 1 : 0, requireValue: hasPromotion },
      { type: CONDITION_TYPES.RECRUIT_COUNT, value: stats.totalRecruits },
      { type: CONDITION_TYPES.GOLD_EARNED, value: stats.totalGoldEarned }
    ];

    for (const achievement of ACHIEVEMENTS) {
      if (newState.unlocked[achievement.id]) continue;
      if (achievement.category !== 'collection' && achievement.category !== 'progress' && achievement.category !== 'stage') continue;

      const allConditionsMet = achievement.conditions.every(condition => {
        const check = conditionsToCheck.find(c => c.type === condition.type);
        if (!check) return false;

        if (check.requireValue !== undefined) {
          return check.requireValue;
        }
        return check.value >= condition.target;
      });

      if (allConditionsMet) {
        newState.unlocked[achievement.id] = {
          unlockedAt: Date.now()
        };
        newlyUnlocked.push(achievement);
      }
    }
  }

  return { state: newState, newlyUnlocked };
}

export function getAchievementProgress(state, achievement) {
  if (state.unlocked[achievement.id]) {
    return { current: 1, target: 1, percentage: 100, completed: true };
  }

  const stats = state.stats;
  const battleStats = state.battleStats;

  let maxPercentage = 0;
  let currentValue = 0;
  let targetValue = 1;

  for (const condition of achievement.conditions) {
    let value = 0;
    let target = condition.target || 1;

    switch (condition.type) {
      case CONDITION_TYPES.WIN_BATTLE:
        value = stats.totalWins;
        break;
      case CONDITION_TYPES.TOTAL_BATTLES:
        value = stats.totalBattles;
        break;
      case CONDITION_TYPES.WIN_STREAK:
        value = stats.currentWinStreak;
        break;
      case CONDITION_TYPES.KILL_COUNT:
        value = stats.totalKills;
        break;
      case CONDITION_TYPES.TOTAL_DAMAGE:
        value = battleStats.damageDealt;
        break;
      case CONDITION_TYPES.TURN_LIMIT:
        value = battleStats.turnsPlayed;
        target = 1;
        value = battleStats.turnsPlayed > 0 && battleStats.turnsPlayed <= condition.target ? 1 : 0;
        break;
      case CONDITION_TYPES.NO_DEATHS:
        value = battleStats.deaths === 0 ? 1 : 0;
        break;
      case CONDITION_TYPES.PERFECT_VICTORY:
        value = (battleStats.turnsPlayed <= 5 && battleStats.deaths === 0) ? 1 : 0;
        break;
      case CONDITION_TYPES.COLLECT_UNITS:
        value = 0;
        break;
      case CONDITION_TYPES.COLLECT_CARDS:
        value = stats.collectedCards.length;
        break;
      case CONDITION_TYPES.UNIT_LEVEL:
        value = 1;
        break;
      case CONDITION_TYPES.UNIT_PROMOTION:
        value = 0;
        break;
      case CONDITION_TYPES.RECRUIT_COUNT:
        value = stats.totalRecruits;
        break;
      case CONDITION_TYPES.GOLD_EARNED:
        value = stats.totalGoldEarned;
        break;
      case CONDITION_TYPES.CARDS_USED:
        value = battleStats.cardsUsed;
        break;
      case CONDITION_TYPES.SUMMON_COUNT:
        value = battleStats.summons;
        break;
      case CONDITION_TYPES.COUNTER_KILL:
        value = stats.totalCounterKills;
        break;
      case CONDITION_TYPES.COMBO_KILL:
        value = battleStats.comboKills;
        break;
      default:
        value = 0;
    }

    const percentage = Math.min(100, (value / target) * 100);
    if (percentage > maxPercentage) {
      maxPercentage = percentage;
      currentValue = value;
      targetValue = target;
    }
  }

  return {
    current: currentValue,
    target: targetValue,
    percentage: Math.min(100, Math.round(maxPercentage)),
    completed: false
  };
}

export function calculateTotalPoints(state) {
  let total = 0;
  for (const achievementId of Object.keys(state.unlocked)) {
    const achievement = getAchievementById(achievementId);
    if (achievement) {
      total += ACHIEVEMENT_RARITY_CONFIG[achievement.rarity]?.points || 0;
    }
  }
  return total;
}

export function getUnlockedCardIds(state) {
  const cardIds = [];
  for (const achievementId of Object.keys(state.unlocked)) {
    const achievement = getAchievementById(achievementId);
    if (achievement?.rewards?.unlockCards) {
      cardIds.push(...achievement.rewards.unlockCards);
    }
    if (achievement?.rewards?.cards) {
      cardIds.push(...achievement.rewards.cards);
    }
  }
  return Array.from(new Set(cardIds));
}

export function claimAchievementReward(state, achievementId) {
  if (!state.unlocked[achievementId]) return { success: false, reason: '成就未解锁' };
  if (state.claimedRewards[achievementId]) return { success: false, reason: '奖励已领取' };

  const achievement = getAchievementById(achievementId);
  if (!achievement) return { success: false, reason: '成就不存在' };

  const rewards = achievement.rewards || {};
  const newState = {
    ...state,
    claimedRewards: {
      ...state.claimedRewards,
      [achievementId]: {
        claimedAt: Date.now()
      }
    },
    stats: {
      ...state.stats,
      totalGoldEarned: state.stats.totalGoldEarned + (rewards.gold || 0),
      totalExpEarned: state.stats.totalExpEarned + (rewards.exp || 0)
    }
  };

  return {
    success: true,
    state: newState,
    rewards: {
      gold: rewards.gold || 0,
      exp: rewards.exp || 0,
      cards: rewards.cards || [],
      unlockCards: rewards.unlockCards || []
    }
  };
}

export function getCardData(cardIds) {
  return cardIds
    .map(id => eventCards.find(c => c.id === id))
    .filter(Boolean);
}

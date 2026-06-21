import { writable, derived } from 'svelte/store';
import {
  RANK_TIERS,
  RANK_SUB_TIERS,
  POINT_RULES,
  SEASON_REWARDS,
  PROMOTION_MATCHES,
  PROMOTION_WIN_RATE,
  GRANDMASTER_DEMOTION_POINTS
} from '$lib/config/seasonConfig.js';
import {
  loadSeasonData,
  saveSeasonData,
  loadSeasonHistory,
  createNewSeasonData,
  archiveSeason
} from '$lib/utils/seasonStorage.js';

/** @typedef {import('$lib/utils/seasonStorage.js').SeasonData} SeasonData */
/** @typedef {import('$lib/utils/seasonStorage.js').SeasonHistoryEntry} SeasonHistoryEntry */
/** @typedef {import('$lib/utils/seasonStorage.js').PromotionProgress} PromotionProgress */
/** @typedef {import('$lib/config/seasonConfig.js').RankTier} RankTier */
/** @typedef {import('$lib/config/seasonConfig.js').RankSubTier} RankSubTier */

/**
 * @typedef {Object} MatchDetails
 * @property {number} [turns]
 * @property {number} [kills]
 * @property {boolean} [baseCaptured]
 * @property {number} [winStreak]
 * @property {number} [scoreDiff]
 */

/**
 * @param {number} points
 * @returns {RankTier}
 */
function getRankForPoints(points) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].minPoints) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

/**
 * @param {number} points
 * @param {RankTier} rank
 * @returns {number}
 */
function getSubTierForPoints(points, rank) {
  if (rank.id === 'grandmaster') return 1;
  const range = rank.maxPoints === Infinity ? 3000 : (rank.maxPoints - rank.minPoints);
  const progress = points - rank.minPoints;
  const tierSize = range / 3;
  if (progress >= tierSize * 2) return 1;
  if (progress >= tierSize) return 2;
  return 3;
}

/**
 * @param {number} points
 * @returns {number}
 */
function getPointsToNextRank(points) {
  const currentRank = getRankForPoints(points);
  const nextRankIndex = RANK_TIERS.indexOf(currentRank) + 1;
  if (nextRankIndex >= RANK_TIERS.length) return 0;
  return RANK_TIERS[nextRankIndex].minPoints - points;
}

/**
 * @param {'win'|'lose'|'draw'} result
 * @param {MatchDetails} [details]
 * @returns {number}
 */
function calculatePointChange(result, details) {
  const rules = POINT_RULES[result];
  if (!rules) return 0;

  let change = rules.base;

  if (result === 'win') {
    const winRules = /** @type {import('$lib/config/seasonConfig.js').PointRuleWin} */ (rules);
    if (details && details.turns && details.turns <= winRules.turnsBonus.threshold) {
      change += winRules.turnsBonus.fast;
    }
    if (details && details.kills) {
      change += details.kills * winRules.killBonus;
    }
    if (details && details.baseCaptured) {
      change += winRules.baseCaptureBonus;
    }
    if (details && details.winStreak && details.winStreak >= winRules.streakBonus.threshold) {
      const streakBonus = Math.min(
        winRules.streakBonus.bonus * Math.floor(details.winStreak / winRules.streakBonus.threshold),
        winRules.maxStreakBonus
      );
      change += streakBonus;
    }
  } else if (result === 'lose') {
    const loseRules = /** @type {import('$lib/config/seasonConfig.js').PointRuleLose} */ (rules);
    if (details && details.scoreDiff !== undefined && details.scoreDiff <= loseRules.closeGameThreshold) {
      change += loseRules.closeGameBonus;
    }
    if (details && details.turns && details.turns <= loseRules.mercyThreshold) {
      change += loseRules.mercyReduction;
    }
    change = Math.max(change, loseRules.base);
  }

  return change;
}

/**
 * @param {SeasonData} seasonData
 * @returns {boolean}
 */
function checkSeasonExpired(seasonData) {
  if (!seasonData || !seasonData.endTime) return true;
  return Date.now() >= seasonData.endTime;
}

/**
 * @typedef {Object} SeasonStoreMethods
 * @property {(result: 'win'|'lose'|'draw', details?: MatchDetails) => void} processMatchResult
 * @property {() => void} resetSeason
 * @property {() => void} checkAndRefreshSeason
 * @property {() => void} clearLastRankChange
 * @property {(rankId: string) => RankTier} getRankInfo
 * @property {(points: number) => RankTier} getRankForPoints
 * @property {() => SeasonHistoryEntry[]} getSeasonHistory
 * @property {(rankId: string) => import('$lib/config/seasonConfig.js').SeasonReward} getSeasonRewards
 * @property {(state: SeasonData) => number} getDaysRemaining
 */

/** @typedef {import('svelte/store').Writable<SeasonData> & SeasonStoreMethods} SeasonStore */

/** @returns {SeasonStore} */
function createSeasonStore() {
  /** @type {SeasonData|null} */
  let savedData = loadSeasonData();
  if (!savedData || checkSeasonExpired(savedData)) {
    if (savedData && checkSeasonExpired(savedData) && !savedData.isSettled) {
      savedData.isSettled = true;
      savedData.settledRank = savedData.rank;
      archiveSeason(savedData);
      saveSeasonData(savedData);
    }
    if (!savedData || checkSeasonExpired(savedData)) {
      savedData = createNewSeasonData();
      saveSeasonData(savedData);
    }
  }

  const { subscribe, set, update } = writable(savedData);

  subscribe(/** @param {SeasonData} state */ state => {
    if (state) {
      saveSeasonData(state);
    }
  });

  /** @type {SeasonStore} */
  // @ts-ignore
  const store = {
    subscribe,
    set,
    update,

    /**
     * @param {'win'|'lose'|'draw'} result
     * @param {MatchDetails} [details]
     */
    processMatchResult: (result, details) => update(state => {
      if (state.isSettled) return state;

      const pointChange = calculatePointChange(result, details);
      const newPoints = Math.max(0, state.points + pointChange);
      const newRank = getRankForPoints(newPoints);
      const newSubTier = getSubTierForPoints(newPoints, newRank);
      const oldRankIndex = RANK_TIERS.findIndex(/** @param {RankTier} r */ r => r.id === state.rank);
      const newRankIndex = RANK_TIERS.findIndex(/** @param {RankTier} r */ r => r.id === newRank.id);

      let winStreak = state.winStreak;
      if (result === 'win') {
        winStreak = state.winStreak + 1;
      } else if (result === 'lose') {
        winStreak = 0;
      }

      const matchRecord = {
        result,
        pointChange,
        pointsAfter: newPoints,
        rankAfter: newRank.id,
        subTierAfter: newSubTier,
        details: details || /** @type {Record<string, any>} */ ({}),
        timestamp: Date.now()
      };

      /** @type {import('$lib/utils/seasonStorage.js').PromotionProgress} */
      let promotionProgress = { ...state.promotionProgress };
      /** @type {{type: string, from: string, to: string}|null} */
      let rankChanged = null;

      if (newRankIndex > oldRankIndex) {
        rankChanged = { type: 'promote', from: state.rank, to: newRank.id };
        if (newRankIndex >= RANK_TIERS.length - 2) {
          promotionProgress = { matches: 0, wins: 0, active: true };
        } else {
          promotionProgress = { matches: 0, wins: 0, active: false };
        }
      } else if (newRankIndex < oldRankIndex) {
        rankChanged = { type: 'demote', from: state.rank, to: newRank.id };
        promotionProgress = { matches: 0, wins: 0, active: false };
      }

      if (promotionProgress.active) {
        promotionProgress.matches += 1;
        if (result === 'win') {
          promotionProgress.wins += 1;
        }
        if (promotionProgress.matches >= PROMOTION_MATCHES) {
          const winRate = promotionProgress.wins / promotionProgress.matches;
          if (winRate >= PROMOTION_WIN_RATE) {
            promotionProgress = { matches: 0, wins: 0, active: false };
          } else {
            const demotePoints = newRank.id === 'grandmaster'
              ? GRANDMASTER_DEMOTION_POINTS
              : (RANK_TIERS[Math.max(0, newRankIndex - 1)]?.maxPoints || newRank.minPoints);
            return {
              ...state,
              points: demotePoints,
              rank: RANK_TIERS[Math.max(0, newRankIndex - 1)].id,
              subTier: 1,
              winStreak,
              totalWins: state.totalWins + (result === 'win' ? 1 : 0),
              totalLosses: state.totalLosses + (result === 'lose' ? 1 : 0),
              totalDraws: state.totalDraws + (result === 'draw' ? 1 : 0),
              maxPoints: Math.max(state.maxPoints, demotePoints),
              maxRank: RANK_TIERS.findIndex(/** @param {RankTier} r */ r => r.id === state.maxRank) < newRankIndex - 1
                ? RANK_TIERS[Math.max(0, newRankIndex - 1)].id : state.maxRank,
              promotionProgress: { matches: 0, wins: 0, active: false },
              matchHistory: [matchRecord, ...state.matchHistory].slice(0, 50),
              lastRankChange: { type: 'demote_promo', from: newRank.id, to: RANK_TIERS[Math.max(0, newRankIndex - 1)].id },
              lastPointChange: pointChange
            };
          }
        }
      }

      let maxRank = state.maxRank;
      let maxSubTier = state.maxSubTier;
      /** @type {number} */
      const maxRankIdx = RANK_TIERS.findIndex(/** @param {RankTier} r */ r => r.id === maxRank);
      if (newRankIndex > maxRankIdx) {
        maxRank = newRank.id;
        maxSubTier = newSubTier;
      } else if (newRankIndex === maxRankIdx && newSubTier < maxSubTier) {
        maxSubTier = newSubTier;
      }

      return {
        ...state,
        points: newPoints,
        rank: newRank.id,
        subTier: newSubTier,
        winStreak,
        totalWins: state.totalWins + (result === 'win' ? 1 : 0),
        totalLosses: state.totalLosses + (result === 'lose' ? 1 : 0),
        totalDraws: state.totalDraws + (result === 'draw' ? 1 : 0),
        maxPoints: Math.max(state.maxPoints, newPoints),
        maxRank,
        maxSubTier,
        promotionProgress,
        matchHistory: [matchRecord, ...state.matchHistory].slice(0, 50),
        lastRankChange: rankChanged,
        lastPointChange: pointChange
      };
    }),

    resetSeason: () => update(state => {
      if (!state.isSettled) {
        state.isSettled = true;
        state.settledRank = state.rank;
        archiveSeason(state);
      }
      const newData = createNewSeasonData();
      return newData;
    }),

    checkAndRefreshSeason: () => update(state => {
      if (checkSeasonExpired(state) && !state.isSettled) {
        state.isSettled = true;
        state.settledRank = state.rank;
        archiveSeason(state);
        return createNewSeasonData();
      }
      return state;
    }),

    clearLastRankChange: () => update(state => ({
      ...state,
      lastRankChange: null,
      lastPointChange: null
    })),

    /**
     * @param {string} rankId
     * @returns {RankTier}
     */
    getRankInfo: (rankId) => {
      return RANK_TIERS.find(/** @param {RankTier} r */ r => r.id === rankId) || RANK_TIERS[0];
    },

    /**
     * @param {number} points
     * @returns {RankTier}
     */
    getRankForPoints: (points) => {
      return getRankForPoints(points);
    },

    /** @returns {SeasonHistoryEntry[]} */
    getSeasonHistory: () => {
      return loadSeasonHistory();
    },

    /**
     * @param {string} rankId
     * @returns {import('$lib/config/seasonConfig.js').SeasonReward}
     */
    getSeasonRewards: (rankId) => {
      return SEASON_REWARDS[rankId] || SEASON_REWARDS.bronze;
    },

    /**
     * @param {SeasonData} state
     * @returns {number}
     */
    getDaysRemaining: (state) => {
      if (!state || !state.endTime) return 0;
      const remaining = state.endTime - Date.now();
      return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
    }
  };

  return store;
}

export const seasonStore = createSeasonStore();

export const currentRankInfo = derived(seasonStore, $season => {
  if (!$season) return RANK_TIERS[0];
  return RANK_TIERS.find(/** @param {RankTier} r */ r => r.id === $season.rank) || RANK_TIERS[0];
});

export const currentSubTierInfo = derived(seasonStore, $season => {
  if (!$season) return RANK_SUB_TIERS[0];
  return RANK_SUB_TIERS.find(t => t.id === $season.subTier) || RANK_SUB_TIERS[0];
});

export const pointsToNextRank = derived(seasonStore, $season => {
  if (!$season) return 0;
  return getPointsToNextRank($season.points);
});

export const rankProgress = derived(seasonStore, $season => {
  if (!$season) return 0;
  const rank = getRankForPoints($season.points);
  const pointsInRank = $season.points - rank.minPoints;
  const range = rank.maxPoints === Infinity ? 3000 : (rank.maxPoints - rank.minPoints);
  return Math.min(100, Math.floor((pointsInRank / range) * 100));
});

export const totalMatches = derived(seasonStore, $season => {
  if (!$season) return 0;
  return $season.totalWins + $season.totalLosses + $season.totalDraws;
});

export const winRate = derived(seasonStore, $season => {
  if (!$season) return 0;
  const total = $season.totalWins + $season.totalLosses + $season.totalDraws;
  return total > 0 ? Math.round(($season.totalWins / total) * 100) : 0;
});

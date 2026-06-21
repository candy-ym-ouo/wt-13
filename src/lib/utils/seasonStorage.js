import { SEASON_STORAGE_KEY, SEASON_HISTORY_KEY, SEASON_DURATION_DAYS } from '$lib/config/seasonConfig.js';

/**
 * @typedef {Object} PromotionProgress
 * @property {number} matches
 * @property {number} wins
 * @property {boolean} active
 */

/**
 * @typedef {Object} MatchRecord
 * @property {'win'|'lose'|'draw'} result
 * @property {number} pointChange
 * @property {number} pointsAfter
 * @property {string} rankAfter
 * @property {number} subTierAfter
 * @property {Record<string, any>} details
 * @property {number} timestamp
 */

/**
 * @typedef {Object} SeasonData
 * @property {string} seasonId
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} points
 * @property {string} rank
 * @property {number} subTier
 * @property {number} winStreak
 * @property {number} totalWins
 * @property {number} totalLosses
 * @property {number} totalDraws
 * @property {number} maxPoints
 * @property {string} maxRank
 * @property {number} maxSubTier
 * @property {PromotionProgress} promotionProgress
 * @property {MatchRecord[]} matchHistory
 * @property {boolean} isSettled
 * @property {string|null} [settledRank]
 * @property {{type: string, from: string, to: string}|null} [lastRankChange]
 * @property {number|null} [lastPointChange]
 */

/**
 * @typedef {Object} SeasonHistoryEntry
 * @property {string} seasonId
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} finalPoints
 * @property {string} finalRank
 * @property {number} finalSubTier
 * @property {number} maxPoints
 * @property {string} maxRank
 * @property {number} maxSubTier
 * @property {number} totalWins
 * @property {number} totalLosses
 * @property {number} totalDraws
 * @property {string} settledRank
 */

/** @returns {SeasonData|null} */
export function loadSeasonData() {
  try {
    const data = localStorage.getItem(SEASON_STORAGE_KEY);
    return data ? /** @type {SeasonData} */ (JSON.parse(data)) : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {SeasonData} data
 * @returns {boolean}
 */
export function saveSeasonData(data) {
  try {
    localStorage.setItem(SEASON_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

/** @returns {SeasonHistoryEntry[]} */
export function loadSeasonHistory() {
  try {
    const data = localStorage.getItem(SEASON_HISTORY_KEY);
    return data ? /** @type {SeasonHistoryEntry[]} */ (JSON.parse(data)) : [];
  } catch (e) {
    return [];
  }
}

/**
 * @param {SeasonHistoryEntry[]} history
 * @returns {boolean}
 */
export function saveSeasonHistory(history) {
  try {
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    localStorage.setItem(SEASON_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (e) {
    return false;
  }
}

/** @returns {string} */
export function generateSeasonId() {
  const now = new Date();
  return `S${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** @returns {SeasonData} */
export function createNewSeasonData() {
  const now = Date.now();
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);

  return {
    seasonId: generateSeasonId(),
    startTime: now,
    endTime: endDate.getTime(),
    points: 1000,
    rank: 'silver',
    subTier: 3,
    winStreak: 0,
    totalWins: 0,
    totalLosses: 0,
    totalDraws: 0,
    maxPoints: 1000,
    maxRank: 'silver',
    maxSubTier: 3,
    promotionProgress: { matches: 0, wins: 0, active: false },
    matchHistory: [],
    isSettled: false,
    settledRank: null
  };
}

/**
 * @param {SeasonData} seasonData
 * @returns {SeasonHistoryEntry[]}
 */
export function archiveSeason(seasonData) {
  const history = loadSeasonHistory();
  history.unshift({
    seasonId: seasonData.seasonId,
    startTime: seasonData.startTime,
    endTime: Date.now(),
    finalPoints: seasonData.points,
    finalRank: seasonData.rank,
    finalSubTier: seasonData.subTier,
    maxPoints: seasonData.maxPoints,
    maxRank: seasonData.maxRank,
    maxSubTier: seasonData.maxSubTier,
    totalWins: seasonData.totalWins,
    totalLosses: seasonData.totalLosses,
    totalDraws: seasonData.totalDraws,
    settledRank: seasonData.settledRank || seasonData.rank
  });
  saveSeasonHistory(history);
  return history;
}

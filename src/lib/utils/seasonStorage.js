import { SEASON_STORAGE_KEY, SEASON_HISTORY_KEY, SEASON_DURATION_DAYS } from '$lib/config/seasonConfig.js';

export function loadSeasonData() {
  try {
    const data = localStorage.getItem(SEASON_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function saveSeasonData(data) {
  try {
    localStorage.setItem(SEASON_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSeasonHistory() {
  try {
    const data = localStorage.getItem(SEASON_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

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

export function generateSeasonId() {
  const now = new Date();
  return `S${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

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

/** @param {Record<string, any>} seasonData */
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

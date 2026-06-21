const ROSTER_KEY = 'tactical_board_game_roster';

/**
 * @typedef {object} RosterUnit
 * @property {string} persistentId
 * @property {string} type
 * @property {string} faction
 * @property {number} exp
 * @property {number} level
 * @property {number} statPoints
 * @property {{atk: number, def: number, hp: number, move: number}} allocatedStats
 * @property {string | null} specialization
 * @property {number} battlesSurvived
 * @property {number} totalKills
 */

/**
 * @typedef {object} FactionRoster
 * @property {RosterUnit[]} units
 * @property {number} totalWins
 * @property {number} totalGames
 */

/**
 * @returns {{red: FactionRoster, blue: FactionRoster}}
 */
export function loadRoster() {
  try {
    const data = localStorage.getItem(ROSTER_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载阵容存档失败:', e);
  }
  return {
    red: { units: [], totalWins: 0, totalGames: 0 },
    blue: { units: [], totalWins: 0, totalGames: 0 }
  };
}

/**
 * @param {{red: FactionRoster, blue: FactionRoster}} roster
 * @returns {boolean}
 */
export function saveRoster(roster) {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    return true;
  } catch (e) {
    console.error('保存阵容存档失败:', e);
    return false;
  }
}

/**
 * @param {import('./cardSystem').Unit[]} survivingUnits
 * @param {string} winnerFaction
 * @returns {boolean}
 */
export function saveRosterFromGame(survivingUnits, winnerFaction) {
  const roster = loadRoster();

  for (const faction of ['red', 'blue']) {
    const factionUnits = survivingUnits.filter(u => u.faction === faction);
    const existingRoster = roster[faction].units;
    const existingMap = new Map(existingRoster.map(u => [u.persistentId, u]));

    for (const unit of factionUnits) {
      const pid = unit.persistentId || `${unit.faction}_${unit.type}_${unit.id}`;
      const existing = existingMap.get(pid);

      if (existing) {
        existing.exp = unit.exp || existing.exp;
        existing.level = unit.level || existing.level;
        existing.statPoints = unit.statPoints ?? existing.statPoints;
        existing.allocatedStats = unit.allocatedStats || existing.allocatedStats;
        existing.specialization = unit.specialization ?? existing.specialization;
        existing.battlesSurvived = (existing.battlesSurvived || 0) + 1;
      } else {
        existingRoster.push({
          persistentId: pid,
          type: unit.type,
          faction: unit.faction,
          exp: unit.exp || 0,
          level: unit.level || 1,
          statPoints: unit.statPoints || 0,
          allocatedStats: unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 },
          specialization: unit.specialization || null,
          battlesSurvived: 1,
          totalKills: 0
        });
      }
    }

    roster[faction].totalGames = (roster[faction].totalGames || 0) + 1;
    if (faction === winnerFaction) {
      roster[faction].totalWins = (roster[faction].totalWins || 0) + 1;
    }
  }

  return saveRoster(roster);
}

/**
 * @param {string} faction
 * @param {string} unitType
 * @returns {RosterUnit | null}
 */
export function findRosterUnit(faction, unitType) {
  const roster = loadRoster();
  const factionRoster = roster[faction];
  if (!factionRoster || !factionRoster.units) return null;
  return factionRoster.units.find(u => u.type === unitType) || null;
}

/**
 * @param {string} faction
 * @returns {RosterUnit[]}
 */
export function getFactionRoster(faction) {
  const roster = loadRoster();
  return roster[faction]?.units || [];
}

/**
 * @returns {boolean}
 */
export function clearRoster() {
  try {
    localStorage.removeItem(ROSTER_KEY);
    return true;
  } catch (e) {
    console.error('清除阵容存档失败:', e);
    return false;
  }
}

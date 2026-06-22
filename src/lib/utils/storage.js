const STORAGE_KEY = 'tactical_board_game_records';

/**
 * @typedef {'move' | 'attack' | 'card' | 'damage' | 'heal' | 'status' | 'base' | 'turn' | 'summon' | 'terrain' | 'victory' | 'morale'} ActionLogType
 */

/**
 * @typedef {Record<string, any>} ActionLogDetails
 */

/**
 * @typedef {object} ActionLog
 * @property {string} id
 * @property {number} turn
 * @property {string} faction
 * @property {ActionLogType} type
 * @property {string} description
 * @property {ActionLogDetails} [details]
 * @property {number} timestamp
 */

/**
 * @typedef {object} TurnLog
 * @property {number} turn
 * @property {string} faction
 * @property {ActionLog[]} actions
 */

/**
 * @typedef {object} RoundSnapshot
 * @property {number} turn
 * @property {string} faction
 * @property {{red: number, blue: number}} aliveCount
 * @property {{red: number, blue: number}} totalDamageDealt
 * @property {{red: number, blue: number}} cardsUsed
 * @property {{red: number, blue: number}} baseDurability
 * @property {{red: number, blue: number}} baseCaptureProgress
 */

/**
 * @typedef {object} GameRecordInput
 * @property {string} winner
 * @property {string} victoryCondition
 * @property {number} turns
 * @property {number} totalUnits
 * @property {number} [avgMoraleWinner]
 * @property {number} [avgMoraleLoser]
 * @property {TurnLog[]} [actionLogs]
 * @property {RoundSnapshot[]} [roundSnapshots]
 */

/**
 * @typedef {object} GameRecord
 * @property {number} id
 * @property {string} winner
 * @property {string} victoryCondition
 * @property {number} turns
 * @property {number} totalUnits
 * @property {number} [avgMoraleWinner]
 * @property {number} [avgMoraleLoser]
 * @property {string} date
 * @property {TurnLog[]} [actionLogs]
 * @property {RoundSnapshot[]} [roundSnapshots]
 */

/**
 * @param {GameRecordInput} record
 * @returns {boolean}
 */
export function saveGameRecord(record) {
  try {
    const records = getGameRecords();
    records.unshift({
      ...record,
      id: Date.now(),
      date: new Date().toISOString()
    });
    if (records.length > 50) {
      records.length = 50;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('保存游戏记录失败:', e);
    return false;
  }
}

/**
 * @returns {GameRecord[]}
 */
export function getGameRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? /** @type {GameRecord[]} */ (JSON.parse(data)) : [];
  } catch (e) {
    console.error('读取游戏记录失败:', e);
    return [];
  }
}

/**
 * @returns {boolean}
 */
export function clearGameRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清除游戏记录失败:', e);
    return false;
  }
}

/**
 * @param {any} state
 * @returns {boolean}
 */
export function saveGameState(state) {
  try {
    localStorage.setItem('tactical_board_game_save', JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('保存游戏状态失败:', e);
    return false;
  }
}

/**
 * @returns {any}
 */
export function loadGameState() {
  try {
    const data = localStorage.getItem('tactical_board_game_save');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('加载游戏状态失败:', e);
    return null;
  }
}

/**
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const REPLAY_STORAGE_KEY = 'tactical_board_game_replays';
const MAX_REPLAYS = 10;

/**
 * @typedef {object} ReplayFrame
 * @property {number} index
 * @property {number} turn
 * @property {string} faction
 * @property {'move' | 'attack' | 'card' | 'turn' | 'victory' | 'deployment' | 'summon'} type
 * @property {string} description
 * @property {object} stateSnapshot
 * @property {object} [actionDetails]
 * @property {number} timestamp
 */

/**
 * @typedef {object} ReplayData
 * @property {number} id
 * @property {string} date
 * @property {string} winner
 * @property {string} victoryCondition
 * @property {number} totalTurns
 * @property {ReplayFrame[]} frames
 * @property {object} initialState
 * @property {object} finalState
 * @property {{red: number, blue: number}} killCounts
 * @property {{red: number, blue: number}} totalDamage
 */

/**
 * @param {ReplayData} replay
 * @returns {boolean}
 */
export function saveReplay(replay) {
  try {
    const replays = getReplays();
    const replayWithMeta = {
      ...replay,
      id: replay.id || Date.now(),
      date: replay.date || new Date().toISOString()
    };
    replays.unshift(replayWithMeta);
    if (replays.length > MAX_REPLAYS) {
      replays.length = MAX_REPLAYS;
    }
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
    return true;
  } catch (e) {
    console.error('保存录像失败:', e);
    return false;
  }
}

/**
 * @returns {ReplayData[]}
 */
export function getReplays() {
  try {
    const data = localStorage.getItem(REPLAY_STORAGE_KEY);
    return data ? /** @type {ReplayData[]} */ (JSON.parse(data)) : [];
  } catch (e) {
    console.error('读取录像列表失败:', e);
    return [];
  }
}

/**
 * @param {number} replayId
 * @returns {ReplayData | null}
 */
export function getReplayById(replayId) {
  try {
    const replays = getReplays();
    return replays.find(r => r.id === replayId) || null;
  } catch (e) {
    console.error('读取录像失败:', e);
    return null;
  }
}

/**
 * @param {number} replayId
 * @returns {boolean}
 */
export function deleteReplay(replayId) {
  try {
    const replays = getReplays();
    const filtered = replays.filter(r => r.id !== replayId);
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('删除录像失败:', e);
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function clearReplays() {
  try {
    localStorage.removeItem(REPLAY_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清除录像失败:', e);
    return false;
  }
}

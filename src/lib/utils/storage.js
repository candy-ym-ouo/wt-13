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
 * @typedef {object} GameRecordInput
 * @property {string} winner
 * @property {string} victoryCondition
 * @property {number} turns
 * @property {number} totalUnits
 * @property {number} [avgMoraleWinner]
 * @property {number} [avgMoraleLoser]
 * @property {TurnLog[]} [actionLogs]
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

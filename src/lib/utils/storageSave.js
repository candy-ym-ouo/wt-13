const SAVE_VERSION = 1;
const AUTO_SLOT = 0;
const MANUAL_SLOTS = [1, 2, 3];
const SLOT_KEY_PREFIX = 'tactical_board_save_slot_';
const SLOT_META_PREFIX = 'tactical_board_save_meta_';
const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * @typedef {object} SaveMeta
 * @property {number} slot
 * @property {string} name
 * @property {number} version
 * @property {number} timestamp
 * @property {number} turn
 * @property {string} faction
 * @property {boolean} gameOver
 * @property {string} [winner]
 */

/**
 * @typedef {object} SaveData
 * @property {number} version
 * @property {SaveMeta} meta
 * @property {any} state
 */

/**
 * @param {number} slot
 * @returns {string}
 */
function slotKey(slot) {
  return `${SLOT_KEY_PREFIX}${slot}`;
}

/**
 * @param {number} slot
 * @returns {string}
 */
function metaKey(slot) {
  return `${SLOT_META_PREFIX}${slot}`;
}

/**
 * @param {any} state
 * @returns {boolean}
 */
function validateGameState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!Array.isArray(state.units)) return false;
  if (typeof state.currentFaction !== 'string') return false;
  if (typeof state.turn !== 'number') return false;
  if (!state.hands || typeof state.hands !== 'object') return false;
  if (!state.cooldowns || typeof state.cooldowns !== 'object') return false;
  if (!state.energy || typeof state.energy !== 'object') return false;
  if (!Array.isArray(state.bases)) return false;
  return true;
}

/**
 * @param {any} state
 * @returns {any}
 */
function repairGameState(state) {
  if (!state || typeof state !== 'object') return null;

  if (!Array.isArray(state.units)) state.units = [];
  if (typeof state.currentFaction !== 'string' || (state.currentFaction !== 'red' && state.currentFaction !== 'blue')) {
    state.currentFaction = 'red';
  }
  if (typeof state.turn !== 'number' || state.turn < 1) state.turn = 1;
  if (!state.hands || typeof state.hands !== 'object') state.hands = { red: [], blue: [] };
  if (!Array.isArray(state.hands.red)) state.hands.red = [];
  if (!Array.isArray(state.hands.blue)) state.hands.blue = [];
  if (!state.cooldowns || typeof state.cooldowns !== 'object') state.cooldowns = { red: [], blue: [] };
  if (!Array.isArray(state.cooldowns.red)) state.cooldowns.red = [];
  if (!Array.isArray(state.cooldowns.blue)) state.cooldowns.blue = [];
  if (!state.energy || typeof state.energy !== 'object') state.energy = { red: 0, blue: 0 };
  if (typeof state.energy.red !== 'number') state.energy.red = 0;
  if (typeof state.energy.blue !== 'number') state.energy.blue = 0;
  if (!Array.isArray(state.bases)) state.bases = [];
  if (state.gameOver === undefined) state.gameOver = false;
  if (!Array.isArray(state.actionLogs)) state.actionLogs = [];
  if (!state.tileEffects || typeof state.tileEffects !== 'object') state.tileEffects = {};
  if (!state.drawHistory || typeof state.drawHistory !== 'object') state.drawHistory = { red: {}, blue: {} };
  if (!state.pityCounter || typeof state.pityCounter !== 'object') state.pityCounter = { red: 0, blue: 0 };
  if (!state.revealedAreas || typeof state.revealedAreas !== 'object') state.revealedAreas = { red: [], blue: [] };
  if (!state.enemyMarkers || typeof state.enemyMarkers !== 'object') state.enemyMarkers = { red: [], blue: [] };
  if (!Array.isArray(state.revealedAreas.red)) state.revealedAreas.red = [];
  if (!Array.isArray(state.revealedAreas.blue)) state.revealedAreas.blue = [];
  if (!Array.isArray(state.enemyMarkers.red)) state.enemyMarkers.red = [];
  if (!Array.isArray(state.enemyMarkers.blue)) state.enemyMarkers.blue = [];
  if (typeof state.fogOfWarEnabled !== 'boolean') state.fogOfWarEnabled = true;
  if (!Array.isArray(state.roundSnapshots)) state.roundSnapshots = [];
  if (!state.turnDamageDealt || typeof state.turnDamageDealt !== 'object') state.turnDamageDealt = { red: 0, blue: 0 };
  if (!state.turnCardsUsed || typeof state.turnCardsUsed !== 'object') state.turnCardsUsed = { red: 0, blue: 0 };
  if (!state.killCounts || typeof state.killCounts !== 'object') state.killCounts = { red: 0, blue: 0 };
  if (state.boardLayout !== null && !Array.isArray(state.boardLayout)) state.boardLayout = null;
  if (state.selectedUnitId === undefined) state.selectedUnitId = null;
  if (state.selectedCardId === undefined) state.selectedCardId = null;
  if (state.gamePhase === undefined) state.gamePhase = 'idle';
  if (typeof state.revealTurns !== 'number') state.revealTurns = 0;
  if (!Array.isArray(state.turnHistory)) state.turnHistory = [];
  if (typeof state.message !== 'string') state.message = '';
  if (!Array.isArray(state.lastStatusMessages)) state.lastStatusMessages = [];
  if (!Array.isArray(state.lastMoraleChanges)) state.lastMoraleChanges = [];
  state.lastCardAction = state.lastCardAction || null;
  state.lastActionLog = state.lastActionLog || null;
  state.terrainChanged = state.terrainChanged || null;
  state.winner = state.winner || null;
  state.victoryCondition = state.victoryCondition || null;
  state.scoreSettlement = state.scoreSettlement || null;

  for (const unit of state.units) {
    if (!unit || typeof unit !== 'object') continue;
    unit.buffs = Array.isArray(unit.buffs) ? unit.buffs : [];
    unit.statusEffects = Array.isArray(unit.statusEffects) ? unit.statusEffects : [];
    unit.allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
    unit.level = unit.level || 1;
    unit.exp = unit.exp || 0;
    unit.statPoints = unit.statPoints || 0;
    unit.specialization = unit.specialization || null;
    unit.morale = typeof unit.morale === 'number' ? unit.morale : 80;
    unit.winStreak = unit.winStreak || 0;
    unit.attackCount = unit.attackCount || 0;
  }

  return state;
}

/**
 * @param {any} state
 * @param {number} slot
 * @param {string} [name]
 * @returns {boolean}
 */
export function saveToSlot(state, slot, name) {
  try {
    const meta = {
      slot,
      name: name || (slot === AUTO_SLOT ? '自动存档' : `存档 ${slot}`),
      version: SAVE_VERSION,
      timestamp: Date.now(),
      turn: state.turn || 1,
      faction: state.currentFaction || 'red',
      gameOver: !!state.gameOver,
      winner: state.winner || null
    };

    const data = {
      version: SAVE_VERSION,
      meta,
      state
    };

    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    localStorage.setItem(metaKey(slot), JSON.stringify(meta));
    return true;
  } catch (e) {
    console.error(`保存存档位 ${slot} 失败:`, e);
    return false;
  }
}

/**
 * @param {number} slot
 * @returns {{ success: boolean; state: any; meta: SaveMeta | null; repaired: boolean }}
 */
export function loadFromSlot(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return { success: false, state: null, meta: null, repaired: false };

    const data = JSON.parse(raw);

    if (!data || !data.state) return { success: false, state: null, meta: null, repaired: false };

    const isValid = validateGameState(data.state);
    let repaired = false;
    let state = data.state;

    if (!isValid) {
      state = repairGameState(state);
      if (!state) return { success: false, state: null, meta: null, repaired: false };
      repaired = true;
    }

    const meta = data.meta || null;
    return { success: true, state, meta, repaired };
  } catch (e) {
    console.error(`加载存档位 ${slot} 失败:`, e);
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.state) {
          const state = repairGameState(data.state);
          if (state) {
            return { success: true, state, meta: data.meta || null, repaired: true };
          }
        }
      }
    } catch (e2) {
      console.error(`存档位 ${slot} 异常恢复失败:`, e2);
    }
    return { success: false, state: null, meta: null, repaired: false };
  }
}

/**
 * @param {number} slot
 * @returns {boolean}
 */
export function deleteSlot(slot) {
  try {
    localStorage.removeItem(slotKey(slot));
    localStorage.removeItem(metaKey(slot));
    return true;
  } catch (e) {
    console.error(`删除存档位 ${slot} 失败:`, e);
    return false;
  }
}

/**
 * @param {number} slot
 * @returns {SaveMeta | null}
 */
export function getSlotMeta(slot) {
  try {
    const raw = localStorage.getItem(metaKey(slot));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * @returns {Map<number, SaveMeta>}
 */
export function getAllSlotMetas() {
  const result = new Map();
  const allSlots = [AUTO_SLOT, ...MANUAL_SLOTS];
  for (const slot of allSlots) {
    const meta = getSlotMeta(slot);
    if (meta) {
      result.set(slot, meta);
    }
  }
  return result;
}

/**
 * @param {any} state
 * @returns {boolean}
 */
export function autoSave(state) {
  if (!state) return false;
  return saveToSlot(state, AUTO_SLOT, '自动存档');
}

/**
 * @returns {{ success: boolean; state: any; meta: SaveMeta | null; repaired: boolean }}
 */
export function loadAutoSave() {
  return loadFromSlot(AUTO_SLOT);
}

/**
 * @returns {boolean}
 */
export function hasAutoSave() {
  return getSlotMeta(AUTO_SLOT) !== null;
}

/**
 * @returns {void}
 */
export function clearAutoSave() {
  deleteSlot(AUTO_SLOT);
}

/**
 * @returns {number[]}
 */
export function getManualSlots() {
  return [...MANUAL_SLOTS];
}

/**
 * @returns {number}
 */
export function getAutoSlot() {
  return AUTO_SLOT;
}

/** @type {ReturnType<typeof setTimeout> | null} */
let debounceTimer = null;

/**
 * @param {any} state
 * @returns {void}
 */
export function debouncedAutoSave(state) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    autoSave(state);
    debounceTimer = null;
  }, AUTOSAVE_DEBOUNCE_MS);
}

/**
 * @returns {void}
 */
export function cancelPendingAutoSave() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

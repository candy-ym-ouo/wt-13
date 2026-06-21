import { writable, derived } from 'svelte/store';
import { boardConfig, tileEffectConfig } from '$lib/config/boardConfig';
import { unitConfig, initialUnits, STATUS_EFFECT_TYPES, getStatusInfo, COUNTER_RELATIONSHIPS, COUNTER_LABELS, SYNERGY_CONFIG, SPECIALIZATION_CONFIG, MOVE_SKILL_TYPES, MOVE_SKILL_INFO } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import { cardConfig } from '$lib/config/eventCardConfig';
import { debouncedAutoSave, cancelPendingAutoSave } from '$lib/utils/storageSave';
import {
  tickActiveCards,
  tickCooldowns,
  refillEnergy,
  createCooldownEntry
} from '$lib/utils/cardSystem';
import {
  checkStatusApplication,
  processTickStatusEffects,
  tickStatusEffects,
  hasStatusEffect,
  getStatusFlags,
  calculateBleedDamage,
  isHardCC,
  getStatusResistance,
  isImmuneToStatus,
  calculateAllSynergies,
  processTileEffectsOnUnits,
  tickTileEffects as tickTileEffectsLogic,
  calculateCombatPreview,
  getTerrain,
  checkTimeoutVictory,
  calculateScoreSettlement,
  getMoveSkillForUnit,
  getHaltStationaryBonus,
  getChargePostMoveBonus,
  didPathPassThroughFriendly
} from '$lib/utils/gameLogic';

/**
 * @typedef {import('../utils/cardSystem').Unit} Unit
 * @typedef {import('../utils/cardSystem').EventCard} EventCard
 * @typedef {import('../utils/cardSystem').CooldownEntry} CooldownEntry
 * @typedef {import('../utils/cardSystem').StatusEffect} StatusEffect
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
 * @typedef {'idle' | 'unitSelected' | 'unitMoved' | 'cardSelected' | 'gameOver'} GamePhase
 */

/**
 * @typedef {object} BaseState
 * @property {string} faction
 * @property {number} x
 * @property {number} y
 * @property {number} durability
 * @property {number} maxDurability
 * @property {number} captureProgress
 * @property {string} capturingFaction
 * @property {number} repairPerTurn
 */

/**
 * @typedef {object} RevealedArea
 * @property {number} x
 * @property {number} y
 * @property {number} radius
 * @property {number} remainingTurns
 * @property {string} faction
 * @property {number} maxTurns
 */

/**
 * @typedef {object} EnemyMarker
 * @property {string} unitId
 * @property {string} unitType
 * @property {number} x
 * @property {number} y
 * @property {string} faction
 * @property {number} spottedTurn
 * @property {number} remainingTurns
 * @property {boolean} detailedInfo
 */

/**
 * @typedef {object} GameState
 * @property {Unit[]} units
 * @property {string} currentFaction
 * @property {number} turn
 * @property {string | null} selectedUnitId
 * @property {string | null} selectedCardId
 * @property {GamePhase} gamePhase
 * @property {boolean} gameOver
 * @property {string | null} winner
 * @property {string | null} victoryCondition
 * @property {{red: EventCard[], blue: EventCard[]}} hands
 * @property {{red: CooldownEntry[], blue: CooldownEntry[]}} cooldowns
 * @property {{red: number, blue: number}} energy
 * @property {string[][] | null} boardLayout
 * @property {Record<string, string> | null} terrainChanged
 * @property {number} revealTurns
 * @property {{turn: number, faction: string}[]} turnHistory
 * @property {string} message
 * @property {MoraleChange[]} lastMoraleChanges
 * @property {{cardId: string, type: 'play' | 'activate' | 'expire'} | null} lastCardAction
 * @property {BaseState[]} bases
 * @property {string[]} lastStatusMessages
 * @property {TurnLog[]} actionLogs
 * @property {ActionLog | null} lastActionLog
 * @property {Record<string, import('../utils/gameLogic').TileEffect>} tileEffects
 * @property {{red: Record<string, number>, blue: Record<string, number>}} drawHistory
 * @property {{red: number, blue: number}} pityCounter
 * @property {{red: RevealedArea[], blue: RevealedArea[]}} revealedAreas
 * @property {{red: EnemyMarker[], blue: EnemyMarker[]}} enemyMarkers
 * @property {boolean} fogOfWarEnabled
 * @property {RoundSnapshot[]} roundSnapshots
 * @property {{red: number, blue: number}} turnDamageDealt
 * @property {{red: number, blue: number}} turnCardsUsed
 * @property {{red: number, blue: number}} killCounts
 * @property {import('../utils/gameLogic').ScoreSettlementResult | null} scoreSettlement
 */

/**
 * @typedef {object} MoraleChange
 * @property {string} unitId
 * @property {string} unitName
 * @property {string} faction
 * @property {number} before
 * @property {number} after
 * @property {number} delta
 * @property {string} reason
 */

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
 * @typedef {keyof typeof unitConfig} UnitType
 * @typedef {keyof typeof initialUnits} FactionKey
 */

/**
 * @param {number} currentExp
 * @param {number} currentLevel
 * @returns {{ newLevel: number; newExp: number; gainedPoints: number }}
 */
function checkLevelUp(currentExp, currentLevel) {
  const thresholds = gameRules.experience.levelThresholds;
  const maxLevel = gameRules.experience.maxLevel;
  let newLevel = currentLevel;
  let gainedPoints = 0;

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (currentExp >= thresholds[i] && (i + 1) > currentLevel) {
      const levelsGained = (i + 1) - currentLevel;
      newLevel = i + 1;
      gainedPoints = levelsGained * gameRules.experience.statPointsPerLevel;
      break;
    }
  }

  if (newLevel > maxLevel) {
    newLevel = maxLevel;
  }

  return { newLevel, newExp: currentExp, gainedPoints };
}

/**
 * @param {Unit} unit
 * @param {number} xpAmount
 * @param {string} reason
 * @returns {{ unit: Unit; leveledUp: boolean; oldLevel: number; newLevel: number; gainedPoints: number }}
 */
function grantXPToUnit(unit, xpAmount, reason) {
  if (!xpAmount || xpAmount <= 0) return { unit, leveledUp: false, oldLevel: unit.level || 1, newLevel: unit.level || 1, gainedPoints: 0 };

  const oldLevel = unit.level || 1;
  const newExp = (unit.exp || 0) + xpAmount;
  const result = checkLevelUp(newExp, oldLevel);

  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  const growth = gameRules.experience.statGrowth;
  const hpBonus = allocatedStats.hp * growth.hp;
  const specConfig = unit.specialization ? SPECIALIZATION_CONFIG[unit.type]?.find(s => s.id === unit.specialization) : null;
  const specHpBonus = /** @type {number} */ (/** @type {any} */ (specConfig?.bonuses)?.hp) || 0;

  let updatedMaxHp = unitConfig[/** @type {UnitType} */ (unit.type)].hp + hpBonus + specHpBonus;
  let updatedCurrentHp = unit.currentHp;

  if (result.newLevel > oldLevel) {
    const levelDiff = result.newLevel - oldLevel;
    updatedCurrentHp = Math.min(updatedCurrentHp + levelDiff * 5, updatedMaxHp);
  }

  return {
    unit: {
      ...unit,
      exp: newExp,
      level: result.newLevel,
      statPoints: (unit.statPoints || 0) + result.gainedPoints,
      maxHp: updatedMaxHp,
      currentHp: updatedCurrentHp
    },
    leveledUp: result.newLevel > oldLevel,
    oldLevel,
    newLevel: result.newLevel,
    gainedPoints: result.gainedPoints
  };
}

/**
 * @returns {BaseState[]}
 */
function createInitialBases() {
  /** @type {BaseState[]} */
  const bases = [];
  for (let y = 0; y < boardConfig.height; y++) {
    for (let x = 0; x < boardConfig.width; x++) {
      const terrainType = /** @type {keyof typeof boardConfig.terrain} */ (boardConfig.layout[y][x]);
      /** @type {any} */
      const terrain = boardConfig.terrain[terrainType];
      if (terrain && terrain.isBase && terrain.faction) {
        bases.push({
          faction: terrain.faction,
          x,
          y,
          durability: terrain.maxDurability || 100,
          maxDurability: terrain.maxDurability || 100,
          captureProgress: 0,
          capturingFaction: '',
          repairPerTurn: terrain.repairPerTurn || 5
        });
      }
    }
  }
  return bases;
}

/**
 * @returns {GameState}
 */
function createInitialState() {
  let unitId = 0;
  /** @type {Unit[]} */
  const units = [];

  /** @type {FactionKey[]} */
  const factions = ['red', 'blue'];
  for (const faction of factions) {
    for (const unitDef of initialUnits[faction]) {
      const config = unitConfig[unitDef.type];
      const baseHp = config.hp;
      units.push({
        id: `unit_${unitId++}`,
        type: unitDef.type,
        faction,
        x: unitDef.x,
        y: unitDef.y,
        currentHp: baseHp,
        maxHp: baseHp,
        hasMoved: false,
        hasAttacked: false,
        attackCount: 0,
        buffs: [],
        stunned: 0,
        morale: gameRules.morale.initial,
        winStreak: 0,
        statusEffects: [],
        persistentId: `${faction}_${unitDef.type}_${unitDef.x}_${unitDef.y}`,
        exp: 0,
        level: 1,
        statPoints: 0,
        allocatedStats: { atk: 0, def: 0, hp: 0, move: 0 },
        specialization: null
      });
    }
  }

  /** @type {{red: EventCard[], blue: EventCard[]}} */
  const hands = { red: [], blue: [] };

  /** @type {{red: CooldownEntry[], blue: CooldownEntry[]}} */
  const cooldowns = { red: [], blue: [] };

  /** @type {{red: number, blue: number}} */
  const energy = {
    red: cardConfig.initialEnergy,
    blue: cardConfig.initialEnergy
  };

  const bases = createInitialBases();

  return {
    units,
    currentFaction: 'red',
    turn: 1,
    selectedUnitId: null,
    selectedCardId: null,
    gamePhase: 'idle',
    gameOver: false,
    winner: null,
    victoryCondition: null,
    hands,
    cooldowns,
    energy,
    boardLayout: null,
    terrainChanged: null,
    revealTurns: 0,
    turnHistory: [],
    message: '游戏开始！红方先行动',
    lastMoraleChanges: [],
    lastCardAction: null,
    bases,
    lastStatusMessages: [],
    actionLogs: [{
      turn: 1,
      faction: 'red',
      actions: [{
        id: `log_${Date.now()}_init`,
        turn: 1,
        faction: 'red',
        type: 'turn',
        description: '游戏开始！红方先行动',
        details: {},
        timestamp: Date.now()
      }]
    }],
    lastActionLog: null,
    tileEffects: {},
    drawHistory: { red: {}, blue: {} },
    pityCounter: { red: 0, blue: 0 },
    revealedAreas: { red: [], blue: [] },
    enemyMarkers: { red: [], blue: [] },
    fogOfWarEnabled: true,
    roundSnapshots: [],
    turnDamageDealt: { red: 0, blue: 0 },
    turnCardsUsed: { red: 0, blue: 0 },
    killCounts: { red: 0, blue: 0 },
    scoreSettlement: null
  };
}

function createGameState() {
  const { subscribe, set, update } = writable(createInitialState());

  let autoSaveEnabled = false;

  function enableAutoSave() {
    autoSaveEnabled = true;
  }

  function disableAutoSave() {
    autoSaveEnabled = false;
    cancelPendingAutoSave();
  }

  subscribe(state => {
    if (autoSaveEnabled && state && !state.gameOver) {
      debouncedAutoSave(state);
    }
  });

  /**
   * @param {{ type: ActionLogType; description: string; details?: object; factionOverride?: string; unitId?: string }} logData
   */
  const addActionLog = (logData) => update(state => {
    const { type, description, details, factionOverride, unitId } = logData;

    let faction = state.currentFaction;
    if (factionOverride) {
      faction = factionOverride;
    } else if (unitId) {
      const unit = state.units.find(u => u.id === unitId);
      if (unit) faction = unit.faction;
    }

    /** @type {ActionLog} */
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      turn: state.turn,
      faction,
      type,
      description,
      details: details || {},
      timestamp: Date.now()
    };

    const currentTurnKey = `${state.turn}_${faction}`;
    const lastTurnLog = state.actionLogs[state.actionLogs.length - 1];

    let newActionLogs = [...state.actionLogs];
    if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === faction) {
      newActionLogs[newActionLogs.length - 1] = {
        ...lastTurnLog,
        actions: [...lastTurnLog.actions, newLog]
      };
    } else {
      newActionLogs.push({
        turn: state.turn,
        faction,
        actions: [newLog]
      });
    }

    return {
      ...state,
      actionLogs: newActionLogs,
      lastActionLog: newLog
    };
  });

  return {
    subscribe,
    set,
    update,
    reset: () => {
      disableAutoSave();
      cancelPendingAutoSave();
      set(createInitialState());
    },
    loadFromSave: (/** @type {GameState} */ savedState) => {
      disableAutoSave();
      cancelPendingAutoSave();
      set(savedState);
    },
    enableAutoSave,
    disableAutoSave,
    addActionLog,
    /**
     * @param {string | null} unitId
     */
    selectUnit: (unitId) => update(state => ({
      ...state,
      selectedUnitId: unitId,
      selectedCardId: null,
      gamePhase: unitId ? 'unitSelected' : 'idle'
    })),
    /**
     * @param {string | null} cardId
     */
    selectCard: (cardId) => update(state => ({
      ...state,
      selectedCardId: cardId,
      gamePhase: cardId ? 'cardSelected' : 'idle'
    })),
    /**
     * @param {string} unitId
     * @param {number} x
     * @param {number} y
     * @param {{x: number, y: number, cost: number}[]} path
     */
    moveUnit: (unitId, x, y, path) => update(state => {
      const unit = state.units.find(u => u.id === unitId);
      const pathLength = path && path.length > 0 ? path.length : Math.abs(x - (unit?.x || 0)) + Math.abs(y - (unit?.y || 0));
      const bleedDmg = unit ? calculateBleedDamage(unit, pathLength) : 0;
      const fromX = unit?.x ?? 0;
      const fromY = unit?.y ?? 0;
      const unitName = unit ? unitConfig[/** @type {UnitType} */ (unit.type)].name : '';
      const unitFaction = unit?.faction || state.currentFaction;
      const unitType = unit ? /** @type {UnitType} */ (unit.type) : 'infantry';
      const moveSkill = unit ? getMoveSkillForUnit(unit, unitType) : MOVE_SKILL_TYPES.PENETRATE;
      const skillInfo = MOVE_SKILL_INFO[moveSkill];

      const passedThroughFriendly = unit
        ? didPathPassThroughFriendly(path || [], state.units, unit.faction, moveSkill)
        : false;

      /** @type {{type: string, duration: number, value: number}[]} */
      const moveSkillBuffs = [];

      if (unit && moveSkill === MOVE_SKILL_TYPES.CHARGE) {
        const chargeBonus = getChargePostMoveBonus({ ...unit, hasMoved: true }, unitType);
        if (chargeBonus.attackBonus > 0) {
          moveSkillBuffs.push({
            type: 'attackBoost',
            duration: chargeBonus.duration,
            value: chargeBonus.attackBonus
          });
        }
      }

      if (passedThroughFriendly && moveSkill === MOVE_SKILL_TYPES.PENETRATE) {
        const penetrateInfo = MOVE_SKILL_INFO[MOVE_SKILL_TYPES.PENETRATE];
        moveSkillBuffs.push({
          type: 'defenseBoost',
          duration: penetrateInfo.postPenetrateDefenseBuffDuration || 1,
          value: penetrateInfo.postPenetrateDefenseBonus || 0
        });
      }

      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          let newHp = u.currentHp;
          if (bleedDmg > 0) {
            newHp = Math.max(0, u.currentHp - bleedDmg);
          }
          let newBuffs = [...(u.buffs || [])];
          for (const buff of moveSkillBuffs) {
            newBuffs = newBuffs.filter(b => b.type !== buff.type);
            newBuffs.push(buff);
          }
          return { ...u, x, y, hasMoved: true, path, currentHp: newHp, buffs: newBuffs };
        }
        return u;
      });

      /** @type {string[]} */
      const statusMsgs = [];
      if (bleedDmg > 0 && unit) {
        const uName = unitConfig[/** @type {UnitType} */ (unit.type)].name;
        const fName = unit.faction === 'red' ? '红方' : '蓝方';
        statusMsgs.push(`${fName}${uName} 移动流血损失 ${bleedDmg} 生命`);
      }

      if (moveSkillBuffs.length > 0 && unit) {
        const fName = unit.faction === 'red' ? '红方' : '蓝方';
        for (const buff of moveSkillBuffs) {
          if (buff.type === 'attackBoost') {
            statusMsgs.push(`${fName}${unitName}【冲锋】攻击+${Math.round(buff.value * 100)}%，持续${buff.duration}回合`);
          } else if (buff.type === 'defenseBoost') {
            statusMsgs.push(`${fName}${unitName}【穿插】防御+${Math.round(buff.value * 100)}%，持续${buff.duration}回合`);
          }
        }
      }

      const filteredUnits = units.filter(u => u.currentHp > 0);

      const factionName = unitFaction === 'red' ? '红方' : '蓝方';
      const skillTag = skillInfo ? `【${skillInfo.name}】` : '';
      const moveDesc = `${factionName}${unitName}${skillTag} 从 (${fromX},${fromY}) 移动到 (${x},${y})` +
        (bleedDmg > 0 ? `，流血损失 ${bleedDmg} 生命` : '');

      const moveLog = {
        id: `log_${Date.now()}_move_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: unitFaction,
        type: /** @type {ActionLogType} */ ('move'),
        description: moveDesc,
        details: {
          unitId,
          unitName,
          unitType: unit?.type,
          from: { x: fromX, y: fromY },
          to: { x, y },
          path: path || [],
          pathLength,
          bleedDamage: bleedDmg,
          moveSkill,
          passedThroughFriendly
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unitFaction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, moveLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: unitFaction,
          actions: [moveLog]
        });
      }

      const enemyFaction = unitFaction === 'red' ? 'blue' : 'red';
      const updatedMarkers = {
        red: [...state.enemyMarkers.red],
        blue: [...state.enemyMarkers.blue]
      };
      const markerIndex = updatedMarkers[enemyFaction].findIndex(m => m.unitId === unitId);
      if (markerIndex >= 0) {
        updatedMarkers[enemyFaction][markerIndex] = {
          ...updatedMarkers[enemyFaction][markerIndex],
          x,
          y
        };
      }

      return {
        ...state,
        units: filteredUnits,
        selectedUnitId: unitId,
        gamePhase: 'unitMoved',
        lastStatusMessages: statusMsgs,
        actionLogs: newActionLogs,
        lastActionLog: moveLog,
        enemyMarkers: updatedMarkers
      };
    }),
    /**
     * @param {string} attackerId
     * @param {string} defenderId
     * @param {number} damage
     */
    attack: (attackerId, defenderId, damage) => update(state => {
      const attacker = state.units.find(/** @param {Unit} u */ u => u.id === attackerId);
      const defender = state.units.find(/** @param {Unit} u */ u => u.id === defenderId);
      const hasDoubleAttack = attacker?.buffs?.some(
        /** @param {any} b */ b => b.type === 'doubleAttack'
      );
      const attackerName = attacker ? unitConfig[/** @type {UnitType} */ (attacker.type)].name : '';
      const defenderName = defender ? unitConfig[/** @type {UnitType} */ (defender.type)].name : '';
      const attackerFaction = attacker?.faction || state.currentFaction;
      const defenderFaction = defender?.faction || '';
      const hasShield = defender?.buffs?.some(/** @param {any} b */ b => b.type === 'shield');
      const finalDamage = hasShield ? 0 : damage;

      const layout = state.boardLayout || null;
      const atkTerrain = attacker ? getTerrain(attacker.x, attacker.y, layout) : null;
      const defTerrain = defender ? getTerrain(defender.x, defender.y, layout) : null;

      const preview = (attacker && defender)
        ? calculateCombatPreview(attacker, defender, defTerrain || undefined, atkTerrain || undefined)
        : null;

      let counterDamage = 0;
      let counterShieldBlocked = false;
      if (preview && preview.willCounter) {
        counterDamage = preview.counterDamage;
        counterShieldBlocked = attacker?.buffs?.some(/** @param {any} b */ b => b.type === 'shield') || false;
        if (counterShieldBlocked) {
          counterDamage = 0;
        }
      }

      /** @type {MoraleChange[]} */
      const moraleChanges = [];

      const clampMorale = (/** @type {number} */ v) =>
        Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, v));

      let updatedUnits = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === attackerId) {
          let updated = u;
          if (u.attackCount !== undefined) {
            const newCount = u.attackCount + 1;
            if (hasDoubleAttack && newCount < 2) {
              updated = { ...u, attackCount: newCount };
            } else {
              updated = { ...u, hasAttacked: true, attackCount: 0 };
            }
          } else {
            if (hasDoubleAttack) {
              updated = { ...u, attackCount: 1 };
            } else {
              updated = { ...u, hasAttacked: true };
            }
          }

          if (counterDamage > 0 && !counterShieldBlocked) {
            const newHp = Math.max(0, updated.currentHp - counterDamage);
            updated = { ...updated, currentHp: newHp };
          } else if (counterShieldBlocked) {
            const newBuffs = (updated.buffs || []).filter(/** @param {any} b */ b => b.type !== 'shield');
            updated = { ...updated, buffs: newBuffs };
          }

          return updated;
        }
        if (u.id === defenderId) {
          const hasShieldLocal = u.buffs?.some(/** @param {any} b */ b => b.type === 'shield');
          const finalDamageLocal = hasShieldLocal ? 0 : damage;
          const newHp = Math.max(0, u.currentHp - finalDamageLocal);
          const newBuffs = hasShieldLocal
            ? (u.buffs || []).filter(/** @param {any} b */ b => b.type !== 'shield')
            : u.buffs;
          return { ...u, currentHp: newHp, buffs: newBuffs };
        }
        return u;
      });

      const updatedDefender = updatedUnits.find(/** @param {Unit} u */ u => u.id === defenderId);
      const defenderDead = updatedDefender && updatedDefender.currentHp <= 0;
      const updatedAttacker = updatedUnits.find(/** @param {Unit} u */ u => u.id === attackerId);
      const attackerDeadFromCounter = updatedAttacker && updatedAttacker.currentHp <= 0;

      if (defenderDead && attacker && defenderFaction) {
        updatedUnits = updatedUnits.map(/** @param {Unit} u */ u => {
          if (u.id === attackerId) {
            const before = u.morale;
            const newStreak = (u.winStreak || 0) + 1;
            let delta = gameRules.morale.onKill;
            if (newStreak >= gameRules.morale.winStreakThreshold) {
              delta += gameRules.morale.winStreakBonus;
            }
            const after = clampMorale(before + delta);
            moraleChanges.push({
              unitId: u.id,
              unitName: attackerName,
              faction: u.faction,
              before,
              after,
              delta: after - before,
              reason: newStreak >= gameRules.morale.winStreakThreshold
                ? `击杀+连胜(${newStreak}连杀)`
                : `击杀敌军`
            });
            return { ...u, morale: after, winStreak: newStreak };
          }
          if (u.faction === defenderFaction && u.id !== defenderId) {
            const before = u.morale;
            const delta = -gameRules.morale.onAllyDeath;
            const after = clampMorale(before + delta);
            moraleChanges.push({
              unitId: u.id,
              unitName: unitConfig[/** @type {UnitType} */ (u.type)].name,
              faction: u.faction,
              before,
              after,
              delta: after - before,
              reason: `友军阵亡(${defenderName})`
            });
            return { ...u, morale: after, winStreak: 0 };
          }
          return u;
        });
      } else if (attacker && attackerFaction) {
        updatedUnits = updatedUnits.map(/** @param {Unit} u */ u => {
          if (u.id === attackerId) {
            return { ...u, winStreak: 0 };
          }
          return u;
        });
      }

      if (attackerDeadFromCounter && defender && attackerFaction) {
        const survivingDefender = updatedUnits.find(/** @param {Unit} u */ u => u.id === defenderId);
        if (survivingDefender && !defenderDead) {
          updatedUnits = updatedUnits.map(/** @param {Unit} u */ u => {
            if (u.id === defenderId) {
              const before = u.morale;
              const newStreak = (u.winStreak || 0) + 1;
              let delta = gameRules.morale.onKill;
              if (newStreak >= gameRules.morale.winStreakThreshold) {
                delta += gameRules.morale.winStreakBonus;
              }
              const after = clampMorale(before + delta);
              moraleChanges.push({
                unitId: u.id,
                unitName: defenderName,
                faction: u.faction,
                before,
                after,
                delta: after - before,
                reason: newStreak >= gameRules.morale.winStreakThreshold
                  ? `反击击杀+连胜(${newStreak}连杀)`
                  : `反击击杀`
              });
              return { ...u, morale: after, winStreak: newStreak };
            }
            if (u.faction === attackerFaction && u.id !== attackerId) {
              const before = u.morale;
              const delta = -gameRules.morale.onAllyDeath;
              const after = clampMorale(before + delta);
              moraleChanges.push({
                unitId: u.id,
                unitName: unitConfig[/** @type {UnitType} */ (u.type)].name,
                faction: u.faction,
                before,
                after,
                delta: after - before,
                reason: `友军阵亡(${attackerName})`
              });
              return { ...u, morale: after, winStreak: 0 };
            }
            return u;
          });
        }
      }

      updatedUnits = updatedUnits.filter(/** @param {Unit} u */ u => u.currentHp > 0);

      const atkFactionName = attackerFaction === 'red' ? '红方' : '蓝方';
      const defFactionName = defenderFaction === 'red' ? '红方' : '蓝方';
      const killTag = defenderDead ? '【击杀！】' : '';
      const shieldTag = hasShield ? '（护盾抵消）' : '';
      const counterShieldTag = counterShieldBlocked ? '（护盾抵消反击）' : '';
      const counterKillTag = attackerDeadFromCounter ? '【反击击杀！】' : '';
      const counterTag = counterDamage > 0 || counterShieldBlocked
        ? `；${defFactionName}${defenderName}反击造成${counterShieldBlocked ? 0 : counterDamage}伤害${counterShieldTag}${counterKillTag}`
        : '';
      const attackDesc = `${atkFactionName}${attackerName} 攻击 ${defFactionName}${defenderName}，造成 ${finalDamage} 伤害${shieldTag}${killTag}${counterTag}`;

      const attackLog = {
        id: `log_${Date.now()}_atk_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: attackerFaction,
        type: /** @type {ActionLogType} */ ('attack'),
        description: attackDesc,
        details: {
          attackerId,
          defenderId,
          attackerName,
          defenderName,
          attackerType: attacker?.type,
          defenderType: defender?.type,
          rawDamage: damage,
          finalDamage,
          attackerPosition: attacker ? { x: attacker.x, y: attacker.y } : null,
          defenderPosition: defender ? { x: defender.x, y: defender.y } : null,
          shieldBlocked: hasShield,
          defenderDead,
          defenderRemainingHp: updatedDefender?.currentHp || 0,
          counterDamage: counterShieldBlocked ? 0 : counterDamage,
          counterShieldBlocked,
          attackerDeadFromCounter,
          attackerRemainingHp: updatedAttacker?.currentHp || 0
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === attackerFaction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, attackLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: attackerFaction,
          actions: [attackLog]
        });
      }

      if (moraleChanges.length > 0) {
        const moraleDesc = moraleChanges.map(m => {
          const sign = m.delta > 0 ? '+' : '';
          const fName = m.faction === 'red' ? '红方' : '蓝方';
          return `${fName}${m.unitName}${sign}${m.delta}士气(${m.reason})`;
        }).join('；');
        const moraleLog = {
          id: `log_${Date.now()}_morale_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: state.currentFaction,
          type: /** @type {ActionLogType} */ ('morale'),
          description: moraleDesc,
          details: { moraleChanges },
          timestamp: Date.now()
        };
        const lastLog = newActionLogs[newActionLogs.length - 1];
        if (lastLog && lastLog.turn === state.turn && lastLog.faction === state.currentFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastLog,
            actions: [...lastLog.actions, moraleLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: state.currentFaction,
            actions: [moraleLog]
          });
        }
      }

      /** @type {string[]} */
      const xpMsgs = [];
      if (attacker && !attackerDeadFromCounter) {
        const atkXp = gameRules.experience.onAttack + (defenderDead ? gameRules.experience.onKill : 0);
        const atkResult = grantXPToUnit(updatedUnits.find(u => u.id === attackerId) || updatedUnits[0], atkXp, defenderDead ? '攻击+击杀' : '攻击');
        updatedUnits = updatedUnits.map(u => u.id === attackerId ? atkResult.unit : u);
        if (atkResult.leveledUp) {
          const fName = attackerFaction === 'red' ? '红方' : '蓝方';
          xpMsgs.push(`${fName}${attackerName} 升级！Lv.${atkResult.oldLevel}→Lv.${atkResult.newLevel}，获得${atkResult.gainedPoints}属性点`);
        }
      }
      if (defender && !defenderDead && attackerDeadFromCounter) {
        const defXp = gameRules.experience.onAttack + gameRules.experience.onKill;
        const defResult = grantXPToUnit(updatedUnits.find(u => u.id === defenderId) || updatedUnits[0], defXp, '反击击杀');
        updatedUnits = updatedUnits.map(u => u.id === defenderId ? defResult.unit : u);
        if (defResult.leveledUp) {
          const fName = defenderFaction === 'red' ? '红方' : '蓝方';
          xpMsgs.push(`${fName}${defenderName} 升级！Lv.${defResult.oldLevel}→Lv.${defResult.newLevel}，获得${defResult.gainedPoints}属性点`);
        }
      }

      if (xpMsgs.length > 0) {
        const xpLog = {
          id: `log_${Date.now()}_xp_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: state.currentFaction,
          type: /** @type {ActionLogType} */ ('status'),
          description: xpMsgs.join('；'),
          details: { xpMessages: xpMsgs },
          timestamp: Date.now()
        };
        const lastLog = newActionLogs[newActionLogs.length - 1];
        if (lastLog && lastLog.turn === state.turn && lastLog.faction === state.currentFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastLog,
            actions: [...lastLog.actions, xpLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: state.currentFaction,
            actions: [xpLog]
          });
        }
      }

      const markersAfterDeath = {
        red: state.enemyMarkers.red.filter(m => 
          updatedUnits.some(u => u.id === m.unitId)
        ),
        blue: state.enemyMarkers.blue.filter(m => 
          updatedUnits.some(u => u.id === m.unitId)
        )
      };

      /** @type {{red: number, blue: number}} */
      const newKillCounts = { ...state.killCounts };
      if (defenderDead) {
        newKillCounts[/** @type {'red' | 'blue'} */ (attackerFaction)] = (newKillCounts[/** @type {'red' | 'blue'} */ (attackerFaction)] || 0) + 1;
      }
      if (attackerDeadFromCounter) {
        newKillCounts[/** @type {'red' | 'blue'} */ (defenderFaction)] = (newKillCounts[/** @type {'red' | 'blue'} */ (defenderFaction)] || 0) + 1;
      }

      return {
        ...state,
        units: updatedUnits,
        selectedUnitId: attackerId,
        gamePhase: 'idle',
        lastMoraleChanges: moraleChanges,
        actionLogs: newActionLogs,
        lastActionLog: attackLog,
        enemyMarkers: markersAfterDeath,
        turnDamageDealt: {
          red: state.turnDamageDealt.red + (attackerFaction === 'red' ? finalDamage : 0) + (counterDamage > 0 && !counterShieldBlocked && defenderFaction === 'red' ? counterDamage : 0),
          blue: state.turnDamageDealt.blue + (attackerFaction === 'blue' ? finalDamage : 0) + (counterDamage > 0 && !counterShieldBlocked && defenderFaction === 'blue' ? counterDamage : 0)
        },
        killCounts: newKillCounts
      };
    }),
    endTurn: () => update(state => {
      /** @type {'red' | 'blue'} */
      const nextFaction = state.currentFaction === 'red' ? 'blue' : 'red';
      const newTurn = nextFaction === 'red' ? state.turn + 1 : state.turn;
      const currentFactionName = state.currentFaction === 'red' ? '红方' : '蓝方';
      const nextFactionName = nextFaction === 'red' ? '红方' : '蓝方';

      /** @type {string[]} */
      const statusMessages = [];
      /** @type {MoraleChange[]} */
      const moraleChanges = [];
      const clampMorale = (/** @type {number} */ v) =>
        Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, v));

      let dotKilled = false;

      let units = state.units.map(/** @param {Unit} u */ u => {
        const unitType = /** @type {UnitType} */ (u.type);
        const factionName = u.faction === 'red' ? '红方' : '蓝方';

        const dotResult = processTickStatusEffects(u, factionName, unitType);
        if (dotResult.damage > 0) {
          statusMessages.push(...dotResult.messages);
        }

        const newBuffs = (u.buffs || [])
          .filter(/** @param {any} b */ b => b.duration > 1)
          .map(/** @param {any} b */ b => ({ ...b, duration: b.duration - 1 }));

        const newStatusEffects = tickStatusEffects(u);

        const flags = getStatusFlags({ ...u, statusEffects: newStatusEffects });
        const isCC = flags.stunned > 0 || flags.frozen;

        const newHp = Math.max(0, u.currentHp - dotResult.damage);

        const isHaltUnit = getMoveSkillForUnit(u, unitType) === MOVE_SKILL_TYPES.HALT;
        const willBeStationary = u.faction === nextFaction && !isCC;
        let finalBuffs = newBuffs;
        if (isHaltUnit && willBeStationary) {
          const haltBonus = getHaltStationaryBonus({ ...u, hasMoved: false }, unitType);
          if (haltBonus.defenseBonus > 0) {
            finalBuffs = finalBuffs.filter(b => b.type !== 'haltDefense');
            finalBuffs.push({ type: 'haltDefense', duration: 1, value: haltBonus.defenseBonus });
          }
        }

        return {
          ...u,
          hasMoved: isCC ? true : false,
          hasAttacked: isCC ? true : false,
          attackCount: 0,
          buffs: finalBuffs,
          stunned: flags.stunned > 0 && flags.stunned < 900 ? flags.stunned - 1 : 0,
          statusEffects: newStatusEffects,
          currentHp: newHp
        };
      });

      units = units.filter(u => {
        if (u.currentHp <= 0) {
          const unitName = unitConfig[/** @type {UnitType} */ (u.type)].name;
          const factionName = u.faction === 'red' ? '红方' : '蓝方';
          statusMessages.push(`${factionName}${unitName} 因持续伤害阵亡`);
          dotKilled = true;

          const allyFaction = u.faction;
          moraleChanges.push(...units
            .filter(x => x.faction === allyFaction && x.id !== u.id && x.currentHp > 0)
            .map(x => {
              const before = x.morale;
              const delta = -gameRules.morale.onAllyDeath;
              const after = clampMorale(before + delta);
              return {
                unitId: x.id,
                unitName: unitConfig[/** @type {UnitType} */ (x.type)].name,
                faction: x.faction,
                before,
                after,
                delta: after - before,
                reason: `友军${unitName}因持续伤害阵亡`
              };
            })
          );
          return false;
        }
        return true;
      });

      units = units.map(u => {
        const mc = moraleChanges.find(m => m.unitId === u.id);
        if (mc) {
          return { ...u, morale: mc.after, winStreak: 0 };
        }
        return u;
      });

      const synergyResult = calculateAllSynergies(units, nextFaction);
      if (synergyResult.allBuffs.length > 0) {
        units = units.map(u => {
          const synergyBuff = synergyResult.allBuffs.find(b => b.unitId === u.id);
          if (synergyBuff) {
            const existingBuffs = u.buffs || [];
            const filteredBuffs = existingBuffs.filter(b => b.type !== synergyBuff.buff.type);
            return { ...u, buffs: [...filteredBuffs, synergyBuff.buff] };
          }
          return u;
        });
        statusMessages.push(...synergyResult.messages);
      }

      const tileEffectResults = processTileEffectsOnUnits(units, state.tileEffects);
      if (tileEffectResults.length > 0) {
        /** @type {{unitId: string, statusType: string, duration: number, value?: number}[]} */
        const tileStatusQueue = [];
        const tileDamageMap = new Map();
        for (const result of tileEffectResults) {
          tileDamageMap.set(result.unitId, result.damage);
          if (result.damage > 0 || result.messages.length > 0) {
            statusMessages.push(...result.messages);
          }
          if (result.statusApplications.length > 0) {
            tileStatusQueue.push(...result.statusApplications);
          }
        }
        units = units.map(u => {
          const dmg = tileDamageMap.get(u.id) || 0;
          if (dmg > 0) {
            return { ...u, currentHp: Math.max(0, u.currentHp - dmg) };
          }
          return u;
        });
        for (const sa of tileStatusQueue) {
          const target = units.find(u => u.id === sa.unitId);
          if (target) {
            const unitType = /** @type {UnitType} */ (target.type);
            const checkResult = checkStatusApplication(target, sa.statusType, sa.duration, unitType);
            if (checkResult.applied) {
              units = units.map(u => {
                if (u.id === sa.unitId) {
                  const newEffects = [...(u.statusEffects || []).filter(s => s.type !== sa.statusType), {
                    type: sa.statusType,
                    duration: checkResult.duration,
                    value: sa.value,
                    id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
                  }];
                  return { ...u, statusEffects: newEffects };
                }
                return u;
              });
            }
          }
        }
        units = units.filter(u => {
          if (u.currentHp <= 0) {
            const unitName = unitConfig[/** @type {UnitType} */ (u.type)].name;
            const factionName = u.faction === 'red' ? '红方' : '蓝方';
            statusMessages.push(`${factionName}${unitName} 因地形效果阵亡`);
            dotKilled = true;
            moraleChanges.push(...units
              .filter(x => x.faction === u.faction && x.id !== u.id && x.currentHp > 0)
              .map(x => {
                const before = x.morale;
                const delta = -gameRules.morale.onAllyDeath;
                const after = clampMorale(before + delta);
                return {
                  unitId: x.id,
                  unitName: unitConfig[/** @type {UnitType} */ (x.type)].name,
                  faction: x.faction,
                  before,
                  after,
                  delta: after - before,
                  reason: `友军${unitName}因地形效果阵亡`
                };
              })
            );
            return false;
          }
          return true;
        });
      }

      const newTileEffects = tickTileEffectsLogic(state.tileEffects);

      let newRevealTurns = state.revealTurns ? state.revealTurns - 1 : 0;
      if (nextFaction === state.currentFaction) {
        newRevealTurns = state.revealTurns ? state.revealTurns : 0;
      }

      const tickedRevealedAreas = {
        red: state.revealedAreas.red.map(area => ({
          ...area,
          remainingTurns: area.remainingTurns - 1
        })).filter(area => area.remainingTurns > 0),
        blue: state.revealedAreas.blue.map(area => ({
          ...area,
          remainingTurns: area.remainingTurns - 1
        })).filter(area => area.remainingTurns > 0)
      };

      const tickedMarkers = {
        red: state.enemyMarkers.red.map(marker => ({
          ...marker,
          remainingTurns: marker.remainingTurns - 1
        })).filter(marker => marker.remainingTurns > 0),
        blue: state.enemyMarkers.blue.map(marker => ({
          ...marker,
          remainingTurns: marker.remainingTurns - 1
        })).filter(marker => marker.remainingTurns > 0)
      };

      const currentHand = state.hands[nextFaction];
      const tickResult = tickActiveCards(currentHand);

      const nextHands = {
        red: nextFaction === 'red' ? tickResult.hand : state.hands.red,
        blue: nextFaction === 'blue' ? tickResult.hand : state.hands.blue
      };

      const nextCooldowns = {
        red: nextFaction === 'red' ? tickCooldowns(state.cooldowns.red) : state.cooldowns.red,
        blue: nextFaction === 'blue' ? tickCooldowns(state.cooldowns.blue) : state.cooldowns.blue
      };

      const nextEnergy = {
        red: nextFaction === 'red' ? refillEnergy(state.energy.red) : state.energy.red,
        blue: nextFaction === 'blue' ? refillEnergy(state.energy.blue) : state.energy.blue
      };

      const newActionLogs = [...state.actionLogs];

      if (statusMessages.length > 0) {
        const statusLog = {
          id: `log_${Date.now()}_status_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: state.currentFaction,
          type: /** @type {ActionLogType} */ ('status'),
          description: statusMessages.join('；'),
          details: { messages: statusMessages },
          timestamp: Date.now()
        };
        const lastLog = newActionLogs[newActionLogs.length - 1];
        if (lastLog && lastLog.turn === state.turn && lastLog.faction === state.currentFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastLog,
            actions: [...lastLog.actions, statusLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: state.currentFaction,
            actions: [statusLog]
          });
        }
      }

      if (dotKilled && moraleChanges.length > 0) {
        const moraleDesc = moraleChanges.map(m => {
          const sign = m.delta > 0 ? '+' : '';
          const fName = m.faction === 'red' ? '红方' : '蓝方';
          return `${fName}${m.unitName}${sign}${m.delta}士气(${m.reason})`;
        }).join('；');
        const moraleLog = {
          id: `log_${Date.now()}_morale_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: state.currentFaction,
          type: /** @type {ActionLogType} */ ('morale'),
          description: moraleDesc,
          details: { moraleChanges },
          timestamp: Date.now()
        };
        const lastLog = newActionLogs[newActionLogs.length - 1];
        if (lastLog && lastLog.turn === state.turn && lastLog.faction === state.currentFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastLog,
            actions: [...lastLog.actions, moraleLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: state.currentFaction,
            actions: [moraleLog]
          });
        }
      }

      const turnEndDesc = `${currentFactionName}结束回合，轮到${nextFactionName}行动（第 ${newTurn} 回合）`;
      const turnEndLog = {
        id: `log_${Date.now()}_turn_${Math.random().toString(36).slice(2, 6)}`,
        turn: newTurn,
        faction: nextFaction,
        type: /** @type {ActionLogType} */ ('turn'),
        description: turnEndDesc,
        details: {
          previousFaction: state.currentFaction,
          nextFaction,
          previousTurn: state.turn,
          newTurn
        },
        timestamp: Date.now()
      };
      newActionLogs.push({
        turn: newTurn,
        faction: nextFaction,
        actions: [turnEndLog]
      });

      const surviveXp = gameRules.experience.onSurviveTurn;
      if (surviveXp > 0) {
        /** @type {string[]} */
        const surviveXpMsgs = [];
        units = units.map(u => {
          if (u.faction === state.currentFaction) {
            const result = grantXPToUnit(u, surviveXp, '存活');
            if (result.leveledUp) {
              const uName = unitConfig[/** @type {UnitType} */ (u.type)].name;
              const fName = u.faction === 'red' ? '红方' : '蓝方';
              surviveXpMsgs.push(`${fName}${uName} 升级！Lv.${result.oldLevel}→Lv.${result.newLevel}，获得${result.gainedPoints}属性点`);
            }
            return result.unit;
          }
          return u;
        });
        if (surviveXpMsgs.length > 0) {
          const xpLog = {
            id: `log_${Date.now()}_xp_${Math.random().toString(36).slice(2, 6)}`,
            turn: state.turn,
            faction: state.currentFaction,
            type: /** @type {ActionLogType} */ ('status'),
            description: surviveXpMsgs.join('；'),
            details: { xpMessages: surviveXpMsgs },
            timestamp: Date.now()
          };
          const lastLog = newActionLogs[newActionLogs.length - 1];
          if (lastLog && lastLog.turn === state.turn && lastLog.faction === state.currentFaction) {
            newActionLogs[newActionLogs.length - 1] = {
              ...lastLog,
              actions: [...lastLog.actions, xpLog]
            };
          } else {
            newActionLogs.push({
              turn: state.turn,
              faction: state.currentFaction,
              actions: [xpLog]
            });
          }
        }
      }

      const redAlive = units.filter(u => u.faction === 'red').length;
      const blueAlive = units.filter(u => u.faction === 'blue').length;

      const redBase = state.bases.find(b => b.faction === 'red');
      const blueBase = state.bases.find(b => b.faction === 'blue');

      /** @type {RoundSnapshot} */
      const snapshot = {
        turn: state.turn,
        faction: state.currentFaction,
        aliveCount: { red: redAlive, blue: blueAlive },
        totalDamageDealt: { ...state.turnDamageDealt },
        cardsUsed: { ...state.turnCardsUsed },
        baseDurability: {
          red: redBase ? redBase.durability : 0,
          blue: blueBase ? blueBase.durability : 0
        },
        baseCaptureProgress: {
          red: redBase ? redBase.captureProgress : 0,
          blue: blueBase ? blueBase.captureProgress : 0
        }
      };

      const timeoutResult = checkTimeoutVictory(newTurn, units, state.bases, state.killCounts);
      let isGameOver = false;
      let finalWinner = null;
      let finalCondition = null;
      let finalScoreSettlement = null;

      if (timeoutResult) {
        isGameOver = true;
        finalWinner = timeoutResult.winner;
        finalCondition = timeoutResult.condition;
        finalScoreSettlement = timeoutResult;

        if (timeoutResult.winner !== 'draw') {
          const winXp = gameRules.experience.onWin;
          if (winXp > 0) {
            units = units.map(u => {
              if (u.faction === timeoutResult.winner) {
                const result = grantXPToUnit(u, winXp, '超时胜利');
                return result.unit;
              }
              return u;
            });
          }
        }

        const timeoutLog = {
          id: `log_${Date.now()}_victory_${Math.random().toString(36).slice(2, 6)}`,
          turn: newTurn,
          faction: timeoutResult.winner === 'draw' ? nextFaction : timeoutResult.winner,
          type: /** @type {ActionLogType} */ ('victory'),
          description: timeoutResult.condition,
          details: {
            winner: timeoutResult.winner,
            condition: timeoutResult.condition,
            scores: timeoutResult.scores,
            scoreDiff: timeoutResult.scoreDiff
          },
          timestamp: Date.now()
        };
        const lastLog = newActionLogs[newActionLogs.length - 1];
        if (lastLog && lastLog.turn === newTurn && lastLog.faction === (timeoutResult.winner === 'draw' ? nextFaction : timeoutResult.winner)) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastLog,
            actions: [...lastLog.actions, timeoutLog]
          };
        } else {
          newActionLogs.push({
            turn: newTurn,
            faction: timeoutResult.winner === 'draw' ? nextFaction : timeoutResult.winner,
            actions: [timeoutLog]
          });
        }
      }

      return {
        ...state,
        currentFaction: nextFaction,
        turn: newTurn,
        units,
        selectedUnitId: null,
        selectedCardId: null,
        gamePhase: isGameOver ? 'gameOver' : 'idle',
        gameOver: isGameOver,
        winner: finalWinner,
        victoryCondition: finalCondition,
        scoreSettlement: finalScoreSettlement,
        hands: nextHands,
        cooldowns: nextCooldowns,
        energy: nextEnergy,
        revealTurns: newRevealTurns,
        revealedAreas: tickedRevealedAreas,
        enemyMarkers: tickedMarkers,
        turnHistory: [...state.turnHistory, { turn: state.turn, faction: state.currentFaction }],
        lastStatusMessages: statusMessages,
        lastMoraleChanges: dotKilled ? moraleChanges : state.lastMoraleChanges,
        actionLogs: newActionLogs,
        lastActionLog: isGameOver ? newActionLogs[newActionLogs.length - 1].actions[newActionLogs[newActionLogs.length - 1].actions.length - 1] : turnEndLog,
        tileEffects: newTileEffects,
        roundSnapshots: [...state.roundSnapshots, snapshot],
        turnDamageDealt: { red: 0, blue: 0 },
        turnCardsUsed: { red: 0, blue: 0 }
      };
    }),
    /**
     * @param {string} winner
     * @param {string} condition
     */
    setVictory: (winner, condition) => update(state => {
      const isDraw = winner === 'draw';
      const winnerName = isDraw ? '平局' : (winner === 'red' ? '红方' : '蓝方');
      const victoryDesc = isDraw ? condition : `${winnerName}胜利！${condition}`;

      const logFaction = isDraw ? state.currentFaction : winner;
      const victoryLog = {
        id: `log_${Date.now()}_victory_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: logFaction,
        type: /** @type {ActionLogType} */ ('victory'),
        description: victoryDesc,
        details: { winner, condition },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === logFaction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, victoryLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: logFaction,
          actions: [victoryLog]
        });
      }

      const winXp = gameRules.experience.onWin;
      let units = state.units;
      /** @type {string[]} */
      const winXpMsgs = [];
      if (!isDraw && winXp > 0) {
        units = units.map(u => {
          if (u.faction === winner) {
            const result = grantXPToUnit(u, winXp, '胜利');
            if (result.leveledUp) {
              const uName = unitConfig[/** @type {UnitType} */ (u.type)].name;
              const fName = u.faction === 'red' ? '红方' : '蓝方';
              winXpMsgs.push(`${fName}${uName} 升级！Lv.${result.oldLevel}→Lv.${result.newLevel}，获得${result.gainedPoints}属性点`);
            }
            return result.unit;
          }
          return u;
        });
        if (winXpMsgs.length > 0) {
          const xpLog = {
            id: `log_${Date.now()}_xp_${Math.random().toString(36).slice(2, 6)}`,
            turn: state.turn,
            faction: winner,
            type: /** @type {ActionLogType} */ ('status'),
            description: winXpMsgs.join('；'),
            details: { xpMessages: winXpMsgs },
            timestamp: Date.now()
          };
          const lastLog = newActionLogs[newActionLogs.length - 1];
          if (lastLog && lastLog.turn === state.turn && lastLog.faction === winner) {
            newActionLogs[newActionLogs.length - 1] = {
              ...lastLog,
              actions: [...lastLog.actions, xpLog]
            };
          } else {
            newActionLogs.push({
              turn: state.turn,
              faction: winner,
              actions: [xpLog]
            });
          }
        }
      }

      return {
        ...state,
        units,
        gameOver: true,
        winner,
        victoryCondition: condition,
        gamePhase: 'gameOver',
        actionLogs: newActionLogs,
        lastActionLog: victoryLog,
        scoreSettlement: isDraw ? calculateScoreSettlement(state.units, state.bases, state.killCounts) : state.scoreSettlement
      };
    }),
    /**
     * @param {'red' | 'blue'} faction
     * @param {EventCard} card
     */
    addCard: (faction, card) => update(state => {
      const hands = {
        red: [...state.hands.red],
        blue: [...state.hands.blue]
      };
      const drawHistory = {
        red: { ...state.drawHistory.red },
        blue: { ...state.drawHistory.blue }
      };
      const pityCounter = { ...state.pityCounter };
      if (hands[faction].length < cardConfig.maxHandSize) {
        hands[faction] = [...hands[faction], {
          ...card,
          instanceId: String(Date.now() + Math.random()),
          cardState: 'available',
          remainingDuration: 0,
          remainingCooldown: 0
        }];
        drawHistory[faction] = { ...drawHistory[faction] };
        drawHistory[faction][card.id] = (drawHistory[faction][card.id] || 0) + 1;
        if (card.rarity === 'rare' || card.rarity === 'limited') {
          pityCounter[faction] = 0;
        } else {
          pityCounter[faction] = (pityCounter[faction] || 0) + 1;
        }
      }
      return { ...state, hands, drawHistory, pityCounter };
    }),
    /**
     * @param {'red' | 'blue'} faction
     * @param {string} cardInstanceId
     * @param {number} cost
     * @param {string} cardId
     */
    useCard: (faction, cardInstanceId, cost, cardId) => update(state => {
      const hands = {
        red: [...state.hands.red],
        blue: [...state.hands.blue]
      };
      const usedCard = hands[faction].find(
        /** @param {EventCard} c */
        c => c.instanceId === cardInstanceId
      );

      if (!usedCard) {
        return state;
      }

      const newCooldowns = {
        red: [...state.cooldowns.red],
        blue: [...state.cooldowns.blue]
      };

      const isInstant = usedCard.category === 'instant';

      if (isInstant) {
        hands[faction] = hands[faction].filter(
          /** @param {EventCard} c */
          c => c.instanceId !== cardInstanceId
        );
        if (usedCard.cooldown > 0) {
          const existingCd = newCooldowns[faction].find(c => c.cardId === cardId);
          if (existingCd) {
            existingCd.remainingCooldown = Math.max(existingCd.remainingCooldown, usedCard.cooldown);
          } else {
            newCooldowns[faction] = [...newCooldowns[faction], createCooldownEntry(usedCard)];
          }
        }
      } else {
        hands[faction] = hands[faction].map(
          /** @param {EventCard} c */
          c => {
            if (c.instanceId === cardInstanceId) {
              return {
                ...c,
                cardState: 'active',
                remainingDuration: usedCard.effect.duration || 1
              };
            }
            return c;
          }
        );
        if (usedCard.cooldown > 0) {
          const existingCd = newCooldowns[faction].find(c => c.cardId === cardId);
          if (existingCd) {
            existingCd.remainingCooldown = Math.max(existingCd.remainingCooldown, usedCard.cooldown + (usedCard.effect.duration || 0));
          } else {
            newCooldowns[faction] = [...newCooldowns[faction], {
              cardId: usedCard.id,
              remainingCooldown: usedCard.cooldown + (usedCard.effect.duration || 0)
            }];
          }
        }
      }

      const newEnergy = {
        red: state.energy.red,
        blue: state.energy.blue
      };
      newEnergy[faction] = Math.max(0, newEnergy[faction] - cost);

      const factionName = faction === 'red' ? '红方' : '蓝方';
      const actionType = isInstant ? '使用' : '激活';
      const cardDesc = `${factionName}${actionType}卡牌【${usedCard.name}】（消耗 ${cost} 能量）`;

      const cardLog = {
        id: `log_${Date.now()}_card_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction,
        type: /** @type {ActionLogType} */ ('card'),
        description: cardDesc,
        details: {
          cardId: usedCard.id,
          cardName: usedCard.name,
          cardType: usedCard.type,
          cardCategory: usedCard.category,
          cost,
          isInstant,
          cooldown: usedCard.cooldown,
          duration: usedCard.effect?.duration || 0,
          effectType: usedCard.effect?.type || ''
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === faction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, cardLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction,
          actions: [cardLog]
        });
      }

      return {
        ...state,
        hands,
        cooldowns: newCooldowns,
        energy: newEnergy,
        selectedCardId: null,
        gamePhase: 'idle',
        lastCardAction: usedCard ? { cardId: usedCard.id, type: isInstant ? 'play' : 'activate' } : null,
        actionLogs: newActionLogs,
        lastActionLog: cardLog,
        turnCardsUsed: {
          red: state.turnCardsUsed.red + (faction === 'red' ? 1 : 0),
          blue: state.turnCardsUsed.blue + (faction === 'blue' ? 1 : 0)
        }
      };
    }),
    /**
     * @param {string} unitId
     * @param {number} amount
     */
    healUnit: (unitId, amount) => update(state => {
      /** @type {string[]} */
      const statusMsgs = [];
      const target = state.units.find(u => u.id === unitId);
      const unitName = target ? unitConfig[/** @type {UnitType} */ (target.type)].name : '';
      const unitFaction = target?.faction || state.currentFaction;

      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const flags = getStatusFlags(u);
          if (flags.healBlocked) {
            const uName = unitConfig[/** @type {UnitType} */ (u.type)].name;
            statusMsgs.push(`${uName} 被禁疗，治疗无效！`);
            return u;
          }
          const maxHp = u.maxHp || unitConfig[/** @type {UnitType} */ (u.type)].hp;
          return { ...u, currentHp: Math.min(maxHp, u.currentHp + amount) };
        }
        return u;
      });

      if (target) {
        const factionName = unitFaction === 'red' ? '红方' : '蓝方';
        const healDesc = statusMsgs.length > 0
          ? `${factionName}${unitName} 治疗被禁疗抵消！`
          : `${factionName}${unitName} 恢复 ${amount} 点生命`;

        const healLog = {
          id: `log_${Date.now()}_heal_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: unitFaction,
          type: /** @type {ActionLogType} */ ('heal'),
          description: healDesc,
          details: {
            unitId,
            unitName,
            amount,
            healBlocked: statusMsgs.length > 0
          },
          timestamp: Date.now()
        };

        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unitFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, healLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: unitFaction,
            actions: [healLog]
          });
        }

        return { ...state, units, lastStatusMessages: statusMsgs, actionLogs: newActionLogs, lastActionLog: healLog };
      }

      return { ...state, units, lastStatusMessages: statusMsgs };
    }),
    /**
     * @param {string} unitId
     * @param {{ type: string; duration: number; value?: number }} buff
     */
    addBuff: (unitId, buff) => update(state => {
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const existingBuffs = u.buffs || [];
          const filteredBuffs = existingBuffs.filter(
            /** @param {any} b */ b => b.type !== buff.type
          );
          return { ...u, buffs: [...filteredBuffs, buff] };
        }
        return u;
      });
      return { ...state, units };
    }),
    /**
     * @param {string} unitId
     * @param {number} damage
     */
    damageUnit: (unitId, damage) => update(state => {
      /** @type {MoraleChange[]} */
      const moraleChanges = [];
      const clampMorale = (/** @type {number} */ v) =>
        Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, v));

      const target = state.units.find(/** @param {Unit} u */ u => u.id === unitId);
      let updatedUnits = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const hasShield = u.buffs?.some(/** @param {any} b */ b => b.type === 'shield');
          const finalDamage = hasShield ? 0 : damage;
          const newHp = Math.max(0, u.currentHp - finalDamage);
          const newBuffs = hasShield
            ? (u.buffs || []).filter(/** @param {any} b */ b => b.type !== 'shield')
            : u.buffs;
          return { ...u, currentHp: newHp, buffs: newBuffs };
        }
        return u;
      });

      const updatedTarget = updatedUnits.find(/** @param {Unit} u */ u => u.id === unitId);
      const targetDead = updatedTarget && updatedTarget.currentHp <= 0;
      const targetFaction = target?.faction;
      const targetName = target ? unitConfig[/** @type {UnitType} */ (target.type)].name : '';

      if (targetDead && targetFaction) {
        updatedUnits = updatedUnits.map(/** @param {Unit} u */ u => {
          if (u.faction === targetFaction && u.id !== unitId) {
            const before = u.morale;
            const delta = -gameRules.morale.onAllyDeath;
            const after = clampMorale(before + delta);
            moraleChanges.push({
              unitId: u.id,
              unitName: unitConfig[/** @type {UnitType} */ (u.type)].name,
              faction: u.faction,
              before,
              after,
              delta: after - before,
              reason: `友军阵亡(${targetName})`
            });
            return { ...u, morale: after, winStreak: 0 };
          }
          return u;
        });
      }

      updatedUnits = updatedUnits.filter(/** @param {Unit} u */ u => u.currentHp > 0);

      if (target) {
        const factionName = targetFaction === 'red' ? '红方' : '蓝方';
        const hasShieldLocal = target.buffs?.some(/** @param {any} b */ b => b.type === 'shield');
        const finalDamageLocal = hasShieldLocal ? 0 : damage;
        const killTag = targetDead ? '【阵亡！】' : '';
        const shieldTag = hasShieldLocal ? '（护盾抵消）' : '';
        const damageDesc = `${factionName}${targetName} 受到 ${finalDamageLocal} 点伤害${shieldTag}${killTag}`;

        const damageLog = {
          id: `log_${Date.now()}_dmg_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: targetFaction || state.currentFaction,
          type: /** @type {ActionLogType} */ ('damage'),
          description: damageDesc,
          details: {
            unitId,
            unitName: targetName,
            rawDamage: damage,
            finalDamage: finalDamageLocal,
            shieldBlocked: hasShieldLocal,
            targetDead,
            targetPosition: target ? { x: target.x, y: target.y } : null
          },
          timestamp: Date.now()
        };

        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === (targetFaction || state.currentFaction)) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, damageLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: targetFaction || state.currentFaction,
            actions: [damageLog]
          });
        }

        if (moraleChanges.length > 0) {
          const moraleDesc = moraleChanges.map(m => {
            const sign = m.delta > 0 ? '+' : '';
            const fName = m.faction === 'red' ? '红方' : '蓝方';
            return `${fName}${m.unitName}${sign}${m.delta}士气(${m.reason})`;
          }).join('；');
          const moraleLog = {
            id: `log_${Date.now()}_morale_${Math.random().toString(36).slice(2, 6)}`,
            turn: state.turn,
            faction: targetFaction || state.currentFaction,
            type: /** @type {ActionLogType} */ ('morale'),
            description: moraleDesc,
            details: { moraleChanges },
            timestamp: Date.now()
          };
          const lastLog = newActionLogs[newActionLogs.length - 1];
          if (lastLog && lastLog.turn === state.turn && lastLog.faction === (targetFaction || state.currentFaction)) {
            newActionLogs[newActionLogs.length - 1] = {
              ...lastLog,
              actions: [...lastLog.actions, moraleLog]
            };
          } else {
            newActionLogs.push({
              turn: state.turn,
              faction: targetFaction || state.currentFaction,
              actions: [moraleLog]
            });
          }
        }

        return { ...state, units: updatedUnits, lastMoraleChanges: moraleChanges, actionLogs: newActionLogs, lastActionLog: damageLog, turnDamageDealt: {
          red: state.turnDamageDealt.red + (state.currentFaction === 'red' ? finalDamageLocal : 0),
          blue: state.turnDamageDealt.blue + (state.currentFaction === 'blue' ? finalDamageLocal : 0)
        } };
      }

      return { ...state, units: updatedUnits, lastMoraleChanges: moraleChanges };
    }),
    /**
     * @param {string} unitId
     * @param {number} duration
     */
    stunUnit: (unitId, duration) => update(state => {
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          return { ...u, stunned: duration, hasMoved: true, hasAttacked: true };
        }
        return u;
      });
      return { ...state, units };
    }),
    /**
     * @param {string} unitId
     * @param {StatusEffect} statusEffect
     */
    applyStatusEffect: (unitId, statusEffect) => update(state => {
      /** @type {string[]} */
      const statusMsgs = [];
      const target = state.units.find(u => u.id === unitId);
      if (!target) return state;

      const unitType = /** @type {UnitType} */ (target.type);
      const unitName = unitConfig[unitType].name;
      const factionName = target.faction === 'red' ? '红方' : '蓝方';
      const statusInfo = getStatusInfo(statusEffect.type);

      const result = checkStatusApplication(target, statusEffect.type, statusEffect.duration, unitType);

      if (result.immune) {
        statusMsgs.push(`${factionName}${unitName} 对【${statusInfo.name}】免疫，效果被抵消！`);
        return { ...state, lastStatusMessages: statusMsgs };
      }

      if (result.resisted) {
        statusMsgs.push(`${factionName}${unitName} 成功抵抗了【${statusInfo.name}】效果！`);
        return { ...state, lastStatusMessages: statusMsgs };
      }

      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const effectiveEffect = { ...statusEffect, duration: result.duration, id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
          let newEffects = (u.statusEffects || []).filter(s => s.type !== statusEffect.type);
          newEffects.push(effectiveEffect);

          const info = getStatusInfo(statusEffect.type);
          let hasMoved = u.hasMoved;
          let hasAttacked = u.hasAttacked;

          if (info.isHardCC) {
            hasMoved = true;
            hasAttacked = true;
          }

          return { ...u, statusEffects: newEffects, hasMoved, hasAttacked };
        }
        return u;
      });

      statusMsgs.push(`${factionName}${unitName} 受到【${statusInfo.name}】效果，持续 ${result.duration} 回合`);

      const statusDesc = statusMsgs.join('；');
      const statusLog = {
        id: `log_${Date.now()}_status_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: target.faction,
        type: /** @type {ActionLogType} */ ('status'),
        description: statusDesc,
        details: {
          unitId,
          unitName,
          statusType: statusEffect.type,
          statusName: statusInfo.name,
          duration: result.duration,
          value: statusEffect.value,
          immune: result.immune,
          resisted: result.resisted,
          applied: !result.immune && !result.resisted
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === target.faction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, statusLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: target.faction,
          actions: [statusLog]
        });
      }

      return { ...state, units, lastStatusMessages: statusMsgs, actionLogs: newActionLogs, lastActionLog: statusLog };
    }),
    /**
     * @param {string} unitId
     */
    cleanseUnit: (unitId) => update(state => {
      /** @type {string[]} */
      const statusMsgs = [];
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const oldEffects = u.statusEffects || [];
          if (oldEffects.length > 0) {
            const uName = unitConfig[/** @type {UnitType} */ (u.type)].name;
            const removedNames = oldEffects.map(s => getStatusInfo(s.type).name).join('、');
            statusMsgs.push(`${uName} 清除了所有负面状态：${removedNames}`);
          }
          return { ...u, statusEffects: [], stunned: 0 };
        }
        return u;
      });
      return { ...state, units, lastStatusMessages: statusMsgs };
    }),
    /**
     * @param {Unit} unit
     */
    addUnit: (unit) => update(state => {
      const unitName = unitConfig[/** @type {UnitType} */ (unit.type)].name;
      const factionName = unit.faction === 'red' ? '红方' : '蓝方';
      const summonDesc = `${factionName}召唤单位【${unitName}】于 (${unit.x},${unit.y})`;

      const summonLog = {
        id: `log_${Date.now()}_summon_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: unit.faction,
        type: /** @type {ActionLogType} */ ('summon'),
        description: summonDesc,
        details: {
          unitId: unit.id,
          unitName,
          unitType: unit.type,
          position: { x: unit.x, y: unit.y }
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unit.faction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, summonLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: unit.faction,
          actions: [summonLog]
        });
      }

      return {
        ...state,
        units: [...state.units, { ...unit, statusEffects: unit.statusEffects || [] }],
        actionLogs: newActionLogs,
        lastActionLog: summonLog
      };
    }),
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} terrainType
     */
    changeTerrain: (x, y, terrainType) => update(state => {
      const newLayout = state.boardLayout
        ? state.boardLayout.map(/** @param {string[]} row */ row => [...row])
        : boardConfig.layout.map(/** @param {string[]} row */ row => [...row]);
      const oldTerrain = newLayout[y][x];
      newLayout[y][x] = terrainType;

      const key = `${x},${y}`;
      let newTileEffects = state.tileEffects;
      if (newTileEffects && newTileEffects[key]) {
        newTileEffects = { ...newTileEffects };
        delete newTileEffects[key];
      }

      const terrainData = boardConfig.terrain[/** @type {keyof typeof boardConfig.terrain} */ (terrainType)];
      const terrainName = terrainData?.name || terrainType;
      const factionName = state.currentFaction === 'red' ? '红方' : '蓝方';
      const terrainDesc = `${factionName}改变地形 (${x},${y}) 为【${terrainName}】`;

      const terrainLog = {
        id: `log_${Date.now()}_terrain_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: state.currentFaction,
        type: /** @type {ActionLogType} */ ('terrain'),
        description: terrainDesc,
        details: {
          x,
          y,
          oldTerrain,
          newTerrain: terrainType,
          newTerrainName: terrainName
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === state.currentFaction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, terrainLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: state.currentFaction,
          actions: [terrainLog]
        });
      }

      return {
        ...state,
        boardLayout: newLayout,
        tileEffects: newTileEffects,
        terrainChanged: { ...(state.terrainChanged || {}), [`${x},${y}`]: terrainType },
        actionLogs: newActionLogs,
        lastActionLog: terrainLog
      };
    }),
    /**
     * @param {number} duration
     */
    setReveal: (duration) => update(/** @param {GameState} state */ state => ({
      ...state,
      revealTurns: duration
    })),
    /**
     * @param {string} faction
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {number} duration
     */
    addRevealedArea: (faction, x, y, radius, duration) => update(state => {
      /** @type {'red' | 'blue'} */
      const fact = /** @type {'red' | 'blue'} */ (faction);
      const newRevealedAreas = {
        red: [...state.revealedAreas.red],
        blue: [...state.revealedAreas.blue]
      };

      const existingIndex = newRevealedAreas[fact].findIndex(
        /** @param {RevealedArea} area */
        area => Math.abs(area.x - x) <= 1 && Math.abs(area.y - y) <= 1 && area.radius === radius
      );

      if (existingIndex >= 0) {
        newRevealedAreas[fact][existingIndex] = {
          ...newRevealedAreas[fact][existingIndex],
          remainingTurns: Math.max(newRevealedAreas[fact][existingIndex].remainingTurns, duration),
          maxTurns: Math.max(newRevealedAreas[fact][existingIndex].maxTurns, duration)
        };
      } else {
        newRevealedAreas[fact].push({
          x,
          y,
          radius,
          remainingTurns: duration,
          maxTurns: duration,
          faction: fact
        });
      }

      const enemyFaction = fact === 'red' ? 'blue' : 'red';
      const newMarkers = {
        red: [...state.enemyMarkers.red],
        blue: [...state.enemyMarkers.blue]
      };

      const enemyUnits = state.units.filter(/** @param {Unit} u */ u => u.faction === enemyFaction);
      for (const unit of enemyUnits) {
        const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
        if (distance <= radius) {
          const existingMarkerIndex = newMarkers[fact].findIndex(
            /** @param {EnemyMarker} m */
            m => m.unitId === unit.id
          );
          if (existingMarkerIndex >= 0) {
            newMarkers[fact][existingMarkerIndex] = {
              ...newMarkers[fact][existingMarkerIndex],
              x: unit.x,
              y: unit.y,
              remainingTurns: Math.max(newMarkers[fact][existingMarkerIndex].remainingTurns, duration),
              detailedInfo: true,
              spottedTurn: state.turn
            };
          } else {
            newMarkers[fact].push({
              unitId: unit.id,
              unitType: unit.type,
              x: unit.x,
              y: unit.y,
              faction: enemyFaction,
              spottedTurn: state.turn,
              remainingTurns: duration,
              detailedInfo: true
            });
          }
        }
      }

      const factionName = fact === 'red' ? '红方' : '蓝方';
      const revealDesc = `${factionName}在 (${x},${y}) 施放侦查，揭示半径 ${radius} 区域内敌军，持续 ${duration} 回合`;
      const revealLog = {
        id: `log_${Date.now()}_scout_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: fact,
        type: /** @type {ActionLogType} */ ('card'),
        description: revealDesc,
        details: {
          x,
          y,
          radius,
          duration,
          revealedCount: newMarkers[fact].length
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === fact) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, revealLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: fact,
          actions: [revealLog]
        });
      }

      return {
        ...state,
        revealedAreas: newRevealedAreas,
        enemyMarkers: newMarkers,
        actionLogs: newActionLogs,
        lastActionLog: revealLog
      };
    }),
    /**
     * @param {string} faction
     */
    tickRevealedAreas: (faction) => update(state => {
      const newRevealedAreas = {
        red: state.revealedAreas.red.map(area => ({
          ...area,
          remainingTurns: area.remainingTurns - 1
        })).filter(area => area.remainingTurns > 0),
        blue: state.revealedAreas.blue.map(area => ({
          ...area,
          remainingTurns: area.remainingTurns - 1
        })).filter(area => area.remainingTurns > 0)
      };

      const newMarkers = {
        red: state.enemyMarkers.red.map(marker => ({
          ...marker,
          remainingTurns: marker.remainingTurns - 1
        })).filter(marker => marker.remainingTurns > 0),
        blue: state.enemyMarkers.blue.map(marker => ({
          ...marker,
          remainingTurns: marker.remainingTurns - 1
        })).filter(marker => marker.remainingTurns > 0)
      };

      return {
        ...state,
        revealedAreas: newRevealedAreas,
        enemyMarkers: newMarkers
      };
    }),
    /**
     * @param {string} faction
     * @param {string} unitId
     * @param {number} newX
     * @param {number} newY
     */
    updateEnemyMarkerPosition: (faction, unitId, newX, newY) => update(state => {
      /** @type {'red' | 'blue'} */
      const fact = /** @type {'red' | 'blue'} */ (faction);
      const newMarkers = {
        red: [...state.enemyMarkers.red],
        blue: [...state.enemyMarkers.blue]
      };

      const markerIndex = newMarkers[fact].findIndex(
        /** @param {EnemyMarker} m */
        m => m.unitId === unitId
      );
      if (markerIndex >= 0) {
        newMarkers[fact][markerIndex] = {
          ...newMarkers[fact][markerIndex],
          x: newX,
          y: newY
        };
      }

      return { ...state, enemyMarkers: newMarkers };
    }),
    /**
     * @param {string} unitId
     */
    removeEnemyMarkersForUnit: (unitId) => update(state => {
      const newMarkers = {
        red: state.enemyMarkers.red.filter(/** @param {EnemyMarker} m */ m => m.unitId !== unitId),
        blue: state.enemyMarkers.blue.filter(/** @param {EnemyMarker} m */ m => m.unitId !== unitId)
      };
      return { ...state, enemyMarkers: newMarkers };
    }),
    /**
     * @param {boolean} enabled
     */
    setFogOfWar: (enabled) => update(state => ({
      ...state,
      fogOfWarEnabled: enabled
    })),
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} effectType
     * @param {number} duration
     * @param {string} source
     */
    applyTileEffect: (x, y, effectType, duration, source) => update(state => {
      const key = `${x},${y}`;
      const config = tileEffectConfig[/** @type {keyof typeof tileEffectConfig} */ (effectType)];
      if (!config) return state;

      const newTileEffects = {
        ...(state.tileEffects || {}),
        [key]: {
          type: effectType,
          duration: duration || config.defaultDuration,
          x,
          y,
          source: source || 'card'
        }
      };

      const factionName = state.currentFaction === 'red' ? '红方' : '蓝方';
      const effectDesc = `${factionName}在 (${x},${y}) 施放了【${config.name}】地形效果，持续 ${duration || config.defaultDuration} 回合`;

      const effectLog = {
        id: `log_${Date.now()}_terrain_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: state.currentFaction,
        type: /** @type {ActionLogType} */ ('terrain'),
        description: effectDesc,
        details: {
          x,
          y,
          effectType,
          effectName: config.name,
          duration: duration || config.defaultDuration,
          source: source || 'card'
        },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === state.currentFaction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, effectLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: state.currentFaction,
          actions: [effectLog]
        });
      }

      return {
        ...state,
        tileEffects: newTileEffects,
        actionLogs: newActionLogs,
        lastActionLog: effectLog
      };
    }),
    /**
     * @param {number} x
     * @param {number} y
     */
    clearTileEffect: (x, y) => update(state => {
      const key = `${x},${y}`;
      if (!state.tileEffects || !state.tileEffects[key]) return state;
      const newTileEffects = { ...state.tileEffects };
      delete newTileEffects[key];
      return { ...state, tileEffects: newTileEffects };
    }),
    /**
     * @param {string} message
     */
    setMessage: (message) => update(/** @param {GameState} state */ state => ({ ...state, message })),
    /**
     * @param {string} unitId
     * @param {number} terrainMoraleBonus
     * @param {string} terrainName
     */
    applyTerrainMorale: (unitId, terrainMoraleBonus, terrainName) => update(state => {
      if (!terrainMoraleBonus) return { ...state, lastMoraleChanges: [] };
      const clampMorale = (/** @type {number} */ v) =>
        Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, v));
      /** @type {MoraleChange[]} */
      const moraleChanges = [];
      const unit = state.units.find(u => u.id === unitId);
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const before = u.morale;
          const after = clampMorale(before + terrainMoraleBonus);
          if (after !== before) {
            moraleChanges.push({
              unitId: u.id,
              unitName: unitConfig[/** @type {UnitType} */ (u.type)].name,
              faction: u.faction,
              before,
              after,
              delta: after - before,
              reason: `进入${terrainName}`
            });
          }
          return { ...u, morale: after };
        }
        return u;
      });

      if (moraleChanges.length > 0 && unit) {
        const moraleDesc = moraleChanges.map(m => {
          const sign = m.delta > 0 ? '+' : '';
          const fName = m.faction === 'red' ? '红方' : '蓝方';
          return `${fName}${m.unitName}${sign}${m.delta}士气(${m.reason})`;
        }).join('；');
        const moraleLog = {
          id: `log_${Date.now()}_morale_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: unit.faction,
          type: /** @type {ActionLogType} */ ('morale'),
          description: moraleDesc,
          details: { moraleChanges },
          timestamp: Date.now()
        };

        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unit.faction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, moraleLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: unit.faction,
            actions: [moraleLog]
          });
        }

        return { ...state, units, lastMoraleChanges: moraleChanges, actionLogs: newActionLogs, lastActionLog: moraleLog };
      }

      return { ...state, units, lastMoraleChanges: moraleChanges };
    }),
    clearLastCardAction: () => update(state => ({ ...state, lastCardAction: null })),
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} delta
     */
    damageBase: (x, y, delta) => update(state => {
      const bases = state.bases.map(b => {
        if (b.x === x && b.y === y) {
          return { ...b, durability: Math.max(0, b.durability - delta) };
        }
        return b;
      });

      const base = state.bases.find(b => b.x === x && b.y === y);
      if (base) {
        const baseFactionName = base.faction === 'red' ? '红方' : '蓝方';
        const attackerFactionName = state.currentFaction === 'red' ? '红方' : '蓝方';
        const baseDesc = `${attackerFactionName}攻击${baseFactionName}基地，造成 ${delta} 耐久损伤`;
        const baseLog = {
          id: `log_${Date.now()}_base_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: state.currentFaction,
          type: /** @type {ActionLogType} */ ('base'),
          description: baseDesc,
          details: {
            x,
            y,
            baseFaction: base.faction,
            damage: delta,
            durability: base.durability,
            action: 'damage'
          },
          timestamp: Date.now()
        };
        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === state.currentFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, baseLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: state.currentFaction,
            actions: [baseLog]
          });
        }
        return { ...state, bases, actionLogs: newActionLogs, lastActionLog: baseLog };
      }

      return { ...state, bases };
    }),
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} delta
     */
    repairBase: (x, y, delta) => update(state => {
      const bases = state.bases.map(b => {
        if (b.x === x && b.y === y) {
          return { ...b, durability: Math.min(b.maxDurability, b.durability + delta) };
        }
        return b;
      });

      const base = state.bases.find(b => b.x === x && b.y === y);
      if (base) {
        const factionName = base.faction === 'red' ? '红方' : '蓝方';
        const baseDesc = `${factionName}基地修复 +${delta} 耐久`;
        const baseLog = {
          id: `log_${Date.now()}_base_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: base.faction,
          type: /** @type {ActionLogType} */ ('base'),
          description: baseDesc,
          details: {
            x,
            y,
            baseFaction: base.faction,
            repair: delta,
            durability: base.durability,
            action: 'repair'
          },
          timestamp: Date.now()
        };
        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === base.faction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, baseLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: base.faction,
            actions: [baseLog]
          });
        }
        return { ...state, bases, actionLogs: newActionLogs, lastActionLog: baseLog };
      }

      return { ...state, bases };
    }),
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} capturingFaction
     * @param {number} progressDelta
     */
    updateBaseCapture: (x, y, capturingFaction, progressDelta) => update(state => {
      const bases = state.bases.map(b => {
        if (b.x === x && b.y === y) {
          let newProgress = b.captureProgress;
          let newCapturingFaction = b.capturingFaction;
          
          if (capturingFaction && capturingFaction !== b.faction) {
            if (b.capturingFaction === capturingFaction) {
              newProgress = b.captureProgress + progressDelta;
            } else {
              newProgress = progressDelta;
              newCapturingFaction = capturingFaction;
            }
          } else {
            newProgress = 0;
            newCapturingFaction = '';
          }
          
          return { ...b, captureProgress: newProgress, capturingFaction: newCapturingFaction };
        }
        return b;
      });

      const base = state.bases.find(b => b.x === x && b.y === y);
      if (base && progressDelta > 0 && capturingFaction) {
        const capFactionName = capturingFaction === 'red' ? '红方' : '蓝方';
        const baseFactionName = base.faction === 'red' ? '红方' : '蓝方';
        const baseDesc = `${capFactionName}占领${baseFactionName}基地，占领进度：${base.captureProgress + progressDelta || progressDelta}/${gameRules.victoryConditions.captureBase.captureTurnsRequired}`;
        const baseLog = {
          id: `log_${Date.now()}_base_${Math.random().toString(36).slice(2, 6)}`,
          turn: state.turn,
          faction: capturingFaction,
          type: /** @type {ActionLogType} */ ('base'),
          description: baseDesc,
          details: {
            x,
            y,
            baseFaction: base.faction,
            capturingFaction,
            progressDelta,
            newProgress: base.captureProgress + progressDelta || progressDelta,
            action: 'capture'
          },
          timestamp: Date.now()
        };
        const newActionLogs = [...state.actionLogs];
        const lastTurnLog = newActionLogs[newActionLogs.length - 1];
        if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === capturingFaction) {
          newActionLogs[newActionLogs.length - 1] = {
            ...lastTurnLog,
            actions: [...lastTurnLog.actions, baseLog]
          };
        } else {
          newActionLogs.push({
            turn: state.turn,
            faction: capturingFaction,
            actions: [baseLog]
          });
        }
        return { ...state, bases, actionLogs: newActionLogs, lastActionLog: baseLog };
      }

      return { ...state, bases };
    }),
    /**
     * @param {BaseState[]} newBases
     */
    setBases: (newBases) => update(state => ({ ...state, bases: newBases })),
    /**
     * @param {string} unitId
     * @param {'atk' | 'def' | 'hp' | 'move'} stat
     */
    allocateStatPoint: (unitId, stat) => update(state => {
      const unit = state.units.find(u => u.id === unitId);
      if (!unit) return state;
      if ((unit.statPoints || 0) <= 0) return state;

      const allocatedStats = { ...(unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 }) };
      allocatedStats[stat] = (allocatedStats[stat] || 0) + 1;

      const growth = gameRules.experience.statGrowth;
      let maxHp = unit.maxHp;
      let currentHp = unit.currentHp;
      if (stat === 'hp') {
        maxHp += growth.hp;
        currentHp += growth.hp;
      }

      const specConfig = unit.specialization ? SPECIALIZATION_CONFIG[unit.type]?.find(s => s.id === unit.specialization) : null;
      const specHpBonus = /** @type {number} */ (/** @type {any} */ (specConfig?.bonuses)?.hp) || 0;
      const baseMaxHp = unitConfig[/** @type {UnitType} */ (unit.type)].hp + allocatedStats.hp * growth.hp + specHpBonus;
      maxHp = baseMaxHp;

      const units = state.units.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            statPoints: (u.statPoints || 0) - 1,
            allocatedStats,
            maxHp,
            currentHp: stat === 'hp' ? Math.min(currentHp, maxHp) : u.currentHp
          };
        }
        return u;
      });

      const uName = unitConfig[/** @type {UnitType} */ (unit.type)].name;
      const statNames = { atk: '攻击', def: '防御', hp: '生命', move: '移动' };
      const desc = `${uName} 分配1点至${statNames[stat]}（剩余${(unit.statPoints || 0) - 1}点）`;
      const log = {
        id: `log_${Date.now()}_alloc_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: unit.faction,
        type: /** @type {ActionLogType} */ ('status'),
        description: desc,
        details: { unitId, stat, allocatedStats },
        timestamp: Date.now()
      };
      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unit.faction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, log]
        };
      } else {
        newActionLogs.push({ turn: state.turn, faction: unit.faction, actions: [log] });
      }

      return { ...state, units, actionLogs: newActionLogs, lastActionLog: log };
    }),
    /**
     * @param {string} unitId
     * @param {string} specId
     */
    chooseSpecialization: (unitId, specId) => update(state => {
      const unit = state.units.find(u => u.id === unitId);
      if (!unit) return state;
      if ((unit.level || 1) < gameRules.experience.specializationLevel) return state;
      if (unit.specialization) return state;

      const specOptions = SPECIALIZATION_CONFIG[unit.type];
      if (!specOptions || !specOptions.find(s => s.id === specId)) return state;

      const spec = specOptions.find(s => s.id === specId);
      const growth = gameRules.experience.statGrowth;
      const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
      const specHpBonus = /** @type {number} */ (/** @type {any} */ (spec?.bonuses)?.hp) || 0;
      const newMaxHp = unitConfig[/** @type {UnitType} */ (unit.type)].hp + allocatedStats.hp * growth.hp + specHpBonus;

      const units = state.units.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            specialization: specId,
            maxHp: newMaxHp,
            currentHp: Math.min(u.currentHp + (specHpBonus || 0), newMaxHp)
          };
        }
        return u;
      });

      const uName = unitConfig[/** @type {UnitType} */ (unit.type)].name;
      const specName = spec?.name || specId;
      const desc = `${uName} 选择能力分化：【${specName}】${spec?.description || ''}`;
      const log = {
        id: `log_${Date.now()}_spec_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: unit.faction,
        type: /** @type {ActionLogType} */ ('status'),
        description: desc,
        details: { unitId, specId, specName },
        timestamp: Date.now()
      };
      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === unit.faction) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, log]
        };
      } else {
        newActionLogs.push({ turn: state.turn, faction: unit.faction, actions: [log] });
      }

      return { ...state, units, actionLogs: newActionLogs, lastActionLog: log };
    }),
    /**
     * @param {import('../utils/storageRoster').RosterUnit[]} rosterUnits
     * @param {string} faction
     */
    loadRosterIntoGame: (rosterUnits, faction) => update(state => {
      if (!rosterUnits || rosterUnits.length === 0) return state;

      const growth = gameRules.experience.statGrowth;
      const units = state.units.map(u => {
        if (u.faction !== faction) return u;
        const rosterMatch = rosterUnits.find(r => r.type === u.type);
        if (!rosterMatch) return u;

        const allocatedStats = rosterMatch.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
        const specConfig = rosterMatch.specialization ? SPECIALIZATION_CONFIG[u.type]?.find(s => s.id === rosterMatch.specialization) : null;
        const specHpBonus = /** @type {number} */ (/** @type {any} */ (specConfig?.bonuses)?.hp) || 0;
        const newMaxHp = unitConfig[/** @type {UnitType} */ (u.type)].hp + allocatedStats.hp * growth.hp + specHpBonus;

        return {
          ...u,
          persistentId: rosterMatch.persistentId,
          exp: rosterMatch.exp || 0,
          level: rosterMatch.level || 1,
          statPoints: rosterMatch.statPoints || 0,
          allocatedStats,
          specialization: rosterMatch.specialization || null,
          maxHp: newMaxHp,
          currentHp: newMaxHp
        };
      });

      return { ...state, units };
    })
  };
}

export const gameState = createGameState();

/** @type {import('svelte/store').Writable<string | null>} */
export const previewTargetId = writable(null);

export const previewTarget = derived([gameState, previewTargetId], ([$state, $id]) =>
  $id ? $state.units.find(u => u.id === $id) || null : null
);

export const currentFactionUnits = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.units.filter(/** @param {Unit} u */ u => u.faction === $state.currentFaction)
);

export const enemyUnits = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.units.filter(/** @param {Unit} u */ u => u.faction !== $state.currentFaction)
);

export const selectedUnit = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.units.find(/** @param {Unit} u */ u => u.id === $state.selectedUnitId) || null
);

export const currentHand = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.hands[/** @type {'red' | 'blue'} */ ($state.currentFaction)] || []
);

export const currentEnergy = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.energy[/** @type {'red' | 'blue'} */ ($state.currentFaction)] || 0
);

export const currentCooldowns = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.cooldowns[/** @type {'red' | 'blue'} */ ($state.currentFaction)] || []
);

export const currentDrawHistory = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.drawHistory[/** @type {'red' | 'blue'} */ ($state.currentFaction)] || {}
);

export const currentPityCounter = derived(gameState, /** @param {GameState} $state */ $state =>
  $state.pityCounter[/** @type {'red' | 'blue'} */ ($state.currentFaction)] || 0
);

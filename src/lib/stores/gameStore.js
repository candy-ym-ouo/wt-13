import { writable, derived } from 'svelte/store';
import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, initialUnits, STATUS_EFFECT_TYPES, getStatusInfo } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import { cardConfig } from '$lib/config/eventCardConfig';
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
  isImmuneToStatus
} from '$lib/utils/gameLogic';

/**
 * @typedef {import('../utils/cardSystem').Unit} Unit
 * @typedef {import('../utils/cardSystem').EventCard} EventCard
 * @typedef {import('../utils/cardSystem').CooldownEntry} CooldownEntry
 * @typedef {import('../utils/cardSystem').StatusEffect} StatusEffect
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
 * @typedef {object} ActionLog
 * @property {string} id
 * @property {number} turn
 * @property {string} faction
 * @property {ActionLogType} type
 * @property {string} description
 * @property {object} [details]
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
      const config = unitConfig[/** @type {UnitType} */ (unitDef.type)];
      units.push({
        id: `unit_${unitId++}`,
        type: unitDef.type,
        faction,
        x: unitDef.x,
        y: unitDef.y,
        currentHp: config.hp,
        maxHp: config.hp,
        hasMoved: false,
        hasAttacked: false,
        attackCount: 0,
        buffs: [],
        stunned: 0,
        morale: gameRules.morale.initial,
        winStreak: 0,
        statusEffects: []
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
    lastActionLog: null
  };
}

function createGameState() {
  const { subscribe, set, update } = writable(createInitialState());

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
    reset: () => set(createInitialState()),
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
     * @param {number[]} path
     */
    moveUnit: (unitId, x, y, path) => update(state => {
      const unit = state.units.find(u => u.id === unitId);
      const pathLength = path ? path.length : Math.abs(x - (unit?.x || 0)) + Math.abs(y - (unit?.y || 0));
      const bleedDmg = unit ? calculateBleedDamage(unit, pathLength) : 0;
      const fromX = unit?.x ?? 0;
      const fromY = unit?.y ?? 0;
      const unitName = unit ? unitConfig[/** @type {UnitType} */ (unit.type)].name : '';
      const unitFaction = unit?.faction || state.currentFaction;

      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          let newHp = u.currentHp;
          if (bleedDmg > 0) {
            newHp = Math.max(0, u.currentHp - bleedDmg);
          }
          return { ...u, x, y, hasMoved: true, path, currentHp: newHp };
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

      const filteredUnits = units.filter(u => u.currentHp > 0);
      const died = units.length > filteredUnits.length;

      const factionName = unitFaction === 'red' ? '红方' : '蓝方';
      const moveDesc = `${factionName}${unitName} 从 (${fromX},${fromY}) 移动到 (${x},${y})` +
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
          bleedDamage: bleedDmg
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

      return {
        ...state,
        units: filteredUnits,
        selectedUnitId: unitId,
        gamePhase: 'unitMoved',
        lastStatusMessages: statusMsgs,
        actionLogs: newActionLogs,
        lastActionLog: moveLog
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

      /** @type {MoraleChange[]} */
      const moraleChanges = [];

      const clampMorale = (/** @type {number} */ v) =>
        Math.max(gameRules.morale.min, Math.min(gameRules.morale.max, v));

      let updatedUnits = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === attackerId) {
          if (u.attackCount !== undefined) {
            const newCount = u.attackCount + 1;
            if (hasDoubleAttack && newCount < 2) {
              return { ...u, attackCount: newCount };
            }
            return { ...u, hasAttacked: true, attackCount: 0 };
          } else {
            if (hasDoubleAttack) {
              return { ...u, attackCount: 1 };
            }
            return { ...u, hasAttacked: true };
          }
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

      updatedUnits = updatedUnits.filter(/** @param {Unit} u */ u => u.currentHp > 0);

      const atkFactionName = attackerFaction === 'red' ? '红方' : '蓝方';
      const defFactionName = defenderFaction === 'red' ? '红方' : '蓝方';
      const killTag = defenderDead ? '【击杀！】' : '';
      const shieldTag = hasShield ? '（护盾抵消）' : '';
      const attackDesc = `${atkFactionName}${attackerName} 攻击 ${defFactionName}${defenderName}，造成 ${finalDamage} 伤害${shieldTag}${killTag}`;

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
          defenderRemainingHp: updatedDefender?.currentHp || 0
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

      return {
        ...state,
        units: updatedUnits,
        selectedUnitId: attackerId,
        gamePhase: 'idle',
        lastMoraleChanges: moraleChanges,
        actionLogs: newActionLogs,
        lastActionLog: attackLog
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

        return {
          ...u,
          hasMoved: isCC ? true : false,
          hasAttacked: isCC ? true : false,
          attackCount: 0,
          buffs: newBuffs,
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

      let newRevealTurns = state.revealTurns ? state.revealTurns - 1 : 0;
      if (nextFaction === state.currentFaction) {
        newRevealTurns = state.revealTurns ? state.revealTurns : 0;
      }

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

      return {
        ...state,
        currentFaction: nextFaction,
        turn: newTurn,
        units,
        selectedUnitId: null,
        selectedCardId: null,
        gamePhase: 'idle',
        hands: nextHands,
        cooldowns: nextCooldowns,
        energy: nextEnergy,
        revealTurns: newRevealTurns,
        turnHistory: [...state.turnHistory, { turn: state.turn, faction: state.currentFaction }],
        lastStatusMessages: statusMessages,
        lastMoraleChanges: dotKilled ? moraleChanges : state.lastMoraleChanges,
        actionLogs: newActionLogs,
        lastActionLog: turnEndLog
      };
    }),
    /**
     * @param {string} winner
     * @param {string} condition
     */
    setVictory: (winner, condition) => update(state => {
      const winnerName = winner === 'red' ? '红方' : '蓝方';
      const victoryDesc = `${winnerName}胜利！${condition}`;

      const victoryLog = {
        id: `log_${Date.now()}_victory_${Math.random().toString(36).slice(2, 6)}`,
        turn: state.turn,
        faction: winner,
        type: /** @type {ActionLogType} */ ('victory'),
        description: victoryDesc,
        details: { winner, condition },
        timestamp: Date.now()
      };

      const newActionLogs = [...state.actionLogs];
      const lastTurnLog = newActionLogs[newActionLogs.length - 1];
      if (lastTurnLog && lastTurnLog.turn === state.turn && lastTurnLog.faction === winner) {
        newActionLogs[newActionLogs.length - 1] = {
          ...lastTurnLog,
          actions: [...lastTurnLog.actions, victoryLog]
        };
      } else {
        newActionLogs.push({
          turn: state.turn,
          faction: winner,
          actions: [victoryLog]
        });
      }

      return {
        ...state,
        gameOver: true,
        winner,
        victoryCondition: condition,
        gamePhase: 'gameOver',
        actionLogs: newActionLogs,
        lastActionLog: victoryLog
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
      if (hands[faction].length < cardConfig.maxHandSize) {
        hands[faction] = [...hands[faction], {
          ...card,
          instanceId: String(Date.now() + Math.random()),
          cardState: 'available',
          remainingDuration: 0,
          remainingCooldown: 0
        }];
      }
      return { ...state, hands };
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
        lastActionLog: cardLog
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
          const maxHp = unitConfig[/** @type {UnitType} */ (u.type)].hp;
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

        return { ...state, units: updatedUnits, lastMoraleChanges: moraleChanges, actionLogs: newActionLogs, lastActionLog: damageLog };
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
    setBases: (newBases) => update(state => ({ ...state, bases: newBases }))
  };
}

export const gameState = createGameState();

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

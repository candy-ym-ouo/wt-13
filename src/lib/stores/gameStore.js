import { writable, derived } from 'svelte/store';
import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, initialUnits } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';

/**
 * @typedef {import('../utils/cardSystem').Unit} Unit
 * @typedef {import('../utils/cardSystem').EventCard} EventCard
 */

/**
 * @typedef {'idle' | 'unitSelected' | 'unitMoved' | 'cardSelected' | 'gameOver'} GamePhase
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
 * @property {string[][] | null} boardLayout
 * @property {Record<string, string> | null} terrainChanged
 * @property {number} revealTurns
 * @property {{turn: number, faction: string}[]} turnHistory
 * @property {string} message
 */

/**
 * @typedef {keyof typeof unitConfig} UnitType
 * @typedef {keyof typeof initialUnits} FactionKey
 */

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
        stunned: 0
      });
    }
  }

  /** @type {{red: EventCard[], blue: EventCard[]}} */
  const hands = { red: [], blue: [] };

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
    boardLayout: null,
    terrainChanged: null,
    revealTurns: 0,
    turnHistory: [],
    message: '游戏开始！红方先行动'
  };
}

function createGameState() {
  const { subscribe, set, update } = writable(createInitialState());

  return {
    subscribe,
    set,
    update,
    reset: () => set(createInitialState()),
    /** @param {string | null} unitId */
    selectUnit: (unitId) => update(state => ({
      ...state,
      selectedUnitId: unitId,
      selectedCardId: null,
      gamePhase: unitId ? 'unitSelected' : 'idle'
    })),
    /** @param {string | null} cardId */
    selectCard: (cardId) => update(state => ({
      ...state,
      selectedCardId: cardId,
      gamePhase: cardId ? 'cardSelected' : 'idle'
    })),
    /**
     * @param {string} unitId
     * @param {number} x
     * @param {number} y
     * @param {any[]} path
     */
    moveUnit: (unitId, x, y, path) => update(state => {
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          return { ...u, x, y, hasMoved: true, path };
        }
        return u;
      });
      return {
        ...state,
        units,
        selectedUnitId: unitId,
        gamePhase: 'unitMoved'
      };
    }),
    /**
     * @param {string} attackerId
     * @param {string} defenderId
     * @param {number} damage
     */
    attack: (attackerId, defenderId, damage) => update(state => {
      const attacker = state.units.find(/** @param {Unit} u */ u => u.id === attackerId);
      const hasDoubleAttack = attacker?.buffs?.some(
        /** @param {any} b */ b => b.type === 'doubleAttack'
      );
      
      const units = state.units.map(/** @param {Unit} u */ u => {
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
          const newHp = Math.max(0, u.currentHp - damage);
          return { ...u, currentHp: newHp };
        }
        return u;
      }).filter(/** @param {Unit} u */ u => u.currentHp > 0);
      return {
        ...state,
        units,
        selectedUnitId: attackerId,
        gamePhase: 'idle'
      };
    }),
    endTurn: () => update(state => {
      /** @type {'red' | 'blue'} */
      const nextFaction = state.currentFaction === 'red' ? 'blue' : 'red';
      const newTurn = nextFaction === 'red' ? state.turn + 1 : state.turn;
      const units = state.units.map(/** @param {Unit} u */ u => {
        const newBuffs = (u.buffs || [])
          .filter(/** @param {any} b */ b => b.duration > 1)
          .map(/** @param {any} b */ b => ({ ...b, duration: b.duration - 1 }));
        const newStunned = u.stunned && u.stunned > 0 ? u.stunned - 1 : 0;
        return {
          ...u,
          hasMoved: false,
          hasAttacked: false,
          attackCount: 0,
          buffs: newBuffs,
          stunned: newStunned
        };
      });
      let newRevealTurns = state.revealTurns ? state.revealTurns - 1 : 0;
      if (nextFaction === state.currentFaction) {
        newRevealTurns = state.revealTurns ? state.revealTurns : 0;
      }
      return {
        ...state,
        currentFaction: nextFaction,
        turn: newTurn,
        units,
        selectedUnitId: null,
        selectedCardId: null,
        gamePhase: 'idle',
        revealTurns: newRevealTurns,
        turnHistory: [...state.turnHistory, { turn: state.turn, faction: state.currentFaction }]
      };
    }),
    /**
     * @param {string} winner
     * @param {string} condition
     */
    setVictory: (winner, condition) => update(state => ({
      ...state,
      gameOver: true,
      winner,
      victoryCondition: condition,
      gamePhase: 'gameOver'
    })),
    /**
     * @param {'red' | 'blue'} faction
     * @param {EventCard} card
     */
    addCard: (faction, card) => update(state => {
      const hands = {
        red: [...state.hands.red],
        blue: [...state.hands.blue]
      };
      if (hands[faction].length < 5) {
        hands[faction] = [...hands[faction], { ...card, instanceId: String(Date.now() + Math.random()) }];
      }
      return { ...state, hands };
    }),
    /**
     * @param {'red' | 'blue'} faction
     * @param {string} cardInstanceId
     */
    useCard: (faction, cardInstanceId) => update(state => {
      const hands = {
        red: [...state.hands.red],
        blue: [...state.hands.blue]
      };
      hands[faction] = hands[faction].filter(
        /** @param {EventCard} c */
        c => c.instanceId !== cardInstanceId
      );
      return {
        ...state,
        hands,
        selectedCardId: null,
        gamePhase: 'idle'
      };
    }),
    /**
     * @param {string} unitId
     * @param {number} amount
     */
    healUnit: (unitId, amount) => update(state => {
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          const maxHp = unitConfig[/** @type {UnitType} */ (u.type)].hp;
          return { ...u, currentHp: Math.min(maxHp, u.currentHp + amount) };
        }
        return u;
      });
      return { ...state, units };
    }),
    /**
     * @param {string} unitId
     * @param {any} buff
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
      const units = state.units.map(/** @param {Unit} u */ u => {
        if (u.id === unitId) {
          return { ...u, currentHp: Math.max(0, u.currentHp - damage) };
        }
        return u;
      }).filter(/** @param {Unit} u */ u => u.currentHp > 0);
      return { ...state, units };
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
    /** @param {Unit} unit */
    addUnit: (unit) => update(state => ({
      ...state,
      units: [...state.units, unit]
    })),
    /**
     * @param {number} x
     * @param {number} y
     * @param {string} terrainType
     */
    changeTerrain: (x, y, terrainType) => update(state => {
      const newLayout = state.boardLayout
        ? state.boardLayout.map(/** @param {string[]} row */ row => [...row])
        : boardConfig.layout.map(/** @param {string[]} row */ row => [...row]);
      newLayout[y][x] = terrainType;
      return {
        ...state,
        boardLayout: newLayout,
        terrainChanged: { ...(state.terrainChanged || {}), [`${x},${y}`]: terrainType }
      };
    }),
    /** @param {number} duration */
    setReveal: (duration) => update(/** @param {GameState} state */ state => ({
      ...state,
      revealTurns: duration
    })),
    /** @param {string} message */
    setMessage: (message) => update(/** @param {GameState} state */ state => ({ ...state, message }))
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

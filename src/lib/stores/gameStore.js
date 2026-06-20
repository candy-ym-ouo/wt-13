import { writable, derived } from 'svelte/store';
import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, initialUnits } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';
import { cardConfig } from '$lib/config/eventCardConfig';
import {
  tickActiveCards,
  tickCooldowns,
  refillEnergy,
  createCooldownEntry
} from '$lib/utils/cardSystem';

/**
 * @typedef {import('../utils/cardSystem').Unit} Unit
 * @typedef {import('../utils/cardSystem').EventCard} EventCard
 * @typedef {import('../utils/cardSystem').CooldownEntry} CooldownEntry
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
        winStreak: 0
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
    bases
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
      const defender = state.units.find(/** @param {Unit} u */ u => u.id === defenderId);
      const hasDoubleAttack = attacker?.buffs?.some(
        /** @param {any} b */ b => b.type === 'doubleAttack'
      );

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

      const updatedDefender = updatedUnits.find(/** @param {Unit} u */ u => u.id === defenderId);
      const defenderDead = updatedDefender && updatedDefender.currentHp <= 0;
      const attackerFaction = attacker?.faction;
      const defenderFaction = defender?.faction;
      const attackerName = attacker ? unitConfig[/** @type {UnitType} */ (attacker.type)].name : '';
      const defenderName = defender ? unitConfig[/** @type {UnitType} */ (defender.type)].name : '';

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

      return {
        ...state,
        units: updatedUnits,
        selectedUnitId: attackerId,
        gamePhase: 'idle',
        lastMoraleChanges: moraleChanges
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

      return {
        ...state,
        hands,
        cooldowns: newCooldowns,
        energy: newEnergy,
        selectedCardId: null,
        gamePhase: 'idle',
        lastCardAction: usedCard ? { cardId: usedCard.id, type: isInstant ? 'play' : 'activate' } : null
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

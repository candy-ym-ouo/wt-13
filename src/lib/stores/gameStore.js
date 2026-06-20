import { writable, derived } from 'svelte/store';
import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig, initialUnits } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';

function createGameState() {
  const { subscribe, set, update } = writable(createInitialState());

  return {
    subscribe,
    set,
    update,
    reset: () => set(createInitialState()),
    selectUnit: (unitId) => update(state => ({
      ...state,
      selectedUnitId: unitId,
      selectedCardId: null,
      gamePhase: unitId ? 'unitSelected' : 'idle'
    })),
    selectCard: (cardId) => update(state => ({
      ...state,
      selectedCardId: cardId,
      selectedUnitId: null,
      gamePhase: cardId ? 'cardSelected' : 'idle'
    })),
    moveUnit: (unitId, x, y, path) => update(state => {
      const units = state.units.map(u => {
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
    attack: (attackerId, defenderId, damage) => update(state => {
      const units = state.units.map(u => {
        if (u.id === attackerId) {
          return { ...u, hasAttacked: true };
        }
        if (u.id === defenderId) {
          const newHp = Math.max(0, u.currentHp - damage);
          return { ...u, currentHp: newHp };
        }
        return u;
      }).filter(u => u.currentHp > 0);
      return {
        ...state,
        units,
        selectedUnitId: null,
        gamePhase: 'idle'
      };
    }),
    endTurn: () => update(state => {
      const nextFaction = state.currentFaction === 'red' ? 'blue' : 'red';
      const newTurn = nextFaction === 'red' ? state.turn + 1 : state.turn;
      const units = state.units.map(u => ({
        ...u,
        hasMoved: false,
        hasAttacked: false,
        buffs: u.buffs ? u.buffs.filter(b => b.duration > 1).map(b => ({ ...b, duration: b.duration - 1 })) : []
      }));
      return {
        ...state,
        currentFaction: nextFaction,
        turn: newTurn,
        units,
        selectedUnitId: null,
        selectedCardId: null,
        gamePhase: 'idle',
        turnHistory: [...state.turnHistory, { turn: state.turn, faction: state.currentFaction }]
      };
    }),
    setVictory: (winner, condition) => update(state => ({
      ...state,
      gameOver: true,
      winner,
      victoryCondition: condition,
      gamePhase: 'gameOver'
    })),
    addCard: (faction, card) => update(state => {
      const hands = { ...state.hands };
      if (hands[faction].length < 5) {
        hands[faction] = [...hands[faction], { ...card, instanceId: Date.now() + Math.random() }];
      }
      return { ...state, hands };
    }),
    useCard: (faction, cardInstanceId) => update(state => {
      const hands = { ...state.hands };
      hands[faction] = hands[faction].filter(c => c.instanceId !== cardInstanceId);
      return {
        ...state,
        hands,
        selectedCardId: null,
        gamePhase: 'idle'
      };
    }),
    healUnit: (unitId, amount) => update(state => {
      const units = state.units.map(u => {
        if (u.id === unitId) {
          const maxHp = unitConfig[u.type].hp;
          return { ...u, currentHp: Math.min(maxHp, u.currentHp + amount) };
        }
        return u;
      });
      return { ...state, units };
    }),
    addBuff: (unitId, buff) => update(state => {
      const units = state.units.map(u => {
        if (u.id === unitId) {
          return { ...u, buffs: [...(u.buffs || []), buff] };
        }
        return u;
      });
      return { ...state, units };
    }),
    damageUnit: (unitId, damage) => update(state => {
      const units = state.units.map(u => {
        if (u.id === unitId) {
          return { ...u, currentHp: Math.max(0, u.currentHp - damage) };
        }
        return u;
      }).filter(u => u.currentHp > 0);
      return { ...state, units };
    }),
    stunUnit: (unitId, duration) => update(state => {
      const units = state.units.map(u => {
        if (u.id === unitId) {
          return { ...u, stunned: duration, hasMoved: true, hasAttacked: true };
        }
        return u;
      });
      return { ...state, units };
    }),
    addUnit: (unit) => update(state => ({
      ...state,
      units: [...state.units, unit]
    })),
    setMessage: (message) => update(state => ({ ...state, message }))
  };
}

function createInitialState() {
  let unitId = 0;
  const units = [];
  
  for (const faction of ['red', 'blue']) {
    for (const unitDef of initialUnits[faction]) {
      const config = unitConfig[unitDef.type];
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
        buffs: [],
        stunned: 0
      });
    }
  }

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
    turnHistory: [],
    message: '游戏开始！红方先行动'
  };
}

export const gameState = createGameState();

export const currentFactionUnits = derived(gameState, $state =>
  $state.units.filter(u => u.faction === $state.currentFaction)
);

export const enemyUnits = derived(gameState, $state =>
  $state.units.filter(u => u.faction !== $state.currentFaction)
);

export const selectedUnit = derived(gameState, $state =>
  $state.units.find(u => u.id === $state.selectedUnitId) || null
);

export const currentHand = derived(gameState, $state =>
  $state.hands[$state.currentFaction] || []
);

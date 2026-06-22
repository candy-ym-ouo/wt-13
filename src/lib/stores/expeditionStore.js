import { writable, derived, get } from 'svelte/store';
import {
  EXPEDITION_DIFFICULTY,
  EXPEDITION_EVENT_TYPES
} from '$lib/config/expeditionConfig.js';
import {
  generateExpeditionMap,
  initializeExpeditionRoster,
  getAvailableNodes,
  getNodeById,
  visitNode
} from '$lib/utils/expeditionMapGenerator.js';
import {
  resolveBattle,
  applySupplyReward,
  resolveRandomEvent,
  applyShrineBlessing,
  applyRest,
  distributeExpToRoster,
  calculateExpeditionScore,
  tickBuffsAndDebuffs
} from '$lib/utils/expeditionLogic.js';
import { unitConfig, initialUnits } from '$lib/config/unitConfig.js';
import { gameRules } from '$lib/config/gameRules.js';
import { eventCards as _eventCards, CARD_RARITY as _CARD_RARITY } from '$lib/config/eventCardConfig.js';
import { generateLoot as _generateLoot, DROP_SOURCES as _DROP_SOURCES } from '$lib/utils/lootSystem.js';
import { legionStore } from '$lib/stores/legionStore.js';
import { addExpToUnit } from '$lib/utils/legionSystem.js';

function generateId() {
  return 'exp_store_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createInitialRoster() {
  const redUnits = initialUnits.red;
  return redUnits.map((def, idx) => {
    const config = unitConfig[def.type];
    return {
      id: generateId() + '_' + idx,
      type: def.type,
      faction: 'red',
      x: def.x,
      y: def.y,
      name: config.name,
      currentHp: config.hp,
      maxHp: config.hp,
      attack: config.attack,
      defense: config.defense,
      moveRange: config.moveRange,
      attackRange: config.attackRange,
      hasMoved: false,
      hasAttacked: false,
      attackCount: 0,
      buffs: [],
      stunned: 0,
      morale: gameRules.morale.initial,
      winStreak: 0,
      statusEffects: [],
      exp: 0,
      level: 1,
      statPoints: 0,
      allocatedStats: { atk: 0, def: 0, hp: 0, move: 0 },
      specialization: null,
      equipment: { weapon: null, armor: null, accessory: null, relic: null }
    };
  });
}

function createInitialExpeditionState() {
  return {
    active: false,
    phase: 'select_difficulty',
    map: null,
    roster: [],
    gold: 200,
    cards: [],
    equipment: [],
    permanentBuffs: [],
    activeBuffs: [],
    activeDebuffs: [],
    currentNode: null,
    currentEvent: null,
    battleResult: null,
    eventResult: null,
    supplyResult: null,
    shopDiscount: 1.0,
    shopDiscountTurns: 0,
    logs: [],
    stats: {
      battlesWon: 0,
      totalDamageDealt: 0,
      totalGoldEarned: 0,
      unitsLost: 0,
      nodesVisited: 0
    },
    finalScore: null,
    completed: false
  };
}

function createExpeditionStore() {
  const { subscribe, set, update } = writable(createInitialExpeditionState());

  function addLog(state, message, type = 'info') {
    const newLog = {
      id: generateId(),
      timestamp: Date.now(),
      message,
      type,
      turn: state.map?.currentLayer || 0
    };
    return {
      ...state,
      logs: [newLog, ...state.logs].slice(0, 100)
    };
  }

  function syncRewardsToLegion(state) {
    try {
      const legion = get(legionStore);
      if (!legion) return;

      if (state.gold > 0) {
        legionStore.addGold(state.gold);
      }

      if (state.equipment && state.equipment.length > 0) {
        for (const item of state.equipment) {
          legionStore.addEquipment({ ...item, id: generateId() });
        }
      }

      if (state.cards && state.cards.length > 0) {
        const cardIds = state.cards.map(c => c.id).filter(Boolean);
        if (cardIds.length > 0) {
          legionStore.unlockCards(cardIds);
        }
      }

      if (state.roster && state.roster.length > 0 && legion.units && legion.units.length > 0) {
        const typeMap = new Map();
        for (const unit of state.roster) {
          if (!typeMap.has(unit.type)) {
            typeMap.set(unit.type, { totalExp: 0, maxLevel: 1, maxStatPoints: 0, bestExp: 0 });
          }
          const data = typeMap.get(unit.type);
          data.totalExp += unit.exp || 0;
          data.maxLevel = Math.max(data.maxLevel, unit.level || 1);
          data.maxStatPoints = Math.max(data.maxStatPoints, unit.statPoints || 0);
          data.bestExp = Math.max(data.bestExp, unit.exp || 0);
        }

        for (const [unitType, data] of typeMap.entries()) {
          const matchingUnits = legion.units.filter(u => u.type === unitType);
          if (matchingUnits.length > 0 && data.bestExp > 0) {
            const sortedUnits = [...matchingUnits].sort((a, b) => (b.exp || 0) - (a.exp || 0));
            const expPerUnit = Math.floor(data.bestExp / Math.min(3, sortedUnits.length));
            const unitsToUpdate = sortedUnits.slice(0, 3);
            for (const unit of unitsToUpdate) {
              const result = addExpToUnit(unit, expPerUnit);
              if (result.unit) {
                const unitIndex = legion.units.findIndex(u => u.id === unit.id);
                if (unitIndex !== -1) {
                  const newUnits = [...legion.units];
                  newUnits[unitIndex] = result.unit;
                  legionStore.update(s => ({ ...s, units: newUnits }));
                }
              }
            }
          }
        }
      }

      addLog(state, `✅ 远征奖励已同步到军团：${state.gold}金币，${state.equipment?.length || 0}装备，${state.cards?.length || 0}卡牌`, 'success');
    } catch (error) {
      console.error('同步远征奖励到军团失败:', error);
    }
  }

  return {
    subscribe,
    set,
    update,

    startExpedition: (difficultyId) => update(state => {
      const difficulty = EXPEDITION_DIFFICULTY[difficultyId.toUpperCase()];
      if (!difficulty) return state;

      const map = generateExpeditionMap(difficultyId);
      const roster = initializeExpeditionRoster(createInitialRoster());
      const startingGold = Math.floor(200 * difficulty.rewardMultiplier);

      let newState = {
        ...createInitialExpeditionState(),
        active: true,
        phase: 'map_view',
        map,
        roster,
        gold: startingGold
      };

      newState = addLog(newState, `远征开始！难度：${difficulty.name}，共 ${map.totalLayers} 层`, 'system');
      newState = addLog(newState, `初始金币：${startingGold}`, 'info');

      return newState;
    }),

    selectNode: (nodeId) => update(state => {
      if (!state.active || !state.map) return state;
      if (state.phase !== 'map_view') return state;

      const node = getNodeById(state.map, nodeId);
      if (!node || !node.available || node.visited) return state;

      const newMap = visitNode(state.map, nodeId);

      let newState = {
        ...state,
        map: newMap,
        currentNode: node,
        phase: 'event_view',
        currentEvent: { ...node.data },
        battleResult: null,
        eventResult: null,
        supplyResult: null,
        stats: {
          ...state.stats,
          nodesVisited: state.stats.nodesVisited + 1
        }
      };

      newState = addLog(newState, `进入第 ${node.layer + 1} 层节点`, 'info');

      return newState;
    }),

    startBattle: () => update(state => {
      if (!state.active || !state.currentEvent) return state;

      const isBoss = state.currentNode?.eventType === EXPEDITION_EVENT_TYPES.BOSS;
      const result = resolveBattle(state, state.currentEvent, isBoss);

      let newRoster = distributeExpToRoster(state.roster, result.exp);
      const deadUnits = state.roster.filter(u => u.currentHp <= 0);
      newRoster = newRoster.filter(u => u.currentHp > 0);

      const buffTick = tickBuffsAndDebuffs(state);

      let newState = {
        ...state,
        ...buffTick,
        phase: 'battle_result',
        battleResult: result,
        roster: newRoster,
        gold: state.gold + result.gold,
        cards: [...state.cards, ...result.cards],
        equipment: [...state.equipment, ...result.equipment],
        stats: {
          ...state.stats,
          battlesWon: state.stats.battlesWon + 1,
          totalGoldEarned: state.stats.totalGoldEarned + result.gold,
          unitsLost: state.stats.unitsLost + deadUnits.length
        }
      };

      newState = addLog(newState, 
        `战斗胜利！获得 ${result.gold} 金币，${result.exp} 经验，${result.cards.length} 张卡牌，${result.equipment.length} 件装备`, 
        'success'
      );

      if (deadUnits.length > 0) {
        newState = addLog(newState, `${deadUnits.length} 名单位阵亡`, 'warning');
      }

      if (isBoss) {
        newState = {
          ...newState,
          phase: 'victory',
          completed: true,
          finalScore: calculateExpeditionScore({ ...newState, map: { ...state.map, success: true } }),
          map: { ...state.map, success: true, completed: true }
        };
        newState = addLog(newState, '🏆 远征胜利！首领已被击败！', 'success');
        syncRewardsToLegion(newState);
      }

      if (newRoster.length === 0) {
        newState = {
          ...newState,
          phase: 'defeat',
          completed: true,
          finalScore: calculateExpeditionScore(newState),
          map: { ...state.map, success: false, completed: true }
        };
        newState = addLog(newState, '💀 远征失败！全军覆没...', 'error');
        syncRewardsToLegion(newState);
      }

      return newState;
    }),

    selectSupply: (supplyType) => update(state => {
      if (!state.active || state.phase !== 'event_view') return state;
      if (state.currentNode?.eventType !== EXPEDITION_EVENT_TYPES.SUPPLY) return state;

      const result = applySupplyReward(state, supplyType);

      let newState = {
        ...state,
        ...result.changes,
        phase: 'supply_result',
        supplyResult: result
      };

      newState = addLog(newState, result.message, 'success');

      return newState;
    }),

    resolveEvent: () => update(state => {
      if (!state.active || state.phase !== 'event_view') return state;
      if (state.currentNode?.eventType !== EXPEDITION_EVENT_TYPES.RANDOM) return state;

      const result = resolveRandomEvent(state, state.currentEvent);
      if (!result) return state;

      let newState = {
        ...state,
        ...result.changes,
        phase: 'event_result',
        eventResult: result,
        currentEvent: {
          ...state.currentEvent,
          outcomeResolved: true
        }
      };

      newState = addLog(newState, `【${result.eventName}】${result.message}`, 'info');

      if (result.changes.roster) {
        const aliveCount = result.changes.roster.filter(u => u.currentHp > 0).length;
        if (aliveCount === 0) {
          newState = {
            ...newState,
            phase: 'defeat',
            completed: true,
            finalScore: calculateExpeditionScore(newState),
            map: { ...state.map, success: false, completed: true }
          };
          newState = addLog(newState, '💀 远征失败！全军覆没...', 'error');
          syncRewardsToLegion(newState);
        }
      }

      return newState;
    }),

    selectBlessing: (blessing) => update(state => {
      if (!state.active || state.phase !== 'event_view') return state;
      if (state.currentNode?.eventType !== EXPEDITION_EVENT_TYPES.SHRINE) return state;

      const result = applyShrineBlessing(state, blessing);

      let newState = {
        ...state,
        ...result.changes,
        phase: 'shrine_result',
        eventResult: {
          ...state.eventResult,
          blessing: result.blessing
        },
        currentEvent: {
          ...state.currentEvent,
          used: true
        }
      };

      newState = addLog(newState, result.message, 'success');

      return newState;
    }),

    useRest: () => update(state => {
      if (!state.active || state.phase !== 'event_view') return state;
      if (state.currentNode?.eventType !== EXPEDITION_EVENT_TYPES.REST) return state;

      const result = applyRest(state, state.currentEvent);

      let newState = {
        ...state,
        ...result.changes,
        phase: 'rest_result',
        eventResult: { message: result.message },
        currentEvent: {
          ...state.currentEvent,
          used: true
        }
      };

      newState = addLog(newState, result.message, 'success');

      return newState;
    }),

    purchaseShopItem: (itemId) => update(state => {
      if (!state.active || state.phase !== 'event_view') return state;
      if (state.currentNode?.eventType !== EXPEDITION_EVENT_TYPES.SHOP) return state;

      const shopData = state.currentEvent;
      const item = shopData.availableItems?.find(i => i.id === itemId);
      if (!item || item.purchased) return state;

      const discount = state.shopDiscount < 1 ? state.shopDiscount : (shopData.discount || 1.0);
      const finalPrice = Math.floor(item.price * discount);

      if (state.gold < finalPrice) return state;

      const newItems = shopData.availableItems.map(i =>
        i.id === itemId ? { ...i, purchased: true } : i
      );

      let purchaseChanges = { gold: state.gold - finalPrice };

      switch (item.type) {
        case 'heal':
          purchaseChanges.roster = state.roster.map(u => ({
            ...u,
            currentHp: Math.min(u.maxHp, u.currentHp + 30)
          }));
          break;
        case 'buff':
          purchaseChanges.activeBuffs = [
            ...(state.activeBuffs || []),
            { id: generateId(), type: 'attackBoost', value: 0.2, duration: 3 }
          ];
          break;
        case 'card':
          const rarity = Math.random() < 0.3 ? _CARD_RARITY.RARE : _CARD_RARITY.BASIC;
          const cardPool = _eventCards.filter(c => c.rarity === rarity);
          if (cardPool.length > 0) {
            const card = cardPool[Math.floor(Math.random() * cardPool.length)];
            purchaseChanges.cards = [...state.cards, { ...card, instanceId: generateId() }];
          }
          break;
        case 'equipment':
          const loot = _generateLoot(_DROP_SOURCES.CHEST, { itemCount: 1 });
          purchaseChanges.equipment = [...state.equipment, ...loot];
          break;
      }

      let newState = {
        ...state,
        ...purchaseChanges,
        currentEvent: {
          ...shopData,
          availableItems: newItems
        }
      };

      newState = addLog(newState, `购买了商品，花费 ${finalPrice} 金币`, 'info');

      return newState;
    }),

    returnToMap: () => update(state => {
      if (!state.active) return state;
      if (!['battle_result', 'supply_result', 'event_result', 'shrine_result', 'rest_result'].includes(state.phase)) {
        return state;
      }

      const availableNodes = getAvailableNodes(state.map);
      const isComplete = state.map.completed || state.completed;

      if (isComplete) {
        return state;
      }

      if (availableNodes.length === 0 && !state.map.completed) {
        let newState = {
          ...state,
          phase: 'defeat',
          completed: true,
          finalScore: calculateExpeditionScore(state),
          map: { ...state.map, success: false, completed: true }
        };
        newState = addLog(newState, '💀 远征失败！无路可走...', 'error');
        syncRewardsToLegion(newState);
        return newState;
      }

      return {
        ...state,
        phase: 'map_view',
        currentNode: null,
        currentEvent: null,
        battleResult: null,
        eventResult: null,
        supplyResult: null
      };
    }),

    abandonExpedition: () => update(state => {
      if (!state.active) return state;

      let newState = {
        ...state,
        phase: 'defeat',
        completed: true,
        active: false,
        finalScore: calculateExpeditionScore(state),
        map: state.map ? { ...state.map, success: false, completed: true } : null
      };

      newState = addLog(newState, '远征已放弃', 'warning');
      syncRewardsToLegion(newState);

      return newState;
    }),

    reset: () => {
      set(createInitialExpeditionState());
    }
  };
}

export const expeditionStore = createExpeditionStore();

export const availableNodes = derived(expeditionStore, $store => {
  if (!$store.map) return [];
  return getAvailableNodes($store.map);
});

export const expeditionProgress = derived(expeditionStore, $store => {
  if (!$store.map) return { current: 0, total: 0, percent: 0 };
  const current = $store.map.currentLayer;
  const total = $store.map.totalLayers;
  return {
    current,
    total,
    percent: total > 0 ? Math.floor((current / total) * 100) : 0
  };
});

export const rosterAliveCount = derived(expeditionStore, $store => {
  return $store.roster.filter(u => u.currentHp > 0).length;
});

export const totalRosterPower = derived(expeditionStore, $store => {
  return $store.roster.reduce((sum, u) => {
    if (u.currentHp <= 0) return sum;
    return sum + (u.attack || 0) + (u.defense || 0) + Math.floor(u.maxHp / 10);
  }, 0);
});

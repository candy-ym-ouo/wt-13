// @ts-nocheck
import { writable, derived } from 'svelte/store';
import {
  RECRUIT_COST,
  LINEUP_CONFIG,
  LEVEL_CONFIG,
  RARITY_CONFIG
} from '$lib/config/legionConfig.js';
import {
  createInitialLegionData,
  loadLegionData,
  saveLegionData,
  recruitSingle,
  recruitTen,
  addExpToUnit,
  allocateStatPoint,
  canPromote,
  promoteUnit,
  canSetSpecialization,
  setSpecialization,
  createLineup,
  addUnitToLineup,
  removeUnitFromLineup,
  calculateBattleRewards,
  saveBattleRecord
} from '$lib/utils/legionSystem.js';

function createLegionStore() {
  const savedData = loadLegionData();
  const initialData = savedData || createInitialLegionData();
  
  const { subscribe, set, update } = writable(initialData);
  
  let autoSaveEnabled = true;
  
  function enableAutoSave() {
    autoSaveEnabled = true;
  }
  
  function disableAutoSave() {
    autoSaveEnabled = false;
  }
  
  subscribe(state => {
    if (autoSaveEnabled && state) {
      saveLegionData(state);
    }
  });
  
  return {
    subscribe,
    set,
    update,
    enableAutoSave,
    disableAutoSave,
    
    reset: () => {
      const newData = createInitialLegionData();
      set(newData);
      return newData;
    },
    
    recruitSingle: () => update(state => {
      if ((state.currency.gold || 0) < RECRUIT_COST.single) {
        return { ...state, lastRecruitResult: { success: false, reason: '金币不足' } };
      }
      
      const newUnit = recruitSingle(state.recruitPity);
      if (!newUnit) {
        return { ...state, lastRecruitResult: { success: false, reason: '招募失败' } };
      }
      
      let newPity = state.recruitPity + 1;
      if (newUnit.rarity === 'LEGENDARY') {
        newPity = 0;
      } else if (newUnit.rarity === 'EPIC') {
        newPity = Math.max(0, newPity - 50);
      }
      
      return {
        ...state,
        units: [...state.units, newUnit],
        currency: {
          ...state.currency,
          gold: state.currency.gold - RECRUIT_COST.single
        },
        recruitPity: newPity,
        stats: {
          ...state.stats,
          totalRecruits: state.stats.totalRecruits + 1
        },
        lastRecruitResult: { success: true, units: [newUnit], isNew: true }
      };
    }),
    
    recruitTen: () => update(state => {
      if ((state.currency.gold || 0) < RECRUIT_COST.ten) {
        return { ...state, lastRecruitResult: { success: false, reason: '金币不足' } };
      }
      
      const result = recruitTen(state.recruitPity);
      const validUnits = result.units.filter(Boolean);
      
      return {
        ...state,
        units: [...state.units, ...validUnits],
        currency: {
          ...state.currency,
          gold: state.currency.gold - RECRUIT_COST.ten
        },
        recruitPity: result.newPity,
        stats: {
          ...state.stats,
          totalRecruits: state.stats.totalRecruits + validUnits.length
        },
        lastRecruitResult: { success: true, units: validUnits, isNew: true }
      };
    }),
    
    useRecruitTicket: (count = 1) => update(state => {
      const ticketCount = state.currency.recruitTicket || 0;
      if (ticketCount < count) {
        return { ...state, lastRecruitResult: { success: false, reason: '招募券不足' } };
      }
      
      let units = [];
      let newPity = state.recruitPity;
      
      if (count === 10) {
        const result = recruitTen(newPity);
        units = result.units.filter(Boolean);
        newPity = result.newPity;
      } else {
        for (let i = 0; i < count; i++) {
          const unit = recruitSingle(newPity);
          if (unit) {
            units.push(unit);
            if (unit.rarity === 'LEGENDARY') {
              newPity = 0;
            } else if (unit.rarity === 'EPIC') {
              newPity = Math.max(0, newPity - 50);
            } else {
              newPity++;
            }
          }
        }
      }
      
      return {
        ...state,
        units: [...state.units, ...units],
        currency: {
          ...state.currency,
          recruitTicket: ticketCount - count
        },
        recruitPity: newPity,
        stats: {
          ...state.stats,
          totalRecruits: state.stats.totalRecruits + units.length
        },
        lastRecruitResult: { success: true, units, isNew: true }
      };
    }),
    
    clearRecruitResult: () => update(state => ({
      ...state,
      lastRecruitResult: null
    })),
    
    addExpToUnit: (unitId, expAmount) => update(state => {
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const result = addExpToUnit(state.units[unitIndex], expAmount);
      if (!result.unit) return state;
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = result.unit;
      
      return {
        ...state,
        units: newUnits,
        lastLevelUp: result.leveledUp ? {
          unitId,
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          statPointsGained: result.statPointsGained || 0
        } : null
      };
    }),
    
    useExpBook: (unitId, count = 1) => update(state => {
      const expBookCount = state.currency.expBook || 0;
      if (expBookCount < count) return state;
      
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const expPerBook = 100;
      const totalExp = expPerBook * count;
      
      const result = addExpToUnit(state.units[unitIndex], totalExp);
      if (!result.unit) return state;
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = result.unit;
      
      return {
        ...state,
        units: newUnits,
        currency: {
          ...state.currency,
          expBook: expBookCount - count
        },
        lastLevelUp: result.leveledUp ? {
          unitId,
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          statPointsGained: result.statPointsGained || 0
        } : null
      };
    }),
    
    allocateStat: (unitId, statType) => update(state => {
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const updatedUnit = allocateStatPoint(state.units[unitIndex], statType);
      if (!updatedUnit) return state;
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = updatedUnit;
      
      return { ...state, units: newUnits };
    }),
    
    promoteUnit: (unitId) => update(state => {
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const unit = state.units[unitIndex];
      const result = promoteUnit(unit, state.currency);
      
      if (!result.success) {
        return { ...state, lastPromoteResult: { success: false, reason: result.reason } };
      }
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = result.unit;
      
      return {
        ...state,
        units: newUnits,
        currency: {
          ...state.currency,
          promotionStone: (state.currency.promotionStone || 0) - result.stoneCost
        },
        lastPromoteResult: {
          success: true,
          unitId,
          newPromotion: result.unit.promotion,
          unlocksSpecialization: result.unlocksSpecialization
        }
      };
    }),
    
    clearPromoteResult: () => update(state => ({
      ...state,
      lastPromoteResult: null
    })),
    
    setSpecialization: (unitId, specializationId) => update(state => {
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const updatedUnit = setSpecialization(state.units[unitIndex], specializationId);
      if (!updatedUnit) return state;
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = updatedUnit;
      
      return { ...state, units: newUnits };
    }),
    
    createLineup: (name) => update(state => {
      if (state.lineups.length >= LINEUP_CONFIG.maxLineups) return state;
      
      const newLineup = createLineup(name);
      return {
        ...state,
        lineups: [...state.lineups, newLineup]
      };
    }),
    
    renameLineup: (lineupId, newName) => update(state => {
      const lineupIndex = state.lineups.findIndex(l => l.id === lineupId);
      if (lineupIndex === -1) return state;
      
      const newLineups = [...state.lineups];
      newLineups[lineupIndex] = {
        ...newLineups[lineupIndex],
        name: newName,
        updatedAt: Date.now()
      };
      
      return { ...state, lineups: newLineups };
    }),
    
    deleteLineup: (lineupId) => update(state => {
      const newLineups = state.lineups.filter(l => l.id !== lineupId);
      let newActiveId = state.activeLineupId;
      
      if (state.activeLineupId === lineupId && newLineups.length > 0) {
        newActiveId = newLineups[0].id;
      } else if (newLineups.length === 0) {
        newActiveId = null;
      }
      
      return {
        ...state,
        lineups: newLineups,
        activeLineupId: newActiveId
      };
    }),
    
    setActiveLineup: (lineupId) => update(state => {
      if (!state.lineups.some(l => l.id === lineupId)) return state;
      return { ...state, activeLineupId: lineupId };
    }),
    
    addUnitToLineup: (lineupId, unitId) => update(state => {
      const lineupIndex = state.lineups.findIndex(l => l.id === lineupId);
      if (lineupIndex === -1) return state;
      
      const newLineups = [...state.lineups];
      newLineups[lineupIndex] = addUnitToLineup(newLineups[lineupIndex], unitId);
      
      return { ...state, lineups: newLineups };
    }),
    
    removeUnitFromLineup: (lineupId, unitId) => update(state => {
      const lineupIndex = state.lineups.findIndex(l => l.id === lineupId);
      if (lineupIndex === -1) return state;
      
      const newLineups = [...state.lineups];
      newLineups[lineupIndex] = removeUnitFromLineup(newLineups[lineupIndex], unitId);
      
      return { ...state, lineups: newLineups };
    }),
    
    processBattleResult: (result, participatingUnitIds = [], bonusMultiplier = 1) => update(state => {
      const rewards = calculateBattleRewards(result, bonusMultiplier);
      
      const newUnits = state.units.map(unit => {
        if (participatingUnitIds.includes(unit.id)) {
          const expResult = addExpToUnit(unit, rewards.exp);
          return {
            ...expResult.unit,
            battleCount: (unit.battleCount || 0) + 1
          };
        }
        return unit;
      });
      
      const newCurrency = {
        ...state.currency,
        gold: (state.currency.gold || 0) + rewards.gold
      };
      
      for (const [itemType, count] of Object.entries(rewards.items)) {
        if (newCurrency[itemType] !== undefined) {
          newCurrency[itemType] = (newCurrency[itemType] || 0) + count;
        }
      }
      
      const newStats = {
        ...state.stats,
        totalBattles: state.stats.totalBattles + 1,
        totalWins: state.stats.totalWins + (result === 'win' ? 1 : 0),
        totalLosses: state.stats.totalLosses + (result === 'lose' ? 1 : 0),
        totalDraws: state.stats.totalDraws + (result === 'draw' ? 1 : 0),
        totalCardsCollected: state.stats.totalCardsCollected + rewards.cards.length
      };
      
      const record = {
        result,
        rewards,
        participatingUnitIds,
        bonusMultiplier
      };
      saveBattleRecord(record);
      
      return {
        ...state,
        units: newUnits,
        currency: newCurrency,
        stats: newStats,
        lastBattleResult: {
          result,
          rewards,
          participatingUnitIds
        }
      };
    }),
    
    clearBattleResult: () => update(state => ({
      ...state,
      lastBattleResult: null
    })),
    
    addCurrency: (type, amount) => update(state => {
      if (state.currency[type] === undefined) return state;
      return {
        ...state,
        currency: {
          ...state.currency,
          [type]: Math.max(0, (state.currency[type] || 0) + amount)
        }
      };
    }),
    
    updateUnitKillCount: (unitId, kills = 1) => update(state => {
      const unitIndex = state.units.findIndex(u => u.id === unitId);
      if (unitIndex === -1) return state;
      
      const newUnits = [...state.units];
      newUnits[unitIndex] = {
        ...newUnits[unitIndex],
        killCount: (newUnits[unitIndex].killCount || 0) + kills
      };
      
      return { ...state, units: newUnits };
    })
  };
}

export const legionStore = createLegionStore();

export const activeLineup = derived(legionStore, $legion => {
  if (!$legion.activeLineupId) return null;
  return $legion.lineups.find(l => l.id === $legion.activeLineupId) || null;
});

export const activeLineupUnits = derived(legionStore, $legion => {
  if (!$legion.activeLineupId) return [];
  const lineup = $legion.lineups.find(l => l.id === $legion.activeLineupId);
  if (!lineup) return [];
  return lineup.unitIds.map(id => $legion.units.find(u => u.id === id)).filter(Boolean);
});

export const unitsByType = derived(legionStore, $legion => {
  const grouped = {};
  for (const unit of $legion.units) {
    if (!grouped[unit.type]) {
      grouped[unit.type] = [];
    }
    grouped[unit.type].push(unit);
  }
  return grouped;
});

export const unitsByRarity = derived(legionStore, $legion => {
  const grouped = {};
  for (const unit of $legion.units) {
    if (!grouped[unit.rarity]) {
      grouped[unit.rarity] = [];
    }
    grouped[unit.rarity].push(unit);
  }
  return grouped;
});

export const totalPower = derived(legionStore, $legion => {
  return $legion.units.reduce((sum, unit) => {
    const stats = unit.stats || {};
    return sum + (stats.attack || 0) + (stats.defense || 0) + Math.floor((stats.maxHp || 0) / 10);
  }, 0);
});

export const lineupPower = derived(activeLineupUnits, $units => {
  return $units.reduce((sum, unit) => {
    const stats = unit.stats || {};
    return sum + (stats.attack || 0) + (stats.defense || 0) + Math.floor((stats.maxHp || 0) / 10);
  }, 0);
});

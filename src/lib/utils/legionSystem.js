// @ts-nocheck
import { 
  LEGION_STORAGE_KEY, 
  LEGION_RECORDS_KEY,
  RARITY_CONFIG,
  RECRUIT_POOL,
  RECRUIT_COST,
  GUARANTEE_RULES,
  LEVEL_CONFIG,
  PROMOTION_CONFIG,
  CURRENCY_CONFIG,
  LINEUP_CONFIG,
  BATTLE_REWARDS,
  CARD_REWARD_POOL,
  calculateUnitStats,
  getExpToNextLevel,
  rollRecruitRarity,
  getRecruitPoolForRarity
} from '$lib/config/legionConfig.js';
import { unitConfig, SPECIALIZATION_CONFIG } from '$lib/config/unitConfig.js';

export function generateUnitId() {
  return `legion_unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createLegionUnit(unitType, rarity) {
  const baseConfig = unitConfig[unitType];
  if (!baseConfig) return null;

  const id = generateUnitId();
  const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.COMMON;
  
  const unit = {
    id,
    type: unitType,
    name: baseConfig.name,
    rarity,
    level: 1,
    exp: 0,
    promotion: 0,
    statPoints: 0,
    allocatedStats: { atk: 0, def: 0, hp: 0, move: 0 },
    specialization: null,
    stats: calculateUnitStats({ type: unitType }, 1, rarity, 0, { atk: 0, def: 0, hp: 0, move: 0 }, null),
    acquiredAt: Date.now(),
    battleCount: 0,
    killCount: 0,
    totalExpGained: 0
  };
  
  return unit;
}

export function recruitSingle(pityCounter = 0) {
  const rarity = rollRecruitRarity(pityCounter);
  const pool = getRecruitPoolForRarity(rarity);
  
  if (pool.length === 0) {
    return createLegionUnit('infantry', 'COMMON');
  }
  
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) {
      return createLegionUnit(item.unitType, rarity);
    }
  }
  
  return createLegionUnit(pool[0].unitType, rarity);
}

export function recruitTen(currentPity = 0) {
  const results = [];
  let pity = currentPity;
  let hasRareOrAbove = false;
  
  for (let i = 0; i < 10; i++) {
    const isLast = i === 9;
    let unit;
    
    if (isLast && !hasRareOrAbove && GUARANTEE_RULES.tenPullGuaranteeRare) {
      const rareRarities = ['RARE', 'EPIC', 'LEGENDARY'];
      const guaranteedRarity = rareRarities[Math.floor(Math.random() * rareRarities.length)];
      const pool = getRecruitPoolForRarity(guaranteedRarity);
      if (pool.length > 0) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        unit = createLegionUnit(item.unitType, guaranteedRarity);
      } else {
        unit = recruitSingle(pity);
      }
    } else {
      unit = recruitSingle(pity);
    }
    
    if (unit) {
      results.push(unit);
      const rarityIndex = Object.keys(RARITY_CONFIG).indexOf(unit.rarity);
      if (rarityIndex >= Object.keys(RARITY_CONFIG).indexOf('RARE')) {
        hasRareOrAbove = true;
      }
      
      if (unit.rarity === 'LEGENDARY') {
        pity = 0;
      } else if (unit.rarity === 'EPIC') {
        pity = Math.max(0, pity - GUARANTEE_RULES.pityPullsForEpic);
      } else {
        pity++;
      }
    }
  }
  
  return { units: results, newPity: pity };
}

export function addExpToUnit(unit, expAmount) {
  if (!unit || expAmount <= 0) return { unit, leveledUp: false, oldLevel: unit?.level || 1, newLevel: unit?.level || 1 };
  
  const rarityBonus = RARITY_CONFIG[unit.rarity]?.expBonus || 1.0;
  const actualExp = Math.floor(expAmount * rarityBonus);
  
  let newExp = unit.exp + actualExp;
  let newLevel = unit.level;
  let statPointsGained = 0;
  
  const oldLevel = unit.level;
  
  while (newLevel < LEVEL_CONFIG.maxLevel) {
    const expNeeded = getExpToNextLevel(newLevel);
    if (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      statPointsGained += LEVEL_CONFIG.statPointsPerLevel;
    } else {
      break;
    }
  }
  
  if (newLevel > LEVEL_CONFIG.maxLevel) {
    newLevel = LEVEL_CONFIG.maxLevel;
    newExp = 0;
  }
  
  const updatedUnit = {
    ...unit,
    level: newLevel,
    exp: newExp,
    statPoints: (unit.statPoints || 0) + statPointsGained,
    totalExpGained: (unit.totalExpGained || 0) + actualExp,
    stats: calculateUnitStats(
      { type: unit.type },
      newLevel,
      unit.rarity,
      unit.promotion,
      unit.allocatedStats,
      unit.specialization
    )
  };
  
  return {
    unit: updatedUnit,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    statPointsGained
  };
}

export function allocateStatPoint(unit, statType) {
  if (!unit || unit.statPoints <= 0) return null;
  
  const validStats = ['atk', 'def', 'hp', 'move'];
  if (!validStats.includes(statType)) return null;
  
  const newAllocatedStats = {
    ...unit.allocatedStats,
    [statType]: (unit.allocatedStats[statType] || 0) + 1
  };
  
  const updatedUnit = {
    ...unit,
    statPoints: unit.statPoints - 1,
    allocatedStats: newAllocatedStats,
    stats: calculateUnitStats(
      { type: unit.type },
      unit.level,
      unit.rarity,
      unit.promotion,
      newAllocatedStats,
      unit.specialization
    )
  };
  
  return updatedUnit;
}

export function canPromote(unit) {
  if (!unit) return false;
  const nextPromotion = unit.promotion + 1;
  if (nextPromotion > LEVEL_CONFIG.promotionCount) return false;
  
  const promoConfig = PROMOTION_CONFIG[nextPromotion];
  if (!promoConfig) return false;
  
  return unit.level >= promoConfig.level;
}

export function promoteUnit(unit, currency) {
  if (!canPromote(unit)) return { success: false, reason: '不满足晋升条件' };
  
  const nextPromotion = unit.promotion + 1;
  const promoConfig = PROMOTION_CONFIG[nextPromotion];
  
  if ((currency.promotionStone || 0) < promoConfig.cost) {
    return { success: false, reason: '晋升石不足' };
  }
  
  const newPromotion = unit.promotion + 1;
  const updatedUnit = {
    ...unit,
    promotion: newPromotion,
    stats: calculateUnitStats(
      { type: unit.type },
      unit.level,
      unit.rarity,
      newPromotion,
      unit.allocatedStats,
      unit.specialization
    )
  };
  
  return {
    success: true,
    unit: updatedUnit,
    stoneCost: promoConfig.cost,
    unlocksSpecialization: promoConfig.unlockSpecialization
  };
}

export function canSetSpecialization(unit) {
  if (!unit || unit.specialization) return false;
  return unit.promotion >= 2;
}

export function getAvailableSpecializations(unitType) {
  return SPECIALIZATION_CONFIG[unitType] || [];
}

export function setSpecialization(unit, specializationId) {
  if (!canSetSpecialization(unit)) return null;
  
  const available = getAvailableSpecializations(unit.type);
  const spec = available.find(s => s.id === specializationId);
  if (!spec) return null;
  
  const updatedUnit = {
    ...unit,
    specialization: specializationId,
    stats: calculateUnitStats(
      { type: unit.type },
      unit.level,
      unit.rarity,
      unit.promotion,
      unit.allocatedStats,
      specializationId
    )
  };
  
  return updatedUnit;
}

export function createLineup(name, unitIds = []) {
  return {
    id: `lineup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || LINEUP_CONFIG.defaultName,
    unitIds: [...unitIds],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function addUnitToLineup(lineup, unitId) {
  if (!lineup || lineup.unitIds.includes(unitId)) return lineup;
  if (lineup.unitIds.length >= LINEUP_CONFIG.maxUnitsPerLineup) return lineup;
  
  return {
    ...lineup,
    unitIds: [...lineup.unitIds, unitId],
    updatedAt: Date.now()
  };
}

export function removeUnitFromLineup(lineup, unitId) {
  if (!lineup) return lineup;
  
  return {
    ...lineup,
    unitIds: lineup.unitIds.filter(id => id !== unitId),
    updatedAt: Date.now()
  };
}

export function calculateBattleRewards(result, bonusMultiplier = 1) {
  const rewardConfig = BATTLE_REWARDS[result] || BATTLE_REWARDS.lose;
  
  const gold = Math.floor((rewardConfig.gold[0] + Math.random() * (rewardConfig.gold[1] - rewardConfig.gold[0])) * bonusMultiplier);
  const exp = Math.floor((rewardConfig.exp[0] + Math.random() * (rewardConfig.exp[1] - rewardConfig.exp[0])) * bonusMultiplier);
  
  const cards = [];
  const cardCount = rewardConfig.cards.min + Math.floor(Math.random() * (rewardConfig.cards.max - rewardConfig.cards.min + 1));
  
  for (let i = 0; i < cardCount; i++) {
    const card = rollCardReward(rewardConfig.cards.rarityBoost);
    if (card) cards.push(card);
  }
  
  const items = {};
  for (const [itemType, chance] of Object.entries(rewardConfig.items)) {
    if (Math.random() < chance) {
      items[itemType] = 1 + Math.floor(Math.random() * 2);
    }
  }
  
  return { gold, exp, cards, items };
}

function rollCardReward(rarityBoost = 0) {
  const pool = CARD_REWARD_POOL;
  if (pool.length === 0) return null;
  
  let totalWeight = pool.reduce((sum, card) => {
    let weight = card.dropWeight;
    if (card.rarity !== 'basic') {
      weight *= (1 + rarityBoost);
    }
    return sum + weight;
  }, 0);
  
  let roll = Math.random() * totalWeight;
  
  for (const card of pool) {
    let weight = card.dropWeight;
    if (card.rarity !== 'basic') {
      weight *= (1 + rarityBoost);
    }
    roll -= weight;
    if (roll <= 0) {
      return {
        id: card.id,
        name: card.name,
        rarity: card.rarity,
        icon: card.icon,
        description: card.description
      };
    }
  }
  
  return null;
}

export function saveLegionData(data) {
  try {
    localStorage.setItem(LEGION_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('保存军团数据失败:', e);
    return false;
  }
}

export function loadLegionData() {
  try {
    const data = localStorage.getItem(LEGION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('加载军团数据失败:', e);
    return null;
  }
}

export function saveBattleRecord(record) {
  try {
    const records = getBattleRecords();
    records.unshift({
      ...record,
      id: Date.now(),
      timestamp: Date.now()
    });
    if (records.length > 100) {
      records.length = 100;
    }
    localStorage.setItem(LEGION_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('保存战斗记录失败:', e);
    return false;
  }
}

export function getBattleRecords() {
  try {
    const data = localStorage.getItem(LEGION_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取战斗记录失败:', e);
    return [];
  }
}

export function createInitialLegionData() {
  const initialUnits = [
    createLegionUnit('infantry', 'COMMON'),
    createLegionUnit('infantry', 'COMMON'),
    createLegionUnit('cavalry', 'UNCOMMON'),
    createLegionUnit('archer', 'COMMON'),
    createLegionUnit('mage', 'UNCOMMON'),
    createLegionUnit('tank', 'COMMON')
  ].filter(Boolean);
  
  const initialLineup = createLineup('初始阵容', initialUnits.slice(0, 6).map(u => u.id));
  
  return {
    units: initialUnits,
    lineups: [initialLineup],
    activeLineupId: initialLineup.id,
    currency: {
      gold: CURRENCY_CONFIG.gold.initial,
      recruitTicket: CURRENCY_CONFIG.recruitTicket.initial,
      promotionStone: CURRENCY_CONFIG.promotionStone.initial,
      expBook: CURRENCY_CONFIG.expBook.initial
    },
    recruitPity: 0,
    stats: {
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      totalRecruits: 0,
      totalCardsCollected: 0
    }
  };
}

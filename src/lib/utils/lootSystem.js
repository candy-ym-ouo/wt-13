import { equipmentConfig, RARITIES, getRarityInfo } from '$lib/config/equipmentConfig.js';

export const DROP_SOURCES = {
  ENEMY_DEFEAT: 'enemy_defeat',
  CHEST: 'chest',
  BOSS: 'boss',
  SHRINE: 'shrine',
  QUEST_REWARD: 'quest_reward'
};

export const RARITY_DROP_RATES = {
  [DROP_SOURCES.ENEMY_DEFEAT]: {
    COMMON: 0.6,
    UNCOMMON: 0.25,
    RARE: 0.12,
    EPIC: 0.03,
    LEGENDARY: 0.0
  },
  [DROP_SOURCES.CHEST]: {
    COMMON: 0.4,
    UNCOMMON: 0.35,
    RARE: 0.18,
    EPIC: 0.06,
    LEGENDARY: 0.01
  },
  [DROP_SOURCES.BOSS]: {
    COMMON: 0.1,
    UNCOMMON: 0.25,
    RARE: 0.35,
    EPIC: 0.22,
    LEGENDARY: 0.08
  },
  [DROP_SOURCES.SHRINE]: {
    COMMON: 0.0,
    UNCOMMON: 0.2,
    RARE: 0.4,
    EPIC: 0.3,
    LEGENDARY: 0.1
  }
};

const EQUIPMENT_BY_RARITY = {};

function initEquipmentByRarity() {
  for (const rarity of Object.values(RARITIES)) {
    EQUIPMENT_BY_RARITY[rarity] = [];
  }
  
  for (const [id, item] of Object.entries(equipmentConfig)) {
    if (!EQUIPMENT_BY_RARITY[item.rarity]) {
      EQUIPMENT_BY_RARITY[item.rarity] = [];
    }
    EQUIPMENT_BY_RARITY[item.rarity].push(id);
  }
}

initEquipmentByRarity();

function generateUniqueId() {
  return 'eq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function selectRarity(dropRates, luckBonus = 0) {
  const rarities = [RARITIES.LEGENDARY, RARITIES.EPIC, RARITIES.RARE, RARITIES.UNCOMMON, RARITIES.COMMON];
  
  let roll = Math.random() + luckBonus;
  
  for (const rarity of rarities) {
    const rate = dropRates[rarity] || 0;
    if (roll < rate) {
      return rarity;
    }
    roll -= rate;
  }
  
  return RARITIES.COMMON;
}

function selectRandomEquipment(rarity, allowedTypes = null) {
  let pool = EQUIPMENT_BY_RARITY[rarity] || [];
  
  if (allowedTypes && allowedTypes.length > 0) {
    pool = pool.filter(id => {
      const item = equipmentConfig[id];
      return item && (!item.allowedTypes || item.allowedTypes.some(t => allowedTypes.includes(t)));
    });
  }
  
  if (pool.length === 0) {
    pool = EQUIPMENT_BY_RARITY[RARITIES.COMMON] || [];
  }
  
  if (pool.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function createEquipmentInstance(equipmentId, options = {}) {
  const template = equipmentConfig[equipmentId];
  if (!template) return null;
  
  const level = options.level || 1;
  const enhancement = options.enhancement || 0;
  
  return {
    ...template,
    instanceId: generateUniqueId(),
    level,
    enhancement,
    acquiredFrom: options.source || 'unknown',
    acquiredAt: Date.now()
  };
}

export function generateLoot(sourceType, options = {}) {
  const dropRates = RARITY_DROP_RATES[sourceType] || RARITY_DROP_RATES[DROP_SOURCES.ENEMY_DEFEAT];
  const luckBonus = options.luckBonus || 0;
  const itemCount = options.itemCount || 1;
  const allowedTypes = options.allowedTypes || null;
  const minRarity = options.minRarity || null;
  const guaranteedRarity = options.guaranteedRarity || null;
  
  const loot = [];
  
  for (let i = 0; i < itemCount; i++) {
    let rarity;
    
    if (guaranteedRarity && i === 0) {
      rarity = guaranteedRarity;
    } else if (minRarity) {
      rarity = selectRarity(dropRates, luckBonus);
      const rarityOrder = [RARITIES.COMMON, RARITIES.UNCOMMON, RARITIES.RARE, RARITIES.EPIC, RARITIES.LEGENDARY];
      const minIndex = rarityOrder.indexOf(minRarity);
      const currentIndex = rarityOrder.indexOf(rarity);
      if (currentIndex < minIndex) {
        rarity = minRarity;
      }
    } else {
      rarity = selectRarity(dropRates, luckBonus);
    }
    
    const equipmentId = selectRandomEquipment(rarity, allowedTypes);
    if (equipmentId) {
      const item = createEquipmentInstance(equipmentId, {
        source: sourceType,
        level: options.levelRange ? randomInRange(options.levelRange.min, options.levelRange.max) : 1
      });
      loot.push(item);
    }
  }
  
  return loot;
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function rollForDrop(dropChance, sourceType, options = {}) {
  if (Math.random() > dropChance) {
    return [];
  }
  return generateLoot(sourceType, options);
}

export function generateEnemyLoot(enemy, difficulty = 1) {
  const baseDropChance = 0.3 * difficulty;
  const luckBonus = (difficulty - 1) * 0.1;
  
  const itemCount = enemy.isBoss ? Math.floor(2 + difficulty) : (Math.random() < 0.3 ? 2 : 1);
  
  if (enemy.isBoss) {
    return generateLoot(DROP_SOURCES.BOSS, {
      itemCount,
      luckBonus: luckBonus + 0.1,
      guaranteedRarity: difficulty >= 2 ? RARITIES.RARE : RARITIES.UNCOMMON
    });
  }
  
  if (Math.random() < baseDropChance) {
    return generateLoot(DROP_SOURCES.ENEMY_DEFEAT, {
      itemCount: Math.random() < 0.2 ? 2 : 1,
      luckBonus
    });
  }
  
  return [];
}

export function generateChestLoot(chestType = 'normal', difficulty = 1) {
  const configs = {
    normal: {
      source: DROP_SOURCES.CHEST,
      itemCount: 1,
      luckBonus: 0
    },
    rare: {
      source: DROP_SOURCES.CHEST,
      itemCount: 2,
      luckBonus: 0.1,
      minRarity: RARITIES.UNCOMMON
    },
    epic: {
      source: DROP_SOURCES.SHRINE,
      itemCount: 2,
      luckBonus: 0.15,
      minRarity: RARITIES.RARE
    },
    legendary: {
      source: DROP_SOURCES.SHRINE,
      itemCount: 3,
      luckBonus: 0.2,
      guaranteedRarity: RARITIES.EPIC
    }
  };
  
  const config = configs[chestType] || configs.normal;
  
  return generateLoot(config.source, {
    itemCount: config.itemCount + Math.floor(difficulty / 2),
    luckBonus: config.luckBonus + (difficulty - 1) * 0.05,
    minRarity: config.minRarity,
    guaranteedRarity: config.guaranteedRarity,
    levelRange: {
      min: Math.max(1, Math.floor(difficulty * 2)),
      max: Math.ceil(difficulty * 3)
    }
  });
}

export function getLootValue(loot) {
  let totalValue = 0;
  
  for (const item of loot) {
    const rarityInfo = getRarityInfo(item.rarity);
    const baseValue = item.baseStats ? 
      Object.values(item.baseStats).reduce((sum, val) => sum + Math.abs(val), 0) * 10 : 50;
    const rarityMult = rarityInfo.statMultiplier;
    const levelMult = 1 + (item.level - 1) * 0.1;
    const enhanceMult = 1 + (item.enhancement || 0) * 0.15;
    
    totalValue += Math.floor(baseValue * rarityMult * levelMult * enhanceMult);
  }
  
  return totalValue;
}

export function canPickupLoot(unit, item) {
  if (!unit || !item) return false;
  if (!item.allowedTypes || item.allowedTypes.length === 0) return true;
  return item.allowedTypes.includes(unit.type);
}

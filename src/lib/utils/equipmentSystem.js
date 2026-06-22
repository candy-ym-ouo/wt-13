import { 
  equipmentConfig, 
  relicConfig, 
  EQUIPMENT_SETS, 
  EQUIPMENT_SLOTS,
  getAllEquipment,
  getEquipmentById,
  getSetById,
  getRarityInfo,
  canEquip
} from '$lib/config/equipmentConfig.js';
import { unitConfig, SPECIALIZATION_CONFIG } from '$lib/config/unitConfig.js';
import { gameRules } from '$lib/config/gameRules.js';

export function createEquipmentInstance(equipmentId, instanceId = null) {
  const equipment = getEquipmentById(equipmentId);
  if (!equipment) return null;

  return {
    id: instanceId || `equip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    equipmentId,
    level: 1,
    enhancement: 0,
    ...equipment
  };
}

export function calculateEquipmentStats(unit, equippedItems) {
  const baseStats = {
    attack: 0,
    defense: 0,
    maxHp: 0,
    moveRange: 0,
    attackRange: 0
  };

  if (!equippedItems || equippedItems.length === 0) {
    return baseStats;
  }

  for (const item of equippedItems) {
    if (!item || !item.baseStats) continue;
    
    const rarityMult = getRarityInfo(item.rarity || 'COMMON').statMultiplier;
    const levelBonus = 1 + (item.level - 1) * 0.05;
    const enhanceBonus = 1 + (item.enhancement || 0) * 0.02;
    const totalMult = rarityMult * levelBonus * enhanceBonus;

    if (item.baseStats.attack) {
      baseStats.attack += Math.floor(item.baseStats.attack * totalMult);
    }
    if (item.baseStats.defense) {
      baseStats.defense += Math.floor(item.baseStats.defense * totalMult);
    }
    if (item.baseStats.maxHp) {
      baseStats.maxHp += Math.floor(item.baseStats.maxHp * totalMult);
    }
    if (item.baseStats.moveRange) {
      baseStats.moveRange += item.baseStats.moveRange;
    }
    if (item.baseStats.attackRange) {
      baseStats.attackRange += item.baseStats.attackRange;
    }
  }

  return baseStats;
}

export function calculateSetBonuses(equippedItems) {
  const setCounts = {};
  
  if (!equippedItems || equippedItems.length === 0) {
    return { bonuses: [], activeSets: {} };
  }

  for (const item of equippedItems) {
    if (item && item.set) {
      setCounts[item.set] = (setCounts[item.set] || 0) + 1;
    }
  }

  const bonuses = [];
  const activeSets = {};

  for (const [setId, count] of Object.entries(setCounts)) {
    const setConfig = getSetById(setId);
    if (!setConfig || !setConfig.bonuses) continue;

    activeSets[setId] = {
      ...setConfig,
      pieceCount: count
    };

    const pieceCounts = Object.keys(setConfig.bonuses)
      .map(Number)
      .sort((a, b) => a - b);

    for (const pc of pieceCounts) {
      if (count >= pc) {
        const bonus = setConfig.bonuses[pc];
        bonuses.push({
          setId,
          setName: setConfig.name,
          setColor: setConfig.color,
          pieceCount: pc,
          ...bonus
        });
      }
    }
  }

  return { bonuses, activeSets };
}

export function getAllSpecialEffects(equippedItems) {
  const effects = [];

  if (!equippedItems || equippedItems.length === 0) {
    return effects;
  }

  for (const item of equippedItems) {
    if (item && item.specialEffects && item.specialEffects.length > 0) {
      for (const effect of item.specialEffects) {
        effects.push({
          ...effect,
          source: item.name,
          sourceId: item.equipmentId || item.id,
          rarity: item.rarity || 'COMMON'
        });
      }
    }
  }

  const { bonuses: setBonuses } = calculateSetBonuses(equippedItems);
  for (const bonus of setBonuses) {
    if (bonus.type && bonus.value !== undefined) {
      effects.push({
        type: bonus.type,
        value: bonus.value,
        description: bonus.label,
        source: bonus.setName,
        sourceId: bonus.setId,
        isSetBonus: true
      });
    }
  }

  return effects;
}

export function getSpecialEffectByType(effects, effectType) {
  return effects.filter(e => e.type === effectType);
}

export function calculateTotalAttack(unit, equippedItems) {
  const unitType = unit.type;
  const config = unitConfig[unitType];
  if (!config) return 0;

  let attack = config.attack;

  const growth = gameRules.experience?.statGrowth || { atk: 2, def: 1.5, hp: 10, move: 0.2 };
  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  attack += allocatedStats.atk * growth.atk;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    if (spec?.bonuses?.atk) {
      attack += spec.bonuses.atk;
    }
  }

  const equipStats = calculateEquipmentStats(unit, equippedItems);
  attack += equipStats.attack;

  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'attackBoost') {
        attack *= (1 + (buff.value || 0));
      }
    }
  }

  const effects = getAllSpecialEffects(equippedItems);
  const attackBoostEffects = getSpecialEffectByType(effects, 'attackBoost');
  for (const effect of attackBoostEffects) {
    attack *= (1 + (effect.value || 0));
  }

  return Math.floor(attack);
}

export function calculateTotalDefense(unit, equippedItems) {
  const unitType = unit.type;
  const config = unitConfig[unitType];
  if (!config) return 0;

  let defense = config.defense;

  const growth = gameRules.experience?.statGrowth || { atk: 2, def: 1.5, hp: 10, move: 0.2 };
  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  defense += (allocatedStats.def || 0) * growth.def;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    if (spec?.bonuses?.def) {
      defense += spec.bonuses.def;
    }
  }

  const equipStats = calculateEquipmentStats(unit, equippedItems);
  defense += equipStats.defense;

  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'defenseBoost') {
        defense *= (1 + (buff.value || 0));
      }
    }
  }

  const effects = getAllSpecialEffects(equippedItems);
  const defenseBoostEffects = getSpecialEffectByType(effects, 'defenseBoost');
  for (const effect of defenseBoostEffects) {
    defense *= (1 + (effect.value || 0));
  }

  return Math.floor(defense);
}

export function calculateTotalMaxHp(unit, equippedItems) {
  const unitType = unit.type;
  const config = unitConfig[unitType];
  if (!config) return 0;

  let maxHp = config.hp;

  const growth = gameRules.experience?.statGrowth || { atk: 2, def: 1.5, hp: 10, move: 0.2 };
  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  maxHp += (allocatedStats.hp || 0) * growth.hp;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    if (spec?.bonuses?.hp) {
      maxHp += spec.bonuses.hp;
    }
  }

  const equipStats = calculateEquipmentStats(unit, equippedItems);
  maxHp += equipStats.maxHp;

  const effects = getAllSpecialEffects(equippedItems);
  const hpBoostEffects = getSpecialEffectByType(effects, 'maxHpBoost');
  for (const effect of hpBoostEffects) {
    maxHp *= (1 + (effect.value || 0));
  }

  return Math.floor(maxHp);
}

export function calculateTotalMoveRange(unit, equippedItems) {
  const unitType = unit.type;
  const config = unitConfig[unitType];
  if (!config) return 0;

  let moveRange = config.moveRange;

  const growth = gameRules.experience?.statGrowth || { atk: 2, def: 1.5, hp: 10, move: 0.2 };
  const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
  moveRange += Math.floor((allocatedStats.move || 0) * growth.move);

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    if (spec?.bonuses?.move) {
      moveRange += spec.bonuses.move;
    }
  }

  const equipStats = calculateEquipmentStats(unit, equippedItems);
  moveRange += equipStats.moveRange;

  const effects = getAllSpecialEffects(equippedItems);
  const moveBoostEffects = getSpecialEffectByType(effects, 'moveBoost');
  for (const effect of moveBoostEffects) {
    moveRange += effect.value || 0;
  }

  return Math.floor(moveRange);
}

export function calculateTotalAttackRange(unit, equippedItems) {
  const unitType = unit.type;
  const config = unitConfig[unitType];
  if (!config) return 0;

  let attackRange = config.attackRange;

  if (unit.specialization) {
    const spec = SPECIALIZATION_CONFIG[unitType]?.find(s => s.id === unit.specialization);
    if (spec?.bonuses?.attackRange) {
      attackRange += spec.bonuses.attackRange;
    }
  }

  const equipStats = calculateEquipmentStats(unit, equippedItems);
  attackRange += equipStats.attackRange;

  const effects = getAllSpecialEffects(equippedItems);
  const rangeEffects = getSpecialEffectByType(effects, 'attackRange');
  for (const effect of rangeEffects) {
    attackRange += effect.value || 0;
  }

  return attackRange;
}

export function getEquippedItemsBySlot(equippedItems) {
  const result = {};
  for (const slot of Object.values(EQUIPMENT_SLOTS)) {
    result[slot] = null;
  }

  if (!equippedItems || equippedItems.length === 0) {
    return result;
  }

  for (const item of equippedItems) {
    if (item && item.slot) {
      result[item.slot] = item;
    }
  }

  return result;
}

export function equipItem(unit, equippedItems, item) {
  if (!item || !canEquip(unit.type, item)) {
    return { success: false, reason: '该单位无法装备此物品' };
  }

  const newEquipped = [...equippedItems];
  
  const existingIndex = newEquipped.findIndex(e => e.slot === item.slot);
  let unequipped = null;
  
  if (existingIndex !== -1) {
    unequipped = newEquipped[existingIndex];
    newEquipped[existingIndex] = item;
  } else {
    newEquipped.push(item);
  }

  return {
    success: true,
    equippedItems: newEquipped,
    unequipped
  };
}

export function unequipItem(equippedItems, slot) {
  const item = equippedItems.find(e => e.slot === slot);
  if (!item) {
    return { success: false, reason: '该槽位没有装备' };
  }

  const newEquipped = equippedItems.filter(e => e.slot !== slot);
  
  return {
    success: true,
    equippedItems: newEquipped,
    unequipped: item
  };
}

export function rollRandomEquipment(options = {}) {
  const { 
    rarity = null, 
    slot = null, 
    allowedTypes = null,
    isRelic = false 
  } = options;

  let pool = [];
  
  if (isRelic) {
    pool = Object.values(relicConfig);
  } else {
    pool = Object.values(equipmentConfig);
  }

  if (slot) {
    pool = pool.filter(e => e.slot === slot);
  }

  if (allowedTypes) {
    pool = pool.filter(e => e.allowedTypes?.some(t => allowedTypes.includes(t)));
  }

  if (pool.length === 0) {
    return null;
  }

  let selectedRarity = rarity;
  if (!selectedRarity) {
    selectedRarity = rollRandomRarity();
  }

  const rarityPool = pool.filter(e => e.rarity?.toUpperCase() === selectedRarity.toUpperCase());
  
  if (rarityPool.length === 0) {
    const rarities = Object.keys(getAllEquipment().reduce((acc, e) => {
      if (pool.some(p => p.id === e.id)) {
        acc[e.rarity] = true;
      }
      return acc;
    }, {}));
    if (rarities.length > 0) {
      selectedRarity = rarities[Math.floor(Math.random() * rarities.length)];
      const fallbackPool = pool.filter(e => e.rarity?.toUpperCase() === selectedRarity.toUpperCase());
      if (fallbackPool.length > 0) {
        const selected = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        return createEquipmentInstance(selected.id);
      }
    }
    return null;
  }

  const selected = rarityPool[Math.floor(Math.random() * rarityPool.length)];
  return createEquipmentInstance(selected.id);
}

export function rollRandomRarity() {
  const rarities = Object.entries(getRarityInfo('COMMON') && {} || {
    COMMON: 0.6,
    UNCOMMON: 0.25,
    RARE: 0.12,
    EPIC: 0.025,
    LEGENDARY: 0.005
  });

  const roll = Math.random();
  let cumulative = 0;

  const rates = {
    COMMON: 0.5,
    UNCOMMON: 0.3,
    RARE: 0.14,
    EPIC: 0.05,
    LEGENDARY: 0.01
  };

  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll <= cumulative) {
      return rarity;
    }
  }

  return 'COMMON';
}

export function enhanceEquipment(item) {
  if (!item) return { success: false };
  
  const maxEnhance = 10;
  if ((item.enhancement || 0) >= maxEnhance) {
    return { success: false, reason: '已达最大强化等级' };
  }

  const successRate = 1 - (item.enhancement || 0) * 0.08;
  const success = Math.random() < successRate;

  if (success) {
    return {
      success: true,
      item: {
        ...item,
        enhancement: (item.enhancement || 0) + 1
      }
    };
  } else {
    return {
      success: false,
      reason: '强化失败'
    };
  }
}

export function getEquipmentPower(item) {
  if (!item || !item.baseStats) return 0;
  
  const stats = item.baseStats;
  let power = 0;
  
  power += stats.attack || 0;
  power += stats.defense || 0;
  power += (stats.maxHp || 0) / 10;
  power += (stats.moveRange || 0) * 5;
  power += (stats.attackRange || 0) * 8;
  
  const rarityMult = getRarityInfo(item.rarity || 'COMMON').statMultiplier;
  power *= rarityMult;
  
  power *= (1 + (item.level - 1) * 0.05);
  power *= (1 + (item.enhancement || 0) * 0.02);
  
  return Math.floor(power);
}

export function getUnitEquipPower(unit, equippedItems) {
  let power = 0;
  
  for (const item of equippedItems) {
    power += getEquipmentPower(item);
  }
  
  const { activeSets } = calculateSetBonuses(equippedItems);
  const setBonusCount = Object.keys(activeSets).length;
  power += setBonusCount * 20;
  
  return power;
}

export { canEquip };

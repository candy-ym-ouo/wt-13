import { techConfig, TECH_BRANCHES, getTechById, getTechsByBranch } from '$lib/config/techTreeConfig.js';
import { unitConfig } from '$lib/config/unitConfig.js';
import { gameRules } from '$lib/config/gameRules.js';

export function createInitialTechState() {
  return {
    researchedTechs: [],
    researchInProgress: null,
    researchProgress: 0,
    researchQueue: [],
    techPoints: { red: 0, blue: 0 },
    unlockedUnits: { red: [], blue: [] },
    unlockedSpecializations: { red: [], blue: [] },
    unlockedSpells: { red: [], blue: [] }
  };
}

export function canResearchTech(techId, faction, techState, gold) {
  const tech = getTechById(techId);
  if (!tech) return { canResearch: false, reason: '科技不存在' };

  if (techState.researchedTechs.includes(techId)) {
    return { canResearch: false, reason: '已研究完成' };
  }

  if (techState.researchInProgress === techId) {
    return { canResearch: false, reason: '正在研究中' };
  }

  if (techState.researchQueue.includes(techId)) {
    return { canResearch: false, reason: '已在研究队列中' };
  }

  for (const reqId of tech.requires) {
    if (!techState.researchedTechs.includes(reqId)) {
      const reqTech = getTechById(reqId);
      return { canResearch: false, reason: `需要先研究：${reqTech?.name || reqId}` };
    }
  }

  if (gold < tech.cost) {
    return { canResearch: false, reason: '金币不足' };
  }

  return { canResearch: true, reason: '' };
}

export function startResearch(techId, faction, techState, gold) {
  const checkResult = canResearchTech(techId, faction, techState, gold);
  if (!checkResult.canResearch) {
    return { success: false, reason: checkResult.reason, techState, gold };
  }

  const tech = getTechById(techId);
  
  let newTechState = { ...techState };
  
  if (newTechState.researchInProgress) {
    newTechState.researchQueue = [...newTechState.researchQueue, techId];
  } else {
    newTechState.researchInProgress = techId;
    newTechState.researchProgress = 0;
  }

  const newGold = gold - tech.cost;

  return {
    success: true,
    techState: newTechState,
    gold: newGold
  };
}

export function cancelResearch(techId, techState, gold) {
  let newTechState = { ...techState };
  let refundGold = 0;
  const tech = getTechById(techId);

  if (newTechState.researchInProgress === techId) {
    refundGold = Math.floor(tech.cost * 0.5);
    newTechState.researchInProgress = null;
    newTechState.researchProgress = 0;
    
    if (newTechState.researchQueue.length > 0) {
      const nextTechId = newTechState.researchQueue[0];
      newTechState.researchInProgress = nextTechId;
      newTechState.researchProgress = 0;
      newTechState.researchQueue = newTechState.researchQueue.slice(1);
    }
  } else {
    const queueIndex = newTechState.researchQueue.indexOf(techId);
    if (queueIndex !== -1) {
      refundGold = Math.floor(tech.cost * 0.8);
      newTechState.researchQueue = newTechState.researchQueue.filter(id => id !== techId);
    }
  }

  return {
    success: refundGold > 0,
    techState: newTechState,
    gold: gold + refundGold,
    refundGold
  };
}

export function tickResearch(techState, faction) {
  let newTechState = { ...techState };
  let completedTechs = [];

  if (!newTechState.researchInProgress) {
    if (newTechState.researchQueue.length > 0) {
      const nextTechId = newTechState.researchQueue[0];
      newTechState.researchInProgress = nextTechId;
      newTechState.researchProgress = 0;
      newTechState.researchQueue = newTechState.researchQueue.slice(1);
    } else {
      return { techState: newTechState, completedTechs: [] };
    }
  }

  const currentTech = getTechById(newTechState.researchInProgress);
  if (!currentTech) {
    return { techState: newTechState, completedTechs: [] };
  }

  newTechState.researchProgress += 1;

  if (newTechState.researchProgress >= currentTech.researchTurns) {
    completedTechs.push(newTechState.researchInProgress);
    newTechState.researchedTechs = [...newTechState.researchedTechs, newTechState.researchInProgress];
    
    if (currentTech.unlocks && currentTech.unlocks.length > 0) {
      for (const unlockId of currentTech.unlocks) {
        if (unlockId.startsWith('elite_unit_') || unlockId.startsWith('unique_unit_')) {
          if (!newTechState.unlockedUnits[faction].includes(unlockId)) {
            newTechState.unlockedUnits[faction] = [...newTechState.unlockedUnits[faction], unlockId];
          }
        } else if (unlockId.startsWith('specialization_') || unlockId.includes('specialization')) {
          if (!newTechState.unlockedSpecializations[faction].includes(unlockId)) {
            newTechState.unlockedSpecializations[faction] = [...newTechState.unlockedSpecializations[faction], unlockId];
          }
        } else if (unlockId.startsWith('spell_') || unlockId.startsWith('unique_spell_')) {
          if (!newTechState.unlockedSpells[faction].includes(unlockId)) {
            newTechState.unlockedSpells[faction] = [...newTechState.unlockedSpells[faction], unlockId];
          }
        }
      }
    }

    if (newTechState.researchQueue.length > 0) {
      const nextTechId = newTechState.researchQueue[0];
      newTechState.researchInProgress = nextTechId;
      newTechState.researchProgress = 0;
      newTechState.researchQueue = newTechState.researchQueue.slice(1);
    } else {
      newTechState.researchInProgress = null;
      newTechState.researchProgress = 0;
    }
  }

  return { techState: newTechState, completedTechs };
}

export function calculateTechBonuses(researchedTechs) {
  const bonuses = {
    globalAttackBonus: 0,
    globalDefenseBonus: 0,
    globalHpBonus: 0,
    globalMoveBonus: 0,
    globalAttackMultiplier: 0,
    globalDefenseMultiplier: 0,
    globalHpMultiplier: 0,
    globalDamageReduction: 0,
    critChanceBonus: 0,
    expGainBonus: 0,
    unitTypeAttackBonus: {},
    unitTypeDefenseBonus: {},
    unitTypeHpBonus: {},
    unitTypeMoveBonus: {},
    unitTypeRangeBonus: {},
    unitTypeAttackMultiplier: {},
    baseGoldPerTurnBonus: 0,
    maintenanceCostReduction: 0,
    maintenanceFreeUnitsBonus: 0,
    unitCostReduction: 0,
    killGoldMultiplier: 0,
    damageToGoldMultiplier: 0,
    capturePointGoldMultiplier: 0,
    globalGoldMultiplier: 0,
    startingGoldBonus: 0,
    baseDurabilityBonus: 0,
    baseDurabilityMultiplier: 0,
    baseRepairPerTurnBonus: 0,
    captureTurnsRequiredBonus: 0,
    initialMoraleBonus: 0,
    moraleDecayReduction: 0,
    killMoraleBonusMultiplier: 0,
    passiveHpRegen: 0,
    chargeDamageBonus: 0,
    energyPerTurnBonus: 0,
    initialEnergyBonus: 0,
    statusDurationBonus: 0,
    statusHitChanceBonus: 0,
    dotDamageMultiplier: 0,
    magicDamageOnAttack: 0,
    magicResistancePenetration: 0,
    skillDamageMultiplier: 0,
    statusEffectPowerMultiplier: 0,
    globalMagicDamageMultiplier: 0
  };

  for (const techId of researchedTechs) {
    const tech = getTechById(techId);
    if (!tech || !tech.effects) continue;

    for (const [effectKey, effectValue] of Object.entries(tech.effects)) {
      if (typeof effectValue === 'object' && effectValue !== null) {
        if (!bonuses[effectKey]) {
          bonuses[effectKey] = {};
        }
        for (const [unitType, value] of Object.entries(effectValue)) {
          bonuses[effectKey][unitType] = (bonuses[effectKey][unitType] || 0) + value;
        }
      } else {
        if (bonuses[effectKey] !== undefined) {
          bonuses[effectKey] += effectValue;
        }
      }
    }
  }

  return bonuses;
}

export function applyTechBonusesToUnit(unit, techBonuses) {
  const unitType = unit.type;
  const baseConfig = unitConfig[unitType];
  
  let attack = unit.attack || baseConfig.attack;
  let defense = unit.defense || baseConfig.defense;
  let maxHp = unit.maxHp || baseConfig.hp;
  let moveRange = unit.moveRange || baseConfig.moveRange;
  let attackRange = unit.attackRange || baseConfig.attackRange;

  attack += techBonuses.globalAttackBonus || 0;
  defense += techBonuses.globalDefenseBonus || 0;
  maxHp += techBonuses.globalHpBonus || 0;

  if (techBonuses.unitTypeAttackBonus?.[unitType]) {
    attack += techBonuses.unitTypeAttackBonus[unitType];
  }
  if (techBonuses.unitTypeDefenseBonus?.[unitType]) {
    defense += techBonuses.unitTypeDefenseBonus[unitType];
  }
  if (techBonuses.unitTypeHpBonus?.[unitType]) {
    maxHp += techBonuses.unitTypeHpBonus[unitType];
  }
  if (techBonuses.unitTypeMoveBonus?.[unitType]) {
    moveRange += techBonuses.unitTypeMoveBonus[unitType];
  }
  if (techBonuses.unitTypeRangeBonus?.[unitType]) {
    attackRange += techBonuses.unitTypeRangeBonus[unitType];
  }

  attack = Math.floor(attack * (1 + (techBonuses.globalAttackMultiplier || 0)));
  defense = Math.floor(defense * (1 + (techBonuses.globalDefenseMultiplier || 0)));
  maxHp = Math.floor(maxHp * (1 + (techBonuses.globalHpMultiplier || 0)));

  if (techBonuses.unitTypeAttackMultiplier?.[unitType]) {
    attack = Math.floor(attack * (1 + techBonuses.unitTypeAttackMultiplier[unitType]));
  }

  return {
    ...unit,
    attack,
    defense,
    maxHp,
    moveRange,
    attackRange,
    currentHp: Math.min(unit.currentHp, maxHp)
  };
}

export function applyTechBonusesToEconomy(baseEconomy, techBonuses) {
  let economy = { ...baseEconomy };

  economy.baseGoldPerTurn += techBonuses.baseGoldPerTurnBonus || 0;
  economy.startingGold += techBonuses.startingGoldBonus || 0;
  
  economy.maintenanceFreeUnits += techBonuses.maintenanceFreeUnitsBonus || 0;

  if (techBonuses.maintenanceCostReduction) {
    economy.maintenance = { ...economy.maintenance };
    for (const unitType of Object.keys(economy.maintenance)) {
      if (typeof economy.maintenance[unitType] === 'number') {
        economy.maintenance[unitType] = Math.floor(economy.maintenance[unitType] * (1 - techBonuses.maintenanceCostReduction));
      }
    }
  }

  if (techBonuses.unitCostReduction) {
    economy.unitCosts = economy.unitCosts || {};
    for (const unitType of Object.keys(unitConfig)) {
      const baseCost = unitConfig[unitType].cost;
      economy.unitCosts[unitType] = Math.floor(baseCost * (1 - techBonuses.unitCostReduction));
    }
  }

  if (techBonuses.globalGoldMultiplier) {
    economy.goldMultiplier = (economy.goldMultiplier || 1) + techBonuses.globalGoldMultiplier;
  }

  return economy;
}

export function applyTechBonusesToBase(baseState, techBonuses) {
  let base = { ...baseState };

  if (techBonuses.baseDurabilityBonus) {
    base.maxDurability += techBonuses.baseDurabilityBonus;
    base.durability = Math.min(base.durability + techBonuses.baseDurabilityBonus, base.maxDurability);
  }

  if (techBonuses.baseDurabilityMultiplier) {
    base.maxDurability = Math.floor(base.maxDurability * (1 + techBonuses.baseDurabilityMultiplier));
    base.durability = Math.min(Math.floor(base.durability * (1 + techBonuses.baseDurabilityMultiplier)), base.maxDurability);
  }

  if (techBonuses.baseRepairPerTurnBonus) {
    base.repairPerTurn = (base.repairPerTurn || 0) + techBonuses.baseRepairPerTurnBonus;
  }

  return base;
}

export function getResearchProgress(techId, techState) {
  const tech = getTechById(techId);
  if (!tech) return { progress: 0, total: 0, percent: 0, isResearching: false };

  if (techState.researchInProgress === techId) {
    return {
      progress: techState.researchProgress,
      total: tech.researchTurns,
      percent: Math.floor((techState.researchProgress / tech.researchTurns) * 100),
      isResearching: true
    };
  }

  const queueIndex = techState.researchQueue.indexOf(techId);
  if (queueIndex !== -1) {
    return {
      progress: 0,
      total: tech.researchTurns,
      percent: 0,
      isResearching: false,
      queuePosition: queueIndex + 1
    };
  }

  if (techState.researchedTechs.includes(techId)) {
    return {
      progress: tech.researchTurns,
      total: tech.researchTurns,
      percent: 100,
      isResearching: false,
      completed: true
    };
  }

  return {
    progress: 0,
    total: tech.researchTurns,
    percent: 0,
    isResearching: false
  };
}

export function getBranchProgress(branch, researchedTechs) {
  const branchTechs = getTechsByBranch(branch);
  const totalTechs = branchTechs.length;
  const researched = branchTechs.filter(t => researchedTechs.includes(t.id)).length;
  
  const totalTiers = 5;
  let highestTierResearched = 0;
  for (let tier = 1; tier <= totalTiers; tier++) {
    const tierTechs = branchTechs.filter(t => t.tier === tier);
    const allResearched = tierTechs.every(t => researchedTechs.includes(t.id));
    if (allResearched) {
      highestTierResearched = tier;
    }
  }

  return {
    totalTechs,
    researched,
    percent: Math.floor((researched / totalTechs) * 100),
    highestTier: highestTierResearched
  };
}

export function getAvailableTechs(branch, researchedTechs) {
  const branchTechs = getTechsByBranch(branch);
  return branchTechs.filter(tech => {
    if (researchedTechs.includes(tech.id)) return false;
    return tech.requires.every(reqId => researchedTechs.includes(reqId));
  });
}

export function getTotalResearchCost(researchedTechs) {
  return researchedTechs.reduce((sum, techId) => {
    const tech = getTechById(techId);
    return sum + (tech?.cost || 0);
  }, 0);
}

export function getTotalResearchTurns(researchedTechs) {
  return researchedTechs.reduce((sum, techId) => {
    const tech = getTechById(techId);
    return sum + (tech?.researchTurns || 0);
  }, 0);
}

export function formatTechEffectDescription(effects) {
  const descriptions = [];
  
  const effectLabels = {
    globalAttackBonus: '攻击力',
    globalDefenseBonus: '防御力',
    globalHpBonus: '生命值',
    globalMoveBonus: '移动力',
    globalAttackMultiplier: '攻击力',
    globalDefenseMultiplier: '防御力',
    globalHpMultiplier: '生命值',
    globalDamageReduction: '伤害减免',
    critChanceBonus: '暴击率',
    expGainBonus: '经验获取',
    baseGoldPerTurnBonus: '每回合金币',
    maintenanceCostReduction: '维护费用减少',
    maintenanceFreeUnitsBonus: '免维护单位',
    unitCostReduction: '招募费用减少',
    killGoldMultiplier: '击杀金币',
    damageToGoldMultiplier: '伤害转金币',
    capturePointGoldMultiplier: '占领点收益',
    globalGoldMultiplier: '金币收入',
    startingGoldBonus: '初始金币',
    baseDurabilityBonus: '基地耐久',
    baseDurabilityMultiplier: '基地耐久',
    baseRepairPerTurnBonus: '基地修复',
    captureTurnsRequiredBonus: '占领所需回合',
    initialMoraleBonus: '初始士气',
    moraleDecayReduction: '士气衰减减少',
    killMoraleBonusMultiplier: '击杀士气',
    passiveHpRegen: '生命回复',
    chargeDamageBonus: '冲锋伤害',
    energyPerTurnBonus: '每回合能量',
    initialEnergyBonus: '初始能量',
    statusDurationBonus: '状态持续时间',
    statusHitChanceBonus: '状态命中率',
    dotDamageMultiplier: '持续伤害',
    magicDamageOnAttack: '攻击附加魔法伤害',
    magicResistancePenetration: '魔法穿透',
    skillDamageMultiplier: '技能伤害',
    statusEffectPowerMultiplier: '状态效果强度',
    globalMagicDamageMultiplier: '魔法伤害'
  };

  for (const [key, value] of Object.entries(effects)) {
    const label = effectLabels[key] || key;
    
    if (typeof value === 'object' && value !== null) {
      for (const [unitType, val] of Object.entries(value)) {
        const unitName = unitConfig[unitType]?.name || unitType;
        if (key.includes('Multiplier') || key.includes('Reduction')) {
          descriptions.push(`${unitName}${label} ${val > 0 ? '+' : ''}${Math.floor(val * 100)}%`);
        } else {
          descriptions.push(`${unitName}${label} ${val > 0 ? '+' : ''}${val}`);
        }
      }
    } else {
      if (key.includes('Multiplier') || key.includes('Reduction')) {
        descriptions.push(`${label} ${value > 0 ? '+' : ''}${Math.floor(value * 100)}%`);
      } else {
        descriptions.push(`${label} ${value > 0 ? '+' : ''}${value}`);
      }
    }
  }

  return descriptions;
}

export const TECH_BRANCHES = {
  MILITARY: 'military',
  ECONOMY: 'economy',
  DEFENSE: 'defense',
  MAGIC: 'magic'
};

export const TECH_BRANCH_INFO = {
  [TECH_BRANCHES.MILITARY]: {
    name: '军事',
    icon: '⚔️',
    color: '#e74c3c',
    description: '强化单位攻击力与解锁高级兵种'
  },
  [TECH_BRANCHES.ECONOMY]: {
    name: '经济',
    icon: '💰',
    color: '#f39c12',
    description: '提升经济收入与降低维护成本'
  },
  [TECH_BRANCHES.DEFENSE]: {
    name: '防御',
    icon: '🛡️',
    color: '#3498db',
    description: '提升防御与基地耐久'
  },
  [TECH_BRANCHES.MAGIC]: {
    name: '魔法',
    icon: '✨',
    color: '#9b59b6',
    description: '强化魔法单位与状态效果'
  }
};

export const TECH_TIER_NAMES = {
  1: '基础',
  2: '进阶',
  3: '高级',
  4: '精英',
  5: '传奇'
};

export const techConfig = {
  military_1_1: {
    id: 'military_1_1',
    name: '武器锻造',
    branch: TECH_BRANCHES.MILITARY,
    tier: 1,
    icon: '🗡️',
    description: '所有单位攻击力 +5',
    cost: 100,
    researchTurns: 2,
    requires: [],
    effects: {
      globalAttackBonus: 5
    },
    unlocks: []
  },
  military_1_2: {
    id: 'military_1_2',
    name: '训练手册',
    branch: TECH_BRANCHES.MILITARY,
    tier: 1,
    icon: '📜',
    description: '所有单位获得经验速度 +20%',
    cost: 80,
    researchTurns: 2,
    requires: [],
    effects: {
      expGainBonus: 0.2
    },
    unlocks: []
  },
  military_2_1: {
    id: 'military_2_1',
    name: '精锐训练',
    branch: TECH_BRANCHES.MILITARY,
    tier: 2,
    icon: '💪',
    description: '步兵与骑兵攻击力 +8，生命值 +20',
    cost: 200,
    researchTurns: 3,
    requires: ['military_1_1'],
    effects: {
      unitTypeAttackBonus: { infantry: 8, cavalry: 8 },
      unitTypeHpBonus: { infantry: 20, cavalry: 20 }
    },
    unlocks: []
  },
  military_2_2: {
    id: 'military_2_2',
    name: '长弓工艺',
    branch: TECH_BRANCHES.MILITARY,
    tier: 2,
    icon: '🏹',
    description: '弓兵射程 +1，攻击力 +6',
    cost: 180,
    researchTurns: 3,
    requires: ['military_1_1'],
    effects: {
      unitTypeAttackBonus: { archer: 6 },
      unitTypeRangeBonus: { archer: 1 }
    },
    unlocks: []
  },
  military_3_1: {
    id: 'military_3_1',
    name: '骑兵战术',
    branch: TECH_BRANCHES.MILITARY,
    tier: 3,
    icon: '🐴',
    description: '骑兵移动力 +1，冲锋伤害加成提升',
    cost: 350,
    researchTurns: 4,
    requires: ['military_2_1'],
    effects: {
      unitTypeMoveBonus: { cavalry: 1 },
      chargeDamageBonus: 0.1
    },
    unlocks: []
  },
  military_3_2: {
    id: 'military_3_2',
    name: '重装步兵',
    branch: TECH_BRANCHES.MILITARY,
    tier: 3,
    icon: '🛡️',
    description: '解锁重甲兵专精：铁壁，防御额外 +15',
    cost: 300,
    researchTurns: 4,
    requires: ['military_2_1'],
    effects: {
      unitTypeDefenseBonus: { tank: 15 }
    },
    unlocks: ['tank_specialization_fortress_plus']
  },
  military_4_1: {
    id: 'military_4_1',
    name: '战争艺术',
    branch: TECH_BRANCHES.MILITARY,
    tier: 4,
    icon: '🏆',
    description: '所有单位攻击力 +10%，击杀士气提升 +50%',
    cost: 600,
    researchTurns: 5,
    requires: ['military_3_1', 'military_3_2'],
    effects: {
      globalAttackMultiplier: 0.1,
      killMoraleBonusMultiplier: 0.5
    },
    unlocks: []
  },
  military_5_1: {
    id: 'military_5_1',
    name: '战神赐福',
    branch: TECH_BRANCHES.MILITARY,
    tier: 5,
    icon: '⚡',
    description: '所有单位攻击力 +15，生命值 +30，暴击率 +10%',
    cost: 1000,
    researchTurns: 8,
    requires: ['military_4_1'],
    effects: {
      globalAttackBonus: 15,
      globalHpBonus: 30,
      critChanceBonus: 0.1
    },
    unlocks: ['elite_unit_warlord']
  },

  economy_1_1: {
    id: 'economy_1_1',
    name: '基础税收',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 1,
    icon: '📊',
    description: '每回合基础金币收入 +10',
    cost: 80,
    researchTurns: 2,
    requires: [],
    effects: {
      baseGoldPerTurnBonus: 10
    },
    unlocks: []
  },
  economy_1_2: {
    id: 'economy_1_2',
    name: '后勤管理',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 1,
    icon: '📦',
    description: '单位维护费用 -15%',
    cost: 100,
    researchTurns: 2,
    requires: [],
    effects: {
      maintenanceCostReduction: 0.15
    },
    unlocks: []
  },
  economy_2_1: {
    id: 'economy_2_1',
    name: '贸易路线',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 2,
    icon: '🚛',
    description: '每回合基础金币收入 +20，占领点收益 +25%',
    cost: 200,
    researchTurns: 3,
    requires: ['economy_1_1'],
    effects: {
      baseGoldPerTurnBonus: 20,
      capturePointGoldMultiplier: 0.25
    },
    unlocks: []
  },
  economy_2_2: {
    id: 'economy_2_2',
    name: '精兵政策',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 2,
    icon: '👥',
    description: '免维护单位数量 +2',
    cost: 180,
    researchTurns: 3,
    requires: ['economy_1_2'],
    effects: {
      maintenanceFreeUnitsBonus: 2
    },
    unlocks: []
  },
  economy_3_1: {
    id: 'economy_3_1',
    name: '战争财',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 3,
    icon: '💎',
    description: '击杀金币奖励 +30%，造成伤害转化金币 +50%',
    cost: 350,
    researchTurns: 4,
    requires: ['economy_2_1'],
    effects: {
      killGoldMultiplier: 0.3,
      damageToGoldMultiplier: 0.5
    },
    unlocks: []
  },
  economy_3_2: {
    id: 'economy_3_2',
    name: '供应链优化',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 3,
    icon: '⚙️',
    description: '单位招募费用 -20%，维护费用再 -10%',
    cost: 300,
    researchTurns: 4,
    requires: ['economy_2_2'],
    effects: {
      unitCostReduction: 0.2,
      maintenanceCostReduction: 0.1
    },
    unlocks: []
  },
  economy_4_1: {
    id: 'economy_4_1',
    name: '经济繁荣',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 4,
    icon: '🏛️',
    description: '所有金币收入 +25%，初始金币 +100',
    cost: 600,
    researchTurns: 5,
    requires: ['economy_3_1', 'economy_3_2'],
    effects: {
      globalGoldMultiplier: 0.25,
      startingGoldBonus: 100
    },
    unlocks: []
  },
  economy_5_1: {
    id: 'economy_5_1',
    name: '黄金时代',
    branch: TECH_BRANCHES.ECONOMY,
    tier: 5,
    icon: '👑',
    description: '每回合额外获得 50 金币，所有收入 +50%',
    cost: 1000,
    researchTurns: 8,
    requires: ['economy_4_1'],
    effects: {
      baseGoldPerTurnBonus: 50,
      globalGoldMultiplier: 0.5
    },
    unlocks: ['unique_economic_miracle']
  },

  defense_1_1: {
    id: 'defense_1_1',
    name: '基础护甲',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 1,
    icon: '🥋',
    description: '所有单位防御力 +3',
    cost: 80,
    researchTurns: 2,
    requires: [],
    effects: {
      globalDefenseBonus: 3
    },
    unlocks: []
  },
  defense_1_2: {
    id: 'defense_1_2',
    name: '工事建造',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 1,
    icon: '🏰',
    description: '基地最大耐久 +30，每回合修复 +5',
    cost: 100,
    researchTurns: 2,
    requires: [],
    effects: {
      baseDurabilityBonus: 30,
      baseRepairPerTurnBonus: 5
    },
    unlocks: []
  },
  defense_2_1: {
    id: 'defense_2_1',
    name: '盾阵战术',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 2,
    icon: '🛡️',
    description: '步兵与重甲兵防御力 +8',
    cost: 180,
    researchTurns: 3,
    requires: ['defense_1_1'],
    effects: {
      unitTypeDefenseBonus: { infantry: 8, tank: 8 }
    },
    unlocks: []
  },
  defense_2_2: {
    id: 'defense_2_2',
    name: '医疗帐篷',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 2,
    icon: '⛑️',
    description: '所有单位每回合回复 5 生命值',
    cost: 200,
    researchTurns: 3,
    requires: ['defense_1_1'],
    effects: {
      passiveHpRegen: 5
    },
    unlocks: []
  },
  defense_3_1: {
    id: 'defense_3_1',
    name: '坚固堡垒',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 3,
    icon: '🏯',
    description: '基地最大耐久 +50，占领所需回合 +1',
    cost: 300,
    researchTurns: 4,
    requires: ['defense_2_1', 'defense_1_2'],
    effects: {
      baseDurabilityBonus: 50,
      captureTurnsRequiredBonus: 1
    },
    unlocks: []
  },
  defense_3_2: {
    id: 'defense_3_2',
    name: '士气鼓舞',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 3,
    icon: '📯',
    description: '初始士气 +10，士气衰减 -20%',
    cost: 350,
    researchTurns: 4,
    requires: ['defense_2_2'],
    effects: {
      initialMoraleBonus: 10,
      moraleDecayReduction: 0.2
    },
    unlocks: []
  },
  defense_4_1: {
    id: 'defense_4_1',
    name: '铜墙铁壁',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 4,
    icon: '🧱',
    description: '所有单位防御力 +15%，生命值 +15%',
    cost: 600,
    researchTurns: 5,
    requires: ['defense_3_1', 'defense_3_2'],
    effects: {
      globalDefenseMultiplier: 0.15,
      globalHpMultiplier: 0.15
    },
    unlocks: []
  },
  defense_5_1: {
    id: 'defense_5_1',
    name: '不朽之盾',
    branch: TECH_BRANCHES.DEFENSE,
    tier: 5,
    icon: '🌟',
    description: '所有单位获得 10% 伤害减免，基地耐久翻倍',
    cost: 1000,
    researchTurns: 8,
    requires: ['defense_4_1'],
    effects: {
      globalDamageReduction: 0.1,
      baseDurabilityMultiplier: 1.0
    },
    unlocks: ['elite_unit_immortal']
  },

  magic_1_1: {
    id: 'magic_1_1',
    name: '奥术基础',
    branch: TECH_BRANCHES.MAGIC,
    tier: 1,
    icon: '🔮',
    description: '法师攻击力 +8，魔法值回复 +1',
    cost: 100,
    researchTurns: 2,
    requires: [],
    effects: {
      unitTypeAttackBonus: { mage: 8 },
      energyPerTurnBonus: 1
    },
    unlocks: []
  },
  magic_1_2: {
    id: 'magic_1_2',
    name: '元素亲和',
    branch: TECH_BRANCHES.MAGIC,
    tier: 1,
    icon: '🔥',
    description: '燃烧、冰冻、中毒效果伤害 +20%',
    cost: 120,
    researchTurns: 2,
    requires: [],
    effects: {
      dotDamageMultiplier: 0.2
    },
    unlocks: []
  },
  magic_2_1: {
    id: 'magic_2_1',
    name: '咒术强化',
    branch: TECH_BRANCHES.MAGIC,
    tier: 2,
    icon: '💫',
    description: '状态效果持续时间 +1，命中率 +15%',
    cost: 200,
    researchTurns: 3,
    requires: ['magic_1_1'],
    effects: {
      statusDurationBonus: 1,
      statusHitChanceBonus: 0.15
    },
    unlocks: []
  },
  magic_2_2: {
    id: 'magic_2_2',
    name: '符文附魔',
    branch: TECH_BRANCHES.MAGIC,
    tier: 2,
    icon: '✨',
    description: '所有单位攻击附加魔法伤害 +5',
    cost: 250,
    researchTurns: 3,
    requires: ['magic_1_2'],
    effects: {
      magicDamageOnAttack: 5
    },
    unlocks: []
  },
  magic_3_1: {
    id: 'magic_3_1',
    name: '法力澎湃',
    branch: TECH_BRANCHES.MAGIC,
    tier: 3,
    icon: '🌊',
    description: '初始能量 +2，每回合能量回复 +2',
    cost: 350,
    researchTurns: 4,
    requires: ['magic_2_1'],
    effects: {
      initialEnergyBonus: 2,
      energyPerTurnBonus: 2
    },
    unlocks: []
  },
  magic_3_2: {
    id: 'magic_3_2',
    name: '法术穿透',
    branch: TECH_BRANCHES.MAGIC,
    tier: 3,
    icon: '💎',
    description: '无视 20% 魔抗，技能伤害 +25%',
    cost: 400,
    researchTurns: 4,
    requires: ['magic_2_2'],
    effects: {
      magicResistancePenetration: 0.2,
      skillDamageMultiplier: 0.25
    },
    unlocks: []
  },
  magic_4_1: {
    id: 'magic_4_1',
    name: '奥术大师',
    branch: TECH_BRANCHES.MAGIC,
    tier: 4,
    icon: '🧙',
    description: '法师攻击力 +30%，所有状态效果强度 +30%',
    cost: 650,
    researchTurns: 5,
    requires: ['magic_3_1', 'magic_3_2'],
    effects: {
      unitTypeAttackMultiplier: { mage: 0.3 },
      statusEffectPowerMultiplier: 0.3
    },
    unlocks: []
  },
  magic_5_1: {
    id: 'magic_5_1',
    name: '禁咒',
    branch: TECH_BRANCHES.MAGIC,
    tier: 5,
    icon: '☄️',
    description: '解锁终极法术，所有魔法伤害 +50%',
    cost: 1200,
    researchTurns: 10,
    requires: ['magic_4_1'],
    effects: {
      globalMagicDamageMultiplier: 0.5
    },
    unlocks: ['unique_spell_armageddon']
  }
};

export const TECH_UNLOCK_TYPES = {
  UNIT: 'unit',
  SPECIALIZATION: 'specialization',
  BUILDING: 'building',
  SPELL: 'spell',
  UNIQUE: 'unique'
};

export function getTechById(techId) {
  return techConfig[techId] || null;
}

export function getTechsByBranch(branch) {
  return Object.values(techConfig).filter(tech => tech.branch === branch);
}

export function getTechsByTier(branch, tier) {
  return Object.values(techConfig).filter(tech => tech.branch === branch && tech.tier === tier);
}

export function getTierMaxTechs(branch, tier) {
  return getTechsByTier(branch, tier).length;
}

export function calculateTotalBranchCost(branch) {
  const techs = getTechsByBranch(branch);
  return techs.reduce((sum, tech) => sum + tech.cost, 0);
}

export function calculateTotalBranchResearchTurns(branch) {
  const techs = getTechsByBranch(branch);
  return techs.reduce((sum, tech) => sum + tech.researchTurns, 0);
}

export const MOVE_SKILL_TYPES = {
  CHARGE: 'charge',
  PENETRATE: 'penetrate',
  HALT: 'halt'
};

export const MOVE_SKILL_INFO = {
  [MOVE_SKILL_TYPES.CHARGE]: {
    name: '冲锋',
    icon: '💨',
    color: '#f39c12',
    description: '可穿越敌方单位，移动后下次攻击伤害提升，但首格消耗+1',
    canPassThroughEnemy: true,
    firstTileExtraCost: 1,
    postMoveAttackBonus: 0.25,
    postMoveAttackBuffDuration: 1
  },
  [MOVE_SKILL_TYPES.PENETRATE]: {
    name: '穿插',
    icon: '⚔',
    color: '#2ecc71',
    description: '可穿越友方单位不停留，复杂地形消耗-1，穿越后防御提升',
    canPassThroughFriendly: true,
    terrainCostReduction: 1,
    postPenetrateDefenseBonus: 0.15,
    postPenetrateDefenseBuffDuration: 1
  },
  [MOVE_SKILL_TYPES.HALT]: {
    name: '停驻',
    icon: '🏰',
    color: '#7f8c8d',
    description: '未移动时防御大幅提升且免疫位移，但所有地形消耗+1',
    terrainCostAdd: 1,
    stationaryDefenseBonus: 0.3,
    stationaryMoraleBonus: 5,
    immuneToDisplacement: true
  }
};

export const STATUS_EFFECT_TYPES = {
  STUN: 'stun',
  SLOW: 'slow',
  HEAL_BLOCK: 'healBlock',
  SILENCE: 'silence',
  POISON: 'poison',
  BURN: 'burn',
  FREEZE: 'freeze',
  BLEED: 'bleed'
};

/**
 * @typedef {object} StatusEffectInfo
 * @property {string} name
 * @property {string} icon
 * @property {string} color
 * @property {string} description
 * @property {boolean} isDebuff
 * @property {boolean} isHardCC
 * @property {string} category
 * @property {string | null} valueLabel
 */

/** @type {Record<string, StatusEffectInfo>} */
export const STATUS_EFFECT_INFO = {
  [STATUS_EFFECT_TYPES.STUN]: {
    name: '眩晕',
    icon: '💫',
    color: '#9b59b6',
    description: '无法进行任何行动',
    isDebuff: true,
    isHardCC: true,
    category: 'hardCC',
    valueLabel: '强度'
  },
  [STATUS_EFFECT_TYPES.SLOW]: {
    name: '减速',
    icon: '🐢',
    color: '#3498db',
    description: '移动力降低',
    isDebuff: true,
    isHardCC: false,
    category: 'softCC',
    valueLabel: '移动力减少'
  },
  [STATUS_EFFECT_TYPES.HEAL_BLOCK]: {
    name: '禁疗',
    icon: '🚫',
    color: '#e74c3c',
    description: '无法接受治疗效果',
    isDebuff: true,
    isHardCC: false,
    category: 'debuff',
    valueLabel: null
  },
  [STATUS_EFFECT_TYPES.SILENCE]: {
    name: '沉默',
    icon: '🤫',
    color: '#7f8c8d',
    description: '无法使用技能卡牌',
    isDebuff: true,
    isHardCC: false,
    category: 'softCC',
    valueLabel: null
  },
  [STATUS_EFFECT_TYPES.POISON]: {
    name: '中毒',
    icon: '☠️',
    color: '#27ae60',
    description: '每回合损失生命值',
    isDebuff: true,
    isHardCC: false,
    category: 'DoT',
    valueLabel: '每回合伤害'
  },
  [STATUS_EFFECT_TYPES.BURN]: {
    name: '燃烧',
    icon: '🔥',
    color: '#e67e22',
    description: '每回合损失生命值',
    isDebuff: true,
    isHardCC: false,
    category: 'DoT',
    valueLabel: '每回合伤害'
  },
  [STATUS_EFFECT_TYPES.FREEZE]: {
    name: '冰冻',
    icon: '❄️',
    color: '#00bcd4',
    description: '无法行动且受到额外伤害',
    isDebuff: true,
    isHardCC: true,
    category: 'hardCC',
    valueLabel: '额外伤害加成'
  },
  [STATUS_EFFECT_TYPES.BLEED]: {
    name: '流血',
    icon: '🩸',
    color: '#c0392b',
    description: '移动时损失生命值',
    isDebuff: true,
    isHardCC: false,
    category: 'DoT',
    valueLabel: '每格伤害'
  }
};

/**
 * @typedef {keyof typeof unitConfig} UnitType
 */

/**
 * 兵种克制关系表 - 定义各兵种对特定兵种的伤害加成
 * @type {Record<UnitType, Partial<Record<UnitType, number>>>}
 */
export const COUNTER_RELATIONSHIPS = {
  infantry: { cavalry: 1.3 },
  cavalry: { archer: 1.3 },
  archer: { mage: 1.3 },
  mage: { infantry: 1.3 },
  tank: { cavalry: 1.25, infantry: 1.2 }
};

/**
 * 兵种克制标签 - 定义克制关系的描述性名称
 * @type {Record<UnitType, Partial<Record<UnitType, string>>>}
 */
export const COUNTER_LABELS = {
  infantry: { cavalry: '枪阵破骑' },
  cavalry: { archer: '骑突克射' },
  archer: { mage: '先射断法' },
  mage: { infantry: '法破重甲' },
  tank: { cavalry: '坚甲拒马', infantry: '盾阵压迫' }
};

/**
 * @typedef {object} SynergyEffect
 * @property {string} type - 效果类型（attackBoost/defenseBoost/moveBoost 等）
 * @property {number} value - 效果数值
 * @property {number} duration - 持续回合数
 */

/**
 * @typedef {object} SynergyConfigEntry
 * @property {string} name - 协同名称
 * @property {string} description - 协同描述
 * @property {UnitType[]} requiredTypes - 需要的兵种类型组合
 * @property {number} range - 生效范围（曼哈顿距离）
 * @property {SynergyEffect} effect - 协同效果
 * @property {UnitType | 'both'} beneficiaryType - 受益兵种（'both' 表示双方都受益）
 */

/**
 * 兵种协同配置表
 * @type {Record<string, SynergyConfigEntry>}
 */
export const SYNERGY_CONFIG = {
  infantry_archer: {
    name: '步弓阵',
    description: '步兵护卫弓兵，弓兵获得防御加成',
    requiredTypes: ['infantry', 'archer'],
    range: 2,
    effect: { type: 'defenseBoost', value: 0.15, duration: 1 },
    beneficiaryType: 'archer'
  },
  cavalry_infantry: {
    name: '骑步协同',
    description: '步兵牵制敌阵，骑兵获得攻击加成',
    requiredTypes: ['cavalry', 'infantry'],
    range: 2,
    effect: { type: 'attackBoost', value: 0.15, duration: 1 },
    beneficiaryType: 'cavalry'
  },
  mage_archer: {
    name: '法弓齐射',
    description: '法师与弓兵远程配合，双方获得射程加成',
    requiredTypes: ['mage', 'archer'],
    range: 3,
    effect: { type: 'attackBoost', value: 0.12, duration: 1 },
    beneficiaryType: 'both'
  },
  cavalry_mage: {
    name: '骑法突击',
    description: '法师为骑兵加持魔力，骑兵获得移动力加成',
    requiredTypes: ['cavalry', 'mage'],
    range: 2,
    effect: { type: 'moveBoost', value: 1, duration: 1 },
    beneficiaryType: 'cavalry'
  }
};

export const SPECIALIZATION_CONFIG = {
  infantry: [
    {
      id: 'shield_guard',
      name: '盾卫',
      description: '防御+8，最大生命+30，状态抗性+15%',
      bonuses: { def: 8, hp: 30, statusResistBoost: 0.15 }
    },
    {
      id: 'assault',
      name: '突击',
      description: '攻击+8，击杀后额外+5士气',
      bonuses: { atk: 8, moraleOnKill: 5 }
    }
  ],
  cavalry: [
    {
      id: 'iron_cavalry',
      name: '铁骑',
      description: '最大生命+25，防御+5，反击伤害+20%',
      bonuses: { hp: 25, def: 5, counterBoost: 0.2 }
    },
    {
      id: 'scout',
      name: '游骑',
      description: '移动力+1，攻击+5，击杀回复10生命',
      bonuses: { move: 1, atk: 5, healOnKill: 10 }
    }
  ],
  archer: [
    {
      id: 'sniper',
      name: '狙击',
      description: '射程+1，攻击+6，对高血量目标伤害+15%',
      bonuses: { attackRange: 1, atk: 6, highHpBonus: 0.15 }
    },
    {
      id: 'rapid_fire',
      name: '连射',
      description: '攻击+4，攻击后15%概率再攻击一次',
      bonuses: { atk: 4, doubleAttackChance: 0.15 }
    }
  ],
  mage: [
    {
      id: 'elementalist',
      name: '元素',
      description: '攻击+10，燃烧/冰冻效果持续时间+1',
      bonuses: { atk: 10, dotDurationBonus: 1 }
    },
    {
      id: 'illusionist',
      name: '幻术',
      description: '攻击+4，施加状态时抗性穿透+25%',
      bonuses: { atk: 4, statusPenetrate: 0.25 }
    }
  ],
  tank: [
    {
      id: 'fortress',
      name: '堡垒',
      description: '防御+12，最大生命+40，护盾效果+50%',
      bonuses: { def: 12, hp: 40, shieldBoost: 0.5 }
    },
    {
      id: 'guardian',
      name: '守护',
      description: '防御+6，周围2格友军受到伤害-10%',
      bonuses: { def: 6, allyDamageReduction: 0.1, allyDamageReductionRange: 2 }
    }
  ]
};

export const unitConfig = {
  infantry: {
    name: '步兵',
    hp: 100,
    attack: 25,
    defense: 10,
    moveRange: 3,
    attackRange: 1,
    cost: 100,
    color: 0xe74c3c,
    description: '攻守平衡，克制骑兵',
    moveSkill: MOVE_SKILL_TYPES.PENETRATE,
    statusResistance: {
      [STATUS_EFFECT_TYPES.STUN]: 0.1,
      [STATUS_EFFECT_TYPES.SLOW]: 0.2,
      [STATUS_EFFECT_TYPES.POISON]: 0.15,
      [STATUS_EFFECT_TYPES.BLEED]: 0.15
    },
    statusImmunities: []
  },
  cavalry: {
    name: '骑兵',
    hp: 80,
    attack: 35,
    defense: 5,
    moveRange: 5,
    attackRange: 1,
    cost: 150,
    color: 0xf39c12,
    description: '高机动高攻击，克制弓兵',
    moveSkill: MOVE_SKILL_TYPES.CHARGE,
    statusResistance: {
      [STATUS_EFFECT_TYPES.SLOW]: 0.3,
      [STATUS_EFFECT_TYPES.STUN]: 0.15
    },
    statusImmunities: []
  },
  archer: {
    name: '弓兵',
    hp: 60,
    attack: 30,
    defense: 3,
    moveRange: 2,
    attackRange: 3,
    cost: 120,
    color: 0x9b59b6,
    description: '远程攻击，克制法师',
    moveSkill: MOVE_SKILL_TYPES.PENETRATE,
    statusResistance: {
      [STATUS_EFFECT_TYPES.BURN]: 0.1,
      [STATUS_EFFECT_TYPES.POISON]: 0.1
    },
    statusImmunities: []
  },
  mage: {
    name: '法师',
    hp: 50,
    attack: 45,
    defense: 2,
    moveRange: 2,
    attackRange: 2,
    cost: 200,
    color: 0x1abc9c,
    description: '高伤害法术，克制步兵',
    moveSkill: MOVE_SKILL_TYPES.PENETRATE,
    statusResistance: {
      [STATUS_EFFECT_TYPES.SILENCE]: 0.25,
      [STATUS_EFFECT_TYPES.FREEZE]: 0.2,
      [STATUS_EFFECT_TYPES.BURN]: 0.15
    },
    statusImmunities: [STATUS_EFFECT_TYPES.POISON]
  },
  tank: {
    name: '重甲兵',
    hp: 150,
    attack: 20,
    defense: 20,
    moveRange: 2,
    attackRange: 1,
    cost: 180,
    color: 0x7f8c8d,
    description: '高生命高防御，移动缓慢',
    moveSkill: MOVE_SKILL_TYPES.HALT,
    statusResistance: {
      [STATUS_EFFECT_TYPES.STUN]: 0.35,
      [STATUS_EFFECT_TYPES.FREEZE]: 0.3,
      [STATUS_EFFECT_TYPES.SLOW]: 0.3,
      [STATUS_EFFECT_TYPES.BLEED]: 0.4,
      [STATUS_EFFECT_TYPES.POISON]: 0.25,
      [STATUS_EFFECT_TYPES.BURN]: 0.2
    },
    statusImmunities: [STATUS_EFFECT_TYPES.HEAL_BLOCK]
  }
};

/**
 * @typedef {object} InitialUnitDef
 * @property {UnitType} type
 * @property {number} x
 * @property {number} y
 */

/** @type {Record<'red' | 'blue', InitialUnitDef[]>} */
export const initialUnits = {
  red: [
    { type: 'infantry', x: 0, y: 0 },
    { type: 'infantry', x: 1, y: 1 },
    { type: 'cavalry', x: 0, y: 3 },
    { type: 'archer', x: 1, y: 2 },
    { type: 'mage', x: 0, y: 6 },
    { type: 'tank', x: 1, y: 7 }
  ],
  blue: [
    { type: 'infantry', x: 9, y: 0 },
    { type: 'infantry', x: 8, y: 1 },
    { type: 'cavalry', x: 9, y: 4 },
    { type: 'archer', x: 8, y: 2 },
    { type: 'mage', x: 9, y: 6 },
    { type: 'tank', x: 8, y: 7 }
  ]
};

/**
 * @param {string} type
 * @returns {StatusEffectInfo}
 */
export function getStatusInfo(type) {
  return STATUS_EFFECT_INFO[type] || {
    name: type,
    icon: '✨',
    color: '#888',
    description: '',
    isDebuff: false,
    isHardCC: false,
    category: 'other',
    valueLabel: null
  };
}

/**
 * @param {number} value
 * @returns {string}
 */
export function getResistanceLabel(value) {
  if (value >= 0.5) return '极高抗性';
  if (value >= 0.3) return '高抗性';
  if (value >= 0.15) return '中抗性';
  if (value > 0) return '低抗性';
  return '无抗性';
}

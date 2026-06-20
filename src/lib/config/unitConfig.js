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
    description: '基础单位，攻守平衡',
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
    description: '高机动高攻击，防御较弱',
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
    description: '远程攻击，近战脆弱',
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
    description: '高伤害法术单位，非常脆弱',
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

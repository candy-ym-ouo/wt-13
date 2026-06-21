import { STATUS_EFFECT_TYPES } from '$lib/config/unitConfig';
import { TILE_EFFECT_TYPES } from '$lib/config/boardConfig';

export const CARD_CATEGORY = {
  INSTANT: 'instant',
  SUSTAIN: 'sustain',
  COUNTER: 'counter'
};

export const CARD_CATEGORY_LABELS = {
  [CARD_CATEGORY.INSTANT]: '即时',
  [CARD_CATEGORY.SUSTAIN]: '持续',
  [CARD_CATEGORY.COUNTER]: '反制'
};

export const CARD_CATEGORY_COLORS = {
  [CARD_CATEGORY.INSTANT]: '#e74c3c',
  [CARD_CATEGORY.SUSTAIN]: '#3498db',
  [CARD_CATEGORY.COUNTER]: '#9b59b6'
};

export const CARD_RARITY = {
  BASIC: 'basic',
  RARE: 'rare',
  LIMITED: 'limited'
};

export const CARD_RARITY_LABELS = {
  [CARD_RARITY.BASIC]: '基础',
  [CARD_RARITY.RARE]: '稀有',
  [CARD_RARITY.LIMITED]: '限定'
};

export const CARD_RARITY_COLORS = {
  [CARD_RARITY.BASIC]: '#aaaaaa',
  [CARD_RARITY.RARE]: '#f1c40f',
  [CARD_RARITY.LIMITED]: '#e74c3c'
};

export const CARD_RARITY_BG = {
  [CARD_RARITY.BASIC]: 'rgba(170,170,170,0.15)',
  [CARD_RARITY.RARE]: 'rgba(241,196,15,0.15)',
  [CARD_RARITY.LIMITED]: 'rgba(231,76,60,0.15)'
};

export const CARD_RARITY_ICONS = {
  [CARD_RARITY.BASIC]: '●',
  [CARD_RARITY.RARE]: '◆',
  [CARD_RARITY.LIMITED]: '★'
};

export const cardRarityConfig = {
  [CARD_RARITY.BASIC]: { baseWeight: 60, dupeWeightPenalty: 0.4, minTurn: 1 },
  [CARD_RARITY.RARE]: { baseWeight: 30, dupeWeightPenalty: 0.3, minTurn: 1 },
  [CARD_RARITY.LIMITED]: { baseWeight: 10, dupeWeightPenalty: 0.2, minTurn: 5 },
  pityThreshold: 5,
  maxDupeCount: 2
};

export const eventCards = [
  {
    id: 'heal',
    name: '治愈之光',
    category: CARD_CATEGORY.INSTANT,
    type: 'buff',
    description: '为选中单位恢复 50 点生命值',
    effect: { type: 'heal', value: 50 },
    icon: '💚',
    cost: 2,
    cooldown: 1,
    rarity: CARD_RARITY.BASIC,
    weight: 60
  },
  {
    id: 'attack_boost',
    name: '战意激昂',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '选中单位攻击力提升 50%，持续 2 回合',
    effect: { type: 'attackBoost', value: 0.5, duration: 2 },
    icon: '⚔️',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 55
  },
  {
    id: 'defense_boost',
    name: '铁壁防御',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '选中单位防御力提升 100%，持续 2 回合',
    effect: { type: 'defenseBoost', value: 1.0, duration: 2 },
    icon: '🛡️',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 55
  },
  {
    id: 'move_boost',
    name: '疾风之靴',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '选中单位移动力 +2，持续 2 回合',
    effect: { type: 'moveBoost', value: 2, duration: 2 },
    icon: '👟',
    cost: 2,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 60
  },
  {
    id: 'damage',
    name: '闪电打击',
    category: CARD_CATEGORY.INSTANT,
    type: 'debuff',
    description: '对敌方单位造成 40 点伤害',
    effect: { type: 'damage', value: 40 },
    icon: '⚡',
    cost: 3,
    cooldown: 1,
    rarity: CARD_RARITY.BASIC,
    weight: 60
  },
  {
    id: 'terrain_change',
    name: '大地震动',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '将选中格子变为平原地形',
    effect: { type: 'terrainChange', terrain: 'plain' },
    icon: '🌍',
    cost: 2,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 50
  },
  {
    id: 'cleanse',
    name: '净化术',
    category: CARD_CATEGORY.INSTANT,
    type: 'buff',
    description: '清除己方单位所有负面状态效果',
    effect: { type: 'cleanse' },
    icon: '✨',
    cost: 2,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 50
  },
  {
    id: 'reveal',
    name: '侦查',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在目标区域揭示半径 3 格内的敌军，标记敌方位置并显示详细信息，持续 3 回合',
    effect: { type: 'reveal', duration: 3, radius: 3 },
    icon: '👁️',
    cost: 2,
    cooldown: 2,
    rarity: CARD_RARITY.BASIC,
    weight: 50
  },
  {
    id: 'advanced_recon',
    name: '深度侦查',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在目标区域揭示半径 5 格内的敌军，标记敌方位置并显示详细信息，持续 4 回合',
    effect: { type: 'reveal', duration: 4, radius: 5 },
    icon: '🔭',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 20
  },
  {
    id: 'stun',
    name: '眩晕术',
    category: CARD_CATEGORY.INSTANT,
    type: 'debuff',
    description: '使敌方单位 2 回合无法行动',
    effect: { type: STATUS_EFFECT_TYPES.STUN, duration: 2 },
    icon: '💫',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 30
  },
  {
    id: 'slow',
    name: '重力场',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'debuff',
    description: '敌方单位移动力降低 2，持续 3 回合',
    effect: { type: STATUS_EFFECT_TYPES.SLOW, duration: 3, value: 2 },
    icon: '🐢',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.RARE,
    weight: 30
  },
  {
    id: 'heal_block',
    name: '诅咒封印',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'debuff',
    description: '敌方单位无法接受治疗，持续 3 回合',
    effect: { type: STATUS_EFFECT_TYPES.HEAL_BLOCK, duration: 3 },
    icon: '🚫',
    cost: 3,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 28
  },
  {
    id: 'poison',
    name: '剧毒术',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'debuff',
    description: '敌方单位中毒，每回合损失 8 点生命，持续 4 回合',
    effect: { type: STATUS_EFFECT_TYPES.POISON, duration: 4, value: 8 },
    icon: '☠️',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.RARE,
    weight: 28
  },
  {
    id: 'burn',
    name: '烈焰风暴',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'debuff',
    description: '敌方单位燃烧，每回合损失 10 点生命，持续 3 回合',
    effect: { type: STATUS_EFFECT_TYPES.BURN, duration: 3, value: 10 },
    icon: '🔥',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 25
  },
  {
    id: 'freeze',
    name: '寒冰禁锢',
    category: CARD_CATEGORY.INSTANT,
    type: 'debuff',
    description: '冰冻敌方单位 1 回合无法行动，期间受伤害增加 25%',
    effect: { type: STATUS_EFFECT_TYPES.FREEZE, duration: 1 },
    icon: '❄️',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 25
  },
  {
    id: 'bleed',
    name: '撕裂伤口',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'debuff',
    description: '敌方单位流血，每移动 1 格损失 5 点生命，持续 3 回合',
    effect: { type: STATUS_EFFECT_TYPES.BLEED, duration: 3, value: 5 },
    icon: '🩸',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.RARE,
    weight: 28
  },
  {
    id: 'summon',
    name: '召唤援兵',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在己方基地召唤一个步兵',
    effect: { type: 'summon', unitType: 'infantry' },
    icon: '📯',
    cost: 5,
    cooldown: 4,
    rarity: CARD_RARITY.RARE,
    weight: 22
  },
  {
    id: 'double_attack',
    name: '连续攻击',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '选中单位可攻击两次，持续 2 回合',
    effect: { type: 'doubleAttack', duration: 2 },
    icon: '⚔️⚔️',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 22
  },
  {
    id: 'counter_attack',
    name: '反击姿态',
    category: CARD_CATEGORY.COUNTER,
    type: 'buff',
    description: '选中单位下次受到攻击时反弹 50% 伤害',
    effect: { type: 'counterAttack', value: 0.5, duration: 1 },
    icon: '🔄',
    cost: 3,
    cooldown: 2,
    trigger: 'onAttacked',
    rarity: CARD_RARITY.RARE,
    weight: 25
  },
  {
    id: 'shield_wall',
    name: '护盾屏障',
    category: CARD_CATEGORY.COUNTER,
    type: 'buff',
    description: '选中单位下次受到攻击时免疫伤害',
    effect: { type: 'shield', duration: 1 },
    icon: '🛡️✨',
    cost: 4,
    cooldown: 3,
    trigger: 'onAttacked',
    rarity: CARD_RARITY.RARE,
    weight: 20
  },
  {
    id: 'status_resist',
    name: '钢铁意志',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '己方单位所有状态抗性 +50%，持续 3 回合',
    effect: { type: 'statusResistBoost', value: 0.5, duration: 3 },
    icon: '💪',
    cost: 3,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 25
  },
  {
    id: 'burning_terrain',
    name: '燃烧之地',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在目标格子及周围1格施放燃烧地形，持续3回合，增加移动消耗并造成火焰伤害',
    effect: { type: 'tileEffect', tileEffectType: TILE_EFFECT_TYPES.BURNING, duration: 3, radius: 1 },
    icon: '🌋',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 20
  },
  {
    id: 'frozen_terrain',
    name: '冰霜覆盖',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在目标格子上施放冰冻地形，持续2回合，大幅增加移动消耗并可能冰冻驻留单位',
    effect: { type: 'tileEffect', tileEffectType: TILE_EFFECT_TYPES.FROZEN, duration: 2 },
    icon: '🧊',
    cost: 3,
    cooldown: 2,
    rarity: CARD_RARITY.RARE,
    weight: 25
  },
  {
    id: 'poison_swamp',
    name: '毒沼蔓延',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在目标格子及周围1格施放毒沼地形，持续3回合，增加移动消耗并使驻留单位中毒',
    effect: { type: 'tileEffect', tileEffectType: TILE_EFFECT_TYPES.POISON_SWAMP, duration: 3, radius: 1 },
    icon: '🧪',
    cost: 4,
    cooldown: 3,
    rarity: CARD_RARITY.RARE,
    weight: 20
  },
  {
    id: 'divine_heal',
    name: '神圣复苏',
    category: CARD_CATEGORY.INSTANT,
    type: 'buff',
    description: '为选中单位恢复全部生命值并清除所有负面状态',
    effect: { type: 'heal', value: 999 },
    icon: '💖',
    cost: 5,
    cooldown: 5,
    rarity: CARD_RARITY.LIMITED,
    weight: 10
  },
  {
    id: 'war_cry',
    name: '战吼威压',
    category: CARD_CATEGORY.INSTANT,
    type: 'debuff',
    description: '使敌方单位攻击力降低 30%，持续 2 回合',
    effect: { type: STATUS_EFFECT_TYPES.SILENCE, duration: 2, value: 0.3 },
    icon: '📢',
    cost: 5,
    cooldown: 5,
    rarity: CARD_RARITY.LIMITED,
    weight: 10
  },
  {
    id: 'summon_elite',
    name: '精英召唤',
    category: CARD_CATEGORY.INSTANT,
    type: 'special',
    description: '在己方基地召唤一个骑兵',
    effect: { type: 'summon', unitType: 'cavalry' },
    icon: '🐴⚔️',
    cost: 6,
    cooldown: 6,
    rarity: CARD_RARITY.LIMITED,
    weight: 8
  },
  {
    id: 'meteor_strike',
    name: '陨石天降',
    category: CARD_CATEGORY.INSTANT,
    type: 'debuff',
    description: '对敌方单位造成 80 点伤害并眩晕 1 回合',
    effect: { type: 'damage', value: 80 },
    icon: '☄️',
    cost: 6,
    cooldown: 5,
    rarity: CARD_RARITY.LIMITED,
    weight: 8
  },
  {
    id: 'fortress',
    name: '不落要塞',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'buff',
    description: '选中单位防御力提升 200%且免疫控制效果，持续 2 回合',
    effect: { type: 'defenseBoost', value: 2.0, duration: 2 },
    icon: '🏯',
    cost: 5,
    cooldown: 5,
    rarity: CARD_RARITY.LIMITED,
    weight: 8
  }
];

export const cardConfig = {
  cardsPerTurn: 1,
  maxHandSize: 7,
  initialHandSize: 4,
  initialEnergy: 5,
  energyPerTurn: 3,
  maxEnergy: 10
};

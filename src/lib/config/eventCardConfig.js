import { STATUS_EFFECT_TYPES } from '$lib/config/unitConfig';

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
    cooldown: 1
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
    cooldown: 2
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
    cooldown: 2
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
    cooldown: 2
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
    cooldown: 1
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
    cooldown: 3
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
    cooldown: 2
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
    cooldown: 3
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
    cooldown: 2
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
    cooldown: 3
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
    cooldown: 3
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
    cooldown: 2
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
    cooldown: 4
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
    cooldown: 2
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
    cooldown: 3
  },
  {
    id: 'reveal',
    name: '侦查',
    category: CARD_CATEGORY.SUSTAIN,
    type: 'special',
    description: '显示所有敌方单位的详细信息，持续 2 回合',
    effect: { type: 'reveal', duration: 2 },
    icon: '👁️',
    cost: 2,
    cooldown: 2
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
    trigger: 'onAttacked'
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
    trigger: 'onAttacked'
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
    cooldown: 2
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
    cooldown: 3
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

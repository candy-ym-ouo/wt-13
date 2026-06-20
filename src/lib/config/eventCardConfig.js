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
    description: '使敌方单位 1 回合无法行动',
    effect: { type: 'stun', duration: 1 },
    icon: '💫',
    cost: 4,
    cooldown: 3
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
  }
];

export const cardConfig = {
  cardsPerTurn: 1,
  maxHandSize: 6,
  initialHandSize: 4,
  initialEnergy: 5,
  energyPerTurn: 3,
  maxEnergy: 10
};

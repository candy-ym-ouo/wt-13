export const eventCards = [
  {
    id: 'heal',
    name: '治愈之光',
    type: 'buff',
    description: '为选中单位恢复 50 点生命值',
    effect: { type: 'heal', value: 50 },
    icon: '💚'
  },
  {
    id: 'attack_boost',
    name: '战意激昂',
    type: 'buff',
    description: '选中单位本回合攻击力提升 50%',
    effect: { type: 'attackBoost', value: 0.5, duration: 1 },
    icon: '⚔️'
  },
  {
    id: 'defense_boost',
    name: '铁壁防御',
    type: 'buff',
    description: '选中单位本回合防御力提升 100%',
    effect: { type: 'defenseBoost', value: 1.0, duration: 1 },
    icon: '🛡️'
  },
  {
    id: 'move_boost',
    name: '疾风之靴',
    type: 'buff',
    description: '选中单位本回合移动力 +2',
    effect: { type: 'moveBoost', value: 2, duration: 1 },
    icon: '👟'
  },
  {
    id: 'damage',
    name: '闪电打击',
    type: 'debuff',
    description: '对敌方单位造成 40 点伤害',
    effect: { type: 'damage', value: 40 },
    icon: '⚡'
  },
  {
    id: 'stun',
    name: '眩晕术',
    type: 'debuff',
    description: '使敌方单位本回合无法行动',
    effect: { type: 'stun', duration: 1 },
    icon: '💫'
  },
  {
    id: 'summon',
    name: '召唤援兵',
    type: 'special',
    description: '在己方基地召唤一个步兵',
    effect: { type: 'summon', unitType: 'infantry' },
    icon: '📯'
  },
  {
    id: 'terrain_change',
    name: '大地震动',
    type: 'special',
    description: '将选中格子变为平原地形',
    effect: { type: 'terrainChange', terrain: 'plain' },
    icon: '🌍'
  },
  {
    id: 'double_attack',
    name: '连续攻击',
    type: 'buff',
    description: '选中单位本回合可攻击两次',
    effect: { type: 'doubleAttack', duration: 1 },
    icon: '⚔️⚔️'
  },
  {
    id: 'reveal',
    name: '侦查',
    type: 'special',
    description: '显示所有敌方单位的详细信息',
    effect: { type: 'reveal', duration: 1 },
    icon: '👁️'
  }
];

export const cardConfig = {
  cardsPerTurn: 1,
  maxHandSize: 5,
  initialHandSize: 3
};

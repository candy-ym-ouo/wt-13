export const EXPEDITION_EVENT_TYPES = {
  BATTLE: 'battle',
  SUPPLY: 'supply',
  RANDOM: 'random',
  SHRINE: 'shrine',
  SHOP: 'shop',
  BOSS: 'boss',
  REST: 'rest'
};

export const EXPEDITION_EVENT_INFO = {
  [EXPEDITION_EVENT_TYPES.BATTLE]: {
    name: '遭遇战',
    icon: '⚔️',
    color: '#e74c3c',
    description: '与敌军遭遇，必须战斗获胜才能继续'
  },
  [EXPEDITION_EVENT_TYPES.SUPPLY]: {
    name: '补给站',
    icon: '🎁',
    color: '#3498db',
    description: '获得补给物资，三选一'
  },
  [EXPEDITION_EVENT_TYPES.RANDOM]: {
    name: '随机事件',
    icon: '❓',
    color: '#9b59b6',
    description: '神秘事件，结果未知'
  },
  [EXPEDITION_EVENT_TYPES.SHRINE]: {
    name: '神殿',
    icon: '⛩️',
    color: '#f1c40f',
    description: '古老神殿，可获得强力祝福'
  },
  [EXPEDITION_EVENT_TYPES.SHOP]: {
    name: '旅行商人',
    icon: '🛒',
    color: '#e67e22',
    description: '花费金币购买装备和道具'
  },
  [EXPEDITION_EVENT_TYPES.BOSS]: {
    name: '首领战',
    icon: '👑',
    color: '#c0392b',
    description: '强大的首领守卫着终点'
  },
  [EXPEDITION_EVENT_TYPES.REST]: {
    name: '营地',
    icon: '🏕️',
    color: '#27ae60',
    description: '休整部队，恢复生命与士气'
  }
};

export const EXPEDITION_DIFFICULTY = {
  EASY: { id: 'easy', name: '简单', icon: '🌱', color: '#27ae60', layerCount: 5, enemyStrength: 0.8, rewardMultiplier: 0.8 },
  NORMAL: { id: 'normal', name: '普通', icon: '⚔️', color: '#f39c12', layerCount: 7, enemyStrength: 1.0, rewardMultiplier: 1.0 },
  HARD: { id: 'hard', name: '困难', icon: '🔥', color: '#e74c3c', layerCount: 10, enemyStrength: 1.3, rewardMultiplier: 1.5 },
  EXTREME: { id: 'extreme', name: '极限', icon: '💀', color: '#8e44ad', layerCount: 12, enemyStrength: 1.6, rewardMultiplier: 2.0 }
};

export const BATTLE_REWARD_CONFIG = {
  gold: { min: 30, max: 80 },
  exp: { min: 20, max: 50 },
  cardDropChance: 0.4,
  equipmentDropChance: 0.3
};

export const BOSS_REWARD_CONFIG = {
  gold: { min: 200, max: 400 },
  exp: { min: 100, max: 200 },
  cardDropChance: 1.0,
  equipmentDropChance: 1.0,
  guaranteedEquipmentCount: 2
};

export const SUPPLY_TYPES = {
  HEAL: 'heal',
  GOLD: 'gold',
  CARD: 'card',
  EQUIPMENT: 'equipment',
  BUFF: 'buff',
  UNIT: 'unit'
};

export const SUPPLY_INFO = {
  [SUPPLY_TYPES.HEAL]: { name: '全军治疗', icon: '💚', description: '恢复所有单位50%生命值' },
  [SUPPLY_TYPES.GOLD]: { name: '金币宝箱', icon: '💰', description: '获得大量金币' },
  [SUPPLY_TYPES.CARD]: { name: '神秘卡包', icon: '🃏', description: '获得3张随机卡牌' },
  [SUPPLY_TYPES.EQUIPMENT]: { name: '装备宝箱', icon: '🎁', description: '获得1件随机装备' },
  [SUPPLY_TYPES.BUFF]: { name: '战旗增益', icon: '🚩', description: '下一场战斗全属性+15%' },
  [SUPPLY_TYPES.UNIT]: { name: '佣兵招募', icon: '📯', description: '招募1名随机佣兵' }
};

export const RANDOM_EVENTS = [
  {
    id: 'mercenary_join',
    name: '流浪佣兵',
    icon: '⚔️',
    description: '一名流浪的佣兵愿意加入你的队伍',
    outcomes: [
      { type: 'unit', weight: 0.7, description: '佣兵加入了你的队伍' },
      { type: 'gold', weight: 0.3, value: -50, description: '佣兵索要了50金币作为定金后离开了...' }
    ]
  },
  {
    id: 'ancient_trap',
    name: '远古陷阱',
    icon: '⚠️',
    description: '你触发了一个远古陷阱！',
    outcomes: [
      { type: 'damage', weight: 0.5, value: 20, description: '部队受到20%生命值伤害' },
      { type: 'treasure', weight: 0.5, description: '陷阱是伪装的，你发现了宝藏！' }
    ]
  },
  {
    id: 'abandoned_camp',
    name: '废弃营地',
    icon: '🏚️',
    description: '发现了一处废弃的营地',
    outcomes: [
      { type: 'supply', weight: 0.6, description: '找到了一些补给品' },
      { type: 'nothing', weight: 0.4, description: '什么都没有找到' }
    ]
  },
  {
    id: 'mysterious_merchant',
    name: '神秘商人',
    icon: '🧙',
    description: '一位神秘的商人出现在你面前',
    outcomes: [
      { type: 'shop_discount', weight: 0.5, description: '商人给了你一张折扣券' },
      { type: 'rare_item', weight: 0.5, description: '以半价获得了一件稀有物品' }
    ]
  },
  {
    id: 'weather_storm',
    name: '暴风骤雨',
    icon: '⛈️',
    description: '突如其来的暴风雨',
    outcomes: [
      { type: 'morale_down', weight: 0.6, value: 10, description: '士气下降10点' },
      { type: 'shelter', weight: 0.4, description: '找到了避风处，反而得到了休息' }
    ]
  },
  {
    id: 'dragon_hoard',
    name: '龙之宝穴',
    icon: '🐉',
    description: '传说中的龙之宝穴！',
    outcomes: [
      { type: 'boss_early', weight: 0.4, description: '守宝巨龙苏醒了！' },
      { type: 'legendary_loot', weight: 0.3, description: '你找到了传说中的宝物！' },
      { type: 'trap', weight: 0.3, description: '这是个陷阱！受到大量伤害' }
    ]
  },
  {
    id: 'friendly_village',
    name: '友善村庄',
    icon: '🏘️',
    description: '经过一个友善的村庄',
    outcomes: [
      { type: 'heal_small', weight: 0.4, description: '村民们为你治疗了伤员' },
      { type: 'gold_gift', weight: 0.3, description: '村民们捐赠了一些金币' },
      { type: 'volunteer', weight: 0.3, description: '一名志愿者加入了你的队伍' }
    ]
  },
  {
    id: 'haunted_forest',
    name: '幽灵森林',
    icon: '👻',
    description: '穿越阴森的幽灵森林',
    outcomes: [
      { type: 'haunt_debuff', weight: 0.5, description: '被幽灵缠绕，下一战属性降低' },
      { type: 'ghost_loot', weight: 0.3, description: '击败幽灵，获得了灵界装备' },
      { type: 'lost', weight: 0.2, description: '迷失方向，消耗了额外补给' }
    ]
  }
];

export const BOSS_UNITS = [
  {
    id: 'dragon_lord',
    name: '巨龙领主',
    icon: '🐲',
    unitTypes: ['tank', 'mage', 'mage', 'archer'],
    strengthMultiplier: 1.8,
    description: '远古巨龙，拥有毁灭性的吐息'
  },
  {
    id: 'dark_knight',
    name: '暗黑骑士',
    icon: '🖤',
    unitTypes: ['tank', 'tank', 'cavalry', 'cavalry'],
    strengthMultiplier: 1.6,
    description: '堕落的骑士，以黑暗力量著称'
  },
  {
    id: 'lich_king',
    name: '巫妖王',
    icon: '💀',
    unitTypes: ['mage', 'mage', 'mage', 'tank'],
    strengthMultiplier: 1.7,
    description: '掌控亡灵之力的不死法师'
  },
  {
    id: 'demon_lord',
    name: '恶魔君主',
    icon: '👹',
    unitTypes: ['infantry', 'cavalry', 'mage', 'archer'],
    strengthMultiplier: 1.9,
    description: '深渊之主，拥有无尽的邪恶力量'
  }
];

export const SHRINE_BLESSINGS = [
  {
    id: 'warrior_blessing',
    name: '战士祝福',
    icon: '⚔️',
    description: '攻击力永久+20%',
    effect: { type: 'attackBoost', value: 0.2, permanent: true }
  },
  {
    id: 'guardian_blessing',
    name: '守护者祝福',
    icon: '🛡️',
    description: '防御力永久+25%',
    effect: { type: 'defenseBoost', value: 0.25, permanent: true }
  },
  {
    id: 'vitality_blessing',
    name: '生命祝福',
    icon: '❤️',
    description: '最大生命值永久+30%',
    effect: { type: 'maxHpBoost', value: 0.3, permanent: true }
  },
  {
    id: 'swiftness_blessing',
    name: '疾风祝福',
    icon: '💨',
    description: '移动力永久+1',
    effect: { type: 'moveBoost', value: 1, permanent: true }
  },
  {
    id: 'fortune_blessing',
    name: '财富祝福',
    icon: '💰',
    description: '所有金币收益+50%',
    effect: { type: 'goldBoost', value: 0.5, permanent: true }
  },
  {
    id: 'wisdom_blessing',
    name: '智慧祝福',
    icon: '📚',
    description: '经验收益+50%',
    effect: { type: 'expBoost', value: 0.5, permanent: true }
  }
];

export const SHOP_ITEMS_EXPEDITION = [
  { id: 'heal_potion', name: '治疗药水', icon: '🧪', price: 50, effect: { type: 'heal', value: 30 } },
  { id: 'full_heal', name: '完全恢复药', icon: '💊', price: 150, effect: { type: 'healFull', value: 100 } },
  { id: 'morale_boost', name: '士气鼓舞', icon: '📣', price: 80, effect: { type: 'moraleBoost', value: 20 } },
  { id: 'attack_scroll', name: '力量卷轴', icon: '📜', price: 120, effect: { type: 'tempAttack', value: 0.3, duration: 2 } },
  { id: 'defense_scroll', name: '护盾卷轴', icon: '📜', price: 120, effect: { type: 'tempDefense', value: 0.3, duration: 2 } },
  { id: 'lucky_charm', name: '幸运护符', icon: '🍀', price: 200, effect: { type: 'luckBoost', value: 0.2, permanent: true } }
];

export function getRandomBoss() {
  return BOSS_UNITS[Math.floor(Math.random() * BOSS_UNITS.length)];
}

export function getRandomBlessing() {
  return SHRINE_BLESSINGS[Math.floor(Math.random() * SHRINE_BLESSINGS.length)];
}

export function getRandomEvent() {
  return RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
}

export function getRandomSupplyTypes(count = 3) {
  const types = Object.values(SUPPLY_TYPES);
  const shuffled = [...types].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

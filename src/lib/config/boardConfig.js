export const TILE_EFFECT_TYPES = {
  BURNING: 'burning',
  FROZEN: 'frozen',
  POISON_SWAMP: 'poison_swamp'
};

export const tileEffectConfig = {
  [TILE_EFFECT_TYPES.BURNING]: {
    name: '燃烧',
    icon: '🔥',
    color: 0xff4500,
    overlayAlpha: 0.35,
    moveCostAdd: 1,
    damagePerTurn: 8,
    defaultDuration: 3,
    description: '燃烧地形，增加移动消耗，对驻留单位造成持续火焰伤害'
  },
  [TILE_EFFECT_TYPES.FROZEN]: {
    name: '冰冻',
    icon: '❄️',
    color: 0x00bfff,
    overlayAlpha: 0.4,
    moveCostAdd: 2,
    damagePerTurn: 0,
    defaultDuration: 2,
    applyStatus: 'freeze',
    applyStatusDuration: 1,
    description: '冰冻地形，大幅增加移动消耗，驻留单位可能被冰冻'
  },
  [TILE_EFFECT_TYPES.POISON_SWAMP]: {
    name: '毒沼',
    icon: '☠️',
    color: 0x8b008b,
    overlayAlpha: 0.35,
    moveCostAdd: 1,
    damagePerTurn: 5,
    defaultDuration: 3,
    applyStatus: 'poison',
    applyStatusDuration: 2,
    applyStatusValue: 6,
    description: '毒沼地形，增加移动消耗，对驻留单位造成中毒和持续伤害'
  }
};

export const boardConfig = {
  width: 10,
  height: 8,
  tileSize: 64,
  terrain: {
    plain: { name: '平原', color: 0x4a7c59, moveCost: 1, defenseBonus: 0, moraleBonus: 0 },
    forest: { name: '森林', color: 0x2d5a27, moveCost: 2, defenseBonus: 2, moraleBonus: 5 },
    mountain: { name: '山地', color: 0x6b5b45, moveCost: 3, defenseBonus: 3, moraleBonus: 5 },
    water: { name: '水域', color: 0x3498db, moveCost: 99, defenseBonus: 0, passable: false, moraleBonus: 0 },
    outpost: { name: '前哨站', color: 0xdaa520, moveCost: 1, defenseBonus: 1, moraleBonus: 3, isCapturePoint: true, captureGoldPerTurn: 25, icon: '🏴' },
    mine: { name: '金矿', color: 0xffd700, moveCost: 1, defenseBonus: 0, moraleBonus: 2, isCapturePoint: true, captureGoldPerTurn: 35, icon: '💰' },
    base_red: { name: '红方基地', color: 0xc0392b, moveCost: 1, defenseBonus: 2, isBase: true, faction: 'red', moraleBonus: 10, baseDurability: 100, maxDurability: 100, repairPerTurn: 5, goldPerTurn: 50 },
    base_blue: { name: '蓝方基地', color: 0x2980b9, moveCost: 1, defenseBonus: 2, isBase: true, faction: 'blue', moraleBonus: 10, baseDurability: 100, maxDurability: 100, repairPerTurn: 5, goldPerTurn: 50 }
  },
  layout: [
    ['base_red', 'plain', 'plain', 'forest', 'outpost', 'plain', 'forest', 'plain', 'plain', 'base_blue'],
    ['plain', 'plain', 'forest', 'plain', 'plain', 'mountain', 'plain', 'plain', 'forest', 'plain'],
    ['plain', 'forest', 'mine', 'plain', 'mountain', 'mountain', 'plain', 'mine', 'plain', 'plain'],
    ['water', 'water', 'plain', 'plain', 'plain', 'plain', 'plain', 'forest', 'plain', 'plain'],
    ['water', 'water', 'plain', 'forest', 'outpost', 'outpost', 'plain', 'plain', 'mountain', 'plain'],
    ['plain', 'plain', 'plain', 'plain', 'mountain', 'plain', 'forest', 'plain', 'plain', 'plain'],
    ['plain', 'forest', 'plain', 'mine', 'plain', 'forest', 'plain', 'plain', 'forest', 'plain'],
    ['base_red', 'plain', 'mountain', 'plain', 'outpost', 'plain', 'mountain', 'plain', 'plain', 'base_blue']
  ]
};

export const boardConfig = {
  width: 10,
  height: 8,
  tileSize: 64,
  terrain: {
    plain: { name: '平原', color: 0x4a7c59, moveCost: 1, defenseBonus: 0, moraleBonus: 0 },
    forest: { name: '森林', color: 0x2d5a27, moveCost: 2, defenseBonus: 2, moraleBonus: 5 },
    mountain: { name: '山地', color: 0x6b5b45, moveCost: 3, defenseBonus: 3, moraleBonus: 5 },
    water: { name: '水域', color: 0x3498db, moveCost: 99, defenseBonus: 0, passable: false, moraleBonus: 0 },
    base_red: { name: '红方基地', color: 0xc0392b, moveCost: 1, defenseBonus: 1, isBase: true, faction: 'red', moraleBonus: 10 },
    base_blue: { name: '蓝方基地', color: 0x2980b9, moveCost: 1, defenseBonus: 1, isBase: true, faction: 'blue', moraleBonus: 10 }
  },
  layout: [
    ['base_red', 'plain', 'plain', 'forest', 'plain', 'plain', 'forest', 'plain', 'plain', 'base_blue'],
    ['plain', 'plain', 'forest', 'plain', 'plain', 'mountain', 'plain', 'plain', 'forest', 'plain'],
    ['plain', 'forest', 'plain', 'plain', 'mountain', 'mountain', 'plain', 'plain', 'plain', 'plain'],
    ['water', 'water', 'plain', 'plain', 'plain', 'plain', 'plain', 'forest', 'plain', 'plain'],
    ['water', 'water', 'plain', 'forest', 'plain', 'plain', 'plain', 'plain', 'mountain', 'plain'],
    ['plain', 'plain', 'plain', 'plain', 'mountain', 'plain', 'forest', 'plain', 'plain', 'plain'],
    ['plain', 'forest', 'plain', 'plain', 'plain', 'forest', 'plain', 'plain', 'forest', 'plain'],
    ['base_red', 'plain', 'mountain', 'plain', 'plain', 'plain', 'mountain', 'plain', 'plain', 'base_blue']
  ]
};

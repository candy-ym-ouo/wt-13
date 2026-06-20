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
    description: '基础单位，攻守平衡'
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
    description: '高机动高攻击，防御较弱'
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
    description: '远程攻击，近战脆弱'
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
    description: '高伤害法术单位，非常脆弱'
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
    description: '高生命高防御，移动缓慢'
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

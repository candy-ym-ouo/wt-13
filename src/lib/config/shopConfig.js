/**
 * @typedef {'infantry' | 'archer' | 'mage' | 'tank' | 'cavalry'} UnitType
 */

/**
 * @typedef {object} ShopItem
 * @property {string} id
 * @property {string} name
 * @property {'unit' | 'resource' | 'buff' | 'repair'} type
 * @property {string} description
 * @property {number} cost
 * @property {UnitType} [unitType]
 * @property {string} [icon]
 * @property {number} [value]
 * @property {string} [effect]
 * @property {number} [cooldown]
 * @property {number} [maxPurchasesPerTurn]
 */

/** @type {ShopItem[]} */
export const shopItems = [
  {
    id: 'buy_infantry',
    name: '招募步兵',
    type: 'unit',
    unitType: 'infantry',
    description: '招募1名步兵单位，召唤至基地附近',
    cost: 100,
    icon: '⚔️',
    maxPurchasesPerTurn: 2
  },
  {
    id: 'buy_cavalry',
    name: '招募骑兵',
    type: 'unit',
    unitType: 'cavalry',
    description: '招募1名骑兵单位，召唤至基地附近',
    cost: 150,
    icon: '🐴',
    maxPurchasesPerTurn: 2
  },
  {
    id: 'buy_archer',
    name: '招募弓兵',
    type: 'unit',
    unitType: 'archer',
    description: '招募1名弓兵单位，召唤至基地附近',
    cost: 120,
    icon: '🏹',
    maxPurchasesPerTurn: 2
  },
  {
    id: 'buy_mage',
    name: '招募法师',
    type: 'unit',
    unitType: 'mage',
    description: '招募1名法师单位，召唤至基地附近',
    cost: 200,
    icon: '🔮',
    maxPurchasesPerTurn: 1
  },
  {
    id: 'buy_tank',
    name: '招募重甲兵',
    type: 'unit',
    unitType: 'tank',
    description: '招募1名重甲兵单位，召唤至基地附近',
    cost: 180,
    icon: '🛡️',
    maxPurchasesPerTurn: 1
  },
  {
    id: 'repair_base',
    name: '修复基地',
    type: 'repair',
    description: '立即恢复己方基地40点耐久',
    cost: 80,
    icon: '🔧',
    value: 40,
    effect: 'repair_base',
    maxPurchasesPerTurn: 2
  },
  {
    id: 'gold_infusion',
    name: '紧急筹款',
    type: 'resource',
    description: '下回合额外获得50金币，但所有单位士气-5',
    cost: 0,
    icon: '💸',
    value: 50,
    effect: 'next_turn_gold_bonus',
    maxPurchasesPerTurn: 1
  },
  {
    id: 'supply_drop',
    name: '补给投放',
    type: 'buff',
    description: '己方所有单位士气+10，下回合维护费减半',
    cost: 120,
    icon: '📦',
    value: 10,
    effect: 'morale_boost_maintenance_discount',
    maxPurchasesPerTurn: 1
  }
];

export const shopConfig = {
  openFromTurn: 2,
  purchaseCooldownPerItem: 1
};

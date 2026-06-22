export const EQUIPMENT_SLOTS = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  RELIC: 'relic'
};

export const EQUIPMENT_SLOT_INFO = {
  [EQUIPMENT_SLOTS.WEAPON]: { name: '武器', icon: '⚔️', color: '#f44336' },
  [EQUIPMENT_SLOTS.ARMOR]: { name: '护甲', icon: '🛡️', color: '#2196f3' },
  [EQUIPMENT_SLOTS.ACCESSORY]: { name: '饰品', icon: '💍', color: '#9c27b0' },
  [EQUIPMENT_SLOTS.RELIC]: { name: '遗物', icon: '🏺', color: '#ff9800' }
};

export const RARITY_CONFIG = {
  COMMON: { id: 'common', name: '普通', color: '#9e9e9e', statMultiplier: 1.0, dropWeight: 50 },
  UNCOMMON: { id: 'uncommon', name: '优秀', color: '#4caf50', statMultiplier: 1.2, dropWeight: 30 },
  RARE: { id: 'rare', name: '稀有', color: '#2196f3', statMultiplier: 1.5, dropWeight: 14 },
  EPIC: { id: 'epic', name: '史诗', color: '#9c27b0', statMultiplier: 2.0, dropWeight: 5 },
  LEGENDARY: { id: 'legendary', name: '传说', color: '#ff9800', statMultiplier: 3.0, dropWeight: 1 }
};

export const RARITIES = {
  COMMON: 'COMMON',
  UNCOMMON: 'UNCOMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY'
};

export const EQUIPMENT_SETS = {
  warrior_set: {
    id: 'warrior_set',
    name: '战士套装',
    description: '近战输出套装，提升攻击与生命',
    color: '#e74c3c',
    pieces: ['warrior_blade', 'warrior_armor', 'warrior_ring'],
    bonuses: {
      2: { type: 'attackBoost', value: 0.1, label: '2件套：攻击+10%' },
      3: { type: 'maxHpBoost', value: 0.15, label: '3件套：最大生命+15%' }
    }
  },
  guardian_set: {
    id: 'guardian_set',
    name: '守护者套装',
    description: '防御坦克套装，大幅提升防御',
    color: '#3498db',
    pieces: ['guardian_shield', 'guardian_plate', 'guardian_amulet'],
    bonuses: {
      2: { type: 'defenseBoost', value: 0.15, label: '2件套：防御+15%' },
      3: { type: 'damageReduction', value: 0.1, label: '3件套：受到伤害-10%' }
    }
  },
  ranger_set: {
    id: 'ranger_set',
    name: '游侠套装',
    description: '远程输出套装，提升射程与攻击',
    color: '#9b59b6',
    pieces: ['ranger_bow', 'ranger_leather', 'ranger_quiver'],
    bonuses: {
      2: { type: 'attackRange', value: 1, label: '2件套：攻击距离+1' },
      3: { type: 'attackBoost', value: 0.2, label: '3件套：攻击+20%' }
    }
  },
  mage_set: {
    id: 'mage_set',
    name: '法师套装',
    description: '法术输出套装，强化状态效果',
    color: '#1abc9c',
    pieces: ['mage_staff', 'mage_robe', 'mage_crystal'],
    bonuses: {
      2: { type: 'statusDuration', value: 1, label: '2件套：状态持续+1回合' },
      3: { type: 'attackBoost', value: 0.25, label: '3件套：攻击+25%' }
    }
  },
  speed_set: {
    id: 'speed_set',
    name: '疾风套装',
    description: '机动套装，大幅提升移动力',
    color: '#f39c12',
    pieces: ['wind_blade', 'wind_boots', 'wind_ring'],
    bonuses: {
      2: { type: 'moveBoost', value: 1, label: '2件套：移动力+1' },
      3: { type: 'moveBoost', value: 2, label: '3件套：移动力+2' }
    }
  }
};

export const equipmentConfig = {
  warrior_blade: {
    id: 'warrior_blade',
    name: '战士之刃',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'RARE',
    set: 'warrior_set',
    description: '锋利的战刀，专为近身战斗设计',
    baseStats: {
      attack: 12,
      defense: 2
    },
    specialEffects: [
      { type: 'counterBoost', value: 0.1, description: '反击伤害+10%' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'tank']
  },
  warrior_armor: {
    id: 'warrior_armor',
    name: '战士重甲',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'RARE',
    set: 'warrior_set',
    description: '坚固的重甲，攻守兼备',
    baseStats: {
      defense: 8,
      maxHp: 30
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'tank']
  },
  warrior_ring: {
    id: 'warrior_ring',
    name: '战士之戒',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'EPIC',
    set: 'warrior_set',
    description: '蕴含战士意志的戒指',
    baseStats: {
      attack: 5,
      maxHp: 20
    },
    specialEffects: [
      { type: 'moraleBoost', value: 10, description: '士气上限+10' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'tank', 'archer', 'mage']
  },
  guardian_shield: {
    id: 'guardian_shield',
    name: '守护者之盾',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'RARE',
    set: 'guardian_set',
    description: '巨大的塔盾，可抵挡大部分伤害',
    baseStats: {
      defense: 15,
      attack: 3
    },
    specialEffects: [
      { type: 'shieldChance', value: 0.15, description: '15%概率完全抵消伤害' }
    ],
    allowedTypes: ['tank', 'infantry']
  },
  guardian_plate: {
    id: 'guardian_plate',
    name: '守护者板甲',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'RARE',
    set: 'guardian_set',
    description: '厚重的板甲，提供超强防护',
    baseStats: {
      defense: 12,
      maxHp: 50
    },
    specialEffects: [],
    allowedTypes: ['tank', 'infantry']
  },
  guardian_amulet: {
    id: 'guardian_amulet',
    name: '守护者护符',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'EPIC',
    set: 'guardian_set',
    description: '神圣的护符，可抵御状态效果',
    baseStats: {
      defense: 5,
      maxHp: 25
    },
    specialEffects: [
      { type: 'statusResistAll', value: 0.2, description: '全状态抗性+20%' }
    ],
    allowedTypes: ['tank', 'infantry', 'cavalry', 'archer', 'mage']
  },
  ranger_bow: {
    id: 'ranger_bow',
    name: '游侠长弓',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'RARE',
    set: 'ranger_set',
    description: '精准的长弓，射程更远',
    baseStats: {
      attack: 10,
      attackRange: 1
    },
    specialEffects: [],
    allowedTypes: ['archer']
  },
  ranger_leather: {
    id: 'ranger_leather',
    name: '游侠皮甲',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'RARE',
    set: 'ranger_set',
    description: '轻便的皮甲，不影响机动性',
    baseStats: {
      defense: 5,
      moveRange: 1
    },
    specialEffects: [],
    allowedTypes: ['archer', 'cavalry']
  },
  ranger_quiver: {
    id: 'ranger_quiver',
    name: '游侠箭袋',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'EPIC',
    set: 'ranger_set',
    description: '装有魔法箭矢的箭袋',
    baseStats: {
      attack: 8
    },
    specialEffects: [
      { type: 'doubleAttackChance', value: 0.1, description: '10%概率攻击两次' }
    ],
    allowedTypes: ['archer']
  },
  mage_staff: {
    id: 'mage_staff',
    name: '法师法杖',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'RARE',
    set: 'mage_set',
    description: '蕴含魔力的法杖',
    baseStats: {
      attack: 15
    },
    specialEffects: [
      { type: 'statusChanceBoost', value: 0.15, description: '状态命中+15%' }
    ],
    allowedTypes: ['mage']
  },
  mage_robe: {
    id: 'mage_robe',
    name: '法师长袍',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'RARE',
    set: 'mage_set',
    description: '轻盈的魔法长袍，附魔的长袍，增强法术威力',
    baseStats: {
      defense: 4,
      maxHp: 15
    },
    specialEffects: [],
    allowedTypes: ['mage']
  },
  mage_crystal: {
    id: 'mage_crystal',
    name: '法师水晶',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'EPIC',
    set: 'mage_set',
    description: '聚焦魔力的水晶',
    baseStats: {
      attack: 6
    },
    specialEffects: [
      { type: 'dotBoost', value: 0.25, description: '持续伤害+25%' }
    ],
    allowedTypes: ['mage']
  },
  wind_blade: {
    id: 'wind_blade',
    name: '疾风之刃',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'RARE',
    set: 'speed_set',
    description: '如风般迅捷的利刃',
    baseStats: {
      attack: 8,
      moveRange: 1
    },
    specialEffects: [],
    allowedTypes: ['cavalry', 'infantry']
  },
  wind_boots: {
    id: 'wind_boots',
    name: '疾风之靴',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'RARE',
    set: 'speed_set',
    description: '轻盈的靴子，健步如飞',
    baseStats: {
      defense: 3,
      moveRange: 1
    },
    specialEffects: [],
    allowedTypes: ['cavalry', 'infantry', 'archer', 'mage']
  },
  wind_ring: {
    id: 'wind_ring',
    name: '疾风之戒',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'EPIC',
    set: 'speed_set',
    description: '蕴含风之力量的戒指',
    baseStats: {
      attack: 5,
      moveRange: 1
    },
    specialEffects: [
      { type: 'dodgeChance', value: 0.1, description: '10%闪避概率' }
    ],
    allowedTypes: ['cavalry', 'infantry', 'archer', 'mage', 'tank']
  },
  iron_sword: {
    id: 'iron_sword',
    name: '铁剑',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'COMMON',
    set: null,
    description: '普通的铁制长剑',
    baseStats: {
      attack: 5
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'tank']
  },
  leather_armor: {
    id: 'leather_armor',
    name: '皮甲',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'COMMON',
    set: null,
    description: '轻便的皮革护甲',
    baseStats: {
      defense: 3,
      maxHp: 10
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  simple_ring: {
    id: 'simple_ring',
    name: '朴素戒指',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'COMMON',
    set: null,
    description: '一枚普通的戒指',
    baseStats: {
      attack: 2,
      defense: 1
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  flame_blade: {
    id: 'flame_blade',
    name: '烈焰之刃',
    slot: EQUIPMENT_SLOTS.WEAPON,
    rarity: 'LEGENDARY',
    set: null,
    description: '燃烧着永恒火焰的神剑',
    baseStats: {
      attack: 25
    },
    specialEffects: [
      { type: 'applyStatusOnAttack', status: 'burn', chance: 0.3, duration: 2, value: 8, description: '30%概率附加燃烧（8伤害/回合）' }
    ],
    allowedTypes: ['infantry', 'cavalry']
  },
  frost_armor: {
    id: 'frost_armor',
    name: '寒冰护甲',
    slot: EQUIPMENT_SLOTS.ARMOR,
    rarity: 'LEGENDARY',
    set: null,
    description: '由永恒寒冰锻造的护甲',
    baseStats: {
      defense: 20,
      maxHp: 60
    },
    specialEffects: [
      { type: 'reflectStatusOnHit', status: 'slow', chance: 0.25, duration: 1, description: '25%概率使攻击者减速' }
    ],
    allowedTypes: ['tank', 'infantry']
  },
  dragon_amulet: {
    id: 'dragon_amulet',
    name: '龙心护符',
    slot: EQUIPMENT_SLOTS.ACCESSORY,
    rarity: 'LEGENDARY',
    set: null,
    description: '蕴含龙之力量的护符',
    baseStats: {
      attack: 10,
      defense: 8,
      maxHp: 40
    },
    specialEffects: [
      { type: 'reviveChance', value: 0.15, description: '15%概率死亡时复活（30%生命）' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  }
};

export const relicConfig = {
  phoenix_feather: {
    id: 'phoenix_feather',
    name: '凤凰之羽',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'LEGENDARY',
    description: '凤凰的羽毛，拥有重生之力',
    baseStats: {
      maxHp: 50
    },
    specialEffects: [
      { type: 'reviveOnce', value: 0.5, description: '每场战斗首次阵亡时复活，恢复50%生命' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  wisdom_scroll: {
    id: 'wisdom_scroll',
    name: '智慧卷轴',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'EPIC',
    description: '记载古老智慧的卷轴',
    baseStats: {
      attack: 8,
      defense: 5
    },
    specialEffects: [
      { type: 'expBoost', value: 0.25, description: '获得经验+25%' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  vampire_fang: {
    id: 'vampire_fang',
    name: '吸血獠牙',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'EPIC',
    description: '吸血鬼的獠牙，攻击时吸取生命',
    baseStats: {
      attack: 6
    },
    specialEffects: [
      { type: 'lifeSteal', value: 0.15, description: '造成伤害时回复15%生命' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  lucky_coin: {
    id: 'lucky_coin',
    name: '幸运金币',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'RARE',
    description: '带来好运的金币',
    baseStats: {
      attack: 3,
      defense: 3
    },
    specialEffects: [
      { type: 'critChance', value: 0.1, description: '10%暴击概率（1.5倍伤害）' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  stone_skin: {
    id: 'stone_skin',
    name: '石肤护符',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'RARE',
    description: '石化皮肤的护符',
    baseStats: {
      defense: 8
    },
    specialEffects: [
      { type: 'damageReduction', value: 0.05, description: '受到伤害-5%' }
    ],
    allowedTypes: ['infantry', 'cavalry', 'tank', 'archer', 'mage']
  },
  speed_boots: {
    id: 'speed_boots',
    name: '神速靴',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'UNCOMMON',
    description: '大幅提升移动速度',
    baseStats: {
      moveRange: 2
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  health_pendant: {
    id: 'health_pendant',
    name: '生命吊坠',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'UNCOMMON',
    description: '增强生命力的吊坠',
    baseStats: {
      maxHp: 40
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  },
  power_crystal: {
    id: 'power_crystal',
    name: '力量水晶',
    slot: EQUIPMENT_SLOTS.RELIC,
    rarity: 'COMMON',
    description: '蕴含力量的水晶',
    baseStats: {
      attack: 5
    },
    specialEffects: [],
    allowedTypes: ['infantry', 'cavalry', 'archer', 'mage', 'tank']
  }
};

export function getAllEquipment() {
  return { ...equipmentConfig, ...relicConfig };
}

export function getEquipmentById(id) {
  return equipmentConfig[id] || relicConfig[id] || null;
}

export function getEquipmentBySlot(slot) {
  const all = getAllEquipment();
  return Object.values(all).filter(e => e.slot === slot);
}

export function getSetById(setId) {
  return EQUIPMENT_SETS[setId] || null;
}

export function canEquip(unitType, equipment) {
  if (!equipment || !equipment.allowedTypes) return false;
  return equipment.allowedTypes.includes(unitType);
}

export function getRarityInfo(rarity) {
  return RARITY_CONFIG[rarity.toUpperCase()] || RARITY_CONFIG.COMMON;
}

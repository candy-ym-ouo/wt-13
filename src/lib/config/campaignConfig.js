export const TERRAIN_TYPES = {
  PLAIN: 'plain',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  WATER: 'water',
  BASE_RED: 'base_red',
  BASE_BLUE: 'base_blue',
  ROAD: 'road',
  RUINS: 'ruins',
  FORTRESS: 'fortress'
};

export const TERRAIN_CONFIG = {
  [TERRAIN_TYPES.PLAIN]: {
    name: '平原',
    icon: '🌾',
    color: 0x4a7c59,
    moveCost: 1,
    defenseBonus: 0,
    moraleBonus: 0,
    passable: true,
    description: '普通平原地形，无特殊效果'
  },
  [TERRAIN_TYPES.FOREST]: {
    name: '森林',
    icon: '🌲',
    color: 0x2d5a27,
    moveCost: 2,
    defenseBonus: 2,
    moraleBonus: 5,
    passable: true,
    description: '森林地形，提供防御加成和士气加成'
  },
  [TERRAIN_TYPES.MOUNTAIN]: {
    name: '山地',
    icon: '⛰️',
    color: 0x6b5b45,
    moveCost: 3,
    defenseBonus: 3,
    moraleBonus: 5,
    passable: true,
    description: '山地地形，高防御加成，移动消耗大'
  },
  [TERRAIN_TYPES.WATER]: {
    name: '水域',
    icon: '🌊',
    color: 0x3498db,
    moveCost: 99,
    defenseBonus: 0,
    moraleBonus: 0,
    passable: false,
    description: '水域地形，不可通行'
  },
  [TERRAIN_TYPES.BASE_RED]: {
    name: '红方基地',
    icon: '🏰',
    color: 0xc0392b,
    moveCost: 1,
    defenseBonus: 2,
    moraleBonus: 10,
    passable: true,
    isBase: true,
    faction: 'red',
    baseDurability: 100,
    maxDurability: 100,
    repairPerTurn: 5,
    description: '红方主基地，被摧毁则失败'
  },
  [TERRAIN_TYPES.BASE_BLUE]: {
    name: '蓝方基地',
    icon: '🏯',
    color: 0x2980b9,
    moveCost: 1,
    defenseBonus: 2,
    moraleBonus: 10,
    passable: true,
    isBase: true,
    faction: 'blue',
    baseDurability: 100,
    maxDurability: 100,
    repairPerTurn: 5,
    description: '蓝方主基地，被摧毁则失败'
  },
  [TERRAIN_TYPES.ROAD]: {
    name: '道路',
    icon: '🛤️',
    color: 0xd4a574,
    moveCost: 0.5,
    defenseBonus: -1,
    moraleBonus: 0,
    passable: true,
    description: '道路地形，移动消耗减少，但防御降低'
  },
  [TERRAIN_TYPES.RUINS]: {
    name: '废墟',
    icon: '🏚️',
    color: 0x7f8c8d,
    moveCost: 2,
    defenseBonus: 1,
    moraleBonus: 0,
    passable: true,
    description: '废墟地形，提供少量防御加成'
  },
  [TERRAIN_TYPES.FORTRESS]: {
    name: '要塞',
    icon: '🏛️',
    color: 0x8e44ad,
    moveCost: 2,
    defenseBonus: 4,
    moraleBonus: 8,
    passable: true,
    description: '要塞地形，高额防御和士气加成'
  }
};

export const EVENT_TRIGGER_TYPES = {
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  UNIT_DEATH: 'unit_death',
  UNIT_ENTER_TILE: 'unit_enter_tile',
  BASE_ATTACKED: 'base_attacked',
  MORALE_THRESHOLD: 'morale_threshold',
  TIME_ELAPSED: 'time_elapsed',
  CUSTOM: 'custom'
};

export const EVENT_TRIGGER_CONFIG = {
  [EVENT_TRIGGER_TYPES.TURN_START]: {
    name: '回合开始',
    icon: '⏰',
    description: '当指定回合开始时触发'
  },
  [EVENT_TRIGGER_TYPES.TURN_END]: {
    name: '回合结束',
    icon: '🌙',
    description: '当指定回合结束时触发'
  },
  [EVENT_TRIGGER_TYPES.UNIT_DEATH]: {
    name: '单位死亡',
    icon: '💀',
    description: '当指定类型单位死亡时触发'
  },
  [EVENT_TRIGGER_TYPES.UNIT_ENTER_TILE]: {
    name: '单位进入格子',
    icon: '🚶',
    description: '当单位进入指定格子时触发'
  },
  [EVENT_TRIGGER_TYPES.BASE_ATTACKED]: {
    name: '基地被攻击',
    icon: '🏰',
    description: '当基地受到攻击时触发'
  },
  [EVENT_TRIGGER_TYPES.MORALE_THRESHOLD]: {
    name: '士气阈值',
    icon: '📊',
    description: '当某方士气低于阈值时触发'
  },
  [EVENT_TRIGGER_TYPES.TIME_ELAPSED]: {
    name: '时间流逝',
    icon: '⏳',
    description: '每经过指定回合数触发一次'
  },
  [EVENT_TRIGGER_TYPES.CUSTOM]: {
    name: '自定义触发',
    icon: '⚙️',
    description: '通过脚本自定义触发条件'
  }
};

export const EVENT_ACTION_TYPES = {
  SPAWN_UNIT: 'spawn_unit',
  GIVE_BUFF: 'give_buff',
  DEAL_DAMAGE: 'deal_damage',
  HEAL: 'heal',
  CHANGE_TERRAIN: 'change_terrain',
  SHOW_DIALOG: 'show_dialog',
  PLAY_SOUND: 'play_sound',
  SET_VICTORY: 'set_victory',
  ADD_RESOURCE: 'add_resource',
  TRIGGER_CHAIN: 'trigger_chain'
};

export const EVENT_ACTION_CONFIG = {
  [EVENT_ACTION_TYPES.SPAWN_UNIT]: {
    name: '生成单位',
    icon: '🎖️',
    description: '在指定位置生成单位'
  },
  [EVENT_ACTION_TYPES.GIVE_BUFF]: {
    name: '施加增益/减益',
    icon: '✨',
    description: '对目标施加状态效果'
  },
  [EVENT_ACTION_TYPES.DEAL_DAMAGE]: {
    name: '造成伤害',
    icon: '⚔️',
    description: '对目标造成伤害'
  },
  [EVENT_ACTION_TYPES.HEAL]: {
    name: '治疗',
    icon: '💚',
    description: '治疗目标单位'
  },
  [EVENT_ACTION_TYPES.CHANGE_TERRAIN]: {
    name: '改变地形',
    icon: '🗺️',
    description: '改变指定格子的地形类型'
  },
  [EVENT_ACTION_TYPES.SHOW_DIALOG]: {
    name: '显示对话',
    icon: '💬',
    description: '显示剧情对话'
  },
  [EVENT_ACTION_TYPES.PLAY_SOUND]: {
    name: '播放音效',
    icon: '🔊',
    description: '播放指定音效'
  },
  [EVENT_ACTION_TYPES.SET_VICTORY]: {
    name: '设置胜负',
    icon: '🏆',
    description: '直接设置战斗结果'
  },
  [EVENT_ACTION_TYPES.ADD_RESOURCE]: {
    name: '增加资源',
    icon: '💎',
    description: '增加指定资源数量'
  },
  [EVENT_ACTION_TYPES.TRIGGER_CHAIN]: {
    name: '触发事件链',
    icon: '🔗',
    description: '触发另一个事件链'
  }
};

export const UNIT_TYPES = {
  INFANTRY: 'infantry',
  CAVALRY: 'cavalry',
  ARCHER: 'archer',
  MAGE: 'mage',
  TANK: 'tank',
  SCOUT: 'scout'
};

export const FACTIONS = {
  RED: 'red',
  BLUE: 'blue'
};

export const FACTION_CONFIG = {
  [FACTIONS.RED]: {
    name: '红方',
    color: '#c0392b',
    bgColor: 'rgba(192, 57, 43, 0.3)'
  },
  [FACTIONS.BLUE]: {
    name: '蓝方',
    color: '#2980b9',
    bgColor: 'rgba(41, 128, 185, 0.3)'
  }
};

export const PUBLISH_STATUS = {
  DRAFT: 'draft',
  TESTING: 'testing',
  PUBLISHED: 'published',
  ARCHIVED: 'archived'
};

export const PUBLISH_STATUS_CONFIG = {
  [PUBLISH_STATUS.DRAFT]: {
    name: '草稿',
    icon: '📝',
    color: '#95a5a6'
  },
  [PUBLISH_STATUS.TESTING]: {
    name: '测试中',
    icon: '🧪',
    color: '#f39c12'
  },
  [PUBLISH_STATUS.PUBLISHED]: {
    name: '已发布',
    icon: '✅',
    color: '#27ae60'
  },
  [PUBLISH_STATUS.ARCHIVED]: {
    name: '已归档',
    icon: '📦',
    color: '#7f8c8d'
  }
};

export const DEFAULT_CAMPAIGN = {
  id: null,
  name: '未命名战役',
  description: '',
  author: '',
  version: '1.0.0',
  status: PUBLISH_STATUS.DRAFT,
  createdAt: null,
  updatedAt: null,
  map: {
    width: 10,
    height: 8,
    tileSize: 64,
    terrain: []
  },
  spawnPoints: {
    red: [],
    blue: []
  },
  initialUnits: {
    red: [],
    blue: []
  },
  eventChains: [],
  victoryConditions: {
    type: 'destroy_base',
    params: {}
  },
  settings: {
    maxTurns: 30,
    fogOfWar: true,
    deploymentPhase: true,
    allowRetreat: false
  }
};

export const VICTORY_CONDITION_TYPES = {
  DESTROY_BASE: 'destroy_base',
  ELIMINATE_ALL: 'eliminate_all',
  CAPTURE_TERRITORY: 'capture_territory',
  TURNS_SURVIVED: 'turns_survived',
  SCORE_THRESHOLD: 'score_threshold'
};

export const VICTORY_CONDITION_CONFIG = {
  [VICTORY_CONDITION_TYPES.DESTROY_BASE]: {
    name: '摧毁基地',
    icon: '🏰',
    description: '摧毁敌方所有基地即可获胜'
  },
  [VICTORY_CONDITION_TYPES.ELIMINATE_ALL]: {
    name: '全灭敌军',
    icon: '💀',
    description: '消灭敌方所有单位即可获胜'
  },
  [VICTORY_CONDITION_TYPES.CAPTURE_TERRITORY]: {
    name: '占领领土',
    icon: '🚩',
    description: '占领指定数量的领土即可获胜'
  },
  [VICTORY_CONDITION_TYPES.TURNS_SURVIVED]: {
    name: '坚守待援',
    icon: '🛡️',
    description: '坚守指定回合数即可获胜'
  },
  [VICTORY_CONDITION_TYPES.SCORE_THRESHOLD]: {
    name: '积分达标',
    icon: '🏆',
    description: '达到指定积分即可获胜'
  }
};

export function createEmptyMap(width, height) {
  const terrain = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(TERRAIN_TYPES.PLAIN);
    }
    terrain.push(row);
  }
  return terrain;
}

export function createCampaignTemplate() {
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_CAMPAIGN)),
    id: `campaign_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

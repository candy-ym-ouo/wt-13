/**
 * @typedef {Object} AchievementCondition
 * @property {string} type
 * @property {number} target
 * @property {boolean} [requireWin]
 */

/**
 * @typedef {Object} AchievementRewards
 * @property {number} gold
 * @property {number} exp
 * @property {string[]} cards
 * @property {string[]} unlockCards
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {string} rarity
 * @property {string} icon
 * @property {AchievementCondition[]} conditions
 * @property {AchievementRewards} rewards
 * @property {boolean} [isHidden]
 * @property {number} [stageOrder]
 */

export const ACHIEVEMENT_CATEGORY = {
  BATTLE: 'battle',
  COLLECTION: 'collection',
  PROGRESS: 'progress',
  HIDDEN: 'hidden',
  STAGE: 'stage'
};

export const ACHIEVEMENT_CATEGORY_CONFIG = {
  [ACHIEVEMENT_CATEGORY.BATTLE]: {
    name: '战斗成就',
    icon: '⚔️',
    description: '在战斗中达成特定条件解锁',
    color: '#e74c3c'
  },
  [ACHIEVEMENT_CATEGORY.COLLECTION]: {
    name: '收集成就',
    icon: '🃏',
    description: '收集单位和卡牌解锁',
    color: '#3498db'
  },
  [ACHIEVEMENT_CATEGORY.PROGRESS]: {
    name: '进度成就',
    icon: '📈',
    description: '游戏进度相关成就',
    color: '#27ae60'
  },
  [ACHIEVEMENT_CATEGORY.HIDDEN]: {
    name: '隐藏成就',
    icon: '❓',
    description: '神秘的隐藏成就',
    color: '#9b59b6'
  },
  [ACHIEVEMENT_CATEGORY.STAGE]: {
    name: '阶段奖励',
    icon: '🏆',
    description: '阶段性里程碑奖励',
    color: '#f39c12'
  }
};

export const ACHIEVEMENT_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

export const ACHIEVEMENT_RARITY_CONFIG = {
  [ACHIEVEMENT_RARITY.COMMON]: {
    name: '普通',
    color: '#95a5a6',
    points: 10
  },
  [ACHIEVEMENT_RARITY.RARE]: {
    name: '稀有',
    color: '#3498db',
    points: 25
  },
  [ACHIEVEMENT_RARITY.EPIC]: {
    name: '史诗',
    color: '#9b59b6',
    points: 50
  },
  [ACHIEVEMENT_RARITY.LEGENDARY]: {
    name: '传说',
    color: '#f39c12',
    points: 100
  }
};

export const CONDITION_TYPES = {
  WIN_BATTLE: 'win_battle',
  TOTAL_BATTLES: 'total_battles',
  WIN_STREAK: 'win_streak',
  KILL_COUNT: 'kill_count',
  TOTAL_DAMAGE: 'total_damage',
  TURN_LIMIT: 'turn_limit',
  NO_DEATHS: 'no_deaths',
  PERFECT_VICTORY: 'perfect_victory',
  COLLECT_UNITS: 'collect_units',
  COLLECT_CARDS: 'collect_cards',
  UNIT_LEVEL: 'unit_level',
  UNIT_PROMOTION: 'unit_promotion',
  TOTAL_EXP: 'total_exp',
  RECRUIT_COUNT: 'recruit_count',
  GOLD_EARNED: 'gold_earned',
  CARDS_USED: 'cards_used',
  SUMMON_COUNT: 'summon_count',
  COUNTER_KILL: 'counter_kill',
  COMBO_KILL: 'combo_kill',
  GUILD_MEMBER: 'guild_member',
  GUILD_TASK_COMPLETED: 'guild_task_completed',
  GUILD_BOSS_KILLED: 'guild_boss_killed',
  GUILD_CONTRIBUTION: 'guild_contribution',
  GUILD_DONATION: 'guild_donation',
  CUSTOM: 'custom'
};

export const ACHIEVEMENTS = [
  {
    id: 'first_blood',
    name: '初露锋芒',
    description: '赢得第一场战斗',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🎯',
    conditions: [
      { type: CONDITION_TYPES.WIN_BATTLE, target: 1 }
    ],
    rewards: {
      gold: 100,
      exp: 50,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'veteran',
    name: '身经百战',
    description: '累计完成 10 场战斗',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🛡️',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_BATTLES, target: 10 }
    ],
    rewards: {
      gold: 200,
      exp: 100,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'war_master',
    name: '战争大师',
    description: '累计完成 50 场战斗',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '⚔️',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_BATTLES, target: 50 }
    ],
    rewards: {
      gold: 500,
      exp: 300,
      cards: [],
      unlockCards: ['war_cry']
    }
  },
  {
    id: 'winning_streak_3',
    name: '势如破竹',
    description: '取得 3 连胜',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🔥',
    conditions: [
      { type: CONDITION_TYPES.WIN_STREAK, target: 3 }
    ],
    rewards: {
      gold: 300,
      exp: 150,
      cards: [],
      unlockCards: ['attack_boost']
    }
  },
  {
    id: 'winning_streak_10',
    name: '百战百胜',
    description: '取得 10 连胜',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '💎',
    conditions: [
      { type: CONDITION_TYPES.WIN_STREAK, target: 10 }
    ],
    rewards: {
      gold: 1000,
      exp: 500,
      cards: [],
      unlockCards: ['meteor_strike']
    }
  },
  {
    id: 'slayer_10',
    name: '屠戮者',
    description: '累计击杀 10 个单位',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🗡️',
    conditions: [
      { type: CONDITION_TYPES.KILL_COUNT, target: 10 }
    ],
    rewards: {
      gold: 150,
      exp: 80,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'slayer_100',
    name: '死神降临',
    description: '累计击杀 100 个单位',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '💀',
    conditions: [
      { type: CONDITION_TYPES.KILL_COUNT, target: 100 }
    ],
    rewards: {
      gold: 800,
      exp: 400,
      cards: [],
      unlockCards: ['double_attack']
    }
  },
  {
    id: 'damage_dealer',
    name: '毁灭打击',
    description: '单场战斗造成 500 点伤害',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '💥',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_DAMAGE, target: 500 }
    ],
    rewards: {
      gold: 250,
      exp: 120,
      cards: [],
      unlockCards: ['damage']
    }
  },
  {
    id: 'swift_victory',
    name: '速战速决',
    description: '在 5 回合内赢得战斗',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '⚡',
    conditions: [
      { type: CONDITION_TYPES.TURN_LIMIT, target: 5, requireWin: true }
    ],
    rewards: {
      gold: 300,
      exp: 150,
      cards: [],
      unlockCards: ['move_boost']
    }
  },
  {
    id: 'flawless_victory',
    name: '完美胜利',
    description: '无单位阵亡赢得战斗',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '✨',
    conditions: [
      { type: CONDITION_TYPES.NO_DEATHS, target: 1 }
    ],
    rewards: {
      gold: 500,
      exp: 300,
      cards: [],
      unlockCards: ['divine_heal']
    }
  },
  {
    id: 'perfect_victory',
    name: '绝对统治',
    description: '5回合内无阵亡胜利',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    icon: '👑',
    conditions: [
      { type: CONDITION_TYPES.PERFECT_VICTORY, target: 1 }
    ],
    rewards: {
      gold: 2000,
      exp: 1000,
      cards: [],
      unlockCards: ['fortress']
    }
  },
  {
    id: 'counter_strike',
    name: '绝地反击',
    description: '通过反击击杀 5 个单位',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🔄',
    conditions: [
      { type: CONDITION_TYPES.COUNTER_KILL, target: 5 }
    ],
    rewards: {
      gold: 300,
      exp: 150,
      cards: [],
      unlockCards: ['counter_attack']
    }
  },
  {
    id: 'combo_master',
    name: '连击大师',
    description: '单场战斗连续击杀 3 个单位',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '🎯',
    conditions: [
      { type: CONDITION_TYPES.COMBO_KILL, target: 3 }
    ],
    rewards: {
      gold: 400,
      exp: 200,
      cards: [],
      unlockCards: ['double_attack']
    }
  },
  {
    id: 'card_master',
    name: '战术大师',
    description: '单场战斗使用 10 张卡牌',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🃏',
    conditions: [
      { type: CONDITION_TYPES.CARDS_USED, target: 10 }
    ],
    rewards: {
      gold: 250,
      exp: 120,
      cards: [],
      unlockCards: ['stun']
    }
  },
  {
    id: 'summoner',
    name: '召唤大师',
    description: '单场战斗召唤 3 个单位',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '📯',
    conditions: [
      { type: CONDITION_TYPES.SUMMON_COUNT, target: 3 }
    ],
    rewards: {
      gold: 300,
      exp: 150,
      cards: [],
      unlockCards: ['summon']
    }
  },
  {
    id: 'collector_10',
    name: '军团雏形',
    description: '收集 10 个单位',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🎖️',
    conditions: [
      { type: CONDITION_TYPES.COLLECT_UNITS, target: 10 }
    ],
    rewards: {
      gold: 200,
      exp: 100,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'collector_30',
    name: '雄兵百万',
    description: '收集 30 个单位',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🏰',
    conditions: [
      { type: CONDITION_TYPES.COLLECT_UNITS, target: 30 }
    ],
    rewards: {
      gold: 500,
      exp: 250,
      cards: [],
      unlockCards: ['summon_elite']
    }
  },
  {
    id: 'card_collector',
    name: '卡牌收藏家',
    description: '收集 10 种不同卡牌',
    category: ACHIEVEMENT_CATEGORY.COLLECTION,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🎴',
    conditions: [
      { type: CONDITION_TYPES.COLLECT_CARDS, target: 10 }
    ],
    rewards: {
      gold: 400,
      exp: 200,
      cards: [],
      unlockCards: ['advanced_recon']
    }
  },
  {
    id: 'recruit_50',
    name: '招兵买马',
    description: '累计招募 50 次',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '📜',
    conditions: [
      { type: CONDITION_TYPES.RECRUIT_COUNT, target: 50 }
    ],
    rewards: {
      gold: 300,
      exp: 150,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'level_up',
    name: '初露锋芒',
    description: '任意单位达到 5 级',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '⬆️',
    conditions: [
      { type: CONDITION_TYPES.UNIT_LEVEL, target: 5 }
    ],
    rewards: {
      gold: 200,
      exp: 100,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'elite_unit',
    name: '精锐之师',
    description: '任意单位达到 10 级',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '⭐',
    conditions: [
      { type: CONDITION_TYPES.UNIT_LEVEL, target: 10 }
    ],
    rewards: {
      gold: 500,
      exp: 300,
      cards: [],
      unlockCards: ['defense_boost']
    }
  },
  {
    id: 'promoted',
    name: '加官进爵',
    description: '晋升任意单位',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🎖️',
    conditions: [
      { type: CONDITION_TYPES.UNIT_PROMOTION, target: 1 }
    ],
    rewards: {
      gold: 400,
      exp: 200,
      cards: [],
      unlockCards: ['status_resist']
    }
  },
  {
    id: 'rich',
    name: '财源广进',
    description: '累计获得 10000 金币',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '💰',
    conditions: [
      { type: CONDITION_TYPES.GOLD_EARNED, target: 10000 }
    ],
    rewards: {
      gold: 1000,
      exp: 300,
      cards: [],
      unlockCards: ['terrain_change']
    }
  },
  {
    id: 'stage_10_battles',
    name: '阶段奖励：新兵',
    description: '完成10场战斗里程碑',
    category: ACHIEVEMENT_CATEGORY.STAGE,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🏅',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_BATTLES, target: 10 }
    ],
    rewards: {
      gold: 500,
      exp: 200,
      cards: ['heal', 'attack_boost'],
      unlockCards: []
    },
    stageOrder: 1
  },
  {
    id: 'stage_30_battles',
    name: '阶段奖励：老兵',
    description: '完成30场战斗里程碑',
    category: ACHIEVEMENT_CATEGORY.STAGE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🥈',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_BATTLES, target: 30 }
    ],
    rewards: {
      gold: 1000,
      exp: 500,
      cards: ['stun', 'counter_attack'],
      unlockCards: ['burning_terrain']
    },
    stageOrder: 2
  },
  {
    id: 'stage_100_battles',
    name: '阶段奖励：统帅',
    description: '完成100场战斗里程碑',
    category: ACHIEVEMENT_CATEGORY.STAGE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '🥇',
    conditions: [
      { type: CONDITION_TYPES.TOTAL_BATTLES, target: 100 }
    ],
    rewards: {
      gold: 3000,
      exp: 1500,
      cards: ['divine_heal', 'meteor_strike'],
      unlockCards: ['summon_elite', 'fortress']
    },
    stageOrder: 3
  },
  {
    id: 'hidden_undefeated',
    name: '不败神话',
    description: '取得 20 连胜',
    category: ACHIEVEMENT_CATEGORY.HIDDEN,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    icon: '🏆',
    isHidden: true,
    conditions: [
      { type: CONDITION_TYPES.WIN_STREAK, target: 20 }
    ],
    rewards: {
      gold: 5000,
      exp: 2500,
      cards: [],
      unlockCards: ['fortress', 'meteor_strike']
    }
  },
  {
    id: 'hidden_no_cards',
    name: '纯粹战士',
    description: '不使用任何卡牌赢得战斗',
    category: ACHIEVEMENT_CATEGORY.HIDDEN,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '🗡️',
    isHidden: true,
    conditions: [
      { type: CONDITION_TYPES.CARDS_USED, target: 0, requireWin: true }
    ],
    rewards: {
      gold: 1500,
      exp: 800,
      cards: [],
      unlockCards: ['shield_wall']
    }
  },
  {
    id: 'hidden_one_turn',
    name: '一回合杀',
    description: '在 1 回合内赢得战斗',
    category: ACHIEVEMENT_CATEGORY.HIDDEN,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    icon: '⚡',
    isHidden: true,
    conditions: [
      { type: CONDITION_TYPES.TURN_LIMIT, target: 1, requireWin: true }
    ],
    rewards: {
      gold: 8000,
      exp: 4000,
      cards: [],
      unlockCards: ['meteor_strike', 'divine_heal']
    }
  },
  {
    id: 'guild_join',
    name: '公会新血',
    description: '加入一个公会',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.COMMON,
    icon: '🤝',
    conditions: [
      { type: CONDITION_TYPES.GUILD_MEMBER, target: 1 }
    ],
    rewards: {
      gold: 500,
      exp: 200,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'guild_create',
    name: '公会创始人',
    description: '创建一个公会',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '🏰',
    conditions: [
      { type: CONDITION_TYPES.GUILD_MEMBER, target: 2 }
    ],
    rewards: {
      gold: 2000,
      exp: 1000,
      cards: [],
      unlockCards: ['rally']
    }
  },
  {
    id: 'guild_task_10',
    name: '任务达人',
    description: '完成 10 个公会任务',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '📋',
    conditions: [
      { type: CONDITION_TYPES.GUILD_TASK_COMPLETED, target: 10 }
    ],
    rewards: {
      gold: 3000,
      exp: 1500,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'guild_task_50',
    name: '任务大师',
    description: '完成 50 个公会任务',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '📜',
    conditions: [
      { type: CONDITION_TYPES.GUILD_TASK_COMPLETED, target: 50 }
    ],
    rewards: {
      gold: 10000,
      exp: 5000,
      cards: [],
      unlockCards: ['final_push']
    }
  },
  {
    id: 'guild_boss_1',
    name: '猎龙者',
    description: '击杀 1 个公会Boss',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '👹',
    conditions: [
      { type: CONDITION_TYPES.GUILD_BOSS_KILLED, target: 1 }
    ],
    rewards: {
      gold: 2000,
      exp: 1000,
      cards: [],
      unlockCards: ['dragon_slayer']
    }
  },
  {
    id: 'guild_boss_10',
    name: 'Boss猎手',
    description: '击杀 10 个公会Boss',
    category: ACHIEVEMENT_CATEGORY.BATTLE,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '💀',
    conditions: [
      { type: CONDITION_TYPES.GUILD_BOSS_KILLED, target: 10 }
    ],
    rewards: {
      gold: 15000,
      exp: 8000,
      cards: [],
      unlockCards: ['execute', 'berserk']
    }
  },
  {
    id: 'guild_contribution_1000',
    name: '慷慨解囊',
    description: '累计获得 1000 贡献值',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '💎',
    conditions: [
      { type: CONDITION_TYPES.GUILD_CONTRIBUTION, target: 1000 }
    ],
    rewards: {
      gold: 2000,
      exp: 1000,
      cards: [],
      unlockCards: []
    }
  },
  {
    id: 'guild_contribution_10000',
    name: '公会支柱',
    description: '累计获得 10000 贡献值',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.EPIC,
    icon: '🏆',
    conditions: [
      { type: CONDITION_TYPES.GUILD_CONTRIBUTION, target: 10000 }
    ],
    rewards: {
      gold: 20000,
      exp: 10000,
      cards: [],
      unlockCards: ['inspiration', 'guardian']
    }
  },
  {
    id: 'guild_donation_10000',
    name: '金主爸爸',
    description: '累计捐献 10000 金币',
    category: ACHIEVEMENT_CATEGORY.PROGRESS,
    rarity: ACHIEVEMENT_RARITY.RARE,
    icon: '💰',
    conditions: [
      { type: CONDITION_TYPES.GUILD_DONATION, target: 10000 }
    ],
    rewards: {
      gold: 5000,
      exp: 2500,
      cards: [],
      unlockCards: ['gold_rush']
    }
  },
  {
    id: 'guild_legend',
    name: '公会传奇',
    description: '成为公会传奇，达成所有公会里程碑',
    category: ACHIEVEMENT_CATEGORY.STAGE,
    rarity: ACHIEVEMENT_RARITY.LEGENDARY,
    icon: '👑',
    stageOrder: 10,
    conditions: [
      { type: CONDITION_TYPES.GUILD_TASK_COMPLETED, target: 50 },
      { type: CONDITION_TYPES.GUILD_BOSS_KILLED, target: 10 },
      { type: CONDITION_TYPES.GUILD_CONTRIBUTION, target: 10000 }
    ],
    rewards: {
      gold: 50000,
      exp: 25000,
      cards: [],
      unlockCards: ['guild_war_cry', 'legendary_tactics']
    }
  }
];

/**
 * @param {string} id
 * @returns {Achievement | undefined}
 */
export function getAchievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * @param {string} category
 * @returns {Achievement[]}
 */
export function getAchievementsByCategory(category) {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

/**
 * @returns {Achievement[]}
 */
export function getStageAchievements() {
  return ACHIEVEMENTS
    .filter(a => a.category === ACHIEVEMENT_CATEGORY.STAGE)
    .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
}

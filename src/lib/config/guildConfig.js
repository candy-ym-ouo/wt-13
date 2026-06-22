// @ts-nocheck
export const GUILD_STORAGE_KEY = 'guild_system_data';
export const GUILD_RECORDS_KEY = 'guild_battle_records';
export const GUILD_RANKING_KEY = 'guild_ranking_data';

export const GUILD_MEMBER_ROLE = {
  LEADER: 'leader',
  OFFICER: 'officer',
  MEMBER: 'member',
  APPLICANT: 'applicant'
};

export const GUILD_ROLE_CONFIG = {
  [GUILD_MEMBER_ROLE.LEADER]: {
    name: '会长',
    icon: '👑',
    color: '#ffd700',
    permissions: ['create', 'invite', 'kick', 'promote', 'edit', 'task', 'boss', 'war']
  },
  [GUILD_MEMBER_ROLE.OFFICER]: {
    name: '官员',
    icon: '⚔️',
    color: '#ff6b6b',
    permissions: ['invite', 'kick', 'task', 'boss']
  },
  [GUILD_MEMBER_ROLE.MEMBER]: {
    name: '成员',
    icon: '🛡️',
    color: '#4ecdc4',
    permissions: ['task', 'boss']
  },
  [GUILD_MEMBER_ROLE.APPLICANT]: {
    name: '申请者',
    icon: '📝',
    color: '#95a5a6',
    permissions: []
  }
};

export const GUILD_LEVEL_CONFIG = [
  { level: 1, name: '初创公会', expRequired: 0, maxMembers: 20, bonus: { gold: 1.0, exp: 1.0 } },
  { level: 2, name: '小型公会', expRequired: 1000, maxMembers: 30, bonus: { gold: 1.05, exp: 1.05 } },
  { level: 3, name: '中型公会', expRequired: 3000, maxMembers: 40, bonus: { gold: 1.1, exp: 1.1 } },
  { level: 4, name: '大型公会', expRequired: 8000, maxMembers: 50, bonus: { gold: 1.15, exp: 1.15 } },
  { level: 5, name: '精英公会', expRequired: 20000, maxMembers: 60, bonus: { gold: 1.2, exp: 1.2 } },
  { level: 6, name: '传奇公会', expRequired: 50000, maxMembers: 80, bonus: { gold: 1.3, exp: 1.3 } },
  { level: 7, name: '神话公会', expRequired: 100000, maxMembers: 100, bonus: { gold: 1.5, exp: 1.5 } }
];

export const GUILD_TASK_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SPECIAL: 'special',
  BOSS: 'boss'
};

export const GUILD_TASK_DIFFICULTY = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

export const GUILD_TASK_CONFIG = {
  [GUILD_TASK_DIFFICULTY.EASY]: {
    name: '简单',
    color: '#4caf50',
    minMembers: 1,
    maxMembers: 5,
    duration: 3600000,
    rewards: { gold: 500, exp: 200, contribution: 50 }
  },
  [GUILD_TASK_DIFFICULTY.NORMAL]: {
    name: '普通',
    color: '#2196f3',
    minMembers: 2,
    maxMembers: 10,
    duration: 7200000,
    rewards: { gold: 1200, exp: 500, contribution: 120 }
  },
  [GUILD_TASK_DIFFICULTY.HARD]: {
    name: '困难',
    color: '#9c27b0',
    minMembers: 5,
    maxMembers: 20,
    duration: 14400000,
    rewards: { gold: 3000, exp: 1200, contribution: 300 }
  },
  [GUILD_TASK_DIFFICULTY.EPIC]: {
    name: '史诗',
    color: '#ff9800',
    minMembers: 10,
    maxMembers: 30,
    duration: 28800000,
    rewards: { gold: 8000, exp: 3000, contribution: 800 }
  },
  [GUILD_TASK_DIFFICULTY.LEGENDARY]: {
    name: '传说',
    color: '#f44336',
    minMembers: 20,
    maxMembers: 50,
    duration: 86400000,
    rewards: { gold: 20000, exp: 8000, contribution: 2000 }
  }
};

export const GUILD_BOSS_CONFIG = [
  {
    id: 'goblin_king',
    name: '哥布林王',
    icon: '👹',
    difficulty: GUILD_TASK_DIFFICULTY.EASY,
    hp: 5000,
    attack: 100,
    defense: 50,
    minMembers: 3,
    maxMembers: 10,
    rewards: { gold: 2000, exp: 800, contribution: 200, items: ['iron_sword', 'leather_armor'] },
    respawnTime: 3600000
  },
  {
    id: 'forest_titan',
    name: '森林泰坦',
    icon: '🌲',
    difficulty: GUILD_TASK_DIFFICULTY.NORMAL,
    hp: 15000,
    attack: 200,
    defense: 120,
    minMembers: 5,
    maxMembers: 15,
    rewards: { gold: 5000, exp: 2000, contribution: 500, items: ['power_crystal', 'health_pendant'] },
    respawnTime: 7200000
  },
  {
    id: 'flame_dragon',
    name: '烈焰巨龙',
    icon: '🐉',
    difficulty: GUILD_TASK_DIFFICULTY.HARD,
    hp: 50000,
    attack: 400,
    defense: 250,
    minMembers: 10,
    maxMembers: 25,
    rewards: { gold: 15000, exp: 6000, contribution: 1500, items: ['flame_blade', 'dragon_scale_armor'] },
    respawnTime: 14400000
  },
  {
    id: 'void_lord',
    name: '虚空领主',
    icon: '🌑',
    difficulty: GUILD_TASK_DIFFICULTY.EPIC,
    hp: 150000,
    attack: 800,
    defense: 500,
    minMembers: 15,
    maxMembers: 40,
    rewards: { gold: 40000, exp: 15000, contribution: 4000, items: ['void_blade', 'abyss_armor', 'dark_crystal'] },
    respawnTime: 43200000
  },
  {
    id: 'ancient_god',
    name: '远古神祗',
    icon: '⚡',
    difficulty: GUILD_TASK_DIFFICULTY.LEGENDARY,
    hp: 500000,
    attack: 1500,
    defense: 1000,
    minMembers: 25,
    maxMembers: 60,
    rewards: { gold: 100000, exp: 40000, contribution: 10000, items: ['god_slayer', 'divine_armor', 'holy_grail', 'ancient_relic'] },
    respawnTime: 86400000
  }
];

export const GUILD_TASK_TEMPLATES = [
  {
    id: 'gather_resources',
    name: '资源采集',
    description: '采集公会所需的各种资源',
    type: GUILD_TASK_TYPE.DAILY,
    difficulty: GUILD_TASK_DIFFICULTY.EASY,
    objective: { type: 'gather', target: 100 },
    icon: '📦'
  },
  {
    id: 'patrol_border',
    name: '边境巡逻',
    description: '巡逻公会领地边境，击退来犯之敌',
    type: GUILD_TASK_TYPE.DAILY,
    difficulty: GUILD_TASK_DIFFICULTY.NORMAL,
    objective: { type: 'kill', target: 20 },
    icon: '🛡️'
  },
  {
    id: 'escort_caravan',
    name: '商队护送',
    description: '保护商队安全抵达目的地',
    type: GUILD_TASK_TYPE.WEEKLY,
    difficulty: GUILD_TASK_DIFFICULTY.NORMAL,
    objective: { type: 'escort', target: 5 },
    icon: '🚛'
  },
  {
    id: 'explore_ruins',
    name: '遗迹探索',
    description: '探索古老的遗迹，寻找失落的宝藏',
    type: GUILD_TASK_TYPE.WEEKLY,
    difficulty: GUILD_TASK_DIFFICULTY.HARD,
    objective: { type: 'explore', target: 3 },
    icon: '🏛️'
  },
  {
    id: 'conquer_fortress',
    name: '要塞攻坚',
    description: '攻占敌方要塞，扩张公会领地',
    type: GUILD_TASK_TYPE.SPECIAL,
    difficulty: GUILD_TASK_DIFFICULTY.EPIC,
    objective: { type: 'conquer', target: 1 },
    icon: '🏰'
  },
  {
    id: 'defend_guild',
    name: '公会保卫战',
    description: '抵御敌军对公会的进攻',
    type: GUILD_TASK_TYPE.SPECIAL,
    difficulty: GUILD_TASK_DIFFICULTY.LEGENDARY,
    objective: { type: 'defend', target: 1 },
    icon: '⚔️'
  }
];

export const CONTRIBUTION_TYPE = {
  TASK: 'task',
  BOSS: 'boss',
  DONATION: 'donation',
  WAR: 'war',
  ACHIEVEMENT: 'achievement'
};

export const CONTRIBUTION_CONFIG = {
  [CONTRIBUTION_TYPE.TASK]: { name: '完成任务', icon: '📋', multiplier: 1.0 },
  [CONTRIBUTION_TYPE.BOSS]: { name: '击杀Boss', icon: '👹', multiplier: 1.5 },
  [CONTRIBUTION_TYPE.DONATION]: { name: '捐献资源', icon: '💰', multiplier: 0.5 },
  [CONTRIBUTION_TYPE.WAR]: { name: '公会战', icon: '⚔️', multiplier: 2.0 },
  [CONTRIBUTION_TYPE.ACHIEVEMENT]: { name: '成就贡献', icon: '🏆', multiplier: 3.0 }
};

export const GUILD_WAR_STATUS = {
  IDLE: 'idle',
  MATCHING: 'matching',
  PREPARING: 'preparing',
  FIGHTING: 'fighting',
  SETTLED: 'settled'
};

export const GUILD_CREATION_COST = {
  gold: 10000,
  item: 'guild_emblem'
};

export const GUILD_DONATION_OPTIONS = [
  { amount: 100, gold: 100, contribution: 10 },
  { amount: 500, gold: 500, contribution: 60 },
  { amount: 1000, gold: 1000, contribution: 150 },
  { amount: 5000, gold: 5000, contribution: 800 },
  { amount: 10000, gold: 10000, contribution: 2000 }
];

export const RANKING_CATEGORY = {
  TOTAL_CONTRIBUTION: 'total_contribution',
  WEEKLY_CONTRIBUTION: 'weekly_contribution',
  BOSS_DAMAGE: 'boss_damage',
  TASK_COMPLETION: 'task_completion',
  GUILD_LEVEL: 'guild_level',
  GUILD_POWER: 'guild_power'
};

export const RANKING_CONFIG = {
  [RANKING_CATEGORY.TOTAL_CONTRIBUTION]: {
    name: '总贡献排行',
    icon: '📊',
    description: '累计贡献点数',
    updateInterval: 300000
  },
  [RANKING_CATEGORY.WEEKLY_CONTRIBUTION]: {
    name: '周贡献排行',
    icon: '📈',
    description: '本周贡献点数',
    updateInterval: 300000
  },
  [RANKING_CATEGORY.BOSS_DAMAGE]: {
    name: 'Boss伤害排行',
    icon: '💥',
    description: '对Boss造成的总伤害',
    updateInterval: 60000
  },
  [RANKING_CATEGORY.TASK_COMPLETION]: {
    name: '任务完成排行',
    icon: '✅',
    description: '完成的公会任务数量',
    updateInterval: 300000
  },
  [RANKING_CATEGORY.GUILD_LEVEL]: {
    name: '公会等级排行',
    icon: '🏰',
    description: '公会等级和经验',
    updateInterval: 3600000
  },
  [RANKING_CATEGORY.GUILD_POWER]: {
    name: '公会战力排行',
    icon: '⚔️',
    description: '所有成员总战力',
    updateInterval: 3600000
  }
};

export function getGuildLevel(exp) {
  for (let i = GUILD_LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (exp >= GUILD_LEVEL_CONFIG[i].expRequired) {
      return GUILD_LEVEL_CONFIG[i];
    }
  }
  return GUILD_LEVEL_CONFIG[0];
}

export function getExpToNextLevel(currentExp) {
  const currentLevel = getGuildLevel(currentExp);
  const nextLevelIndex = GUILD_LEVEL_CONFIG.findIndex(l => l.level === currentLevel.level) + 1;
  if (nextLevelIndex >= GUILD_LEVEL_CONFIG.length) return 0;
  return GUILD_LEVEL_CONFIG[nextLevelIndex].expRequired - currentExp;
}

export function calculateContributionReward(baseAmount, memberRole, guildBonus) {
  const roleMultiplier = memberRole === GUILD_MEMBER_ROLE.LEADER ? 1.2 :
                         memberRole === GUILD_MEMBER_ROLE.OFFICER ? 1.1 : 1.0;
  return Math.floor(baseAmount * roleMultiplier * guildBonus);
}

export function calculateTaskRewards(difficulty, participantCount, durationBonus = 1.0) {
  const config = GUILD_TASK_CONFIG[difficulty];
  if (!config) return null;
  
  const participantMultiplier = 1 + (participantCount - 1) * 0.1;
  
  return {
    gold: Math.floor(config.rewards.gold * participantMultiplier * durationBonus),
    exp: Math.floor(config.rewards.exp * participantMultiplier * durationBonus),
    contribution: Math.floor(config.rewards.contribution * participantMultiplier * durationBonus)
  };
}

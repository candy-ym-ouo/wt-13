export const SEASON_STORAGE_KEY = 'season_ladder_data';
export const SEASON_HISTORY_KEY = 'season_history';

/**
 * @typedef {Object} RankTier
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} color
 * @property {number} minPoints
 * @property {number} maxPoints
 */

/**
 * @typedef {Object} RankSubTier
 * @property {number} id
 * @property {string} name
 * @property {number} order
 */

/**
 * @typedef {Object} PointRuleWin
 * @property {number} base
 * @property {{fast: number, threshold: number}} turnsBonus
 * @property {number} killBonus
 * @property {number} baseCaptureBonus
 * @property {{threshold: number, bonus: number}} streakBonus
 * @property {number} maxStreakBonus
 */

/**
 * @typedef {Object} PointRuleLose
 * @property {number} base
 * @property {number} closeGameBonus
 * @property {number} closeGameThreshold
 * @property {number} mercyThreshold
 * @property {number} mercyReduction
 */

/**
 * @typedef {Object} PointRuleDraw
 * @property {number} base
 */

/**
 * @typedef {Object} PointRules
 * @property {PointRuleWin} win
 * @property {PointRuleLose} lose
 * @property {PointRuleDraw} draw
 */

/**
 * @typedef {Object} SeasonReward
 * @property {number} gold
 * @property {number} recruitTicket
 * @property {number} [promotionStone]
 * @property {string} title
 */

/** @type {RankTier[]} */
export const RANK_TIERS = [
  { id: 'bronze', name: '青铜', icon: '🥉', color: '#cd7f32', minPoints: 0, maxPoints: 999 },
  { id: 'silver', name: '白银', icon: '🥈', color: '#c0c0c0', minPoints: 1000, maxPoints: 1999 },
  { id: 'gold', name: '黄金', icon: '🥇', color: '#ffd700', minPoints: 2000, maxPoints: 3499 },
  { id: 'platinum', name: '铂金', icon: '💎', color: '#00bfff', minPoints: 3500, maxPoints: 4999 },
  { id: 'diamond', name: '钻石', icon: '💠', color: '#b9f2ff', minPoints: 5000, maxPoints: 6999 },
  { id: 'master', name: '大师', icon: '🔱', color: '#ff4500', minPoints: 7000, maxPoints: 9999 },
  { id: 'grandmaster', name: '宗师', icon: '👑', color: '#ff1493', minPoints: 10000, maxPoints: Infinity }
];

/** @type {RankSubTier[]} */
export const RANK_SUB_TIERS = [
  { id: 3, name: 'III', order: 0 },
  { id: 2, name: 'II', order: 1 },
  { id: 1, name: 'I', order: 2 }
];

/** @type {PointRules} */
export const POINT_RULES = {
  win: {
    base: 60,
    turnsBonus: { fast: 30, threshold: 15 },
    killBonus: 5,
    baseCaptureBonus: 20,
    streakBonus: { threshold: 3, bonus: 15 },
    maxStreakBonus: 60
  },
  lose: {
    base: -20,
    closeGameBonus: 15,
    closeGameThreshold: 50,
    mercyThreshold: 5,
    mercyReduction: -10
  },
  draw: {
    base: 15
  }
};

export const SEASON_DURATION_DAYS = 30;

/** @type {Record<string, SeasonReward>} */
export const SEASON_REWARDS = {
  bronze: { gold: 200, recruitTicket: 1, title: '青铜战士' },
  silver: { gold: 500, recruitTicket: 3, title: '白银勇者' },
  gold: { gold: 1000, recruitTicket: 5, promotionStone: 3, title: '黄金骑士' },
  platinum: { gold: 2000, recruitTicket: 8, promotionStone: 5, title: '铂金统帅' },
  diamond: { gold: 4000, recruitTicket: 12, promotionStone: 10, title: '钻石将军' },
  master: { gold: 8000, recruitTicket: 20, promotionStone: 20, title: '大师战神' },
  grandmaster: { gold: 15000, recruitTicket: 30, promotionStone: 30, title: '宗师传奇' }
};

export const PROMOTION_MATCHES = 3;
export const PROMOTION_WIN_RATE = 0.67;
export const DEMOTION_THRESHOLD = -100;
export const GRANDMASTER_DEMOTION_POINTS = 9500;

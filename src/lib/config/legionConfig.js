import { unitConfig, SPECIALIZATION_CONFIG } from './unitConfig.js';
import { CARD_RARITY, eventCards } from './eventCardConfig.js';

export const LEGION_STORAGE_KEY = 'legion_system_data';
export const LEGION_RECORDS_KEY = 'legion_battle_records';

export const RARITY_CONFIG = {
  COMMON: { id: 'common', name: '普通', color: '#9e9e9e', statMultiplier: 1.0, recruitCost: 1, expBonus: 1.0 },
  UNCOMMON: { id: 'uncommon', name: '优秀', color: '#4caf50', statMultiplier: 1.1, recruitCost: 2, expBonus: 1.1 },
  RARE: { id: 'rare', name: '稀有', color: '#2196f3', statMultiplier: 1.25, recruitCost: 4, expBonus: 1.25 },
  EPIC: { id: 'epic', name: '史诗', color: '#9c27b0', statMultiplier: 1.5, recruitCost: 8, expBonus: 1.5 },
  LEGENDARY: { id: 'legendary', name: '传说', color: '#ff9800', statMultiplier: 2.0, recruitCost: 20, expBonus: 2.0 }
};

export const RECRUIT_POOL = Object.keys(unitConfig).map(type => ({
  unitType: type,
  baseRarity: 'COMMON',
  possibleRarities: ['COMMON', 'UNCOMMON', 'RARE'],
  weight: 100
}));

export const RECRUIT_COST = {
  single: 100,
  ten: 900
};

export const GUARANTEE_RULES = {
  tenPullGuaranteeRare: true,
  pityPullsForEpic: 50,
  pityPullsForLegendary: 150
};

export const RARITY_DROP_RATES = {
  COMMON: 0.60,
  UNCOMMON: 0.25,
  RARE: 0.12,
  EPIC: 0.025,
  LEGENDARY: 0.005
};

export const LEVEL_CONFIG = {
  maxLevel: 50,
  expPerLevel: (level) => Math.floor(100 * Math.pow(1.5, level - 1)),
  statPointsPerLevel: 2,
  promotionLevel: 10,
  promotionCount: 4
};

export const STAT_GROWTH = {
  atk: { base: 2, perLevel: 0.5 },
  def: { base: 1.5, perLevel: 0.3 },
  hp: { base: 10, perLevel: 2 },
  move: { base: 0.2, perLevel: 0.05 }
};

export const PROMOTION_CONFIG = {
  1: { level: 10, cost: 500, statBonus: { atk: 10, def: 8, hp: 50, move: 0 }, unlockSpecialization: false },
  2: { level: 20, cost: 1500, statBonus: { atk: 20, def: 15, hp: 100, move: 1 }, unlockSpecialization: true },
  3: { level: 35, cost: 4000, statBonus: { atk: 35, def: 25, hp: 180, move: 1 }, unlockSpecialization: false },
  4: { level: 50, cost: 10000, statBonus: { atk: 60, def: 40, hp: 300, move: 2 }, unlockSpecialization: false }
};

export const CURRENCY_CONFIG = {
  gold: { name: '金币', icon: '💰', initial: 1000 },
  recruitTicket: { name: '招募券', icon: '🎫', initial: 10 },
  promotionStone: { name: '晋升石', icon: '💎', initial: 5 },
  expBook: { name: '经验书', icon: '📚', initial: 20 }
};

export const LINEUP_CONFIG = {
  maxLineups: 5,
  maxUnitsPerLineup: 8,
  defaultName: '阵容'
};

export const BATTLE_REWARDS = {
  win: {
    gold: [200, 500],
    exp: [50, 150],
    cards: { min: 1, max: 3, rarityBoost: 0.2 },
    items: { recruitTicket: 0.3, promotionStone: 0.1, expBook: 0.5 }
  },
  lose: {
    gold: [50, 150],
    exp: [20, 50],
    cards: { min: 0, max: 1, rarityBoost: 0 },
    items: { expBook: 0.3 }
  },
  draw: {
    gold: [100, 250],
    exp: [30, 80],
    cards: { min: 0, max: 2, rarityBoost: 0.1 },
    items: { recruitTicket: 0.15, expBook: 0.4 }
  }
};

export const CARD_REWARD_POOL = eventCards.map(card => ({
  ...card,
  dropWeight: card.rarity === CARD_RARITY.BASIC ? 60 :
              card.rarity === CARD_RARITY.RARE ? 30 : 10
}));

export function calculateUnitStats(baseUnit, level, rarity, promotion, allocatedStats, specialization) {
  const base = unitConfig[baseUnit.type];
  const rarityMult = RARITY_CONFIG[rarity]?.statMultiplier || 1.0;
  
  let atk = base.attack * rarityMult;
  let def = base.defense * rarityMult;
  let hp = base.hp * rarityMult;
  let move = base.moveRange;
  
  const levelBonus = level - 1;
  atk += levelBonus * STAT_GROWTH.atk.base;
  def += levelBonus * STAT_GROWTH.def.base;
  hp += levelBonus * STAT_GROWTH.hp.base;
  move += Math.floor(levelBonus * STAT_GROWTH.move.base);
  
  for (let i = 1; i <= promotion; i++) {
    const bonus = PROMOTION_CONFIG[i]?.statBonus;
    if (bonus) {
      atk += bonus.atk;
      def += bonus.def;
      hp += bonus.hp;
      move += bonus.move;
    }
  }
  
  if (allocatedStats) {
    atk += (allocatedStats.atk || 0) * STAT_GROWTH.atk.perLevel * 10;
    def += (allocatedStats.def || 0) * STAT_GROWTH.def.perLevel * 10;
    hp += (allocatedStats.hp || 0) * STAT_GROWTH.hp.perLevel * 10;
    move += (allocatedStats.move || 0) * STAT_GROWTH.move.perLevel * 10;
  }
  
  if (specialization) {
    const specConfig = SPECIALIZATION_CONFIG[baseUnit.type]?.find(s => s.id === specialization);
    if (specConfig?.bonuses) {
      atk += specConfig.bonuses.atk || 0;
      def += specConfig.bonuses.def || 0;
      hp += specConfig.bonuses.hp || 0;
      move += specConfig.bonuses.move || 0;
    }
  }
  
  return {
    attack: Math.floor(atk),
    defense: Math.floor(def),
    maxHp: Math.floor(hp),
    moveRange: Math.floor(move),
    attackRange: base.attackRange
  };
}

export function getExpToNextLevel(level) {
  if (level >= LEVEL_CONFIG.maxLevel) return 0;
  return LEVEL_CONFIG.expPerLevel(level);
}

export function rollRecruitRarity(pityCounter = 0) {
  let rates = { ...RARITY_DROP_RATES };
  
  if (pityCounter >= GUARANTEE_RULES.pityPullsForLegendary) {
    return 'LEGENDARY';
  }
  if (pityCounter >= GUARANTEE_RULES.pityPullsForEpic) {
    rates.EPIC = Math.min(0.5, rates.EPIC + 0.1 * (pityCounter - GUARANTEE_RULES.pityPullsForEpic + 1));
  }
  
  const roll = Math.random();
  let cumulative = 0;
  const rarities = Object.keys(rates).sort((a, b) => rates[b] - rates[a]);
  
  for (const rarity of rarities) {
    cumulative += rates[rarity];
    if (roll <= cumulative) {
      return rarity;
    }
  }
  
  return 'COMMON';
}

export function getRecruitPoolForRarity(rarity) {
  const rarityIndex = Object.keys(RARITY_CONFIG).indexOf(rarity);
  return RECRUIT_POOL.filter(unit => {
    const possibleIndices = unit.possibleRarities.map(r => Object.keys(RARITY_CONFIG).indexOf(r));
    return possibleIndices.some(i => i >= rarityIndex);
  });
}

import {
  EXPEDITION_EVENT_TYPES,
  SUPPLY_TYPES,
  BATTLE_REWARD_CONFIG,
  BOSS_REWARD_CONFIG
} from '$lib/config/expeditionConfig.js';
import { generateLoot, DROP_SOURCES } from '$lib/utils/lootSystem.js';
import { eventCards, cardRarityConfig, CARD_RARITY } from '$lib/config/eventCardConfig.js';
import { unitConfig, initialUnits } from '$lib/config/unitConfig.js';
import { gameRules } from '$lib/config/gameRules.js';
import { getAllEquipment, RARITIES } from '$lib/config/equipmentConfig.js';

function generateId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function resolveBattle(state, battleData, isBoss = false) {
  const rewardConfig = isBoss ? BOSS_REWARD_CONFIG : BATTLE_REWARD_CONFIG;
  const multiplier = battleData.rewardMultiplier || 1;
  
  const goldReward = Math.floor(
    randomInt(rewardConfig.gold.min, rewardConfig.gold.max) * multiplier
  );
  
  const expReward = Math.floor(
    randomInt(rewardConfig.exp.min, rewardConfig.exp.max) * multiplier
  );
  
  const cardRewards = [];
  if (Math.random() < rewardConfig.cardDropChance) {
    const cardCount = isBoss ? randomInt(2, 3) : 1;
    for (let i = 0; i < cardCount; i++) {
      const card = rollCard(isBoss ? CARD_RARITY.RARE : null);
      if (card) cardRewards.push(card);
    }
  }
  
  const equipmentRewards = [];
  if (isBoss) {
    for (let i = 0; i < rewardConfig.guaranteedEquipmentCount; i++) {
      const loot = generateLoot(DROP_SOURCES.BOSS, {
        itemCount: 1,
        minRarity: i === 0 ? RARITIES.RARE : RARITIES.UNCOMMON
      });
      equipmentRewards.push(...loot);
    }
  } else if (Math.random() < rewardConfig.equipmentDropChance) {
    const source = battleData.isElite ? DROP_SOURCES.CHEST : DROP_SOURCES.ENEMY_DEFEAT;
    const loot = generateLoot(source, { itemCount: 1 });
    equipmentRewards.push(...loot);
  }
  
  return {
    gold: goldReward,
    exp: expReward,
    cards: cardRewards,
    equipment: equipmentRewards,
    isVictory: true
  };
}

function rollCard(minRarity = null) {
  const validRarities = Object.values(CARD_RARITY);
  const rarities = minRarity && validRarities.includes(minRarity)
    ? [CARD_RARITY.LIMITED, CARD_RARITY.RARE]
    : [CARD_RARITY.LIMITED, CARD_RARITY.RARE, CARD_RARITY.BASIC];
  
  let pool = [];
  for (const rarity of rarities) {
    const cards = eventCards.filter(c => c.rarity === rarity);
    const config = cardRarityConfig[rarity];
    const weight = config?.baseWeight || 1;
    for (let i = 0; i < weight; i++) {
      pool.push(...cards);
    }
  }
  
  if (pool.length === 0) {
    pool = eventCards.filter(c => c.rarity === CARD_RARITY.BASIC);
  }
  
  if (pool.length === 0 && eventCards.length > 0) {
    pool = eventCards;
  }
  
  const picked = pickRandom(pool);
  if (!picked) return null;
  
  return { ...picked, instanceId: generateId() };
}

export function applySupplyReward(state, supplyType) {
  const result = {
    type: supplyType,
    message: '',
    changes: {}
  };
  
  switch (supplyType) {
    case SUPPLY_TYPES.HEAL: {
      const healAmount = 0.5;
      result.message = `全军恢复 ${Math.round(healAmount * 100)}% 生命值`;
      result.changes = {
        roster: state.roster.map(unit => ({
          ...unit,
          currentHp: Math.min(unit.maxHp, unit.currentHp + Math.floor(unit.maxHp * healAmount))
        }))
      };
      break;
    }
    
    case SUPPLY_TYPES.GOLD: {
      const goldAmount = randomInt(100, 250);
      result.message = `获得 ${goldAmount} 金币`;
      result.changes = { gold: state.gold + goldAmount };
      break;
    }
    
    case SUPPLY_TYPES.CARD: {
      const cards = [];
      for (let i = 0; i < 3; i++) {
        const card = rollCard();
        if (card) cards.push(card);
      }
      const validCards = cards.filter(Boolean);
      if (validCards.length > 0) {
        result.message = `获得 ${validCards.length} 张卡牌：${validCards.map(c => c.name).join('、')}`;
      } else {
        result.message = '卡包是空的...';
      }
      result.changes = { cards: [...(state.cards || []), ...validCards] };
      break;
    }
    
    case SUPPLY_TYPES.EQUIPMENT: {
      const loot = generateLoot(DROP_SOURCES.CHEST, { itemCount: 1 });
      if (loot.length > 0) {
        result.message = `获得装备：${loot[0].name}`;
        result.changes = { equipment: [...(state.equipment || []), ...loot] };
      } else {
        result.message = '宝箱是空的...';
      }
      break;
    }
    
    case SUPPLY_TYPES.BUFF: {
      result.message = '下一场战斗全属性提升 15%';
      result.changes = {
        activeBuffs: [...(state.activeBuffs || []), {
          id: generateId(),
          type: 'allStatsBoost',
          value: 0.15,
          duration: 1
        }]
      };
      break;
    }
    
    case SUPPLY_TYPES.UNIT: {
      const unitType = pickRandom(Object.keys(unitConfig));
      const config = unitConfig[unitType];
      const newUnit = createMercenaryUnit(unitType, state.roster.length);
      result.message = `招募了佣兵：${config.name}`;
      result.changes = { roster: [...state.roster, newUnit] };
      break;
    }
  }
  
  return result;
}

function createMercenaryUnit(unitType, index) {
  const config = unitConfig[unitType];
  return {
    id: generateId(),
    type: unitType,
    faction: 'red',
    x: 1,
    y: index % 6,
    name: `佣兵·${config.name}`,
    isMercenary: true,
    currentHp: config.hp,
    maxHp: config.hp,
    attack: config.attack,
    defense: config.defense,
    moveRange: config.moveRange,
    attackRange: config.attackRange,
    hasMoved: false,
    hasAttacked: false,
    attackCount: 0,
    buffs: [],
    stunned: 0,
    morale: gameRules.morale.initial,
    winStreak: 0,
    statusEffects: [],
    exp: 0,
    level: 2,
    statPoints: 0,
    allocatedStats: { atk: 0, def: 0, hp: 0, move: 0 },
    specialization: null,
    equipment: { weapon: null, armor: null, accessory: null, relic: null }
  };
}

export function resolveRandomEvent(state, eventData) {
  const event = eventData.event;
  if (!event || eventData.outcomeResolved) return null;
  
  const totalWeight = event.outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  let selectedOutcome = event.outcomes[0];
  
  for (const outcome of event.outcomes) {
    roll -= outcome.weight;
    if (roll <= 0) {
      selectedOutcome = outcome;
      break;
    }
  }
  
  const result = {
    eventName: event.name,
    outcome: selectedOutcome,
    message: selectedOutcome.description,
    changes: {}
  };
  
  switch (selectedOutcome.type) {
    case 'unit': {
      const unitType = pickRandom(Object.keys(unitConfig));
      const newUnit = createMercenaryUnit(unitType, state.roster.length);
      result.changes.roster = [...state.roster, newUnit];
      break;
    }
    
    case 'gold': {
      const value = selectedOutcome.value || randomInt(50, 150);
      result.changes.gold = Math.max(0, state.gold + value);
      break;
    }
    
    case 'damage': {
      const dmgPercent = (selectedOutcome.value || 20) / 100;
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        currentHp: Math.max(1, unit.currentHp - Math.floor(unit.maxHp * dmgPercent))
      }));
      break;
    }
    
    case 'treasure': {
      const loot = generateLoot(DROP_SOURCES.CHEST, {
        itemCount: randomInt(1, 2),
        minRarity: RARITIES.UNCOMMON
      });
      const gold = randomInt(80, 200);
      result.changes.equipment = [...(state.equipment || []), ...loot];
      result.changes.gold = state.gold + gold;
      result.message += ` 获得 ${gold} 金币和 ${loot.length} 件装备`;
      break;
    }
    
    case 'supply': {
      const healAmount = 0.3;
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        currentHp: Math.min(unit.maxHp, unit.currentHp + Math.floor(unit.maxHp * healAmount))
      }));
      result.changes.gold = state.gold + randomInt(30, 80);
      break;
    }
    
    case 'shop_discount': {
      result.changes.shopDiscount = 0.7;
      result.changes.shopDiscountTurns = 3;
      break;
    }
    
    case 'rare_item': {
      const loot = generateLoot(DROP_SOURCES.SHRINE, { itemCount: 1 });
      result.changes.equipment = [...(state.equipment || []), ...loot];
      break;
    }
    
    case 'morale_down': {
      const value = -(selectedOutcome.value || 10);
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        morale: Math.max(0, Math.min(100, unit.morale + value))
      }));
      break;
    }
    
    case 'shelter': {
      const healAmount = 0.25;
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        currentHp: Math.min(unit.maxHp, unit.currentHp + Math.floor(unit.maxHp * healAmount)),
        morale: Math.min(100, unit.morale + 10)
      }));
      break;
    }
    
    case 'boss_early': {
      result.changes.forcedBoss = true;
      result.message = '守宝巨龙向你发起挑战！';
      break;
    }
    
    case 'legendary_loot': {
      const loot = generateLoot(DROP_SOURCES.SHRINE, {
        itemCount: 2,
        guaranteedRarity: RARITIES.EPIC
      });
      result.changes.equipment = [...(state.equipment || []), ...loot];
      break;
    }
    
    case 'trap': {
      const dmgPercent = 0.35;
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        currentHp: Math.max(1, unit.currentHp - Math.floor(unit.maxHp * dmgPercent))
      }));
      break;
    }
    
    case 'heal_small': {
      const healAmount = 0.2;
      result.changes.roster = state.roster.map(unit => ({
        ...unit,
        currentHp: Math.min(unit.maxHp, unit.currentHp + Math.floor(unit.maxHp * healAmount))
      }));
      break;
    }
    
    case 'gold_gift': {
      result.changes.gold = state.gold + randomInt(50, 120);
      break;
    }
    
    case 'volunteer': {
      const unitType = pickRandom(['infantry', 'archer', 'cavalry']);
      const newUnit = createMercenaryUnit(unitType, state.roster.length);
      newUnit.name = `志愿者·${unitConfig[unitType].name}`;
      result.changes.roster = [...state.roster, newUnit];
      break;
    }
    
    case 'haunt_debuff': {
      result.changes.activeDebuffs = [...(state.activeDebuffs || []), {
        id: generateId(),
        type: 'allStatsReduction',
        value: 0.1,
        duration: 2
      }];
      break;
    }
    
    case 'ghost_loot': {
      const loot = generateLoot(DROP_SOURCES.SHRINE, { itemCount: 1 });
      result.changes.equipment = [...(state.equipment || []), ...loot];
      break;
    }
    
    case 'lost': {
      result.changes.gold = Math.max(0, state.gold - randomInt(30, 80));
      break;
    }
    
    default:
      break;
  }
  
  return result;
}

export function applyShrineBlessing(state, blessing) {
  const result = {
    blessing,
    message: `获得祝福：${blessing.name} - ${blessing.description}`,
    changes: {
      permanentBuffs: [...(state.permanentBuffs || []), {
        ...blessing.effect,
        id: generateId(),
        blessingId: blessing.id,
        name: blessing.name
      }]
    }
  };
  
  if (blessing.effect.type === 'maxHpBoost') {
    const multiplier = 1 + blessing.effect.value;
    result.changes.roster = state.roster.map(unit => {
      const newMaxHp = Math.floor(unit.maxHp * multiplier);
      return {
        ...unit,
        maxHp: newMaxHp,
        currentHp: Math.min(newMaxHp, unit.currentHp + Math.floor((newMaxHp - unit.maxHp) * 0.5))
      };
    });
  }
  
  return result;
}

export function applyRest(state, restData) {
  const healAmount = restData.healAmount || 0.3;
  const moraleBoost = restData.moraleBoost || 15;
  
  return {
    message: `部队在营地休整，恢复 ${Math.round(healAmount * 100)}% 生命值，士气提升 ${moraleBoost} 点`,
    changes: {
      roster: state.roster.map(unit => ({
        ...unit,
        currentHp: Math.min(unit.maxHp, unit.currentHp + Math.floor(unit.maxHp * healAmount)),
        morale: Math.min(100, unit.morale + moraleBoost)
      })),
      activeBuffs: (state.activeBuffs || []).map(b => ({ ...b })),
      activeDebuffs: (state.activeDebuffs || []).filter(d => {
        if (d.type === 'allStatsReduction') {
          return false;
        }
        return true;
      })
    }
  };
}

export function distributeExpToRoster(roster, totalExp) {
  const expPerUnit = Math.floor(totalExp / Math.max(1, roster.length));
  
  return roster.map(unit => {
    const thresholds = gameRules.experience.levelThresholds;
    const maxLevel = gameRules.experience.maxLevel;
    let newExp = (unit.exp || 0) + expPerUnit;
    let newLevel = unit.level || 1;
    let statPoints = unit.statPoints || 0;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (newExp >= thresholds[i] && (i + 1) > newLevel) {
        const levelsGained = (i + 1) - newLevel;
        newLevel = Math.min(maxLevel, i + 1);
        statPoints += levelsGained * gameRules.experience.statPointsPerLevel;
        break;
      }
    }
    
    const allocatedStats = unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 };
    const growth = gameRules.experience.statGrowth;
    const hpBonus = allocatedStats.hp * growth.hp;
    const baseHp = unitConfig[unit.type]?.hp || 100;
    const newMaxHp = baseHp + hpBonus;
    
    return {
      ...unit,
      exp: newExp,
      level: newLevel,
      statPoints,
      maxHp: newMaxHp,
      currentHp: newLevel > (unit.level || 1) 
        ? Math.min(newMaxHp, unit.currentHp + (newLevel - (unit.level || 1)) * 10)
        : unit.currentHp
    };
  });
}

export function calculateExpeditionScore(state) {
  const rosterScore = state.roster.reduce((sum, u) => 
    sum + u.level * 100 + (u.exp || 0) * 0.5, 0);
  const goldScore = state.gold * 0.5;
  const equipmentScore = (state.equipment || []).reduce((sum, e) => {
    const rarityMult = { COMMON: 1, UNCOMMON: 2, RARE: 5, EPIC: 15, LEGENDARY: 50 };
    return sum + (rarityMult[e.rarity] || 1) * 100;
  }, 0);
  const layerScore = state.map?.currentLayer ? state.map.currentLayer * 500 : 0;
  const victoryBonus = state.map?.success ? 5000 : 0;
  
  return {
    total: Math.floor(rosterScore + goldScore + equipmentScore + layerScore + victoryBonus),
    roster: Math.floor(rosterScore),
    gold: Math.floor(goldScore),
    equipment: Math.floor(equipmentScore),
    layer: Math.floor(layerScore),
    victory: victoryBonus
  };
}

export function tickBuffsAndDebuffs(state) {
  const tickedBuffs = (state.activeBuffs || [])
    .map(b => ({ ...b, duration: b.duration - 1 }))
    .filter(b => b.duration > 0);
  
  const tickedDebuffs = (state.activeDebuffs || [])
    .map(d => ({ ...d, duration: d.duration - 1 }))
    .filter(d => d.duration > 0);
  
  return {
    activeBuffs: tickedBuffs,
    activeDebuffs: tickedDebuffs
  };
}

export function getEffectiveUnitStats(unit, state) {
  let atkMult = 1;
  let defMult = 1;
  let hpMult = 1;
  let moveBonus = 0;
  
  for (const buff of [...(state.activeBuffs || []), ...(state.permanentBuffs || [])]) {
    switch (buff.type) {
      case 'attackBoost': atkMult += buff.value || 0; break;
      case 'defenseBoost': defMult += buff.value || 0; break;
      case 'maxHpBoost': hpMult += buff.value || 0; break;
      case 'moveBoost': moveBonus += buff.value || 0; break;
      case 'allStatsBoost':
        atkMult += buff.value || 0;
        defMult += buff.value || 0;
        hpMult += buff.value * 0.5 || 0;
        break;
    }
  }
  
  for (const debuff of (state.activeDebuffs || [])) {
    switch (debuff.type) {
      case 'allStatsReduction':
        atkMult -= debuff.value || 0;
        defMult -= debuff.value || 0;
        break;
    }
  }
  
  const baseAttack = unitConfig[unit.type]?.attack || unit.attack || 20;
  const baseDefense = unitConfig[unit.type]?.defense || unit.defense || 5;
  const baseMove = unitConfig[unit.type]?.moveRange || unit.moveRange || 3;
  
  return {
    attack: Math.floor(baseAttack * Math.max(0.1, atkMult)),
    defense: Math.floor(baseDefense * Math.max(0.1, defMult)),
    moveRange: baseMove + moveBonus,
    maxHpMultiplier: hpMult
  };
}

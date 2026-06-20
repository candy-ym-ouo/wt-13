export const gameRules = {
  factions: ['red', 'blue'],
  factionNames: {
    red: '红方',
    blue: '蓝方'
  },
  factionColors: {
    red: '#e74c3c',
    blue: '#3498db'
  },
  firstPlayer: 'red',
  maxTurns: 50,
  victoryConditions: {
    destroyAll: {
      enabled: true,
      description: '消灭所有敌方单位'
    },
    captureBase: {
      enabled: true,
      description: '占领敌方基地',
      captureTurnsRequired: 3,
      durabilityDamagePerTurn: 15,
      durabilityDamagePerUnit: 5,
      garrisonRepairBonus: 10,
      garrisonUnitRequired: true
    }
  },
  combat: {
    damageFormula: 'attack * (100 / (100 + defense))',
    counterAttack: true,
    counterAttackDamageRatio: 0.5,
    terrainDefenseBonus: true
  },
  movement: {
    canMoveThroughFriendly: true,
    canMoveThroughEnemy: false,
    mustStopOnEnemy: false
  },
  economy: {
    enabled: false,
    baseIncome: 100,
    incomePerTurn: 50
  },
  morale: {
    initial: 80,
    min: 0,
    max: 100,
    onKill: 10,
    winStreakBonus: 5,
    winStreakThreshold: 3,
    onAllyDeath: 8,
    tiers: [
      { min: 90, max: 100, damageMultiplier: 1.2, label: '高昂' },
      { min: 80, max: 89, damageMultiplier: 1.1, label: '振奋' },
      { min: 50, max: 79, damageMultiplier: 1.0, label: '正常' },
      { min: 30, max: 49, damageMultiplier: 0.85, label: '低落' },
      { min: 0, max: 29, damageMultiplier: 0.7, label: '崩溃' }
    ]
  },
  statusEffects: {
    slow: {
      defaultMoveReduction: 2,
      minMoveRange: 1
    },
    poison: {
      damagePerTurn: 8
    },
    burn: {
      damagePerTurn: 10
    },
    bleed: {
      damagePerMove: 5
    },
    freeze: {
      extraDamageMultiplier: 1.25
    },
    resistanceCheck: {
      minDurationOnResist: 1
    }
  }
};

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
      description: '占领敌方基地'
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
  }
};

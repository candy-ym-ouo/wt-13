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
    },
    timeout: {
      enabled: true,
      description: '回合数耗尽，按分数判定胜负',
      useScoreSettlement: true
    }
  },
  scoreSettlement: {
    baseDurabilityWeight: 2.0,
    baseDurabilityMaxScore: 100,
    survivingUnitsWeight: 15.0,
    unitHpWeight: 0.5,
    killCountWeight: 10.0,
    captureProgressWeight: 50.0,
    drawScoreThreshold: 5.0
  },
  combat: {
    damageFormula: 'attack * (100 / (100 + defense))',
    counterAttack: true,
    counterAttackDamageRatio: 0.5,
    terrainDefenseBonus: true,
    counterTypes: {
      melee: {
        damageRatio: 0.5,
        canApplyStatus: false,
        statusType: null,
        statusDuration: 0,
        statusChance: 0
      },
      ranged: {
        damageRatio: 0,
        canApplyStatus: false,
        statusType: null,
        statusDuration: 0,
        statusChance: 0
      },
      skill: {
        damageRatio: 0.35,
        canApplyStatus: true,
        statusType: 'slow',
        statusDuration: 1,
        statusChance: 0.4
      }
    },
    counterRangeOverride: {
      melee: null,
      ranged: null,
      skill: 1
    }
  },
  movement: {
    canMoveThroughFriendly: true,
    canMoveThroughEnemy: false,
    mustStopOnEnemy: false,
    moveSkills: {
      charge: {
        canPassThroughEnemy: true,
        firstTileExtraCost: 1,
        postMoveAttackBonus: 0.25,
        postMoveAttackBuffDuration: 1
      },
      penetrate: {
        canPassThroughFriendly: true,
        terrainCostReduction: 1,
        postPenetrateDefenseBonus: 0.15,
        postPenetrateDefenseBuffDuration: 1
      },
      halt: {
        terrainCostAdd: 1,
        stationaryDefenseBonus: 0.3,
        stationaryMoraleBonus: 5,
        immuneToDisplacement: true
      }
    }
  },
  economy: {
    enabled: true,
    startingGold: 200,
    baseGoldPerTurn: 30,
    goldPerSurvivingBase: 50,
    capturePointGoldPerTurn: 25,
    killGoldReward: {
      infantry: 20,
      cavalry: 30,
      archer: 25,
      mage: 40,
      tank: 35
    },
    damageToGoldRatio: 0.1,
    unitMaintenance: {
      enabled: true,
      infantry: 5,
      cavalry: 8,
      archer: 6,
      mage: 10,
      tank: 7
    },
    maintenanceFreeUnits: 3,
    lowGoldPenaltyThreshold: 50,
    lowGoldMoralePenalty: 5,
    bankruptMoralePenalty: 15
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
  },
  experience: {
    onAttack: 10,
    onKill: 30,
    onSurviveTurn: 5,
    onWin: 20,
    maxLevel: 5,
    levelThresholds: [0, 100, 250, 450, 700],
    statPointsPerLevel: 2,
    specializationLevel: 3,
    statGrowth: {
      atk: 3,
      def: 3,
      hp: 15,
      move: 1
    }
  },
  summon: {
    maxUnitsPerFaction: 12,
    adjacentSearchRadius: 2,
    preferOwnHalf: true,
    forbiddenTerrains: ['water'],
    forbiddenTileEffects: ['burning', 'frozen', 'poison_swamp'],
    summonExhausted: true
  },
  deployment: {
    enabled: true,
    maxMulligan: 2,
    canAdjustPosition: true,
    canMulligan: true,
    timeLimitPerPlayer: 120,
    deploymentZones: {
      red: {
        xMin: 0,
        xMax: 2,
        yMin: 0,
        yMax: 7
      },
      blue: {
        xMin: 13,
        xMax: 15,
        yMin: 0,
        yMax: 7
      }
    },
    restrictions: {
      allowSameTile: false,
      requireAllUnitsDeployed: true,
      minDistanceFromEnemy: 3,
      allowSwap: true
    },
    handStrategy: {
      enabled: true,
      canReorder: true,
      showEnemyHandCount: true,
      previewDrawPile: false
    }
  }
};

import { STATUS_EFFECT_TYPES } from '$lib/config/unitConfig';

export const BOSS_SKILL_TYPES = {
  AOE_CIRCLE: 'aoe_circle',
  AOE_LINE: 'aoe_line',
  AOE_FAN: 'aoe_fan',
  SUMMON: 'summon',
  BUFF_SELF: 'buff_self',
  DEBUFF_AREA: 'debuff_area',
  CHARGE: 'charge',
  HEAL_SELF: 'heal_self'
};

export const BOSS_PHASE_TRIGGER = {
  HP_PERCENT: 'hp_percent',
  TURN_COUNT: 'turn_count',
  UNIT_DEATH: 'unit_death',
  SUMMON_COUNT: 'summon_count'
};

export const BOSS_VICTORY_CONDITION = {
  KILL_BOSS: 'kill_boss',
  SURVIVE_TURNS: 'survive_turns',
  DESTROY_SUMMONS: 'destroy_summons',
  CAPTURE_POINTS: 'capture_points'
};

export const BOSS_DEFEAT_CONDITION = {
  ALL_UNITS_DEAD: 'all_units_dead',
  BOSS_REACHES_TARGET: 'boss_reaches_target',
  TURN_LIMIT_EXCEEDED: 'turn_limit_exceeded'
};

export const SKILL_TARGET_TYPE = {
  SELF: 'self',
  NEAREST_ENEMY: 'nearest_enemy',
  MOST_ENEMIES: 'most_enemies',
  RANDOM_ENEMY: 'random_enemy',
  ALL_ENEMIES: 'all_enemies',
  FIXED_POSITION: 'fixed_position'
};

/**
 * @typedef {object} BossSkillEffect
 * @property {number} [damage] - 基础伤害
 * @property {number} [damageMultiplier] - 伤害倍率
 * @property {string} [statusType] - 附加状态效果类型
 * @property {number} [statusDuration] - 状态效果持续时间
 * @property {number} [statusValue] - 状态效果数值
 * @property {number} [statusChance] - 状态效果触发概率
 * @property {number} [healAmount] - 治疗量
 * @property {string} [buffType] - Buff类型
 * @property {number} [buffValue] - Buff数值
 * @property {number} [buffDuration] - Buff持续时间
 * @property {string} [summonUnitType] - 召唤单位类型
 * @property {number} [summonCount] - 召唤数量
 * @property {boolean} [summonNearBoss] - 是否在首领附近召唤
 */

/**
 * @typedef {object} BossSkill
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} type - BOSS_SKILL_TYPES
 * @property {string} targetType - SKILL_TARGET_TYPE
 * @property {number} cooldown - 冷却回合
 * @property {number} range - 技能范围
 * @property {number} [aoeRadius] - AOE半径
 * @property {number} [fanAngle] - 扇形角度（度）
 * @property {number} [lineLength] - 直线长度
 * @property {number} [lineWidth] - 直线宽度
 * @property {BossSkillEffect} effect
 * @property {number} [warningTurns] - 预警回合数
 * @property {string} [icon]
 * @property {string} [color]
 */

/**
 * @typedef {object} BossPhaseStatModifier
 * @property {number} [attackMultiplier]
 * @property {number} [defenseMultiplier]
 * @property {number} [moveRangeBonus]
 * @property {number} [attackRangeBonus]
 * @property {number} [damageReduction]
 * @property {string[]} [statusImmunities]
 */

/**
 * @typedef {object} BossPhaseTrigger
 * @property {string} type - BOSS_PHASE_TRIGGER
 * @property {number} [hpPercent] - 血量百分比阈值
 * @property {number} [turnCount] - 回合数阈值
 * @property {string} [unitType] - 单位类型
 */

/**
 * @typedef {object} BossPhase
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {BossPhaseTrigger} trigger
 * @property {BossPhaseStatModifier} statModifiers
 * @property {string[]} availableSkillIds - 此阶段可用技能ID
 * @property {string} [phaseChangeMessage]
 * @property {string} [color]
 * @property {string} [icon]
 */

/**
 * @typedef {object} BossVictoryCondition
 * @property {string} type - BOSS_VICTORY_CONDITION
 * @property {number} [turnCount]
 * @property {number} [summonKillCount]
 * @property {number} [capturePointCount]
 * @property {string} description
 */

/**
 * @typedef {object} BossDefeatCondition
 * @property {string} type - BOSS_DEFEAT_CONDITION
 * @property {number} [turnLimit]
 * @property {{x: number, y: number}} [targetPosition]
 * @property {string} description
 */

/**
 * @typedef {object} BossConfig
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} description
 * @property {string} faction
 * @property {number} x
 * @property {number} y
 * @property {number} maxHp
 * @property {number} baseAttack
 * @property {number} baseDefense
 * @property {number} baseMoveRange
 * @property {number} baseAttackRange
 * @property {string} [moveSkill]
 * @property {string[]} [statusImmunities]
 * @property {Record<string, number>} [statusResistance]
 * @property {BossSkill[]} skills
 * @property {BossPhase[]} phases
 * @property {BossVictoryCondition} victoryCondition
 * @property {BossDefeatCondition} defeatCondition
 * @property {string} [icon]
 * @property {number} [color]
 */

/** @type {Record<string, BossSkill>} */
export const bossSkills = {
  fire_storm: {
    id: 'fire_storm',
    name: '烈焰风暴',
    description: '召唤火焰风暴，对范围内所有敌人造成伤害并附加灼烧',
    type: BOSS_SKILL_TYPES.AOE_CIRCLE,
    targetType: SKILL_TARGET_TYPE.MOST_ENEMIES,
    cooldown: 3,
    range: 5,
    aoeRadius: 2,
    effect: {
      damage: 40,
      statusType: STATUS_EFFECT_TYPES.BURN,
      statusDuration: 3,
      statusValue: 5,
      statusChance: 0.8
    },
    warningTurns: 1,
    icon: '🔥',
    color: '#e74c3c'
  },
  ice_lance: {
    id: 'ice_lance',
    name: '冰霜之枪',
    description: '发射直线冰枪，对路径上的敌人造成伤害并冻结',
    type: BOSS_SKILL_TYPES.AOE_LINE,
    targetType: SKILL_TARGET_TYPE.NEAREST_ENEMY,
    cooldown: 2,
    range: 6,
    lineLength: 6,
    lineWidth: 1,
    effect: {
      damage: 35,
      statusType: STATUS_EFFECT_TYPES.FREEZE,
      statusDuration: 2,
      statusChance: 0.7
    },
    warningTurns: 1,
    icon: '❄️',
    color: '#3498db'
  },
  thunder_fan: {
    id: 'thunder_fan',
    name: '雷霆扇形',
    description: '释放扇形雷电，对前方扇形区域敌人造成伤害并眩晕',
    type: BOSS_SKILL_TYPES.AOE_FAN,
    targetType: SKILL_TARGET_TYPE.MOST_ENEMIES,
    cooldown: 4,
    range: 4,
    fanAngle: 90,
    aoeRadius: 4,
    effect: {
      damage: 45,
      statusType: STATUS_EFFECT_TYPES.STUN,
      statusDuration: 1,
      statusChance: 0.6
    },
    warningTurns: 1,
    icon: '⚡',
    color: '#f39c12'
  },
  summon_minions: {
    id: 'summon_minions',
    name: '召唤仆从',
    description: '召唤小怪协助战斗',
    type: BOSS_SKILL_TYPES.SUMMON,
    targetType: SKILL_TARGET_TYPE.SELF,
    cooldown: 5,
    range: 0,
    effect: {
      summonUnitType: 'infantry',
      summonCount: 2,
      summonNearBoss: true
    },
    warningTurns: 0,
    icon: '👥',
    color: '#9b59b6'
  },
  summon_archers: {
    id: 'summon_archers',
    name: '召唤弓手',
    description: '召唤远程弓手',
    type: BOSS_SKILL_TYPES.SUMMON,
    targetType: SKILL_TARGET_TYPE.SELF,
    cooldown: 6,
    range: 0,
    effect: {
      summonUnitType: 'archer',
      summonCount: 2,
      summonNearBoss: true
    },
    warningTurns: 0,
    icon: '🏹',
    color: '#2ecc71'
  },
  battle_frenzy: {
    id: 'battle_frenzy',
    name: '战斗狂热',
    description: '进入狂暴状态，大幅提升攻击力',
    type: BOSS_SKILL_TYPES.BUFF_SELF,
    targetType: SKILL_TARGET_TYPE.SELF,
    cooldown: 4,
    range: 0,
    effect: {
      buffType: 'attackBoost',
      buffValue: 0.5,
      buffDuration: 3
    },
    warningTurns: 0,
    icon: '💪',
    color: '#e67e22'
  },
  poison_cloud: {
    id: 'poison_cloud',
    name: '毒云',
    description: '释放毒云，对范围内敌人造成持续中毒',
    type: BOSS_SKILL_TYPES.DEBUFF_AREA,
    targetType: SKILL_TARGET_TYPE.MOST_ENEMIES,
    cooldown: 3,
    range: 4,
    aoeRadius: 2,
    effect: {
      damage: 15,
      statusType: STATUS_EFFECT_TYPES.POISON,
      statusDuration: 4,
      statusValue: 8,
      statusChance: 1.0
    },
    warningTurns: 1,
    icon: '☠️',
    color: '#27ae60'
  },
  boss_charge: {
    id: 'boss_charge',
    name: '首领冲锋',
    description: '向目标冲锋并造成大量伤害',
    type: BOSS_SKILL_TYPES.CHARGE,
    targetType: SKILL_TARGET_TYPE.NEAREST_ENEMY,
    cooldown: 5,
    range: 6,
    effect: {
      damage: 60
    },
    warningTurns: 2,
    icon: '💨',
    color: '#c0392b'
  },
  dark_heal: {
    id: 'dark_heal',
    name: '暗黑治愈',
    description: '恢复自身生命值',
    type: BOSS_SKILL_TYPES.HEAL_SELF,
    targetType: SKILL_TARGET_TYPE.SELF,
    cooldown: 6,
    range: 0,
    effect: {
      healAmount: 80
    },
    warningTurns: 0,
    icon: '💚',
    color: '#16a085'
  },
  slow_field: {
    id: 'slow_field',
    name: '减速力场',
    description: '减缓范围内所有敌人的移动速度',
    type: BOSS_SKILL_TYPES.DEBUFF_AREA,
    targetType: SKILL_TARGET_TYPE.ALL_ENEMIES,
    cooldown: 4,
    range: 6,
    aoeRadius: 6,
    effect: {
      statusType: STATUS_EFFECT_TYPES.SLOW,
      statusDuration: 2,
      statusValue: 2,
      statusChance: 1.0
    },
    warningTurns: 1,
    icon: '🐌',
    color: '#2980b9'
  }
};

/** @type {Record<string, BossConfig>} */
export const bossConfig = {
  fire_dragon: {
    id: 'fire_dragon',
    name: '炎龙',
    type: 'boss_fire_dragon',
    description: '远古炎龙，掌控烈焰之力',
    faction: 'blue',
    x: 9,
    y: 4,
    maxHp: 500,
    baseAttack: 45,
    baseDefense: 15,
    baseMoveRange: 3,
    baseAttackRange: 2,
    statusImmunities: [STATUS_EFFECT_TYPES.BURN, STATUS_EFFECT_TYPES.POISON],
    statusResistance: {
      [STATUS_EFFECT_TYPES.STUN]: 0.3,
      [STATUS_EFFECT_TYPES.FREEZE]: 0.4
    },
    skills: [
      bossSkills.fire_storm,
      bossSkills.summon_minions,
      bossSkills.battle_frenzy,
      bossSkills.boss_charge,
      bossSkills.dark_heal
    ],
    phases: [
      {
        id: 1,
        name: '觉醒',
        description: '炎龙刚从沉睡中苏醒，正在积聚力量',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 100
        },
        statModifiers: {
          attackMultiplier: 1.0,
          defenseMultiplier: 1.0
        },
        availableSkillIds: ['fire_storm', 'summon_minions'],
        phaseChangeMessage: '炎龙苏醒了！',
        color: '#f39c12',
        icon: '🐉'
      },
      {
        id: 2,
        name: '狂怒',
        description: '炎龙感受到威胁，进入狂怒状态',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 60
        },
        statModifiers: {
          attackMultiplier: 1.3,
          defenseMultiplier: 1.1,
          moveRangeBonus: 1
        },
        availableSkillIds: ['fire_storm', 'summon_minions', 'battle_frenzy', 'boss_charge'],
        phaseChangeMessage: '炎龙进入狂怒状态！攻击力大幅提升！',
        color: '#e74c3c',
        icon: '🔥'
      },
      {
        id: 3,
        name: '濒死',
        description: '炎龙濒临死亡，释放全部力量',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 30
        },
        statModifiers: {
          attackMultiplier: 1.6,
          defenseMultiplier: 0.8,
          moveRangeBonus: 2,
          attackRangeBonus: 1,
          damageReduction: 0.2
        },
        availableSkillIds: ['fire_storm', 'battle_frenzy', 'boss_charge', 'dark_heal'],
        phaseChangeMessage: '炎龙发出最后的怒吼！释放全部力量！',
        color: '#8e44ad',
        icon: '💀'
      }
    ],
    victoryCondition: {
      type: BOSS_VICTORY_CONDITION.KILL_BOSS,
      description: '击败炎龙即可获胜'
    },
    defeatCondition: {
      type: BOSS_DEFEAT_CONDITION.ALL_UNITS_DEAD,
      description: '所有友方单位阵亡则失败'
    },
    icon: '🐉',
    color: 0xe74c3c
  },
  ice_queen: {
    id: 'ice_queen',
    name: '冰霜女王',
    type: 'boss_ice_queen',
    description: '永恒冻土的统治者，掌控寒冰之力',
    faction: 'blue',
    x: 9,
    y: 4,
    maxHp: 400,
    baseAttack: 38,
    baseDefense: 12,
    baseMoveRange: 2,
    baseAttackRange: 3,
    statusImmunities: [STATUS_EFFECT_TYPES.FREEZE, STATUS_EFFECT_TYPES.SLOW],
    statusResistance: {
      [STATUS_EFFECT_TYPES.BURN]: 0.5,
      [STATUS_EFFECT_TYPES.STUN]: 0.2
    },
    skills: [
      bossSkills.ice_lance,
      bossSkills.slow_field,
      bossSkills.summon_archers,
      bossSkills.dark_heal,
      bossSkills.thunder_fan
    ],
    phases: [
      {
        id: 1,
        name: '霜华',
        description: '冰霜女王优雅地挥动权杖',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 100
        },
        statModifiers: {
          attackMultiplier: 1.0,
          defenseMultiplier: 1.0
        },
        availableSkillIds: ['ice_lance', 'slow_field'],
        phaseChangeMessage: '冰霜女王降临！',
        color: '#3498db',
        icon: '👑'
      },
      {
        id: 2,
        name: '冰封',
        description: '寒气越来越重...',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 50
        },
        statModifiers: {
          attackMultiplier: 1.2,
          defenseMultiplier: 1.3,
          attackRangeBonus: 1
        },
        availableSkillIds: ['ice_lance', 'slow_field', 'summon_archers', 'thunder_fan'],
        phaseChangeMessage: '温度骤降！冰霜女王加强了防御！',
        color: '#2980b9',
        icon: '❄️'
      },
      {
        id: 3,
        name: '绝对零度',
        description: '释放绝对零度！',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 25
        },
        statModifiers: {
          attackMultiplier: 1.5,
          defenseMultiplier: 1.1,
          attackRangeBonus: 2
        },
        availableSkillIds: ['ice_lance', 'slow_field', 'thunder_fan', 'dark_heal'],
        phaseChangeMessage: '绝对零度！所有行动都将变得困难！',
        color: '#1abc9c',
        icon: '💎'
      }
    ],
    victoryCondition: {
      type: BOSS_VICTORY_CONDITION.SURVIVE_TURNS,
      turnCount: 15,
      description: '坚持15回合即可获胜'
    },
    defeatCondition: {
      type: BOSS_DEFEAT_CONDITION.ALL_UNITS_DEAD,
      description: '所有友方单位阵亡则失败'
    },
    icon: '👸',
    color: 0x3498db
  },
  shadow_lord: {
    id: 'shadow_lord',
    name: '暗影领主',
    type: 'boss_shadow_lord',
    description: '来自深渊的统治者，操控暗影与毒素',
    faction: 'blue',
    x: 9,
    y: 4,
    maxHp: 450,
    baseAttack: 40,
    baseDefense: 10,
    baseMoveRange: 4,
    baseAttackRange: 2,
    statusImmunities: [STATUS_EFFECT_TYPES.POISON, STATUS_EFFECT_TYPES.SILENCE],
    statusResistance: {
      [STATUS_EFFECT_TYPES.STUN]: 0.25,
      [STATUS_EFFECT_TYPES.BLEED]: 0.4
    },
    skills: [
      bossSkills.poison_cloud,
      bossSkills.summon_minions,
      bossSkills.summon_archers,
      bossSkills.battle_frenzy,
      bossSkills.boss_charge
    ],
    phases: [
      {
        id: 1,
        name: '暗影',
        description: '暗影领主从阴影中现身',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 100
        },
        statModifiers: {
          attackMultiplier: 1.0,
          defenseMultiplier: 1.0
        },
        availableSkillIds: ['poison_cloud', 'summon_minions'],
        phaseChangeMessage: '暗影降临！小心毒云！',
        color: '#2c3e50',
        icon: '👤'
      },
      {
        id: 2,
        name: '侵蚀',
        description: '暗影开始侵蚀大地',
        trigger: {
          type: BOSS_PHASE_TRIGGER.TURN_COUNT,
          turnCount: 5
        },
        statModifiers: {
          attackMultiplier: 1.2,
          moveRangeBonus: 1
        },
        availableSkillIds: ['poison_cloud', 'summon_minions', 'summon_archers', 'battle_frenzy'],
        phaseChangeMessage: '暗影侵蚀！更多援军出现！',
        color: '#8e44ad',
        icon: '🌑'
      },
      {
        id: 3,
        name: '深渊',
        description: '深渊之力完全解放',
        trigger: {
          type: BOSS_PHASE_TRIGGER.HP_PERCENT,
          hpPercent: 35
        },
        statModifiers: {
          attackMultiplier: 1.5,
          moveRangeBonus: 2,
          damageReduction: 0.25
        },
        availableSkillIds: ['poison_cloud', 'battle_frenzy', 'boss_charge'],
        phaseChangeMessage: '深渊之力！暗影领主势不可挡！',
        color: '#2c3e50',
        icon: '🌀'
      }
    ],
    victoryCondition: {
      type: BOSS_VICTORY_CONDITION.DESTROY_SUMMONS,
      summonKillCount: 10,
      description: '击败10个召唤物后可攻击首领'
    },
    defeatCondition: {
      type: BOSS_DEFEAT_CONDITION.TURN_LIMIT_EXCEEDED,
      turnLimit: 20,
      description: '超过20回合则失败'
    },
    icon: '🌑',
    color: 0x2c3e50
  }
};

/**
 * @param {string} bossId
 * @returns {BossConfig | null}
 */
export function getBossConfig(bossId) {
  return bossConfig[bossId] || null;
}

/**
 * @param {string} skillId
 * @returns {BossSkill | null}
 */
export function getBossSkill(skillId) {
  return bossSkills[skillId] || null;
}

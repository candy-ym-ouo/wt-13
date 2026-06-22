export const WEATHER_TYPES = {
  SUNNY: 'sunny',
  LIGHT_RAIN: 'light_rain',
  HEAVY_RAIN: 'heavy_rain',
  LIGHT_SNOW: 'light_snow',
  HEAVY_SNOW: 'heavy_snow',
  STRONG_WIND: 'strong_wind',
  SANDSTORM: 'sandstorm',
  FOG: 'fog'
};

export const WEATHER_CONFIG = {
  [WEATHER_TYPES.SUNNY]: {
    name: '晴天',
    icon: '☀️',
    color: '#ffd700',
    bgColor: 'rgba(255, 215, 0, 0.1)',
    description: '阳光明媚，战斗条件最佳',
    moveCostModifier: 0,
    attackRangeModifier: 0,
    hitChanceModifier: 0,
    visibilityRange: 0,
    cardEffectModifiers: {},
    allowedCardTypes: null,
    terrainEffects: {},
    probabilityWeight: 35,
    minDuration: 2,
    maxDuration: 4
  },
  [WEATHER_TYPES.LIGHT_RAIN]: {
    name: '小雨',
    icon: '🌦️',
    color: '#87ceeb',
    bgColor: 'rgba(135, 206, 235, 0.15)',
    description: '细雨绵绵，地面湿滑，移动稍有不便',
    moveCostModifier: 1,
    attackRangeModifier: 0,
    hitChanceModifier: -0.05,
    visibilityRange: -1,
    cardEffectModifiers: {
      fire: 0.5,
      ice: 1.2,
      lightning: 1.3
    },
    allowedCardTypes: null,
    terrainEffects: {
      plain: { moveCostAdd: 1 },
      forest: { moveCostAdd: 1 }
    },
    probabilityWeight: 15,
    minDuration: 2,
    maxDuration: 3
  },
  [WEATHER_TYPES.HEAVY_RAIN]: {
    name: '大雨',
    icon: '🌧️',
    color: '#4169e1',
    bgColor: 'rgba(65, 105, 225, 0.2)',
    description: '倾盆大雨，视野受阻，远程攻击严重削弱',
    moveCostModifier: 2,
    attackRangeModifier: -1,
    hitChanceModifier: -0.15,
    visibilityRange: -2,
    cardEffectModifiers: {
      fire: 0.2,
      ice: 1.5,
      lightning: 2.0,
      poison: 1.3
    },
    allowedCardTypes: null,
    terrainEffects: {
      plain: { moveCostAdd: 2, passable: true },
      forest: { moveCostAdd: 2 },
      mountain: { moveCostAdd: 1 }
    },
    probabilityWeight: 8,
    minDuration: 1,
    maxDuration: 2
  },
  [WEATHER_TYPES.LIGHT_SNOW]: {
    name: '小雪',
    icon: '🌨️',
    color: '#e0ffff',
    bgColor: 'rgba(224, 255, 255, 0.2)',
    description: '雪花飘落，地面结冰，移动受到影响',
    moveCostModifier: 1,
    attackRangeModifier: 0,
    hitChanceModifier: -0.05,
    visibilityRange: -1,
    cardEffectModifiers: {
      ice: 1.3,
      fire: 0.8
    },
    allowedCardTypes: null,
    terrainEffects: {
      plain: { moveCostAdd: 1 },
      forest: { moveCostAdd: 1 },
      mountain: { moveCostAdd: 1 }
    },
    probabilityWeight: 10,
    minDuration: 2,
    maxDuration: 3
  },
  [WEATHER_TYPES.HEAVY_SNOW]: {
    name: '大雪',
    icon: '❄️',
    color: '#b0e0e6',
    bgColor: 'rgba(176, 224, 230, 0.25)',
    description: '暴雪来袭，视野极低，山地可能无法通行',
    moveCostModifier: 3,
    attackRangeModifier: -2,
    hitChanceModifier: -0.2,
    visibilityRange: -3,
    cardEffectModifiers: {
      ice: 2.0,
      fire: 0.5,
      lightning: 0.7
    },
    allowedCardTypes: null,
    terrainEffects: {
      plain: { moveCostAdd: 2 },
      forest: { moveCostAdd: 2 },
      mountain: { moveCostAdd: 99, passable: false }
    },
    probabilityWeight: 5,
    minDuration: 1,
    maxDuration: 2
  },
  [WEATHER_TYPES.STRONG_WIND]: {
    name: '强风',
    icon: '💨',
    color: '#98fb98',
    bgColor: 'rgba(152, 251, 152, 0.15)',
    description: '狂风大作，远程攻击偏离，飞行单位受影响',
    moveCostModifier: 1,
    attackRangeModifier: -1,
    hitChanceModifier: -0.1,
    visibilityRange: 0,
    cardEffectModifiers: {
      ranged: 0.6,
      melee: 1.1,
      flying: 0.4
    },
    allowedCardTypes: null,
    terrainEffects: {},
    probabilityWeight: 10,
    minDuration: 1,
    maxDuration: 2
  },
  [WEATHER_TYPES.SANDSTORM]: {
    name: '沙暴',
    icon: '🌪️',
    color: '#daa520',
    bgColor: 'rgba(218, 165, 32, 0.3)',
    description: '沙暴肆虐，视野极差，所有单位受到持续伤害',
    moveCostModifier: 2,
    attackRangeModifier: -2,
    hitChanceModifier: -0.25,
    visibilityRange: -3,
    damagePerTurn: 5,
    cardEffectModifiers: {
      ranged: 0.4,
      magic: 0.7,
      melee: 0.9
    },
    allowedCardTypes: null,
    terrainEffects: {
      plain: { moveCostAdd: 2 },
      forest: { moveCostAdd: 1 },
      outpost: { moveCostAdd: 1 },
      mine: { moveCostAdd: 1 }
    },
    probabilityWeight: 4,
    minDuration: 1,
    maxDuration: 2
  },
  [WEATHER_TYPES.FOG]: {
    name: '浓雾',
    icon: '🌫️',
    color: '#708090',
    bgColor: 'rgba(112, 128, 144, 0.25)',
    description: '浓雾弥漫，视野受阻，适合伏击',
    moveCostModifier: 0,
    attackRangeModifier: -1,
    hitChanceModifier: -0.1,
    visibilityRange: -3,
    cardEffectModifiers: {
      stealth: 1.5,
      reveal: 0.5,
      ranged: 0.7
    },
    allowedCardTypes: null,
    terrainEffects: {},
    probabilityWeight: 8,
    minDuration: 2,
    maxDuration: 3
  }
};

export const WEATHER_TRANSITION_RULES = {
  [WEATHER_TYPES.SUNNY]: [WEATHER_TYPES.LIGHT_RAIN, WEATHER_TYPES.LIGHT_SNOW, WEATHER_TYPES.STRONG_WIND, WEATHER_TYPES.FOG],
  [WEATHER_TYPES.LIGHT_RAIN]: [WEATHER_TYPES.SUNNY, WEATHER_TYPES.HEAVY_RAIN, WEATHER_TYPES.FOG],
  [WEATHER_TYPES.HEAVY_RAIN]: [WEATHER_TYPES.LIGHT_RAIN, WEATHER_TYPES.SUNNY],
  [WEATHER_TYPES.LIGHT_SNOW]: [WEATHER_TYPES.SUNNY, WEATHER_TYPES.HEAVY_SNOW, WEATHER_TYPES.FOG],
  [WEATHER_TYPES.HEAVY_SNOW]: [WEATHER_TYPES.LIGHT_SNOW, WEATHER_TYPES.SUNNY],
  [WEATHER_TYPES.STRONG_WIND]: [WEATHER_TYPES.SUNNY, WEATHER_TYPES.SANDSTORM, WEATHER_TYPES.LIGHT_RAIN],
  [WEATHER_TYPES.SANDSTORM]: [WEATHER_TYPES.STRONG_WIND, WEATHER_TYPES.SUNNY],
  [WEATHER_TYPES.FOG]: [WEATHER_TYPES.SUNNY, WEATHER_TYPES.LIGHT_RAIN, WEATHER_TYPES.LIGHT_SNOW]
};

export const WEATHER_CARD_TAGS = {
  fire: ['meteor_strike', 'fireball', 'flame_burst'],
  ice: ['ice_blast', 'freeze', 'blizzard'],
  lightning: ['lightning_bolt', 'thunder_strike'],
  poison: ['poison_cloud', 'toxic_mist'],
  ranged: ['rain_of_arrows', 'volley'],
  melee: ['charge', 'berserker_rage'],
  flying: ['aerial_strike', 'air_support'],
  magic: ['arcane_missile', 'fireball', 'ice_blast', 'lightning_bolt'],
  stealth: ['stealth', 'ambush'],
  reveal: ['scout', 'reveal', 'far_sight']
};

/**
 * @param {string} weatherType
 * @returns {any}
 */
export function getWeatherConfig(weatherType) {
  return WEATHER_CONFIG[weatherType] || WEATHER_CONFIG[WEATHER_TYPES.SUNNY];
}

/**
 * @param {string} weatherType
 * @returns {string}
 */
export function getWeatherIcon(weatherType) {
  return getWeatherConfig(weatherType).icon;
}

/**
 * @param {string} weatherType
 * @returns {string}
 */
export function getWeatherName(weatherType) {
  return getWeatherConfig(weatherType).name;
}

/**
 * @param {string} weatherType
 * @returns {string}
 */
export function getWeatherColor(weatherType) {
  return getWeatherConfig(weatherType).color;
}

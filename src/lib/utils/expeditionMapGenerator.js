import {
  EXPEDITION_EVENT_TYPES,
  EXPEDITION_DIFFICULTY,
  getRandomBoss,
  getRandomBlessing,
  getRandomEvent,
  getRandomSupplyTypes
} from '$lib/config/expeditionConfig.js';
import { unitConfig, initialUnits } from '$lib/config/unitConfig.js';
import { gameRules } from '$lib/config/gameRules.js';

function generateId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }
  return Object.keys(weights)[0];
}

export function getLayerEventWeights(layer, totalLayers) {
  const progress = layer / totalLayers;
  
  if (layer === 0) {
    return { [EXPEDITION_EVENT_TYPES.BATTLE]: 1.0 };
  }
  
  if (layer === totalLayers - 1) {
    return { [EXPEDITION_EVENT_TYPES.BOSS]: 1.0 };
  }
  
  const midPoint = totalLayers / 2;
  
  if (progress < 0.3) {
    return {
      [EXPEDITION_EVENT_TYPES.BATTLE]: 0.4,
      [EXPEDITION_EVENT_TYPES.SUPPLY]: 0.25,
      [EXPEDITION_EVENT_TYPES.RANDOM]: 0.15,
      [EXPEDITION_EVENT_TYPES.REST]: 0.1,
      [EXPEDITION_EVENT_TYPES.SHOP]: 0.1
    };
  } else if (progress < 0.7) {
    return {
      [EXPEDITION_EVENT_TYPES.BATTLE]: 0.35,
      [EXPEDITION_EVENT_TYPES.SUPPLY]: 0.2,
      [EXPEDITION_EVENT_TYPES.RANDOM]: 0.2,
      [EXPEDITION_EVENT_TYPES.SHRINE]: 0.1,
      [EXPEDITION_EVENT_TYPES.REST]: 0.075,
      [EXPEDITION_EVENT_TYPES.SHOP]: 0.075
    };
  } else {
    return {
      [EXPEDITION_EVENT_TYPES.BATTLE]: 0.4,
      [EXPEDITION_EVENT_TYPES.SUPPLY]: 0.15,
      [EXPEDITION_EVENT_TYPES.RANDOM]: 0.15,
      [EXPEDITION_EVENT_TYPES.SHRINE]: 0.15,
      [EXPEDITION_EVENT_TYPES.REST]: 0.075,
      [EXPEDITION_EVENT_TYPES.SHOP]: 0.075
    };
  }
}

export function generateEventNode(layer, index, totalLayers, difficulty) {
  const weights = getLayerEventWeights(layer, totalLayers);
  const eventType = pickWeighted(weights);
  
  const node = {
    id: generateId(),
    layer,
    index,
    eventType,
    visited: false,
    available: layer === 0,
    connections: [],
    data: generateEventData(eventType, layer, totalLayers, difficulty)
  };
  
  return node;
}

function generateEventData(eventType, layer, totalLayers, difficulty) {
  const baseStrength = difficulty.enemyStrength * (1 + layer * 0.1);
  
  switch (eventType) {
    case EXPEDITION_EVENT_TYPES.BATTLE:
      return generateBattleData(layer, baseStrength);
    case EXPEDITION_EVENT_TYPES.SUPPLY:
      return generateSupplyData();
    case EXPEDITION_EVENT_TYPES.RANDOM:
      return generateRandomEventData();
    case EXPEDITION_EVENT_TYPES.SHRINE:
      return generateShrineData();
    case EXPEDITION_EVENT_TYPES.SHOP:
      return generateShopData(layer);
    case EXPEDITION_EVENT_TYPES.BOSS:
      return generateBossData(baseStrength);
    case EXPEDITION_EVENT_TYPES.REST:
      return generateRestData();
    default:
      return {};
  }
}

function generateBattleData(layer, baseStrength) {
  const enemyCount = randomInt(3, 5);
  const unitTypes = Object.keys(unitConfig);
  const enemies = [];
  
  for (let i = 0; i < enemyCount; i++) {
    const type = pickRandom(unitTypes);
    const config = unitConfig[type];
    enemies.push({
      id: generateId(),
      type,
      level: Math.max(1, layer + randomInt(0, 2)),
      name: config.name,
      currentHp: Math.floor(config.hp * baseStrength),
      maxHp: Math.floor(config.hp * baseStrength),
      attack: Math.floor(config.attack * baseStrength),
      defense: Math.floor(config.defense * baseStrength),
      x: 10 + (i % 2) * 2,
      y: Math.floor(i / 2) * 2,
      buffs: [],
      statusEffects: [],
      winStreak: 0,
      morale: 80
    });
  }
  
  return {
    enemies,
    isElite: layer >= 3 && Math.random() < 0.3,
    rewardMultiplier: baseStrength
  };
}

function generateSupplyData() {
  return {
    options: getRandomSupplyTypes(3).map(type => ({
      type,
      selected: false
    }))
  };
}

function generateRandomEventData() {
  return {
    event: getRandomEvent(),
    outcomeResolved: false
  };
}

function generateShrineData() {
  return {
    blessings: [
      getRandomBlessing(),
      getRandomBlessing(),
      getRandomBlessing()
    ].filter((b, i, a) => a.findIndex(x => x.id === b.id) === i).slice(0, 3),
    used: false
  };
}

function generateShopData(layer) {
  return {
    discount: Math.random() < 0.3 ? 0.8 : 1.0,
    availableItems: generateShopInventory(layer)
  };
}

function generateShopInventory(layer) {
  const items = [];
  const count = randomInt(4, 6);
  
  for (let i = 0; i < count; i++) {
    items.push({
      id: generateId(),
      type: pickRandom(['heal', 'buff', 'card', 'equipment']),
      price: randomInt(30 + layer * 10, 100 + layer * 20),
      purchased: false
    });
  }
  
  return items;
}

function generateBossData(baseStrength) {
  const bossTemplate = getRandomBoss();
  const bossStrength = baseStrength * bossTemplate.strengthMultiplier;
  
  const enemies = [];
  const unitTypes = bossTemplate.unitTypes;
  
  for (let i = 0; i < unitTypes.length; i++) {
    const type = unitTypes[i];
    const config = unitConfig[type];
    const isBoss = i === 0;
    
    enemies.push({
      id: generateId(),
      type,
      level: 10,
      name: isBoss ? bossTemplate.name : `${config.name}护卫`,
      isBoss,
      currentHp: Math.floor(config.hp * bossStrength * (isBoss ? 2 : 1)),
      maxHp: Math.floor(config.hp * bossStrength * (isBoss ? 2 : 1)),
      attack: Math.floor(config.attack * bossStrength * (isBoss ? 1.5 : 1)),
      defense: Math.floor(config.defense * bossStrength * (isBoss ? 1.3 : 1)),
      x: 10 + (i % 2) * 2,
      y: Math.floor(i / 2) * 2,
      buffs: isBoss ? [{ type: 'attackBoost', value: 0.2, duration: 99 }] : [],
      statusEffects: [],
      winStreak: 0,
      morale: 100
    });
  }
  
  return {
    bossId: bossTemplate.id,
    bossName: bossTemplate.name,
    bossIcon: bossTemplate.icon,
    bossDescription: bossTemplate.description,
    enemies
  };
}

function generateRestData() {
  return {
    healAmount: 0.3,
    moraleBoost: 15,
    used: false
  };
}

export function generateExpeditionMap(difficultyId) {
  const difficulty = EXPEDITION_DIFFICULTY[difficultyId.toUpperCase()] || EXPEDITION_DIFFICULTY.NORMAL;
  const totalLayers = difficulty.layerCount;
  
  const layers = [];
  
  for (let layerIdx = 0; layerIdx < totalLayers; layerIdx++) {
    const nodesInLayer = layerIdx === 0 || layerIdx === totalLayers - 1
      ? 1
      : randomInt(2, 4);
    
    const layerNodes = [];
    
    for (let nodeIdx = 0; nodeIdx < nodesInLayer; nodeIdx++) {
      const node = generateEventNode(layerIdx, nodeIdx, totalLayers, difficulty);
      layerNodes.push(node);
    }
    
    layers.push(layerNodes);
  }
  
  for (let layerIdx = 0; layerIdx < totalLayers - 1; layerIdx++) {
    const currentLayer = layers[layerIdx];
    const nextLayer = layers[layerIdx + 1];
    
    for (let i = 0; i < currentLayer.length; i++) {
      const currentNode = currentLayer[i];
      const connectionCount = Math.min(nextLayer.length, randomInt(1, 2));
      
      const availableIndices = nextLayer.map((_, idx) => idx);
      
      for (let c = 0; c < connectionCount; c++) {
        if (availableIndices.length === 0) break;
        
        let targetIdx;
        if (nextLayer.length === 1) {
          targetIdx = 0;
        } else {
          const randIdx = Math.floor(Math.random() * availableIndices.length);
          targetIdx = availableIndices[randIdx];
          availableIndices.splice(randIdx, 1);
        }
        
        currentNode.connections.push(nextLayer[targetIdx].id);
      }
    }
    
    for (const nextNode of nextLayer) {
      const hasIncoming = currentLayer.some(node => 
        node.connections.includes(nextNode.id)
      );
      
      if (!hasIncoming && currentLayer.length > 0) {
        const closestIdx = Math.min(
          currentLayer.length - 1,
          Math.max(0, Math.round(nextNode.index * currentLayer.length / Math.max(1, nextLayer.length)))
        );
        currentLayer[closestIdx].connections.push(nextNode.id);
      }
    }
  }
  
  return {
    id: generateId(),
    difficulty: difficulty.id,
    difficultyConfig: difficulty,
    totalLayers,
    layers,
    currentLayer: 0,
    currentNodeId: null,
    completed: false,
    success: false
  };
}

export function initializeExpeditionRoster(baseRoster) {
  return baseRoster.map(unit => ({
    ...unit,
    currentHp: unit.maxHp,
    exp: unit.exp || 0,
    level: unit.level || 1,
    statPoints: unit.statPoints || 0,
    allocatedStats: unit.allocatedStats || { atk: 0, def: 0, hp: 0, move: 0 },
    specialization: unit.specialization || null,
    equipment: unit.equipment || { weapon: null, armor: null, accessory: null, relic: null },
    buffs: [],
    statusEffects: [],
    morale: gameRules.morale.initial
  }));
}

export function getAvailableNodes(map) {
  const available = [];
  
  for (const layer of map.layers) {
    for (const node of layer) {
      if (node.available && !node.visited) {
        available.push(node);
      }
    }
  }
  
  return available;
}

export function getNodeById(map, nodeId) {
  for (const layer of map.layers) {
    for (const node of layer) {
      if (node.id === nodeId) return node;
    }
  }
  return null;
}

export function visitNode(map, nodeId) {
  const node = getNodeById(map, nodeId);
  if (!node) return map;
  
  const newLayers = map.layers.map(layer => 
    layer.map(n => {
      if (n.id === nodeId) {
        return { ...n, visited: true, available: false };
      }
      
      if (node.connections.includes(n.id)) {
        return { ...n, available: true };
      }
      
      return n;
    })
  );
  
  return {
    ...map,
    layers: newLayers,
    currentLayer: node.layer,
    currentNodeId: nodeId
  };
}

import { boardConfig } from '$lib/config/boardConfig';
import { unitConfig } from '$lib/config/unitConfig';
import { gameRules } from '$lib/config/gameRules';

export function getTerrain(x, y) {
  if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) {
    return null;
  }
  const terrainType = boardConfig.layout[y][x];
  return { ...boardConfig.terrain[terrainType], type: terrainType };
}

export function isPassable(x, y) {
  const terrain = getTerrain(x, y);
  if (!terrain) return false;
  return terrain.passable !== false;
}

export function getMoveRange(unit, units) {
  const config = unitConfig[unit.type];
  let moveRange = config.moveRange;
  
  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'moveBoost') {
        moveRange += buff.value;
      }
    }
  }

  const visited = new Map();
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
  visited.set(`${unit.x},${unit.y}`, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    if (current.cost >= moveRange) continue;

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y)) continue;

      const terrain = getTerrain(neighbor.x, neighbor.y);
      const newCost = current.cost + terrain.moveCost;

      if (newCost > moveRange) continue;

      const key = `${neighbor.x},${neighbor.y}`;
      if (visited.has(key) && visited.get(key) <= newCost) continue;

      const unitAtPos = units.find(u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos && unitAtPos.faction !== unit.faction) continue;

      visited.set(key, newCost);
      queue.push({ x: neighbor.x, y: neighbor.y, cost: newCost });
    }
  }

  const result = [];
  for (const [key, cost] of visited.entries()) {
    const [x, y] = key.split(',').map(Number);
    if (x === unit.x && y === unit.y) continue;
    const unitAtPos = units.find(u => u.x === x && u.y === y);
    if (unitAtPos) continue;
    result.push({ x, y, cost });
  }

  return result;
}

export function getAttackRange(unit, units) {
  const config = unitConfig[unit.type];
  const attackRange = config.attackRange;
  const result = [];

  for (let dy = -attackRange; dy <= attackRange; dy++) {
    for (let dx = -attackRange; dx <= attackRange; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 0 || distance > attackRange) continue;

      const x = unit.x + dx;
      const y = unit.y + dy;

      if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;

      const targetUnit = units.find(u => u.x === x && u.y === y && u.faction !== unit.faction);
      if (targetUnit) {
        result.push({ x, y, target: targetUnit });
      }
    }
  }

  return result;
}

export function calculateDamage(attacker, defender, terrain) {
  const attackerConfig = unitConfig[attacker.type];
  const defenderConfig = unitConfig[defender.type];

  let attack = attackerConfig.attack;
  let defense = defenderConfig.defense;

  if (attacker.buffs) {
    for (const buff of attacker.buffs) {
      if (buff.type === 'attackBoost') {
        attack *= (1 + buff.value);
      }
    }
  }

  if (defender.buffs) {
    for (const buff of defender.buffs) {
      if (buff.type === 'defenseBoost') {
        defense *= (1 + buff.value);
      }
    }
  }

  if (gameRules.combat.terrainDefenseBonus && terrain) {
    defense += terrain.defenseBonus;
  }

  const hpRatio = attacker.currentHp / attackerConfig.hp;
  attack *= hpRatio;

  const damage = Math.floor(attack * (100 / (100 + defense)));
  return Math.max(1, damage);
}

export function findPath(start, end, units, unit) {
  const config = unitConfig[unit.type];
  let moveRange = config.moveRange;
  
  if (unit.buffs) {
    for (const buff of unit.buffs) {
      if (buff.type === 'moveBoost') {
        moveRange += buff.value;
      }
    }
  }

  const openSet = new Map();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;

  openSet.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, end));

  while (openSet.size > 0) {
    let currentKey = null;
    let lowestF = Infinity;
    for (const key of openSet.keys()) {
      const f = fScore.get(key) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentKey = key;
      }
    }

    if (currentKey === endKey) {
      const path = [];
      let key = currentKey;
      while (cameFrom.has(key)) {
        const [x, y] = key.split(',').map(Number);
        path.unshift({ x, y });
        key = cameFrom.get(key);
      }
      return { path, cost: gScore.get(endKey) };
    }

    const current = openSet.get(currentKey);
    openSet.delete(currentKey);

    const neighbors = [
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 }
    ];

    for (const neighbor of neighbors) {
      if (!isPassable(neighbor.x, neighbor.y)) continue;

      const terrain = getTerrain(neighbor.x, neighbor.y);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + terrain.moveCost;

      if (tentativeG > moveRange) continue;

      const unitAtPos = units.find(u => u.x === neighbor.x && u.y === neighbor.y);
      if (unitAtPos && unitAtPos.faction !== unit.faction) continue;
      if (unitAtPos && unitAtPos.faction === unit.faction && unitAtPos.id !== unit.id) continue;

      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));

        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, neighbor);
        }
      }
    }
  }

  return null;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function checkVictory(units, currentFaction) {
  const enemyFaction = currentFaction === 'red' ? 'blue' : 'red';
  const enemyUnits = units.filter(u => u.faction === enemyFaction);

  if (enemyUnits.length === 0) {
    return { winner: currentFaction, condition: '消灭所有敌军' };
  }

  for (let y = 0; y < boardConfig.height; y++) {
    for (let x = 0; x < boardConfig.width; x++) {
      const terrain = getTerrain(x, y);
      if (terrain.isBase && terrain.faction === enemyFaction) {
        const unitOnBase = units.find(u => u.x === x && u.y === y && u.faction === currentFaction);
        if (unitOnBase) {
          return { winner: currentFaction, condition: '占领敌方基地' };
        }
      }
    }
  }

  return null;
}

export function getUnitAt(units, x, y) {
  return units.find(u => u.x === x && u.y === y) || null;
}

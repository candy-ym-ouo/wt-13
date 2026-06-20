<script>
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { boardConfig } from '$lib/config/boardConfig';
  import { unitConfig } from '$lib/config/unitConfig';
  import { gameRules } from '$lib/config/gameRules';
  import { gameState, selectedUnit, currentHand, currentEnergy, currentCooldowns } from '$lib/stores/gameStore';
  import {
    getTerrain,
    getMoveRange,
    getAttackRange,
    findPath,
    calculateDamage,
    getUnitAt,
    checkVictory,
    getMoraleTier,
    getBaseAt,
    isHardCC,
    hasStatusEffect,
    getStatusEffect,
    getEffectiveMoveRange
  } from '$lib/utils/gameLogic';
  import { canUseCard, applyCardEffect, canAffordCard } from '$lib/utils/cardSystem';
  import { STATUS_EFFECT_INFO, STATUS_EFFECT_TYPES, getStatusInfo } from '$lib/config/unitConfig';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../utils/cardSystem').EventCard} EventCard
   * @typedef {import('../stores/gameStore').GameState} GameState
   * @typedef {keyof typeof unitConfig} UnitType
   */

  /** @type {HTMLDivElement | undefined} */
  let canvasContainer;
  /** @type {any} */
  let app;
  /** @type {any} */
  let boardLayer;
  /** @type {any} */
  let unitsLayer;
  /** @type {any} */
  let overlayLayer;

  /** @type {GameState | null} */
  let state = null;
  /** @type {Unit | null} */
  let selectedUnitData = null;
  /** @type {EventCard[]} */
  let handCards = [];
  let energy = 0;
  /** @type {import('../utils/cardSystem').CooldownEntry[]} */
  let cooldowns = [];

  /** @type {Map<string, any>} */
  const unitSprites = new Map();
  /** @type {any[]} */
  let moveHighlights = [];
  /** @type {any[]} */
  let attackHighlights = [];
  /** @type {any[]} */
  let pathDots = [];

  /** @type {(() => void) | undefined} */
  let unsubscribeState;
  /** @type {(() => void) | undefined} */
  let unsubscribeSelected;
  /** @type {(() => void) | undefined} */
  let unsubscribeHand;
  /** @type {(() => void) | undefined} */
  let unsubscribeEnergy;
  /** @type {(() => void) | undefined} */
  let unsubscribeCooldowns;

  onMount(() => {
    initPixi();
    
    unsubscribeState = gameState.subscribe(/** @param {GameState} s */ s => {
      state = s;
      renderBoard();
      renderUnits();
      updateHighlights();
    });
    
    unsubscribeSelected = selectedUnit.subscribe(/** @param {Unit | null} u */ u => {
      selectedUnitData = u;
      updateHighlights();
    });
    
    unsubscribeHand = currentHand.subscribe(/** @param {EventCard[]} h */ h => {
      handCards = h;
    });
    unsubscribeEnergy = currentEnergy.subscribe(/** @param {number} e */ e => {
      energy = e;
    });
    unsubscribeCooldowns = currentCooldowns.subscribe(/** @param {import('../utils/cardSystem').CooldownEntry[]} c */ c => {
      cooldowns = c;
    });

    window.addEventListener('resize', handleResize);
    handleResize();
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (unsubscribeSelected) unsubscribeSelected();
    if (unsubscribeHand) unsubscribeHand();
    if (unsubscribeEnergy) unsubscribeEnergy();
    if (unsubscribeCooldowns) unsubscribeCooldowns();
    window.removeEventListener('resize', handleResize);
    if (app) {
      app.destroy(true, true);
    }
  });

  function initPixi() {
    app = new PIXI.Application({
      width: boardConfig.width * boardConfig.tileSize,
      height: boardConfig.height * boardConfig.tileSize,
      backgroundColor: 0x1a1a2e,
      antialias: true
    });

    if (canvasContainer) {
      canvasContainer.appendChild(app.view);
    }

    boardLayer = new PIXI.Container();
    app.stage.addChild(boardLayer);

    unitsLayer = new PIXI.Container();
    app.stage.addChild(unitsLayer);

    overlayLayer = new PIXI.Container();
    app.stage.addChild(overlayLayer);

    drawBoard();

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', onPointerMove);
    app.stage.on('pointerdown', onPointerDown);
  }

  function drawBaseStatus() {
    if (!state || !state.bases || !boardLayer) return;
    
    for (const base of state.bases) {
      const terrain = getTerrain(base.x, base.y, state.boardLayout || boardConfig.layout);
      if (!terrain || !terrain.isBase) continue;

      const x = base.x * boardConfig.tileSize;
      const y = base.y * boardConfig.tileSize;
      const size = boardConfig.tileSize;

      const durabilityPercent = base.durability / base.maxDurability;
      const barWidth = size - 8;
      const barHeight = 6;
      const barX = x + 4;
      const barY = y + size - 12;

      const barBg = new PIXI.Graphics();
      barBg.beginFill(0x333333, 0.9);
      barBg.drawRect(barX, barY, barWidth, barHeight);
      barBg.endFill();
      boardLayer.addChild(barBg);

      const durColor = durabilityPercent > 0.6 ? 0x2ecc71 : durabilityPercent > 0.3 ? 0xf1c40f : 0xe74c3c;
      const barFill = new PIXI.Graphics();
      barFill.beginFill(durColor);
      barFill.drawRect(barX, barY, barWidth * durabilityPercent, barHeight);
      barFill.endFill();
      boardLayer.addChild(barFill);

      const durText = new PIXI.Text(`${Math.floor(base.durability)}`, {
        fontSize: 10,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 2,
        fontWeight: 'bold'
      });
      durText.anchor.set(0.5);
      durText.x = x + size / 2;
      durText.y = y + size - 8;
      boardLayer.addChild(durText);

      if (base.captureProgress > 0) {
        const captureTurns = gameRules.victoryConditions.captureBase.captureTurnsRequired || 3;
        const capturePercent = base.captureProgress / captureTurns;
        const captureBarY = y + size - 22;
        
        const captureBg = new PIXI.Graphics();
        captureBg.beginFill(0x333333, 0.9);
        captureBg.drawRect(barX, captureBarY, barWidth, 5);
        captureBg.endFill();
        boardLayer.addChild(captureBg);

        const captureColor = base.capturingFaction === 'red' ? 0xe74c3c : 0x3498db;
        const captureFill = new PIXI.Graphics();
        captureFill.beginFill(captureColor);
        captureFill.drawRect(barX, captureBarY, barWidth * capturePercent, 5);
        captureFill.endFill();
        boardLayer.addChild(captureFill);

        const captureText = new PIXI.Text(`占领${base.captureProgress}/${captureTurns}`, {
          fontSize: 8,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 2
        });
        captureText.anchor.set(0.5);
        captureText.x = x + size / 2;
        captureText.y = y + size - 19;
        boardLayer.addChild(captureText);
      }

      const baseIcon = new PIXI.Text('🏰', { fontSize: 20 });
      baseIcon.anchor.set(0.5);
      baseIcon.x = x + size / 2;
      baseIcon.y = y + size / 2 - 5;
      boardLayer.addChild(baseIcon);
    }
  }

  function drawBoard() {
    if (!boardLayer) return;
    boardLayer.removeChildren();
    const layout = state?.boardLayout || boardConfig.layout;

    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const terrain = getTerrain(x, y, layout);
        if (!terrain) continue;
        const tile = new PIXI.Graphics();
        
        tile.beginFill(terrain.color);
        tile.drawRect(
          x * boardConfig.tileSize,
          y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        tile.endFill();

        tile.lineStyle(1, 0x000000, 0.3);
        tile.drawRect(
          x * boardConfig.tileSize,
          y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );

        boardLayer.addChild(tile);
      }
    }
  }

  function renderBoard() {
    drawBoard();
    drawBaseStatus();
  }

  function renderUnits() {
    if (!state || !unitsLayer) return;

    for (const sprite of unitSprites.values()) {
      sprite.destroy();
    }
    unitSprites.clear();
    unitsLayer.removeChildren();

    for (const unit of state.units) {
      const sprite = createUnitSprite(unit);
      unitsLayer.addChild(sprite);
      unitSprites.set(unit.id, sprite);
    }
  }

  /**
   * @param {Unit} unit
   * @returns {any}
   */
  function createUnitSprite(unit) {
    const config = unitConfig[/** @type {UnitType} */ (unit.type)];
    const container = new PIXI.Container();
    
    container.x = unit.x * boardConfig.tileSize + boardConfig.tileSize / 2;
    container.y = unit.y * boardConfig.tileSize + boardConfig.tileSize / 2;

    const body = new PIXI.Graphics();
    body.beginFill(config.color);
    body.drawCircle(0, 0, boardConfig.tileSize * 0.35);
    body.endFill();

    const borderColor = unit.faction === 'red' ? 0xff3333 : 0x3366ff;
    body.lineStyle(3, borderColor, 1);
    body.drawCircle(0, 0, boardConfig.tileSize * 0.35);
    container.addChild(body);

    const iconText = getUnitEmoji(unit.type);
    const icon = new PIXI.Text(iconText, { fontSize: 22, fill: 0xffffff });
    icon.anchor.set(0.5);
    container.addChild(icon);

    const hpPercent = unit.currentHp / unit.maxHp;
    const hpBarBg = new PIXI.Graphics();
    hpBarBg.beginFill(0x333333);
    hpBarBg.drawRect(-20, -28, 40, 5);
    hpBarBg.endFill();
    container.addChild(hpBarBg);

    const hpColor = hpPercent > 0.6 ? 0x2ecc71 : hpPercent > 0.3 ? 0xf1c40f : 0xe74c3c;
    const hpBar = new PIXI.Graphics();
    hpBar.beginFill(hpColor);
    hpBar.drawRect(-20, -28, 40 * hpPercent, 5);
    hpBar.endFill();
    container.addChild(hpBar);

    const moraleValue = unit.morale !== undefined ? unit.morale : 80;
    const moralePercent = moraleValue / 100;
    const moraleBarBg = new PIXI.Graphics();
    moraleBarBg.beginFill(0x333333);
    moraleBarBg.drawRect(-20, -21, 40, 4);
    moraleBarBg.endFill();
    container.addChild(moraleBarBg);

    const moraleTier = getMoraleTier(moraleValue);
    let moraleColor = 0xf1c40f;
    if (moraleValue >= 80) moraleColor = 0x2ecc71;
    else if (moraleValue >= 50) moraleColor = 0xf1c40f;
    else if (moraleValue >= 30) moraleColor = 0xe67e22;
    else moraleColor = 0xe74c3c;
    const moraleBar = new PIXI.Graphics();
    moraleBar.beginFill(moraleColor);
    moraleBar.drawRect(-20, -21, 40 * moralePercent, 4);
    moraleBar.endFill();
    container.addChild(moraleBar);

    const moraleText = new PIXI.Text(`${moraleValue}`, {
      fontSize: 9,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 2
    });
    moraleText.anchor.set(0.5);
    moraleText.y = -13;
    container.addChild(moraleText);

    const exhausted = unit.hasMoved && unit.hasAttacked;
    const hardCC = isHardCC(unit);
    if (exhausted || hardCC) {
      const shade = new PIXI.Graphics();
      shade.beginFill(0x000000, 0.5);
      shade.drawCircle(0, 0, boardConfig.tileSize * 0.35);
      shade.endFill();
      container.addChild(shade);
    }

    if (unit.buffs && unit.buffs.length > 0) {
      let buffX = -10;
      for (const buff of unit.buffs) {
        const buffIcon = new PIXI.Text(getBuffEmoji(/** @type {string} */ (buff.type)), { fontSize: 10 });
        buffIcon.anchor.set(0.5);
        buffIcon.x = buffX;
        buffIcon.y = 18;
        container.addChild(buffIcon);
        buffX += 10;
      }
    }

    if (unit.statusEffects && unit.statusEffects.length > 0) {
      let statusX = 12;
      let statusY = -12;
      let count = 0;
      for (const status of unit.statusEffects) {
        const info = getStatusInfo(status.type);
        const statusIcon = new PIXI.Text(info.icon, { fontSize: 12 });
        statusIcon.anchor.set(0.5);
        statusIcon.x = statusX;
        statusIcon.y = statusY;
        container.addChild(statusIcon);
        count++;
        if (count % 2 === 0) {
          statusX = 12;
          statusY += 10;
        } else {
          statusX = -12;
        }
        if (count >= 6) break;
      }
    }

    if (unit.stunned && unit.stunned > 0 && !hasStatusEffect(unit, STATUS_EFFECT_TYPES.STUN)) {
      const stunIcon = new PIXI.Text('💫', { fontSize: 14 });
      stunIcon.anchor.set(0.5);
      stunIcon.x = 12;
      stunIcon.y = -12;
      container.addChild(stunIcon);
    }

    return container;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getUnitEmoji(type) {
    /** @type {Record<string, string>} */
    const emojis = {
      infantry: '⚔',
      cavalry: '🐴',
      archer: '🏹',
      mage: '🔮',
      tank: '🛡'
    };
    return emojis[type] || '?';
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getBuffEmoji(type) {
    /** @type {Record<string, string>} */
    const emojis = {
      attackBoost: '⚔',
      defenseBoost: '🛡',
      moveBoost: '👟',
      doubleAttack: '⚡'
    };
    return emojis[type] || '✨';
  }

  function updateHighlights() {
    if (!overlayLayer) return;
    for (const h of moveHighlights) h.destroy();
    for (const h of attackHighlights) h.destroy();
    for (const d of pathDots) d.destroy();
    moveHighlights = [];
    attackHighlights = [];
    pathDots = [];
    overlayLayer.removeChildren();

    if (!selectedUnitData || !state || state.gameOver) return;
    if (selectedUnitData.faction !== state.currentFaction) return;

    const selSprite = unitSprites.get(selectedUnitData.id);
    if (selSprite) {
      const highlight = new PIXI.Graphics();
      highlight.lineStyle(3, 0xffff00, 1);
      highlight.drawCircle(
        selectedUnitData.x * boardConfig.tileSize + boardConfig.tileSize / 2,
        selectedUnitData.y * boardConfig.tileSize + boardConfig.tileSize / 2,
        boardConfig.tileSize * 0.45
      );
      overlayLayer.addChild(highlight);
    }

    const layout = state.boardLayout || boardConfig.layout;
    const hasDoubleAttack = selectedUnitData.buffs?.some(
      /** @param {any} b */ b => b.type === 'doubleAttack'
    );
    const hasAttackedTwice = !!hasDoubleAttack && (selectedUnitData.attackCount || 0) >= 2;
    const ccLocked = isHardCC(selectedUnitData);

    if (!selectedUnitData.hasMoved && !ccLocked) {
      const moveRange = getMoveRange(selectedUnitData, state.units, layout);
      for (const tile of moveRange) {
        const h = new PIXI.Graphics();
        h.beginFill(0x00ff00, 0.3);
        h.drawRect(
          tile.x * boardConfig.tileSize,
          tile.y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        h.endFill();
        moveHighlights.push(h);
        overlayLayer.addChild(h);
      }
    }

    if (!selectedUnitData.hasAttacked && !ccLocked && !hasAttackedTwice) {
      const attackRange = getAttackRange(selectedUnitData, state.units);
      for (const tile of attackRange) {
        const h = new PIXI.Graphics();
        h.beginFill(0xff0000, 0.4);
        h.drawRect(
          tile.x * boardConfig.tileSize,
          tile.y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        h.endFill();
        attackHighlights.push(h);
        overlayLayer.addChild(h);
      }
    }
  }

  /**
   * @param {number} targetX
   * @param {number} targetY
   */
  function showPath(targetX, targetY) {
    if (!overlayLayer) return;
    for (const d of pathDots) d.destroy();
    pathDots = [];

    if (!selectedUnitData || !state) return;

    const layout = state.boardLayout || boardConfig.layout;
    const result = findPath(
      { x: selectedUnitData.x, y: selectedUnitData.y },
      { x: targetX, y: targetY },
      state.units,
      selectedUnitData,
      layout
    );

    if (!result) return;

    for (const pos of result.path) {
      const dot = new PIXI.Graphics();
      dot.beginFill(0xffffff, 0.8);
      dot.drawCircle(
        pos.x * boardConfig.tileSize + boardConfig.tileSize / 2,
        pos.y * boardConfig.tileSize + boardConfig.tileSize / 2,
        6
      );
      dot.endFill();
      pathDots.push(dot);
      overlayLayer.addChild(dot);
    }
  }

  /** @type {{x: number, y: number}} */
  let hoverTile = { x: -1, y: -1 };

  /**
   * @param {any} event
   */
  function onPointerMove(event) {
    const pos = event.data.global;
    const tx = Math.floor(pos.x / boardConfig.tileSize);
    const ty = Math.floor(pos.y / boardConfig.tileSize);

    if (tx === hoverTile.x && ty === hoverTile.y) return;
    hoverTile = { x: tx, y: ty };

    if (selectedUnitData && !selectedUnitData.hasMoved && state && !state.gameOver) {
      const layout = state.boardLayout || boardConfig.layout;
      const ccLocked = isHardCC(selectedUnitData);
      if (!ccLocked) {
        const moveRange = getMoveRange(selectedUnitData, state.units, layout);
        const inRange = moveRange.some(
          /** @param {any} t */
          t => t.x === tx && t.y === ty
        );
        if (inRange) {
          showPath(tx, ty);
        }
      }
    }
  }

  /**
   * @param {any} event
   */
  function onPointerDown(event) {
    if (!state || state.gameOver) return;

    const pos = event.data.global;
    const tx = Math.floor(pos.x / boardConfig.tileSize);
    const ty = Math.floor(pos.y / boardConfig.tileSize);

    if (tx < 0 || tx >= boardConfig.width || ty < 0 || ty >= boardConfig.height) return;

    const clickedUnit = getUnitAt(state.units, tx, ty);

    if (state.selectedCardId) {
      handleCardTarget(tx, ty, clickedUnit);
      return;
    }

    if (selectedUnitData && selectedUnitData.faction === state.currentFaction) {
      const hasDoubleAttack = selectedUnitData.buffs?.some(
        /** @param {any} b */
        b => b.type === 'doubleAttack'
      );
      const hasAttackedTwice = !!hasDoubleAttack && (selectedUnitData.attackCount || 0) >= 2;
      const ccLocked = isHardCC(selectedUnitData);

      if (clickedUnit && clickedUnit.faction !== state.currentFaction) {
        if (!selectedUnitData.hasAttacked && !ccLocked && !hasAttackedTwice) {
          const attackRange = getAttackRange(selectedUnitData, state.units);
          const canAttack = attackRange.some(
            /** @param {any} t */
            t => t.x === tx && t.y === ty
          );
          if (canAttack) {
            doAttack(selectedUnitData, clickedUnit);
            return;
          }
        }
      }

      if (!clickedUnit && !selectedUnitData.hasMoved && !ccLocked) {
        const layout = state.boardLayout || boardConfig.layout;
        const moveRange = getMoveRange(selectedUnitData, state.units, layout);
        const canMove = moveRange.some(
          /** @param {any} t */
          t => t.x === tx && t.y === ty
        );
        if (canMove) {
          doMove(selectedUnitData, tx, ty);
          return;
        }
      }
    }

    if (clickedUnit) {
      gameState.selectUnit(clickedUnit.id);
    } else {
      gameState.selectUnit(null);
    }
  }

  /**
   * @param {number} tx
   * @param {number} ty
   * @param {Unit | null} targetUnit
   */
  function handleCardTarget(tx, ty, targetUnit) {
    if (!state) return;
    const card = handCards.find(
      /** @param {EventCard} c */
      c => c.instanceId === state?.selectedCardId
    );
    if (!card) return;

    const affordability = canAffordCard(card, energy, cooldowns);
    if (!affordability.canUse) {
      gameState.setMessage(`${card.name} 无法使用：${affordability.reason}`);
      return;
    }

    if (card.effect.type === 'terrainChange') {
      const layout = state.boardLayout || boardConfig.layout;
      const terrain = getTerrain(tx, ty, layout);
      if (terrain && terrain.isBase) {
        gameState.setMessage('不能改变基地地形！');
        return;
      }
    }

    const usable = canUseCard(card, selectedUnitData, targetUnit, state.currentFaction);
    if (!usable) {
      const hint = getCardUsageHint(card);
      gameState.setMessage(`无法在此目标使用该卡牌！${hint}`);
      return;
    }

    const effects = applyCardEffect(card, state, selectedUnitData, targetUnit, { x: tx, y: ty });

    if (effects.length === 0) {
      gameState.setMessage('卡牌效果未产生作用，请检查目标是否正确');
      return;
    }

    for (const effect of effects) {
      switch (effect.type) {
        case 'heal':
          if (effect.unitId && effect.value !== undefined) {
            gameState.healUnit(effect.unitId, effect.value);
          }
          break;
        case 'addBuff':
          if (effect.unitId && effect.buff !== undefined) {
            gameState.addBuff(effect.unitId, effect.buff);
          }
          break;
        case 'damage':
          if (effect.unitId && effect.value !== undefined) {
            gameState.damageUnit(effect.unitId, effect.value);
          }
          break;
        case 'stun':
          if (effect.unitId && effect.duration !== undefined) {
            gameState.stunUnit(effect.unitId, effect.duration);
          }
          break;
        case 'applyStatus':
          if (effect.unitId && effect.statusEffect !== undefined) {
            gameState.applyStatusEffect(effect.unitId, effect.statusEffect);
          }
          break;
        case 'cleanse':
          if (effect.unitId) {
            gameState.cleanseUnit(effect.unitId);
          }
          break;
        case 'summon':
          if (effect.unitType && effect.faction) {
            doSummon(effect.unitType, effect.faction);
          }
          break;
        case 'terrainChange':
          if (effect.x !== undefined && effect.y !== undefined && effect.terrain) {
            gameState.changeTerrain(effect.x, effect.y, effect.terrain);
          }
          break;
        case 'reveal':
          if (effect.duration !== undefined) {
            gameState.setReveal(effect.duration);
          }
          break;
      }
    }

    gameState.useCard(
      /** @type {'red' | 'blue'} */ (state.currentFaction),
      /** @type {string} */ (card.instanceId),
      card.cost,
      card.id
    );
    gameState.setMessage(`使用了 ${card.name}！（消耗 ${card.cost} 能量）`);
    checkWin();
  }

  /**
   * @param {EventCard} card
   * @returns {string}
   */
  function getCardUsageHint(card) {
    const isStatusDebuff = Object.values(STATUS_EFFECT_TYPES).includes(card.effect.type);
    if (isStatusDebuff) {
      return '请点击敌方单位使用';
    }
    switch (card.effect.type) {
      case 'heal':
      case 'attackBoost':
      case 'defenseBoost':
      case 'moveBoost':
      case 'doubleAttack':
      case 'counterAttack':
      case 'shield':
      case 'cleanse':
      case 'statusResistBoost':
        return '请先选中己方单位，或直接点击己方单位使用';
      case 'damage':
      case 'stun':
        return '请点击敌方单位使用';
      case 'terrainChange':
        return '请点击非基地格子使用';
      case 'summon':
        return '点击任意位置确认召唤';
      case 'reveal':
        return '点击任意位置触发侦查';
      default:
        return '请选择合适的目标';
    }
  }

  /**
   * @param {string} unitType
   * @param {string} faction
   */
  function doSummon(unitType, faction) {
    if (!state) return;
    let bx = -1, by = -1;
    const layout = state.boardLayout || boardConfig.layout;
    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const t = getTerrain(x, y, layout);
        if (t && t.isBase && t.faction === faction) {
          const u = getUnitAt(state.units, x, y);
          if (!u) { bx = x; by = y; break; }
        }
      }
      if (bx >= 0) break;
    }

    if (bx < 0) {
      gameState.setMessage('基地被占用，无法召唤单位');
      return;
    }

    const cfg = unitConfig[/** @type {UnitType} */ (unitType)];
    /** @type {Unit} */
    const newUnit = {
      id: `unit_${Date.now()}_${Math.random()}`,
      type: unitType,
      faction,
      x: bx, y: by,
      currentHp: cfg.hp,
      maxHp: cfg.hp,
      hasMoved: true,
      hasAttacked: true,
      attackCount: 0,
      buffs: [],
      stunned: 0,
      morale: gameRules.morale.initial,
      winStreak: 0,
      statusEffects: []
    };
    gameState.addUnit(newUnit);
  }

  /**
   * @param {Unit} unit
   * @param {number} tx
   * @param {number} ty
   */
  function doMove(unit, tx, ty) {
    if (!state) return;
    const layout = state.boardLayout || boardConfig.layout;
    const terrain = getTerrain(tx, ty, layout);
    const unitName = unitConfig[/** @type {UnitType} */ (unit.type)].name;

    const pathResult = findPath(
      { x: unit.x, y: unit.y },
      { x: tx, y: ty },
      state.units,
      unit,
      layout
    );
    const pathTiles = pathResult ? pathResult.path : [];
    gameState.moveUnit(unit.id, tx, ty, pathTiles);

    let terrainBonusMsg = '';
    if (terrain) {
      const terrainMoraleBonus = (terrain.isBase && terrain.faction === unit.faction)
        ? terrain.moraleBonus
        : (terrain.isBase ? 0 : terrain.moraleBonus);
      if (terrainMoraleBonus) {
        gameState.applyTerrainMorale(unit.id, terrainMoraleBonus, terrain.name);
        terrainBonusMsg = `（${terrain.name}+${terrainMoraleBonus}士气）`;
      } else if (terrain.isBase && terrain.faction !== unit.faction) {
        terrainBonusMsg = '';
      }
    }
    gameState.setMessage(`${unitName} 移动完成${terrainBonusMsg}`);
    setTimeout(checkWin, 100);
  }

  /**
   * @param {Unit} attacker
   * @param {Unit} defender
   */
  function doAttack(attacker, defender) {
    if (!state) return;
    const layout = state.boardLayout || boardConfig.layout;
    const defTerrain = getTerrain(defender.x, defender.y, layout);
    const damage = calculateDamage(attacker, defender, defTerrain || undefined);

    const attackerName = unitConfig[/** @type {UnitType} */ (attacker.type)].name;
    const defenderName = unitConfig[/** @type {UnitType} */ (defender.type)].name;
    const attackerTier = getMoraleTier(attacker.morale ?? 80);
    const moraleTag = attackerTier.damageMultiplier !== 1.0
      ? `[士气${attackerTier.label}×${attackerTier.damageMultiplier}]`
      : '';

    const killOccurred = defender.currentHp - damage <= 0;
    const newStreak = killOccurred ? (attacker.winStreak || 0) + 1 : 0;

    gameState.attack(attacker.id, defender.id, damage);
    
    const hasDoubleAttack = attacker.buffs?.some(
      /** @param {any} b */
      b => b.type === 'doubleAttack'
    );
    const attackCount = attacker.attackCount || 0;
    const willAttackAgain = !!hasDoubleAttack && attackCount < 1;

    /** @type {string[]} */
    const moraleMsgs = [];
    if (killOccurred) {
      const attackerFaction = attacker.faction === 'red' ? '红方' : '蓝方';
      let atkDelta = gameRules.morale.onKill;
      let streakText = '';
      if (newStreak >= gameRules.morale.winStreakThreshold) {
        atkDelta += gameRules.morale.winStreakBonus;
        streakText = `，${newStreak}连杀`;
      }
      moraleMsgs.push(`${attackerFaction}${attackerName}+${atkDelta}士气(击杀${streakText})`);

      const defFaction = defender.faction === 'red' ? '红方' : '蓝方';
      const allyCount = state.units.filter(u => u.faction === defender.faction && u.id !== defender.id).length;
      if (allyCount > 0) {
        moraleMsgs.push(`${defFaction}全体-${gameRules.morale.onAllyDeath}士气(友军${defenderName}阵亡)`);
      }
    } else if (attackerTier.damageMultiplier < 1.0) {
      moraleMsgs.push(`攻击方士气${attackerTier.label}，伤害降低至×${attackerTier.damageMultiplier}`);
    } else if (attackerTier.damageMultiplier > 1.0) {
      moraleMsgs.push(`攻击方士气${attackerTier.label}，伤害提升至×${attackerTier.damageMultiplier}`);
    }

    const moraleMsg = moraleMsgs.length > 0 ? `\n士气：${moraleMsgs.join('；')}` : '';

    const killMsg = killOccurred ? '【击杀！】' : '';
    const streakMsg = killOccurred && newStreak >= gameRules.morale.winStreakThreshold
      ? `【${newStreak}连杀！】`
      : '';
    
    if (willAttackAgain) {
      gameState.setMessage(
        `${moraleTag}${attackerName} 对 ${defenderName} 造成 ${damage} 伤害${killMsg}${streakMsg}！（连续攻击可再攻击一次）${moraleMsg}`
      );
    } else {
      gameState.setMessage(
        `${moraleTag}${attackerName} 对 ${defenderName} 造成 ${damage} 伤害${killMsg}${streakMsg}！${moraleMsg}`
      );
    }

    setTimeout(checkWin, 300);
  }

  function checkWin() {
    if (!state) return;
    const layout = state.boardLayout || boardConfig.layout;
    const victory = checkVictory(state.units, state.currentFaction, layout, state.bases);
    if (victory) {
      gameState.setVictory(victory.winner, victory.condition);
      gameState.setMessage(
        `${victory.winner === 'red' ? '红方' : '蓝方'}胜利！${victory.condition}`
      );
    }
  }

  function handleResize() {
    if (!app || !canvasContainer) return;
    
    const maxW = canvasContainer.clientWidth;
    const maxH = canvasContainer.clientHeight;
    const boardW = boardConfig.width * boardConfig.tileSize;
    const boardH = boardConfig.height * boardConfig.tileSize;
    
    const scale = Math.min(maxW / boardW, maxH / boardH, 1.5);
    
    app.stage.scale.set(scale);
    app.stage.x = (maxW - boardW * scale) / 2;
    app.stage.y = (maxH - boardH * scale) / 2;
    
    app.renderer.resize(maxW, maxH);
  }
</script>

<div class="board-wrapper" bind:this={canvasContainer}></div>

<style>
  .board-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
</style>

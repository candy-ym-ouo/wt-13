<script>
  import { onMount, onDestroy, afterUpdate } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { boardConfig } from '$lib/config/boardConfig';
  import { unitConfig } from '$lib/config/unitConfig';
  import { gameState, selectedUnit, currentHand } from '$lib/stores/gameStore';
  import {
    getTerrain,
    getMoveRange,
    getAttackRange,
    findPath,
    calculateDamage,
    getUnitAt,
    checkVictory
  } from '$lib/utils/gameLogic';
  import { canUseCard, applyCardEffect } from '$lib/utils/cardSystem';

  let canvasContainer;
  let app;
  let boardLayer;
  let unitsLayer;
  let overlayLayer;

  let state = null;
  let selectedUnitData = null;
  let handCards = [];

  let unitSprites = new Map();
  let moveHighlights = [];
  let attackHighlights = [];
  let pathDots = [];

  let unsubscribeState;
  let unsubscribeSelected;
  let unsubscribeHand;

  onMount(() => {
    initPixi();
    
    unsubscribeState = gameState.subscribe(s => {
      state = s;
      renderUnits();
      updateHighlights();
    });
    
    unsubscribeSelected = selectedUnit.subscribe(u => {
      selectedUnitData = u;
      updateHighlights();
    });
    
    unsubscribeHand = currentHand.subscribe(h => {
      handCards = h;
    });

    window.addEventListener('resize', handleResize);
    handleResize();
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (unsubscribeSelected) unsubscribeSelected();
    if (unsubscribeHand) unsubscribeHand();
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

    canvasContainer.appendChild(app.view);

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

  function drawBoard() {
    boardLayer.removeChildren();

    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const terrain = getTerrain(x, y);
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

  function renderUnits() {
    if (!state) return;

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

  function createUnitSprite(unit) {
    const config = unitConfig[unit.type];
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

    if (unit.hasMoved && unit.hasAttacked) {
      const shade = new PIXI.Graphics();
      shade.beginFill(0x000000, 0.5);
      shade.drawCircle(0, 0, boardConfig.tileSize * 0.35);
      shade.endFill();
      container.addChild(shade);
    }

    return container;
  }

  function getUnitEmoji(type) {
    const emojis = {
      infantry: '⚔',
      cavalry: '🐴',
      archer: '🏹',
      mage: '🔮',
      tank: '🛡'
    };
    return emojis[type] || '?';
  }

  function updateHighlights() {
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

    if (!selectedUnitData.hasMoved && !selectedUnitData.stunned) {
      const moveRange = getMoveRange(selectedUnitData, state.units);
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

    if (!selectedUnitData.hasAttacked && !selectedUnitData.stunned) {
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

  function showPath(targetX, targetY) {
    for (const d of pathDots) d.destroy();
    pathDots = [];

    if (!selectedUnitData || !state) return;

    const result = findPath(
      { x: selectedUnitData.x, y: selectedUnitData.y },
      { x: targetX, y: targetY },
      state.units,
      selectedUnitData
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

  let hoverTile = { x: -1, y: -1 };

  function onPointerMove(event) {
    const pos = event.data.global;
    const tx = Math.floor(pos.x / boardConfig.tileSize);
    const ty = Math.floor(pos.y / boardConfig.tileSize);

    if (tx === hoverTile.x && ty === hoverTile.y) return;
    hoverTile = { x: tx, y: ty };

    if (selectedUnitData && !selectedUnitData.hasMoved && state && !state.gameOver) {
      const moveRange = getMoveRange(selectedUnitData, state.units);
      const inRange = moveRange.some(t => t.x === tx && t.y === ty);
      if (inRange) {
        showPath(tx, ty);
      }
    }
  }

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
      if (clickedUnit && clickedUnit.faction !== state.currentFaction) {
        const attackRange = getAttackRange(selectedUnitData, state.units);
        const canAttack = attackRange.some(t => t.x === tx && t.y === ty);
        if (canAttack) {
          doAttack(selectedUnitData, clickedUnit);
          return;
        }
      }

      if (!clickedUnit && !selectedUnitData.hasMoved) {
        const moveRange = getMoveRange(selectedUnitData, state.units);
        const canMove = moveRange.some(t => t.x === tx && t.y === ty);
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

  function handleCardTarget(tx, ty, targetUnit) {
    const card = handCards.find(c => c.instanceId === state.selectedCardId);
    if (!card) return;

    const usable = canUseCard(card, selectedUnitData, targetUnit, state.currentFaction);
    if (!usable) {
      gameState.setMessage('无法在此目标使用该卡牌');
      return;
    }

    const effects = applyCardEffect(card, state, targetUnit, { x: tx, y: ty });

    for (const effect of effects) {
      switch (effect.type) {
        case 'heal':
          gameState.healUnit(effect.unitId, effect.value);
          break;
        case 'addBuff':
          gameState.addBuff(effect.unitId, effect.buff);
          break;
        case 'damage':
          gameState.damageUnit(effect.unitId, effect.value);
          break;
        case 'stun':
          gameState.stunUnit(effect.unitId, effect.duration);
          break;
        case 'summon':
          doSummon(effect.unitType, effect.faction);
          break;
      }
    }

    gameState.useCard(state.currentFaction, card.instanceId);
    gameState.setMessage(`使用了 ${card.name}！`);
    checkWin();
  }

  function doSummon(unitType, faction) {
    let bx = -1, by = -1;
    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        const t = getTerrain(x, y);
        if (t.isBase && t.faction === faction) {
          const u = getUnitAt(state.units, x, y);
          if (!u) { bx = x; by = y; break; }
        }
      }
      if (bx >= 0) break;
    }

    if (bx < 0) {
      gameState.setMessage('基地被占用，无法召唤');
      return;
    }

    const cfg = unitConfig[unitType];
    const newUnit = {
      id: `unit_${Date.now()}_${Math.random()}`,
      type: unitType,
      faction,
      x: bx, y: by,
      currentHp: cfg.hp,
      maxHp: cfg.hp,
      hasMoved: true,
      hasAttacked: true,
      buffs: [],
      stunned: 0
    };
    gameState.addUnit(newUnit);
  }

  function doMove(unit, tx, ty) {
    gameState.moveUnit(unit.id, tx, ty, []);
    gameState.setMessage(`${unitConfig[unit.type].name} 移动完成`);
    setTimeout(checkWin, 100);
  }

  function doAttack(attacker, defender) {
    const defTerrain = getTerrain(defender.x, defender.y);
    const damage = calculateDamage(attacker, defender, defTerrain);

    gameState.attack(attacker.id, defender.id, damage);
    gameState.setMessage(
      `${unitConfig[attacker.type].name} 对 ${unitConfig[defender.type].name} 造成 ${damage} 伤害！`
    );

    setTimeout(checkWin, 300);
  }

  function checkWin() {
    if (!state) return;
    const victory = checkVictory(state.units, state.currentFaction);
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

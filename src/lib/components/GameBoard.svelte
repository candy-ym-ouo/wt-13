<script>
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { boardConfig, tileEffectConfig } from '$lib/config/boardConfig';
  import { unitConfig } from '$lib/config/unitConfig';
  import { gameRules } from '$lib/config/gameRules';
  import { gameState, selectedUnit, currentHand, currentEnergy, currentCooldowns, previewTargetId } from '$lib/stores/gameStore';
  import {
    getTerrain,
    getMoveRange,
    getAttackRange,
    getAttackRangeTiles,
    findPath,
    calculateDamage,
    getUnitAt,
    checkVictory,
    getMoraleTier,
    getBaseAt,
    isHardCC,
    hasStatusEffect,
    getStatusEffect,
    getEffectiveMoveRange,
    getCounterInfo,
    getTileEffectAt,
    calculateCombatPreview,
    checkSummonFeasibility,
    findSummonPosition,
    validateSummonTile
  } from '$lib/utils/gameLogic';
  import { canUseCard, applyCardEffect, canAffordCard, canUseSummonCard } from '$lib/utils/cardSystem';
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
  /** @type {any} */
  let fogLayer;
  /** @type {any} */
  let scoutPreviewLayer;
  /** @type {any} */
  let dangerZoneLayer;

  /** @type {number | null} */
  let animationFrameId = null;

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

  /**
   * @param {string} type
   * @returns {string}
   */
  function getUnitIcon(type) {
    /** @type {Record<string, string>} */
    const icons = {
      infantry: '⚔️',
      cavalry: '🐴',
      archer: '🏹',
      mage: '🔮',
      tank: '🛡️'
    };
    return icons[type] || '❓';
  }

  /** @type {any[]} */
  let moveHighlights = [];
  /** @type {any[]} */
  let attackHighlights = [];
  /** @type {any[]} */
  let pathDots = [];
  /** @type {any[]} */
  let dangerHighlights = [];
  /** @type {Map<string, number>} */
  let threatMap = new Map();

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

    animationLoop();
  });

  onDestroy(() => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
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

    fogLayer = new PIXI.Container();
    app.stage.addChild(fogLayer);

    scoutPreviewLayer = new PIXI.Container();
    app.stage.addChild(scoutPreviewLayer);

    dangerZoneLayer = new PIXI.Container();
    app.stage.addChild(dangerZoneLayer);

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

    if (state && state.tileEffects) {
      for (const [key, effect] of Object.entries(state.tileEffects)) {
        const config = tileEffectConfig[effect.type];
        if (!config) continue;
        const [ex, ey] = key.split(',').map(Number);
        if (ex < 0 || ex >= boardConfig.width || ey < 0 || ey >= boardConfig.height) continue;

        const overlay = new PIXI.Graphics();
        overlay.beginFill(config.color, config.overlayAlpha);
        overlay.drawRect(
          ex * boardConfig.tileSize,
          ey * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        overlay.endFill();

        const pulseAlpha = 0.15 * Math.sin(Date.now() / 500 + ex + ey);
        overlay.beginFill(config.color, Math.max(0, pulseAlpha));
        overlay.drawRect(
          ex * boardConfig.tileSize,
          ey * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        overlay.endFill();

        overlay.lineStyle(2, config.color, 0.7);
        overlay.drawRect(
          ex * boardConfig.tileSize + 1,
          ey * boardConfig.tileSize + 1,
          boardConfig.tileSize - 2,
          boardConfig.tileSize - 2
        );

        boardLayer.addChild(overlay);

        const iconText = new PIXI.Text(config.icon, { fontSize: 14 });
        iconText.anchor.set(0.5);
        iconText.x = ex * boardConfig.tileSize + boardConfig.tileSize / 2;
        iconText.y = ey * boardConfig.tileSize + 12;
        boardLayer.addChild(iconText);

        const durText = new PIXI.Text(`${effect.duration}`, {
          fontSize: 10,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 2,
          fontWeight: 'bold'
        });
        durText.anchor.set(0.5);
        durText.x = ex * boardConfig.tileSize + boardConfig.tileSize / 2;
        durText.y = ey * boardConfig.tileSize + boardConfig.tileSize - 8;
        boardLayer.addChild(durText);
      }
    }
  }

  function drawFogOfWar() {
    if (!fogLayer || !state || !state.fogOfWarEnabled) return;
    fogLayer.removeChildren();

    /** @type {'red' | 'blue'} */
    const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
    const revealedAreas = state.revealedAreas[currentFaction];
    const friendlyUnits = state.units.filter(/** @param {import('../stores/gameStore').Unit} u */ u => u.faction === currentFaction);
    const enemyMarkers = state.enemyMarkers[currentFaction];

    for (let y = 0; y < boardConfig.height; y++) {
      for (let x = 0; x < boardConfig.width; x++) {
        let isRevealed = false;
        let revealIntensity = 0;

        for (const unit of friendlyUnits) {
          const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
          const sightRange = 2;
          if (distance <= sightRange) {
            isRevealed = true;
            revealIntensity = Math.max(revealIntensity, 1 - distance / (sightRange + 1));
          }
        }

        for (const area of revealedAreas) {
          const distance = Math.abs(area.x - x) + Math.abs(area.y - y);
          if (distance <= area.radius) {
            isRevealed = true;
            const areaIntensity = area.remainingTurns / area.maxTurns;
            revealIntensity = Math.max(revealIntensity, areaIntensity * 0.8);
          }
        }

        const hasMarker = enemyMarkers.some(/** @param {import('../stores/gameStore').EnemyMarker} m */ m => m.x === x && m.y === y);
        if (hasMarker) {
          revealIntensity = Math.max(revealIntensity, 0.6);
          isRevealed = true;
        }

        if (!isRevealed) {
          const fogTile = new PIXI.Graphics();
          fogTile.beginFill(0x0a0a1a, 0.85);
          fogTile.drawRect(
            x * boardConfig.tileSize,
            y * boardConfig.tileSize,
            boardConfig.tileSize,
            boardConfig.tileSize
          );
          fogTile.endFill();
          fogLayer.addChild(fogTile);
        } else if (revealIntensity < 1) {
          const fogTile = new PIXI.Graphics();
          const alpha = 0.85 * (1 - revealIntensity);
          if (alpha > 0.1) {
            fogTile.beginFill(0x1a1a2e, alpha);
            fogTile.drawRect(
              x * boardConfig.tileSize,
              y * boardConfig.tileSize,
              boardConfig.tileSize,
              boardConfig.tileSize
            );
            fogTile.endFill();
            fogLayer.addChild(fogTile);
          }
        }
      }
    }
  }

  function drawRevealedAreas() {
    if (!boardLayer || !state) return;

    /** @type {'red' | 'blue'} */
    const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
    const revealedAreas = state.revealedAreas[currentFaction];

    for (const area of revealedAreas) {
      const intensity = area.remainingTurns / area.maxTurns;
      const color = area.faction === 'red' ? 0xff6b6b : 0x4ecdc4;

      for (let dy = -area.radius; dy <= area.radius; dy++) {
        for (let dx = -area.radius; dx <= area.radius; dx++) {
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance > area.radius) continue;

          const x = area.x + dx;
          const y = area.y + dy;
          if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;

          const overlay = new PIXI.Graphics();
          const alpha = 0.15 * intensity * (1 - distance / (area.radius + 1));
          overlay.beginFill(color, alpha);
          overlay.drawRect(
            x * boardConfig.tileSize,
            y * boardConfig.tileSize,
            boardConfig.tileSize,
            boardConfig.tileSize
          );
          overlay.endFill();
          boardLayer.addChild(overlay);
        }
      }

      const centerX = area.x * boardConfig.tileSize + boardConfig.tileSize / 2;
      const centerY = area.y * boardConfig.tileSize + boardConfig.tileSize / 2;

      const border = new PIXI.Graphics();
      border.lineStyle(2, color, 0.5 * intensity);
      border.drawCircle(centerX, centerY, area.radius * boardConfig.tileSize * 0.9);
      boardLayer.addChild(border);

      const durationText = new PIXI.Text(`${area.remainingTurns}`, {
        fontSize: 12,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 2,
        fontWeight: 'bold'
      });
      durationText.anchor.set(0.5);
      durationText.x = centerX;
      durationText.y = centerY;
      boardLayer.addChild(durationText);

      const iconText = new PIXI.Text('👁️', { fontSize: 16 });
      iconText.anchor.set(0.5);
      iconText.x = centerX;
      iconText.y = centerY - 18;
      boardLayer.addChild(iconText);
    }
  }

  function drawEnemyMarkers() {
    if (!unitsLayer || !state) return;

    /** @type {'red' | 'blue'} */
    const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
    const markers = state.enemyMarkers[currentFaction];
    const revealTurns = state.revealTurns || 0;

    for (const marker of markers) {
      const unit = state.units.find(/** @param {import('../stores/gameStore').Unit} u */ u => u.id === marker.unitId);
      if (!unit) continue;

      const hasDetailedInfo = marker.detailedInfo || revealTurns > 0;
      const x = marker.x * boardConfig.tileSize + boardConfig.tileSize / 2;
      const y = marker.y * boardConfig.tileSize + boardConfig.tileSize / 2;

      const markerBg = new PIXI.Graphics();
      markerBg.beginFill(0xff4444, 0.3);
      markerBg.lineStyle(2, 0xff0000, 0.8);
      markerBg.drawCircle(x, y, boardConfig.tileSize * 0.4);
      markerBg.endFill();
      unitsLayer.addChild(markerBg);

      const pulseAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 300);
      const pulse = new PIXI.Graphics();
      pulse.beginFill(0xff0000, pulseAlpha);
      pulse.drawCircle(x, y, boardConfig.tileSize * 0.45);
      pulse.endFill();
      unitsLayer.addChild(pulse);

      const iconText = new PIXI.Text(getUnitIcon(unit.type), { fontSize: 20 });
      iconText.anchor.set(0.5);
      iconText.x = x;
      iconText.y = y - 5;
      unitsLayer.addChild(iconText);

      if (hasDetailedInfo) {
        const hpPercent = unit.currentHp / unit.maxHp;
        const hpBarBg = new PIXI.Graphics();
        hpBarBg.beginFill(0x333333, 0.9);
        hpBarBg.drawRect(x - 20, y + 15, 40, 5);
        hpBarBg.endFill();
        unitsLayer.addChild(hpBarBg);

        const hpColor = hpPercent > 0.6 ? 0x2ecc71 : hpPercent > 0.3 ? 0xf1c40f : 0xe74c3c;
        const hpBar = new PIXI.Graphics();
        hpBar.beginFill(hpColor);
        hpBar.drawRect(x - 20, y + 15, 40 * hpPercent, 5);
        hpBar.endFill();
        unitsLayer.addChild(hpBar);

        const hpText = new PIXI.Text(`${unit.currentHp}/${unit.maxHp}`, {
          fontSize: 8,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 1
        });
        hpText.anchor.set(0.5);
        hpText.x = x;
        hpText.y = y + 25;
        unitsLayer.addChild(hpText);
      }

      const durationBadge = new PIXI.Graphics();
      durationBadge.beginFill(0x3498db, 0.9);
      durationBadge.drawCircle(x + 18, y - 18, 10);
      durationBadge.endFill();
      unitsLayer.addChild(durationBadge);

      const durationText = new PIXI.Text(`${marker.remainingTurns}`, {
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: 'bold'
      });
      durationText.anchor.set(0.5);
      durationText.x = x + 18;
      durationText.y = y - 18;
      unitsLayer.addChild(durationText);

      const alertIcon = new PIXI.Text('⚠️', { fontSize: 12 });
      alertIcon.anchor.set(0.5);
      alertIcon.x = x - 18;
      alertIcon.y = y - 18;
      unitsLayer.addChild(alertIcon);
    }
  }

  function drawScoutPreview() {
    if (!scoutPreviewLayer || !state || !state.selectedCardId) return;
    scoutPreviewLayer.removeChildren();

    const currentState = state;
    const card = handCards.find(
      /** @param {import('../utils/cardSystem').EventCard} c */
      c => c.instanceId === currentState.selectedCardId
    );
    if (!card || card.effect.type !== 'reveal') return;

    const radius = card.effect.radius || 3;
    const tx = hoverTile.x;
    const ty = hoverTile.y;

    if (tx < 0 || tx >= boardConfig.width || ty < 0 || ty >= boardConfig.height) return;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > radius) continue;

        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || x >= boardConfig.width || y < 0 || y >= boardConfig.height) continue;

        const preview = new PIXI.Graphics();
        const alpha = 0.25 * (1 - distance / (radius + 1));
        preview.beginFill(0x00ff88, alpha);
        preview.drawRect(
          x * boardConfig.tileSize,
          y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        preview.endFill();
        scoutPreviewLayer.addChild(preview);
      }
    }

    const centerX = tx * boardConfig.tileSize + boardConfig.tileSize / 2;
    const centerY = ty * boardConfig.tileSize + boardConfig.tileSize / 2;

    const border = new PIXI.Graphics();
    border.lineStyle(3, 0x00ff88, 0.7);
    border.drawCircle(centerX, centerY, radius * boardConfig.tileSize * 0.9);
    scoutPreviewLayer.addChild(border);

    const iconText = new PIXI.Text('👁️', { fontSize: 24 });
    iconText.anchor.set(0.5);
    iconText.x = centerX;
    iconText.y = centerY;
    scoutPreviewLayer.addChild(iconText);

    const infoText = new PIXI.Text(`侦查范围: 半径${radius}格`, {
      fontSize: 12,
      fill: 0x00ff88,
      stroke: 0x000000,
      strokeThickness: 2
    });
    infoText.anchor.set(0.5);
    infoText.x = centerX;
    infoText.y = centerY - radius * boardConfig.tileSize * 0.9 - 15;
    scoutPreviewLayer.addChild(infoText);
  }

  function drawDangerZones() {
    if (!dangerZoneLayer || !state) return;
    dangerZoneLayer.removeChildren();
    for (const d of dangerHighlights) d.destroy();
    dangerHighlights = [];
    threatMap.clear();

    if (!selectedUnitData || selectedUnitData.faction !== state.currentFaction) return;

    const currentFaction = /** @type {'red' | 'blue'} */ (state.currentFaction);
    const enemyUnits = state.units.filter(
      /** @param {import('../utils/cardSystem').Unit} u */
      u => u.faction !== currentFaction
    );

    for (const enemy of enemyUnits) {
      if (isHardCC(enemy)) continue;
      const tiles = getAttackRangeTiles(enemy);
      for (const tile of tiles) {
        const key = `${tile.x},${tile.y}`;
        threatMap.set(key, (threatMap.get(key) || 0) + 1);
      }
    }

    for (const [key, count] of threatMap.entries()) {
      const [x, y] = key.split(',').map(Number);
      const alpha = Math.min(0.25, 0.08 + count * 0.05);
      const overlay = new PIXI.Graphics();
      overlay.beginFill(0xff0000, alpha);
      overlay.drawRect(
        x * boardConfig.tileSize,
        y * boardConfig.tileSize,
        boardConfig.tileSize,
        boardConfig.tileSize
      );
      overlay.endFill();
      overlay.lineStyle(1, 0xff0000, 0.2);
      overlay.drawRect(
        x * boardConfig.tileSize + 1,
        y * boardConfig.tileSize + 1,
        boardConfig.tileSize - 2,
        boardConfig.tileSize - 2
      );
      dangerZoneLayer.addChild(overlay);
      dangerHighlights.push(overlay);

      if (count >= 3) {
        const warnIcon = new PIXI.Text('⚠', {
          fontSize: 10,
          fill: 0xff4444,
          stroke: 0x000000,
          strokeThickness: 1
        });
        warnIcon.anchor.set(0.5);
        warnIcon.x = x * boardConfig.tileSize + boardConfig.tileSize - 9;
        warnIcon.y = y * boardConfig.tileSize + 9;
        dangerZoneLayer.addChild(warnIcon);
        dangerHighlights.push(warnIcon);
      }
    }

    const layout = state.boardLayout || boardConfig.layout;
    for (let by = 0; by < boardConfig.height; by++) {
      for (let bx = 0; bx < boardConfig.width; bx++) {
        const terrain = getTerrain(bx, by, layout);
        if (!terrain) continue;

        if (terrain.isBase) {
          const baseColor = terrain.faction === currentFaction ? 0x2ecc71 : 0xe74c3c;
          const baseBorder = new PIXI.Graphics();
          baseBorder.lineStyle(2, baseColor, 0.6);
          baseBorder.drawRect(
            bx * boardConfig.tileSize + 2,
            by * boardConfig.tileSize + 2,
            boardConfig.tileSize - 4,
            boardConfig.tileSize - 4
          );
          dangerZoneLayer.addChild(baseBorder);
          dangerHighlights.push(baseBorder);

          const baseMark = new PIXI.Text(terrain.faction === currentFaction ? '🏠' : '⚔', {
            fontSize: 9
          });
          baseMark.anchor.set(0.5);
          baseMark.x = bx * boardConfig.tileSize + 9;
          baseMark.y = by * boardConfig.tileSize + boardConfig.tileSize - 9;
          dangerZoneLayer.addChild(baseMark);
          dangerHighlights.push(baseMark);
        } else if (terrain.defenseBonus >= 3) {
          const defBorder = new PIXI.Graphics();
          defBorder.lineStyle(1.5, 0xf1c40f, 0.5);
          defBorder.drawRect(
            bx * boardConfig.tileSize + 2,
            by * boardConfig.tileSize + 2,
            boardConfig.tileSize - 4,
            boardConfig.tileSize - 4
          );
          dangerZoneLayer.addChild(defBorder);
          dangerHighlights.push(defBorder);

          const shieldIcon = new PIXI.Text('🛡', { fontSize: 9 });
          shieldIcon.anchor.set(0.5);
          shieldIcon.x = bx * boardConfig.tileSize + boardConfig.tileSize - 9;
          shieldIcon.y = by * boardConfig.tileSize + 9;
          dangerZoneLayer.addChild(shieldIcon);
          dangerHighlights.push(shieldIcon);
        } else if (terrain.defenseBonus >= 2) {
          const defBorder = new PIXI.Graphics();
          defBorder.lineStyle(1, 0xf1c40f, 0.3);
          defBorder.drawRect(
            bx * boardConfig.tileSize + 3,
            by * boardConfig.tileSize + 3,
            boardConfig.tileSize - 6,
            boardConfig.tileSize - 6
          );
          dangerZoneLayer.addChild(defBorder);
          dangerHighlights.push(defBorder);
        }

        if (terrain.moraleBonus > 0 && !terrain.isBase) {
          const moraleMark = new PIXI.Text('↑', {
            fontSize: 8,
            fill: 0x2ecc71,
            stroke: 0x000000,
            strokeThickness: 1
          });
          moraleMark.anchor.set(0.5);
          moraleMark.x = bx * boardConfig.tileSize + 9;
          moraleMark.y = by * boardConfig.tileSize + boardConfig.tileSize - 9;
          dangerZoneLayer.addChild(moraleMark);
          dangerHighlights.push(moraleMark);
        }
      }
    }
  }

  function renderBoard() {
    drawBoard();
    drawBaseStatus();
    drawFogOfWar();
    drawRevealedAreas();
    drawEnemyMarkers();
    drawScoutPreview();
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

    const level = unit.level || 1;
    if (level > 1) {
      const levelBadge = new PIXI.Graphics();
      levelBadge.beginFill(0xe67e22);
      levelBadge.drawCircle(-18, -22, 8);
      levelBadge.endFill();
      container.addChild(levelBadge);
      const levelText = new PIXI.Text(`${level}`, {
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: 'bold'
      });
      levelText.anchor.set(0.5);
      levelText.x = -18;
      levelText.y = -22;
      container.addChild(levelText);
    }

    if (unit.specialization) {
      const specRing = new PIXI.Graphics();
      specRing.lineStyle(2, 0x9b59b6, 0.8);
      specRing.drawCircle(0, 0, boardConfig.tileSize * 0.38);
      container.addChild(specRing);
    }

    if ((unit.statPoints || 0) > 0) {
      const pointDot = new PIXI.Graphics();
      pointDot.beginFill(0xf1c40f);
      pointDot.drawCircle(18, -22, 5);
      pointDot.endFill();
      container.addChild(pointDot);
      const pointText = new PIXI.Text('!', {
        fontSize: 8,
        fill: 0x000000,
        fontWeight: 'bold'
      });
      pointText.anchor.set(0.5);
      pointText.x = 18;
      pointText.y = -22;
      container.addChild(pointText);
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

    drawDangerZones();

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
      const moveRange = getMoveRange(selectedUnitData, state.units, layout, state.tileEffects);
      for (const tile of moveRange) {
        const threatKey = `${tile.x},${tile.y}`;
        const threatLevel = threatMap.get(threatKey) || 0;

        const h = new PIXI.Graphics();
        if (threatLevel > 0) {
          h.beginFill(0x00ff00, 0.2);
          h.drawRect(
            tile.x * boardConfig.tileSize,
            tile.y * boardConfig.tileSize,
            boardConfig.tileSize,
            boardConfig.tileSize
          );
          h.endFill();
          h.lineStyle(1.5, 0xff4444, 0.7);
          h.drawRect(
            tile.x * boardConfig.tileSize + 1,
            tile.y * boardConfig.tileSize + 1,
            boardConfig.tileSize - 2,
            boardConfig.tileSize - 2
          );
        } else {
          h.beginFill(0x00ff00, 0.3);
          h.drawRect(
            tile.x * boardConfig.tileSize,
            tile.y * boardConfig.tileSize,
            boardConfig.tileSize,
            boardConfig.tileSize
          );
          h.endFill();
        }
        moveHighlights.push(h);
        overlayLayer.addChild(h);

        if (threatLevel > 0) {
          const cornerSize = 12;
          const tx = tile.x * boardConfig.tileSize;
          const ty = tile.y * boardConfig.tileSize;
          const dangerCorner = new PIXI.Graphics();
          dangerCorner.beginFill(0xff4444, 0.7);
          dangerCorner.moveTo(tx + boardConfig.tileSize - cornerSize, ty);
          dangerCorner.lineTo(tx + boardConfig.tileSize, ty);
          dangerCorner.lineTo(tx + boardConfig.tileSize, ty + cornerSize);
          dangerCorner.closePath();
          dangerCorner.endFill();
          moveHighlights.push(dangerCorner);
          overlayLayer.addChild(dangerCorner);

          if (threatLevel >= 2) {
            const dangerText = new PIXI.Text(`${threatLevel}`, {
              fontSize: 8,
              fill: 0xff4444,
              stroke: 0x000000,
              strokeThickness: 2,
              fontWeight: 'bold'
            });
            dangerText.anchor.set(0.5);
            dangerText.x = tx + boardConfig.tileSize - 7;
            dangerText.y = ty + 7;
            moveHighlights.push(dangerText);
            overlayLayer.addChild(dangerText);
          }
        }
      }
    }

    if (!selectedUnitData.hasAttacked && !ccLocked && !hasAttackedTwice) {
      const attackRange = getAttackRange(selectedUnitData, state.units);
      for (const tile of attackRange) {
        const counterInfo = getCounterInfo(selectedUnitData.type, tile.target.type);
        let fillColor = 0xff0000;
        let fillAlpha = 0.4;
        let borderStyle = null;

        if (counterInfo.isAdvantage) {
          fillColor = 0x00ff00;
          fillAlpha = 0.35;
          borderStyle = { color: 0x00ff00, width: 3, alpha: 0.9 };
        } else if (counterInfo.label && !counterInfo.isAdvantage) {
          fillColor = 0xff4444;
          fillAlpha = 0.3;
          borderStyle = { color: 0xff6600, width: 2, alpha: 0.7 };
        }

        const h = new PIXI.Graphics();
        if (borderStyle) {
          h.lineStyle(borderStyle.width, borderStyle.color, borderStyle.alpha);
        }
        h.beginFill(fillColor, fillAlpha);
        h.drawRect(
          tile.x * boardConfig.tileSize,
          tile.y * boardConfig.tileSize,
          boardConfig.tileSize,
          boardConfig.tileSize
        );
        h.endFill();
        attackHighlights.push(h);
        overlayLayer.addChild(h);

        if (counterInfo.isAdvantage && counterInfo.label) {
          const label = new PIXI.Text(counterInfo.label, {
            fontSize: 10,
            fill: 0x00ff00,
            stroke: 0x000000,
            strokeThickness: 2,
            fontWeight: 'bold'
          });
          label.anchor.set(0.5);
          label.x = tile.x * boardConfig.tileSize + boardConfig.tileSize / 2;
          label.y = tile.y * boardConfig.tileSize + 6;
          attackHighlights.push(label);
          overlayLayer.addChild(label);
        } else if (counterInfo.label && !counterInfo.isAdvantage) {
          const warnText = new PIXI.Text('⚠被克', {
            fontSize: 9,
            fill: 0xff6600,
            stroke: 0x000000,
            strokeThickness: 2,
            fontWeight: 'bold'
          });
          warnText.anchor.set(0.5);
          warnText.x = tile.x * boardConfig.tileSize + boardConfig.tileSize / 2;
          warnText.y = tile.y * boardConfig.tileSize + 6;
          attackHighlights.push(warnText);
          overlayLayer.addChild(warnText);
        }

        const defTerrain = getTerrain(tile.target.x, tile.target.y, layout);
        const atkTerrain = getTerrain(selectedUnitData.x, selectedUnitData.y, layout);
        const preview = calculateCombatPreview(
          selectedUnitData,
          tile.target,
          defTerrain || undefined,
          atkTerrain || undefined
        );
        if (preview.willCounter) {
          const counterIcon = new PIXI.Text('↩', {
            fontSize: 12,
            fill: 0xff9800,
            stroke: 0x000000,
            strokeThickness: 2,
            fontWeight: 'bold'
          });
          counterIcon.anchor.set(0.5);
          counterIcon.x = tile.x * boardConfig.tileSize + boardConfig.tileSize - 9;
          counterIcon.y = tile.y * boardConfig.tileSize + boardConfig.tileSize - 9;
          attackHighlights.push(counterIcon);
          overlayLayer.addChild(counterIcon);

          if (preview.counterDamage > 0) {
            const counterDmgText = new PIXI.Text(`-${preview.counterDamage}`, {
              fontSize: 8,
              fill: 0xff9800,
              stroke: 0x000000,
              strokeThickness: 1
            });
            counterDmgText.anchor.set(0.5);
            counterDmgText.x = tile.x * boardConfig.tileSize + boardConfig.tileSize - 10;
            counterDmgText.y = tile.y * boardConfig.tileSize + boardConfig.tileSize - 19;
            attackHighlights.push(counterDmgText);
            overlayLayer.addChild(counterDmgText);
          }
        }
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
      layout,
      state.tileEffects
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
        const moveRange = getMoveRange(selectedUnitData, state.units, layout, state.tileEffects);
        const inRange = moveRange.some(
          /** @param {any} t */
          t => t.x === tx && t.y === ty
        );
        if (inRange) {
          showPath(tx, ty);
        }
      }
    }

    if (selectedUnitData && !selectedUnitData.hasAttacked && state && !state.gameOver) {
      const ccLocked = isHardCC(selectedUnitData);
      const hasDoubleAttack = selectedUnitData.buffs?.some(
        /** @param {any} b */
        b => b.type === 'doubleAttack'
      );
      const hasAttackedTwice = !!hasDoubleAttack && (selectedUnitData.attackCount || 0) >= 2;

      if (!ccLocked && !hasAttackedTwice) {
        const attackRange = getAttackRange(selectedUnitData, state.units);
        const targetTile = attackRange.find(
          /** @param {any} t */
          t => t.x === tx && t.y === ty
        );
        if (targetTile) {
          previewTargetId.set(targetTile.target.id);
          return;
        }
      }
    }

    previewTargetId.set(null);
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
            previewTargetId.set(null);
            doAttack(selectedUnitData, clickedUnit);
            return;
          }
        }
      }

      if (!clickedUnit && !selectedUnitData.hasMoved && !ccLocked) {
        const layout = state.boardLayout || boardConfig.layout;
        const moveRange = getMoveRange(selectedUnitData, state.units, layout, state.tileEffects);
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
      previewTargetId.set(null);
    } else {
      gameState.selectUnit(null);
      previewTargetId.set(null);
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

    if (card.effect.type === 'summon') {
      const summonCheck = canUseSummonCard(card, state);
      if (!summonCheck.canUse) {
        gameState.setMessage(`${card.name} 无法使用：${summonCheck.reason}`);
        return;
      }
    }

    if (card.effect.type === 'terrainChange' || card.effect.type === 'tileEffect') {
      const layout = state.boardLayout || boardConfig.layout;
      const terrain = getTerrain(tx, ty, layout);
      if (terrain && terrain.isBase) {
        gameState.setMessage('不能在基地格子上使用该卡牌！');
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
            const summonResult = doSummon(effect.unitType, effect.faction);
            if (!summonResult.success) {
              gameState.setMessage(summonResult.message);
              return;
            }
          }
          break;
        case 'terrainChange':
          if (effect.x !== undefined && effect.y !== undefined && effect.terrain) {
            gameState.changeTerrain(effect.x, effect.y, effect.terrain);
            gameState.clearTileEffect(effect.x, effect.y);
          }
          break;
        case 'tileEffect':
          if (effect.x !== undefined && effect.y !== undefined && effect.tileEffectType) {
            if (effect.x >= 0 && effect.x < boardConfig.width && effect.y >= 0 && effect.y < boardConfig.height) {
              const t = getTerrain(effect.x, effect.y, state.boardLayout || boardConfig.layout);
              if (t && !t.isBase && t.passable !== false) {
                gameState.applyTileEffect(effect.x, effect.y, effect.tileEffectType, effect.duration || 3, card.id);
              }
            }
          }
          break;
        case 'reveal':
          if (effect.x !== undefined && effect.y !== undefined && effect.radius !== undefined && effect.duration !== undefined) {
            gameState.addRevealedArea(
              state.currentFaction,
              effect.x,
              effect.y,
              effect.radius,
              effect.duration
            );
            gameState.setReveal(Math.max(state.revealTurns, effect.duration));
          } else if (effect.duration !== undefined) {
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
      case 'tileEffect':
        return '请点击非基地格子施放地形效果';
      case 'summon': {
        if (state) {
          const feasibility = checkSummonFeasibility(state.units, state.currentFaction);
          if (!feasibility.canSummon) {
            return `（${feasibility.reason}）`;
          }
          return `点击任意位置确认召唤（当前 ${feasibility.currentCount}/${feasibility.maxCount}，按基地→邻格→空位优先落点）`;
        }
        return '点击任意位置确认召唤';
      }
      case 'reveal':
        return '点击任意位置施放侦查，揭示该区域内的敌军';
      default:
        return '请选择合适的目标';
    }
  }

  /**
   * @typedef {object} DoSummonResult
   * @property {boolean} success
   * @property {string} message
   * @property {{x: number, y: number} | null} position
   */

  /**
   * @param {import('$lib/config/unitConfig').UnitType} unitType
   * @param {string} faction
   * @returns {DoSummonResult}
   */
  function doSummon(unitType, faction) {
    if (!state) {
      return { success: false, message: '游戏状态异常', position: null };
    }

    const layout = state.boardLayout || boardConfig.layout;

    const feasibility = checkSummonFeasibility(state.units, faction);
    if (!feasibility.canSummon) {
      return { success: false, message: feasibility.reason || '无法召唤', position: null };
    }

    const posResult = findSummonPosition(
      state.units,
      faction,
      state.bases || null,
      layout,
      state.tileEffects || null
    );

    if (!posResult.found) {
      return { success: false, message: posResult.reason || '无可用落点', position: null };
    }

    const tileValidation = validateSummonTile(
      posResult.x,
      posResult.y,
      state.units,
      layout,
      state.tileEffects || null
    );

    if (!tileValidation.valid) {
      return { success: false, message: `落点校验失败：${tileValidation.reason}`, position: null };
    }

    const cfg = unitConfig[unitType];
    const summonRules = gameRules.summon;
    const factionName = faction === 'red' ? '红方' : '蓝方';

    /** @type {Unit} */
    const newUnit = {
      id: `unit_${Date.now()}_${Math.random()}`,
      type: unitType,
      faction,
      x: posResult.x,
      y: posResult.y,
      currentHp: cfg.hp,
      maxHp: cfg.hp,
      hasMoved: summonRules.summonExhausted,
      hasAttacked: summonRules.summonExhausted,
      attackCount: 0,
      buffs: [],
      stunned: 0,
      morale: gameRules.morale.initial,
      winStreak: 0,
      statusEffects: [],
      persistentId: `${faction}_${unitType}_summon_${Date.now()}`,
      exp: 0,
      level: 1,
      statPoints: 0,
      allocatedStats: { atk: 0, def: 0, hp: 0, move: 0 },
      specialization: null
    };
    gameState.addUnit(newUnit);

    const unitName = cfg.name;
    const terrainName = posResult.terrain?.name || '平原';
    const tierLabel = posResult.tier ? `【${posResult.tier}】` : '';
    const msg = `${factionName}召唤${unitName}${tierLabel}于 (${posResult.x},${posResult.y}) ${terrainName}（${feasibility.currentCount + 1}/${feasibility.maxCount}）`;
    gameState.setMessage(msg);

    return {
      success: true,
      message: msg,
      position: { x: posResult.x, y: posResult.y }
    };
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
      layout,
      state.tileEffects
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

    let tileEffectMsg = '';
    const tileEffect = getTileEffectAt(state.tileEffects, tx, ty);
    if (tileEffect) {
      const effectConfig = tileEffectConfig[tileEffect.type];
      if (effectConfig) {
        tileEffectMsg = `【${effectConfig.name}地形】`;
      }
    }

    gameState.setMessage(`${unitName} 移动完成${terrainBonusMsg}${tileEffectMsg}`);
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
    const atkTerrain = getTerrain(attacker.x, attacker.y, layout);
    const damage = calculateDamage(attacker, defender, defTerrain || undefined);

    const attackerName = unitConfig[/** @type {UnitType} */ (attacker.type)].name;
    const defenderName = unitConfig[/** @type {UnitType} */ (defender.type)].name;
    const attackerTier = getMoraleTier(attacker.morale ?? 80);
    const moraleTag = attackerTier.damageMultiplier !== 1.0
      ? `[士气${attackerTier.label}×${attackerTier.damageMultiplier}]`
      : '';

    const counterInfo = getCounterInfo(attacker.type, defender.type);
    const counterTag = counterInfo.isAdvantage
      ? `【克制·${counterInfo.label}】`
      : (counterInfo.label ? `[被克制·${counterInfo.label}]` : '');

    const killOccurred = defender.currentHp - damage <= 0;
    const newStreak = killOccurred ? (attacker.winStreak || 0) + 1 : 0;

    const preview = calculateCombatPreview(attacker, defender, defTerrain || undefined, atkTerrain || undefined);
    const willCounter = preview.willCounter;
    const counterDmg = willCounter ? preview.counterDamage : 0;
    const counterShielded = willCounter && attacker.buffs?.some(
      /** @param {any} b */ b => b.type === 'shield'
    );
    const actualCounterDmg = counterShielded ? 0 : counterDmg;
    const attackerKilledByCounter = actualCounterDmg > 0 && attacker.currentHp - actualCounterDmg <= 0;

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

    if (attackerKilledByCounter) {
      const defFaction = defender.faction === 'red' ? '红方' : '蓝方';
      moraleMsgs.push(`${defFaction}${defenderName}反击击杀${attackerName}`);
      const atkFaction = attacker.faction === 'red' ? '红方' : '蓝方';
      const atkAllyCount = state.units.filter(u => u.faction === attacker.faction && u.id !== attacker.id).length;
      if (atkAllyCount > 0) {
        moraleMsgs.push(`${atkFaction}全体-${gameRules.morale.onAllyDeath}士气(友军${attackerName}阵亡)`);
      }
    }

    const moraleMsg = moraleMsgs.length > 0 ? `\n士气：${moraleMsgs.join('；')}` : '';

    const killMsg = killOccurred ? '【击杀！】' : '';
    const streakMsg = killOccurred && newStreak >= gameRules.morale.winStreakThreshold
      ? `【${newStreak}连杀！】`
      : '';

    let counterMsg = '';
    if (willCounter) {
      if (counterShielded) {
        counterMsg = `；${defenderName}反击被护盾抵消`;
      } else if (attackerKilledByCounter) {
        counterMsg = `；${defenderName}反击造成${actualCounterDmg}伤害【反击击杀！】`;
      } else {
        counterMsg = `；${defenderName}反击造成${actualCounterDmg}伤害`;
      }
    }

    if (willAttackAgain) {
      gameState.setMessage(
        `${counterTag}${moraleTag}${attackerName} 对 ${defenderName} 造成 ${damage} 伤害${killMsg}${streakMsg}！（连续攻击可再攻击一次）${counterMsg}${moraleMsg}`
      );
    } else {
      gameState.setMessage(
        `${counterTag}${moraleTag}${attackerName} 对 ${defenderName} 造成 ${damage} 伤害${killMsg}${streakMsg}${counterMsg}！${moraleMsg}`
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

  function animationLoop() {
    if (state && state.enemyMarkers && state.currentFaction) {
      /** @type {'red' | 'blue'} */
      const faction = /** @type {'red' | 'blue'} */ (state.currentFaction);
      const markers = state.enemyMarkers[faction];
      if (markers.length > 0) {
        drawEnemyMarkers();
        drawScoutPreview();
      }
    }
    animationFrameId = requestAnimationFrame(animationLoop);
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

<script>
  import { onMount, onDestroy } from 'svelte';
  import { gameState, selectedUnit, currentHand, currentEnergy, currentCooldowns, previewTarget, previewTargetId } from '$lib/stores/gameStore';
  import { unitConfig, STATUS_EFFECT_INFO, STATUS_EFFECT_TYPES, getStatusInfo, COUNTER_RELATIONSHIPS, COUNTER_LABELS, SYNERGY_CONFIG } from '$lib/config/unitConfig';
  import { gameRules } from '$lib/config/gameRules';
  import { cardConfig, CARD_CATEGORY_LABELS, CARD_CATEGORY_COLORS, eventCards } from '$lib/config/eventCardConfig';
  import { getTerrain, getMoraleTier, settleBases, checkVictory, hasStatusEffect, getStatusEffect, isHardCC, calculateCombatPreview } from '$lib/utils/gameLogic';
  import { drawCard, drawInitialHand, canAffordCard } from '$lib/utils/cardSystem';
  import { saveGameRecord, getGameRecords, clearGameRecords, formatDate } from '$lib/utils/storage';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../utils/cardSystem').EventCard} EventCard
   * @typedef {import('../utils/cardSystem').CooldownEntry} CooldownEntry
   * @typedef {import('../stores/gameStore').GameState} GameState
   * @typedef {import('../stores/gameStore').ActionLog} ActionLog
   * @typedef {import('../stores/gameStore').TurnLog} TurnLog
   * @typedef {keyof typeof unitConfig} UnitType
   */

  /**
   * @typedef {object} GameRecord
   * @property {number} id
   * @property {string} winner
   * @property {string} victoryCondition
   * @property {number} turns
   * @property {number} totalUnits
   * @property {number} [avgMoraleWinner]
   * @property {number} [avgMoraleLoser]
   * @property {string} date
   * @property {TurnLog[]} [actionLogs]
   */

  /** @type {GameState | null} */
  let state;
  /** @type {Unit | null} */
  let selectedUnitData;
  /** @type {EventCard[]} */
  let handCards;
  let energy = 0;
  /** @type {CooldownEntry[]} */
  let cooldowns;
  let showRecords = false;
  let showBattleLog = false;
  let showReplay = false;
  /** @type {GameRecord | null} */
  let replayRecord = null;
  /** @type {GameRecord[]} */
  let records = [];

  /** @type {(() => void) | undefined} */
  let unsubscribe;
  /** @type {(() => void) | undefined} */
  let unsubscribeSelected;
  /** @type {(() => void) | undefined} */
  let unsubscribeHand;
  /** @type {(() => void) | undefined} */
  let unsubscribeEnergy;
  /** @type {(() => void) | undefined} */
  let unsubscribeCooldowns;

  /** @type {Unit | null} */
  let previewTargetData;

  /** @type {(() => void) | undefined} */
  let unsubscribePreview;

  $: combatPreview = getCombatPreview();

  let recordSaved = false;

  onMount(() => {
    unsubscribe = gameState.subscribe(/** @param {GameState} s */ s => {
      state = s;
      if (s.gameOver && s.winner && !recordSaved) {
        saveRecord();
        recordSaved = true;
      }
    });
    unsubscribeSelected = selectedUnit.subscribe(/** @param {Unit | null} u */ u => {
      selectedUnitData = u;
    });
    unsubscribeHand = currentHand.subscribe(/** @param {EventCard[]} h */ h => {
      handCards = h;
    });
    unsubscribeEnergy = currentEnergy.subscribe(/** @param {number} e */ e => {
      energy = e;
    });
    unsubscribeCooldowns = currentCooldowns.subscribe(/** @type {CooldownEntry[]} c */ c => {
      cooldowns = c;
    });
    unsubscribePreview = previewTarget.subscribe(/** @param {Unit | null} u */ u => {
      previewTargetData = u;
    });
    records = /** @type {GameRecord[]} */ (getGameRecords());

    if (!state || !state.hands || state.hands.red.length === 0) {
      initHands();
    }
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (unsubscribeSelected) unsubscribeSelected();
    if (unsubscribeHand) unsubscribeHand();
    if (unsubscribeEnergy) unsubscribeEnergy();
    if (unsubscribeCooldowns) unsubscribeCooldowns();
    if (unsubscribePreview) unsubscribePreview();
  });

  function initHands() {
    const redHand = drawInitialHand();
    const blueHand = drawInitialHand();
    for (const card of redHand) {
      gameState.addCard('red', card);
    }
    for (const card of blueHand) {
      gameState.addCard('blue', card);
    }
  }

  function saveRecord() {
    if (!state) return;
    const winner = state.winner || '';
    const loser = winner === 'red' ? 'blue' : 'red';
    const winnerUnits = state.units.filter(u => u.faction === winner);
    const loserUnits = state.units.filter(u => u.faction === loser);
    const avgMoraleWinner = winnerUnits.length > 0
      ? Math.round(winnerUnits.reduce((acc, u) => acc + (u.morale ?? 80), 0) / winnerUnits.length)
      : 0;
    const avgMoraleLoser = loserUnits.length > 0
      ? Math.round(loserUnits.reduce((acc, u) => acc + (u.morale ?? 80), 0) / loserUnits.length)
      : 0;
    const record = {
      winner: state.winner || '',
      victoryCondition: state.victoryCondition || '',
      turns: state.turn,
      totalUnits: state.units.length,
      avgMoraleWinner,
      avgMoraleLoser,
      actionLogs: state.actionLogs
    };
    saveGameRecord(record);
    records = /** @type {GameRecord[]} */ (getGameRecords());
  }

  function handleEndTurn() {
    if (!state || state.gameOver) return;
    previewTargetId.set(null);
    /** @type {'red' | 'blue'} */
    const nextFaction = state.currentFaction === 'red' ? 'blue' : 'red';
    const layout = state.boardLayout || null;

    const baseResult = settleBases(state.bases, state.units, nextFaction, layout);
    gameState.setBases(baseResult.bases);

    gameState.endTurn();

    const newCard = drawCard();
    gameState.addCard(nextFaction, newCard);

    const nextName = nextFaction === 'red' ? '红方' : '蓝方';
    const turnNum = nextFaction === 'red' ? state.turn + 1 : state.turn;

    let msg = `第 ${turnNum} 回合 - ${nextName}行动（获得 ${cardConfig.energyPerTurn} 能量）`;
    if (baseResult.messages.length > 0) {
      msg += '\n' + baseResult.messages.join('；');
    }
    gameState.setMessage(msg);

    gameState.selectUnit(null);
    gameState.selectCard(null);

    if (baseResult.victory) {
      gameState.setVictory(baseResult.victory.winner, baseResult.victory.condition);
    }
  }

  function handleRestart() {
    recordSaved = false;
    gameState.reset();
    initHands();
    gameState.setMessage('游戏开始！红方先行动');
  }

  /**
   * @param {EventCard} card
   */
  function handleSelectCard(card) {
    if (!state || state.gameOver) return;

    const affordability = canAffordCard(card, energy, cooldowns);
    if (!affordability.canUse) {
      gameState.setMessage(`${card.name}：${affordability.reason}`);
      return;
    }

    if (state.selectedCardId === card.instanceId) {
      gameState.selectCard(null);
      gameState.setMessage('');
    } else {
      gameState.selectCard(card.instanceId || null);
      const hint = getCardHint(card);
      gameState.setMessage(`${hint}（消耗 ${card.cost} 能量）`);
    }
  }

  /**
   * @param {EventCard} card
   * @returns {string}
   */
  function getCardHint(card) {
    const isStatusDebuff = Object.values(STATUS_EFFECT_TYPES).includes(card.effect.type);
    if (isStatusDebuff) {
      return `已选中 ${card.name}，请点击敌方单位使用`;
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
        return `已选中 ${card.name}，请点击己方单位使用（也可先选中单位再选卡）`;
      case 'damage':
      case 'stun':
      case 'applyStatus':
        return `已选中 ${card.name}，请点击敌方单位使用`;
      case 'terrainChange':
        return `已选中 ${card.name}，请点击任意非基地格子改变地形`;
      case 'summon':
        return `已选中 ${card.name}，点击任意位置确认召唤（优先基地→邻格→空位，满编/阻挡/异常地形将自动校验）`;
      case 'reveal':
        return `已选中 ${card.name}，点击任意位置触发侦查效果`;
      default:
        return `已选中 ${card.name}，请选择目标`;
    }
  }

  function handleShowRecords() {
    showRecords = !showRecords;
    if (showRecords) {
      records = /** @type {GameRecord[]} */ (getGameRecords());
    }
  }

  function handleShowBattleLog() {
    showBattleLog = !showBattleLog;
  }

  /**
   * @param {GameRecord} record
   */
  function handleShowReplay(record) {
    replayRecord = record;
    showReplay = true;
  }

  function handleCloseReplay() {
    showReplay = false;
    replayRecord = null;
  }

  /**
   * @param {string} type
   * @returns {{icon: string, color: string, label: string}}
   */
  function getLogTypeInfo(type) {
    /** @type {Record<string, {icon: string, color: string, label: string}>} */
    const info = {
      move: { icon: '🚶', color: '#3498db', label: '移动' },
      attack: { icon: '⚔️', color: '#e74c3c', label: '攻击' },
      card: { icon: '🃏', color: '#9b59b6', label: '卡牌' },
      damage: { icon: '💥', color: '#c0392b', label: '伤害' },
      heal: { icon: '💚', color: '#2ecc71', label: '治疗' },
      status: { icon: '✨', color: '#8e44ad', label: '状态' },
      base: { icon: '🏰', color: '#d4af37', label: '基地' },
      turn: { icon: '🔄', color: '#f39c12', label: '回合' },
      summon: { icon: '👤', color: '#1abc9c', label: '召唤' },
      terrain: { icon: '🌍', color: '#27ae60', label: '地形' },
      victory: { icon: '🏆', color: '#f1c40f', label: '胜利' },
      morale: { icon: '😊', color: '#e67e22', label: '士气' }
    };
    return info[type] || { icon: '📝', color: '#999', label: type };
  }

  /**
   * @param {string} faction
   * @returns {string}
   */
  function getFactionBgColor(faction) {
    return faction === 'red' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.15)';
  }

  function handleClearRecords() {
    if (confirm('确定要清除所有游戏记录吗？')) {
      clearGameRecords();
      records = [];
    }
  }

  /**
   * @param {Unit} unit
   */
  function getUnitTerrain(unit) {
    const layout = state?.boardLayout || null;
    return getTerrain(unit.x, unit.y, layout);
  }

  /**
   * @param {string} faction
   * @returns {string}
   */
  function getFactionName(faction) {
    return gameRules.factionNames[/** @type {'red' | 'blue'} */ (faction)] || faction;
  }

  /**
   * @param {string} faction
   * @returns {string}
   */
  function getFactionColor(faction) {
    return gameRules.factionColors[/** @type {'red' | 'blue'} */ (faction)] || '#999';
  }

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

  /**
   * @param {string} type
   * @returns {string}
   */
  function getUnitName(type) {
    return unitConfig[/** @type {UnitType} */ (type)].name;
  }

  /**
   * @param {string} type
   * @returns {number}
   */
  function getUnitAttack(type) {
    return unitConfig[/** @type {UnitType} */ (type)].attack;
  }

  /**
   * @param {string} type
   * @returns {number}
   */
  function getUnitDefense(type) {
    return unitConfig[/** @type {UnitType} */ (type)].defense;
  }

  /**
   * @param {string} type
   * @returns {number}
   */
  function getUnitMoveRange(type) {
    return unitConfig[/** @type {UnitType} */ (type)].moveRange;
  }

  /**
   * @param {string} type
   * @returns {number}
   */
  function getUnitAttackRange(type) {
    return unitConfig[/** @type {UnitType} */ (type)].attackRange;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getCardTypeLabel(type) {
    /** @type {Record<string, string>} */
    const labels = {
      buff: '增益',
      debuff: '减益',
      special: '特殊'
    };
    return labels[type] || type;
  }

  /**
   * @param {EventCard} card
   * @returns {boolean}
   */
  function isCardPlayable(card) {
    if (card.cardState === 'active') {
      return false;
    }
    const affordability = canAffordCard(card, energy, cooldowns);
    return affordability.canUse;
  }

  /**
   * @param {EventCard} card
   * @returns {string | undefined}
   */
  function getCardUnplayableReason(card) {
    if (card.cardState === 'active') {
      return card.category === 'sustain' ? '持续生效中' : '待触发中';
    }
    const affordability = canAffordCard(card, energy, cooldowns);
    return affordability.reason;
  }

  /**
   * @param {EventCard} card
   * @returns {boolean}
   */
  function isCardActive(card) {
    return card.cardState === 'active';
  }

  /**
   * @param {EventCard} card
   * @returns {string}
   */
  function getCardStateLabel(card) {
    if (card.cardState === 'active') {
      return card.category === 'sustain' ? '持续中' : '待触发';
    }
    return '';
  }

  /**
   * @param {string} buffType
   * @returns {string}
   */
  function getBuffName(buffType) {
    /** @type {Record<string, string>} */
    const names = {
      attackBoost: '攻击强化',
      defenseBoost: '防御强化',
      moveBoost: '移动强化',
      doubleAttack: '连续攻击',
      counterAttack: '反击姿态',
      shield: '护盾屏障'
    };
    return names[buffType] || buffType;
  }

  /**
   * @param {number} morale
   * @returns {string}
   */
  function getMoraleColor(morale) {
    if (morale >= 90) return '#2ecc71';
    if (morale >= 80) return '#27ae60';
    if (morale >= 50) return '#f1c40f';
    if (morale >= 30) return '#e67e22';
    return '#e74c3c';
  }

  /**
   * @param {any} s
   * @returns {{loser: string, avgMoraleWinner: number, avgMoraleLoser: number}}
   */
  function getEndGameMoraleStats(s) {
    if (!s || !s.winner) {
      return { loser: 'red', avgMoraleWinner: 0, avgMoraleLoser: 0 };
    }
    const winner = s.winner;
    const loser = winner === 'red' ? 'blue' : 'red';
    const winnerUnits = s.units.filter(/** @param {Unit} u */ u => u.faction === winner);
    const loserUnits = s.units.filter(/** @param {Unit} u */ u => u.faction === loser);
    const avgMoraleWinner = winnerUnits.length > 0
      ? Math.round(winnerUnits.reduce((/** @type {number} */ a, /** @type {Unit} */ u) => a + (u.morale ?? 80), 0) / winnerUnits.length)
      : 0;
    const avgMoraleLoser = loserUnits.length > 0
      ? Math.round(loserUnits.reduce((/** @type {number} */ a, /** @type {Unit} */ u) => a + (u.morale ?? 80), 0) / loserUnits.length)
      : 0;
    return { loser, avgMoraleWinner, avgMoraleLoser };
  }

  /**
   * @param {EventCard} card
   */
  function handleCardKeydown(card) {
    handleSelectCard(card);
  }

  /**
   * @param {string} cardId
   * @returns {string}
   */
  function getCardNameById(cardId) {
    const card = eventCards.find(c => c.id === cardId);
    return card ? card.name : cardId;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getResistanceLabel(type) {
    const info = getStatusInfo(type);
    return info.name;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getStatusTypeLabel(type) {
    const info = getStatusInfo(type);
    return info.name;
  }

  /**
   * @param {Unit} unit
   * @returns {Record<string, number>}
   */
  function getUnitResistances(unit) {
    const cfg = unitConfig[/** @type {UnitType} */ (unit.type)];
    return cfg.statusResistance || {};
  }

  /**
   * @param {Unit} unit
   * @returns {string[]}
   */
  function getUnitImmunities(unit) {
    const cfg = unitConfig[/** @type {UnitType} */ (unit.type)];
    return cfg.statusImmunities || [];
  }

  /**
   * @param {UnitType} unitType
   * @returns {{ target: UnitType; label: string }[]}
   */
  function getCounterAdvantages(unitType) {
    const counters = COUNTER_RELATIONSHIPS[unitType];
    const labels = COUNTER_LABELS[unitType];
    if (!counters) return [];
    return /** @type {UnitType[]} */ (Object.keys(counters)).map(target => ({
      target,
      label: labels?.[target] || `${unitConfig[unitType].name}克制${unitConfig[target].name}`
    }));
  }

  /**
   * @param {UnitType} unitType
   * @returns {{ attacker: UnitType; label: string }[]}
   */
  function getCounterWeaknesses(unitType) {
    /** @type {{ attacker: UnitType; label: string }[]} */
    const weaknesses = [];
    for (const [attackerType, targets] of Object.entries(COUNTER_RELATIONSHIPS)) {
      const attackerUnitType = /** @type {UnitType} */ (attackerType);
      if (targets[unitType]) {
        const labels = COUNTER_LABELS[attackerUnitType];
        weaknesses.push({
          attacker: attackerUnitType,
          label: labels?.[unitType] || `${unitConfig[attackerUnitType].name}克制${unitConfig[unitType].name}`
        });
      }
    }
    return weaknesses;
  }

  /**
   * @param {UnitType} unitType
   * @returns {{ key: string; name: string; description: string; partnerType: UnitType }[]}
   */
  function getSynergiesForUnit(unitType) {
    /** @type {{ key: string; name: string; description: string; partnerType: UnitType }[]} */
    const result = [];
    for (const [key, config] of Object.entries(SYNERGY_CONFIG)) {
      if (config.requiredTypes.includes(unitType)) {
        const partnerType = /** @type {UnitType} */ (
          config.requiredTypes.find(t => t !== unitType) || config.requiredTypes[0]
        );
        result.push({
          key,
          name: config.name,
          description: config.description,
          partnerType
        });
      }
    }
    return result;
  }

  /**
   * @returns {import('$lib/utils/gameLogic').CombatPreview & { targetType: string; targetCurrentHp: number; targetMaxHp: number; targetX: number; targetY: number } | null}
   */
  function getCombatPreview() {
    if (!selectedUnitData || !previewTargetData || !state) return null;
    if (selectedUnitData.faction === previewTargetData.faction) return null;
    if (selectedUnitData.hasAttacked || isHardCC(selectedUnitData)) return null;
    const layout = state.boardLayout || null;
    const defTerrain = getTerrain(previewTargetData.x, previewTargetData.y, layout);
    const atkTerrain = getTerrain(selectedUnitData.x, selectedUnitData.y, layout);
    const preview = calculateCombatPreview(selectedUnitData, previewTargetData, defTerrain || undefined, atkTerrain || undefined);
    return {
      ...preview,
      targetType: previewTargetData.type,
      targetCurrentHp: previewTargetData.currentHp,
      targetMaxHp: previewTargetData.maxHp,
      targetX: previewTargetData.x,
      targetY: previewTargetData.y
    };
  }
</script>

<div class="game-ui">
  <div class="top-bar">
    <div class="turn-info">
      <span class="turn-label">回合</span>
      <span class="turn-number">{state?.turn || 1}</span>
      {#if (state?.revealTurns ?? 0) > 0}
        <span class="reveal-tag">👁️ 侦查中</span>
      {/if}
    </div>
    <div class="faction-info">
      <span
        class="current-faction"
        style="color: {state ? getFactionColor(state.currentFaction) : '#999'}"
      >
        {state ? getFactionName(state.currentFaction) : ''}行动
      </span>
      <div class="energy-bar-wrapper" title="能量">
        <span class="energy-icon">⚡</span>
        <div class="energy-bar">
          <div
            class="energy-fill"
            style="width: {(energy / cardConfig.maxEnergy) * 100}%"
          ></div>
        </div>
        <span class="energy-text">{energy}/{cardConfig.maxEnergy}</span>
      </div>
    </div>
    <div class="top-actions">
      <button class="btn btn-secondary" on:click={handleShowBattleLog}>
        📜 战报
      </button>
      <button class="btn btn-secondary" on:click={handleShowRecords}>
        📊 记录
      </button>
      <button class="btn btn-secondary" on:click={handleRestart}>
        🔄 重开
      </button>
    </div>
  </div>

  {#if cooldowns && cooldowns.length > 0}
    <div class="cooldown-bar">
      <span class="cooldown-label">冷却中：</span>
      {#each cooldowns as cd (cd.cardId)}
        <span class="cooldown-tag">
          {getCardNameById(cd.cardId)} ({cd.remainingCooldown})
        </span>
      {/each}
    </div>
  {/if}

  {#if state?.message}
    <div class="message-bar">
      {#each state.message.split('\n') as line}
        <div>{line}</div>
      {/each}
    </div>
  {/if}

  {#if state?.lastStatusMessages && state.lastStatusMessages.length > 0}
    <div class="status-message-bar">
      {#each state.lastStatusMessages as msg (msg)}
        <div>{msg}</div>
      {/each}
    </div>
  {/if}

  {#if state?.bases && state.bases.length > 0 && !state.gameOver}
    <div class="base-status-panel">
      <div class="base-status-title">基地状态</div>
      {#each state.bases as base}
        <div class="base-status-item">
          <span class="base-faction" style="color: {getFactionColor(base.faction)}">
            {getFactionName(base.faction)}基地
          </span>
          <div class="base-durability-bar">
            <div
              class="base-durability-fill"
              style="width: {(base.durability / base.maxDurability) * 100}%; background: {base.durability / base.maxDurability > 0.6 ? '#2ecc71' : base.durability / base.maxDurability > 0.3 ? '#f1c40f' : '#e74c3c'}"
            ></div>
          </div>
          <span class="base-durability-text">{Math.floor(base.durability)}/{base.maxDurability}</span>
          {#if base.captureProgress > 0}
            <span class="base-capture-text" style="color: {getFactionColor(base.capturingFaction)}">
              占领中 {base.captureProgress}/{gameRules.victoryConditions.captureBase.captureTurnsRequired}
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if state?.gameOver}
    <div class="game-over-overlay">
      <div class="game-over-content">
        <h2>游戏结束</h2>
        <p class="winner" style="color: {state.winner ? getFactionColor(state.winner) : '#999'}">
          {state.winner ? getFactionName(state.winner) : ''} 胜利！
        </p>
        <p class="condition">{state.victoryCondition}</p>
        <p class="stat-line">共经历 {state.turn} 回合</p>
        {#if state.winner}
          <div class="morale-summary">
            <div style="color: {getFactionColor(state.winner)}">
              {getFactionName(state.winner)} 平均士气：{getEndGameMoraleStats(state).avgMoraleWinner}
            </div>
            <div style="color: {getFactionColor(getEndGameMoraleStats(state).loser)}">
              {getFactionName(getEndGameMoraleStats(state).loser)} 平均士气：{getEndGameMoraleStats(state).avgMoraleLoser}
            </div>
          </div>
        {/if}
        <button class="btn btn-primary" on:click={handleRestart}>再来一局</button>
      </div>
    </div>
  {/if}

  {#if showBattleLog}
    <div
      class="records-overlay"
      on:click|self={handleShowBattleLog}
      role="dialog"
      aria-label="战报日志"
      tabindex="0"
      on:keydown={(e) => e.key === 'Escape' && handleShowBattleLog()}
    >
      <div class="records-panel battle-log-panel">
        <div class="records-header">
          <h3>📜 战报日志</h3>
          <button class="btn-close" on:click={handleShowBattleLog} aria-label="关闭">×</button>
        </div>
        <div class="battle-log-list">
          {#if !state || !state.actionLogs || state.actionLogs.length === 0}
            <p class="empty">暂无战报记录</p>
          {:else}
            {#each [...state.actionLogs].reverse() as turnLog}
              <div class="battle-log-turn-group">
                <div class="battle-log-turn-header" style="background: {getFactionBgColor(turnLog.faction)}">
                  <span class="turn-badge">第 {turnLog.turn} 回合</span>
                  <span class="faction-badge" style="color: {getFactionColor(turnLog.faction)}">
                    {getFactionName(turnLog.faction)}
                  </span>
                </div>
                <div class="battle-log-actions">
                  {#each turnLog.actions as action (action.id)}
                    <div class="battle-log-item" style="border-left-color: {getLogTypeInfo(action.type).color}">
                      <span class="log-type-icon" style="background: {getLogTypeInfo(action.type).color}">
                        {getLogTypeInfo(action.type).icon}
                      </span>
                      <div class="log-content">
                        <div class="log-description">{action.description}</div>
                        {#if action.details && Object.keys(action.details).length > 0}
                          <div class="log-details">
                            {#if action.type === 'move' && action.details.path && action.details.path.length > 0}
                              <span class="log-detail-tag">
                                路径: {action.details.from && `(${action.details.from.x},${action.details.from.y})`} → ({action.details.to?.x},{action.details.to?.y})
                              </span>
                            {/if}
                            {#if action.type === 'attack' && action.details.finalDamage !== undefined}
                              <span class="log-detail-tag">伤害: {action.details.finalDamage}</span>
                              {#if action.details.defenderDead}
                                <span class="log-detail-tag kill-tag">击杀</span>
                              {/if}
                              {#if action.details.shieldBlocked}
                                <span class="log-detail-tag shield-tag">护盾抵消</span>
                              {/if}
                            {/if}
                            {#if action.type === 'card'}
                              <span class="log-detail-tag">消耗能量: {action.details.cost}</span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showRecords}
    <div
      class="records-overlay"
      on:click|self={handleShowRecords}
      role="dialog"
      aria-label="游戏记录"
      tabindex="0"
      on:keydown={(e) => e.key === 'Escape' && handleShowRecords()}
    >
      <div class="records-panel">
        <div class="records-header">
          <h3>游戏记录</h3>
          <button class="btn-close" on:click={handleShowRecords} aria-label="关闭">×</button>
        </div>
        <div class="records-list">
          {#if records.length === 0}
            <p class="empty">暂无游戏记录</p>
          {:else}
            {#each records as record (record.id)}
              <div class="record-item">
                <div class="record-winner" style="color: {getFactionColor(record.winner)}">
                  {getFactionName(record.winner)} 胜
                </div>
                <div class="record-info">
                  <span>{record.victoryCondition}</span>
                  <span>第 {record.turns} 回合</span>
                </div>
                {#if record.avgMoraleWinner !== undefined && record.avgMoraleLoser !== undefined}
                  <div class="record-morale">
                    <span style="color: {getFactionColor(record.winner)}">胜方士气 {record.avgMoraleWinner}</span>
                    <span style="color: {getFactionColor(record.winner === 'red' ? 'blue' : 'red')}">败方士气 {record.avgMoraleLoser}</span>
                  </div>
                {/if}
                <div class="record-date">{formatDate(record.date)}</div>
                {#if record.actionLogs && record.actionLogs.length > 0}
                  <button class="btn btn-secondary btn-small record-replay-btn" on:click={() => handleShowReplay(record)}>
                    📽️ 查看复盘
                  </button>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
        {#if records.length > 0}
          <button class="btn btn-danger btn-small" on:click={handleClearRecords}>
            清除记录
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if showReplay && replayRecord}
    <div
      class="records-overlay"
      on:click|self={handleCloseReplay}
      role="dialog"
      aria-label="局后复盘"
      tabindex="0"
      on:keydown={(e) => e.key === 'Escape' && handleCloseReplay()}
    >
      <div class="records-panel replay-panel">
        <div class="records-header">
          <h3>🎬 局后复盘</h3>
          <div class="replay-summary">
            <span style="color: {getFactionColor(replayRecord.winner)}; font-weight: bold;">
              {getFactionName(replayRecord.winner)} 胜利
            </span>
            <span style="color: #888;">·</span>
            <span>{replayRecord.victoryCondition}</span>
            <span style="color: #888;">·</span>
            <span>共 {replayRecord.turns} 回合</span>
          </div>
          <button class="btn-close" on:click={handleCloseReplay} aria-label="关闭">×</button>
        </div>
        <div class="battle-log-list">
          {#if !replayRecord.actionLogs || replayRecord.actionLogs.length === 0}
            <p class="empty">该记录没有详细战报</p>
          {:else}
            {#each replayRecord.actionLogs as turnLog}
              <div class="battle-log-turn-group">
                <div class="battle-log-turn-header" style="background: {getFactionBgColor(turnLog.faction)}">
                  <span class="turn-badge">第 {turnLog.turn} 回合</span>
                  <span class="faction-badge" style="color: {getFactionColor(turnLog.faction)}">
                    {getFactionName(turnLog.faction)}
                  </span>
                </div>
                <div class="battle-log-actions">
                  {#each turnLog.actions as action (action.id)}
                    <div class="battle-log-item" style="border-left-color: {getLogTypeInfo(action.type).color}">
                      <span class="log-type-icon" style="background: {getLogTypeInfo(action.type).color}">
                        {getLogTypeInfo(action.type).icon}
                      </span>
                      <div class="log-content">
                        <div class="log-description">{action.description}</div>
                        {#if action.details && Object.keys(action.details).length > 0}
                          <div class="log-details">
                            {#if action.type === 'move' && action.details.from}
                              <span class="log-detail-tag">
                                ({action.details.from.x},{action.details.from.y}) → ({action.details.to?.x},{action.details.to?.y})
                              </span>
                              {#if action.details.bleedDamage > 0}
                                <span class="log-detail-tag bleed-tag">流血 -{action.details.bleedDamage}HP</span>
                              {/if}
                            {/if}
                            {#if action.type === 'attack'}
                              <span class="log-detail-tag">伤害 {action.details.finalDamage}</span>
                              {#if action.details.defenderDead}
                                <span class="log-detail-tag kill-tag">击杀</span>
                              {/if}
                              {#if action.details.shieldBlocked}
                                <span class="log-detail-tag shield-tag">护盾</span>
                              {/if}
                            {/if}
                            {#if action.type === 'card'}
                              <span class="log-detail-tag">⚡{action.details.cost}</span>
                              {#if action.details.cooldown > 0}
                                <span class="log-detail-tag">CD {action.details.cooldown}</span>
                              {/if}
                            {/if}
                            {#if action.type === 'damage'}
                              <span class="log-detail-tag">-{action.details.finalDamage}HP</span>
                            {/if}
                            {#if action.type === 'heal'}
                              <span class="log-detail-tag heal-tag">+{action.details.amount}HP</span>
                            {/if}
                            {#if action.type === 'status' && action.details.statusName}
                              <span class="log-detail-tag status-tag">
                                {action.details.statusName} ({action.details.duration}回合)
                              </span>
                            {/if}
                            {#if action.type === 'base' && action.details.action === 'damage'}
                              <span class="log-detail-tag">-{action.details.damage}耐久</span>
                            {/if}
                            {#if action.type === 'base' && action.details.action === 'repair'}
                              <span class="log-detail-tag heal-tag">+{action.details.repair}耐久</span>
                            {/if}
                            {#if action.type === 'base' && action.details.action === 'capture'}
                              <span class="log-detail-tag">
                                占领进度 {action.details.newProgress}/{gameRules.victoryConditions.captureBase.captureTurnsRequired}
                              </span>
                            {/if}
                            {#if action.type === 'summon'}
                              <span class="log-detail-tag">
                                ({action.details.position?.x},{action.details.position?.y})
                              </span>
                            {/if}
                            {#if action.type === 'terrain'}
                              <span class="log-detail-tag">
                                ({action.details.x},{action.details.y}) → {action.details.newTerrainName}
                              </span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if selectedUnitData}
    <div class="unit-panel">
      <div class="unit-header">
        <span class="unit-icon">{getUnitIcon(selectedUnitData.type)}</span>
        <span class="unit-name">{getUnitName(selectedUnitData.type)}</span>
        <span
          class="unit-faction"
          style="color: {getFactionColor(selectedUnitData.faction)}"
        >
          {getFactionName(selectedUnitData.faction)}
        </span>
      </div>
      <div class="unit-stats">
        <div class="stat">
          <span class="stat-label">生命</span>
          <div class="stat-bar">
            <div
              class="stat-fill hp"
              style="width: {(selectedUnitData.currentHp / selectedUnitData.maxHp) * 100}%"
            ></div>
          </div>
          <span class="stat-value">{selectedUnitData.currentHp}/{selectedUnitData.maxHp}</span>
        </div>
        <div class="stat">
          <span class="stat-label">士气</span>
          <div class="stat-bar">
            <div
              class="stat-fill morale"
              style="width: {selectedUnitData.morale ?? 80}%"
            ></div>
          </div>
          <span class="stat-value">{selectedUnitData.morale ?? 80}</span>
        </div>
        <div class="morale-tier" style="color: {getMoraleColor(selectedUnitData.morale ?? 80)}">
          士气状态：{getMoraleTier(selectedUnitData.morale ?? 80).label}（×{getMoraleTier(selectedUnitData.morale ?? 80).damageMultiplier}）
          {#if (selectedUnitData.winStreak ?? 0) > 0}
            <span class="streak-tag">🔥 {selectedUnitData.winStreak} 连胜</span>
          {/if}
        </div>
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-label">攻击</span>
            <span class="stat-value">{getUnitAttack(selectedUnitData.type)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">防御</span>
            <span class="stat-value">{getUnitDefense(selectedUnitData.type)}</span>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-label">移动</span>
            <span class="stat-value">{getUnitMoveRange(selectedUnitData.type)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">射程</span>
            <span class="stat-value">{getUnitAttackRange(selectedUnitData.type)}</span>
          </div>
        </div>
      </div>
      {#if getUnitTerrain(selectedUnitData)}
        <div class="terrain-info">
          地形: {getUnitTerrain(selectedUnitData)?.name}
          {#if (getUnitTerrain(selectedUnitData)?.defenseBonus ?? 0) > 0}
            (+{getUnitTerrain(selectedUnitData)?.defenseBonus} 防御)
          {/if}
          {#if (getUnitTerrain(selectedUnitData)?.moraleBonus ?? 0) > 0}
            {#if getUnitTerrain(selectedUnitData)?.isBase && getUnitTerrain(selectedUnitData)?.faction === selectedUnitData.faction}
              (+{getUnitTerrain(selectedUnitData)?.moraleBonus} 士气)
            {:else if !getUnitTerrain(selectedUnitData)?.isBase}
              (+{getUnitTerrain(selectedUnitData)?.moraleBonus} 士气)
            {/if}
          {/if}
          {#if getUnitTerrain(selectedUnitData)?.isBase && state?.bases}
            {#each state.bases as b}
              {#if b.x === selectedUnitData.x && b.y === selectedUnitData.y}
                <div class="base-detail">
                  耐久: {Math.floor(b.durability)}/{b.maxDurability}
                  {#if b.captureProgress > 0}
                    <span style="color: {getFactionColor(b.capturingFaction)}">
                      （占领中 {b.captureProgress}/{gameRules.victoryConditions.captureBase.captureTurnsRequired}）
                    </span>
                  {/if}
                </div>
                {#if selectedUnitData.faction === b.faction}
                  <div class="base-repair-hint">
                    💡 驻守修复 +{b.repairPerTurn + (gameRules.victoryConditions.captureBase.garrisonRepairBonus || 0)}/回合
                  </div>
                {:else}
                  <div class="base-capture-hint">
                    ⚔️ 持续占领可攻破基地
                  </div>
                {/if}
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
      {#if selectedUnitData.buffs && selectedUnitData.buffs.length > 0}
        <div class="buffs-info">
          <div class="info-label">增益效果</div>
          {#each selectedUnitData.buffs as buff (buff.type)}
            <span class="buff-tag">{getBuffName(String(buff.type))}({buff.duration}回合)</span>
          {/each}
        </div>
      {/if}
      {#if selectedUnitData.statusEffects && selectedUnitData.statusEffects.length > 0}
        <div class="status-effects-info">
          <div class="info-label">状态效果</div>
          {#each selectedUnitData.statusEffects as status, i (status.id || `${status.type}_${i}`)}
            {@const info = getStatusInfo(status.type)}
            <span
              class="status-effect-tag"
              style="background: {info.category === 'hardCC' ? '#e74c3c' : info.category === 'softCC' ? '#f39c12' : info.category === 'DoT' ? '#c0392b' : info.category === 'debuff' ? '#e67e22' : '#9b59b6'}"
              title="{info.name}：{info.description}
持续：{status.duration}回合
{status.value !== undefined ? `数值：${info.valueLabel || '效果值'} ${status.value}` : ''}
来源：{status.source || '未知'}"
            >
              {info.icon} {info.name}({status.duration})
            </span>
          {/each}
        </div>
      {/if}
      {#if Object.keys(getUnitResistances(selectedUnitData)).length > 0}
        <div class="resistances-info">
          <div class="info-label">状态抗性</div>
          {#each Object.entries(getUnitResistances(selectedUnitData)) as [type, value] (type)}
            <span
              class="resistance-tag"
              title="{getStatusTypeLabel(type)}：免疫概率 {Math.round(value * 100)}%"
            >
              {getStatusInfo(type).icon} {Math.round(value * 100)}%
            </span>
          {/each}
        </div>
      {/if}
      {#if getUnitImmunities(selectedUnitData).length > 0}
        <div class="immunities-info">
          <div class="info-label">异常免疫</div>
          {#each getUnitImmunities(selectedUnitData) as type (type)}
            <span
              class="immunity-tag"
              title="完全免疫【{getStatusTypeLabel(type)}】"
            >
              🛡️ {getStatusInfo(type).icon} {getStatusTypeLabel(type)}
            </span>
          {/each}
        </div>
      {/if}
      {#if getCounterAdvantages(selectedUnitData.type).length > 0}
        <div class="counter-info">
          <div class="info-label">⚔️ 克制</div>
          {#each getCounterAdvantages(selectedUnitData.type) as advantage (advantage.target)}
            <span class="counter-advantage-tag" title="对{unitConfig[advantage.target].name}造成30%额外伤害">
              ▶ {unitConfig[advantage.target].name}（{advantage.label}）
            </span>
          {/each}
        </div>
      {/if}
      {#if getCounterWeaknesses(selectedUnitData.type).length > 0}
        <div class="counter-info">
          <div class="info-label">⚠️ 被克制</div>
          {#each getCounterWeaknesses(selectedUnitData.type) as weakness (weakness.attacker)}
            <span class="counter-weakness-tag" title="{unitConfig[weakness.attacker].name}对你造成30%额外伤害">
              ◀ {unitConfig[weakness.attacker].name}（{weakness.label}）
            </span>
          {/each}
        </div>
      {/if}
      {#if getSynergiesForUnit(selectedUnitData.type).length > 0}
        <div class="synergy-info">
          <div class="info-label">🤝 协同</div>
          {#each getSynergiesForUnit(selectedUnitData.type) as synergy (synergy.key)}
            <span class="synergy-tag" title="{synergy.description}">
              {synergy.name}（+{unitConfig[synergy.partnerType].name}）
            </span>
          {/each}
        </div>
      {/if}
      {#if combatPreview}
        <div class="combat-preview">
          <div class="combat-preview-title">⚔️ 战斗预演</div>
          <div class="combat-preview-target">
            <span class="preview-target-icon">{getUnitIcon(combatPreview.targetType)}</span>
            <span class="preview-target-name">{getUnitName(combatPreview.targetType)}</span>
            <span class="preview-target-hp">HP {combatPreview.targetCurrentHp}/{combatPreview.targetMaxHp}</span>
          </div>
          <div class="combat-preview-damage">
            <span class="preview-damage-label">预估伤害</span>
            <span class="preview-damage-value" style="color: {combatPreview.willKill ? '#e74c3c' : combatPreview.shieldBlocked ? '#3498db' : '#f39c12'}">
              {combatPreview.shieldBlocked ? '🛡️ 0' : combatPreview.estimatedDamage}
            </span>
            {#if !combatPreview.shieldBlocked}
              <span class="preview-hp-after" style="color: {combatPreview.willKill ? '#e74c3c' : '#aaa'}">
                → {combatPreview.willKill ? '击杀！' : `${combatPreview.defenderRemainingHp}HP`}
              </span>
            {:else}
              <span class="preview-hp-after" style="color: #3498db">护盾抵消</span>
            {/if}
          </div>
          {#if combatPreview.willCounter}
            <div class="combat-preview-counter">
              <span class="preview-counter-label">⚡ 反击</span>
              <span class="preview-counter-value" style="color: {combatPreview.counterWillKill ? '#e74c3c' : '#ff9800'}">
                {combatPreview.counterDamage}
              </span>
              <span class="preview-counter-after" style="color: {combatPreview.counterWillKill ? '#e74c3c' : '#aaa'}">
                → {combatPreview.counterWillKill ? '被击杀！' : `己方${combatPreview.attackerRemainingHp}HP`}
              </span>
            </div>
          {:else}
            <div class="combat-preview-counter combat-preview-no-counter">
              <span class="preview-counter-label">⚡ 反击</span>
              <span class="preview-counter-value" style="color: #666">
                无法反击
              </span>
              <span class="preview-counter-after" style="color: #555">
                {combatPreview.willKill ? '（将被击杀）' : (Math.abs(selectedUnitData.x - combatPreview.targetX) + Math.abs(selectedUnitData.y - combatPreview.targetY) > getUnitAttackRange(combatPreview.targetType) ? '（超出射程）' : '（被控制）')}
              </span>
            </div>
          {/if}
          {#if combatPreview.attackModifiers.length > 0}
            <div class="combat-preview-modifiers">
              <div class="preview-modifiers-label">伤害修正</div>
              {#each combatPreview.attackModifiers as mod}
                <span class="preview-mod-tag" style="border-color: {mod.color}; color: {mod.color}">
                  {mod.label} {mod.value}
                </span>
              {/each}
            </div>
          {/if}
          {#if combatPreview.terrainModifiers.length > 0}
            <div class="combat-preview-modifiers">
              <div class="preview-modifiers-label">地形与反击</div>
              {#each combatPreview.terrainModifiers as mod}
                <span class="preview-mod-tag" style="border-color: {mod.color}; color: {mod.color}">
                  {mod.label} {mod.value}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      <div class="unit-status">
        {#if selectedUnitData.hasMoved}
          <span class="status-tag moved">已移动</span>
        {/if}
        {#if selectedUnitData.hasAttacked}
          <span class="status-tag attacked">已攻击</span>
        {/if}
        {#if isHardCC(selectedUnitData)}
          <span class="status-tag hard-cc">硬控中</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="bottom-panel">
    <div class="hand-cards">
      <span class="hand-label">手牌 ({handCards?.length || 0}/{cardConfig.maxHandSize})</span>
      <div class="cards-container">
        {#each handCards || [] as card (card.instanceId)}
          <div
            class="card"
            role="button"
            tabindex="0"
            aria-label={card.name}
            class:selected={state?.selectedCardId === card.instanceId}
            class:unplayable={!isCardPlayable(card) && !isCardActive(card)}
            class:active={isCardActive(card)}
            style="border-color: {CARD_CATEGORY_COLORS[card.category]}"
            on:click={() => handleSelectCard(card)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardKeydown(card)}
            title={isCardPlayable(card) ? card.description : `${card.description}\n[${getCardUnplayableReason(card)}]`}
          >
            <div class="card-category-badge" style="background: {CARD_CATEGORY_COLORS[card.category]}">
              {CARD_CATEGORY_LABELS[card.category]}
            </div>
            <div class="card-cost" title="能量消耗">⚡{card.cost}</div>
            {#if isCardActive(card)}
              <div class="card-duration" title="剩余持续时间">
                ⏱️ {card.remainingDuration}
              </div>
            {/if}
            <div class="card-icon">{card.icon}</div>
            <div class="card-name">{card.name}</div>
            <div class="card-type">
              {#if isCardActive(card)}
                <span class="card-state-tag">{getCardStateLabel(card)}</span>
              {:else}
                {getCardTypeLabel(card.type)}
              {/if}
            </div>
            {#if !isCardPlayable(card) && !isCardActive(card)}
              <div class="card-overlay">
                <span class="card-unplayable-text">{getCardUnplayableReason(card)}</span>
              </div>
            {/if}
            {#if isCardActive(card)}
              <div class="card-active-glow"></div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    <div class="action-buttons">
      <button
        class="btn btn-primary btn-large"
        on:click={handleEndTurn}
        disabled={state?.gameOver}
      >
        结束回合
      </button>
    </div>
  </div>
</div>

<style>
  .game-ui {
    position: relative;
    z-index: 10;
    pointer-events: none;
  }

  .game-ui :global(button) {
    pointer-events: auto;
  }

  .game-ui :global(.card) {
    pointer-events: auto;
  }

  .game-ui :global(.records-overlay) {
    pointer-events: auto;
  }

  .game-ui :global(.game-over-overlay) {
    pointer-events: auto;
  }

  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: rgba(26, 26, 46, 0.95);
    border-bottom: 2px solid #3498db;
    color: white;
  }

  .turn-info {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .turn-label {
    font-size: 14px;
    color: #888;
  }

  .turn-number {
    font-size: 24px;
    font-weight: bold;
    color: #f1c40f;
  }

  .reveal-tag {
    background: #9b59b6;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .faction-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .current-faction {
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 10px currentColor;
  }

  .energy-bar-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.3);
    padding: 4px 12px;
    border-radius: 20px;
  }

  .energy-icon {
    font-size: 16px;
  }

  .energy-bar {
    width: 120px;
    height: 10px;
    background: #333;
    border-radius: 5px;
    overflow: hidden;
  }

  .energy-fill {
    height: 100%;
    background: linear-gradient(90deg, #f39c12, #f1c40f);
    transition: width 0.3s ease;
  }

  .energy-text {
    font-size: 12px;
    font-weight: bold;
    color: #f1c40f;
    min-width: 50px;
    text-align: center;
  }

  .cooldown-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 20px;
    background: rgba(155, 89, 182, 0.2);
    border-bottom: 1px solid #9b59b6;
    color: white;
    flex-wrap: wrap;
  }

  .cooldown-label {
    font-size: 12px;
    color: #bb8fce;
    font-weight: bold;
  }

  .cooldown-tag {
    background: rgba(155, 89, 182, 0.4);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    border: 1px solid #9b59b6;
  }

  .top-actions {
    display: flex;
    gap: 10px;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-primary {
    background: #3498db;
    color: white;
  }

  .btn-primary:hover {
    background: #2980b9;
  }

  .btn-secondary {
    background: #2c3e50;
    color: white;
  }

  .btn-secondary:hover {
    background: #34495e;
  }

  .btn-danger {
    background: #e74c3c;
    color: white;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-large {
    padding: 12px 30px;
    font-size: 16px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .message-bar {
    position: absolute;
    top: 90px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 20px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    border-radius: 20px;
    font-size: 13px;
    z-index: 100;
    max-width: 80%;
    text-align: center;
    line-height: 1.5;
  }

  .status-message-bar {
    position: absolute;
    top: 140px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 16px;
    background: rgba(155, 89, 182, 0.9);
    color: white;
    border-radius: 16px;
    font-size: 11px;
    z-index: 99;
    max-width: 70%;
    text-align: center;
    line-height: 1.6;
    animation: statusMsgFade 4s ease-out forwards;
  }

  @keyframes statusMsgFade {
    0%, 70% { opacity: 1; }
    100% { opacity: 0.6; }
  }

  .base-status-panel {
    position: absolute;
    right: 20px;
    top: 110px;
    width: 180px;
    background: rgba(26, 26, 46, 0.95);
    border: 2px solid #3498db;
    border-radius: 8px;
    padding: 10px 12px;
    color: white;
    z-index: 50;
  }

  .base-status-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 8px;
    color: #f1c40f;
    border-bottom: 1px solid #333;
    padding-bottom: 5px;
  }

  .base-status-item {
    margin-bottom: 8px;
    font-size: 11px;
  }

  .base-faction {
    font-weight: bold;
    display: block;
    margin-bottom: 3px;
  }

  .base-durability-bar {
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 2px;
  }

  .base-durability-fill {
    height: 100%;
    transition: width 0.3s;
  }

  .base-durability-text {
    font-size: 10px;
    color: #888;
  }

  .base-capture-text {
    font-size: 10px;
    font-weight: bold;
    margin-left: 8px;
  }

  .game-over-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .game-over-content {
    text-align: center;
    color: white;
    background: #1a1a2e;
    padding: 40px 60px;
    border-radius: 10px;
    border: 2px solid #3498db;
    max-width: 400px;
  }

  .game-over-content h2 {
    font-size: 32px;
    margin: 0 0 20px 0;
  }

  .winner {
    font-size: 28px;
    font-weight: bold;
    margin: 0 0 10px 0;
    text-shadow: 0 0 20px currentColor;
  }

  .condition {
    color: #888;
    margin: 0 0 10px 0;
  }

  .stat-line {
    color: #666;
    margin: 0 0 30px 0;
    font-size: 13px;
  }

  .records-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .records-panel {
    background: #1a1a2e;
    border-radius: 10px;
    border: 2px solid #3498db;
    width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .records-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    border-bottom: 1px solid #333;
  }

  .records-header h3 {
    margin: 0;
    color: white;
  }

  .btn-close {
    background: none;
    border: none;
    color: #888;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    line-height: 1;
  }

  .btn-close:hover {
    color: white;
  }

  .records-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .empty {
    color: #666;
    text-align: center;
    padding: 30px;
  }

  .record-item {
    padding: 10px;
    border-bottom: 1px solid #222;
  }

  .record-winner {
    font-weight: bold;
    font-size: 16px;
  }

  .record-info {
    display: flex;
    gap: 15px;
    font-size: 12px;
    color: #888;
    margin: 4px 0;
  }

  .record-date {
    font-size: 11px;
    color: #666;
  }

  .unit-panel {
    position: absolute;
    left: 20px;
    top: 110px;
    width: 220px;
    background: rgba(26, 26, 46, 0.95);
    border: 2px solid #3498db;
    border-radius: 8px;
    padding: 15px;
    color: white;
    z-index: 50;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }

  .unit-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
  }

  .unit-icon {
    font-size: 28px;
  }

  .unit-name {
    flex: 1;
    font-weight: bold;
    font-size: 16px;
  }

  .unit-faction {
    font-size: 12px;
  }

  .unit-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stat-label {
    font-size: 12px;
    color: #888;
    width: 30px;
  }

  .stat-bar {
    flex: 1;
    height: 8px;
    background: #333;
    border-radius: 4px;
    overflow: hidden;
  }

  .stat-fill {
    height: 100%;
    transition: width 0.3s;
  }

  .stat-fill.hp {
    background: #2ecc71;
  }

  .stat-fill.morale {
    background: linear-gradient(90deg, #e74c3c 0%, #f1c40f 50%, #2ecc71 100%);
  }

  .morale-tier {
    margin-top: 4px;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .streak-tag {
    background: linear-gradient(90deg, #e74c3c, #f39c12);
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    margin-left: auto;
  }

  .morale-summary {
    margin: 15px 0 25px 0;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.8;
  }

  .record-morale {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-top: 4px;
    font-weight: bold;
  }

  .record-replay-btn {
    margin-top: 8px;
    width: 100%;
  }

  .battle-log-panel,
  .replay-panel {
    width: 520px;
    max-width: 90vw;
  }

  .replay-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #ccc;
    margin-left: 12px;
    flex: 1;
  }

  .battle-log-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .battle-log-turn-group {
    margin-bottom: 12px;
    border-radius: 6px;
    overflow: hidden;
  }

  .battle-log-turn-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid #333;
  }

  .turn-badge {
    font-size: 13px;
    font-weight: bold;
    color: #f1c40f;
  }

  .faction-badge {
    font-size: 12px;
    font-weight: bold;
  }

  .battle-log-actions {
    background: rgba(0, 0, 0, 0.2);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .battle-log-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    border-left: 3px solid #999;
  }

  .log-type-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }

  .log-content {
    flex: 1;
    min-width: 0;
  }

  .log-description {
    font-size: 12px;
    color: #ddd;
    line-height: 1.4;
    word-break: break-all;
  }

  .log-details {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .log-detail-tag {
    font-size: 10px;
    padding: 1px 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #aaa;
  }

  .log-detail-tag.kill-tag {
    background: rgba(231, 76, 60, 0.3);
    color: #e74c3c;
    font-weight: bold;
  }

  .log-detail-tag.shield-tag {
    background: rgba(52, 152, 219, 0.3);
    color: #3498db;
  }

  .log-detail-tag.heal-tag {
    background: rgba(46, 204, 113, 0.3);
    color: #2ecc71;
  }

  .log-detail-tag.bleed-tag {
    background: rgba(192, 57, 43, 0.3);
    color: #c0392b;
  }

  .log-detail-tag.status-tag {
    background: rgba(142, 68, 173, 0.3);
    color: #9b59b6;
  }

  .stat-value {
    font-size: 12px;
    min-width: 50px;
    text-align: right;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .terrain-info {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #333;
    font-size: 12px;
    color: #888;
    line-height: 1.5;
  }

  .base-detail {
    margin-top: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 11px;
  }

  .base-repair-hint,
  .base-capture-hint {
    margin-top: 4px;
    font-size: 10px;
    color: #666;
  }

  .info-label {
    font-size: 10px;
    color: #888;
    width: 100%;
    margin-bottom: 4px;
    font-weight: bold;
    border-bottom: 1px dashed #333;
    padding-bottom: 2px;
  }

  .buffs-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .buff-tag {
    background: #9b59b6;
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
  }

  .status-effects-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .status-effect-tag {
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
  }

  .resistances-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .resistance-tag {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
  }

  .immunities-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .immunity-tag {
    background: linear-gradient(135deg, #8e44ad, #9b59b6);
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
    border: 1px solid #d4af37;
  }

  .counter-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .counter-advantage-tag {
    background: linear-gradient(135deg, #1b5e20, #2e7d32);
    color: #a5d6a7;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
    border: 1px solid #4caf50;
  }

  .counter-weakness-tag {
    background: linear-gradient(135deg, #b71c1c, #c62828);
    color: #ef9a9a;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
    border: 1px solid #ef5350;
  }

  .synergy-info {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .synergy-tag {
    background: linear-gradient(135deg, #0d47a1, #1565c0);
    color: #90caf9;
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: bold;
    cursor: help;
    border: 1px solid #42a5f5;
  }

  .combat-preview {
    margin-top: 10px;
    padding: 8px;
    border: 1px solid #e74c3c;
    border-radius: 6px;
    background: rgba(231, 76, 60, 0.08);
  }

  .combat-preview-title {
    font-size: 12px;
    font-weight: bold;
    color: #e74c3c;
    margin-bottom: 6px;
    text-align: center;
    border-bottom: 1px dashed rgba(231, 76, 60, 0.3);
    padding-bottom: 4px;
  }

  .combat-preview-target {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .preview-target-icon {
    font-size: 14px;
  }

  .preview-target-name {
    font-size: 12px;
    font-weight: bold;
    color: #ddd;
  }

  .preview-target-hp {
    margin-left: auto;
    font-size: 10px;
    color: #aaa;
  }

  .combat-preview-damage {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }

  .preview-damage-label {
    font-size: 10px;
    color: #888;
    min-width: 50px;
  }

  .preview-damage-value {
    font-size: 16px;
    font-weight: bold;
  }

  .preview-hp-after {
    font-size: 11px;
    font-weight: bold;
  }

  .combat-preview-counter {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .combat-preview-no-counter {
    opacity: 0.6;
  }

  .preview-counter-label {
    font-size: 10px;
    color: #888;
    min-width: 50px;
  }

  .preview-counter-value {
    font-size: 14px;
    font-weight: bold;
  }

  .preview-counter-after {
    font-size: 11px;
    font-weight: bold;
  }

  .combat-preview-modifiers {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .preview-modifiers-label {
    font-size: 9px;
    color: #666;
    width: 100%;
    margin-bottom: 2px;
    border-bottom: 1px dotted #333;
    padding-bottom: 1px;
  }

  .preview-mod-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid;
    font-weight: bold;
    white-space: nowrap;
  }

  .unit-status {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
  }

  .status-tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
  }

  .status-tag.moved {
    background: #f39c12;
    color: white;
  }

  .status-tag.attacked {
    background: #e74c3c;
    color: white;
  }

  .status-tag.hard-cc {
    background: #c0392b;
    color: white;
    animation: hardCCPulse 1s ease-in-out infinite;
  }

  @keyframes hardCCPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .bottom-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(26, 26, 46, 0.95);
    border-top: 2px solid #3498db;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .hand-cards {
    flex: 1;
  }

  .hand-label {
    color: #888;
    font-size: 12px;
    margin-bottom: 8px;
    display: block;
  }

  .cards-container {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .card {
    width: 90px;
    min-height: 120px;
    background: #2c3e50;
    border: 2px solid #3498db;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: white;
    outline: none;
    position: relative;
    overflow: hidden;
  }

  .card:hover,
  .card:focus {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
  }

  .card.selected {
    border-color: #e74c3c !important;
    box-shadow: 0 0 15px rgba(231, 76, 60, 0.5);
    transform: translateY(-5px);
  }

  .card.unplayable {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.5);
  }

  .card.unplayable:hover {
    transform: none;
  }

  .card.active {
    animation: cardPulse 2s ease-in-out infinite;
    cursor: default;
  }

  .card.active:hover {
    transform: none;
    box-shadow: 0 0 20px rgba(46, 204, 113, 0.5);
  }

  @keyframes cardPulse {
    0%, 100% {
      box-shadow: 0 0 10px rgba(46, 204, 113, 0.4);
    }
    50% {
      box-shadow: 0 0 25px rgba(46, 204, 113, 0.7);
    }
  }

  .card-duration {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 10px;
    padding: 2px 5px;
    background: rgba(46, 204, 113, 0.9);
    color: white;
    border-radius: 0 0 0 4px;
    font-weight: bold;
  }

  .card-state-tag {
    color: #2ecc71;
    font-weight: bold;
  }

  .card-active-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid #2ecc71;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0.6;
  }

  .card-category-badge {
    position: absolute;
    top: 0;
    left: 0;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 0 0 4px 0;
    font-weight: bold;
  }

  .card-cost {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 10px;
    padding: 2px 5px;
    background: rgba(241, 196, 15, 0.9);
    color: #1a1a2e;
    border-radius: 0 0 0 4px;
    font-weight: bold;
  }

  .card-icon {
    font-size: 26px;
    margin-top: 14px;
    margin-bottom: 4px;
  }

  .card-name {
    font-size: 11px;
    font-weight: bold;
    text-align: center;
    line-height: 1.2;
  }

  .card-type {
    font-size: 9px;
    color: #888;
    margin-top: auto;
  }

  .card-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .card-unplayable-text {
    font-size: 9px;
    color: #e74c3c;
    text-align: center;
    padding: 4px;
    font-weight: bold;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { gameState, selectedUnit, currentHand, currentEnergy, currentCooldowns } from '$lib/stores/gameStore';
  import { unitConfig } from '$lib/config/unitConfig';
  import { gameRules } from '$lib/config/gameRules';
  import { cardConfig, CARD_CATEGORY_LABELS, CARD_CATEGORY_COLORS, eventCards } from '$lib/config/eventCardConfig';
  import { getTerrain, getMoraleTier, settleBases, checkVictory } from '$lib/utils/gameLogic';
  import { drawCard, drawInitialHand, canAffordCard } from '$lib/utils/cardSystem';
  import { saveGameRecord, getGameRecords, clearGameRecords, formatDate } from '$lib/utils/storage';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../utils/cardSystem').EventCard} EventCard
   * @typedef {import('../utils/cardSystem').CooldownEntry} CooldownEntry
   * @typedef {import('../stores/gameStore').GameState} GameState
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
      avgMoraleLoser
    };
    saveGameRecord(record);
    records = /** @type {GameRecord[]} */ (getGameRecords());
  }

  function handleEndTurn() {
    if (!state || state.gameOver) return;
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
    switch (card.effect.type) {
      case 'heal':
      case 'attackBoost':
      case 'defenseBoost':
      case 'moveBoost':
      case 'doubleAttack':
      case 'counterAttack':
      case 'shield':
        return `已选中 ${card.name}，请点击己方单位使用（也可先选中单位再选卡）`;
      case 'damage':
      case 'stun':
        return `已选中 ${card.name}，请点击敌方单位使用`;
      case 'terrainChange':
        return `已选中 ${card.name}，请点击任意非基地格子改变地形`;
      case 'summon':
        return `已选中 ${card.name}，点击任意位置确认召唤（需基地为空）`;
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
          {#each selectedUnitData.buffs as buff (buff.type)}
            <span class="buff-tag">{getBuffName(String(buff.type))}({buff.duration}回合)</span>
          {/each}
        </div>
      {/if}
      <div class="unit-status">
        {#if selectedUnitData.hasMoved}
          <span class="status-tag moved">已移动</span>
        {/if}
        {#if selectedUnitData.hasAttacked}
          <span class="status-tag attacked">已攻击</span>
        {/if}
        {#if selectedUnitData.stunned > 0}
          <span class="status-tag stunned">眩晕({selectedUnitData.stunned})</span>
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
    width: 200px;
    background: rgba(26, 26, 46, 0.95);
    border: 2px solid #3498db;
    border-radius: 8px;
    padding: 15px;
    color: white;
    z-index: 50;
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

  .status-tag.stunned {
    background: #9b59b6;
    color: white;
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

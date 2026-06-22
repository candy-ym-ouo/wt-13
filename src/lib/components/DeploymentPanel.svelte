<script>
  import { gameState, deploymentState, isDeploymentPhase, deployingFaction, currentHand, currentEnergy } from '$lib/stores/gameStore';
  import { gameRules } from '$lib/config/gameRules';
  import { validateAllUnitsDeployed, canMulligan } from '$lib/utils/gameLogic';
  import { unitConfig } from '$lib/config/unitConfig';
  import { CARD_RARITY_COLORS, CARD_CATEGORY_LABELS } from '$lib/config/eventCardConfig';
  import { legionStore } from '$lib/stores/legionStore.js';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../utils/cardSystem').EventCard} EventCard
   * @typedef {import('../stores/gameStore').GameState} GameState
   */

  /** @type {import('../stores/gameStore').DeploymentState | null} */
  $: deployment = $deploymentState;
  $: isDeploying = $isDeploymentPhase;
  /** @type {'red' | 'blue' | null} */
  $: faction = /** @type {'red' | 'blue' | null} */ ($deployingFaction);
  /** @type {import('../utils/cardSystem').EventCard[]} */
  $: hand = $currentHand;
  /** @type {import('../stores/gameStore').GameState} */
  $: state = $gameState;
  $: factionIdx = faction === 'red' ? 0 : 1;
  $: mulliganUsed = deployment?.mulliganUsed?.[factionIdx] || 0;
  $: canMull = canMulligan(mulliganUsed);
  $: maxMull = gameRules.deployment?.maxMulligan || 2;
  $: factionName = faction === 'red' ? '红方' : '蓝方';
  $: factionColor = faction === 'red' ? '#e74c3c' : '#3498db';
  $: canConfirm = state.gamePhase === 'deploymentComplete';
  $: unitsReady = faction ? validateAllUnitsDeployed(/** @type {'red' | 'blue'} */ (faction), state.units).valid : true;

  function handleReady() {
    if (!faction) return;
    const validation = validateAllUnitsDeployed(/** @type {'red' | 'blue'} */ (faction), state.units);
    if (!validation.valid) {
      alert(`布阵验证失败：${validation.reason}`);
      return;
    }
    gameState.deploymentReady(/** @type {'red' | 'blue'} */ (faction));
  }

  function handleMulligan(/** @type {number} */ index) {
    if (!faction || !canMull) return;
    const unlockedCardIds = $legionStore.unlockedCards || [];
    gameState.deploymentMulligan(/** @type {'red' | 'blue'} */ (faction), index, unlockedCardIds);
  }

  function handleStartGame() {
    gameState.deploymentStartGame();
  }

  function getCardRarityColor(/** @type {string} */ rarity) {
    return CARD_RARITY_COLORS[/** @type {keyof typeof CARD_RARITY_COLORS} */ (rarity)] || '#95a5a6';
  }

  function getCardTypeLabel(/** @type {string} */ type) {
    return CARD_CATEGORY_LABELS[/** @type {keyof typeof CARD_CATEGORY_LABELS} */ (type)] || '事件';
  }
</script>

{#if isDeploying && state.gamePhase !== 'deploymentComplete'}
  <div class="deployment-panel">
    <div class="deployment-header" style="border-color: {factionColor}">
      <h2 style="color: {factionColor}">
        {factionName} 布阵阶段
      </h2>
      <div class="phase-status">
        <span class="status-dot {deployment?.redReady ? 'ready' : ''}"></span>
        <span>红方{deployment?.redReady ? '已就绪' : '布军中'}</span>
        <span class="vs">VS</span>
        <span>蓝方{deployment?.blueReady ? '已就绪' : '布军中'}</span>
        <span class="status-dot {deployment?.blueReady ? 'ready' : ''}"></span>
      </div>
    </div>

    <div class="deployment-body">
      <div class="section">
        <h3>📋 单位布阵</h3>
        <div class="instruction">
          点击己方单位后，在高亮区域内点击目标位置移动单位
        </div>
        <div class="unit-list">
          {#each state.units.filter((/** @type {Unit} */ u) => u.faction === faction) as unit}
            <div
              role="button"
              tabindex="0"
              class="unit-item {deployment?.selectedUnitId === unit.id ? 'selected' : ''}"
              style="border-color: {unit.id === deployment?.selectedUnitId ? factionColor : 'transparent'}"
              on:click={() => gameState.selectUnit(unit.id)}
              on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && gameState.selectUnit(unit.id)}
            >
              <span class="unit-icon">
                {/** @type {any} */ (unitConfig)[unit.type]?.icon || '⚔️'}
              </span>
              <span class="unit-name">{unitConfig[unit.type]?.name || unit.type}</span>
              <span class="unit-pos">({unit.x},{unit.y})</span>
            </div>
          {/each}
        </div>
        {#if !unitsReady}
          <div class="warning">
            ⚠️ 部分单位位于布阵区域外，请调整
          </div>
        {/if}
      </div>

      <div class="section">
        <h3>🎴 首回合手牌策略</h3>
        <div class="mulligan-info">
          重抽次数：{mulliganUsed}/{maxMull}
          {#if canMull}
            <span class="hint">（点击卡牌可重抽）</span>
          {:else}
            <span class="hint used">（重抽次数已用完）</span>
          {/if}
        </div>
        <div class="hand-cards">
          {#each hand as card, index}
            <div
              role="button"
              tabindex="0"
              class="hand-card {canMull ? 'can-mulligan' : ''}"
              style="border-left-color: {getCardRarityColor(card.rarity)}"
              on:click={() => canMull && handleMulligan(index)}
              on:keydown={(e) => canMull && (e.key === 'Enter' || e.key === ' ') && handleMulligan(index)}
              aria-disabled={!canMull}
            >
              <div class="card-cost">{card.cost}</div>
              <div class="card-info">
                <div class="card-name">{card.name}</div>
                <div class="card-type">{getCardTypeLabel(card.category)}</div>
              </div>
              {#if canMull}
                <div class="card-action">↻ 重抽</div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="deployment-footer">
      <button
        class="ready-btn"
        style="background: {unitsReady ? factionColor : '#95a5a6'}"
        disabled={!unitsReady}
        on:click={handleReady}
      >
        {unitsReady ? '✓ 确认布阵' : '请完成单位布阵'}
      </button>
    </div>
  </div>
{/if}

{#if state.gamePhase === 'deploymentComplete'}
  <div class="deployment-panel complete">
    <div class="deployment-header">
      <h2>双方布阵完成</h2>
      <div class="ready-both">
        <span class="check">✓</span> 红方已就绪
        <span class="check">✓</span> 蓝方已就绪
      </div>
    </div>
    <div class="deployment-body">
      <div class="final-check">
        <div class="check-item">
          <span>红方单位数：</span>
          <strong>{state.units.filter((/** @type {Unit} */ u) => u.faction === 'red').length}</strong>
        </div>
        <div class="check-item">
          <span>蓝方单位数：</span>
          <strong>{state.units.filter((/** @type {Unit} */ u) => u.faction === 'blue').length}</strong>
        </div>
        <div class="check-item">
          <span>红方手牌数：</span>
          <strong>{state.hands.red.length}</strong>
        </div>
        <div class="check-item">
          <span>蓝方手牌数：</span>
          <strong>{state.hands.blue.length}</strong>
        </div>
      </div>
    </div>
    <div class="deployment-footer">
      <button class="start-btn" on:click={handleStartGame}>
        ⚔️ 开始战斗
      </button>
    </div>
  </div>
{/if}

<style>
  .deployment-panel {
    position: fixed;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 360px;
    max-height: 85vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #3498db;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(52, 152, 219, 0.2);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .deployment-panel.complete {
    border-color: #f39c12;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(243, 156, 18, 0.3);
  }

  .deployment-header {
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid;
  }

  .deployment-header h2 {
    margin: 0 0 10px 0;
    font-size: 1.4rem;
    text-align: center;
  }

  .phase-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 0.9rem;
    color: #bdc3c7;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #e74c3c;
    animation: pulse 1.5s infinite;
  }

  .status-dot.ready {
    background: #2ecc71;
    animation: none;
  }

  .vs {
    font-weight: bold;
    color: #f39c12;
    margin: 0 5px;
  }

  .deployment-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .section {
    margin-bottom: 25px;
  }

  .section h3 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #ecf0f1;
  }

  .instruction {
    font-size: 0.85rem;
    color: #95a5a6;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(52, 152, 219, 0.1);
    border-radius: 8px;
    border-left: 3px solid #3498db;
  }

  .unit-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .unit-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  .unit-item.selected {
    background: rgba(52, 152, 219, 0.2);
    box-shadow: 0 0 15px rgba(52, 152, 219, 0.4);
  }

  .unit-icon {
    font-size: 1.4rem;
  }

  .unit-name {
    flex: 1;
    color: #ecf0f1;
    font-weight: 500;
  }

  .unit-pos {
    font-family: monospace;
    color: #95a5a6;
    font-size: 0.9rem;
  }

  .warning {
    margin-top: 10px;
    padding: 10px;
    background: rgba(231, 76, 60, 0.15);
    border: 1px solid #e74c3c;
    border-radius: 8px;
    color: #e74c3c;
    font-size: 0.85rem;
  }

  .mulligan-info {
    font-size: 0.9rem;
    color: #bdc3c7;
    margin-bottom: 12px;
  }

  .hint {
    color: #2ecc71;
    margin-left: 8px;
  }

  .hint.used {
    color: #e74c3c;
  }

  .hand-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hand-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 4px solid #95a5a6;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .hand-card.can-mulligan {
    cursor: pointer;
  }

  .hand-card.can-mulligan:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  .card-cost {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3498db;
    color: white;
    border-radius: 50%;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .card-info {
    flex: 1;
  }

  .card-name {
    color: #ecf0f1;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .card-type {
    color: #95a5a6;
    font-size: 0.8rem;
  }

  .card-action {
    color: #f39c12;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .deployment-footer {
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ready-btn, .start-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ready-btn {
    background: #95a5a6;
  }

  .ready-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ready-btn:not(:disabled):hover,
  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  }

  .start-btn {
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  }

  .ready-both {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: #2ecc71;
    font-size: 1rem;
  }

  .check {
    font-weight: bold;
    margin-right: 5px;
  }

  .final-check {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .check-item {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #bdc3c7;
  }

  .check-item strong {
    color: #ecf0f1;
    font-size: 1.2rem;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>

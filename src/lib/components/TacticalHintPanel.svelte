<script>
  import { onMount, onDestroy } from 'svelte';
  import { gameState, selectedUnit, currentHand, currentEnergy, currentCooldowns } from '$lib/stores/gameStore';
  import { unitConfig, getStatusInfo } from '$lib/config/unitConfig';
  import { analyzeTactics, getTacticalScoreColor, getTacticalScoreLabel } from '$lib/utils/tacticalHint';
  import { eventCards } from '$lib/config/eventCardConfig';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../utils/cardSystem').EventCard} EventCard
   * @typedef {import('../stores/gameStore').GameState} GameState
   */

  /** @type {GameState | null} */
  let state = null;
  /** @type {Unit | null} */
  let selectedUnitData = null;
  /** @type {EventCard[]} */
  let handCards = [];
  let energy = 0;
  /** @type {any[]} */
  let cooldowns = [];
  let showPanel = true;
  let activeTab = 'overview';

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

  $: tacticalAnalysis = analyzeTactics(selectedUnitData, state, handCards, energy, cooldowns);

  onMount(() => {
    unsubscribeState = gameState.subscribe(/** @param {GameState} s */ s => {
      state = s;
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
    unsubscribeCooldowns = currentCooldowns.subscribe(/** @param {any[]} c */ c => {
      cooldowns = c;
    });
  });

  onDestroy(() => {
    if (unsubscribeState) unsubscribeState();
    if (unsubscribeSelected) unsubscribeSelected();
    if (unsubscribeHand) unsubscribeHand();
    if (unsubscribeEnergy) unsubscribeEnergy();
    if (unsubscribeCooldowns) unsubscribeCooldowns();
  });

  /**
   * @param {string} cardInstanceId
   * @returns {EventCard | undefined}
   */
  function getCardById(cardInstanceId) {
    return handCards.find(c => c.instanceId === cardInstanceId || c.id === cardInstanceId);
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getCardTypeLabel(type) {
    /** @type {Record<string, string>} */
    const labels = {
      heal: '治疗',
      attackBoost: '攻强',
      defenseBoost: '防强',
      moveBoost: '机动',
      damage: '伤害',
      stun: '眩晕',
      freeze: '冰冻',
      slow: '减速',
      poison: '中毒',
      burn: '燃烧',
      bleed: '流血',
      doubleAttack: '连击',
      summon: '召唤',
      reveal: '侦查',
      shield: '护盾',
      cleanse: '净化',
      terrainChange: '改地',
      tileEffect: '地效',
      statusResistBoost: '抗状',
      counterAttack: '反击',
      healBlock: '禁疗',
      silence: '沉默'
    };
    return labels[type] || type;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getCardTypeColor(type) {
    /** @type {Record<string, string>} */
    const colors = {
      heal: '#2ecc71',
      attackBoost: '#e74c3c',
      defenseBoost: '#3498db',
      moveBoost: '#1abc9c',
      damage: '#e74c3c',
      stun: '#9b59b6',
      freeze: '#00bcd4',
      slow: '#3498db',
      poison: '#27ae60',
      burn: '#e67e22',
      bleed: '#c0392b',
      doubleAttack: '#e74c3c',
      summon: '#1abc9c',
      reveal: '#9b59b6',
      shield: '#3498db',
      cleanse: '#2ecc71',
      terrainChange: '#27ae60',
      tileEffect: '#e67e22',
      statusResistBoost: '#f39c12',
      counterAttack: '#e67e22',
      healBlock: '#e74c3c',
      silence: '#7f8c8d'
    };
    return colors[type] || '#f1c40f';
  }

  function togglePanel() {
    showPanel = !showPanel;
  }
</script>

<div class="tactical-panel-wrapper">
  <button class="tactical-toggle-btn" on:click={togglePanel} title="战术提示">
    {showPanel ? '▶' : '◀'} 🎯 战术
  </button>

  {#if showPanel && tacticalAnalysis}
    <div class="tactical-panel">
      <div class="panel-header">
        <span class="panel-title">🎯 战术指挥中枢</span>
        <div class="threat-indicator" title="整体威胁等级">
          {#each Array.from({ length: 10 }) as _, i}
            <span
              class="threat-dot"
              style="background: {i < tacticalAnalysis.overallThreatLevel ? (i < 4 ? '#2ecc71' : i < 7 ? '#f1c40f' : '#e74c3c') : '#333'}"
            ></span>
          {/each}
          <span class="threat-text">威胁 Lv.{tacticalAnalysis.overallThreatLevel}</span>
        </div>
      </div>

      <div class="tab-buttons">
        <button
          class="tab-btn {activeTab === 'overview' ? 'active' : ''}"
          on:click={() => activeTab = 'overview'}
        >
          📋 总览
        </button>
        {#if selectedUnitData}
          <button
            class="tab-btn {activeTab === 'move' ? 'active' : ''}"
            on:click={() => activeTab = 'move'}
          >
            👟 移动({tacticalAnalysis.moveSuggestions.length})
          </button>
          <button
            class="tab-btn {activeTab === 'attack' ? 'active' : ''}"
            on:click={() => activeTab = 'attack'}
          >
            ⚔️ 攻击({tacticalAnalysis.attackSuggestions.length})
          </button>
        {/if}
        <button
          class="tab-btn {activeTab === 'cards' ? 'active' : ''}"
          on:click={() => activeTab = 'cards'}
        >
          🃏 卡牌({tacticalAnalysis.cardSuggestions.length})
        </button>
      </div>

      <div class="panel-content">
        {#if activeTab === 'overview'}
          <div class="overview-section">
            {#if tacticalAnalysis.generalTips.length > 0}
              <div class="tips-section">
                <div class="section-title">⚠️ 战场态势</div>
                {#each tacticalAnalysis.generalTips as tip, i}
                  <div class="tip-item" class:tip-important={i === 0}>
                    {tip}
                  </div>
                {/each}
              </div>
            {/if}

            {#if tacticalAnalysis.moveSuggestions.length > 0 && selectedUnitData}
              <div class="best-suggestion-section">
                <div class="section-title">⭐ 最优移动</div>
                {#each [tacticalAnalysis.moveSuggestions[0]] as bestMove}
                  <div class="suggestion-card best-card">
                    <div class="suggestion-header">
                      <span class="position-tag">({bestMove.x}, {bestMove.y})</span>
                      <span
                        class="score-badge"
                        style="background: {getTacticalScoreColor(bestMove.score)}"
                      >
                        {getTacticalScoreLabel(bestMove.score)} {bestMove.score}
                      </span>
                    </div>
                    <div class="suggestion-reason">{bestMove.reason}</div>
                    <div class="suggestion-tags">
                      {#each bestMove.tags as tag}
                        <span class="suggestion-tag move-tag">{tag}</span>
                      {/each}
                    </div>
                    <div class="suggestion-details">
                      <span>🛡️+{bestMove.defenseBonus}</span>
                      <span>😊+{bestMove.moraleBonus}</span>
                      <span>🎯覆盖{bestMove.attackCoverage}敌</span>
                      <span>⚠️威胁{bestMove.threatLevel}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if tacticalAnalysis.attackSuggestions.length > 0}
              <div class="best-suggestion-section">
                <div class="section-title">⚔️ 最优攻击</div>
                {#each [tacticalAnalysis.attackSuggestions[0]] as bestAttack}
                  <div class="suggestion-card best-card">
                    <div class="suggestion-header">
                      <span class="position-tag">
                        {unitConfig[/** @type {keyof typeof unitConfig} */ (state?.units.find(u => u.id === bestAttack.targetId)?.type || 'infantry')]?.name || '敌军'}
                        ({bestAttack.x}, {bestAttack.y})
                      </span>
                      <span
                        class="score-badge"
                        style="background: {getTacticalScoreColor(bestAttack.score)}"
                      >
                        {getTacticalScoreLabel(bestAttack.score)} {bestAttack.score}
                      </span>
                    </div>
                    <div class="suggestion-reason">{bestAttack.reason}</div>
                    <div class="suggestion-tags">
                      {#each bestAttack.tags as tag}
                        <span
                          class="suggestion-tag attack-tag"
                          class:tag-kill={tag === '击杀'}
                          class:tag-advantage={tag === '克制'}
                          class:tag-danger={bestAttack.counterWillKill || tag === '反杀风险'}
                        >{tag}</span>
                      {/each}
                    </div>
                    <div class="suggestion-details">
                      <span>💥伤害 {bestAttack.estimatedDamage}</span>
                      {#if bestAttack.willKill}
                        <span class="detail-kill">☠️击杀</span>
                      {/if}
                      {#if bestAttack.counterDamage > 0}
                        <span class="detail-counter">↩反击{bestAttack.counterDamage}</span>
                      {/if}
                      {#if bestAttack.counterWillKill}
                        <span class="detail-danger">⚠️被反杀</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if tacticalAnalysis.cardSuggestions.length > 0}
              <div class="best-suggestion-section">
                <div class="section-title">🃏 推荐卡牌</div>
                {#each [tacticalAnalysis.cardSuggestions[0]] as bestCard}
                  <div class="suggestion-card best-card">
                    <div class="suggestion-header">
                      <span class="card-icon">{getCardById(bestCard.cardInstanceId)?.icon || '🃏'}</span>
                      <span class="card-name">{getCardById(bestCard.cardInstanceId)?.name || bestCard.cardInstanceId}</span>
                      <span
                        class="score-badge"
                        style="background: {getTacticalScoreColor(bestCard.score)}"
                      >
                        {getTacticalScoreLabel(bestCard.score)} {bestCard.score}
                      </span>
                    </div>
                    <div class="suggestion-reason">{bestCard.reason}</div>
                    <div class="suggestion-tags">
                      <span
                        class="suggestion-tag card-tag"
                        style="border-color: {getCardTypeColor(bestCard.cardType)}; color: {getCardTypeColor(bestCard.cardType)}"
                      >
                        {getCardTypeLabel(bestCard.cardType)}
                      </span>
                      {#each bestCard.tags as tag}
                        <span class="suggestion-tag">{tag}</span>
                      {/each}
                    </div>
                    <div class="suggestion-details">
                      <span>⚡消耗 {bestCard.cost}</span>
                      <span class="card-target-hint">🎯 {bestCard.targetHint}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            {#if tacticalAnalysis.moveSuggestions.length === 0
              && tacticalAnalysis.attackSuggestions.length === 0
              && tacticalAnalysis.cardSuggestions.length === 0
              && tacticalAnalysis.generalTips.length === 0}
              <div class="empty-hint">
                <div class="empty-icon">🎯</div>
                <div>选择单位或查看卡牌以获取战术建议</div>
              </div>
            {/if}
          </div>
        {:else if activeTab === 'move' && tacticalAnalysis.moveSuggestions.length > 0}
          <div class="suggestions-list">
            {#each tacticalAnalysis.moveSuggestions as suggestion, i}
              <div class="suggestion-card" class:rank-1={i === 0} class:rank-2={i === 1} class:rank-3={i === 2}>
                <div class="suggestion-rank">{i + 1}</div>
                <div class="suggestion-content">
                  <div class="suggestion-header">
                    <span class="position-tag">({suggestion.x}, {suggestion.y})</span>
                    <span
                      class="score-badge"
                      style="background: {getTacticalScoreColor(suggestion.score)}"
                    >
                      {getTacticalScoreLabel(suggestion.score)} {suggestion.score}
                    </span>
                  </div>
                  <div class="suggestion-reason">{suggestion.reason}</div>
                  <div class="suggestion-tags">
                    {#each suggestion.tags as tag}
                      <span class="suggestion-tag move-tag">{tag}</span>
                    {/each}
                  </div>
                  <div class="suggestion-details">
                    <span>🛡️+{suggestion.defenseBonus}</span>
                    <span>😊+{suggestion.moraleBonus}</span>
                    <span>🎯覆盖{suggestion.attackCoverage}敌</span>
                    <span>⚠️威胁{suggestion.threatLevel}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if activeTab === 'attack' && tacticalAnalysis.attackSuggestions.length > 0}
          <div class="suggestions-list">
            {#each tacticalAnalysis.attackSuggestions as suggestion, i}
              {@const targetUnit = state?.units.find(u => u.id === suggestion.targetId)}
              <div class="suggestion-card" class:rank-1={i === 0} class:rank-2={i === 1} class:rank-3={i === 2}>
                <div class="suggestion-rank">{i + 1}</div>
                <div class="suggestion-content">
                  <div class="suggestion-header">
                    <span class="position-tag">
                      {unitConfig[/** @type {keyof typeof unitConfig} */ (targetUnit?.type || 'infantry')]?.name || '敌军'}
                      ({suggestion.x}, {suggestion.y})
                    </span>
                    <span
                      class="score-badge"
                      style="background: {getTacticalScoreColor(suggestion.score)}"
                    >
                      {getTacticalScoreLabel(suggestion.score)} {suggestion.score}
                    </span>
                  </div>
                  <div class="suggestion-reason">{suggestion.reason}</div>
                  <div class="suggestion-tags">
                    {#each suggestion.tags as tag}
                      <span
                        class="suggestion-tag attack-tag"
                        class:tag-kill={tag === '击杀'}
                        class:tag-advantage={tag === '克制'}
                        class:tag-danger={suggestion.counterWillKill || tag === '反杀风险'}
                      >{tag}</span>
                    {/each}
                  </div>
                  <div class="suggestion-details">
                    <span>💥伤害 {suggestion.estimatedDamage}</span>
                    {#if targetUnit}
                      <span>❤️{targetUnit.currentHp}/{targetUnit.maxHp}</span>
                    {/if}
                    {#if suggestion.willKill}
                      <span class="detail-kill">☠️击杀</span>
                    {/if}
                    {#if suggestion.counterDamage > 0}
                      <span class="detail-counter">↩反击{suggestion.counterDamage}</span>
                    {/if}
                    {#if suggestion.counterWillKill}
                      <span class="detail-danger">⚠️被反杀</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else if activeTab === 'cards' && tacticalAnalysis.cardSuggestions.length > 0}
          <div class="suggestions-list">
            {#each tacticalAnalysis.cardSuggestions as suggestion, i}
              {@const cardData = getCardById(suggestion.cardInstanceId)}
              <div class="suggestion-card" class:rank-1={i === 0} class:rank-2={i === 1} class:rank-3={i === 2}>
                <div class="suggestion-rank">{i + 1}</div>
                <div class="suggestion-content">
                  <div class="suggestion-header">
                    <span class="card-icon">{cardData?.icon || '🃏'}</span>
                    <span class="card-name">{cardData?.name || suggestion.cardInstanceId}</span>
                    <span
                      class="score-badge"
                      style="background: {getTacticalScoreColor(suggestion.score)}"
                    >
                      {getTacticalScoreLabel(suggestion.score)} {suggestion.score}
                    </span>
                  </div>
                  <div class="suggestion-reason">{suggestion.reason}</div>
                  <div class="suggestion-tags">
                    <span
                      class="suggestion-tag card-tag"
                      style="border-color: {getCardTypeColor(suggestion.cardType)}; color: {getCardTypeColor(suggestion.cardType)}"
                    >
                      {getCardTypeLabel(suggestion.cardType)}
                    </span>
                    {#each suggestion.tags as tag}
                      <span class="suggestion-tag">{tag}</span>
                    {/each}
                  </div>
                  <div class="suggestion-details">
                    <span>⚡消耗 {suggestion.cost}</span>
                    <span class="card-target-hint">🎯 {suggestion.targetHint}</span>
                  </div>
                  {#if cardData?.description}
                    <div class="card-desc">{cardData.description}</div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-hint">
            <div class="empty-icon">📭</div>
            <div>暂无可用的战术建议</div>
          </div>
        {/if}
      </div>

      <div class="panel-footer">
        <span class="footer-hint">💡 战术建议仅供参考，请根据实际战局灵活判断</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .tactical-panel-wrapper {
    position: absolute;
    left: 0;
    top: 110px;
    z-index: 60;
    display: flex;
    align-items: flex-start;
    pointer-events: auto;
  }

  .tactical-toggle-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 8px;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    height: auto;
    min-height: 120px;
    transition: all 0.3s;
    font-family: inherit;
    box-shadow: 2px 0 8px rgba(0,0,0,0.3);
  }

  .tactical-toggle-btn:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    padding-right: 12px;
  }

  .tactical-panel {
    width: 280px;
    max-height: 70vh;
    background: rgba(26, 26, 46, 0.98);
    border: 2px solid #667eea;
    border-left: none;
    border-radius: 0 12px 12px 0;
    color: white;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 4px 20px rgba(0,0,0,0.5);
    overflow: hidden;
  }

  .panel-header {
    padding: 10px 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-title {
    font-size: 14px;
    font-weight: bold;
  }

  .threat-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .threat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transition: all 0.3s;
  }

  .threat-text {
    font-size: 10px;
    margin-left: 4px;
    opacity: 0.9;
  }

  .tab-buttons {
    display: flex;
    background: rgba(0,0,0,0.3);
    padding: 4px;
    gap: 2px;
  }

  .tab-btn {
    flex: 1;
    padding: 6px 4px;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    border-radius: 6px;
    transition: all 0.2s;
    font-family: inherit;
    white-space: nowrap;
  }

  .tab-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #ccc;
  }

  .tab-btn.active {
    background: #667eea;
    color: white;
    font-weight: bold;
  }

  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
  }

  .panel-content::-webkit-scrollbar {
    width: 5px;
  }

  .panel-content::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
  }

  .panel-content::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 3px;
  }

  .overview-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tips-section {
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.3);
    border-radius: 8px;
    padding: 8px 10px;
  }

  .section-title {
    font-size: 12px;
    font-weight: bold;
    color: #f1c40f;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tip-item {
    font-size: 11px;
    padding: 4px 0;
    color: #ddd;
    line-height: 1.4;
  }

  .tip-item.tip-important {
    color: #f39c12;
    font-weight: bold;
  }

  .best-suggestion-section {
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: 8px;
    padding: 8px 10px;
  }

  .suggestion-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 8px 10px;
    position: relative;
    transition: all 0.2s;
  }

  .suggestion-card:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.2);
  }

  .suggestion-card.best-card {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
    border-color: #667eea;
  }

  .suggestion-card.rank-1 {
    border-left: 3px solid #f1c40f;
  }

  .suggestion-card.rank-2 {
    border-left: 3px solid #bdc3c7;
  }

  .suggestion-card.rank-3 {
    border-left: 3px solid #cd7f32;
  }

  .suggestion-rank {
    position: absolute;
    left: -2px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    background: #333;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: white;
  }

  .rank-1 .suggestion-rank {
    background: #f1c40f;
    color: #000;
  }

  .rank-2 .suggestion-rank {
    background: #bdc3c7;
    color: #000;
  }

  .rank-3 .suggestion-rank {
    background: #cd7f32;
    color: #000;
  }

  .suggestion-content {
    padding-left: 8px;
  }

  .suggestion-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    gap: 6px;
  }

  .position-tag {
    font-size: 12px;
    font-weight: bold;
    color: #3498db;
  }

  .card-icon {
    font-size: 16px;
  }

  .card-name {
    flex: 1;
    font-size: 12px;
    font-weight: bold;
    color: #9b59b6;
  }

  .score-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: bold;
    color: white;
    white-space: nowrap;
  }

  .suggestion-reason {
    font-size: 11px;
    color: #bbb;
    margin-bottom: 5px;
    line-height: 1.4;
  }

  .suggestion-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 5px;
  }

  .suggestion-tag {
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9px;
    background: rgba(255,255,255,0.1);
    color: #ccc;
    border: 1px solid rgba(255,255,255,0.15);
  }

  .suggestion-tag.move-tag {
    background: rgba(52, 152, 219, 0.2);
    border-color: rgba(52, 152, 219, 0.4);
    color: #5dade2;
  }

  .suggestion-tag.attack-tag {
    background: rgba(231, 76, 60, 0.2);
    border-color: rgba(231, 76, 60, 0.4);
    color: #ec7063;
  }

  .suggestion-tag.tag-kill {
    background: rgba(231, 76, 60, 0.4);
    border-color: #e74c3c;
    color: #fff;
    font-weight: bold;
  }

  .suggestion-tag.tag-advantage {
    background: rgba(46, 204, 113, 0.3);
    border-color: #2ecc71;
    color: #2ecc71;
    font-weight: bold;
  }

  .suggestion-tag.tag-danger {
    background: rgba(231, 76, 60, 0.5);
    border-color: #e74c3c;
    color: #fff;
    animation: dangerPulse 1s infinite;
  }

  @keyframes dangerPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .suggestion-tag.card-tag {
    background: transparent;
    font-weight: bold;
  }

  .suggestion-details {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 10px;
    color: #888;
  }

  .detail-kill {
    color: #e74c3c;
    font-weight: bold;
  }

  .detail-counter {
    color: #f39c12;
  }

  .detail-danger {
    color: #e74c3c;
    font-weight: bold;
    animation: dangerPulse 1s infinite;
  }

  .card-target-hint {
    color: #9b59b6;
    flex: 1;
  }

  .card-desc {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px dashed rgba(255,255,255,0.1);
    line-height: 1.3;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty-hint {
    text-align: center;
    padding: 30px 10px;
    color: #666;
  }

  .empty-icon {
    font-size: 36px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .panel-footer {
    padding: 6px 12px;
    background: rgba(0,0,0,0.3);
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  .footer-hint {
    font-size: 10px;
    color: #666;
    font-style: italic;
  }
</style>

<script>
  // @ts-nocheck
  import {
    cardDeckStore,
    activeDeck,
    activeDeckDetails,
    activeDeckStats,
    activeDeckValidation,
    unlockProgress
  } from '$lib/stores/cardDeckStore.js';
  import { eventCards, CARD_CATEGORY, CARD_CATEGORY_LABELS, CARD_CATEGORY_COLORS, CARD_RARITY, CARD_RARITY_LABELS, CARD_RARITY_COLORS, CARD_RARITY_BG, CARD_RARITY_ICONS } from '$lib/config/eventCardConfig.js';
  import { DECK_RULES, DECK_SLOTS, UNLOCK_CONDITIONS, canUnlockCard } from '$lib/config/cardDeckConfig.js';
  import { getDeckCardDetails, getDeckStats, validateDeck } from '$lib/utils/cardDeckSystem.js';

  export let show = false;
  export let mode = 'manage';
  export let onDeckSelected = null;
  export let onClose = null;

  let editingDeckId = null;
  let newDeckName = '';
  let filterRarity = 'all';
  let filterCategory = 'all';
  let showUnlockView = false;
  let selectedUnlockCard = null;

  $: editingDeck = editingDeckId ? $cardDeckStore.decks.find(d => d.id === editingDeckId) : null;
  $: editingDeckCardDetails = editingDeck ? getDeckCardDetails(editingDeck) : [];
  $: editingDeckStats = editingDeck ? getDeckStats(editingDeck) : null;
  $: editingDeckValidation = editingDeck ? validateDeck(editingDeck.cardIds, $cardDeckStore.unlockedCardIds) : { valid: false, errors: [], warnings: [] };

  $: filteredCards = eventCards.filter(card => {
    if (filterRarity !== 'all' && card.rarity !== filterRarity) return false;
    if (filterCategory !== 'all' && card.category !== filterCategory) return false;
    return true;
  });

  $: unlockedSet = new Set($cardDeckStore.unlockedCardIds);

  function selectDeck(deckId) {
    cardDeckStore.setActiveDeck(deckId);
  }

  function createNewDeck() {
    if (!newDeckName.trim()) return;
    cardDeckStore.createDeck(newDeckName.trim());
    newDeckName = '';
  }

  function deleteDeck(deckId) {
    if ($cardDeckStore.decks.length <= 1) return;
    cardDeckStore.deleteDeck(deckId);
    if (editingDeckId === deckId) {
      editingDeckId = null;
    }
  }

  function startEditing(deckId) {
    editingDeckId = deckId;
    showUnlockView = false;
  }

  function stopEditing() {
    editingDeckId = null;
  }

  function addCard(cardId) {
    if (!editingDeckId) return;
    cardDeckStore.addCard(editingDeckId, cardId);
  }

  function removeCard(cardId) {
    if (!editingDeckId) return;
    cardDeckStore.removeCard(editingDeckId, cardId);
  }

  function handleDeckSelect(deckId) {
    const result = cardDeckStore.selectDeckForBattle(deckId);
    if (onDeckSelected) {
      onDeckSelected(result);
    }
  }

  function handleClose() {
    if (onClose) onClose();
  }

  function handleUnlockCard(cardId) {
    const playerLevel = 10;
    const playerWins = 25;
    const playerGold = 5000;
    cardDeckStore.unlockCard(cardId, playerLevel, playerWins, playerGold);
  }

  function getCardCountInDeck(cardId) {
    if (!editingDeck) return 0;
    return editingDeck.cardIds.filter(id => id === cardId).length;
  }

  function canAddMore(cardId) {
    if (!editingDeck) return false;
    const card = eventCards.find(c => c.id === cardId);
    if (!card) return false;
    const currentCount = getCardCountInDeck(cardId);
    if (currentCount >= DECK_RULES.maxSameCard) return false;
    if (editingDeck.cardIds.length >= DECK_RULES.maxCards) return false;
    return true;
  }
</script>

{#if show}
  <div class="deck-overlay" on:click={handleClose}>
    <div class="deck-panel" on:click|stopPropagation>
      <div class="panel-header">
        <h2>🃏 军令卡组</h2>
        <div class="header-stats">
          <span class="deck-count">卡组: {$cardDeckStore.decks.length}/{DECK_SLOTS.maxDecks}</span>
          <span class="unlock-progress">解锁: {$unlockProgress.unlocked}/{$unlockProgress.total}</span>
        </div>
        <button class="close-btn" on:click={handleClose}>✕</button>
      </div>

      <div class="panel-tabs">
        <button
          class="tab-btn {!showUnlockView ? 'active' : ''}"
          on:click={() => { showUnlockView = false; }}
        >
          卡组构筑
        </button>
        <button
          class="tab-btn {showUnlockView ? 'active' : ''}"
          on:click={() => { showUnlockView = true; editingDeckId = null; }}
        >
          卡牌图鉴
        </button>
        {#if mode === 'battle'}
          <button class="tab-btn confirm-btn" on:click={() => handleDeckSelect($cardDeckStore.activeDeckId)}>
            确认出战
          </button>
        {/if}
      </div>

      {#if !showUnlockView}
        <div class="deck-content">
          <div class="deck-sidebar">
            <div class="deck-list">
              <h3>我的卡组</h3>
              {#each $cardDeckStore.decks as deck}
                <div
                  class="deck-item {deck.id === $cardDeckStore.activeDeckId ? 'active' : ''} {deck.id === editingDeckId ? 'editing' : ''}"
                  on:click={() => selectDeck(deck.id)}
                >
                  <div class="deck-item-header">
                    <span class="deck-name">{deck.name}</span>
                    {#if deck.id === $cardDeckStore.activeDeckId}
                      <span class="active-badge">出战</span>
                    {/if}
                  </div>
                  <div class="deck-item-info">
                    <span class="card-count">{deck.cardIds.length} 张</span>
                    {#if getDeckStats(deck)}
                      <span class="avg-cost">均耗 {getDeckStats(deck).averageCost}</span>
                    {/if}
                  </div>
                  <div class="deck-item-actions">
                    <button class="action-btn" on:click|stopPropagation={() => startEditing(deck.id)}>✏️</button>
                    <button class="action-btn delete" on:click|stopPropagation={() => deleteDeck(deck.id)} disabled={$cardDeckStore.decks.length <= 1}>🗑️</button>
                  </div>
                </div>
              {/each}

              {#if $cardDeckStore.decks.length < DECK_SLOTS.maxDecks}
                <div class="deck-item create-new">
                  <input
                    type="text"
                    bind:value={newDeckName}
                    placeholder="新卡组名称"
                    on:keydown={(e) => e.key === 'Enter' && createNewDeck()}
                  />
                  <button on:click={createNewDeck} disabled={!newDeckName.trim()}>+ 创建</button>
                </div>
              {/if}
            </div>

            {#if $activeDeck && !editingDeckId}
              <div class="active-deck-preview">
                <h3>当前出战: {$activeDeck.name}</h3>
                <div class="validation-status {validateDeck($activeDeck.cardIds, $cardDeckStore.unlockedCardIds).valid ? 'valid' : 'invalid'}">
                  {validateDeck($activeDeck.cardIds, $cardDeckStore.unlockedCardIds).valid ? '✅ 合法' : '⚠️ 不合规'}
                </div>
                {#if $activeDeckStats}
                  <div class="deck-stats-summary">
                    <span>即时: {$activeDeckStats.categoryCounts[CARD_CATEGORY.INSTANT] || 0}</span>
                    <span>持续: {$activeDeckStats.categoryCounts[CARD_CATEGORY.SUSTAIN] || 0}</span>
                    <span>反制: {$activeDeckStats.categoryCounts[CARD_CATEGORY.COUNTER] || 0}</span>
                  </div>
                  <div class="deck-rarity-summary">
                    <span style="color: {CARD_RARITY_COLORS[CARD_RARITY.BASIC]}">基础: {$activeDeckStats.rarityCounts[CARD_RARITY.BASIC] || 0}</span>
                    <span style="color: {CARD_RARITY_COLORS[CARD_RARITY.RARE]}">稀有: {$activeDeckStats.rarityCounts[CARD_RARITY.RARE] || 0}/{DECK_RULES.maxRareCards}</span>
                    <span style="color: {CARD_RARITY_COLORS[CARD_RARITY.LIMITED]}">限定: {$activeDeckStats.rarityCounts[CARD_RARITY.LIMITED] || 0}/{DECK_RULES.maxLimitedCards}</span>
                  </div>
                {/if}
                <div class="preview-cards">
                  {#each $activeDeckDetails as card, i}
                    <div class="preview-card" style="border-left: 3px solid {CARD_CATEGORY_COLORS[card.category]}">
                      <span class="card-icon">{card.icon}</span>
                      <span class="card-name">{card.name}</span>
                      <span class="card-cost">{card.cost}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <div class="deck-editor">
            {#if editingDeck}
              <div class="editor-header">
                <h3>编辑: {editingDeck.name}</h3>
                <div class="editor-stats">
                  <span class="{editingDeckValidation.valid ? 'valid' : 'invalid'}">
                    {editingDeck.cardIds.length}/{DECK_RULES.maxCards}
                  </span>
                  <button class="btn-done" on:click={stopEditing}>完成</button>
                </div>
              </div>

              {#if editingDeckValidation.errors.length > 0}
                <div class="validation-errors">
                  {#each editingDeckValidation.errors as error}
                    <div class="error-msg">❌ {error}</div>
                  {/each}
                </div>
              {/if}
              {#if editingDeckValidation.warnings.length > 0}
                <div class="validation-warnings">
                  {#each editingDeckValidation.warnings as warning}
                    <div class="warning-msg">⚠️ {warning}</div>
                  {/each}
                </div>
              {/if}

              <div class="editor-current-cards">
                <h4>卡组卡牌 ({editingDeck.cardIds.length}/{DECK_RULES.maxCards})</h4>
                <div class="card-grid">
                  {#each editingDeckCardDetails as card, i}
                    <div
                      class="editor-card"
                      style="background: {CARD_RARITY_BG[card.rarity]}; border-left: 3px solid {CARD_CATEGORY_COLORS[card.category]}"
                    >
                      <div class="editor-card-top">
                        <span class="card-icon">{card.icon}</span>
                        <span class="card-name">{card.name}</span>
                        <span class="card-rarity-icon">{CARD_RARITY_ICONS[card.rarity]}</span>
                      </div>
                      <div class="editor-card-bottom">
                        <span class="card-category-label" style="color: {CARD_CATEGORY_COLORS[card.category]}">{CARD_CATEGORY_LABELS[card.category]}</span>
                        <span class="card-cost">⚡{card.cost}</span>
                        <button class="remove-btn" on:click={() => removeCard(card.id)}>✕</button>
                      </div>
                      <div class="editor-card-desc">{card.description}</div>
                    </div>
                  {/each}
                  {#if editingDeck.cardIds.length < DECK_RULES.maxCards}
                    <div class="editor-card empty-slot" on:click={() => {}}>
                      <span>+ 添加</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="editor-available">
                <div class="filter-bar">
                  <h4>可用卡牌</h4>
                  <div class="filter-group">
                    <select bind:value={filterRarity}>
                      <option value="all">全部稀有度</option>
                      {#each Object.values(CARD_RARITY) as rarity}
                        <option value={rarity}>{CARD_RARITY_LABELS[rarity]}</option>
                      {/each}
                    </select>
                    <select bind:value={filterCategory}>
                      <option value="all">全部类型</option>
                      {#each Object.values(CARD_CATEGORY) as cat}
                        <option value={cat}>{CARD_CATEGORY_LABELS[cat]}</option>
                      {/each}
                    </select>
                  </div>
                </div>
                <div class="card-grid available">
                  {#each filteredCards as card}
                    {@const count = getCardCountInDeck(card.id)}
                    {@const canAdd = canAddMore(card.id)}
                    {@const isUnlocked = unlockedSet.has(card.id)}
                    <div
                      class="editor-card available-card {canAdd && isUnlocked ? 'clickable' : 'disabled'} {count > 0 ? 'in-deck' : ''}"
                      style="background: {CARD_RARITY_BG[card.rarity]}; border-left: 3px solid {CARD_CATEGORY_COLORS[card.category]}"
                      on:click={() => canAdd && isUnlocked && addCard(card.id)}
                    >
                      <div class="editor-card-top">
                        <span class="card-icon">{card.icon}</span>
                        <span class="card-name">{card.name}</span>
                        <span class="card-rarity-icon">{CARD_RARITY_ICONS[card.rarity]}</span>
                      </div>
                      <div class="editor-card-bottom">
                        <span class="card-category-label" style="color: {CARD_CATEGORY_COLORS[card.category]}">{CARD_CATEGORY_LABELS[card.category]}</span>
                        <span class="card-cost">⚡{card.cost}</span>
                        {#if count > 0}
                          <span class="count-badge">×{count}</span>
                        {/if}
                        {#if !isUnlocked}
                          <span class="locked-badge">🔒</span>
                        {/if}
                      </div>
                      <div class="editor-card-desc">{card.description}</div>
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="editor-placeholder">
                <div class="empty-state">
                  <div class="empty-icon">🃏</div>
                  <h3>选择卡组进行编辑</h3>
                  <p>点击左侧卡组的 ✏️ 按钮开始构筑</p>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="unlock-content">
          <div class="filter-bar">
            <h3>卡牌图鉴</h3>
            <div class="filter-group">
              <select bind:value={filterRarity}>
                <option value="all">全部稀有度</option>
                {#each Object.values(CARD_RARITY) as rarity}
                  <option value={rarity}>{CARD_RARITY_LABELS[rarity]}</option>
                {/each}
              </select>
              <select bind:value={filterCategory}>
                <option value="all">全部类型</option>
                {#each Object.values(CARD_CATEGORY) as cat}
                  <option value={cat}>{CARD_CATEGORY_LABELS[cat]}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="unlock-progress-bar">
            {#each Object.entries($unlockProgress.byRarity) as [rarity, info]}
              <div class="progress-item">
                <span style="color: {CARD_RARITY_COLORS[rarity]}">{CARD_RARITY_LABELS[rarity]}</span>
                <span>{info.unlocked}/{info.total}</span>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    style="width: {info.total > 0 ? (info.unlocked / info.total * 100) : 0}%; background: {CARD_RARITY_COLORS[rarity]}"
                  ></div>
                </div>
              </div>
            {/each}
          </div>

          <div class="card-grid unlock-grid">
            {#each filteredCards as card}
              {@const isUnlocked = unlockedSet.has(card.id)}
              {@const unlockCost = UNLOCK_CONDITIONS[card.rarity]}
              <div
                class="editor-card unlock-card {isUnlocked ? 'unlocked' : 'locked'}"
                style="background: {CARD_RARITY_BG[card.rarity]}; border-left: 3px solid {CARD_CATEGORY_COLORS[card.category]}"
              >
                <div class="editor-card-top">
                  <span class="card-icon">{isUnlocked ? card.icon : '❓'}</span>
                  <span class="card-name">{isUnlocked ? card.name : '???'}</span>
                  <span class="card-rarity-icon">{CARD_RARITY_ICONS[card.rarity]}</span>
                </div>
                <div class="editor-card-bottom">
                  <span class="card-category-label" style="color: {CARD_CATEGORY_COLORS[card.category]}">{CARD_CATEGORY_LABELS[card.category]}</span>
                  <span class="card-cost">⚡{card.cost}</span>
                  {#if isUnlocked}
                    <span class="status-badge unlocked">已解锁</span>
                  {:else}
                    <button
                      class="unlock-btn"
                      on:click={() => handleUnlockCard(card.id)}
                    >
                      🔓 {unlockCost.goldCost}💰
                    </button>
                  {/if}
                </div>
                {#if isUnlocked}
                  <div class="editor-card-desc">{card.description}</div>
                {:else}
                  <div class="editor-card-desc locked-desc">
                    需要 Lv.{unlockCost.requiredLevel} / {unlockCost.requiredWins}胜
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          {#if $cardDeckStore.lastUnlockResult}
            <div class="unlock-result {$cardDeckStore.lastUnlockResult.success ? 'success' : 'fail'}">
              {$cardDeckStore.lastUnlockResult.success
                ? '✅ 解锁成功！'
                : `❌ {$cardDeckStore.lastUnlockResult.reason}`}
              <button class="dismiss-btn" on:click={() => cardDeckStore.clearUnlockResult()}>✕</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .deck-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .deck-panel {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
    border-radius: 16px;
    padding: 24px;
    color: #fff;
    width: 90vw;
    max-width: 1100px;
    max-height: 85vh;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 24px;
    color: #fff;
  }

  .header-stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #aaa;
  }

  .close-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #aaa;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .panel-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .tab-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #aaa;
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .tab-btn.active {
    background: rgba(33, 150, 243, 0.2);
    border-color: rgba(33, 150, 243, 0.5);
    color: #2196f3;
  }

  .confirm-btn {
    background: rgba(76, 175, 80, 0.2) !important;
    border-color: rgba(76, 175, 80, 0.5) !important;
    color: #4caf50 !important;
    margin-left: auto;
  }

  .confirm-btn:hover {
    background: rgba(76, 175, 80, 0.3) !important;
  }

  .deck-content {
    display: flex;
    gap: 20px;
    min-height: 400px;
  }

  .deck-sidebar {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .deck-list h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #aaa;
  }

  .deck-item {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .deck-item:hover {
    border-color: rgba(255, 255, 255, 0.25);
  }

  .deck-item.active {
    border-color: #4caf50;
    box-shadow: 0 0 12px rgba(76, 175, 80, 0.2);
  }

  .deck-item.editing {
    border-color: #2196f3;
    box-shadow: 0 0 12px rgba(33, 150, 243, 0.2);
  }

  .deck-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .deck-name {
    font-size: 15px;
    font-weight: bold;
  }

  .active-badge {
    background: #4caf50;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
  }

  .deck-item-info {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #aaa;
  }

  .deck-item-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .action-btn:hover {
    opacity: 1;
  }

  .action-btn.delete:hover {
    color: #e74c3c;
  }

  .create-new {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .create-new input {
    flex: 1;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 6px 10px;
    color: #fff;
    font-size: 13px;
    outline: none;
  }

  .create-new input:focus {
    border-color: rgba(33, 150, 243, 0.5);
  }

  .create-new button {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.4);
    color: #4caf50;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }

  .create-new button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .active-deck-preview h3 {
    margin: 0 0 10px 0;
    font-size: 15px;
    color: #ddd;
  }

  .validation-status {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .validation-status.valid {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
  }

  .validation-status.invalid {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
  }

  .deck-stats-summary, .deck-rarity-summary {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #aaa;
    margin-bottom: 6px;
  }

  .preview-cards {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .preview-card {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    font-size: 12px;
  }

  .preview-card .card-cost {
    margin-left: auto;
    color: #f1c40f;
  }

  .deck-editor {
    flex: 1;
    min-width: 0;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .editor-header h3 {
    margin: 0;
    font-size: 18px;
  }

  .editor-stats {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .editor-stats .valid {
    color: #4caf50;
  }

  .editor-stats .invalid {
    color: #e74c3c;
  }

  .btn-done {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.4);
    color: #2196f3;
    padding: 4px 14px;
    border-radius: 6px;
    cursor: pointer;
  }

  .validation-errors {
    background: rgba(231, 76, 60, 0.08);
    border: 1px solid rgba(231, 76, 60, 0.2);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .error-msg {
    color: #e74c3c;
    font-size: 12px;
    margin: 2px 0;
  }

  .validation-warnings {
    background: rgba(241, 196, 15, 0.08);
    border: 1px solid rgba(241, 196, 15, 0.2);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .warning-msg {
    color: #f1c40f;
    font-size: 12px;
    margin: 2px 0;
  }

  .editor-current-cards {
    margin-bottom: 20px;
  }

  .editor-current-cards h4 {
    margin: 0 0 10px 0;
    font-size: 15px;
    color: #aaa;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .editor-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 10px;
    transition: all 0.2s;
  }

  .editor-card.clickable {
    cursor: pointer;
  }

  .editor-card.clickable:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .editor-card.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .editor-card.in-deck {
    box-shadow: inset 0 0 0 1px rgba(76, 175, 80, 0.4);
  }

  .editor-card-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .card-icon {
    font-size: 16px;
  }

  .card-name {
    flex: 1;
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .card-rarity-icon {
    font-size: 12px;
  }

  .editor-card-bottom {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .card-category-label {
    font-size: 10px;
  }

  .card-cost {
    color: #f1c40f;
    font-size: 12px;
    font-weight: bold;
  }

  .count-badge {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
  }

  .locked-badge {
    font-size: 12px;
  }

  .remove-btn {
    margin-left: auto;
    background: rgba(231, 76, 60, 0.2);
    border: none;
    color: #e74c3c;
    border-radius: 4px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .remove-btn:hover {
    background: rgba(231, 76, 60, 0.4);
  }

  .editor-card-desc {
    font-size: 10px;
    color: #888;
    line-height: 1.4;
  }

  .locked-desc {
    color: #666;
    font-style: italic;
  }

  .empty-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.3);
    font-size: 14px;
    min-height: 80px;
    cursor: pointer;
  }

  .empty-slot:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.5);
  }

  .editor-available {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 16px;
  }

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .filter-bar h3, .filter-bar h4 {
    margin: 0;
    font-size: 15px;
    color: #aaa;
  }

  .filter-group {
    display: flex;
    gap: 8px;
  }

  .filter-group select {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #ddd;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    outline: none;
  }

  .filter-group select:focus {
    border-color: rgba(33, 150, 243, 0.5);
  }

  .available {
    max-height: 300px;
    overflow-y: auto;
  }

  .editor-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
  }

  .empty-state {
    text-align: center;
    color: #666;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #888;
  }

  .empty-state p {
    margin: 0;
    font-size: 13px;
  }

  .unlock-content {
    min-height: 400px;
  }

  .unlock-progress-bar {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .progress-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .progress-track {
    width: 80px;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;
  }

  .unlock-grid {
    max-height: 50vh;
    overflow-y: auto;
  }

  .unlock-card.unlocked {
    opacity: 1;
  }

  .unlock-card.locked {
    opacity: 0.7;
  }

  .status-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .status-badge.unlocked {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
  }

  .unlock-btn {
    background: rgba(241, 196, 15, 0.15);
    border: 1px solid rgba(241, 196, 15, 0.3);
    color: #f1c40f;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    transition: all 0.2s;
  }

  .unlock-btn:hover {
    background: rgba(241, 196, 15, 0.25);
  }

  .unlock-result {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1001;
  }

  .unlock-result.success {
    background: rgba(76, 175, 80, 0.9);
  }

  .unlock-result.fail {
    background: rgba(231, 76, 60, 0.9);
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
  }
</style>

<script>
  import { legionStore } from '$lib/stores/legionStore.js';
  import { CURRENCY_CONFIG, RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import { CARD_RARITY_COLORS, CARD_RARITY_LABELS } from '$lib/config/eventCardConfig.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  
  export let show = false;
  
  function closeResult() {
    legionStore.clearBattleResult();
  }
  
  $: result = $legionStore.lastBattleResult;
  $: shouldShow = show && result;
  
  $: resultConfig = {
    win: { label: '胜利', color: '#4caf50', icon: '🏆' },
    lose: { label: '失败', color: '#f44336', icon: '💔' },
    draw: { label: '平局', color: '#ff9800', icon: '🤝' }
  };
  
  $: resultInfo = result ? resultConfig[result.result] || resultConfig.lose : null;
</script>

{#if shouldShow}
  <div class="battle-result-overlay" on:click={closeResult}>
    <div class="battle-result" on:click|stopPropagation style="--result-color: {resultInfo.color};">
      <div class="result-header">
        <div class="result-icon">{resultInfo.icon}</div>
        <h2 class="result-title" style="color: {resultInfo.color};">
          {resultInfo.label}！
        </h2>
      </div>
      
      <div class="rewards-section">
        <h3>🎁 战斗奖励</h3>
        
        <div class="rewards-grid">
          {#if result.rewards.gold > 0}
            <div class="reward-item">
              <span class="reward-icon">💰</span>
              <span class="reward-name">金币</span>
              <span class="reward-value">+{result.rewards.gold}</span>
            </div>
          {/if}
          
          {#if result.rewards.exp > 0}
            <div class="reward-item">
              <span class="reward-icon">✨</span>
              <span class="reward-name">经验</span>
              <span class="reward-value">+{result.rewards.exp}</span>
            </div>
          {/if}
          
          {#each Object.entries(result.rewards.items) as [type, count]}
            {#if count > 0}
              <div class="reward-item">
                <span class="reward-icon">{CURRENCY_CONFIG[type]?.icon || '🎁'}</span>
                <span class="reward-name">{CURRENCY_CONFIG[type]?.name || type}</span>
                <span class="reward-value">+{count}</span>
              </div>
            {/if}
          {/each}
        </div>
        
        {#if result.rewards.cards.length > 0}
          <div class="cards-section">
            <h4>🃏 获得卡牌</h4>
            <div class="cards-list">
              {#each result.rewards.cards as card}
                <div class="card-reward" style="border-color: {CARD_RARITY_COLORS[card.rarity]};">
                  <span class="card-icon">{card.icon}</span>
                  <div class="card-info">
                    <span class="card-name">{card.name}</span>
                    <span class="card-rarity" style="color: {CARD_RARITY_COLORS[card.rarity]};">
                      {CARD_RARITY_LABELS[card.rarity]}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <div class="participating-units">
        <h4>⚔️ 参战单位</h4>
        <div class="units-list">
          {#each result.participatingUnitIds as unitId}
            {@const unit = $legionStore.units.find(u => u.id === unitId)}
            {#if unit}
              <div class="participant-unit">
                <span class="unit-icon" style="background: {'#' + (unit.type ? unitConfig[unit.type]?.color?.toString(16).padStart(6, '0') : '888888')};">
                  {unit.name?.charAt(0)}
                </span>
                <div class="unit-info">
                  <span class="unit-name">{unit.name}</span>
                  <span class="unit-level">Lv.{unit.level}</span>
                </div>
                <span class="exp-gain">+{result.rewards.exp} EXP</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
      
      <div class="stats-update">
        <div class="stat-row">
          <span>总场次</span>
          <span>{$legionStore.stats.totalBattles}</span>
        </div>
        <div class="stat-row">
          <span>胜率</span>
          <span>{$legionStore.stats.totalBattles > 0 ? Math.round(($legionStore.stats.totalWins / $legionStore.stats.totalBattles) * 100) : 0}%</span>
        </div>
      </div>
      
      <button class="close-btn" on:click={closeResult}>
        确定
      </button>
    </div>
  </div>
{/if}

<style>
  .battle-result-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .battle-result {
    background: linear-gradient(135deg, #1e1e3c, #141428);
    border: 3px solid var(--result-color);
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    color: #fff;
    animation: popIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  @keyframes popIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .result-header {
    text-align: center;
    margin-bottom: 24px;
  }
  
  .result-icon {
    font-size: 64px;
    margin-bottom: 12px;
    animation: bounce 0.6s ease infinite alternate;
  }
  
  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
  }
  
  .result-title {
    margin: 0;
    font-size: 36px;
    font-weight: bold;
    text-shadow: 0 0 20px var(--result-color);
  }
  
  .rewards-section,
  .participating-units,
  .stats-update {
    margin-bottom: 24px;
  }
  
  .rewards-section h3,
  .participating-units h4 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #fff;
    text-align: center;
  }
  
  .rewards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .reward-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .reward-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  
  .reward-name {
    font-size: 13px;
    color: #aaa;
    margin-bottom: 4px;
  }
  
  .reward-value {
    font-size: 20px;
    font-weight: bold;
    color: #4caf50;
  }
  
  .cards-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .cards-section h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #aaa;
    text-align: center;
  }
  
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .card-reward {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid;
    border-radius: 8px;
  }
  
  .card-icon {
    font-size: 28px;
  }
  
  .card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .card-name {
    font-size: 14px;
    font-weight: bold;
  }
  
  .card-rarity {
    font-size: 11px;
  }
  
  .units-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .participant-unit {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .unit-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .participant-unit .unit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .participant-unit .unit-name {
    font-size: 14px;
    font-weight: 600;
  }
  
  .participant-unit .unit-level {
    font-size: 11px;
    color: #888;
  }
  
  .exp-gain {
    font-size: 12px;
    color: #4caf50;
    font-weight: bold;
  }
  
  .stats-update {
    display: flex;
    justify-content: space-around;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
  }
  
  .stat-row {
    text-align: center;
  }
  
  .stat-row span:first-child {
    display: block;
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
  }
  
  .stat-row span:last-child {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }
  
  .close-btn {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, var(--result-color), #1565c0);
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .close-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px var(--result-color);
  }
</style>

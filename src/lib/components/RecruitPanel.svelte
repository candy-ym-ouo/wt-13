<script>
  // @ts-nocheck
  import { legionStore } from '$lib/stores/legionStore.js';
  import { RECRUIT_COST, GUARANTEE_RULES, RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import UnitCard from './UnitCard.svelte';
  
  let recruiting = false;
  
  async function handleRecruitSingle() {
    if (recruiting) return;
    recruiting = true;
    legionStore.recruitSingle();
    setTimeout(() => { recruiting = false; }, 500);
  }
  
  async function handleRecruitTen() {
    if (recruiting) return;
    recruiting = true;
    legionStore.recruitTen();
    setTimeout(() => { recruiting = false; }, 500);
  }
  
  async function handleTicketRecruit(count) {
    if (recruiting) return;
    recruiting = true;
    legionStore.useRecruitTicket(count);
    setTimeout(() => { recruiting = false; }, 500);
  }
  
  function closeResult() {
    legionStore.clearRecruitResult();
  }
</script>

<div class="recruit-panel">
  <div class="panel-header">
    <h2>🎖️ 单位招募</h2>
    <div class="pity-info">
      <span>史诗保底: {$legionStore.recruitPity}/{GUARANTEE_RULES.pityPullsForEpic}</span>
      <span>传说保底: {$legionStore.recruitPity}/{GUARANTEE_RULES.pityPullsForLegendary}</span>
    </div>
  </div>
  
  <div class="recruit-options">
    <div class="recruit-option gold-single" on:click={handleRecruitSingle}>
      <div class="option-icon">🎫</div>
      <div class="option-name">单次招募</div>
      <div class="option-cost">💰 {RECRUIT_COST.single} 金币</div>
      <button class="recruit-btn" disabled={recruiting || $legionStore.currency.gold < RECRUIT_COST.single}>
        {recruiting ? '招募中...' : '招募'}
      </button>
    </div>
    
    <div class="recruit-option gold-ten" on:click={handleRecruitTen}>
      <div class="option-icon">🎫🎫🎫</div>
      <div class="option-name">十连招募</div>
      <div class="option-cost">💰 {RECRUIT_COST.ten} 金币</div>
      <div class="option-bonus">保底稀有+</div>
      <button class="recruit-btn" disabled={recruiting || $legionStore.currency.gold < RECRUIT_COST.ten}>
        {recruiting ? '招募中...' : '十连'}
      </button>
    </div>
    
    <div class="recruit-option ticket-single" on:click={() => handleTicketRecruit(1)}>
      <div class="option-icon">✨</div>
      <div class="option-name">券·单抽</div>
      <div class="option-cost">🎫 x1</div>
      <button class="recruit-btn" disabled={recruiting || $legionStore.currency.recruitTicket < 1}>
        {recruiting ? '招募中...' : '使用'}
      </button>
    </div>
    
    <div class="recruit-option ticket-ten" on:click={() => handleTicketRecruit(10)}>
      <div class="option-icon">✨✨✨</div>
      <div class="option-name">券·十连</div>
      <div class="option-cost">🎫 x10</div>
      <div class="option-bonus">保底稀有+</div>
      <button class="recruit-btn" disabled={recruiting || $legionStore.currency.recruitTicket < 10}>
        {recruiting ? '招募中...' : '使用'}
      </button>
    </div>
  </div>
  
  <div class="rarity-rates">
    <h4>掉落概率</h4>
    <div class="rates-grid">
      {#each Object.entries(RARITY_CONFIG) as [key, config]}
        <div class="rate-item" style="color: {config.color};">
          <span>{config.name}</span>
          <span>{(RARITY_CONFIG[key].dropRate || 0).toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  </div>
  
  {#if $legionStore.lastRecruitResult?.success}
    <div class="recruit-result-overlay" on:click={closeResult}>
      <div class="recruit-result" on:click|stopPropagation>
        <h3>🎉 招募结果</h3>
        <div class="result-units">
          {#each $legionStore.lastRecruitResult.units as unit}
            <UnitCard {unit} showStats={true} />
          {/each}
        </div>
        <button class="close-btn" on:click={closeResult}>确定</button>
      </div>
    </div>
  {/if}
  
  {#if $legionStore.lastRecruitResult?.success === false}
    <div class="error-message">
      {$legionStore.lastRecruitResult.reason}
    </div>
  {/if}
</div>

<style>
  .recruit-panel {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
    border-radius: 16px;
    padding: 24px;
    color: #fff;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .panel-header h2 {
    margin: 0;
    font-size: 24px;
    color: #fff;
  }
  
  .pity-info {
    display: flex;
    gap: 16px;
    font-size: 13px;
  }
  
  .pity-info span {
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }
  
  .recruit-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .recruit-option {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .recruit-option:hover:not(:has(button:disabled)) {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
  
  .gold-single:hover:not(:has(button:disabled)) { box-shadow: 0 8px 25px rgba(255, 193, 7, 0.3); }
  .gold-ten:hover:not(:has(button:disabled)) { box-shadow: 0 8px 25px rgba(255, 152, 0, 0.4); border-color: #ff9800; }
  .ticket-single:hover:not(:has(button:disabled)) { box-shadow: 0 8px 25px rgba(156, 39, 176, 0.3); border-color: #9c27b0; }
  .ticket-ten:hover:not(:has(button:disabled)) { box-shadow: 0 8px 25px rgba(233, 30, 99, 0.4); border-color: #e91e63; }
  
  .option-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }
  
  .option-name {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .option-cost {
    font-size: 14px;
    color: #ffc107;
    margin-bottom: 12px;
  }
  
  .option-bonus {
    position: absolute;
    top: 8px;
    right: 8px;
    background: linear-gradient(135deg, #ff9800, #f44336);
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
  }
  
  .recruit-btn {
    width: 100%;
    padding: 10px 20px;
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .recruit-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  }
  
  .recruit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #666;
  }
  
  .rarity-rates {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 16px;
  }
  
  .rarity-rates h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #aaa;
  }
  
  .rates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .rate-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .recruit-result-overlay {
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
    animation: fadeIn 0.3s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .recruit-result {
    background: linear-gradient(135deg, #1e1e3c, #141428);
    border: 2px solid #ffd700;
    border-radius: 16px;
    padding: 32px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
    text-align: center;
    animation: popIn 0.4s ease;
  }
  
  @keyframes popIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  
  .recruit-result h3 {
    margin: 0 0 24px 0;
    font-size: 28px;
    color: #ffd700;
  }
  
  .result-units {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .close-btn {
    padding: 12px 40px;
    background: linear-gradient(135deg, #2196f3, #1565c0);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .close-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 20px rgba(33, 150, 243, 0.5);
  }
  
  .error-message {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid #f44336;
    border-radius: 8px;
    padding: 12px;
    color: #f44336;
    text-align: center;
    margin-top: 16px;
  }
</style>

<script>
  // @ts-nocheck
  import { legionStore } from '$lib/stores/legionStore.js';
  import { achievementStore } from '$lib/stores/achievementStore.js';
  import { CURRENCY_CONFIG, RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import { CARD_RARITY_COLORS, CARD_RARITY_LABELS } from '$lib/config/eventCardConfig.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  import { ACHIEVEMENT_RARITY_CONFIG } from '$lib/config/achievementConfig.js';
  
  export let show = false;
  
  function closeResult() {
    legionStore.clearBattleResult();
  }
  
  $: result = $legionStore.lastBattleResult;
  $: shouldShow = show && result;
  $: battleStats = $achievementStore.battleStats;
  
  $: resultConfig = {
    win: { label: '胜利', color: '#4caf50', icon: '🏆' },
    lose: { label: '失败', color: '#f44336', icon: '💔' },
    draw: { label: '平局', color: '#ff9800', icon: '🤝' }
  };
  
  $: resultInfo = result ? resultConfig[result.result] || resultConfig.lose : null;

  $: battleObjectives = [
    {
      id: 'win',
      name: '赢得战斗',
      icon: '🏆',
      target: 1,
      current: result?.result === 'win' ? 1 : 0,
      completed: result?.result === 'win'
    },
    {
      id: 'kills',
      name: '击杀敌军',
      icon: '💀',
      target: 5,
      current: battleStats.kills || 0,
      completed: (battleStats.kills || 0) >= 5
    },
    {
      id: 'damage',
      name: '造成伤害',
      icon: '💥',
      target: 300,
      current: battleStats.damageDealt || 0,
      completed: (battleStats.damageDealt || 0) >= 300
    },
    {
      id: 'noDeaths',
      name: '无阵亡',
      icon: '✨',
      target: 1,
      current: (battleStats.deaths || 0) === 0 ? 1 : 0,
      completed: (battleStats.deaths || 0) === 0 && result?.result === 'win'
    },
    {
      id: 'swift',
      name: '速战速决(≤10回合)',
      icon: '⚡',
      target: 10,
      current: battleStats.turnsPlayed || 0,
      completed: (battleStats.turnsPlayed || 0) <= 10 && result?.result === 'win'
    }
  ];

  $: newlyUnlockedInBattle = (() => {
    const totalBattles = $achievementStore.stats.totalBattles;
    const unlocked = [];
    for (const [id, data] of Object.entries($achievementStore.unlocked)) {
      if (data.battleIndex === totalBattles) {
        const ach = { id, ...data };
        unlocked.push(ach);
      }
    }
    return unlocked;
  })();
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

      <div class="objectives-section">
        <h3>🎯 战斗目标</h3>
        <div class="objectives-list">
          {#each battleObjectives as obj}
            <div class="objective-item {obj.completed ? 'completed' : ''}">
              <span class="obj-icon">{obj.completed ? '✅' : obj.icon}</span>
              <span class="obj-name">{obj.name}</span>
              <span class="obj-progress">
                {#if obj.id === 'swift'}
                  {obj.current}回合 / ≤{obj.target}回合
                {:else if obj.id === 'noDeaths'}
                  {obj.completed ? '已达成' : '未达成'}
                {:else if obj.id === 'win'}
                  {obj.completed ? '胜利' : '未胜利'}
                {:else}
                  {obj.current} / {obj.target}
                {/if}
              </span>
            </div>
          {/each}
        </div>
        <div class="battle-summary">
          <span>💀 击杀: {battleStats.kills || 0}</span>
          <span>💥 伤害: {battleStats.damageDealt || 0}</span>
          <span>🃏 卡牌: {battleStats.cardsUsed || 0}</span>
          <span>⏱️ 回合: {battleStats.turnsPlayed || 0}</span>
        </div>
      </div>

      {#if newlyUnlockedInBattle.length > 0}
        <div class="newly-unlocked-section">
          <h3>🎊 新解锁成就</h3>
          <div class="unlocked-list">
            {#each newlyUnlockedInBattle as unlocked}
              <div class="unlocked-achievement">
                <span class="unlock-icon">🏆</span>
                <span class="unlock-name">{unlocked.name || unlocked.id}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
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
  .objectives-section,
  .newly-unlocked-section,
  .participating-units,
  .stats-update {
    margin-bottom: 24px;
  }
  
  .rewards-section h3,
  .objectives-section h3,
  .newly-unlocked-section h3,
  .participating-units h4 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #fff;
    text-align: center;
  }

  .objectives-section {
    background: rgba(255, 215, 0, 0.05);
    border: 1px solid rgba(255, 215, 0, 0.2);
    border-radius: 12px;
    padding: 16px;
  }

  .objectives-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .objective-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s;
  }

  .objective-item.completed {
    background: rgba(46, 204, 113, 0.1);
    border-color: rgba(46, 204, 113, 0.3);
  }

  .obj-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }

  .obj-name {
    flex: 1;
    font-size: 13px;
    color: #ccc;
  }

  .objective-item.completed .obj-name {
    color: #2ecc71;
    font-weight: 500;
  }

  .obj-progress {
    font-size: 12px;
    color: #888;
    font-weight: 500;
  }

  .objective-item.completed .obj-progress {
    color: #2ecc71;
  }

  .battle-summary {
    display: flex;
    justify-content: space-around;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    flex-wrap: wrap;
    gap: 8px;
  }

  .battle-summary span {
    font-size: 12px;
    color: #aaa;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
  }

  .newly-unlocked-section {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 152, 0, 0.05));
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 12px;
    padding: 16px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.2); }
    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
  }

  .unlocked-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .unlocked-achievement {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 8px;
  }

  .unlock-icon {
    font-size: 20px;
  }

  .unlock-name {
    font-size: 14px;
    font-weight: 600;
    color: #ffd700;
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

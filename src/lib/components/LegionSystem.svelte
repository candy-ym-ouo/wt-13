<script>
  import { legionStore, totalPower, activeLineupUnits } from '$lib/stores/legionStore.js';
  import { CURRENCY_CONFIG, RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  import UnitCard from './UnitCard.svelte';
  import RecruitPanel from './RecruitPanel.svelte';
  import UnitDetailPanel from './UnitDetailPanel.svelte';
  import LineupPanel from './LineupPanel.svelte';
  import BattleResultPanel from './BattleResultPanel.svelte';
  
  let activeTab = 'units';
  let selectedUnitId = null;
  let filterType = 'all';
  let filterRarity = 'all';
  let sortBy = 'level';
  let showBattleResult = false;
  
  const tabs = [
    { id: 'units', name: '单位', icon: '👥' },
    { id: 'recruit', name: '招募', icon: '🎫' },
    { id: 'lineup', name: '阵容', icon: '⚔️' },
    { id: 'records', name: '记录', icon: '📊' }
  ];
  
  $: selectedUnit = selectedUnitId 
    ? $legionStore.units.find(u => u.id === selectedUnitId) 
    : null;
  
  $: filteredUnits = $legionStore.units.filter(unit => {
    if (filterType !== 'all' && unit.type !== filterType) return false;
    if (filterRarity !== 'all' && unit.rarity !== filterRarity) return false;
    return true;
  });
  
  $: sortedUnits = [...filteredUnits].sort((a, b) => {
    switch (sortBy) {
      case 'level':
        return b.level - a.level;
      case 'rarity':
        return Object.keys(RARITY_CONFIG).indexOf(b.rarity) - Object.keys(RARITY_CONFIG).indexOf(a.rarity);
      case 'power':
        const powerA = (a.stats?.attack || 0) + (a.stats?.defense || 0) + Math.floor((a.stats?.maxHp || 0) / 10);
        const powerB = (b.stats?.attack || 0) + (b.stats?.defense || 0) + Math.floor((b.stats?.maxHp || 0) / 10);
        return powerB - powerA;
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });
  
  function selectUnit(unitId) {
    selectedUnitId = selectedUnitId === unitId ? null : unitId;
  }
  
  function simulateBattle(result) {
    const unitIds = $activeLineupUnits.map(u => u.id);
    legionStore.processBattleResult(result, unitIds, 1.0);
    showBattleResult = true;
  }
  
  function resetLegion() {
    if (confirm('确定要重置所有军团数据吗？此操作不可撤销！')) {
      legionStore.reset();
      selectedUnitId = null;
    }
  }
  
  $: winRate = $legionStore.stats.totalBattles > 0 
    ? Math.round(($legionStore.stats.totalWins / $legionStore.stats.totalBattles) * 100) 
    : 0;
</script>

<div class="legion-system">
  <div class="top-bar">
    <div class="title-section">
      <h1>🏰 军团养成系统</h1>
      <div class="total-power">
        总战力: <span class="power-value">{$totalPower}</span>
      </div>
    </div>
    
    <div class="currency-bar">
      {#each Object.entries(CURRENCY_CONFIG) as [type, config]}
        <div class="currency-item">
          <span class="currency-icon">{config.icon}</span>
          <span class="currency-name">{config.name}</span>
          <span class="currency-value">{$legionStore.currency[type] || 0}</span>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="tabs">
    {#each tabs as tab}
      <button 
        class="tab-btn {activeTab === tab.id ? 'active' : ''}"
        on:click={() => { activeTab = tab.id; selectedUnitId = null; }}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-name">{tab.name}</span>
      </button>
    {/each}
  </div>
  
  <div class="content-area">
    {#if activeTab === 'units'}
      <div class="units-tab">
        <div class="units-sidebar">
          <div class="filters">
            <div class="filter-group">
              <label>类型筛选</label>
              <select bind:value={filterType}>
                <option value="all">全部类型</option>
                {#each Object.keys(unitConfig) as type}
                  <option value={type}>{unitConfig[type].name}</option>
                {/each}
              </select>
            </div>
            
            <div class="filter-group">
              <label>稀有度筛选</label>
              <select bind:value={filterRarity}>
                <option value="all">全部稀有度</option>
                {#each Object.entries(RARITY_CONFIG) as [key, config]}
                  <option value={key}>{config.name}</option>
                {/each}
              </select>
            </div>
            
            <div class="filter-group">
              <label>排序方式</label>
              <select bind:value={sortBy}>
                <option value="level">等级</option>
                <option value="rarity">稀有度</option>
                <option value="power">战力</option>
                <option value="type">类型</option>
              </select>
            </div>
          </div>
          
          <div class="units-count">
            共 {sortedUnits.length} 个单位
          </div>
          
          <div class="units-grid">
            {#each sortedUnits as unit}
              <div on:click={() => selectUnit(unit.id)}>
                <UnitCard 
                  unit={unit} 
                  selected={selectedUnitId === unit.id}
                  showStats={true}
                />
              </div>
            {/each}
            
            {#if sortedUnits.length === 0}
              <div class="no-units">
                <div class="empty-icon">👥</div>
                <p>暂无单位</p>
                <p class="hint">前往招募面板获取新单位</p>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="detail-sidebar">
          {#if selectedUnit}
            <UnitDetailPanel unit={selectedUnit} />
          {:else}
            <div class="no-selection">
              <div class="empty-icon">👆</div>
              <p>选择一个单位查看详情</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    {#if activeTab === 'recruit'}
      <RecruitPanel />
    {/if}
    
    {#if activeTab === 'lineup'}
      <LineupPanel />
    {/if}
    
    {#if activeTab === 'records'}
      <div class="records-tab">
        <div class="stats-overview">
          <h3>📊 战绩统计</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">总场次</span>
              <span class="stat-value">{$legionStore.stats.totalBattles}</span>
            </div>
            <div class="stat-card win">
              <span class="stat-label">胜利</span>
              <span class="stat-value">{$legionStore.stats.totalWins}</span>
            </div>
            <div class="stat-card lose">
              <span class="stat-label">失败</span>
              <span class="stat-value">{$legionStore.stats.totalLosses}</span>
            </div>
            <div class="stat-card draw">
              <span class="stat-label">平局</span>
              <span class="stat-value">{$legionStore.stats.totalDraws}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">胜率</span>
              <span class="stat-value">{winRate}%</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">总招募</span>
              <span class="stat-value">{$legionStore.stats.totalRecruits}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">收集卡牌</span>
              <span class="stat-value">{$legionStore.stats.totalCardsCollected}</span>
            </div>
          </div>
        </div>
        
        <div class="simulate-battle">
          <h3>⚔️ 模拟战斗测试</h3>
          <p class="hint">测试战斗结算和奖励系统</p>
          <div class="battle-buttons">
            <button class="battle-btn win" on:click={() => simulateBattle('win')}>
              🏆 胜利
            </button>
            <button class="battle-btn lose" on:click={() => simulateBattle('lose')}>
              💔 失败
            </button>
            <button class="battle-btn draw" on:click={() => simulateBattle('draw')}>
              🤝 平局
            </button>
          </div>
        </div>
        
        <div class="danger-zone">
          <h3>⚠️ 危险区域</h3>
          <button class="reset-btn" on:click={resetLegion}>
            重置所有数据
          </button>
        </div>
      </div>
    {/if}
  </div>
  
  <BattleResultPanel show={showBattleResult} />
</div>

<style>
  .legion-system {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #0f0f1e, #1a1a2e);
    color: #fff;
    overflow: hidden;
  }
  
  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .title-section {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  
  .title-section h1 {
    margin: 0;
    font-size: 24px;
    color: #fff;
  }
  
  .total-power {
    padding: 8px 16px;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 20px;
    font-size: 14px;
  }
  
  .power-value {
    color: #ffd700;
    font-weight: bold;
    font-size: 18px;
    margin-left: 8px;
  }
  
  .currency-bar {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .currency-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    font-size: 14px;
  }
  
  .currency-icon {
    font-size: 18px;
  }
  
  .currency-name {
    color: #aaa;
  }
  
  .currency-value {
    font-weight: bold;
    color: #fff;
  }
  
  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 24px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .tab-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .tab-btn.active {
    color: #2196f3;
    border-bottom-color: #2196f3;
    background: rgba(33, 150, 243, 0.1);
  }
  
  .tab-icon {
    font-size: 18px;
  }
  
  .content-area {
    flex: 1;
    overflow: hidden;
    padding: 24px;
  }
  
  .units-tab {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;
    height: 100%;
    overflow: hidden;
  }
  
  .units-sidebar {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .filters {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .filter-group label {
    font-size: 12px;
    color: #888;
  }
  
  .filter-group select {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
  }
  
  .filter-group select option {
    background: #1a1a2e;
    color: #fff;
  }
  
  .units-count {
    font-size: 13px;
    color: #888;
    margin-bottom: 12px;
  }
  
  .units-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
    overflow-y: auto;
    padding-right: 8px;
  }
  
  .detail-sidebar {
    overflow-y: auto;
  }
  
  .no-units,
  .no-selection {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .no-units p,
  .no-selection p {
    margin: 4px 0;
  }
  
  .hint {
    font-size: 13px;
    color: #555;
  }
  
  .records-tab {
    max-width: 800px;
    margin: 0 auto;
    overflow-y: auto;
    height: 100%;
    padding-right: 8px;
  }
  
  .stats-overview,
  .simulate-battle,
  .danger-zone {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }
  
  .stats-overview h3,
  .simulate-battle h3,
  .danger-zone h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #fff;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }
  
  .stat-card {
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    text-align: center;
  }
  
  .stat-card.win .stat-value { color: #4caf50; }
  .stat-card.lose .stat-value { color: #f44336; }
  .stat-card.draw .stat-value { color: #ff9800; }
  
  .stat-label {
    display: block;
    font-size: 13px;
    color: #888;
    margin-bottom: 8px;
  }
  
  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #fff;
  }
  
  .simulate-battle .hint {
    color: #888;
    margin-bottom: 16px;
  }
  
  .battle-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  
  .battle-btn {
    padding: 20px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .battle-btn.win {
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    color: white;
  }
  
  .battle-btn.lose {
    background: linear-gradient(135deg, #f44336, #c62828);
    color: white;
  }
  
  .battle-btn.draw {
    background: linear-gradient(135deg, #ff9800, #ef6c00);
    color: white;
  }
  
  .battle-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  .danger-zone {
    border: 1px solid rgba(244, 67, 54, 0.3);
  }
  
  .reset-btn {
    width: 100%;
    padding: 14px;
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid #f44336;
    border-radius: 8px;
    color: #f44336;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .reset-btn:hover {
    background: rgba(244, 67, 54, 0.4);
  }
  
  @media (max-width: 1024px) {
    .units-tab {
      grid-template-columns: 1fr;
    }
    
    .detail-sidebar {
      max-height: 50vh;
    }
  }
  
  @media (max-width: 640px) {
    .top-bar {
      padding: 12px 16px;
    }
    
    .title-section h1 {
      font-size: 18px;
    }
    
    .tabs {
      padding: 0 16px;
    }
    
    .tab-btn {
      padding: 12px 16px;
      font-size: 13px;
    }
    
    .tab-name {
      display: none;
    }
    
    .content-area {
      padding: 16px;
    }
    
    .battle-buttons {
      grid-template-columns: 1fr;
    }
  }
</style>

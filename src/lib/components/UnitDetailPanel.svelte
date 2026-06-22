<script>
  // @ts-nocheck
  import { legionStore } from '$lib/stores/legionStore.js';
  import { 
    RARITY_CONFIG, 
    LEVEL_CONFIG, 
    PROMOTION_CONFIG,
    STAT_GROWTH,
    getExpToNextLevel 
  } from '$lib/config/legionConfig.js';
  import { unitConfig, SPECIALIZATION_CONFIG } from '$lib/config/unitConfig.js';
  import { 
    canPromote, 
    canSetSpecialization,
    getAvailableSpecializations,
    getUnitEquipmentStats,
    getUnitSetBonuses,
    getUnitSpecialEffects
  } from '$lib/utils/legionSystem.js';
  import { 
    EQUIPMENT_SLOT_INFO,
    getRarityInfo
  } from '$lib/config/equipmentConfig.js';
  import EquipmentPanel from './EquipmentPanel.svelte';
  
  export let unit;
  
  $: baseConfig = unitConfig[unit.type] || {};
  $: rarityInfo = RARITY_CONFIG[unit.rarity] || RARITY_CONFIG.COMMON;
  $: expToNext = getExpToNextLevel(unit.level);
  $: expProgress = expToNext > 0 ? (unit.exp / expToNext) * 100 : 100;
  $: canPromoteNow = canPromote(unit);
  $: canSpecialize = canSetSpecialization(unit);
  $: availableSpecs = getAvailableSpecializations(unit.type);
  $: nextPromotion = unit.promotion + 1;
  $: nextPromoConfig = PROMOTION_CONFIG[nextPromotion];
  $: colorHex = '#' + baseConfig.color?.toString(16).padStart(6, '0') || '#888888';
  
  $: equipStats = getUnitEquipmentStats(unit);
  $: setBonuses = getUnitSetBonuses(unit);
  $: specialEffects = getUnitSpecialEffects(unit);
  
  function handleAddExp(amount) {
    legionStore.addExpToUnit(unit.id, amount);
  }
  
  function handleUseExpBook(count) {
    legionStore.useExpBook(unit.id, count);
  }
  
  function handleAllocateStat(statType) {
    legionStore.allocateStat(unit.id, statType);
  }
  
  function handlePromote() {
    legionStore.promoteUnit(unit.id);
  }
  
  function handleSetSpecialization(specId) {
    legionStore.setSpecialization(unit.id, specId);
  }
  
  $: statPointValues = {
    atk: `+${(STAT_GROWTH.atk.perLevel * 10).toFixed(0)} 攻击`,
    def: `+${(STAT_GROWTH.def.perLevel * 10).toFixed(0)} 防御`,
    hp: `+${(STAT_GROWTH.hp.perLevel * 10).toFixed(0)} 生命`,
    move: `+${(STAT_GROWTH.move.perLevel * 10).toFixed(1)} 移动`
  };
  
  $: totalStats = {
    attack: (unit.stats?.attack || 0) + (equipStats?.attack || 0),
    defense: (unit.stats?.defense || 0) + (equipStats?.defense || 0),
    maxHp: (unit.stats?.maxHp || 0) + (equipStats?.maxHp || 0),
    moveRange: (unit.stats?.moveRange || 0) + (equipStats?.moveRange || 0),
    attackRange: (unit.stats?.attackRange || 0) + (equipStats?.attackRange || 0)
  };
  
  $: equipmentList = unit.equipment || [];
</script>

<div class="unit-detail-panel" style="--unit-color: {colorHex}; --rarity-color: {rarityInfo.color};">
  <div class="detail-header">
    <div class="unit-avatar" style="background: {colorHex};">
      {baseConfig.name?.charAt(0) || '?'}
    </div>
    <div class="header-info">
      <h2 class="unit-name">{unit.name}</h2>
      <div class="unit-meta">
        <span class="rarity-badge" style="background: {rarityInfo.color};">{rarityInfo.name}</span>
        <span class="level-badge">Lv.{unit.level}</span>
        {#if unit.promotion > 0}
          <span class="promotion-stars">{'★'.repeat(unit.promotion)}</span>
        {/if}
      </div>
      <div class="unit-description">{baseConfig.description}</div>
    </div>
  </div>
  
  <div class="exp-section">
    <div class="exp-header">
      <span>经验值</span>
      <span>{unit.exp} / {expToNext || 'MAX'}</span>
    </div>
    <div class="exp-bar-large">
      <div class="exp-fill" style="width: {expProgress}%;"></div>
    </div>
    <div class="exp-actions">
      <button on:click={() => handleAddExp(50)}>+50 EXP</button>
      <button on:click={() => handleUseExpBook(1)}>📚 经验书 x1</button>
      <button on:click={() => handleUseExpBook(5)}>📚 经验书 x5</button>
    </div>
  </div>
  
  <div class="stats-section">
    <h3>属性面板</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-icon">⚔️</span>
        <div class="stat-info">
          <span class="stat-name">攻击力</span>
          <div class="stat-value-row">
            <span class="stat-value">{totalStats.attack}</span>
            {#if equipStats?.attack > 0}
              <span class="equip-bonus">+{equipStats.attack}</span>
            {/if}
          </div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🛡️</span>
        <div class="stat-info">
          <span class="stat-name">防御力</span>
          <div class="stat-value-row">
            <span class="stat-value">{totalStats.defense}</span>
            {#if equipStats?.defense > 0}
              <span class="equip-bonus">+{equipStats.defense}</span>
            {/if}
          </div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">❤️</span>
        <div class="stat-info">
          <span class="stat-name">最大生命</span>
          <div class="stat-value-row">
            <span class="stat-value">{totalStats.maxHp}</span>
            {#if equipStats?.maxHp > 0}
              <span class="equip-bonus">+{equipStats.maxHp}</span>
            {/if}
          </div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">👟</span>
        <div class="stat-info">
          <span class="stat-name">移动力</span>
          <div class="stat-value-row">
            <span class="stat-value">{totalStats.moveRange}</span>
            {#if equipStats?.moveRange > 0}
              <span class="equip-bonus">+{equipStats.moveRange}</span>
            {/if}
          </div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🎯</span>
        <div class="stat-info">
          <span class="stat-name">攻击距离</span>
          <div class="stat-value-row">
            <span class="stat-value">{totalStats.attackRange}</span>
            {#if equipStats?.attackRange > 0}
              <span class="equip-bonus">+{equipStats.attackRange}</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="equipment-preview-section">
    <h3>装备栏 ({equipmentList.length}/4)</h3>
    <div class="equip-slots-mini">
      {#each Object.entries(EQUIPMENT_SLOT_INFO) as [slot, info]}
        {@const equipped = equipmentList.find(e => e.slot === slot)}
        <div 
          class="equip-slot-mini {equipped ? 'filled' : 'empty'}"
          style="--slot-color: {equipped ? getRarityInfo(equipped.rarity).color : info.color}"
          title="{equipped ? equipped.name : info.name}"
        >
          {#if equipped}
            <span class="mini-icon">{info.icon}</span>
            <span class="mini-name">{equipped.name}</span>
          {:else}
            <span class="mini-icon">{info.icon}</span>
            <span class="mini-empty">空</span>
          {/if}
        </div>
      {/each}
    </div>
    
    {#if setBonuses?.bonuses?.length > 0}
      <div class="set-bonus-mini">
        <span class="set-label">套装效果:</span>
        {#each setBonuses.bonuses as bonus}
          <span class="set-tag" style="--set-color: {bonus.setColor}">{bonus.label}</span>
        {/each}
      </div>
    {/if}
  </div>
  
  <div class="stat-allocation-section">
    <h3>属性分配 (剩余点数: {unit.statPoints || 0})</h3>
    <div class="allocation-grid">
      {#each ['atk', 'def', 'hp', 'move'] as stat}
        <div class="allocation-item">
          <div class="allocation-info">
            <span>{stat === 'atk' ? '⚔️ 攻击' : stat === 'def' ? '🛡️ 防御' : stat === 'hp' ? '❤️ 生命' : '👟 移动'}</span>
            <span class="allocated">已分配: {unit.allocatedStats?.[stat] || 0}</span>
          </div>
          <button 
            class="allocate-btn"
            disabled={(unit.statPoints || 0) <= 0}
            on:click={() => handleAllocateStat(stat)}
          >
            +1 ({statPointValues[stat]})
          </button>
        </div>
      {/each}
    </div>
  </div>
  
  <div class="promotion-section">
    <h3>晋升系统</h3>
    {#if nextPromoConfig}
      <div class="promotion-info">
        <div class="promo-requirement">
          <span>需要等级: Lv.{nextPromoConfig.level}</span>
          <span>当前等级: Lv.{unit.level}</span>
          <span class={unit.level >= nextPromoConfig.level ? 'ok' : 'no'}>
            {unit.level >= nextPromoConfig.level ? '✓ 已满足' : '✗ 未满足'}
          </span>
        </div>
        <div class="promo-cost">
          <span>消耗: 💎 {nextPromoConfig.cost} 晋升石</span>
          <span class={($legionStore.currency.promotionStone || 0) >= nextPromoConfig.cost ? 'ok' : 'no'}>
            持有: {$legionStore.currency.promotionStone || 0}
          </span>
        </div>
        <div class="promo-bonus">
          <span>晋升奖励:</span>
          <span class="bonus-text">
            攻击+{nextPromoConfig.statBonus.atk} 
            防御+{nextPromoConfig.statBonus.def} 
            生命+{nextPromoConfig.statBonus.hp}
            {#if nextPromoConfig.statBonus.move > 0}
              移动+{nextPromoConfig.statBonus.move}
            {/if}
            {#if nextPromoConfig.unlockSpecialization}
              <span class="unlock-text">· 解锁专精</span>
            {/if}
          </span>
        </div>
        <button 
          class="promote-btn"
          disabled={!canPromoteNow || ($legionStore.currency.promotionStone || 0) < nextPromoConfig.cost}
          on:click={handlePromote}
        >
          {unit.promotion >= LEVEL_CONFIG.promotionCount ? '已达最高晋升' : `晋升至 ${'★'.repeat(nextPromotion)}`}
        </button>
      </div>
    {:else}
      <div class="max-promotion">已达到最高晋升等级</div>
    {/if}
    
    {#if $legionStore.lastPromoteResult?.unitId === unit.id}
      <div class="promote-result {$legionStore.lastPromoteResult.success ? 'success' : 'error'}">
        {#if $legionStore.lastPromoteResult.success}
          🎉 晋升成功！
          {#if $legionStore.lastPromoteResult.unlocksSpecialization}
            <br>已解锁专精系统！
          {/if}
        {:else}
          ✗ {$legionStore.lastPromoteResult.reason}
        {/if}
      </div>
    {/if}
  </div>
  
  {#if unit.promotion >= 2}
    <div class="specialization-section">
      <h3>职业专精</h3>
      {#if unit.specialization}
        <div class="current-specialization">
          <span class="spec-label">当前专精:</span>
          <span class="spec-name">
            {availableSpecs.find(s => s.id === unit.specialization)?.name || unit.specialization}
          </span>
          <div class="spec-description">
            {availableSpecs.find(s => s.id === unit.specialization)?.description}
          </div>
        </div>
      {:else if canSpecialize}
        <div class="spec-choices">
          {#each availableSpecs as spec}
            <div class="spec-choice" on:click={() => handleSetSpecialization(spec.id)}>
              <h4>{spec.name}</h4>
              <p>{spec.description}</p>
            </div>
          {/each}
        </div>
      {:else}
        <div class="spec-locked">需要晋升至 2★ 解锁专精</div>
      {/if}
    </div>
  {/if}
  
  <div class="battle-stats">
    <h3>战斗记录</h3>
    <div class="battle-stats-grid">
      <div class="b-stat">
        <span class="b-label">出战次数</span>
        <span class="b-value">{unit.battleCount || 0}</span>
      </div>
      <div class="b-stat">
        <span class="b-label">击杀数</span>
        <span class="b-value">{unit.killCount || 0}</span>
      </div>
      <div class="b-stat">
        <span class="b-label">总获得经验</span>
        <span class="b-value">{unit.totalExpGained || 0}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .unit-detail-panel {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
    border: 2px solid var(--rarity-color);
    border-radius: 16px;
    padding: 24px;
    color: #fff;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .detail-header {
    display: flex;
    gap: 20px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .unit-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
  }
  
  .header-info {
    flex: 1;
    min-width: 0;
  }
  
  .unit-name {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #fff;
  }
  
  .unit-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  
  .rarity-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .level-badge {
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .promotion-stars {
    color: #ffd700;
    font-size: 16px;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  
  .unit-description {
    font-size: 13px;
    color: #aaa;
  }
  
  .exp-section {
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
  }
  
  .exp-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: #aaa;
  }
  
  .exp-bar-large {
    height: 24px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  
  .exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a, #cddc39);
    transition: width 0.5s ease;
  }
  
  .exp-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .exp-actions button {
    flex: 1;
    min-width: 100px;
    padding: 8px 12px;
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid #4caf50;
    border-radius: 8px;
    color: #4caf50;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .exp-actions button:hover {
    background: rgba(76, 175, 80, 0.4);
  }
  
  .stats-section,
  .stat-allocation-section,
  .promotion-section,
  .specialization-section,
  .battle-stats {
    margin-bottom: 20px;
  }
  
  .stats-section h3,
  .stat-allocation-section h3,
  .promotion-section h3,
  .specialization-section h3,
  .battle-stats h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #fff;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--rarity-color);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .stat-icon {
    font-size: 24px;
  }
  
  .stat-info {
    display: flex;
    flex-direction: column;
  }
  
  .stat-name {
    font-size: 12px;
    color: #aaa;
  }
  
  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }
  
  .allocation-grid {
    display: grid;
    gap: 8px;
  }
  
  .allocation-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .allocation-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .allocated {
    font-size: 12px;
    color: #888;
  }
  
  .allocate-btn {
    padding: 8px 16px;
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid #2196f3;
    border-radius: 6px;
    color: #2196f3;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .allocate-btn:hover:not(:disabled) {
    background: rgba(33, 150, 243, 0.4);
  }
  
  .allocate-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .promotion-info {
    padding: 16px;
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 12px;
  }
  
  .promo-requirement,
  .promo-cost,
  .promo-bonus {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .promo-bonus {
    flex-direction: column;
    gap: 4px;
  }
  
  .bonus-text {
    color: #4caf50;
    font-weight: 600;
  }
  
  .unlock-text {
    color: #9c27b0;
    font-weight: bold;
  }
  
  .ok { color: #4caf50; }
  .no { color: #f44336; }
  
  .promote-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #ff9800, #f57c00);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 12px;
  }
  
  .promote-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
  }
  
  .promote-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #666;
  }
  
  .max-promotion {
    text-align: center;
    padding: 20px;
    color: #888;
    font-style: italic;
  }
  
  .promote-result {
    margin-top: 12px;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    font-weight: bold;
  }
  
  .promote-result.success {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
  }
  
  .promote-result.error {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }
  
  .current-specialization {
    padding: 16px;
    background: rgba(156, 39, 176, 0.15);
    border: 1px solid rgba(156, 39, 176, 0.4);
    border-radius: 12px;
  }
  
  .spec-label {
    color: #aaa;
    margin-right: 8px;
  }
  
  .spec-name {
    font-size: 18px;
    font-weight: bold;
    color: #9c27b0;
  }
  
  .spec-description {
    margin-top: 8px;
    font-size: 13px;
    color: #ccc;
  }
  
  .spec-choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  
  .spec-choice {
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .spec-choice:hover {
    border-color: #9c27b0;
    background: rgba(156, 39, 176, 0.15);
    transform: translateY(-2px);
  }
  
  .spec-choice h4 {
    margin: 0 0 8px 0;
    color: #9c27b0;
  }
  
  .spec-choice p {
    margin: 0;
    font-size: 13px;
    color: #aaa;
  }
  
  .spec-locked {
    text-align: center;
    padding: 20px;
    color: #888;
    font-style: italic;
  }
  
  .battle-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .b-stat {
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    text-align: center;
  }
  
  .b-label {
    display: block;
    font-size: 12px;
    color: #888;
    margin-bottom: 4px;
  }
  
  .b-value {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
  }
  
  .stat-value-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  
  .equip-bonus {
    font-size: 12px;
    color: #4caf50;
    font-weight: normal;
  }
  
  .equipment-preview-section {
    margin-bottom: 20px;
  }
  
  .equipment-preview-section h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #fff;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--rarity-color);
  }
  
  .equip-slots-mini {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 10px;
  }
  
  .equip-slot-mini {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 8px 6px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  
  .equip-slot-mini.filled {
    border-color: var(--slot-color, #666);
    background: rgba(255, 255, 255, 0.08);
  }
  
  .equip-slot-mini.empty {
    border-color: rgba(255, 255, 255, 0.1);
    opacity: 0.6;
  }
  
  .mini-icon {
    font-size: 20px;
  }
  
  .mini-name {
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  .mini-empty {
    font-size: 10px;
    color: #666;
  }
  
  .set-bonus-mini {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }
  
  .set-label {
    font-size: 12px;
    color: #aaa;
  }
  
  .set-tag {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid var(--set-color, #666);
    border-radius: 10px;
    color: var(--set-color, #fff);
  }
</style>

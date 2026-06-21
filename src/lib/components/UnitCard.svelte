<script>
  // @ts-nocheck
  import { RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  
  export let unit;
  export let selected = false;
  export let showStats = true;
  export let compact = false;
  
  $: rarityInfo = RARITY_CONFIG[unit.rarity] || RARITY_CONFIG.COMMON;
  $: baseConfig = unitConfig[unit.type] || {};
  $: colorHex = '#' + baseConfig.color?.toString(16).padStart(6, '0') || '#888888';
</script>

<div 
  class="unit-card {selected ? 'selected' : ''} {compact ? 'compact' : ''}"
  style="--rarity-color: {rarityInfo.color}; --unit-color: {colorHex};"
>
  <div class="card-header">
    <div class="unit-icon" style="background: {colorHex};">
      {baseConfig.name?.charAt(0) || '?'}
    </div>
    <div class="unit-info">
      <div class="unit-name">{unit.name}</div>
      <div class="unit-type" style="color: {rarityInfo.color};">
        {rarityInfo.name} · Lv.{unit.level}
      </div>
    </div>
    {#if unit.promotion > 0}
      <div class="promotion-badge">
        {'★'.repeat(unit.promotion)}
      </div>
    {/if}
  </div>
  
  {#if showStats && !compact}
    <div class="card-stats">
      <div class="stat-row">
        <span class="stat-label">⚔️ 攻击</span>
        <span class="stat-value">{unit.stats?.attack || 0}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">🛡️ 防御</span>
        <span class="stat-value">{unit.stats?.defense || 0}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">❤️ 生命</span>
        <span class="stat-value">{unit.stats?.maxHp || 0}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">👟 移动</span>
        <span class="stat-value">{unit.stats?.moveRange || 0}</span>
      </div>
    </div>
    
    {#if unit.exp !== undefined}
      <div class="exp-bar">
        <div class="exp-fill" style="width: {(unit.exp / (unit.exp >= 0 ? 100 : 1)) * 100}%;"></div>
        <span class="exp-text">{unit.exp} EXP</span>
      </div>
    {/if}
    
    {#if unit.specialization}
      <div class="spec-badge">
        {unit.specialization === 'shield_guard' ? '盾卫' :
         unit.specialization === 'assault' ? '突击' :
         unit.specialization === 'iron_cavalry' ? '铁骑' :
         unit.specialization === 'scout' ? '游骑' :
         unit.specialization === 'sniper' ? '狙击' :
         unit.specialization === 'rapid_fire' ? '连射' :
         unit.specialization === 'elementalist' ? '元素' :
         unit.specialization === 'illusionist' ? '幻术' :
         unit.specialization === 'fortress' ? '堡垒' :
         unit.specialization === 'guardian' ? '守护' : unit.specialization}
      </div>
    {/if}
  {/if}
</div>

<style>
  .unit-card {
    background: linear-gradient(135deg, rgba(30, 30, 50, 0.95), rgba(20, 20, 40, 0.98));
    border: 2px solid var(--rarity-color);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .unit-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--rarity-color);
    opacity: 0.6;
  }
  
  .unit-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 0 15px var(--rarity-color);
  }
  
  .unit-card.selected {
    box-shadow: 0 0 20px var(--rarity-color), inset 0 0 10px rgba(255, 255, 255, 0.1);
  }
  
  .unit-card.compact {
    padding: 8px;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  
  .unit-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .compact .unit-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .unit-info {
    flex: 1;
    min-width: 0;
  }
  
  .unit-name {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 2px;
  }
  
  .compact .unit-name {
    font-size: 14px;
  }
  
  .unit-type {
    font-size: 12px;
    font-weight: 600;
  }
  
  .promotion-badge {
    font-size: 14px;
    color: #ffd700;
    text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  }
  
  .card-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }
  
  .stat-label {
    color: #aaa;
  }
  
  .stat-value {
    color: #fff;
    font-weight: 600;
  }
  
  .exp-bar {
    position: relative;
    height: 18px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 9px;
    margin-top: 10px;
    overflow: hidden;
  }
  
  .exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    transition: width 0.3s ease;
  }
  
  .exp-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 11px;
    color: #fff;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .spec-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 8px;
    background: rgba(155, 89, 182, 0.3);
    border: 1px solid #9b59b6;
    border-radius: 12px;
    font-size: 11px;
    color: #9b59b6;
    font-weight: 600;
  }
</style>

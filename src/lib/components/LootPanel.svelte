<script>
  // @ts-nocheck
  import { getRarityInfo, EQUIPMENT_SLOT_INFO } from '$lib/config/equipmentConfig.js';
  
  export let loot = [];
  export let title = '战利品';
  export let show = false;
  export let onCollect;
  export let onClose;
  
  function handleCollect() {
    if (onCollect) onCollect(loot);
    loot = [];
  }
  
  function handleClose() {
    if (onClose) onClose();
  }
  
  function getSlotIcon(slot) {
    return EQUIPMENT_SLOT_INFO[slot]?.icon || '📦';
  }
</script>

{#if show && loot.length > 0}
  <div class="loot-overlay" on:click={handleClose}>
    <div class="loot-panel" on:click|stopPropagation>
      <div class="loot-header">
        <h2>{title}</h2>
        <span class="loot-count">获得 {loot.length} 件装备</span>
      </div>
      
      <div class="loot-items">
        {#each loot as item (item.instanceId || item.id)}
          {@const rarityInfo = getRarityInfo(item.rarity)}
          <div 
            class="loot-item"
            style="--rarity-color: {rarityInfo.color}"
          >
            <div class="item-icon-wrapper">
              <span class="item-slot-icon">{getSlotIcon(item.slot)}</span>
              <div class="item-rarity-glow"></div>
            </div>
            <div class="item-info">
              <h3 class="item-name">{item.name}</h3>
              <div class="item-rarity-badge" style="background: {rarityInfo.color}">
                {rarityInfo.name}
              </div>
              {#if item.set}
                <div class="item-set">{item.setName || item.set}</div>
              {/if}
              
              {#if item.baseStats}
                <div class="item-stats">
                  {#if item.baseStats.attack}
                    <span class="stat">⚔️ +{item.baseStats.attack}</span>
                  {/if}
                  {#if item.baseStats.defense}
                    <span class="stat">🛡️ +{item.baseStats.defense}</span>
                  {/if}
                  {#if item.baseStats.maxHp}
                    <span class="stat">❤️ +{item.baseStats.maxHp}</span>
                  {/if}
                </div>
              {/if}
              
              {#if item.specialEffects && item.specialEffects.length > 0}
                <div class="item-effects">
                  {#each item.specialEffects as effect}
                    <span class="effect">{effect.description}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      
      <div class="loot-actions">
        <button class="btn-collect" on:click={handleCollect}>
          ✨ 收取全部
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .loot-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  
  .loot-panel {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #333;
    border-radius: 16px;
    padding: 24px;
    min-width: 400px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .loot-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #333;
  }
  
  .loot-header h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #fff;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  
  .loot-count {
    font-size: 14px;
    color: #888;
  }
  
  .loot-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .loot-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid var(--rarity-color, #333);
    border-radius: 12px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }
  
  .loot-item:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
  
  .item-icon-wrapper {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    flex-shrink: 0;
  }
  
  .item-slot-icon {
    font-size: 32px;
    position: relative;
    z-index: 1;
  }
  
  .item-rarity-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 10px;
    background: radial-gradient(circle, var(--rarity-color) 0%, transparent 70%);
    opacity: 0.3;
  }
  
  .item-info {
    flex: 1;
    min-width: 0;
  }
  
  .item-name {
    margin: 0 0 6px 0;
    font-size: 16px;
    color: var(--rarity-color, #fff);
    font-weight: bold;
  }
  
  .item-rarity-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 6px;
  }
  
  .item-set {
    font-size: 12px;
    color: #aaa;
    margin-bottom: 8px;
    font-style: italic;
  }
  
  .item-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .stat {
    font-size: 13px;
    color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
    padding: 2px 8px;
    border-radius: 6px;
  }
  
  .item-effects {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .effect {
    font-size: 12px;
    color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
  }
  
  .loot-actions {
    display: flex;
    justify-content: center;
    padding-top: 16px;
    border-top: 2px solid #333;
  }
  
  .btn-collect {
    padding: 14px 40px;
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  }
  
  .btn-collect:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.5);
  }
  
  .btn-collect:active {
    transform: translateY(0);
  }
</style>

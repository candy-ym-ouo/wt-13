<script>
  // @ts-nocheck
  import { legionStore } from '$lib/stores/legionStore.js';
  import { 
    EQUIPMENT_SLOTS, 
    EQUIPMENT_SLOT_INFO, 
    getRarityInfo,
    getSetById
  } from '$lib/config/equipmentConfig.js';
  import { 
    getUnitEquipmentStats,
    getUnitSetBonuses,
    getUnitSpecialEffects,
    getEquipmentPower,
    canUnitEquipItem
  } from '$lib/utils/legionSystem.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  
  export let unit = null;
  export let showInventory = true;
  
  let selectedSlot = null;
  let filterRarity = null;
  let filterSlot = null;
  
  $: equippedBySlot = unit ? getEquippedBySlot(unit.equipment || []) : {};
  $: equipStats = unit ? getUnitEquipmentStats(unit) : { attack: 0, defense: 0, maxHp: 0, moveRange: 0, attackRange: 0 };
  $: setBonuses = unit ? getUnitSetBonuses(unit) : { bonuses: [], activeSets: {} };
  $: specialEffects = unit ? getUnitSpecialEffects(unit) : [];
  
  $: filteredInventory = filterEquipment($legionStore.equipment || []);
  
  function getEquippedBySlot(equipment) {
    const result = {};
    for (const slot of Object.values(EQUIPMENT_SLOTS)) {
      result[slot] = null;
    }
    for (const item of equipment) {
      if (item && item.slot) {
        result[item.slot] = item;
      }
    }
    return result;
  }
  
  function filterEquipment(inventory) {
    let result = [...inventory];
    
    if (unit) {
      result = result.filter(item => canUnitEquipItem(unit.type, item));
    }
    
    if (filterSlot) {
      result = result.filter(item => item.slot === filterSlot);
    }
    
    if (filterRarity) {
      result = result.filter(item => item.rarity?.toUpperCase() === filterRarity);
    }
    
    result.sort((a, b) => {
      const rarityOrder = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];
      const aRarity = rarityOrder.indexOf(a.rarity?.toUpperCase());
      const bRarity = rarityOrder.indexOf(b.rarity?.toUpperCase());
      if (aRarity !== bRarity) return aRarity - bRarity;
      return getEquipmentPower(b) - getEquipmentPower(a);
    });
    
    return result;
  }
  
  function handleEquip(itemId) {
    if (!unit) return;
    legionStore.equipItem(unit.id, itemId);
  }
  
  function handleUnequip(slot) {
    if (!unit) return;
    legionStore.unequipItem(unit.id, slot);
  }
  
  function handleSlotClick(slot) {
    if (!unit) return;
    if (equippedBySlot[slot]) {
      handleUnequip(slot);
    } else {
      filterSlot = filterSlot === slot ? null : slot;
    }
  }
  
  function getRarityColor(rarity) {
    const info = getRarityInfo(rarity || 'COMMON');
    return info.color;
  }
  
  function getRarityName(rarity) {
    const info = getRarityInfo(rarity || 'COMMON');
    return info.name;
  }
</script>

<div class="equipment-panel">
  {#if unit}
    <div class="panel-header">
      <h3>🎒 装备栏</h3>
      <div class="unit-info">
        <span>{unit.name}</span>
        <span class="level">Lv.{unit.level}</span>
      </div>
    </div>
    
    <div class="equipment-slots">
      {#each Object.entries(EQUIPMENT_SLOT_INFO) as [slot, info]}
        <div 
          class="equipment-slot {equippedBySlot[slot] ? 'filled' : 'empty'} {filterSlot === slot ? 'selected' : ''}"
          style="--slot-color: {info.color}"
          on:click={() => handleSlotClick(slot)}
          title="{info.name}"
        >
          {#if equippedBySlot[slot]}
            {@const item = equippedBySlot[slot]}
            <div class="item-equipped" style="--rarity-color: {getRarityColor(item.rarity)}">
              <span class="item-icon">{info.icon}</span>
              <span class="item-name">{item.name}</span>
              <span class="item-level">+{item.enhancement || 0}</span>
            </div>
          {:else}
            <div class="slot-empty">
              <span class="slot-icon">{info.icon}</span>
              <span class="slot-name">{info.name}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    <div class="equip-stats">
      <h4>装备加成</h4>
      <div class="stats-grid">
        <div class="stat-row">
          <span>⚔️ 攻击</span>
          <span class="stat-value positive">+{equipStats.attack}</span>
        </div>
        <div class="stat-row">
          <span>🛡️ 防御</span>
          <span class="stat-value positive">+{equipStats.defense}</span>
        </div>
        <div class="stat-row">
          <span>❤️ 生命</span>
          <span class="stat-value positive">+{equipStats.maxHp}</span>
        </div>
        <div class="stat-row">
          <span>👟 移动</span>
          <span class="stat-value positive">+{equipStats.moveRange}</span>
        </div>
        <div class="stat-row">
          <span>🎯 射程</span>
          <span class="stat-value positive">+{equipStats.attackRange}</span>
        </div>
      </div>
    </div>
    
    {#if setBonuses.bonuses.length > 0}
      <div class="set-bonuses">
        <h4>🎁 套装效果</h4>
        {#each setBonuses.bonuses as bonus}
          <div class="set-bonus" style="--set-color: {bonus.setColor}">
            <span class="set-name">{bonus.setName}</span>
            <span class="set-label">{bonus.label}</span>
          </div>
        {/each}
      </div>
    {/if}
    
    {#if specialEffects.length > 0}
      <div class="special-effects">
        <h4>✨ 特殊效果</h4>
        <div class="effects-list">
          {#each specialEffects as effect}
            <div class="effect-item" class:set-bonus={effect.isSetBonus}>
              <span class="effect-desc">{effect.description}</span>
              <span class="effect-source">— {effect.source}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    {#if showInventory}
      <div class="inventory-section">
        <div class="inventory-header">
          <h4>📦 装备库存 ({$legionStore.equipment?.length || 0})</h4>
          <div class="filter-buttons">
            <button 
              class="filter-btn {filterSlot === null ? 'active' : ''}"
              on:click={() => filterSlot = null}
            >
              全部
            </button>
            {#each Object.entries(EQUIPMENT_SLOT_INFO) as [slot, info]}
              <button 
                class="filter-btn {filterSlot === slot ? 'active' : ''}"
                style="--btn-color: {info.color}"
                on:click={() => filterSlot = filterSlot === slot ? null : slot}
                title="{info.name}"
              >
                {info.icon}
              </button>
            {/each}
          </div>
        </div>
        
        <div class="rarity-filter">
          {#each ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as rarity}
            <button 
              class="rarity-btn {filterRarity === rarity ? 'active' : ''}"
              style="--rarity-color: {getRarityColor(rarity)}"
              on:click={() => filterRarity = filterRarity === rarity ? null : rarity}
            >
              {getRarityName(rarity)}
            </button>
          {/each}
        </div>
        
        <div class="inventory-grid">
          {#each filteredInventory as item}
            <div 
              class="inventory-item"
              style="--rarity-color: {getRarityColor(item.rarity)}"
              on:click={() => handleEquip(item.id)}
            >
              <div class="item-header">
                <span class="item-icon">{EQUIPMENT_SLOT_INFO[item.slot]?.icon || '❓'}</span>
                <span class="item-rarity" style="color: {getRarityColor(item.rarity)}">
                  {getRarityName(item.rarity)}
                </span>
              </div>
              <div class="item-name">{item.name}</div>
              {#if item.set}
                {@const setInfo = getSetById(item.set)}
                <div class="item-set" style="color: {setInfo?.color || '#888'}">
                  套装: {setInfo?.name || item.set}
                </div>
              {/if}
              <div class="item-stats">
                {#if item.baseStats?.attack}
                  <span>攻+{item.baseStats.attack}</span>
                {/if}
                {#if item.baseStats?.defense}
                  <span>防+{item.baseStats.defense}</span>
                {/if}
                {#if item.baseStats?.maxHp}
                  <span>血+{item.baseStats.maxHp}</span>
                {/if}
              </div>
              <div class="item-power">战力: {getEquipmentPower(item)}</div>
            </div>
          {/each}
          
          {#if filteredInventory.length === 0}
            <div class="empty-inventory">
              没有符合条件的装备
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {:else}
    <div class="no-unit-selected">
      请选择一个单位查看装备
    </div>
  {/if}
</div>

<style>
  .equipment-panel {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
    border-radius: 16px;
    padding: 20px;
    color: #fff;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: 20px;
  }
  
  .unit-info {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .level {
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 12px;
  }
  
  .equipment-slots {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .equipment-slot {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .equipment-slot:hover {
    border-color: var(--slot-color, #666);
    background: rgba(255, 255, 255, 0.08);
  }
  
  .equipment-slot.selected {
    border-color: var(--slot-color, #666);
    box-shadow: 0 0 15px var(--slot-color, rgba(255,255,255,0.2));
  }
  
  .equipment-slot.filled {
    border-color: var(--rarity-color, #666);
  }
  
  .item-equipped {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  
  .item-icon {
    font-size: 28px;
  }
  
  .item-name {
    font-size: 12px;
    font-weight: bold;
    color: var(--rarity-color, #fff);
    text-align: center;
  }
  
  .item-level {
    font-size: 11px;
    color: #ffd700;
  }
  
  .slot-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    opacity: 0.5;
  }
  
  .slot-icon {
    font-size: 24px;
  }
  
  .slot-name {
    font-size: 11px;
    color: #888;
  }
  
  .equip-stats,
  .set-bonuses,
  .special-effects {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
  }
  
  .equip-stats h4,
  .set-bonuses h4,
  .special-effects h4 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #aaa;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }
  
  .stat-value.positive {
    color: #4caf50;
    font-weight: bold;
  }
  
  .set-bonus {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    margin-bottom: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid var(--set-color, #666);
    border-radius: 4px;
    font-size: 12px;
  }
  
  .set-name {
    font-weight: bold;
    color: var(--set-color, #fff);
  }
  
  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .effect-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    font-size: 12px;
  }
  
  .effect-item.set-bonus {
    background: rgba(156, 39, 176, 0.1);
  }
  
  .effect-desc {
    color: #ccc;
  }
  
  .effect-source {
    color: #888;
    font-size: 11px;
  }
  
  .inventory-section {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 16px;
  }
  
  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .inventory-header h4 {
    margin: 0;
    font-size: 14px;
    color: #aaa;
  }
  
  .filter-buttons {
    display: flex;
    gap: 4px;
  }
  
  .filter-btn {
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }
  
  .filter-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .filter-btn.active {
    background: rgba(33, 150, 243, 0.2);
    border-color: var(--btn-color, #2196f3);
    color: var(--btn-color, #2196f3);
  }
  
  .rarity-filter {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  
  .rarity-btn {
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 12px;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s ease;
  }
  
  .rarity-btn:hover {
    border-color: var(--rarity-color, #666);
  }
  
  .rarity-btn.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--rarity-color, #666);
    color: var(--rarity-color, #fff);
  }
  
  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    max-height: 300px;
    overflow-y: auto;
    padding: 4px;
  }
  
  .inventory-item {
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    border-radius: 10px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  
  .inventory-item:hover {
    border-color: var(--rarity-color, #666);
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-2px);
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  
  .item-header .item-icon {
    font-size: 20px;
  }
  
  .item-rarity {
    font-size: 10px;
    font-weight: bold;
  }
  
  .inventory-item .item-name {
    font-size: 12px;
    margin-bottom: 4px;
    color: #fff;
  }
  
  .item-set {
    font-size: 10px;
    margin-bottom: 6px;
    font-style: italic;
  }
  
  .item-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 10px;
    color: #4caf50;
    margin-bottom: 6px;
  }
  
  .item-power {
    font-size: 10px;
    color: #ffd700;
    text-align: right;
  }
  
  .empty-inventory {
    grid-column: 1 / -1;
    text-align: center;
    padding: 30px;
    color: #666;
    font-style: italic;
  }
  
  .no-unit-selected {
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
  }
</style>

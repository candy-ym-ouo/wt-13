<script>
  // @ts-nocheck
  import { legionStore, activeLineup, activeLineupUnits, lineupPower } from '$lib/stores/legionStore.js';
  import { LINEUP_CONFIG, RARITY_CONFIG } from '$lib/config/legionConfig.js';
  import { unitConfig } from '$lib/config/unitConfig.js';
  import UnitCard from './UnitCard.svelte';
  
  let selectedLineupId = null;
  let editingLineup = false;
  let newLineupName = '';
  
  $: selectedLineup = $legionStore.lineups.find(l => l.id === selectedLineupId) || $activeLineup;
  $: selectedLineupUnits = selectedLineup 
    ? selectedLineup.unitIds.map(id => $legionStore.units.find(u => u.id === id)).filter(Boolean)
    : [];
  $: availableUnits = $legionStore.units.filter(u => !selectedLineup?.unitIds.includes(u.id));
  
  function selectLineup(lineupId) {
    selectedLineupId = lineupId;
    legionStore.setActiveLineup(lineupId);
  }
  
  function createNewLineup() {
    if (!newLineupName.trim()) return;
    legionStore.createLineup(newLineupName.trim());
    newLineupName = '';
  }
  
  function deleteLineup(lineupId) {
    if (confirm('确定要删除这个阵容吗？')) {
      legionStore.deleteLineup(lineupId);
      if (selectedLineupId === lineupId) {
        selectedLineupId = null;
      }
    }
  }
  
  function renameLineup(lineupId) {
    const newName = prompt('输入新的阵容名称:', selectedLineup?.name);
    if (newName && newName.trim()) {
      legionStore.renameLineup(lineupId, newName.trim());
    }
  }
  
  function addToLineup(unitId) {
    if (!selectedLineup) return;
    if (selectedLineup.unitIds.length >= LINEUP_CONFIG.maxUnitsPerLineup) return;
    legionStore.addUnitToLineup(selectedLineup.id, unitId);
  }
  
  function removeFromLineup(unitId) {
    if (!selectedLineup) return;
    legionStore.removeUnitFromLineup(selectedLineup.id, unitId);
  }
  
  function calculateLineupPower(units) {
    return units.reduce((sum, unit) => {
      const stats = unit.stats || {};
      return sum + (stats.attack || 0) + (stats.defense || 0) + Math.floor((stats.maxHp || 0) / 10);
    }, 0);
  }
</script>

<div class="lineup-panel">
  <div class="panel-header">
    <h2>⚔️ 阵容管理</h2>
    <div class="header-stats">
      <span class="power-display">
        总战力: <strong>{$lineupPower}</strong>
      </span>
      <span class="lineup-count">
        阵容: {$legionStore.lineups.length}/{LINEUP_CONFIG.maxLineups}
      </span>
    </div>
  </div>
  
  <div class="lineup-list">
    <h3>我的阵容</h3>
    <div class="lineup-cards">
      {#each $legionStore.lineups as lineup}
        <div 
          class="lineup-card {selectedLineup?.id === lineup.id ? 'selected' : ''} {lineup.id === $legionStore.activeLineupId ? 'active' : ''}"
          on:click={() => selectLineup(lineup.id)}
        >
          <div class="lineup-card-header">
            <span class="lineup-name">{lineup.name}</span>
            {#if lineup.id === $legionStore.activeLineupId}
              <span class="active-badge">出战中</span>
            {/if}
          </div>
          <div class="lineup-card-info">
            <span>{lineup.unitIds.length}/{LINEUP_CONFIG.maxUnitsPerLineup} 单位</span>
            <span>战力: {calculateLineupPower(lineup.unitIds.map(id => $legionStore.units.find(u => u.id === id)).filter(Boolean))}</span>
          </div>
          <div class="lineup-unit-previews">
            {#each lineup.unitIds.slice(0, 6) as unitId}
              {@const unit = $legionStore.units.find(u => u.id === unitId)}
              {#if unit}
                <div 
                  class="unit-preview"
                  style="background: {'#' + (unitConfig[unit.type]?.color?.toString(16).padStart(6, '0') || '888888')};"
                  title="{unit.name} Lv.{unit.level}"
                >
                  {unitConfig[unit.type]?.name?.charAt(0)}
                </div>
              {/if}
            {/each}
            {#if lineup.unitIds.length > 6}
              <div class="unit-preview more">+{lineup.unitIds.length - 6}</div>
            {/if}
          </div>
          <div class="lineup-actions">
            <button class="action-btn" on:click|stopPropagation={() => renameLineup(lineup.id)}>✏️</button>
            <button class="action-btn delete" on:click|stopPropagation={() => deleteLineup(lineup.id)}>🗑️</button>
          </div>
        </div>
      {/each}
      
      {#if $legionStore.lineups.length < LINEUP_CONFIG.maxLineups}
        <div class="lineup-card create-new">
          <div class="create-form">
            <input 
              type="text" 
              bind:value={newLineupName} 
              placeholder="输入阵容名称"
              on:keydown={(e) => e.key === 'Enter' && createNewLineup()}
            />
            <button on:click={createNewLineup} disabled={!newLineupName.trim()}>
              + 创建
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  {#if selectedLineup}
    <div class="lineup-editor">
      <div class="editor-header">
        <h3>编辑: {selectedLineup.name}</h3>
        <button class="toggle-edit" on:click={() => editingLineup = !editingLineup}>
          {editingLineup ? '完成编辑' : '编辑阵容'}
        </button>
      </div>
      
      <div class="editor-content">
        <div class="current-lineup">
          <h4>当前阵容 ({selectedLineupUnits.length}/{LINEUP_CONFIG.maxUnitsPerLineup})</h4>
          <div class="units-grid">
            {#each selectedLineupUnits as unit}
              <div class="unit-slot">
                <UnitCard {unit} compact={true} showStats={true} />
                {#if editingLineup}
                  <button class="remove-btn" on:click={() => removeFromLineup(unit.id)}>×</button>
                {/if}
              </div>
            {/each}
            {#each Array(LINEUP_CONFIG.maxUnitsPerLineup - selectedLineupUnits.length) as _, i}
              <div class="unit-slot empty">
                <div class="empty-slot">空位</div>
              </div>
            {/each}
          </div>
        </div>
        
        {#if editingLineup}
          <div class="available-units">
            <h4>可添加单位 ({availableUnits.length})</h4>
            <div class="units-grid available">
              {#each availableUnits as unit}
                <div class="unit-slot" on:click={() => addToLineup(unit.id)}>
                  <UnitCard {unit} compact={true} showStats={true} />
                  <div class="add-overlay">+ 添加</div>
                </div>
              {/each}
              {#if availableUnits.length === 0}
                <div class="no-units">所有单位已在阵容中</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  
  {#if !selectedLineup}
    <div class="no-lineup-selected">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>选择或创建阵容</h3>
        <p>选择一个阵容查看详情，或创建新的阵容</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .lineup-panel {
    background: linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(20, 20, 40, 0.98));
    border-radius: 16px;
    padding: 24px;
    color: #fff;
    max-height: 80vh;
    overflow-y: auto;
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
  
  .header-stats {
    display: flex;
    gap: 16px;
    font-size: 14px;
  }
  
  .power-display strong {
    color: #ffd700;
    font-size: 18px;
  }
  
  .lineup-list {
    margin-bottom: 24px;
  }
  
  .lineup-list h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #aaa;
  }
  
  .lineup-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  
  .lineup-card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
  }
  
  .lineup-card:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }
  
  .lineup-card.selected {
    border-color: #2196f3;
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
  }
  
  .lineup-card.active {
    border-color: #4caf50;
  }
  
  .lineup-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .lineup-name {
    font-size: 16px;
    font-weight: bold;
  }
  
  .active-badge {
    background: #4caf50;
    padding: 2px 8px;
    border-radius: 8px;
    font-size: 10px;
  }
  
  .lineup-card-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #aaa;
    margin-bottom: 12px;
  }
  
  .lineup-unit-previews {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  
  .unit-preview {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  }
  
  .unit-preview.more {
    background: #666;
    font-size: 10px;
  }
  
  .lineup-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .lineup-card:hover .lineup-actions {
    opacity: 1;
  }
  
  .action-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  
  .action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .action-btn.delete:hover {
    background: #f44336;
  }
  
  .lineup-card.create-new {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .create-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .create-form input {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
  }
  
  .create-form button {
    padding: 10px;
    background: linear-gradient(135deg, #2196f3, #1565c0);
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .create-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .lineup-editor {
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  
  .toggle-edit {
    padding: 8px 16px;
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid #2196f3;
    border-radius: 6px;
    color: #2196f3;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s ease;
  }
  
  .toggle-edit:hover {
    background: rgba(33, 150, 243, 0.4);
  }
  
  .current-lineup h4,
  .available-units h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #aaa;
  }
  
  .units-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }
  
  .unit-slot {
    position: relative;
  }
  
  .unit-slot.empty .empty-slot {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.03);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #666;
    font-size: 14px;
  }
  
  .remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: #f44336;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .available-units {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .units-grid.available .unit-slot {
    cursor: pointer;
  }
  
  .add-overlay {
    position: absolute;
    inset: 0;
    background: rgba(76, 175, 80, 0.8);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-weight: bold;
    font-size: 16px;
  }
  
  .units-grid.available .unit-slot:hover .add-overlay {
    opacity: 1;
  }
  
  .no-units {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: #666;
    font-style: italic;
  }
  
  .no-lineup-selected {
    padding: 60px 20px;
  }
  
  .empty-state {
    text-align: center;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  .empty-state h3 {
    margin: 0 0 8px 0;
    color: #fff;
  }
  
  .empty-state p {
    margin: 0;
    color: #888;
  }
</style>

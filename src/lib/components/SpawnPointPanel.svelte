<script>
  import { editorStore } from '$lib/stores/editorStore';
  import { FACTION_CONFIG, UNIT_TYPES } from '$lib/config/campaignConfig';
  import { unitConfig } from '$lib/config/unitConfig';

  let selectedFaction = 'red';
  let showUnitPanel = true;
  let selectedSpawnId = null;

  $: campaign = $editorStore.campaign;
  $: spawnPoints = campaign.spawnPoints;
  $: initialUnits = campaign.initialUnits;
  $: selectedSpawn = selectedSpawnId
    ? spawnPoints.red.find(s => s.id === selectedSpawnId) ||
      spawnPoints.blue.find(s => s.id === selectedSpawnId)
    : null;

  function selectSpawn(spawn, faction) {
    selectedSpawnId = spawn.id;
  }

  function updateSpawnLabel(event) {
    if (!selectedSpawnId) return;
    $editorStore.updateSpawnPoint(selectedFaction, selectedSpawnId, {
      label: event.target.value
    });
  }

  function updateSpawnUnitType(event) {
    if (!selectedSpawnId) return;
    $editorStore.updateSpawnPoint(selectedFaction, selectedSpawnId, {
      unitType: event.target.value
    });
  }

  function updateSpawnMaxUnits(event) {
    if (!selectedSpawnId) return;
    $editorStore.updateSpawnPoint(selectedFaction, selectedSpawnId, {
      maxUnits: parseInt(event.target.value) || 1
    });
  }

  function removeSpawn(spawn) {
    if (confirm('确定要删除这个出生点吗？')) {
      $editorStore.removeSpawnPoint(selectedFaction, spawn.id);
      selectedSpawnId = null;
    }
  }

  function addInitialUnit(unitType) {
    const spawn = spawnPoints[selectedFaction][0];
    if (spawn) {
      $editorStore.addInitialUnit(selectedFaction, unitType, spawn.x, spawn.y);
    } else {
      $editorStore.addInitialUnit(selectedFaction, unitType, 0, 0);
    }
  }

  function removeUnit(unitId) {
    if (confirm('确定要删除这个初始单位吗？')) {
      $editorStore.removeInitialUnit(selectedFaction, unitId);
    }
  }

  function getUnitInfo(type) {
    return unitConfig[type] || { name: type, hp: 0 };
  }

  function getUnitIcon(type) {
    const icons = {
      infantry: '⚔️',
      cavalry: '🐴',
      archer: '🏹',
      mage: '🔮',
      tank: '🛡️',
      scout: '🔍'
    };
    return icons[type] || '❓';
  }

  function moveUnit(unitId, dx, dy) {
    const unit = initialUnits[selectedFaction].find(u => u.id === unitId);
    if (!unit) return;
    
    const newX = Math.max(0, Math.min(campaign.map.width - 1, unit.x + dx));
    const newY = Math.max(0, Math.min(campaign.map.height - 1, unit.y + dy));
    
    if (newX !== unit.x || newY !== unit.y) {
      $editorStore.removeInitialUnit(selectedFaction, unitId);
      $editorStore.addInitialUnit(selectedFaction, unit.type, newX, newY);
    }
  }
</script>

<div class="spawn-point-panel">
  <div class="panel-header">
    <h3>🎯 出生点配置</h3>
  </div>

  <div class="faction-tabs">
    <button 
      class="faction-tab {selectedFaction === 'red' ? 'active' : ''}"
      style="--faction-color: {FACTION_CONFIG.red.color}"
      on:click={() => { selectedFaction = 'red'; selectedSpawnId = null; }}
    >
      🔴 红方
    </button>
    <button 
      class="faction-tab {selectedFaction === 'blue' ? 'active' : ''}"
      style="--faction-color: {FACTION_CONFIG.blue.color}"
      on:click={() => { selectedFaction = 'blue'; selectedSpawnId = null; }}
    >
      🔵 蓝方
    </button>
  </div>

  <div class="panel-section">
    <div class="section-title">
      <span>📍 出生点列表</span>
      <span class="count">{spawnPoints[selectedFaction].length}</span>
    </div>
    
    <div class="spawn-list">
      {#if spawnPoints[selectedFaction].length === 0}
        <div class="empty-hint">
          <p>暂无出生点</p>
          <p class="hint">在地图上点击添加出生点</p>
        </div>
      {:else}
        {#each spawnPoints[selectedFaction] as spawn}
          <div 
            class="spawn-item {selectedSpawnId === spawn.id ? 'selected' : ''}"
            on:click={() => selectSpawn(spawn, selectedFaction)}
          >
            <div class="spawn-icon">🚩</div>
            <div class="spawn-info">
              <div class="spawn-name">{spawn.label || '未命名出生点'}</div>
              <div class="spawn-detail">
                位置: ({spawn.x}, {spawn.y})
                <span class="divider">|</span>
                类型: {getUnitInfo(spawn.unitType)?.name || spawn.unitType}
              </div>
            </div>
            <button 
              class="delete-btn"
              on:click|stopPropagation={() => removeSpawn(spawn)}
              title="删除"
            >✕</button>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  {#if selectedSpawn}
    <div class="panel-section">
      <div class="section-title">⚙️ 出生点设置</div>
      
      <div class="form-group">
        <label>标签名称</label>
        <input 
          type="text" 
          value={selectedSpawn.label}
          on:input={updateSpawnLabel}
          placeholder="输入出生点名称"
        />
      </div>

      <div class="form-group">
        <label>默认单位类型</label>
        <select 
          value={selectedSpawn.unitType}
          on:change={updateSpawnUnitType}
        >
          {#each Object.values(UNIT_TYPES) as type}
            <option value={type}>{getUnitInfo(type)?.name || type}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>最大单位数: {selectedSpawn.maxUnits}</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={selectedSpawn.maxUnits}
          on:input={updateSpawnMaxUnits}
        />
      </div>
    </div>
  {/if}

  <div class="panel-section">
    <div class="section-title">
      <span>🎖️ 初始单位</span>
      <span class="count">{initialUnits[selectedFaction].length}</span>
    </div>

    <div class="unit-list">
      {#if initialUnits[selectedFaction].length === 0}
        <div class="empty-hint">
          <p>暂无初始单位</p>
        </div>
      {:else}
        {#each initialUnits[selectedFaction] as unit}
          <div class="unit-item">
            <div class="unit-icon">{getUnitIcon(unit.type)}</div>
            <div class="unit-info">
              <div class="unit-name">{getUnitInfo(unit.type)?.name || unit.type}</div>
              <div class="unit-detail">
                位置: ({unit.x}, {unit.y})
                <span class="divider">|</span>
                Lv.{unit.level}
              </div>
            </div>
            <div class="unit-actions">
              <button 
                class="move-btn up"
                on:click={() => moveUnit(unit.id, 0, -1)}
                title="上移"
              >↑</button>
              <button 
                class="move-btn down"
                on:click={() => moveUnit(unit.id, 0, 1)}
                title="下移"
              >↓</button>
              <button 
                class="move-btn left"
                on:click={() => moveUnit(unit.id, -1, 0)}
                title="左移"
              >←</button>
              <button 
                class="move-btn right"
                on:click={() => moveUnit(unit.id, 1, 0)}
                title="右移"
              >→</button>
              <button 
                class="delete-btn"
                on:click={() => removeUnit(unit.id)}
                title="删除"
              >✕</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="add-unit-section">
      <p class="hint">添加初始单位:</p>
      <div class="unit-type-grid">
        {#each Object.values(UNIT_TYPES) as type}
          <button 
            class="unit-type-btn"
            on:click={() => addInitialUnit(type)}
            title={getUnitInfo(type)?.name || type}
          >
            <span class="icon">{getUnitIcon(type)}</span>
            <span class="name">{getUnitInfo(type)?.name || type}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .spawn-point-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .panel-header {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }

  .faction-tabs {
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .faction-tab {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: none;
    color: #aaa;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .faction-tab:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .faction-tab.active {
    color: #fff;
    border-bottom-color: var(--faction-color);
    background: rgba(255, 255, 255, 0.05);
  }

  .panel-section {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #bbb;
    margin-bottom: 10px;
    font-weight: 600;
  }

  .count {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    color: #fff;
  }

  .spawn-list,
  .unit-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .spawn-item,
  .unit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .spawn-item:hover,
  .unit-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .spawn-item.selected {
    background: rgba(52, 152, 219, 0.2);
    border: 1px solid rgba(52, 152, 219, 0.5);
  }

  .spawn-icon,
  .unit-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  .spawn-info,
  .unit-info {
    flex: 1;
    min-width: 0;
  }

  .spawn-name,
  .unit-name {
    font-size: 13px;
    color: #fff;
    font-weight: 500;
  }

  .spawn-detail,
  .unit-detail {
    font-size: 11px;
    color: #888;
    margin-top: 2px;
  }

  .divider {
    color: #555;
    margin: 0 4px;
  }

  .unit-actions {
    display: flex;
    gap: 2px;
  }

  .delete-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-btn:hover {
    background: rgba(231, 76, 60, 0.4);
  }

  .move-btn {
    width: 20px;
    height: 20px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: #aaa;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .move-btn:hover {
    background: rgba(52, 152, 219, 0.3);
    color: #fff;
  }

  .unit-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .empty-hint {
    text-align: center;
    padding: 20px;
    color: #666;
  }

  .empty-hint p {
    margin: 4px 0;
    font-size: 13px;
  }

  .hint {
    font-size: 11px !important;
    color: #555;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    color: #aaa;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3498db;
  }

  .form-group input[type="range"] {
    padding: 0;
    height: 4px;
  }

  .add-unit-section {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .unit-type-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .unit-type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    cursor: pointer;
    color: #ccc;
    transition: all 0.2s;
  }

  .unit-type-btn:hover {
    background: rgba(52, 152, 219, 0.2);
    border-color: #3498db;
    color: #fff;
  }

  .unit-type-btn .icon {
    font-size: 20px;
  }

  .unit-type-btn .name {
    font-size: 10px;
  }
</style>

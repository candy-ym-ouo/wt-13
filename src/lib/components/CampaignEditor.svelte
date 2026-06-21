<script>
  import { onMount, onDestroy } from 'svelte';
  import { editorStore, TOOL_TYPES } from '$lib/stores/editorStore';
  import {
    TERRAIN_CONFIG,
    TERRAIN_TYPES,
    FACTION_CONFIG
  } from '$lib/config/campaignConfig';
  import MapEditor from '$lib/components/MapEditor.svelte';
  import SpawnPointPanel from '$lib/components/SpawnPointPanel.svelte';
  import EventChainEditor from '$lib/components/EventChainEditor.svelte';
  import PublishManager from '$lib/components/PublishManager.svelte';
  import { saveCampaign, autosaveCampaign, getAutosaveCampaign } from '$lib/utils/campaignStorage';

  let autosaveInterval = null;
  let lastAutosaveTime = '';

  $: campaign = $editorStore.campaign;
  $: tool = $editorStore.tool;
  $: selectedTerrain = $editorStore.selectedTerrain;
  $: selectedFaction = $editorStore.selectedFaction;
  $: brushSize = $editorStore.brushSize;
  $: activeTab = $editorStore.activeTab;
  $: isDirty = $editorStore.isDirty;
  $: canUndo = $editorStore.canUndo;
  $: canRedo = $editorStore.canRedo;
  $: showPreview = $editorStore.showPreview;

  onMount(() => {
    const autosave = getAutosaveCampaign();
    if (autosave && confirm('检测到自动保存的战役，是否恢复？')) {
      $editorStore.loadCampaign(autosave);
    }

    autosaveInterval = setInterval(() => {
      if ($editorStore.isDirty) {
        autosaveCampaign(campaign);
        lastAutosaveTime = new Date().toLocaleTimeString('zh-CN');
      }
    }, 30000);
  });

  onDestroy(() => {
    if (autosaveInterval) {
      clearInterval(autosaveInterval);
    }
  });

  function handleSave() {
    const result = saveCampaign(campaign);
    if (result.success) {
      $editorStore.saveHistory();
      alert('保存成功！');
    } else {
      alert('保存失败: ' + result.message);
    }
  }

  function handleUndo() {
    $editorStore.undo();
  }

  function handleRedo() {
    $editorStore.redo();
  }

  function setTool(newTool) {
    $editorStore.setTool(newTool);
  }

  function selectTerrain(terrain) {
    $editorStore.setSelectedTerrain(terrain);
    $editorStore.setTool(TOOL_TYPES.PAINT_TERRAIN);
  }

  function setActiveTab(tab) {
    $editorStore.setActiveTab(tab);
  }

  function setBrushSize(size) {
    $editorStore.setBrushSize(size);
  }

  function setFaction(faction) {
    $editorStore.setSelectedFaction(faction);
  }

  function togglePreview() {
    $editorStore.togglePreview();
  }

  function resizeMap(width, height) {
    $editorStore.updateMapSettings({ width, height });
  }

  const terrainCategories = [
    {
      name: '基础地形',
      terrains: [TERRAIN_TYPES.PLAIN, TERRAIN_TYPES.FOREST, TERRAIN_TYPES.MOUNTAIN, TERRAIN_TYPES.WATER]
    },
    {
      name: '特殊地形',
      terrains: [TERRAIN_TYPES.ROAD, TERRAIN_TYPES.RUINS, TERRAIN_TYPES.FORTRESS]
    },
    {
      name: '基地',
      terrains: [TERRAIN_TYPES.BASE_RED, TERRAIN_TYPES.BASE_BLUE]
    }
  ];
</script>

<div class="campaign-editor">
  <header class="editor-header">
    <div class="header-left">
      <h1 class="app-title">⚔️ 战役剧本编辑器</h1>
      <span class="campaign-name">{campaign.name}</span>
      {#if isDirty}
        <span class="dirty-indicator" title="有未保存的更改">●</span>
      {/if}
    </div>

    <div class="header-center">
      <nav class="main-tabs">
        <button 
          class="tab-btn {activeTab === 'map' ? 'active' : ''}"
          on:click={() => setActiveTab('map')}
        >
          🗺️ 地图
        </button>
        <button 
          class="tab-btn {activeTab === 'spawn' ? 'active' : ''}"
          on:click={() => setActiveTab('spawn')}
        >
          🎯 出生点
        </button>
        <button 
          class="tab-btn {activeTab === 'events' ? 'active' : ''}"
          on:click={() => setActiveTab('events')}
        >
          ⚡ 事件
        </button>
        <button 
          class="tab-btn {activeTab === 'publish' ? 'active' : ''}"
          on:click={() => setActiveTab('publish')}
        >
          📦 发布
        </button>
      </nav>
    </div>

    <div class="header-right">
      <button 
        class="tool-btn"
        on:click={handleUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
      >
        ↩️
      </button>
      <button 
        class="tool-btn"
        on:click={handleRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
      >
        ↪️
      </button>
      <span class="divider"></span>
      <button 
        class="tool-btn"
        on:click={togglePreview}
        class:active={showPreview}
        title="预览模式"
      >
        👁️
      </button>
      <button 
        class="save-btn"
        on:click={handleSave}
      >
        💾 保存
      </button>
    </div>
  </header>

  <div class="editor-body">
    <aside class="left-panel">
      {#if activeTab === 'map'}
        <div class="panel-section">
          <h3 class="section-title">🛠️ 工具</h3>
          <div class="tool-grid">
            <button 
              class="tool-item {tool === TOOL_TYPES.SELECT ? 'active' : ''}"
              on:click={() => setTool(TOOL_TYPES.SELECT)}
              title="选择工具"
            >
              <span class="tool-icon">👆</span>
              <span class="tool-name">选择</span>
            </button>
            <button 
              class="tool-item {tool === TOOL_TYPES.PAINT_TERRAIN ? 'active' : ''}"
              on:click={() => setTool(TOOL_TYPES.PAINT_TERRAIN)}
              title="画笔工具"
            >
              <span class="tool-icon">🖌️</span>
              <span class="tool-name">画笔</span>
            </button>
            <button 
              class="tool-item {tool === TOOL_TYPES.ERASE ? 'active' : ''}"
              on:click={() => setTool(TOOL_TYPES.ERASE)}
              title="橡皮擦"
            >
              <span class="tool-icon">🧹</span>
              <span class="tool-name">橡皮</span>
            </button>
            <button 
              class="tool-item {tool === TOOL_TYPES.FILL ? 'active' : ''}"
              on:click={() => setTool(TOOL_TYPES.FILL)}
              title="填充工具"
            >
              <span class="tool-icon">🪣</span>
              <span class="tool-name">填充</span>
            </button>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">🖌️ 笔刷大小</h3>
          <div class="brush-size-selector">
            {#each [1, 2, 3, 4, 5] as size}
              <button 
                class="brush-btn {brushSize === size ? 'active' : ''}"
                on:click={() => setBrushSize(size)}
              >
                <span 
                  class="brush-preview"
                  style="width: {size * 4 + 8}px; height: {size * 4 + 8}px;"
                ></span>
                <span class="brush-label">{size}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="panel-section terrain-picker">
          <h3 class="section-title">🎨 地形</h3>
          
          {#each terrainCategories as category}
            <div class="terrain-category">
              <h4 class="category-title">{category.name}</h4>
              <div class="terrain-grid">
                {#each category.terrains as terrainType}
                  {@const terrain = TERRAIN_CONFIG[terrainType]}
                  <button 
                    class="terrain-item {selectedTerrain === terrainType ? 'active' : ''}"
                    on:click={() => selectTerrain(terrainType)}
                    title="{terrain.name}\n{terrain.description}"
                    style="--terrain-color: #{terrain.color.toString(16).padStart(6, '0')}"
                  >
                    <span class="terrain-icon">{terrain.icon}</span>
                    <span class="terrain-name">{terrain.name}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <div class="panel-section">
          <h3 class="section-title">📐 地图尺寸</h3>
          <div class="size-controls">
            <div class="size-input">
              <label>宽度</label>
              <input 
                type="number" 
                min="5" 
                max="50"
                value={campaign.map.width}
                on:change={(e) => resizeMap(parseInt(e.target.value) || 10, campaign.map.height)}
              />
            </div>
            <div class="size-input">
              <label>高度</label>
              <input 
                type="number" 
                min="5" 
                max="50"
                value={campaign.map.height}
                on:change={(e) => resizeMap(campaign.map.width, parseInt(e.target.value) || 8)}
              />
            </div>
          </div>
        </div>
      {:else if activeTab === 'spawn'}
        <div class="panel-section">
          <h3 class="section-title">🎯 阵营选择</h3>
          <div class="faction-selector">
            <button 
              class="faction-btn {selectedFaction === 'red' ? 'active' : ''}"
              style="--faction-color: {FACTION_CONFIG.red.color}"
              on:click={() => setFaction('red')}
            >
              🔴 红方
            </button>
            <button 
              class="faction-btn {selectedFaction === 'blue' ? 'active' : ''}"
              style="--faction-color: {FACTION_CONFIG.blue.color}"
              on:click={() => setFaction('blue')}
            >
              🔵 蓝方
            </button>
          </div>
          <p class="hint-text">
            选择阵营后，在地图上点击添加出生点
          </p>
        </div>
        <SpawnPointPanel />
      {:else if activeTab === 'events'}
        <EventChainEditor />
      {:else if activeTab === 'publish'}
        <PublishManager />
      {/if}
    </aside>

    <main class="main-content">
      {#if activeTab === 'map' || activeTab === 'spawn'}
        <MapEditor />
      {:else if activeTab === 'events'}
        <div class="events-preview">
          <div class="empty-state">
            <span class="empty-icon">⚡</span>
            <h2>事件触发链编辑器</h2>
            <p>在左侧面板管理事件触发链</p>
            <p class="hint">
              事件链允许你在战役中添加动态剧情和游戏机制。
              <br />
              你可以设置触发条件和一系列动作。
            </p>
          </div>
        </div>
      {:else if activeTab === 'publish'}
        <div class="publish-preview">
          <div class="empty-state">
            <span class="empty-icon">📦</span>
            <h2>发布管理</h2>
            <p>在左侧面板管理战役发布</p>
            <p class="hint">
              你可以创建、编辑、导入导出战役剧本。
              <br />
              验证通过后即可发布战役。
            </p>
          </div>
        </div>
      {/if}
    </main>

    {#if activeTab === 'map' || activeTab === 'spawn'}
      <aside class="right-panel">
        <div class="panel-section">
          <h3 class="section-title">📊 地图信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">尺寸</span>
              <span class="info-value">{campaign.map.width} × {campaign.map.height}</span>
            </div>
            <div class="info-item">
              <span class="info-label">总格子数</span>
              <span class="info-value">{campaign.map.width * campaign.map.height}</span>
            </div>
            <div class="info-item">
              <span class="info-label">红方出生点</span>
              <span class="info-value">{campaign.spawnPoints.red.length}</span>
            </div>
            <div class="info-item">
              <span class="info-label">蓝方出生点</span>
              <span class="info-value">{campaign.spawnPoints.blue.length}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">🎖️ 初始单位</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">红方单位</span>
              <span class="info-value">{campaign.initialUnits.red.length}</span>
            </div>
            <div class="info-item">
              <span class="info-label">蓝方单位</span>
              <span class="info-value">{campaign.initialUnits.blue.length}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">⚡ 事件</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">事件链数量</span>
              <span class="info-value">{campaign.eventChains.length}</span>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h3 class="section-title">💡 提示</h3>
          <ul class="tips-list">
            <li>左键拖动可以连续绘制地形</li>
            <li>使用填充工具快速铺地形</li>
            <li>记得设置双方基地位置</li>
            <li>出生点决定初始部署区域</li>
          </ul>
        </div>
      </aside>
    {/if}
  </div>

  <footer class="editor-footer">
    <div class="footer-left">
      <span class="status-item">
        {isDirty ? '🔴 有未保存更改' : '🟢 已保存'}
      </span>
      {#if lastAutosaveTime}
        <span class="status-item">
          自动保存: {lastAutosaveTime}
        </span>
      {/if}
    </div>
    <div class="footer-right">
      <span class="status-item">
        当前工具: {tool}
      </span>
    </div>
  </footer>
</div>

<style>
  .campaign-editor {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #1a1a2e;
    color: #fff;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    height: 56px;
    background: linear-gradient(180deg, #16162a 0%, #1a1a2e 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-title {
    font-size: 18px;
    margin: 0;
    background: linear-gradient(135deg, #e74c3c, #f39c12);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .campaign-name {
    font-size: 14px;
    color: #aaa;
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .dirty-indicator {
    color: #e74c3c;
    font-size: 10px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .main-tabs {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: 8px;
  }

  .tab-btn {
    padding: 8px 16px;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 13px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #ccc;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    color: #fff;
    background: rgba(52, 152, 219, 0.3);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tool-btn {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .tool-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .tool-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .tool-btn.active {
    background: rgba(52, 152, 219, 0.3);
    border-color: #3498db;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 4px;
  }

  .save-btn {
    padding: 8px 20px;
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .save-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
  }

  .editor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .left-panel {
    width: 280px;
    background: #16162a;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .panel-section {
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: #ccc;
    margin: 0 0 12px 0;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  .tool-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    color: #aaa;
    transition: all 0.2s;
  }

  .tool-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .tool-item.active {
    background: rgba(52, 152, 219, 0.2);
    border-color: #3498db;
    color: #fff;
  }

  .tool-icon {
    font-size: 20px;
  }

  .tool-name {
    font-size: 11px;
  }

  .brush-size-selector {
    display: flex;
    gap: 6px;
    justify-content: space-between;
  }

  .brush-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    color: #888;
    transition: all 0.2s;
  }

  .brush-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .brush-btn.active {
    background: rgba(52, 152, 219, 0.2);
    border-color: #3498db;
    color: #fff;
  }

  .brush-preview {
    background: #fff;
    border-radius: 50%;
  }

  .brush-label {
    font-size: 10px;
  }

  .terrain-picker {
    flex: 1;
  }

  .terrain-category {
    margin-bottom: 12px;
  }

  .category-title {
    font-size: 11px;
    color: #666;
    margin: 0 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .terrain-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .terrain-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    cursor: pointer;
    color: #aaa;
    transition: all 0.2s;
  }

  .terrain-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  .terrain-item.active {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.3);
    color: #fff;
  }

  .terrain-icon {
    font-size: 22px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--terrain-color);
    border-radius: 6px;
  }

  .terrain-name {
    font-size: 11px;
  }

  .size-controls {
    display: flex;
    gap: 10px;
  }

  .size-input {
    flex: 1;
  }

  .size-input label {
    display: block;
    font-size: 11px;
    color: #888;
    margin-bottom: 4px;
  }

  .size-input input {
    width: 100%;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
  }

  .faction-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .faction-btn {
    flex: 1;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 6px;
    color: #ccc;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .faction-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .faction-btn.active {
    background: color-mix(in srgb, var(--faction-color) 20%, transparent);
    border-color: var(--faction-color);
    color: #fff;
  }

  .hint-text {
    font-size: 12px;
    color: #666;
    margin: 0;
    line-height: 1.5;
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .right-panel {
    width: 240px;
    background: #16162a;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-size: 12px;
    color: #888;
  }

  .info-value {
    font-size: 13px;
    color: #fff;
    font-weight: 500;
  }

  .tips-list {
    margin: 0;
    padding-left: 18px;
    color: #888;
    font-size: 12px;
    line-height: 1.8;
  }

  .events-preview,
  .publish-preview {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%);
  }

  .empty-state {
    text-align: center;
    color: #666;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h2 {
    font-size: 24px;
    margin: 0 0 8px 0;
    color: #aaa;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-state .hint {
    font-size: 13px;
    color: #555;
    margin-top: 16px;
    line-height: 1.6;
  }

  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    height: 32px;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .footer-left,
  .footer-right {
    display: flex;
    gap: 16px;
  }

  .status-item {
    font-size: 12px;
    color: #888;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
</style>

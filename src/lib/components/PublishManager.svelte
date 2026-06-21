<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { editorStore } from '$lib/stores/editorStore';
  import {
    PUBLISH_STATUS,
    PUBLISH_STATUS_CONFIG,
    VICTORY_CONDITION_TYPES,
    VICTORY_CONDITION_CONFIG
  } from '$lib/config/campaignConfig';
  import {
    getCampaigns,
    saveCampaign,
    deleteCampaign,
    duplicateCampaign,
    exportCampaign,
    importCampaign,
    publishCampaign,
    validateCampaignForPublish,
    formatDate,
    getCampaignStats
  } from '$lib/utils/campaignStorage';

  let campaigns = [];
  let stats = { total: 0, draft: 0, testing: 0, published: 0, archived: 0 };
  let showCampaignList = true;
  let selectedFilter = 'all';
  let importFileInput = null;

  $: campaign = $editorStore.campaign;
  $: validationResult = validateCampaignForPublish(campaign);

  onMount(() => {
    loadCampaigns();
  });

  function loadCampaigns() {
    campaigns = getCampaigns();
    stats = getCampaignStats(campaigns);
  }

  function filteredCampaigns() {
    if (selectedFilter === 'all') return campaigns;
    return campaigns.filter(c => c.status === selectedFilter);
  }

  function saveCurrentCampaign() {
    const result = saveCampaign(campaign);
    if (result.success) {
      alert('保存成功！');
      $editorStore.saveHistory();
      loadCampaigns();
    } else {
      alert('保存失败: ' + result.message);
    }
  }

  function loadCampaign(c) {
    if ($editorStore.isDirty && !confirm('当前战役有未保存的更改，确定要加载吗？')) {
      return;
    }
    $editorStore.loadCampaign(c);
    showCampaignList = false;
  }

  function newCampaign() {
    if ($editorStore.isDirty && !confirm('当前战役有未保存的更改，确定要新建吗？')) {
      return;
    }
    $editorStore.resetCampaign();
    showCampaignList = false;
  }

  function deleteCampaignItem(campaignItem) {
    if (!confirm(`确定要删除战役「${campaignItem.name}」吗？此操作不可撤销。`)) {
      return;
    }
    const result = deleteCampaign(campaignItem.id);
    if (result.success) {
      loadCampaigns();
    } else {
      alert('删除失败: ' + result.message);
    }
  }

  function duplicateCampaignItem(campaignItem) {
    const result = duplicateCampaign(campaignItem.id);
    if (result.success) {
      loadCampaigns();
    } else {
      alert('复制失败: ' + result.message);
    }
  }

  function exportCurrentCampaign() {
    const result = exportCampaign(campaign);
    if (!result.success) {
      alert('导出失败: ' + result.message);
    }
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    importCampaign(file).then(result => {
      if (result.success) {
        alert('导入成功！');
        loadCampaigns();
        if (result.campaign) {
          $editorStore.loadCampaign(result.campaign);
          showCampaignList = false;
        }
      } else {
        alert('导入失败: ' + result.message);
      }
    });
    
    event.target.value = '';
  }

  function publishCurrentCampaign() {
    if (!validationResult.valid) {
      alert('战役未通过验证: ' + validationResult.message);
      return;
    }
    
    const result = publishCampaign(campaign.id);
    if (result.success) {
      $editorStore.setPublishStatus(PUBLISH_STATUS.PUBLISHED);
      alert('发布成功！');
      loadCampaigns();
    } else {
      alert('发布失败: ' + result.message);
    }
  }

  function setStatus(status) {
    $editorStore.setPublishStatus(status);
    loadCampaigns();
  }

  function updateCampaignName(event) {
    $editorStore.updateCampaignBasicInfo({ name: event.target.value });
  }

  function updateCampaignDescription(event) {
    $editorStore.updateCampaignBasicInfo({ description: event.target.value });
  }

  function updateCampaignAuthor(event) {
    $editorStore.updateCampaignBasicInfo({ author: event.target.value });
  }

  function updateCampaignVersion(event) {
    $editorStore.updateCampaignBasicInfo({ version: event.target.value });
  }

  function updateVictoryType(event) {
    $editorStore.updateVictoryConditions({
      type: event.target.value,
      params: {}
    });
  }

  function updateMaxTurns(event) {
    $editorStore.updateSettings({ maxTurns: parseInt(event.target.value) || 30 });
  }

  function toggleFogOfWar() {
    $editorStore.updateSettings({ fogOfWar: !campaign.settings.fogOfWar });
  }

  function toggleDeploymentPhase() {
    $editorStore.updateSettings({ deploymentPhase: !campaign.settings.deploymentPhase });
  }

  function toggleAllowRetreat() {
    $editorStore.updateSettings({ allowRetreat: !campaign.settings.allowRetreat });
  }

  function getStatusConfig(status) {
    return PUBLISH_STATUS_CONFIG[status] || PUBLISH_STATUS_CONFIG[PUBLISH_STATUS.DRAFT];
  }
</script>

<div class="publish-manager">
  <div class="panel-header">
    <h3>📦 发布管理</h3>
    <button 
      class="list-toggle"
      on:click={() => showCampaignList = !showCampaignList}
    >
      {showCampaignList ? '编辑当前' : '战役列表'}
    </button>
  </div>

  {#if showCampaignList}
    <div class="campaign-list-section">
      <div class="list-toolbar">
        <button class="new-btn" on:click={newCampaign}>
          + 新建战役
        </button>
        <button 
          class="import-btn"
          on:click={() => importFileInput?.click()}
        >
          📥 导入
        </button>
        <input 
          type="file" 
          accept=".json"
          bind:this={importFileInput}
          style="display: none"
          on:change={handleImport}
        />
      </div>

      <div class="filter-tabs">
        <button 
          class="filter-tab {selectedFilter === 'all' ? 'active' : ''}"
          on:click={() => selectedFilter = 'all'}
        >
          全部 ({stats.total})
        </button>
        <button 
          class="filter-tab {selectedFilter === PUBLISH_STATUS.DRAFT ? 'active' : ''}"
          on:click={() => selectedFilter = PUBLISH_STATUS.DRAFT}
        >
          📝 草稿 ({stats.draft})
        </button>
        <button 
          class="filter-tab {selectedFilter === PUBLISH_STATUS.PUBLISHED ? 'active' : ''}"
          on:click={() => selectedFilter = PUBLISH_STATUS.PUBLISHED}
        >
          ✅ 已发布 ({stats.published})
        </button>
      </div>

      <div class="campaign-list">
        {#if filteredCampaigns().length === 0}
          <div class="empty-hint">
            <p>暂无战役</p>
            <p class="hint">点击"新建战役"开始创建</p>
          </div>
        {:else}
          {#each filteredCampaigns() as c}
            <div class="campaign-card">
              <div class="card-header">
                <span class="campaign-name">{c.name}</span>
                <span 
                  class="status-badge"
                  style="background: {getStatusConfig(c.status).color}20; color: {getStatusConfig(c.status).color}"
                >
                  {getStatusConfig(c.status).icon} {getStatusConfig(c.status).name}
                </span>
              </div>
              
              <div class="card-meta">
                <span>版本: {c.version || '1.0.0'}</span>
                <span>作者: {c.author || '未知'}</span>
              </div>
              
              <div class="card-dates">
                <span>创建: {formatDate(c.createdAt)}</span>
                <span>更新: {formatDate(c.updatedAt)}</span>
              </div>

              <div class="card-actions">
                <button class="action-btn primary" on:click={() => loadCampaign(c)}>
                  编辑
                </button>
                <button class="action-btn" on:click={() => duplicateCampaignItem(c)}>
                  复制
                </button>
                <button class="action-btn" on:click={() => exportCampaign(c)}>
                  导出
                </button>
                <button class="action-btn danger" on:click={() => deleteCampaignItem(c)}>
                  删除
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {:else}
    <div class="publish-editor">
      <div class="section">
        <div class="section-title">📝 基本信息</div>
        
        <div class="form-group">
          <label>战役名称</label>
          <input 
            type="text" 
            value={campaign.name}
            on:input={updateCampaignName}
            placeholder="输入战役名称"
          />
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea 
            rows="3"
            value={campaign.description}
            on:input={updateCampaignDescription}
            placeholder="输入战役描述"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>作者</label>
            <input 
              type="text" 
              value={campaign.author}
              on:input={updateCampaignAuthor}
              placeholder="作者名"
            />
          </div>
          <div class="form-group">
            <label>版本</label>
            <input 
              type="text" 
              value={campaign.version}
              on:input={updateCampaignVersion}
              placeholder="1.0.0"
            />
          </div>
        </div>

        <div class="form-group">
          <label>当前状态</label>
          <div class="status-selector">
            {#each Object.entries(PUBLISH_STATUS_CONFIG) as [status, config]}
              <button 
                class="status-option {campaign.status === status ? 'active' : ''}"
                style="--status-color: {config.color}"
                on:click={() => setStatus(status)}
              >
                {config.icon} {config.name}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🏆 胜利条件</div>
        
        <div class="form-group">
          <label>胜利条件类型</label>
          <select 
            value={campaign.victoryConditions.type}
            on:change={updateVictoryType}
          >
            {#each Object.entries(VICTORY_CONDITION_CONFIG) as [type, config]}
              <option value={type}>{config.icon} {config.name}</option>
            {/each}
          </select>
          <p class="hint-text">
            {VICTORY_CONDITION_CONFIG[campaign.victoryConditions.type]?.description}
          </p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">⚙️ 游戏设置</div>
        
        <div class="form-group">
          <label>最大回合数: {campaign.settings.maxTurns}</label>
          <input 
            type="range" 
            min="5" 
            max="100"
            value={campaign.settings.maxTurns}
            on:input={updateMaxTurns}
          />
        </div>

        <div class="toggle-list">
          <div class="toggle-item">
            <span class="toggle-label">🌫️ 战争迷雾</span>
            <button 
              class="toggle-btn {campaign.settings.fogOfWar ? 'active' : ''}"
              on:click={toggleFogOfWar}
            >
              {campaign.settings.fogOfWar ? '开启' : '关闭'}
            </button>
          </div>
          
          <div class="toggle-item">
            <span class="toggle-label">🎯 布阵阶段</span>
            <button 
              class="toggle-btn {campaign.settings.deploymentPhase ? 'active' : ''}"
              on:click={toggleDeploymentPhase}
            >
              {campaign.settings.deploymentPhase ? '开启' : '关闭'}
            </button>
          </div>
          
          <div class="toggle-item">
            <span class="toggle-label">🏃 允许撤退</span>
            <button 
              class="toggle-btn {campaign.settings.allowRetreat ? 'active' : ''}"
              on:click={toggleAllowRetreat}
            >
              {campaign.settings.allowRetreat ? '允许' : '禁止'}
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📊 验证状态</div>
        
        <div class="validation-box {validationResult.valid ? 'valid' : 'invalid'}">
          {#if validationResult.valid}
            <div class="valid-icon">✅</div>
            <p>战役验证通过，可以发布！</p>
          {:else}
            <div class="invalid-icon">⚠️</div>
            <p>战役存在以下问题：</p>
            <p class="error-text">{validationResult.message}</p>
          {/if}
        </div>
      </div>

      <div class="section">
        <div class="section-title">📤 发布操作</div>
        
        <div class="action-buttons">
          <button 
            class="action-btn primary large"
            on:click={saveCurrentCampaign}
          >
            💾 保存战役
          </button>
          
          <button 
            class="action-btn success large"
            on:click={publishCurrentCampaign}
            disabled={!validationResult.valid}
          >
            🚀 发布战役
          </button>
          
          <button 
            class="action-btn large"
            on:click={exportCurrentCampaign}
          >
            📤 导出 JSON
          </button>
        </div>
      </div>

      <div class="section stats-section">
        <div class="section-title">📈 战役统计</div>
        
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">地图尺寸</span>
            <span class="stat-value">{campaign.map.width} × {campaign.map.height}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">红方出生点</span>
            <span class="stat-value">{campaign.spawnPoints.red.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">蓝方出生点</span>
            <span class="stat-value">{campaign.spawnPoints.blue.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">红方初始单位</span>
            <span class="stat-value">{campaign.initialUnits.red.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">蓝方初始单位</span>
            <span class="stat-value">{campaign.initialUnits.blue.length}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">事件链数量</span>
            <span class="stat-value">{campaign.eventChains.length}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .publish-manager {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }

  .list-toggle {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    color: #ccc;
    cursor: pointer;
    font-size: 13px;
  }

  .list-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .campaign-list-section {
    padding: 12px;
    flex: 1;
    overflow-y: auto;
  }

  .list-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .new-btn,
  .import-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }

  .new-btn {
    background: #27ae60;
    color: white;
  }

  .new-btn:hover {
    background: #2ecc71;
  }

  .import-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #ccc;
  }

  .import-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .filter-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: 6px;
  }

  .filter-tab {
    flex: 1;
    padding: 8px;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .filter-tab:hover {
    color: #ccc;
  }

  .filter-tab.active {
    background: rgba(52, 152, 219, 0.3);
    color: #fff;
  }

  .campaign-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .campaign-card {
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .campaign-name {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }

  .status-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
  }

  .card-meta,
  .card-dates {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #888;
    margin-bottom: 6px;
  }

  .card-actions {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .action-btn {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    color: #ccc;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .action-btn.primary {
    background: #3498db;
    color: white;
  }

  .action-btn.primary:hover {
    background: #2980b9;
  }

  .action-btn.success {
    background: #27ae60;
    color: white;
  }

  .action-btn.success:hover {
    background: #2ecc71;
  }

  .action-btn.danger {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }

  .action-btn.danger:hover {
    background: rgba(231, 76, 60, 0.4);
  }

  .action-btn.large {
    padding: 10px 20px;
    font-size: 14px;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .publish-editor {
    padding: 12px 16px;
    flex: 1;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12px;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    color: #aaa;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3498db;
  }

  .form-group textarea {
    resize: vertical;
    font-family: inherit;
  }

  .hint-text {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
  }

  .status-selector {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .status-option {
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .status-option:hover {
    border-color: var(--status-color);
  }

  .status-option.active {
    background: color-mix(in srgb, var(--status-color) 20%, transparent);
    border-color: var(--status-color);
    color: #fff;
  }

  .toggle-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
  }

  .toggle-label {
    font-size: 13px;
    color: #ccc;
  }

  .toggle-btn {
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 12px;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
  }

  .toggle-btn.active {
    background: #27ae60;
    color: white;
  }

  .validation-box {
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }

  .validation-box.valid {
    background: rgba(39, 174, 96, 0.15);
    border: 1px solid rgba(39, 174, 96, 0.3);
  }

  .validation-box.invalid {
    background: rgba(243, 156, 18, 0.15);
    border: 1px solid rgba(243, 156, 18, 0.3);
  }

  .valid-icon,
  .invalid-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .validation-box p {
    margin: 4px 0;
    font-size: 13px;
    color: #ccc;
  }

  .error-text {
    color: #f39c12 !important;
    font-size: 12px !important;
    margin-top: 8px !important;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stats-section {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 12px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
  }

  .stat-label {
    font-size: 11px;
    color: #888;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }

  .empty-hint {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .empty-hint p {
    margin: 6px 0;
    font-size: 14px;
  }

  .hint {
    font-size: 12px !important;
    color: #555;
  }
</style>

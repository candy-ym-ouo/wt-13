<script>
  // @ts-nocheck
  import { editorStore } from '$lib/stores/editorStore';
  import {
    EVENT_TRIGGER_TYPES,
    EVENT_TRIGGER_CONFIG,
    EVENT_ACTION_TYPES,
    EVENT_ACTION_CONFIG,
    TERRAIN_TYPES,
    UNIT_TYPES
  } from '$lib/config/campaignConfig';

  let selectedActionId = null;
  let showAddAction = false;

  $: campaign = $editorStore.campaign;
  $: eventChains = campaign.eventChains;
  $: selectedChainId = $editorStore.selectedEventChainId;
  $: selectedChain = selectedChainId
    ? eventChains.find(c => c.id === selectedChainId)
    : null;
  $: selectedAction = selectedActionId && selectedChain
    ? selectedChain.actions.find(a => a.id === selectedActionId)
    : null;

  function addChain() {
    $editorStore.addEventChain();
  }

  function selectChain(chain) {
    $editorStore.selectEventChain(chain.id);
    selectedActionId = null;
    showAddAction = false;
  }

  function removeChain(chain) {
    if (confirm(`确定要删除事件链「${chain.name}」吗？`)) {
      $editorStore.removeEventChain(chain.id);
      selectedActionId = null;
    }
  }

  function toggleChainEnabled(chain) {
    $editorStore.updateEventChain(chain.id, { enabled: !chain.enabled });
  }

  function updateChainName(event) {
    if (!selectedChain) return;
    $editorStore.updateEventChain(selectedChain.id, { name: event.target.value });
  }

  function updateTriggerType(event) {
    if (!selectedChain) return;
    $editorStore.updateEventChain(selectedChain.id, {
      trigger: {
        ...selectedChain.trigger,
        type: event.target.value,
        params: getDefaultTriggerParams(event.target.value)
      }
    });
  }

  function getDefaultTriggerParams(triggerType) {
    switch (triggerType) {
      case EVENT_TRIGGER_TYPES.TURN_START:
      case EVENT_TRIGGER_TYPES.TURN_END:
        return { turn: 1 };
      case EVENT_TRIGGER_TYPES.UNIT_DEATH:
        return { unitType: 'infantry', faction: 'red' };
      case EVENT_TRIGGER_TYPES.UNIT_ENTER_TILE:
        return { x: 0, y: 0, faction: 'any' };
      case EVENT_TRIGGER_TYPES.BASE_ATTACKED:
        return { faction: 'red' };
      case EVENT_TRIGGER_TYPES.MORALE_THRESHOLD:
        return { faction: 'red', threshold: 50 };
      case EVENT_TRIGGER_TYPES.TIME_ELAPSED:
        return { interval: 3 };
      default:
        return {};
    }
  }

  function updateTriggerParam(key, value) {
    if (!selectedChain) return;
    $editorStore.updateEventChain(selectedChain.id, {
      trigger: {
        ...selectedChain.trigger,
        params: {
          ...selectedChain.trigger.params,
          [key]: value
        }
      }
    });
  }

  function addAction(actionType) {
    if (!selectedChain) return;
    $editorStore.addEventAction(selectedChain.id, actionType);
    showAddAction = false;
  }

  function removeAction(action) {
    if (!selectedChain) return;
    if (confirm('确定要删除这个动作吗？')) {
      $editorStore.removeEventAction(selectedChain.id, action.id);
      if (selectedActionId === action.id) {
        selectedActionId = null;
      }
    }
  }

  function selectAction(action) {
    selectedActionId = action.id;
  }

  function updateActionParam(key, value) {
    if (!selectedChain || !selectedAction) return;
    $editorStore.updateEventAction(selectedChain.id, selectedAction.id, {
      params: {
        ...selectedAction.params,
        [key]: value
      }
    });
  }

  function updateActionDelay(event) {
    if (!selectedChain || !selectedAction) return;
    $editorStore.updateEventAction(selectedChain.id, selectedAction.id, {
      delay: parseInt(event.target.value) || 0
    });
  }

  function moveActionUp(index) {
    if (!selectedChain || index <= 0) return;
    $editorStore.reorderEventActions(selectedChain.id, index, index - 1);
  }

  function moveActionDown(index) {
    if (!selectedChain || index >= selectedChain.actions.length - 1) return;
    $editorStore.reorderEventActions(selectedChain.id, index, index + 1);
  }

  function updateChainCooldown(event) {
    if (!selectedChain) return;
    $editorStore.updateEventChain(selectedChain.id, {
      cooldown: parseInt(event.target.value) || 0
    });
  }

  function updateChainMaxTriggers(event) {
    if (!selectedChain) return;
    const value = event.target.value === '' ? -1 : parseInt(event.target.value);
    $editorStore.updateEventChain(selectedChain.id, {
      maxTriggers: isNaN(value) ? -1 : value
    });
  }
</script>

<div class="event-chain-editor">
  <div class="panel-header">
    <h3>⚡ 事件触发链</h3>
    <button class="add-btn" on:click={addChain}>
      + 新建
    </button>
  </div>

  <div class="chain-list">
    {#if eventChains.length === 0}
      <div class="empty-hint">
        <p>暂无事件链</p>
        <p class="hint">点击"新建"创建第一个事件链</p>
      </div>
    {:else}
      {#each eventChains as chain}
        <div 
          class="chain-item {selectedChainId === chain.id ? 'selected' : ''} {!chain.enabled ? 'disabled' : ''}"
          on:click={() => selectChain(chain)}
        >
          <div class="chain-header">
            <span class="chain-name">{chain.name}</span>
            <div class="chain-actions">
              <button 
                class="toggle-btn {chain.enabled ? 'active' : ''}"
                on:click|stopPropagation={() => toggleChainEnabled(chain)}
                title={chain.enabled ? '禁用' : '启用'}
              >
                {chain.enabled ? '✓' : '○'}
              </button>
              <button 
                class="delete-btn"
                on:click|stopPropagation={() => removeChain(chain)}
                title="删除"
              >✕</button>
            </div>
          </div>
          <div class="chain-meta">
            <span class="trigger-icon">{EVENT_TRIGGER_CONFIG[chain.trigger.type]?.icon || '⚙️'}</span>
            <span class="trigger-name">{EVENT_TRIGGER_CONFIG[chain.trigger.type]?.name || '自定义'}</span>
            <span class="action-count">{chain.actions.length} 个动作</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#if selectedChain}
    <div class="chain-editor">
      <div class="section-title">📝 事件链设置</div>
      
      <div class="form-group">
        <label>事件链名称</label>
        <input 
          type="text" 
          value={selectedChain.name}
          on:input={updateChainName}
          placeholder="输入事件链名称"
        />
      </div>

      <div class="form-group">
        <label>触发条件</label>
        <select 
          value={selectedChain.trigger.type}
          on:change={updateTriggerType}
        >
          {#each Object.entries(EVENT_TRIGGER_CONFIG) as [type, config]}
            <option value={type}>{config.icon} {config.name}</option>
          {/each}
        </select>
      </div>

      <div class="trigger-params">
        {#if selectedChain.trigger.type === EVENT_TRIGGER_TYPES.TURN_START || 
              selectedChain.trigger.type === EVENT_TRIGGER_TYPES.TURN_END}
          <div class="form-group">
            <label>触发回合</label>
            <input 
              type="number" 
              min="1"
              value={selectedChain.trigger.params.turn || 1}
              on:input={(e) => updateTriggerParam('turn', parseInt(e.target.value) || 1)}
            />
          </div>
        {:else if selectedChain.trigger.type === EVENT_TRIGGER_TYPES.UNIT_DEATH}
          <div class="form-group">
            <label>单位类型</label>
            <select 
              value={selectedChain.trigger.params.unitType || 'infantry'}
              on:change={(e) => updateTriggerParam('unitType', e.target.value)}
            >
              {#each Object.values(UNIT_TYPES) as type}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>阵营</label>
            <select 
              value={selectedChain.trigger.params.faction || 'red'}
              on:change={(e) => updateTriggerParam('faction', e.target.value)}
            >
              <option value="red">红方</option>
              <option value="blue">蓝方</option>
              <option value="any">任意</option>
            </select>
          </div>
        {:else if selectedChain.trigger.type === EVENT_TRIGGER_TYPES.UNIT_ENTER_TILE}
          <div class="form-group inline">
            <label>X 坐标</label>
            <input 
              type="number" 
              min="0"
              value={selectedChain.trigger.params.x || 0}
              on:input={(e) => updateTriggerParam('x', parseInt(e.target.value) || 0)}
            />
          </div>
          <div class="form-group inline">
            <label>Y 坐标</label>
            <input 
              type="number" 
              min="0"
              value={selectedChain.trigger.params.y || 0}
              on:input={(e) => updateTriggerParam('y', parseInt(e.target.value) || 0)}
            />
          </div>
        {:else if selectedChain.trigger.type === EVENT_TRIGGER_TYPES.MORALE_THRESHOLD}
          <div class="form-group">
            <label>阵营</label>
            <select 
              value={selectedChain.trigger.params.faction || 'red'}
              on:change={(e) => updateTriggerParam('faction', e.target.value)}
            >
              <option value="red">红方</option>
              <option value="blue">蓝方</option>
            </select>
          </div>
          <div class="form-group">
            <label>士气阈值: {selectedChain.trigger.params.threshold || 50}</label>
            <input 
              type="range" 
              min="0" 
              max="100"
              value={selectedChain.trigger.params.threshold || 50}
              on:input={(e) => updateTriggerParam('threshold', parseInt(e.target.value))}
            />
          </div>
        {:else if selectedChain.trigger.type === EVENT_TRIGGER_TYPES.TIME_ELAPSED}
          <div class="form-group">
            <label>间隔回合数</label>
            <input 
              type="number" 
              min="1"
              value={selectedChain.trigger.params.interval || 3}
              on:input={(e) => updateTriggerParam('interval', parseInt(e.target.value) || 1)}
            />
          </div>
        {/if}
      </div>

      <div class="form-group inline">
        <label>冷却回合</label>
        <input 
          type="number" 
          min="0"
          value={selectedChain.cooldown || 0}
          on:input={updateChainCooldown}
        />
      </div>

      <div class="form-group">
        <label>最大触发次数 (-1 为无限)</label>
        <input 
          type="number" 
          value={selectedChain.maxTriggers}
          on:input={updateChainMaxTriggers}
        />
      </div>

      <div class="section-title">🎬 动作列表</div>

      <div class="action-list">
        {#if selectedChain.actions.length === 0}
          <div class="empty-hint small">
            <p>暂无动作</p>
          </div>
        {:else}
          {#each selectedChain.actions as action, index}
            <div 
              class="action-item {selectedActionId === action.id ? 'selected' : ''}"
              on:click={() => selectAction(action)}
            >
              <div class="action-order">{index + 1}</div>
              <div class="action-icon">{EVENT_ACTION_CONFIG[action.type]?.icon || '⚙️'}</div>
              <div class="action-info">
                <div class="action-name">{EVENT_ACTION_CONFIG[action.type]?.name || action.type}</div>
                {#if action.delay > 0}
                  <div class="action-delay">延迟 {action.delay} 回合</div>
                {/if}
              </div>
              <div class="action-btns">
                <button 
                  class="move-btn"
                  disabled={index === 0}
                  on:click|stopPropagation={() => moveActionUp(index)}
                >↑</button>
                <button 
                  class="move-btn"
                  disabled={index === selectedChain.actions.length - 1}
                  on:click|stopPropagation={() => moveActionDown(index)}
                >↓</button>
                <button 
                  class="delete-btn"
                  on:click|stopPropagation={() => removeAction(action)}
                >✕</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <button class="add-action-btn" on:click={() => showAddAction = !showAddAction}>
        {showAddAction ? '− 收起' : '+ 添加动作'}
      </button>

      {#if showAddAction}
        <div class="action-picker">
          {#each Object.entries(EVENT_ACTION_CONFIG) as [type, config]}
            <button 
              class="action-option"
              on:click={() => addAction(type)}
            >
              <span class="icon">{config.icon}</span>
              <span class="name">{config.name}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if selectedAction}
        <div class="action-editor">
          <div class="section-title">⚙️ 动作参数</div>

          <div class="form-group">
            <label>延迟执行 (回合)</label>
            <input 
              type="number" 
              min="0"
              value={selectedAction.delay || 0}
              on:input={updateActionDelay}
            />
          </div>

          {#if selectedAction.type === EVENT_ACTION_TYPES.SPAWN_UNIT}
            <div class="form-group">
              <label>单位类型</label>
              <select 
                value={selectedAction.params.unitType || 'infantry'}
                on:change={(e) => updateActionParam('unitType', e.target.value)}
              >
                {#each Object.values(UNIT_TYPES) as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>
            <div class="form-group">
              <label>阵营</label>
              <select 
                value={selectedAction.params.faction || 'red'}
                on:change={(e) => updateActionParam('faction', e.target.value)}
              >
                <option value="red">红方</option>
                <option value="blue">蓝方</option>
              </select>
            </div>
            <div class="form-group inline">
              <label>X</label>
              <input 
                type="number" 
                value={selectedAction.params.x || 0}
                on:input={(e) => updateActionParam('x', parseInt(e.target.value) || 0)}
              />
            </div>
            <div class="form-group inline">
              <label>Y</label>
              <input 
                type="number" 
                value={selectedAction.params.y || 0}
                on:input={(e) => updateActionParam('y', parseInt(e.target.value) || 0)}
              />
            </div>
            <div class="form-group">
              <label>数量</label>
              <input 
                type="number" 
                min="1"
                value={selectedAction.params.count || 1}
                on:input={(e) => updateActionParam('count', parseInt(e.target.value) || 1)}
              />
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.DEAL_DAMAGE || 
                    selectedAction.type === EVENT_ACTION_TYPES.HEAL}
            <div class="form-group">
              <label>{selectedAction.type === EVENT_ACTION_TYPES.DEAL_DAMAGE ? '伤害值' : '治疗量'}</label>
              <input 
                type="number" 
                min="0"
                value={selectedAction.params.amount || selectedAction.params.damage || 20}
                on:input={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  if (selectedAction.type === EVENT_ACTION_TYPES.DEAL_DAMAGE) {
                    updateActionParam('damage', val);
                  } else {
                    updateActionParam('amount', val);
                  }
                }}
              />
            </div>
            <div class="form-group">
              <label>目标</label>
              <select 
                value={selectedAction.params.target || 'all_enemies'}
                on:change={(e) => updateActionParam('target', e.target.value)}
              >
                <option value="all_allies">所有友军</option>
                <option value="all_enemies">所有敌军</option>
                <option value="random_ally">随机友军</option>
                <option value="random_enemy">随机敌军</option>
                <option value="lowest_hp_ally">最低血量友军</option>
                <option value="lowest_hp_enemy">最低血量敌军</option>
              </select>
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.GIVE_BUFF}
            <div class="form-group">
              <label>增益类型</label>
              <select 
                value={selectedAction.params.buffType || 'attackBoost'}
                on:change={(e) => updateActionParam('buffType', e.target.value)}
              >
                <option value="attackBoost">攻击提升</option>
                <option value="defenseBoost">防御提升</option>
                <option value="speedBoost">速度提升</option>
                <option value="attackDebuff">攻击降低</option>
                <option value="defenseDebuff">防御降低</option>
              </select>
            </div>
            <div class="form-group">
              <label>效果强度</label>
              <input 
                type="number" 
                min="-1"
                max="1"
                step="0.1"
                value={selectedAction.params.value || 0.2}
                on:input={(e) => updateActionParam('value', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div class="form-group">
              <label>持续回合</label>
              <input 
                type="number" 
                min="1"
                value={selectedAction.params.duration || 3}
                on:input={(e) => updateActionParam('duration', parseInt(e.target.value) || 1)}
              />
            </div>
            <div class="form-group">
              <label>目标</label>
              <select 
                value={selectedAction.params.target || 'all_allies'}
                on:change={(e) => updateActionParam('target', e.target.value)}
              >
                <option value="all_allies">所有友军</option>
                <option value="all_enemies">所有敌军</option>
              </select>
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.CHANGE_TERRAIN}
            <div class="form-group inline">
              <label>X</label>
              <input 
                type="number" 
                value={selectedAction.params.x || 0}
                on:input={(e) => updateActionParam('x', parseInt(e.target.value) || 0)}
              />
            </div>
            <div class="form-group inline">
              <label>Y</label>
              <input 
                type="number" 
                value={selectedAction.params.y || 0}
                on:input={(e) => updateActionParam('y', parseInt(e.target.value) || 0)}
              />
            </div>
            <div class="form-group">
              <label>地形类型</label>
              <select 
                value={selectedAction.params.terrainType || TERRAIN_TYPES.PLAIN}
                on:change={(e) => updateActionParam('terrainType', e.target.value)}
              >
                {#each Object.entries(TERRAIN_TYPES) as [key, value]}
                  <option value={value}>{key}</option>
                {/each}
              </select>
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.SHOW_DIALOG}
            <div class="form-group">
              <label>说话者</label>
              <input 
                type="text" 
                value={selectedAction.params.speaker || '系统'}
                on:input={(e) => updateActionParam('speaker', e.target.value)}
              />
            </div>
            <div class="form-group">
              <label>对话内容</label>
              <textarea 
                rows="3"
                value={selectedAction.params.text || ''}
                on:input={(e) => updateActionParam('text', e.target.value)}
              ></textarea>
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.SET_VICTORY}
            <div class="form-group">
              <label>获胜方</label>
              <select 
                value={selectedAction.params.winner || 'red'}
                on:change={(e) => updateActionParam('winner', e.target.value)}
              >
                <option value="red">红方</option>
                <option value="blue">蓝方</option>
              </select>
            </div>
          {:else if selectedAction.type === EVENT_ACTION_TYPES.TRIGGER_CHAIN}
            <div class="form-group">
              <label>触发的事件链ID</label>
              <input 
                type="text" 
                value={selectedAction.params.chainId || ''}
                on:input={(e) => updateActionParam('chainId', e.target.value)}
                placeholder="输入事件链ID"
              />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .event-chain-editor {
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

  .add-btn {
    padding: 6px 12px;
    background: #27ae60;
    border: none;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font-size: 13px;
  }

  .add-btn:hover {
    background: #2ecc71;
  }

  .chain-list {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .chain-item {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .chain-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .chain-item.selected {
    background: rgba(52, 152, 219, 0.2);
    border-color: rgba(52, 152, 219, 0.5);
  }

  .chain-item.disabled {
    opacity: 0.5;
  }

  .chain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .chain-name {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
  }

  .chain-actions {
    display: flex;
    gap: 4px;
  }

  .toggle-btn,
  .delete-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #888;
  }

  .toggle-btn.active {
    background: rgba(39, 174, 96, 0.3);
    color: #27ae60;
  }

  .delete-btn {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }

  .delete-btn:hover {
    background: rgba(231, 76, 60, 0.4);
  }

  .chain-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #888;
  }

  .trigger-icon {
    font-size: 14px;
  }

  .action-count {
    margin-left: auto;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 8px;
  }

  .chain-editor {
    padding: 12px 16px;
    flex: 1;
    overflow-y: auto;
  }

  .section-title {
    font-size: 13px;
    color: #bbb;
    font-weight: 600;
    margin: 12px 0 10px;
  }

  .section-title:first-child {
    margin-top: 0;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group.inline {
    display: inline-block;
    width: 48%;
    margin-right: 4%;
  }

  .form-group.inline:last-of-type {
    margin-right: 0;
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

  .action-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .action-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .action-item.selected {
    background: rgba(230, 126, 34, 0.2);
    border-color: rgba(230, 126, 34, 0.5);
  }

  .action-order {
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: #888;
    font-weight: bold;
  }

  .action-icon {
    font-size: 18px;
  }

  .action-info {
    flex: 1;
  }

  .action-name {
    font-size: 13px;
    color: #fff;
  }

  .action-delay {
    font-size: 11px;
    color: #f39c12;
    margin-top: 2px;
  }

  .action-btns {
    display: flex;
    gap: 2px;
  }

  .move-btn {
    width: 22px;
    height: 22px;
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

  .move-btn:hover:not(:disabled) {
    background: rgba(52, 152, 219, 0.3);
    color: #fff;
  }

  .move-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .add-action-btn {
    width: 100%;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #bbb;
    cursor: pointer;
    font-size: 13px;
  }

  .add-action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
  }

  .action-picker {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-top: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .action-option {
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

  .action-option:hover {
    background: rgba(230, 126, 34, 0.2);
    border-color: #e67e22;
    color: #fff;
  }

  .action-option .icon {
    font-size: 20px;
  }

  .action-option .name {
    font-size: 11px;
  }

  .action-editor {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .trigger-params {
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 12px;
  }

  .empty-hint {
    text-align: center;
    padding: 30px 20px;
    color: #666;
  }

  .empty-hint.small {
    padding: 20px;
  }

  .empty-hint p {
    margin: 4px 0;
    font-size: 13px;
  }

  .hint {
    font-size: 11px !important;
    color: #555;
  }
</style>

<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte';
  import { gameState } from '$lib/stores/gameStore';
  import { TECH_BRANCHES, TECH_BRANCH_INFO, TECH_TIER_NAMES, getTechById, getTechsByBranch, getTechsByTier } from '$lib/config/techTreeConfig.js';
  import { getResearchProgress, getBranchProgress, canResearchTech, formatTechEffectDescription } from '$lib/utils/techTreeSystem.js';

  const dispatch = createEventDispatcher();

  /** @type {import('../stores/gameStore').GameState | null} */
  let state;
  
  let activeBranch = TECH_BRANCHES.MILITARY;
  let selectedTechId = null;
  let hoveredTechId = null;

  $: currentFaction = state?.currentFaction || 'red';
  $: currentGold = state?.gold?.[currentFaction] || 0;
  $: techState = state?.techTree || { researchedTechs: [], researchInProgress: null, researchProgress: 0, researchQueue: [] };

  $: branchProgress = getBranchProgress(activeBranch, techState.researchedTechs || []);
  $: branchTechs = getTechsByBranch(activeBranch);
  $: selectedTech = selectedTechId ? getTechById(selectedTechId) : null;

  function selectBranch(branch) {
    activeBranch = branch;
    selectedTechId = null;
  }

  function selectTech(techId) {
    selectedTechId = techId;
  }

  function handleResearch(techId) {
    if (!state) return;
    const result = canResearchTech(techId, currentFaction, techState, currentGold);
    if (result.canResearch) {
      import('$lib/stores/gameStore').then(m => {
        m.gameState.startTechResearch(techId);
      });
    }
  }

  function handleCancelResearch(techId) {
    import('$lib/stores/gameStore').then(m => {
      m.gameState.cancelTechResearch(techId);
    });
  }

  function getTechStatus(tech) {
    const progress = getResearchProgress(tech.id, techState);
    return progress;
  }

  function getTechClass(tech) {
    const progress = getTechStatus(tech);
    const classes = ['tech-node'];
    
    if (progress.completed) {
      classes.push('researched');
    } else if (progress.isResearching) {
      classes.push('researching');
    } else if (progress.queuePosition) {
      classes.push('queued');
    } else {
      const canResearch = canResearchTech(tech.id, currentFaction, techState, currentGold);
      if (canResearch.canResearch) {
        classes.push('available');
      } else {
        classes.push('locked');
      }
    }

    return classes.join(' ');
  }

  function formatEffectList(effects) {
    return formatTechEffectDescription(effects);
  }

  const branchList = Object.values(TECH_BRANCHES);
</script>

<div class="tech-tree-panel">
  <div class="panel-header">
    <h2>🔬 科技树</h2>
    <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
  </div>

  <div class="branch-tabs">
    {#each branchList as branch}
      <button 
        class="branch-tab {activeBranch === branch ? 'active' : ''}"
        style="--branch-color: {TECH_BRANCH_INFO[branch].color}"
        on:click={() => selectBranch(branch)}
      >
        <span class="branch-icon">{TECH_BRANCH_INFO[branch].icon}</span>
        <span class="branch-name">{TECH_BRANCH_INFO[branch].name}</span>
        <span class="branch-progress">{branchProgress.researched}/{branchProgress.totalTechs}</span>
      </button>
    {/each}
  </div>

  <div class="tech-tree-content">
    <div class="branch-description">
      <p>{TECH_BRANCH_INFO[activeBranch].description}</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {branchProgress.percent}%; background: {TECH_BRANCH_INFO[activeBranch].color}"></div>
      </div>
      <span class="progress-text">科技进度：{branchProgress.percent}%</span>
    </div>

    <div class="tech-tree-grid">
      {#each [1, 2, 3, 4, 5] as tier}
        <div class="tier-column">
          <div class="tier-label">
            <span class="tier-name">{TECH_TIER_NAMES[tier]}</span>
          </div>
          <div class="tier-techs">
            {#each getTechsByTier(activeBranch, tier) as tech}
              <div 
                class={getTechClass(tech)}
                on:click={() => selectTech(tech.id)}
                on:mouseenter={() => hoveredTechId = tech.id}
                on:mouseleave={() => hoveredTechId = null}
                style="--tech-color: {TECH_BRANCH_INFO[tech.branch].color}"
              >
                <div class="tech-icon">{tech.icon}</div>
                <div class="tech-name">{tech.name}</div>
                {#if getTechStatus(tech).isResearching}
                  <div class="research-progress">
                    <div class="progress-bar-small">
                      <div class="progress-fill-small" style="width: {getTechStatus(tech).percent}%"></div>
                    </div>
                    <span class="progress-text-small">{getTechStatus(tech).progress}/{getTechStatus(tech).total}回合</span>
                  </div>
                {:else if getTechStatus(tech).completed}
                  <div class="completed-badge">✓ 已完成</div>
                {:else if getTechStatus(tech).queuePosition}
                  <div class="queue-badge">⏳ 队列 #{getTechStatus(tech).queuePosition}</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if selectedTech}
    <div class="tech-detail-panel">
      <div class="detail-header" style="--tech-color: {TECH_BRANCH_INFO[selectedTech.branch].color}">
        <span class="detail-icon">{selectedTech.icon}</span>
        <div class="detail-title">
          <h3>{selectedTech.name}</h3>
          <span class="detail-tier">{TECH_TIER_NAMES[selectedTech.tier]}科技</span>
        </div>
      </div>

      <div class="detail-body">
        <p class="tech-description">{selectedTech.description}</p>

        <div class="tech-effects">
          <h4>科技效果</h4>
          <ul>
            {#each formatEffectList(selectedTech.effects) as effect}
              <li>{effect}</li>
            {/each}
          </ul>
        </div>

        {#if selectedTech.unlocks && selectedTech.unlocks.length > 0}
          <div class="tech-unlocks">
            <h4>解锁内容</h4>
            <ul>
              {#each selectedTech.unlocks as unlock}
                <li>🔓 {unlock.replace(/_/g, ' ')}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="tech-requirements">
          <h4>前置科技</h4>
          {#if selectedTech.requires.length === 0}
            <p class="no-req">无前置要求</p>
          {:else}
            <ul>
              {#each selectedTech.requires as reqId}
                {@const reqTech = getTechById(reqId)}
                {@const isResearched = techState.researchedTechs.includes(reqId)}
                <li class={isResearched ? 'completed-req' : 'pending-req'}>
                  {isResearched ? '✓' : '○'} {reqTech?.name || reqId}
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="tech-cost">
          <div class="cost-item">
            <span class="cost-label">💰 研发费用</span>
            <span class="cost-value">{selectedTech.cost} 金币</span>
          </div>
          <div class="cost-item">
            <span class="cost-label">⏱️ 研发时间</span>
            <span class="cost-value">{selectedTech.researchTurns} 回合</span>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        {@const status = getTechStatus(selectedTech)}
        {@const canResearch = canResearchTech(selectedTech.id, currentFaction, techState, currentGold)}

        {#if status.completed}
          <button class="action-btn completed" disabled>
            ✓ 已研究完成
          </button>
        {:else if status.isResearching}
          <button class="action-btn researching" disabled>
            🔬 研究中... ({status.progress}/{status.total}回合)
          </button>
          <button class="action-btn cancel" on:click={() => handleCancelResearch(selectedTech.id)}>
            取消研究 (返还50%)
          </button>
        {:else if status.queuePosition}
          <button class="action-btn queued" disabled>
            ⏳ 队列中 #{status.queuePosition}
          </button>
          <button class="action-btn cancel" on:click={() => handleCancelResearch(selectedTech.id)}>
            移出队列 (返还80%)
          </button>
        {:else if canResearch.canResearch}
          <button 
            class="action-btn research" 
            on:click={() => handleResearch(selectedTech.id)}
          >
            🔬 开始研究
          </button>
        {:else}
          <button class="action-btn locked" disabled>
            {canResearch.reason}
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if techState.researchQueue && techState.researchQueue.length > 0}
    <div class="research-queue-panel">
      <h4>📋 研究队列</h4>
      <div class="queue-list">
        {#each techState.researchQueue as techId, index}
          {@const tech = getTechById(techId)}
          <div class="queue-item">
            <span class="queue-number">#{index + 1}</span>
            <span class="queue-icon">{tech?.icon}</span>
            <span class="queue-name">{tech?.name}</span>
            <button class="queue-remove" on:click={() => handleCancelResearch(techId)}>✕</button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tech-tree-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 900px;
    max-width: 95vw;
    max-height: 90vh;
    background: #1a1a2e;
    border: 2px solid #4a4a6a;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: linear-gradient(135deg, #2d2d4a, #1a1a2e);
    border-bottom: 2px solid #4a4a6a;
  }

  .panel-header h2 {
    margin: 0;
    font-size: 20px;
    color: #fff;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .branch-tabs {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: #16162a;
    border-bottom: 1px solid #3a3a5a;
  }

  .branch-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 8px;
    background: #252540;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: #aaa;
  }

  .branch-tab:hover {
    background: #303050;
    border-color: var(--branch-color);
  }

  .branch-tab.active {
    background: linear-gradient(135deg, var(--branch-color) + '33', var(--branch-color) + '11');
    border-color: var(--branch-color);
    color: #fff;
  }

  .branch-icon {
    font-size: 24px;
  }

  .branch-name {
    font-size: 14px;
    font-weight: bold;
  }

  .branch-progress {
    font-size: 11px;
    color: #888;
  }

  .tech-tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .branch-description {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .branch-description p {
    margin: 0 0 8px 0;
    color: #ccc;
    font-size: 14px;
  }

  .progress-bar {
    height: 8px;
    background: #333;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 12px;
    color: #888;
  }

  .tech-tree-grid {
    display: flex;
    gap: 12px;
    justify-content: space-around;
  }

  .tier-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .tier-label {
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 13px;
    font-weight: bold;
    color: #aaa;
  }

  .tier-techs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    align-items: center;
  }

  .tech-node {
    width: 130px;
    padding: 12px;
    background: #2a2a45;
    border: 2px solid #444;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
    position: relative;
  }

  .tech-node:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .tech-node.available {
    border-color: var(--tech-color);
    background: linear-gradient(135deg, var(--tech-color) + '22', #2a2a45);
  }

  .tech-node.available:hover {
    background: linear-gradient(135deg, var(--tech-color) + '44', #2a2a45);
  }

  .tech-node.researched {
    border-color: #4caf50;
    background: linear-gradient(135deg, #4caf5033, #2a2a45);
    opacity: 0.9;
  }

  .tech-node.researching {
    border-color: #ff9800;
    background: linear-gradient(135deg, #ff980033, #2a2a45);
    animation: pulse 2s infinite;
  }

  .tech-node.queued {
    border-color: #9c27b0;
    background: linear-gradient(135deg, #9c27b022, #2a2a45);
  }

  .tech-node.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(255, 152, 0, 0); }
  }

  .tech-icon {
    font-size: 32px;
    margin-bottom: 6px;
  }

  .tech-name {
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 4px;
  }

  .research-progress {
    margin-top: 6px;
  }

  .progress-bar-small {
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 2px;
  }

  .progress-fill-small {
    height: 100%;
    background: #ff9800;
    border-radius: 2px;
  }

  .progress-text-small {
    font-size: 10px;
    color: #ff9800;
  }

  .completed-badge {
    margin-top: 4px;
    font-size: 10px;
    color: #4caf50;
    font-weight: bold;
  }

  .queue-badge {
    margin-top: 4px;
    font-size: 10px;
    color: #9c27b0;
    font-weight: bold;
  }

  .tech-detail-panel {
    position: absolute;
    right: -280px;
    top: 60px;
    width: 260px;
    background: #1f1f35;
    border: 2px solid #4a4a6a;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: linear-gradient(135deg, var(--tech-color) + '33', #1f1f35);
    border-bottom: 2px solid var(--tech-color);
  }

  .detail-icon {
    font-size: 36px;
  }

  .detail-title h3 {
    margin: 0;
    font-size: 16px;
    color: #fff;
  }

  .detail-tier {
    font-size: 11px;
    color: #aaa;
  }

  .detail-body {
    padding: 14px;
    max-height: 400px;
    overflow-y: auto;
  }

  .tech-description {
    color: #ccc;
    font-size: 13px;
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .tech-effects,
  .tech-unlocks,
  .tech-requirements {
    margin-bottom: 12px;
  }

  .tech-effects h4,
  .tech-unlocks h4,
  .tech-requirements h4 {
    margin: 0 0 6px 0;
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
  }

  .tech-effects ul,
  .tech-unlocks ul,
  .tech-requirements ul {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: #ddd;
  }

  .tech-effects li,
  .tech-unlocks li,
  .tech-requirements li {
    margin-bottom: 3px;
  }

  .no-req {
    font-size: 12px;
    color: #666;
    margin: 0;
  }

  .completed-req {
    color: #4caf50;
    list-style: none;
  }

  .pending-req {
    color: #888;
    list-style: none;
  }

  .tech-cost {
    display: flex;
    gap: 12px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .cost-item {
    flex: 1;
    text-align: center;
  }

  .cost-label {
    display: block;
    font-size: 10px;
    color: #888;
    margin-bottom: 2px;
  }

  .cost-value {
    font-size: 13px;
    font-weight: bold;
    color: #fff;
  }

  .detail-actions {
    padding: 12px 14px;
    border-top: 1px solid #3a3a5a;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.research {
    background: linear-gradient(135deg, #4caf50, #388e3c);
    color: white;
  }

  .action-btn.research:hover {
    background: linear-gradient(135deg, #66bb6a, #43a047);
  }

  .action-btn.researching {
    background: #ff9800;
    color: white;
    cursor: default;
  }

  .action-btn.queued {
    background: #9c27b0;
    color: white;
    cursor: default;
  }

  .action-btn.completed {
    background: #4caf50;
    color: white;
    cursor: default;
    opacity: 0.7;
  }

  .action-btn.locked {
    background: #555;
    color: #aaa;
    cursor: not-allowed;
  }

  .action-btn.cancel {
    background: transparent;
    border: 1px solid #e74c3c;
    color: #e74c3c;
  }

  .action-btn.cancel:hover {
    background: rgba(231, 76, 60, 0.1);
  }

  .research-queue-panel {
    padding: 12px 16px;
    background: #16162a;
    border-top: 1px solid #3a3a5a;
  }

  .research-queue-panel h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #aaa;
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #252540;
    border-radius: 6px;
    font-size: 12px;
  }

  .queue-number {
    color: #9c27b0;
    font-weight: bold;
    font-size: 11px;
  }

  .queue-icon {
    font-size: 16px;
  }

  .queue-name {
    flex: 1;
    color: #fff;
  }

  .queue-remove {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }

  .queue-remove:hover {
    background: rgba(231, 76, 60, 0.2);
    color: #e74c3c;
  }
</style>

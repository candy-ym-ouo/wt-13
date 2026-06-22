<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    replayStore,
    currentReplayFrame,
    currentReplayState,
    isReplayPlaying,
    replayProgress
  } from '$lib/stores/replayStore';
  import { formatDate } from '$lib/utils/storage';

  /**
   * @typedef {import('../utils/replaySystem').ReplayData} ReplayData
   * @typedef {import('../utils/replaySystem').ReplayFrame} ReplayFrame
   */

  /** @type {boolean} */
  let showReplayList = true;
  /** @type {boolean} */
  let isPlayerReady = false;

  /** @type {ReplayData[]} */
  let replays = [];

  /** @type {ReplayFrame | null} */
  let currentFrame = null;

  /** @type {any} */
  let playerState = null;

  /** @type {number} */
  let progressValue = 0;

  /** @type {boolean} */
  let playing = false;

  /** @type {string} */
  let message = '';

  /** @type {number} */
  let currentSpeed = 1;

  /** @type {any} */
  let replayStats = null;

  /** @type {boolean} */
  let showBattleAnalysis = false;

  /** @type {(() => void) | undefined} */
  let unsubFrame;
  /** @type {(() => void) | undefined} */
  let unsubPlayer;
  /** @type {(() => void) | undefined} */
  let unsubPlaying;
  /** @type {(() => void) | undefined} */
  let unsubProgress;
  /** @type {(() => void) | undefined} */
  let unsubList;

  const FRAME_TYPE_LABELS = {
    move: { icon: '🚶', name: '移动', color: '#3498db' },
    attack: { icon: '⚔️', name: '攻击', color: '#e74c3c' },
    card: { icon: '🃏', name: '用卡', color: '#9b59b6' },
    turn: { icon: '🔄', name: '回合', color: '#f1c40f' },
    victory: { icon: '🏆', name: '胜负', color: '#2ecc71' },
    deployment: { icon: '🎯', name: '布阵', color: '#1abc9c' },
    summon: { icon: '✨', name: '召唤', color: '#e67e22' }
  };

  onMount(() => {
    unsubFrame = currentReplayFrame.subscribe(f => {
      currentFrame = f;
    });

    unsubPlayer = replayStore.player.subscribe(p => {
      playerState = p;
      message = p.message;
      currentSpeed = p.playbackSpeed;
      isPlayerReady = !!p.currentReplay;
      if (p.currentReplay) {
        replayStats = replayStore.stats.getStats(p.currentReplay);
      }
    });

    unsubPlaying = isReplayPlaying.subscribe(p => {
      playing = p;
    });

    unsubProgress = replayProgress.subscribe(p => {
      progressValue = p;
    });

    unsubList = replayStore.list.subscribe(r => {
      replays = r;
    });

    replayStore.list.refresh();
  });

  onDestroy(() => {
    if (unsubFrame) unsubFrame();
    if (unsubPlayer) unsubPlayer();
    if (unsubPlaying) unsubPlaying();
    if (unsubProgress) unsubProgress();
    if (unsubList) unsubList();
    replayStore.player.unloadReplay();
  });

  /**
   * @param {ReplayData} replay
   */
  function handleLoadReplay(replay) {
    replayStore.player.loadReplay(replay);
    showReplayList = false;
  }

  function handleTogglePlay() {
    replayStore.player.togglePlay();
  }

  function handlePrevFrame() {
    replayStore.player.prevFrame();
  }

  function handleNextFrame() {
    replayStore.player.nextFrame();
  }

  function handleJumpStart() {
    replayStore.player.jumpToStart();
  }

  function handleJumpEnd() {
    replayStore.player.jumpToEnd();
  }

  function handleCycleSpeed() {
    replayStore.player.cycleSpeed();
  }

  /**
   * @param {number} speed
   */
  function handleSetSpeed(speed) {
    replayStore.player.setPlaybackSpeed(speed);
  }

  /**
   * @param {'move' | 'attack' | 'card' | 'turn' | 'victory' | 'deployment' | 'summon'} type
   * @param {number} offset
   */
  function handleJumpToType(type, offset) {
    replayStore.player.jumpToFrameType(type, offset);
  }

  /**
   * @param {Event} e
   */
  function handleSeek(e) {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const value = parseFloat(target.value);
    const totalFrames = playerState?.currentReplay?.frames?.length || 0;
    const index = Math.floor(value * (totalFrames - 1));
    replayStore.player.seekToFrame(index);
  }

  function handleBackToList() {
    replayStore.player.unloadReplay();
    showReplayList = true;
  }

  /**
   * @param {ReplayData} replay
   * @returns {string}
   */
  function getWinnerLabel(replay) {
    if (!replay.winner || replay.winner === 'draw') return '🤝 平局';
    const color = replay.winner === 'red' ? '#e74c3c' : '#3498db';
    const name = replay.winner === 'red' ? '红方' : '蓝方';
    return `<span style="color:${color}">${name} 胜利</span>`;
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getFrameIcon(type) {
    return FRAME_TYPE_LABELS[type]?.icon || '📌';
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  function getFrameColor(type) {
    return FRAME_TYPE_LABELS[type]?.color || '#888';
  }

  /**
   * @param {string} faction
   * @returns {string}
   */
  function getFactionColor(faction) {
    return faction === 'red' ? '#e74c3c' : faction === 'blue' ? '#3498db' : '#888';
  }

  /**
   * @param {string} faction
   * @returns {string}
   */
  function getFactionName(faction) {
    return faction === 'red' ? '红方' : faction === 'blue' ? '蓝方' : '';
  }

  /**
   * @param {ReplayData} replay
   */
  function handleDeleteReplay(replay) {
    if (confirm(`确定删除此录像吗？`)) {
      replayStore.list.delete(replay.id);
    }
  }

  function handleClearAll() {
    if (confirm('确定要删除所有录像吗？此操作不可恢复！')) {
      replayStore.list.clearAll();
    }
  }

  /**
   * @param {ReplayData} replay
   * @returns {any}
   */
  function getBattleAnalysis(replay) {
    if (!replay || !replay.frames) return null;

    const analysis = {
      redKills: replay.killCounts?.red || 0,
      blueKills: replay.killCounts?.blue || 0,
      redDamage: replay.totalDamage?.red || 0,
      blueDamage: replay.totalDamage?.blue || 0,
      redMoves: 0,
      blueMoves: 0,
      redAttacks: 0,
      blueAttacks: 0,
      redCards: 0,
      blueCards: 0,
      totalTurns: replay.totalTurns || 0,
      victoryCondition: replay.victoryCondition || ''
    };

    for (const frame of replay.frames) {
      if (frame.faction === 'red') {
        if (frame.type === 'move') analysis.redMoves++;
        else if (frame.type === 'attack') analysis.redAttacks++;
        else if (frame.type === 'card') analysis.redCards++;
      } else if (frame.faction === 'blue') {
        if (frame.type === 'move') analysis.blueMoves++;
        else if (frame.type === 'attack') analysis.blueAttacks++;
        else if (frame.type === 'card') analysis.blueCards++;
      }
    }

    const totalActions = analysis.redMoves + analysis.blueMoves + analysis.redAttacks + analysis.blueAttacks + analysis.redCards + analysis.blueCards;
    analysis.actionRate = totalActions > 0 ? {
      red: Math.round(((analysis.redMoves + analysis.redAttacks + analysis.redCards) / totalActions) * 100),
      blue: Math.round(((analysis.blueMoves + analysis.blueAttacks + analysis.blueCards) / totalActions) * 100)
    } : { red: 50, blue: 50 };

    analysis.aggression = {
      red: analysis.redAttacks > 0 ? Math.round((analysis.redAttacks / (analysis.redMoves || 1)) * 100) : 0,
      blue: analysis.blueAttacks > 0 ? Math.round((analysis.blueAttacks / (analysis.blueMoves || 1)) * 100) : 0
    };

    return analysis;
  }

  /**
   * @param {number} value
   * @param {number} max
   * @returns {number}
   */
  function safePercent(value, max) {
    if (max <= 0) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  }
</script>

<div class="replay-container">
  {#if showReplayList}
    <div class="replay-list-panel">
      <div class="panel-header">
        <h3>🎬 战报录像列表</h3>
        <div class="header-actions">
          <button class="btn btn-danger btn-small" on:click={handleClearAll} disabled={replays.length === 0}>
            🗑 清空全部
          </button>
        </div>
      </div>
      <div class="replay-list">
        {#if replays.length === 0}
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无战报录像</p>
            <p class="empty-hint">完成一局游戏后会自动保存录像</p>
          </div>
        {:else}
          {#each replays as replay (replay.id)}
            <div class="replay-item">
              <div class="replay-item-header">
                <span class="replay-winner">{@html getWinnerLabel(replay)}</span>
                <span class="replay-date">{formatDate(replay.date)}</span>
              </div>
              <div class="replay-item-stats">
                <div class="stat-row">
                  <span class="stat-label">回合数</span>
                  <span class="stat-value">{replay.totalTurns}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">总帧数</span>
                  <span class="stat-value">{replay.frames?.length || 0}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label" style="color: #e74c3c">红方击杀</span>
                  <span class="stat-value" style="color: #e74c3c">{replay.killCounts?.red || 0}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label" style="color: #3498db">蓝方击杀</span>
                  <span class="stat-value" style="color: #3498db">{replay.killCounts?.blue || 0}</span>
                </div>
              </div>
              {#if replay.victoryCondition}
                <div class="replay-condition">{replay.victoryCondition}</div>
              {/if}
              <div class="replay-item-actions">
                <button class="btn btn-primary btn-small" on:click={() => handleLoadReplay(replay)}>
                  ▶ 播放录像
                </button>
                <button class="btn btn-danger btn-small" on:click={() => handleDeleteReplay(replay)}>
                  删除
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {:else if isPlayerReady && playerState?.currentReplay}
    <div class="replay-player">
      <div class="player-header">
        <button class="btn btn-secondary btn-small" on:click={handleBackToList}>
          ← 返回列表
        </button>
        <div class="player-title">
          <span class="title-icon">🎬</span>
          <span>战局回放</span>
          {#if playerState.currentReplay.winner}
            <span class="winner-badge" style="color: {getFactionColor(playerState.currentReplay.winner)}">
              {@html getWinnerLabel(playerState.currentReplay)}
            </span>
          {/if}
        </div>
      </div>

      {#if replayStats}
        <div class="stats-summary">
          <div class="stat-block">
            <span class="stat-icon">🚶</span>
            <span class="stat-num">{replayStats.moveCount}</span>
            <span class="stat-label">移动</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">⚔️</span>
            <span class="stat-num">{replayStats.attackCount}</span>
            <span class="stat-label">攻击</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">🃏</span>
            <span class="stat-num">{replayStats.cardCount}</span>
            <span class="stat-label">用卡</span>
          </div>
          <div class="stat-block">
            <span class="stat-icon">🔄</span>
            <span class="stat-num">{replayStats.turnCount}</span>
            <span class="stat-label">回合</span>
          </div>
          <button
            class="stat-block stat-toggle"
            on:click={() => showBattleAnalysis = !showBattleAnalysis}
            class:active={showBattleAnalysis}
          >
            <span class="stat-icon">📊</span>
            <span class="stat-label">复盘</span>
          </button>
        </div>
      {/if}

      {#if showBattleAnalysis && playerState.currentReplay}
        {@const analysis = getBattleAnalysis(playerState.currentReplay)}
        {#if analysis}
          <div class="battle-analysis">
            <div class="analysis-section">
              <div class="analysis-title">🏆 胜负结果</div>
              <div class="analysis-row">
                <span class="analysis-label">胜利方</span>
                <span class="analysis-value" style="color: {getFactionColor(playerState.currentReplay.winner)}">
                  {getFactionName(playerState.currentReplay.winner)}
                </span>
              </div>
              <div class="analysis-row">
                <span class="analysis-label">胜负条件</span>
                <span class="analysis-value">{analysis.victoryCondition}</span>
              </div>
              <div class="analysis-row">
                <span class="analysis-label">总回合</span>
                <span class="analysis-value">{analysis.totalTurns}</span>
              </div>
            </div>

            <div class="analysis-section">
              <div class="analysis-title">⚔️ 击杀 & 伤害</div>
              <div class="analysis-compare">
                <div class="compare-side red">
                  <div class="compare-num">{analysis.redKills}</div>
                  <div class="compare-label">击杀</div>
                </div>
                <div class="compare-mid">VS</div>
                <div class="compare-side blue">
                  <div class="compare-num">{analysis.blueKills}</div>
                  <div class="compare-label">击杀</div>
                </div>
              </div>
              <div class="bar-row">
                <div class="bar-label">红方伤害 {analysis.redDamage}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill red"
                    style="width: {safePercent(analysis.redDamage, Math.max(analysis.redDamage, analysis.blueDamage))}%"
                  ></div>
                </div>
              </div>
              <div class="bar-row">
                <div class="bar-label">蓝方伤害 {analysis.blueDamage}</div>
                <div class="bar-track">
                  <div
                    class="bar-fill blue"
                    style="width: {safePercent(analysis.blueDamage, Math.max(analysis.redDamage, analysis.blueDamage))}%"
                  ></div>
                </div>
              </div>
            </div>

            <div class="analysis-section">
              <div class="analysis-title">🎯 行动统计</div>
              <div class="analysis-grid">
                <div class="analysis-cell">
                  <div class="cell-title">红方</div>
                  <div class="cell-stats">
                    <span>🚶 {analysis.redMoves}</span>
                    <span>⚔️ {analysis.redAttacks}</span>
                    <span>🃏 {analysis.redCards}</span>
                  </div>
                </div>
                <div class="analysis-cell">
                  <div class="cell-title">蓝方</div>
                  <div class="cell-stats">
                    <span>🚶 {analysis.blueMoves}</span>
                    <span>⚔️ {analysis.blueAttacks}</span>
                    <span>🃏 {analysis.blueCards}</span>
                  </div>
                </div>
              </div>
              <div class="bar-row">
                <div class="bar-label">主动率</div>
                <div class="dual-bar">
                  <div
                    class="bar-fill red"
                    style="width: {analysis.actionRate.red}%"
                  >红方 {analysis.actionRate.red}%</div>
                  <div
                    class="bar-fill blue"
                    style="width: {analysis.actionRate.blue}%"
                  >蓝方 {analysis.actionRate.blue}%</div>
                </div>
              </div>
            </div>

            <div class="analysis-section">
              <div class="analysis-title">🔥 侵略性指数</div>
              <div class="bar-row">
                <div class="bar-label">红方</div>
                <div class="bar-track">
                  <div
                    class="bar-fill red"
                    style="width: {Math.min(100, analysis.aggression.red)}%"
                  ></div>
                </div>
                <span class="bar-value">{analysis.aggression.red}%</span>
              </div>
              <div class="bar-row">
                <div class="bar-label">蓝方</div>
                <div class="bar-track">
                  <div
                    class="bar-fill blue"
                    style="width: {Math.min(100, analysis.aggression.blue)}%"
                  ></div>
                </div>
                <span class="bar-value">{analysis.aggression.blue}%</span>
              </div>
            </div>
          </div>
        {/if}
      {/if}

      <div class="current-frame-info">
        {#if currentFrame}
          <div class="frame-header" style="border-left-color: {getFrameColor(currentFrame.type)}">
            <span class="frame-type-icon" style="background: {getFrameColor(currentFrame.type)}">
              {getFrameIcon(currentFrame.type)}
            </span>
            <div class="frame-meta">
              <span class="frame-turn">第 {currentFrame.turn} 回合</span>
              <span class="frame-faction" style="color: {getFactionColor(currentFrame.faction)}">
                {getFactionName(currentFrame.faction)}
              </span>
              <span class="frame-index">帧 {currentFrame.index + 1}/{playerState.currentReplay?.frames?.length || 0}</span>
            </div>
          </div>
          <div class="frame-description">{currentFrame.description}</div>
        {/if}
        {#if message}
          <div class="player-message">{message}</div>
        {/if}
      </div>

      <div class="progress-section">
        <input
          type="range"
          class="progress-slider"
          min="0"
          max="1"
          step="0.001"
          value={progressValue}
          on:input={handleSeek}
        />
        <div class="progress-labels">
          <span>开始</span>
          <span>{Math.round(progressValue * 100)}%</span>
          <span>结束</span>
        </div>
      </div>

      <div class="main-controls">
        <button class="ctrl-btn" on:click={handleJumpStart} title="跳到开始">
          ⏮
        </button>
        <button class="ctrl-btn" on:click={handlePrevFrame} title="上一帧">
          ◀
        </button>
        <button class="ctrl-btn ctrl-play" on:click={handleTogglePlay} title={playing ? '暂停' : '播放'}>
          {playing ? '⏸' : '▶'}
        </button>
        <button class="ctrl-btn" on:click={handleNextFrame} title="下一帧">
          ▶
        </button>
        <button class="ctrl-btn" on:click={handleJumpEnd} title="跳到结束">
          ⏭
        </button>
      </div>

      <div class="speed-controls">
        <span class="speed-label">倍速:</span>
        {#each replayStore.PLAYBACK_SPEEDS as speed}
          <button
            class="speed-btn {currentSpeed === speed ? 'active' : ''}"
            on:click={() => handleSetSpeed(speed)}
          >
            {speed}x
          </button>
        {/each}
      </div>

      <div class="keyframe-controls">
        <span class="kf-label">关键帧跳转:</span>
        <div class="kf-buttons">
          <button class="kf-btn" on:click={() => handleJumpToType('turn', -1)} title="上一回合">
            🔄←
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('turn', 1)} title="下一回合">
            →🔄
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('move', -1)} title="上一移动">
            🚶←
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('move', 1)} title="下一移动">
            →🚶
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('attack', -1)} title="上一攻击">
            ⚔️←
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('attack', 1)} title="下一攻击">
            →⚔️
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('card', -1)} title="上一用卡">
            🃏←
          </button>
          <button class="kf-btn" on:click={() => handleJumpToType('card', 1)} title="下一用卡">
            →🃏
          </button>
          <button class="kf-btn kf-victory" on:click={() => handleJumpToType('victory', 0)} title="跳转到胜负">
            🏆
          </button>
        </div>
      </div>

      {#if currentFrame?.actionDetails && Object.keys(currentFrame.actionDetails).length > 0}
        <div class="action-details">
          <div class="details-title">📋 动作详情</div>
          <div class="details-grid">
            {#each Object.entries(currentFrame.actionDetails) as [key, value]}
              {#if typeof value !== 'object' && value !== undefined && value !== null}
                <div class="detail-item">
                  <span class="detail-key">{key}</span>
                  <span class="detail-value">{String(value)}</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .replay-container {
    background: rgba(26, 26, 46, 0.98);
    border: 2px solid #3498db;
    border-radius: 12px;
    color: white;
    font-family: inherit;
    max-width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-header,
  .player-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: rgba(52, 152, 219, 0.15);
    border-bottom: 1px solid rgba(52, 152, 219, 0.3);
  }

  .panel-header h3,
  .player-title {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .title-icon {
    font-size: 20px;
  }

  .winner-badge {
    font-size: 13px;
    font-weight: bold;
    margin-left: 12px;
    padding: 2px 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }

  .replay-list {
    padding: 16px;
    overflow-y: auto;
    max-height: 70vh;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-hint {
    font-size: 12px;
    color: #666;
  }

  .replay-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 14px;
    transition: all 0.2s;
  }

  .replay-item:hover {
    border-color: rgba(52, 152, 219, 0.5);
    background: rgba(52, 152, 219, 0.05);
  }

  .replay-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .replay-winner {
    font-weight: bold;
    font-size: 14px;
  }

  .replay-date {
    font-size: 11px;
    color: #888;
  }

  .replay-item-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    margin-bottom: 8px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .stat-label {
    color: #aaa;
  }

  .stat-value {
    font-weight: bold;
  }

  .replay-condition {
    font-size: 11px;
    color: #f1c40f;
    background: rgba(241, 196, 15, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .replay-item-actions {
    display: flex;
    gap: 8px;
  }

  .replay-player {
    padding: 16px 20px;
    overflow-y: auto;
  }

  .stats-summary {
    display: flex;
    justify-content: center;
    gap: 24px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .stat-num {
    font-size: 20px;
    font-weight: bold;
    color: #f1c40f;
  }

  .stat-label {
    font-size: 11px;
    color: #888;
  }

  .stat-toggle {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    transition: all 0.2s;
  }

  .stat-toggle:hover {
    background: rgba(52, 152, 219, 0.2);
    border-color: #3498db;
  }

  .stat-toggle.active {
    background: rgba(52, 152, 219, 0.4);
    border-color: #3498db;
  }

  .battle-analysis {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .analysis-section {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 12px;
  }

  .analysis-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #f1c40f;
  }

  .analysis-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: 13px;
  }

  .analysis-label {
    color: #888;
  }

  .analysis-value {
    font-weight: bold;
    color: #eee;
  }

  .analysis-compare {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .compare-side {
    flex: 1;
    text-align: center;
    padding: 8px;
    border-radius: 6px;
  }

  .compare-side.red {
    background: rgba(231, 76, 60, 0.2);
  }

  .compare-side.blue {
    background: rgba(52, 152, 219, 0.2);
  }

  .compare-num {
    font-size: 24px;
    font-weight: bold;
  }

  .compare-side.red .compare-num {
    color: #e74c3c;
  }

  .compare-side.blue .compare-num {
    color: #3498db;
  }

  .compare-label {
    font-size: 11px;
    color: #888;
  }

  .compare-mid {
    padding: 0 12px;
    font-weight: bold;
    color: #888;
    font-size: 14px;
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
  }

  .bar-label {
    width: 100px;
    font-size: 12px;
    color: #aaa;
    flex-shrink: 0;
  }

  .bar-track {
    flex: 1;
    height: 18px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #fff;
    font-weight: bold;
    transition: width 0.3s ease;
    min-width: 0;
  }

  .bar-fill.red {
    background: linear-gradient(90deg, #e74c3c, #c0392b);
  }

  .bar-fill.blue {
    background: linear-gradient(90deg, #3498db, #2980b9);
  }

  .bar-value {
    width: 50px;
    text-align: right;
    font-size: 12px;
    font-weight: bold;
    color: #f1c40f;
  }

  .dual-bar {
    flex: 1;
    display: flex;
    height: 22px;
    border-radius: 11px;
    overflow: hidden;
  }

  .dual-bar .bar-fill {
    font-size: 10px;
  }

  .analysis-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  .analysis-cell {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 10px;
  }

  .cell-title {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 8px;
    text-align: center;
  }

  .analysis-cell:first-child .cell-title {
    color: #e74c3c;
  }

  .analysis-cell:last-child .cell-title {
    color: #3498db;
  }

  .cell-stats {
    display: flex;
    justify-content: space-around;
    font-size: 13px;
    color: #eee;
  }

  .current-frame-info {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .frame-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-left: 12px;
    border-left: 3px solid;
    margin-bottom: 8px;
  }

  .frame-type-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }

  .frame-meta {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .frame-turn {
    font-weight: bold;
    font-size: 14px;
  }

  .frame-faction {
    font-weight: bold;
    font-size: 13px;
  }

  .frame-index {
    font-size: 11px;
    color: #888;
  }

  .frame-description {
    font-size: 14px;
    line-height: 1.5;
    color: #eee;
  }

  .player-message {
    margin-top: 8px;
    padding: 6px 12px;
    background: rgba(52, 152, 219, 0.2);
    border-radius: 4px;
    font-size: 12px;
    color: #5dade2;
  }

  .progress-section {
    margin-bottom: 16px;
  }

  .progress-slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
  }

  .progress-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    transition: all 0.2s;
  }

  .progress-slider::-webkit-slider-thumb:hover {
    background: #5dade2;
    transform: scale(1.1);
  }

  .progress-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: none;
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #888;
    margin-top: 4px;
  }

  .main-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .ctrl-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .ctrl-btn:active {
    transform: scale(0.95);
  }

  .ctrl-play {
    width: 56px;
    height: 56px;
    background: #3498db;
    font-size: 20px;
  }

  .ctrl-play:hover {
    background: #2980b9;
  }

  .speed-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 16px;
  }

  .speed-label {
    font-size: 12px;
    color: #888;
    margin-right: 4px;
  }

  .speed-btn {
    padding: 4px 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    color: #aaa;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: bold;
  }

  .speed-btn:hover {
    border-color: #3498db;
    color: white;
  }

  .speed-btn.active {
    background: #3498db;
    border-color: #3498db;
    color: white;
  }

  .keyframe-controls {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .kf-label {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
    padding-top: 4px;
  }

  .kf-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .kf-btn {
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .kf-btn:hover {
    background: rgba(52, 152, 219, 0.2);
    border-color: #3498db;
  }

  .kf-victory {
    background: rgba(46, 204, 113, 0.15);
    border-color: rgba(46, 204, 113, 0.3);
  }

  .kf-victory:hover {
    background: rgba(46, 204, 113, 0.3);
    border-color: #2ecc71;
  }

  .action-details {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 12px 16px;
  }

  .details-title {
    font-size: 13px;
    font-weight: bold;
    color: #f1c40f;
    margin-bottom: 10px;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px 16px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 3px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .detail-key {
    color: #888;
  }

  .detail-value {
    font-weight: bold;
    color: #eee;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn-primary {
    background: #3498db;
    color: white;
  }

  .btn-primary:hover {
    background: #2980b9;
  }

  .btn-secondary {
    background: #2c3e50;
    color: white;
  }

  .btn-secondary:hover {
    background: #34495e;
  }

  .btn-danger {
    background: #e74c3c;
    color: white;
  }

  .btn-danger:hover {
    background: #c0392b;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>

<script>
  import { onMount, onDestroy } from 'svelte';
  import { roomStore, localPlayer, opponentPlayer, reconnectProgress } from '$lib/stores/roomStore';
  import {
    broadcastReady,
    broadcastFactionSelection,
    requestReconnect,
    startReconnectTimer,
    stopReconnectTimer,
    broadcastChatMessage,
    leaveRoom
  } from '$lib/utils/roomSync';

  let showDetails = true;
  let showChat = false;
  let chatInput = '';
  let reconnectTimerStarted = false;

  $: isPaused = $roomStore.phase === 'paused';
  $: isReconnecting = $roomStore.isReconnecting;
  $: opponentDisconnected = $opponentPlayer && !$opponentPlayer.connected;
  $: localFaction = $localPlayer?.faction;

  onMount(() => {
    if (isPaused && opponentDisconnected && !reconnectTimerStarted) {
      reconnectTimerStarted = true;
      startReconnectTimer();
    }
  });

  onDestroy(() => {
    stopReconnectTimer();
  });

  $: if (isPaused && opponentDisconnected && !reconnectTimerStarted) {
    reconnectTimerStarted = true;
    startReconnectTimer();
  }

  $: if (!isPaused || !opponentDisconnected) {
    reconnectTimerStarted = false;
    stopReconnectTimer();
  }

  function handleReconnect() {
    requestReconnect();
  }

  function handleForfeit() {
    if (confirm('确定要放弃等待并结束游戏吗？')) {
      roomStore.cancelReconnect();
    }
  }

  function handleToggleReady() {
    const player = $localPlayer;
    if (!player) return;
    broadcastReady(!player.ready);
  }

  function handleChatSend() {
    if (!chatInput.trim()) return;
    broadcastChatMessage(`${$localPlayer?.name || '???'}: ${chatInput.trim()}`);
    chatInput = '';
  }

  function handleExitRoom() {
    if (confirm('确定要退出房间吗？')) {
      leaveRoom();
    }
  }

  /** @param {'red' | 'blue' | 'none'} faction */
  function getFactionIcon(faction) {
    if (faction === 'red') return '🔴';
    if (faction === 'blue') return '🔵';
    return '⚪';
  }

  /** @param {'red' | 'blue' | 'none'} faction */
  function getFactionLabel(faction) {
    if (faction === 'red') return '红方';
    if (faction === 'blue') return '蓝方';
    return '未选';
  }

  /** @param {number} ms */
  function formatTime(ms) {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="room-panel">
  <div class="panel-header" on:click={() => showDetails = !showDetails}>
    <span class="panel-title">
      {#if $roomStore.phase === 'playing'}🎮{/if}
      {#if $roomStore.phase === 'paused'}⏸{/if}
      {#if $roomStore.phase === 'deploying'}⚔{/if}
      {#if $roomStore.phase === 'finished'}🏆{/if}
      对战房间
    </span>
    <span class="panel-toggle">{showDetails ? '▼' : '▶'}</span>
  </div>

  {#if showDetails}
    <div class="panel-body">
      <div class="room-meta">
        <span class="meta-item">房间号: <strong class="room-code">{$roomStore.roomCode || '--'}</strong></span>
        <span class="meta-item">
          {#if $roomStore.turnLock}
            回合 {$roomStore.turnLock.turn} ·
            {#if $roomStore.turnLock.faction === 'red'}🔴{:else}🔵{/if}
            {$roomStore.turnLock.faction === 'red' ? '红方' : '蓝方'}行动
          {:else}
            等待开始
          {/if}
        </span>
        <span class="meta-item" class:paused={$roomStore.phase === 'paused'}>
          {#if $roomStore.phase === 'playing'}进行中{/if}
          {#if $roomStore.phase === 'paused'}已暂停{/if}
          {#if $roomStore.phase === 'deploying'}布阵中{/if}
          {#if $roomStore.phase === 'finished'}已结束{/if}
        </span>
      </div>

      <div class="players-bar">
        {#each $roomStore.players as player (player.id)}
          <div class="player-tag" class:local={player.isLocal} class:disconnected={!player.connected}>
            <span class="player-faction-icon">{getFactionIcon(player.faction)}</span>
            <span class="player-name">{player.name}</span>
            {#if !player.connected}
              <span class="dc-badge">⚠</span>
            {:else if player.ready && $roomStore.phase !== 'playing'}
              <span class="ready-badge">✓</span>
            {/if}
            {#if player.isHost}
              <span class="host-icon">👑</span>
            {/if}
          </div>
        {/each}
      </div>

      {#if $roomStore.phase === 'lobby' || $roomStore.phase === 'deploying'}
        <div class="lobby-actions">
          {#if $localPlayer && $localPlayer.faction === 'none'}
            <div class="faction-quick-select">
              <button class="quick-faction red" on:click={() => broadcastFactionSelection('red')}>🔴 红方</button>
              <button class="quick-faction blue" on:click={() => broadcastFactionSelection('blue')}>🔵 蓝方</button>
            </div>
          {/if}

          {#if $localPlayer && $localPlayer.faction !== 'none' && !$localPlayer.ready}
            <button class="action-btn ready-btn" on:click={handleToggleReady}>
              ✅ 准备
            </button>
          {/if}

          {#if $localPlayer && $localPlayer.ready}
            <button class="action-btn cancel-btn" on:click={handleToggleReady}>
              ❌ 取消准备
            </button>
          {/if}
        </div>
      {/if}

      {#if isPaused && opponentDisconnected}
        <div class="disconnect-overlay">
          <div class="disconnect-info">
            <span class="disconnect-icon">⚠️</span>
            <span class="disconnect-text">对手已断开连接</span>
            {#if $reconnectProgress}
              <div class="reconnect-progress">
                <div class="reconnect-bar">
                  <div class="reconnect-fill" style="width: {$reconnectProgress.percent}%"></div>
                </div>
                <span class="reconnect-time">等待重连 {$reconnectProgress.remaining}s</span>
              </div>
            {/if}
          </div>
          <div class="disconnect-actions">
            <button class="action-btn wait-btn" on:click={handleReconnect}>
              🔄 等待重连
            </button>
            <button class="action-btn forfeit-btn" on:click={handleForfeit}>
              🏳 判胜
            </button>
          </div>
        </div>
      {/if}

      {#if isReconnecting && !$opponentPlayer?.connected}
        <div class="self-reconnect">
          <span class="reconnect-icon">🔄</span>
          <span class="reconnect-text">正在尝试重新连接...</span>
          {#if $reconnectProgress}
            <div class="reconnect-progress">
              <div class="reconnect-bar">
                <div class="reconnect-fill" style="width: {$reconnectProgress.percent}%"></div>
              </div>
              <span class="reconnect-time">{$reconnectProgress.remaining}s</span>
            </div>
          {/if}
        </div>
      {/if}

      {#if $roomStore.phase === 'playing' && localFaction}
        <div class="turn-indicator" class:my-turn={$roomStore.turnLock?.faction === localFaction}>
          {#if $roomStore.turnLock?.faction === localFaction}
            <span class="turn-text my">⚔ 轮到你行动！</span>
          {:else}
            <span class="turn-text opponent">⏳ 对手回合</span>
          {/if}
        </div>
      {/if}

      {#if $roomStore.pendingActions.length > 0}
        <div class="sync-status">
          <span class="sync-icon">🔄</span>
          <span class="sync-text">同步中 ({$roomStore.pendingActions.length})</span>
        </div>
      {/if}

      <div class="chat-section">
        <button class="chat-toggle" on:click={() => showChat = !showChat}>
          💬 {showChat ? '收起' : '聊天'}
        </button>

        {#if showChat}
          <div class="chat-area">
            <div class="chat-messages">
              {#each $roomStore.chatLog.slice(-8) as entry (entry.timestamp)}
                <div class="chat-msg">
                  <span class="chat-ts">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span>{entry.text}</span>
                </div>
              {/each}
            </div>
            <div class="chat-input-row">
              <input
                type="text"
                class="chat-input"
                bind:value={chatInput}
                placeholder="发送消息..."
                on:keydown={(e) => e.key === 'Enter' && handleChatSend()}
              />
              <button class="chat-send" on:click={handleChatSend}>发送</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .room-panel {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    user-select: none;
  }

  .panel-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .panel-title {
    font-size: 13px;
    font-weight: bold;
    color: #ddd;
  }

  .panel-toggle {
    font-size: 11px;
    color: #777;
  }

  .panel-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .room-meta {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #999;
  }

  .room-code {
    color: #ffd700;
    letter-spacing: 1px;
  }

  .meta-item.paused {
    color: #e74c3c;
    font-weight: bold;
  }

  .players-bar {
    display: flex;
    gap: 8px;
  }

  .player-tag {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    font-size: 12px;
    color: #ccc;
  }

  .player-tag.local {
    border-color: rgba(255, 215, 0, 0.3);
  }

  .player-tag.disconnected {
    border-color: rgba(231, 76, 60, 0.4);
    opacity: 0.7;
  }

  .player-faction-icon {
    font-size: 11px;
  }

  .dc-badge {
    color: #e74c3c;
    font-size: 11px;
  }

  .ready-badge {
    color: #2ecc71;
    font-size: 11px;
  }

  .host-icon {
    font-size: 10px;
  }

  .lobby-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .faction-quick-select {
    display: flex;
    gap: 6px;
    flex: 1;
  }

  .quick-faction {
    flex: 1;
    padding: 7px 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    color: #bbb;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .quick-faction.red:hover {
    border-color: #e74c3c;
    color: #e74c3c;
  }

  .quick-faction.blue:hover {
    border-color: #3498db;
    color: #3498db;
  }

  .action-btn {
    padding: 7px 14px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ready-btn {
    background: rgba(46, 204, 113, 0.2);
    color: #2ecc71;
  }

  .cancel-btn {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
  }

  .wait-btn {
    background: rgba(52, 152, 219, 0.2);
    color: #3498db;
  }

  .forfeit-btn {
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
  }

  .disconnect-overlay {
    padding: 12px;
    background: rgba(231, 76, 60, 0.08);
    border: 1px solid rgba(231, 76, 60, 0.25);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .disconnect-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .disconnect-icon {
    font-size: 28px;
  }

  .disconnect-text {
    font-size: 14px;
    color: #e74c3c;
    font-weight: bold;
  }

  .disconnect-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .reconnect-progress {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .reconnect-bar {
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  }

  .reconnect-fill {
    height: 100%;
    background: linear-gradient(90deg, #3498db, #2ecc71);
    border-radius: 3px;
    transition: width 1s linear;
  }

  .reconnect-time {
    font-size: 12px;
    color: #3498db;
  }

  .self-reconnect {
    padding: 12px;
    background: rgba(52, 152, 219, 0.1);
    border: 1px solid rgba(52, 152, 219, 0.25);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .reconnect-icon {
    font-size: 24px;
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .reconnect-text {
    font-size: 13px;
    color: #3498db;
  }

  .turn-indicator {
    padding: 8px 12px;
    border-radius: 6px;
    text-align: center;
    font-size: 13px;
  }

  .turn-indicator.my-turn {
    background: rgba(46, 204, 113, 0.12);
    border: 1px solid rgba(46, 204, 113, 0.3);
  }

  .turn-text.my {
    color: #2ecc71;
    font-weight: bold;
  }

  .turn-text.opponent {
    color: #999;
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #f39c12;
  }

  .sync-icon {
    animation: spin 1.5s linear infinite;
  }

  .chat-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .chat-toggle {
    padding: 5px 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #999;
    font-size: 11px;
    cursor: pointer;
    align-self: flex-start;
  }

  .chat-toggle:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .chat-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .chat-messages {
    max-height: 100px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .chat-msg {
    font-size: 11px;
    color: #aaa;
    display: flex;
    gap: 6px;
  }

  .chat-ts {
    color: #555;
    white-space: nowrap;
  }

  .chat-input-row {
    display: flex;
    gap: 6px;
  }

  .chat-input {
    flex: 1;
    padding: 6px 10px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #fff;
    font-size: 12px;
    outline: none;
  }

  .chat-input:focus {
    border-color: rgba(52, 152, 219, 0.4);
  }

  .chat-send {
    padding: 6px 12px;
    background: rgba(52, 152, 219, 0.2);
    border: 1px solid rgba(52, 152, 219, 0.3);
    border-radius: 6px;
    color: #3498db;
    font-size: 11px;
    cursor: pointer;
  }
</style>

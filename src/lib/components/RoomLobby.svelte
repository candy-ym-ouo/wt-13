<script>
  import { roomStore, localPlayer, allReady, canStartGame } from '$lib/stores/roomStore';
  import {
    broadcastFactionSelection,
    broadcastReady,
    broadcastGameStart,
    createRoom,
    joinRoom,
    leaveRoom
  } from '$lib/utils/roomSync';

  let playerName = '';
  let roomCodeInput = '';
  let showJoinForm = false;
  let showCreateForm = true;
  let isJoining = false;
  let joinError = '';

  async function handleCreateRoom() {
    const name = playerName.trim() || '房主';
    createRoom(name, {});
  }

  async function handleJoinRoom() {
    const name = playerName.trim() || '挑战者';
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;

    isJoining = true;
    joinError = '';

    try {
      await joinRoom(code, name);
    } catch (e) {
      const err = /** @type {Error} */ (e);
      joinError = err.message || '加入房间失败';
      isJoining = false;
      return;
    }

    isJoining = false;
  }

  /** @param {'red' | 'blue' | 'none'} faction */
  function handleSelectFaction(faction) {
    broadcastFactionSelection(faction);
  }

  function handleToggleReady() {
    const player = $localPlayer;
    if (!player) return;
    broadcastReady(!player.ready);
  }

  function handleStartGame() {
    if (!$canStartGame) return;
    broadcastGameStart();
  }

  function handleAutoAssign() {
    roomStore.autoAssignFactions();
  }

  function handleBackToMenu() {
    leaveRoom();
  }

  /** @param {'red' | 'blue' | 'none'} faction */
  function getFactionLabel(faction) {
    if (faction === 'red') return '🔴 红方';
    if (faction === 'blue') return '🔵 蓝方';
    return '⚪ 未选择';
  }

  /** @param {'red' | 'blue' | 'none'} faction */
  function getFactionColor(faction) {
    if (faction === 'red') return '#e74c3c';
    if (faction === 'blue') return '#3498db';
    return '#666';
  }
</script>

<div class="room-lobby">
  {#if !$roomStore.roomId}
    <div class="lobby-entry">
      <h2 class="lobby-title">⚔️ 多人对战</h2>
      <p class="lobby-subtitle">创建或加入房间，与对手一决高下</p>

      <div class="form-group">
        <label class="form-label">你的昵称</label>
        <input
          type="text"
          class="form-input"
          bind:value={playerName}
          placeholder="输入昵称..."
          maxlength={12}
        />
      </div>

      <div class="lobby-tabs">
        <button
          class="tab-btn"
          class:active={showCreateForm}
          on:click={() => { showCreateForm = true; showJoinForm = false; }}
        >
          🏠 创建房间
        </button>
        <button
          class="tab-btn"
          class:active={showJoinForm}
          on:click={() => { showJoinForm = true; showCreateForm = false; }}
        >
          🚪 加入房间
        </button>
      </div>

      {#if showCreateForm}
        <button class="btn-primary" on:click={handleCreateRoom}>
          🎮 创建房间
        </button>
      {/if}

      {#if showJoinForm}
        <div class="form-group">
          <label class="form-label">房间号</label>
          <input
            type="text"
            class="form-input"
            bind:value={roomCodeInput}
            placeholder="输入6位房间号..."
            maxlength={6}
            disabled={isJoining}
          />
        </div>
        {#if joinError}
          <div class="error-text">{joinError}</div>
        {/if}
        <button class="btn-primary" on:click={handleJoinRoom} disabled={isJoining}>
          {#if isJoining}⏳ 加入中...{:else}🚀 加入房间{/if}
        </button>
      {/if}

      <button class="btn-back" on:click={handleBackToMenu}>
        ← 返回主菜单
      </button>
    </div>
  {:else}
    <div class="room-view">
      <div class="room-header">
        <div class="room-info">
          <span class="room-id">房间号: <strong>{$roomStore.roomCode}</strong></span>
          <span class="room-phase">
            {#if $roomStore.phase === 'lobby'}大厅{/if}
            {#if $roomStore.phase === 'deploying'}布阵中{/if}
            {#if $roomStore.phase === 'playing'}对局中{/if}
            {#if $roomStore.phase === 'paused'}已暂停{/if}
            {#if $roomStore.phase === 'finished'}已结束{/if}
          </span>
        </div>
        <button class="btn-back" on:click={handleBackToMenu}>
          退出房间
        </button>
      </div>

      <div class="players-area">
        {#each $roomStore.players as player (player.id)}
          <div class="player-card" class:local={player.isLocal} style="--faction-color: {getFactionColor(player.faction)}">
            <div class="player-header">
              <span class="player-name">{player.name}</span>
              {#if player.isHost}
                <span class="host-badge">👑 房主</span>
              {/if}
              {#if !player.connected}
                <span class="disconnect-badge">⚠ 断线</span>
              {/if}
            </div>

            <div class="player-faction">
              <span class="faction-label">{getFactionLabel(player.faction)}</span>

              {#if player.isLocal && $roomStore.phase === 'lobby'}
                <div class="faction-buttons">
                  <button
                    class="faction-btn red"
                    class:selected={player.faction === 'red'}
                    disabled={$roomStore.players.some(p => p.id !== player.id && p.faction === 'red')}
                    on:click={() => handleSelectFaction('red')}
                  >
                    🔴 红方
                  </button>
                  <button
                    class="faction-btn random"
                    class:selected={player.faction === 'none'}
                    on:click={() => handleSelectFaction('none')}
                  >
                    🎲 随机
                  </button>
                  <button
                    class="faction-btn blue"
                    class:selected={player.faction === 'blue'}
                    disabled={$roomStore.players.some(p => p.id !== player.id && p.faction === 'blue')}
                    on:click={() => handleSelectFaction('blue')}
                  >
                    🔵 蓝方
                  </button>
                </div>
              {/if}
            </div>

            <div class="player-ready">
              {#if player.faction !== 'none'}
                <span class="ready-status" class:ready={player.ready}>
                  {player.ready ? '✅ 已准备' : '⏳ 未准备'}
                </span>
              {/if}
            </div>
          </div>
        {/each}

        {#if $roomStore.players.length < 2}
          <div class="player-card waiting">
            <div class="waiting-content">
              <span class="waiting-icon">⏳</span>
              <span class="waiting-text">等待对手加入...</span>
              <span class="waiting-code">房间号: {$roomStore.roomCode}</span>
            </div>
          </div>
        {/if}
      </div>

      {#if $roomStore.players.length === 2 && $roomStore.players.every(p => p.faction === 'none')}
        <button class="btn-secondary" on:click={handleAutoAssign}>
          🎲 随机分配阵营
        </button>
      {/if}

      {#if $localPlayer && $localPlayer.faction !== 'none'}
        <button
          class="btn-ready"
          class:is-ready={$localPlayer.ready}
          on:click={handleToggleReady}
        >
          {$localPlayer.ready ? '❌ 取消准备' : '✅ 准备就绪'}
        </button>
      {/if}

      {#if $localPlayer?.isHost && $canStartGame}
        <button class="btn-start" on:click={handleStartGame}>
          🚀 开始游戏
        </button>
      {:else if $canStartGame && !$localPlayer?.isHost}
        <div class="waiting-host">
          <span class="waiting-dots">等待房主开始游戏</span>
        </div>
      {:else if $roomStore.players.length === 2}
        <div class="ready-hint">
          <span>双方选择阵营并准备后即可开始</span>
        </div>
      {/if}

      {#if $roomStore.chatLog.length > 0}
        <div class="chat-log">
          {#each $roomStore.chatLog.slice(-5) as entry (entry.timestamp)}
            <div class="chat-entry">
              <span class="chat-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span class="chat-text">{entry.text}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .room-lobby {
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    padding: 20px;
  }

  .lobby-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px 24px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
  }

  .lobby-title {
    font-size: 28px;
    margin: 0;
    background: linear-gradient(135deg, #ffd700, #ff9800);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lobby-subtitle {
    font-size: 14px;
    color: #999;
    margin: 0;
  }

  .form-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 13px;
    color: #bbb;
  }

  .form-input {
    padding: 10px 14px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #fff;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
  }

  .form-input:focus {
    border-color: rgba(255, 215, 0, 0.5);
  }

  .form-input::placeholder {
    color: #555;
  }

  .lobby-tabs {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    padding: 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: rgba(255, 215, 0, 0.12);
    border-color: rgba(255, 215, 0, 0.4);
    color: #ffd700;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .error-text {
    color: #e74c3c;
    font-size: 13px;
    text-align: center;
    padding: 8px;
    background: rgba(231, 76, 60, 0.1);
    border-radius: 6px;
    width: 100%;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
  }

  .btn-secondary {
    padding: 10px 20px;
    background: rgba(155, 89, 182, 0.2);
    border: 1px solid rgba(155, 89, 182, 0.4);
    border-radius: 8px;
    color: #bb8fce;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(155, 89, 182, 0.3);
  }

  .btn-ready {
    width: 100%;
    padding: 12px;
    background: rgba(46, 204, 113, 0.15);
    border: 2px solid rgba(46, 204, 113, 0.5);
    border-radius: 10px;
    color: #2ecc71;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-ready.is-ready {
    background: rgba(231, 76, 60, 0.15);
    border-color: rgba(231, 76, 60, 0.5);
    color: #e74c3c;
  }

  .btn-start {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #2ecc71, #27ae60);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    animation: pulse 2s ease-in-out infinite;
  }

  .btn-start:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(46, 204, 113, 0.5);
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
    50% { box-shadow: 0 0 20px 4px rgba(46, 204, 113, 0.2); }
  }

  .btn-back {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #999;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-back:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: #ccc;
  }

  .room-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
  }

  .room-info {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .room-id {
    font-size: 14px;
    color: #ccc;
  }

  .room-id strong {
    color: #ffd700;
    font-size: 16px;
    letter-spacing: 2px;
  }

  .room-phase {
    padding: 3px 10px;
    background: rgba(52, 152, 219, 0.2);
    border-radius: 12px;
    font-size: 12px;
    color: #3498db;
  }

  .players-area {
    display: flex;
    gap: 12px;
  }

  .player-card {
    flex: 1;
    padding: 16px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--faction-color, rgba(255, 255, 255, 0.1));
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: all 0.3s;
  }

  .player-card.local {
    background: rgba(255, 255, 255, 0.03);
  }

  .player-card.waiting {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.15);
    align-items: center;
    justify-content: center;
  }

  .waiting-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #777;
  }

  .waiting-icon {
    font-size: 32px;
    animation: blink 1.5s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .waiting-text {
    font-size: 14px;
  }

  .waiting-code {
    font-size: 12px;
    color: #ffd700;
  }

  .player-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .player-name {
    font-size: 15px;
    font-weight: bold;
    color: #eee;
  }

  .host-badge {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(255, 215, 0, 0.15);
    border-radius: 8px;
    color: #ffd700;
  }

  .disconnect-badge {
    font-size: 11px;
    padding: 2px 8px;
    background: rgba(231, 76, 60, 0.2);
    border-radius: 8px;
    color: #e74c3c;
  }

  .player-faction {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .faction-label {
    font-size: 14px;
    color: #bbb;
  }

  .faction-buttons {
    display: flex;
    gap: 6px;
  }

  .faction-btn {
    flex: 1;
    padding: 8px 6px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    color: #aaa;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .faction-btn.red.selected {
    border-color: #e74c3c;
    background: rgba(231, 76, 60, 0.15);
    color: #e74c3c;
  }

  .faction-btn.blue.selected {
    border-color: #3498db;
    background: rgba(52, 152, 219, 0.15);
    color: #3498db;
  }

  .faction-btn.random.selected {
    border-color: #9b59b6;
    background: rgba(155, 89, 182, 0.15);
    color: #9b59b6;
  }

  .faction-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .player-ready {
    display: flex;
  }

  .ready-status {
    font-size: 13px;
    color: #e67e22;
  }

  .ready-status.ready {
    color: #2ecc71;
  }

  .waiting-host {
    text-align: center;
    padding: 10px;
    color: #999;
    font-size: 14px;
  }

  .waiting-dots::after {
    content: '';
    animation: dots 1.5s steps(3) infinite;
  }

  @keyframes dots {
    0% { content: '.'; }
    33% { content: '..'; }
    66% { content: '...'; }
  }

  .ready-hint {
    text-align: center;
    padding: 10px;
    color: #777;
    font-size: 13px;
  }

  .chat-log {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    max-height: 120px;
    overflow-y: auto;
  }

  .chat-entry {
    display: flex;
    gap: 8px;
    font-size: 12px;
  }

  .chat-time {
    color: #555;
    white-space: nowrap;
  }

  .chat-text {
    color: #aaa;
  }
</style>

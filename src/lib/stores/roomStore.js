import { writable, derived } from 'svelte/store';

/**
 * @typedef {'lobby' | 'deploying' | 'playing' | 'paused' | 'finished'} RoomPhase
 */

/**
 * @typedef {'red' | 'blue' | 'none'} FactionChoice
 */

/**
 * @typedef {object} RoomPlayer
 * @property {string} id
 * @property {string} name
 * @property {FactionChoice} faction
 * @property {boolean} ready
 * @property {boolean} connected
 * @property {number} joinedAt
 * @property {number} [lastHeartbeat]
 * @property {boolean} isHost
 * @property {boolean} isLocal
 */

/**
 * @typedef {object} RoomSettings
 * @property {string} mapId
 * @property {number} turnTimeLimit
 * @property {boolean} fogOfWar
 * @property {number} maxTurns
 * @property {boolean} economyEnabled
 */

/**
 * @typedef {object} TurnAction
 * @property {string} type
 * @property {string} playerId
 * @property {'red' | 'blue'} faction
 * @property {number} turn
 * @property {number} timestamp
 * @property {Record<string, any>} payload
 */

/**
 * @typedef {object} DisconnectInfo
 * @property {string} playerId
 * @property {number} timestamp
 * @property {any} gameStateSnapshot
 * @property {number} turnAtDisconnect
 * @property {string} factionAtDisconnect
 */

/**
 * @typedef {object} ChatEntry
 * @property {string} text
 * @property {number} timestamp
 */

/**
 * @typedef {object} RoomState
 * @property {string | null} roomId
 * @property {string | null} roomCode
 * @property {string | null} hostId
 * @property {RoomPhase} phase
 * @property {RoomPlayer[]} players
 * @property {RoomSettings} settings
 * @property {TurnAction[]} pendingActions
 * @property {number} lastSyncTurn
 * @property {DisconnectInfo | null} disconnectInfo
 * @property {string | null} localPlayerId
 * @property {{turn: number, faction: string, timestamp: number} | null} turnLock
 * @property {ChatEntry[]} chatLog
 * @property {boolean} isReconnecting
 * @property {number | null} reconnectCountdown
 */

const DEFAULT_SETTINGS = /** @type {RoomSettings} */ ({
  mapId: 'standard',
  turnTimeLimit: 60,
  fogOfWar: true,
  maxTurns: 50,
  economyEnabled: true
});

/**
 * @returns {RoomState}
 */
function createInitialRoomState() {
  return {
    roomId: null,
    roomCode: null,
    hostId: null,
    phase: 'lobby',
    players: [],
    settings: { ...DEFAULT_SETTINGS },
    pendingActions: [],
    lastSyncTurn: 0,
    disconnectInfo: null,
    localPlayerId: null,
    turnLock: null,
    chatLog: [],
    isReconnecting: false,
    reconnectCountdown: null
  };
}

function createRoomStore() {
  const { subscribe, set, update } = writable(createInitialRoomState());

  function generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    subscribe,
    set,
    update,

    reset: () => set(createInitialRoomState()),

    createRoom: (/** @type {string} */ hostName, /** @type {Partial<RoomSettings>} */ settingsOverride) => update(state => {
      const roomId = generateRoomId();
      const roomCode = generateRoomCode();
      const playerId = generatePlayerId();

      /** @type {RoomPlayer} */
      const host = {
        id: playerId,
        name: hostName || '房主',
        faction: 'none',
        ready: false,
        connected: true,
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        isHost: true,
        isLocal: true
      };

      const settings = { ...DEFAULT_SETTINGS, ...settingsOverride };

      return {
        ...state,
        roomId,
        roomCode,
        hostId: playerId,
        localPlayerId: playerId,
        phase: 'lobby',
        players: [host],
        settings,
        pendingActions: [],
        chatLog: [{ text: `房间已创建，房间号: ${roomCode}`, timestamp: Date.now() }]
      };
    }),

    joinRoom: (/** @type {string} */ roomCode, /** @type {string} */ playerName) => update(state => {
      if (state.roomCode && state.roomCode !== roomCode) {
        return state;
      }

      const playerId = generatePlayerId();

      /** @type {RoomPlayer} */
      const guest = {
        id: playerId,
        name: playerName || '挑战者',
        faction: 'none',
        ready: false,
        connected: true,
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        isHost: false,
        isLocal: true
      };

      const existing = state.players.find(p => p.isLocal);
      if (existing) {
        return state;
      }

      return {
        ...state,
        localPlayerId: playerId,
        players: [...state.players, guest],
        chatLog: [...state.chatLog, { text: `${guest.name} 加入了房间`, timestamp: Date.now() }]
      };
    }),

    addRemotePlayer: (/** @type {RoomPlayer} */ player) => update(state => {
      if (state.players.length >= 2) return state;
      if (state.players.some(p => p.id === player.id)) return state;

      return {
        ...state,
        players: [...state.players, { ...player, isLocal: false }],
        chatLog: [...state.chatLog, { text: `${player.name} 加入了房间`, timestamp: Date.now() }]
      };
    }),

    removePlayer: (/** @type {string} */ playerId) => update(state => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;

      const remaining = state.players.filter(p => p.id !== playerId);
      const wasHost = player.isHost;

      let newHostId = state.hostId;
      if (wasHost && remaining.length > 0) {
        remaining[0].isHost = true;
        newHostId = remaining[0].id;
      }

      return {
        ...state,
        players: remaining,
        hostId: newHostId,
        chatLog: [...state.chatLog, { text: `${player.name} 离开了房间`, timestamp: Date.now() }]
      };
    }),

    selectFaction: (/** @type {string} */ playerId, /** @type {FactionChoice} */ faction) => update(state => {
      if (state.phase !== 'lobby' && state.phase !== 'deploying') return state;

      const conflict = state.players.find(p => p.id !== playerId && p.faction === faction && faction !== 'none');
      if (conflict) return state;

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, faction, ready: false } : p
        )
      };
    }),

    setReady: (/** @type {string} */ playerId, /** @type {boolean} */ ready) => update(state => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      if (player.faction === 'none') return state;

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId ? { ...p, ready } : p
        )
      };
    }),

    startDeployment: () => update(state => {
      if (state.players.length < 2) return state;
      if (!state.players.every(p => p.faction !== 'none')) return state;
      if (!state.players.every(p => p.ready)) return state;

      return {
        ...state,
        phase: 'deploying',
        chatLog: [...state.chatLog, { text: '双方准备就绪，布阵开始！', timestamp: Date.now() }]
      };
    }),

    startGame: () => update(state => {
      if (state.phase !== 'deploying') return state;

      return {
        ...state,
        phase: 'playing',
        turnLock: { turn: 1, faction: 'red', timestamp: Date.now() },
        chatLog: [...state.chatLog, { text: '游戏开始！', timestamp: Date.now() }]
      };
    }),

    lockTurn: (/** @type {number} */ turn, /** @type {'red' | 'blue'} */ faction) => update(state => ({
      ...state,
      turnLock: { turn, faction, timestamp: Date.now() }
    })),

    pushAction: (/** @type {TurnAction} */ action) => update(state => ({
      ...state,
      pendingActions: [...state.pendingActions, action]
    })),

    clearPendingActions: (/** @type {number} */ upToTurn) => update(state => ({
      ...state,
      pendingActions: state.pendingActions.filter(a => a.turn > upToTurn),
      lastSyncTurn: upToTurn
    })),

    updateSettings: (/** @type {Partial<RoomSettings>} */ changes) => update(state => {
      if (state.phase !== 'lobby') return state;

      const localPlayer = state.players.find(p => p.id === state.localPlayerId);
      if (!localPlayer?.isHost) return state;

      return {
        ...state,
        settings: { ...state.settings, ...changes }
      };
    }),

    playerDisconnected: (/** @type {string} */ playerId, /** @type {any} */ gameStateSnapshot) => update(state => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;

      /** @type {DisconnectInfo} */
      const disconnectInfo = {
        playerId,
        timestamp: Date.now(),
        gameStateSnapshot,
        turnAtDisconnect: state.turnLock?.turn || 0,
        factionAtDisconnect: player.faction === 'none' ? 'red' : /** @type {'red' | 'blue'} */ (player.faction)
      };

      return {
        ...state,
        phase: 'paused',
        players: state.players.map(p =>
          p.id === playerId ? { ...p, connected: false, ready: false } : p
        ),
        disconnectInfo,
        chatLog: [...state.chatLog, { text: `${player.name} 断开连接，游戏暂停`, timestamp: Date.now() }]
      };
    }),

    playerReconnected: (/** @type {string} */ playerId) => update(state => {
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;

      return {
        ...state,
        phase: 'playing',
        players: state.players.map(p =>
          p.id === playerId ? { ...p, connected: true, lastHeartbeat: Date.now() } : p
        ),
        disconnectInfo: null,
        isReconnecting: false,
        reconnectCountdown: null,
        chatLog: [...state.chatLog, { text: `${player.name} 重新连接`, timestamp: Date.now() }]
      };
    }),

    startReconnectCountdown: (/** @type {number} */ seconds) => update(state => ({
      ...state,
      isReconnecting: true,
      reconnectCountdown: seconds
    })),

    tickReconnectCountdown: () => update(state => {
      if (!state.isReconnecting || state.reconnectCountdown === null) return state;

      const newCountdown = state.reconnectCountdown - 1;
      if (newCountdown <= 0) {
        return {
          ...state,
          isReconnecting: false,
          reconnectCountdown: null,
          phase: 'finished',
          chatLog: [...state.chatLog, { text: '断线玩家未能重连，游戏结束', timestamp: Date.now() }]
        };
      }

      return {
        ...state,
        reconnectCountdown: newCountdown
      };
    }),

    cancelReconnect: () => update(state => ({
      ...state,
      isReconnecting: false,
      reconnectCountdown: null,
      phase: 'finished'
    })),

    heartbeat: (/** @type {string} */ playerId) => update(state => ({
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, lastHeartbeat: Date.now() } : p
      )
    })),

    addChatMessage: (/** @type {string} */ text) => update(state => ({
      ...state,
      chatLog: [...state.chatLog, { text, timestamp: Date.now() }]
    })),

    setPhase: (/** @type {RoomPhase} */ phase) => update(state => ({
      ...state,
      phase
    })),

    finishGame: (/** @type {string} */ winner) => update(state => ({
      ...state,
      phase: 'finished',
      chatLog: [...state.chatLog, { text: `游戏结束！${winner === 'red' ? '红方' : '蓝方'}胜利`, timestamp: Date.now() }]
    })),

    autoAssignFactions: () => update(state => {
      if (state.players.length < 2) return state;

      const [p1, p2] = state.players;
      if (p1.faction !== 'none' || p2.faction !== 'none') return state;

      const rng = Math.random() < 0.5;

      return {
        ...state,
        players: state.players.map((p, i) => ({
          ...p,
          faction: i === 0 ? (rng ? 'red' : 'blue') : (rng ? 'blue' : 'red')
        }))
      };
    }),

    loadRoomState: (/** @type {any} */ remoteState, /** @type {string} */ localPlayerId) => update(state => {
      const players = remoteState.players.map(/** @param {any} p */ (p) => ({
        ...p,
        isLocal: p.id === localPlayerId
      }));

      return {
        ...state,
        roomId: remoteState.roomId,
        roomCode: remoteState.roomCode,
        hostId: remoteState.hostId,
        phase: remoteState.phase || 'lobby',
        players,
        settings: { ...state.settings, ...remoteState.settings },
        turnLock: remoteState.turnLock || null,
        lastSyncTurn: remoteState.lastSyncTurn || 0,
        disconnectInfo: remoteState.disconnectInfo || null,
        localPlayerId,
        chatLog: [...state.chatLog, { text: '已同步房间状态', timestamp: Date.now() }]
      };
    }),

    promoteToHost: (/** @type {string} */ playerId) => update(state => {
      return {
        ...state,
        hostId: playerId,
        players: state.players.map(p => ({
          ...p,
          isHost: p.id === playerId
        }))
      };
    })
  };
}

export const roomStore = createRoomStore();

export const localPlayer = derived(roomStore, ($state) => {
  return $state.players.find(p => p.id === $state.localPlayerId) || null;
});

export const opponentPlayer = derived(roomStore, ($state) => {
  return $state.players.find(p => p.id !== $state.localPlayerId) || null;
});

export const allReady = derived(roomStore, ($state) => {
  return $state.players.length === 2 && $state.players.every(p => p.faction !== 'none' && p.ready);
});

export const canStartGame = derived(roomStore, ($state) => {
  if ($state.players.length < 2) return false;
  if ($state.players.some(p => p.faction === 'none')) return false;
  if (!$state.players.every(p => p.ready)) return false;
  return true;
});

export const isInRoom = derived(roomStore, ($state) => {
  return $state.roomId !== null;
});

export const isPlaying = derived(roomStore, ($state) => {
  return $state.phase === 'deploying' || $state.phase === 'playing' || $state.phase === 'paused';
});

export const reconnectProgress = derived(roomStore, ($state) => {
  if (!$state.isReconnecting || $state.reconnectCountdown === null) return null;
  const total = 30;
  const remaining = $state.reconnectCountdown;
  return {
    remaining,
    total,
    percent: ((total - remaining) / total) * 100
  };
});

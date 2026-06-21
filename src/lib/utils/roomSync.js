import { roomStore } from '$lib/stores/roomStore';
import { gameState } from '$lib/stores/gameStore';
import { get } from 'svelte/store';
import {
  createBroadcastTransport,
  createMessage,
  MSG,
  isLocalPlayer,
  getCurrentPlayerId
} from '$lib/utils/roomTransport';

/** @type {import('$lib/utils/roomTransport').BroadcastTransport | null} */
let transport = null;

/** @type {ReturnType<typeof setInterval> | null} */
let reconnectInterval = null;

export const SYNC_MODES = {
  LOCKSTEP: 'lockstep',
  STATE_SYNC: 'state_sync',
  HYBRID: 'hybrid'
};

let isHost = false;

export function isRoomHost() {
  return isHost;
}

/**
 * @param {string} hostName
 * @param {Record<string, any>} [settingsOverride]
 */
export function createRoom(hostName, settingsOverride) {
  if (transport) {
    transport.disconnect();
  }

  const result = roomStore.createRoom(hostName, settingsOverride || {});
  const state = get(roomStore);

  transport = createBroadcastTransport(state.roomCode || '', state.localPlayerId || '');
  transport.onMessage(handleIncomingMessage);

  isHost = true;

  return state;
}

/**
 * @param {string} roomCode
 * @param {string} playerName
 * @returns {Promise<boolean>}
 */
export function joinRoom(roomCode, playerName) {
  return new Promise((resolve, reject) => {
    if (transport) {
      transport.disconnect();
    }

    const tempPlayerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    transport = createBroadcastTransport(roomCode, tempPlayerId);

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (transport) transport.disconnect();
        transport = null;
        reject(new Error('加入房间超时，请检查房间号是否正确'));
      }
    }, 5000);

    transport.onMessage((msg) => {
      if (resolved) return;

      if (msg.type === MSG.JOIN_ACCEPT && msg.targetId === tempPlayerId) {
        resolved = true;
        clearTimeout(timeout);
        isHost = false;

        const { roomState, gameState: gameStateData } = msg.payload;
        roomStore.loadRoomState(roomState, tempPlayerId);

        if (gameStateData) {
          gameState.loadFromSave(gameStateData);
        }

        resolve(true);
      }

      if (msg.type === MSG.JOIN_REJECT && msg.targetId === tempPlayerId) {
        resolved = true;
        clearTimeout(timeout);
        if (transport) transport.disconnect();
        transport = null;
        reject(new Error(msg.payload.reason || '加入房间被拒绝'));
      }
    });

    const joinMsg = createMessage(MSG.JOIN_REQUEST, {
      playerId: tempPlayerId,
      playerName: playerName || '挑战者'
    });
    if (transport) {
      transport.send(joinMsg);
    }
  });
}

export function leaveRoom() {
  if (transport) {
    const state = get(roomStore);
    if (state.roomId && state.localPlayerId) {
      const leaveMsg = createMessage(MSG.PLAYER_LEFT, {
        playerId: state.localPlayerId
      });
      transport.send(leaveMsg);
    }
    transport.disconnect();
    transport = null;
  }
  stopReconnectTimer();
  roomStore.reset();
  isHost = false;
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleIncomingMessage(msg) {
  const state = get(roomStore);

  switch (msg.type) {
    case MSG.JOIN_REQUEST:
      if (isHost) {
        handleJoinRequest(msg);
      }
      break;

    case MSG.PLAYER_LEFT:
      handlePlayerLeft(msg);
      break;

    case MSG.ROOM_STATE:
      if (!isHost) {
        roomStore.loadRoomState(msg.payload.roomState, getCurrentPlayerId() || '');
      }
      break;

    case MSG.FACTION_SELECT:
      roomStore.selectFaction(msg.senderId, msg.payload.faction);
      if (isHost) {
        broadcastRoomState();
      }
      break;

    case MSG.READY_TOGGLE:
      roomStore.setReady(msg.senderId, msg.payload.ready);
      if (isHost) {
        broadcastRoomState();
      }
      break;

    case MSG.GAME_START:
      if (!isHost) {
        roomStore.startDeployment();
      }
      break;

    case MSG.GAME_PLAYING:
      if (!isHost) {
        if (msg.payload.gameState) {
          gameState.loadFromSave(msg.payload.gameState);
        }
        roomStore.startGame();
      }
      break;

    case MSG.TURN_ACTION:
      handleRemoteAction(msg);
      break;

    case MSG.TURN_END:
      handleRemoteTurnEnd(msg);
      break;

    case MSG.HEARTBEAT:
      roomStore.heartbeat(msg.senderId);
      break;

    case MSG.DISCONNECT:
      handleRemoteDisconnect(msg);
      break;

    case MSG.RECONNECT_REQUEST:
      if (isHost) {
        handleReconnectRequest(msg);
      }
      break;

    case MSG.RECONNECT_STATE:
      if (!isHost || msg.targetId === getCurrentPlayerId()) {
        handleReconnectState(msg);
      }
      break;

    case MSG.CHAT_MESSAGE:
      roomStore.addChatMessage(msg.payload.text);
      break;
  }
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleJoinRequest(msg) {
  const state = get(roomStore);

  if (state.players.length >= 2) {
    const rejectMsg = createMessage(MSG.JOIN_REJECT, {
      reason: '房间已满'
    }, msg.senderId);
    if (transport) transport.send(rejectMsg);
    return;
  }

  if (state.players.some(p => p.id === msg.payload.playerId)) {
    const rejectMsg = createMessage(MSG.JOIN_REJECT, {
      reason: '玩家已在房间中'
    }, msg.senderId);
    if (transport) transport.send(rejectMsg);
    return;
  }

  roomStore.addRemotePlayer({
    id: msg.payload.playerId,
    name: msg.payload.playerName,
    faction: 'none',
    ready: false,
    connected: true,
    joinedAt: Date.now(),
    lastHeartbeat: Date.now(),
    isHost: false,
    isLocal: false
  });

  const newState = get(roomStore);

  const acceptMsg = createMessage(MSG.JOIN_ACCEPT, {
    roomState: serializeRoomState(newState),
    gameState: null
  }, msg.senderId);
  if (transport) transport.send(acceptMsg);

  broadcastRoomState();
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handlePlayerLeft(msg) {
  roomStore.removePlayer(msg.payload.playerId);

  const state = get(roomStore);
  const localPlayer = state.players.find(p => p.isLocal);

  if (isHost) {
    broadcastRoomState();
  }

  if (localPlayer?.isHost === false && state.players.length === 1 && state.players[0].isLocal) {
    isHost = true;
    roomStore.promoteToHost(state.localPlayerId || '');
  }
}

/**
 * @param {import('$lib/stores/roomStore').RoomState} state
 */
function serializeRoomState(state) {
  return {
    roomId: state.roomId,
    roomCode: state.roomCode,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      faction: p.faction,
      ready: p.ready,
      connected: p.connected,
      joinedAt: p.joinedAt,
      lastHeartbeat: p.lastHeartbeat,
      isHost: p.isHost,
      isLocal: false
    })),
    settings: { ...state.settings },
    turnLock: state.turnLock,
    lastSyncTurn: state.lastSyncTurn,
    disconnectInfo: state.disconnectInfo
  };
}

function broadcastRoomState() {
  if (!transport || !isHost) return;

  const state = get(roomStore);
  const msg = createMessage(MSG.ROOM_STATE, {
    roomState: serializeRoomState(state)
  });
  transport.send(msg);
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleRemoteAction(msg) {
  const { action } = msg.payload;
  roomStore.pushAction(action);
  applyActionToGameState(action);
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleRemoteTurnEnd(msg) {
  const { turn, faction } = msg.payload;
  roomStore.clearPendingActions(turn);
  roomStore.lockTurn(turn + 1, faction === 'red' ? 'blue' : 'red');
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleRemoteDisconnect(msg) {
  const currentState = get(gameState);
  roomStore.playerDisconnected(msg.payload.playerId, currentState);
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleReconnectRequest(msg) {
  const state = get(roomStore);
  const currentGameState = get(gameState);

  const reconnectMsg = createMessage(MSG.RECONNECT_STATE, {
    gameState: currentGameState,
    roomState: serializeRoomState(state),
    turn: state.turnLock?.turn || 0,
    faction: state.turnLock?.faction || 'red'
  }, msg.senderId);

  if (transport) transport.send(reconnectMsg);
}

/**
 * @param {import('$lib/utils/roomTransport').RoomMessage} msg
 */
function handleReconnectState(msg) {
  const { gameState: remoteState, roomState, turn, faction } = msg.payload;

  if (roomState) {
    roomStore.loadRoomState(roomState, getCurrentPlayerId() || '');
  }

  if (remoteState) {
    gameState.loadFromSave(remoteState);
  }

  roomStore.playerReconnected(getCurrentPlayerId() || '');
  roomStore.lockTurn(turn, /** @type {'red' | 'blue'} */ (faction));
}

/**
 * @param {Record<string, any>} action
 */
function applyActionToGameState(action) {
  const { type, payload } = action;

  switch (type) {
    case 'move':
      gameState.moveUnit(payload.unitId, payload.x, payload.y, payload.path);
      break;
    case 'attack':
      gameState.attack(payload.attackerId, payload.defenderId, payload.damage);
      break;
    case 'card':
      if (payload.cardAction === 'select') {
        gameState.selectCard(payload.cardId);
      }
      break;
    case 'endTurn':
      gameState.endTurn();
      break;
    case 'deploymentMove':
      gameState.deploymentMoveUnit(payload.unitId, payload.x, payload.y);
      break;
    case 'deploymentReady':
      gameState.deploymentReady(payload.faction);
      break;
    case 'deploymentMulligan':
      gameState.deploymentMulligan(payload.faction, payload.cardIndex);
      break;
  }
}

export function broadcastFactionSelection(/** @type {'red' | 'blue' | 'none'} */ faction) {
  const state = get(roomStore);
  roomStore.selectFaction(state.localPlayerId || '', faction);

  if (transport) {
    const msg = createMessage(MSG.FACTION_SELECT, { faction });
    transport.send(msg);
  }

  if (isHost) {
    broadcastRoomState();
  }
}

export function broadcastReady(/** @type {boolean} */ ready) {
  const state = get(roomStore);
  roomStore.setReady(state.localPlayerId || '', ready);

  if (transport) {
    const msg = createMessage(MSG.READY_TOGGLE, { ready });
    transport.send(msg);
  }

  if (isHost) {
    broadcastRoomState();
  }
}

export function broadcastSettings(/** @type {Record<string, any>} */ settings) {
  roomStore.updateSettings(settings);
  if (isHost) {
    broadcastRoomState();
  }
}

export function broadcastGameStart() {
  if (isHost) {
    gameState.reset();
    roomStore.startDeployment();

    if (transport) {
      const msg = createMessage(MSG.GAME_START, {});
      transport.send(msg);
    }

    setTimeout(() => {
      const initialState = get(gameState);
      roomStore.startGame();
      roomStore.lockTurn(1, 'red');

      if (transport) {
        const msg = createMessage(MSG.GAME_PLAYING, {
          gameState: initialState
        });
        transport.send(msg);
      }
    }, 300);
  }
}

export function broadcastAction(/** @type {string} */ actionType, /** @type {Record<string, any>} */ payload) {
  const state = get(roomStore);
  const gameCurrentState = get(gameState);

  const action = {
    type: actionType,
    playerId: state.localPlayerId || '',
    faction: /** @type {'red' | 'blue'} */ (gameCurrentState.currentFaction),
    turn: gameCurrentState.turn,
    timestamp: Date.now(),
    payload
  };

  roomStore.pushAction(action);
  applyActionToGameState(action);

  if (transport) {
    const msg = createMessage(MSG.TURN_ACTION, { action });
    transport.send(msg);
  }
}

export function broadcastTurnEnd(/** @type {number} */ turn, /** @type {'red' | 'blue'} */ faction) {
  roomStore.clearPendingActions(turn);

  if (transport) {
    const msg = createMessage(MSG.TURN_END, { turn, faction });
    transport.send(msg);
  }
}

export function broadcastDisconnect() {
  const state = get(roomStore);
  if (transport) {
    const msg = createMessage(MSG.DISCONNECT, {
      playerId: state.localPlayerId
    });
    transport.send(msg);
  }
}

export function requestReconnect() {
  const state = get(roomStore);
  roomStore.startReconnectCountdown(30);

  if (transport) {
    const msg = createMessage(MSG.RECONNECT_REQUEST, {
      playerId: state.localPlayerId,
      roomCode: state.roomCode
    });
    transport.send(msg);
  }
}

export function broadcastChatMessage(/** @type {string} */ text) {
  roomStore.addChatMessage(text);
  if (transport) {
    const msg = createMessage(MSG.CHAT_MESSAGE, { text });
    transport.send(msg);
  }
}

export function startHeartbeat() {
}

export function stopHeartbeat() {
}

export function startReconnectTimer() {
  stopReconnectTimer();
  reconnectInterval = setInterval(() => {
    roomStore.tickReconnectCountdown();
    const state = get(roomStore);
    if (!state.isReconnecting) {
      stopReconnectTimer();
    }
  }, 1000);
}

export function stopReconnectTimer() {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
}

export function createSyncCheckpoint() {
  const state = get(roomStore);
  const actions = [...state.pendingActions];
  const hash = computeStateHash();
  return { actions, hash };
}

function computeStateHash() {
  const state = get(gameState);
  const relevant = {
    turn: state.turn,
    faction: state.currentFaction,
    unitCount: state.units.length,
    unitHash: state.units.map(u => `${u.id}:${u.x},${u.y}:${u.currentHp}`).join('|'),
    phase: state.gamePhase
  };
  return btoa(JSON.stringify(relevant)).slice(0, 32);
}

/**
 * @param {any} gameStateSnapshot
 */
export function restoreFromSnapshot(gameStateSnapshot) {
  if (!gameStateSnapshot) return false;
  try {
    gameState.loadFromSave(gameStateSnapshot);
    return true;
  } catch (e) {
    return false;
  }
}

export function initLocalSimTransport() {
}

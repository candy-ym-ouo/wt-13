import { roomStore } from '$lib/stores/roomStore';
import { gameState } from '$lib/stores/gameStore';
import { get } from 'svelte/store';

/**
 * @typedef {object} RoomMessage
 * @property {string} type
 * @property {string} roomId
 * @property {string} senderId
 * @property {number} timestamp
 * @property {number} seq
 * @property {Record<string, any>} payload
 */

/** @type {{ send: (msg: RoomMessage) => void, onMessage: (handler: (msg: RoomMessage) => void) => void, connect: (roomId: string, playerId: string) => Promise<void>, disconnect: () => void } | null} */
let transport = null;

/** @type {ReturnType<typeof setInterval> | null} */
let heartbeatInterval = null;

/** @type {ReturnType<typeof setInterval> | null} */
let reconnectInterval = null;

let pendingAcks = new Map();

let messageSeq = 0;

export const ROOM_EVENTS = {
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_LEFT: 'room:left',
  ROOM_DISBANDED: 'room:disbanded',
  FACTION_SELECTED: 'room:faction_selected',
  READY_CHANGED: 'room:ready_changed',
  SETTINGS_UPDATED: 'room:settings_updated',
  GAME_START: 'game:start',
  TURN_ACTION: 'game:turn_action',
  TURN_END: 'game:turn_end',
  STATE_SYNC: 'game:state_sync',
  HEARTBEAT: 'system:heartbeat',
  DISCONNECT: 'system:disconnect',
  RECONNECT_REQUEST: 'system:reconnect_request',
  RECONNECT_ACCEPT: 'system:reconnect_accept',
  CHAT_MESSAGE: 'chat:message'
};

export const SYNC_MODES = {
  LOCKSTEP: 'lockstep',
  STATE_SYNC: 'state_sync',
  HYBRID: 'hybrid'
};

/**
 * @typedef {object} ActionCheckpoint
 * @property {number} turn
 * @property {'red' | 'blue'} faction
 * @property {number} seq
 * @property {number} timestamp
 * @property {any} stateHash
 */

/**
 * @param {{ send: (msg: RoomMessage) => void, onMessage: (handler: (msg: RoomMessage) => void) => void, connect: (roomId: string, playerId: string) => Promise<void>, disconnect: () => void }} transportImpl
 */
export function setTransport(transportImpl) {
  transport = transportImpl;
  transport.onMessage(handleIncomingMessage);
}

/**
 * @param {string} type
 * @param {Record<string, any>} payload
 * @returns {RoomMessage}
 */
function createMessage(type, payload) {
  const state = get(roomStore);
  return {
    type,
    roomId: state.roomId || '',
    senderId: state.localPlayerId || '',
    timestamp: Date.now(),
    seq: ++messageSeq,
    payload
  };
}

/**
 * @param {RoomMessage} msg
 */
function sendMessage(msg) {
  if (!transport) return;
  transport.send(msg);
}

/**
 * @param {RoomMessage} msg
 */
function handleIncomingMessage(msg) {
  const state = get(roomStore);
  if (msg.roomId !== state.roomId) return;

  switch (msg.type) {
    case ROOM_EVENTS.ROOM_JOINED:
      handleRemoteJoin(msg);
      break;
    case ROOM_EVENTS.ROOM_LEFT:
      handleRemoteLeave(msg);
      break;
    case ROOM_EVENTS.FACTION_SELECTED:
      roomStore.selectFaction(msg.senderId, msg.payload.faction);
      break;
    case ROOM_EVENTS.READY_CHANGED:
      roomStore.setReady(msg.senderId, msg.payload.ready);
      break;
    case ROOM_EVENTS.SETTINGS_UPDATED:
      if (state.phase === 'lobby') {
        roomStore.updateSettings(msg.payload.settings);
      }
      break;
    case ROOM_EVENTS.GAME_START:
      roomStore.startDeployment();
      break;
    case ROOM_EVENTS.TURN_ACTION:
      handleRemoteAction(msg);
      break;
    case ROOM_EVENTS.TURN_END:
      handleRemoteTurnEnd(msg);
      break;
    case ROOM_EVENTS.STATE_SYNC:
      handleStateSync(msg);
      break;
    case ROOM_EVENTS.HEARTBEAT:
      roomStore.heartbeat(msg.senderId);
      break;
    case ROOM_EVENTS.DISCONNECT:
      handleRemoteDisconnect(msg);
      break;
    case ROOM_EVENTS.RECONNECT_REQUEST:
      handleReconnectRequest(msg);
      break;
    case ROOM_EVENTS.RECONNECT_ACCEPT:
      handleReconnectAccept(msg);
      break;
    case ROOM_EVENTS.CHAT_MESSAGE:
      roomStore.addChatMessage(msg.payload.text);
      break;
  }
}

/**
 * @param {RoomMessage} msg
 */
function handleRemoteJoin(msg) {
  const state = get(roomStore);
  if (state.players.length >= 2) return;

  roomStore.addRemotePlayer({
    id: msg.senderId,
    name: msg.payload.name,
    faction: 'none',
    ready: false,
    connected: true,
    joinedAt: Date.now(),
    lastHeartbeat: Date.now(),
    isHost: false,
    isLocal: false
  });
}

/**
 * @param {RoomMessage} msg
 */
function handleRemoteLeave(msg) {
  roomStore.removePlayer(msg.senderId);
}

/**
 * @param {RoomMessage} msg
 */
function handleRemoteAction(msg) {
  const { action } = msg.payload;
  roomStore.pushAction(action);
  applyActionToGameState(action);
}

/**
 * @param {RoomMessage} msg
 */
function handleRemoteTurnEnd(msg) {
  const { turn, faction } = msg.payload;
  roomStore.clearPendingActions(turn);
}

/**
 * @param {RoomMessage} msg
 */
function handleStateSync(msg) {
  const { fullState } = msg.payload;
  if (fullState) {
    gameState.loadFromSave(fullState);
  }
}

/**
 * @param {RoomMessage} msg
 */
function handleRemoteDisconnect(msg) {
  const state = get(roomStore);
  const currentState = get(gameState);
  roomStore.playerDisconnected(msg.senderId, currentState);
}

/**
 * @param {RoomMessage} msg
 */
function handleReconnectRequest(msg) {
  const state = get(roomStore);
  const currentGameState = get(gameState);
  const reconnectMsg = createMessage(ROOM_EVENTS.RECONNECT_ACCEPT, {
    gameState: currentGameState,
    turn: state.turnLock?.turn || 0,
    faction: state.turnLock?.faction || 'red',
    players: state.players
  });
  sendMessage(reconnectMsg);
}

/**
 * @param {RoomMessage} msg
 */
function handleReconnectAccept(msg) {
  const { gameState: remoteState, turn, faction } = msg.payload;
  gameState.loadFromSave(remoteState);
  roomStore.playerReconnected(get(roomStore).localPlayerId || '');
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
  sendMessage(createMessage(ROOM_EVENTS.FACTION_SELECTED, { faction }));
}

export function broadcastReady(/** @type {boolean} */ ready) {
  const state = get(roomStore);
  roomStore.setReady(state.localPlayerId || '', ready);
  sendMessage(createMessage(ROOM_EVENTS.READY_CHANGED, { ready }));
}

export function broadcastSettings(/** @type {Record<string, any>} */ settings) {
  roomStore.updateSettings(settings);
  sendMessage(createMessage(ROOM_EVENTS.SETTINGS_UPDATED, { settings }));
}

export function broadcastGameStart() {
  roomStore.startDeployment();
  sendMessage(createMessage(ROOM_EVENTS.GAME_START, {}));
}

export function broadcastAction(/** @type {string} */ actionType, /** @type {Record<string, any>} */ payload) {
  const state = get(roomStore);
  const gameCurrentState = get(gameState);

  /** @type {import('$lib/stores/roomStore').TurnAction} */
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
  sendMessage(createMessage(ROOM_EVENTS.TURN_ACTION, { action }));
}

export function broadcastTurnEnd(/** @type {number} */ turn, /** @type {'red' | 'blue'} */ faction) {
  roomStore.clearPendingActions(turn);
  sendMessage(createMessage(ROOM_EVENTS.TURN_END, { turn, faction }));
}

export function broadcastDisconnect() {
  const state = get(roomStore);
  sendMessage(createMessage(ROOM_EVENTS.DISCONNECT, { playerId: state.localPlayerId }));
}

export function requestReconnect() {
  const state = get(roomStore);
  roomStore.startReconnectCountdown(30);
  sendMessage(createMessage(ROOM_EVENTS.RECONNECT_REQUEST, {
    playerId: state.localPlayerId,
    roomId: state.roomId
  }));
}

export function broadcastChatMessage(/** @type {string} */ text) {
  roomStore.addChatMessage(text);
  sendMessage(createMessage(ROOM_EVENTS.CHAT_MESSAGE, { text }));
}

export function startHeartbeat(/** @type {number} */ intervalMs = 5000) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    const state = get(roomStore);
    if (state.localPlayerId) {
      roomStore.heartbeat(state.localPlayerId);
      sendMessage(createMessage(ROOM_EVENTS.HEARTBEAT, {}));
    }
  }, intervalMs);
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
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

/**
 * @returns {{ actions: any[], hash: string }}
 */
export function createSyncCheckpoint() {
  const state = get(roomStore);
  const actions = [...state.pendingActions];
  const hash = computeStateHash();
  return { actions, hash };
}

/**
 * @returns {string}
 */
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
  /** @type {((msg: RoomMessage) => void) | null} */
  let messageHandler = null;

  const localSim = {
    send: (/** @type {RoomMessage} */ msg) => {
      if (messageHandler) {
        const handler = messageHandler;
        setTimeout(() => handler(msg), 0);
      }
    },
    onMessage: (/** @type {(msg: RoomMessage) => void} */ handler) => {
      messageHandler = handler;
    },
    connect: async (/** @type {string} */ _roomId, /** @type {string} */ _playerId) => {},
    disconnect: () => {}
  };

  setTransport(localSim);
  return localSim;
}

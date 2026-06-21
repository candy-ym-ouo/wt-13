import { get } from 'svelte/store';
import { roomStore } from '$lib/stores/roomStore';
import { gameState } from '$lib/stores/gameStore';

/**
 * @typedef {object} RoomMessage
 * @property {string} type
 * @property {string} roomCode
 * @property {string} senderId
 * @property {number} timestamp
 * @property {number} seq
 * @property {Record<string, any>} payload
 * @property {string} [targetId]
 */

/**
 * @typedef {object} BroadcastTransport
 * @property {(msg: RoomMessage) => void} send
 * @property {(handler: (msg: RoomMessage) => void) => void} onMessage
 * @property {(roomCode: string, playerId: string) => Promise<void>} connect
 * @property {() => void} disconnect
 * @property {() => boolean} isConnected
 */

export const MSG = {
  JOIN_REQUEST: 'join:request',
  JOIN_ACCEPT: 'join:accept',
  JOIN_REJECT: 'join:reject',
  ROOM_STATE: 'room:state',
  PLAYER_LEFT: 'player:left',
  FACTION_SELECT: 'faction:select',
  READY_TOGGLE: 'ready:toggle',
  GAME_START: 'game:start',
  GAME_PLAYING: 'game:playing',
  TURN_ACTION: 'turn:action',
  TURN_END: 'turn:end',
  HEARTBEAT: 'heartbeat',
  DISCONNECT: 'disconnect',
  RECONNECT_REQUEST: 'reconnect:request',
  RECONNECT_STATE: 'reconnect:state',
  CHAT_MESSAGE: 'chat:message'
};

/** @type {BroadcastChannel | null} */
let channel = null;

/** @type {((msg: RoomMessage) => void) | null} */
let messageHandler = null;

/** @type {string | null} */
let currentRoomCode = null;

/** @type {string | null} */
let currentPlayerId = null;

let messageSeq = 0;

/** @type {ReturnType<typeof setInterval> | null} */
let heartbeatInterval = null;

/** @type {ReturnType<typeof setInterval> | null} */
let disconnectCheckInterval = null;

const HEARTBEAT_INTERVAL = 3000;
const DISCONNECT_TIMEOUT = 10000;

/**
 * @param {string} roomCode
 * @param {string} playerId
 * @returns {BroadcastTransport}
 */
export function createBroadcastTransport(roomCode, playerId) {
  disconnect();

  currentRoomCode = roomCode;
  currentPlayerId = playerId;

  const channelName = `wt13_room_${roomCode}`;
  channel = new BroadcastChannel(channelName);

  channel.onmessage = (event) => {
    /** @type {RoomMessage} */
    const msg = event.data;
    if (!msg || !msg.type) return;
    if (msg.senderId === currentPlayerId) return;

    if (messageHandler) {
      messageHandler(msg);
    }
  };

  startHeartbeatLoop();
  startDisconnectCheck();

  return {
    send: sendMessage,
    onMessage: (handler) => {
      messageHandler = handler;
    },
    connect: async (roomCode, playerId) => {
      currentRoomCode = roomCode;
      currentPlayerId = playerId;
    },
    disconnect,
    isConnected: () => channel !== null
  };
}

function disconnect() {
  stopHeartbeatLoop();
  stopDisconnectCheck();

  if (channel) {
    try {
      channel.close();
    } catch (e) {}
    channel = null;
  }

  currentRoomCode = null;
  currentPlayerId = null;
  messageHandler = null;
}

/**
 * @param {RoomMessage} msg
 */
function sendMessage(msg) {
  if (!channel || !currentRoomCode) return;
  try {
    channel.postMessage(msg);
  } catch (e) {
    console.error('Failed to send message:', e);
  }
}

/**
 * @param {string} type
 * @param {Record<string, any>} payload
 * @param {string} [targetId]
 * @returns {RoomMessage}
 */
export function createMessage(type, payload, targetId) {
  return {
    type,
    roomCode: currentRoomCode || '',
    senderId: currentPlayerId || '',
    timestamp: Date.now(),
    seq: ++messageSeq,
    payload,
    targetId
  };
}

function startHeartbeatLoop() {
  stopHeartbeatLoop();
  heartbeatInterval = setInterval(() => {
    if (!currentPlayerId) return;
    const msg = createMessage(MSG.HEARTBEAT, {
      playerId: currentPlayerId,
      timestamp: Date.now()
    });
    sendMessage(msg);
    roomStore.heartbeat(currentPlayerId);
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeatLoop() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function startDisconnectCheck() {
  stopDisconnectCheck();
  disconnectCheckInterval = setInterval(() => {
    const state = get(roomStore);
    const now = Date.now();

    for (const player of state.players) {
      if (player.isLocal) continue;
      if (!player.connected) continue;

      const lastBeat = player.lastHeartbeat || player.joinedAt;
      if (now - lastBeat > DISCONNECT_TIMEOUT) {
        roomStore.playerDisconnected(player.id, get(gameState));
      }
    }
  }, 2000);
}

function stopDisconnectCheck() {
  if (disconnectCheckInterval) {
    clearInterval(disconnectCheckInterval);
    disconnectCheckInterval = null;
  }
}

/**
 * @param {string} playerId
 */
export function isLocalPlayer(playerId) {
  return playerId === currentPlayerId;
}

export function getCurrentPlayerId() {
  return currentPlayerId;
}

export function getCurrentRoomCode() {
  return currentRoomCode;
}

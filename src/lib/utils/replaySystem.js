import { saveReplay, getReplays, getReplayById, deleteReplay, clearReplays } from './storage';

/**
 * @typedef {import('./storage').ReplayFrame} ReplayFrame
 * @typedef {import('./storage').ReplayData} ReplayData
 * @typedef {import('../stores/gameStore').GameState} GameState
 * @typedef {import('../stores/gameStore').ActionLog} ActionLog
 */

/**
 * @typedef {'move' | 'attack' | 'card' | 'turn' | 'victory' | 'deployment' | 'summon'} ReplayFrameType
 */

const KEYFRAME_EVERY_N_FRAMES = 5;

/**
 * 创建一个新的录像记录器
 * @returns {{
 *   frames: ReplayFrame[],
 *   frameIndex: number,
 *   initialState: GameState | null,
 *   isRecording: boolean,
 *   startRecording: (initialState: GameState) => void,
 *   recordFrame: (type: ReplayFrameType, description: string, state: GameState, actionDetails?: object) => void,
 *   stopRecording: (finalState: GameState) => ReplayData | null,
 *   reset: () => void
 * }}
 */
export function createReplayRecorder() {
  /** @type {ReplayFrame[]} */
  let frames = [];
  let frameIndex = 0;
  /** @type {GameState | null} */
  let initialState = null;
  let isRecording = false;

  /**
   * @param {GameState} state
   * @returns {object}
   */
  function createStateSnapshot(state) {
    if (!state) return {};
    
    return JSON.parse(JSON.stringify(state));
  }

  return {
    get frames() { return frames; },
    get frameIndex() { return frameIndex; },
    get initialState() { return initialState; },
    get isRecording() { return isRecording; },

    /**
     * @param {GameState} state
     */
    startRecording(state) {
      frames = [];
      frameIndex = 0;
      initialState = state ? JSON.parse(JSON.stringify(state)) : null;
      isRecording = true;

      if (initialState) {
        frames.push({
          index: 0,
          turn: initialState.turn || 1,
          faction: initialState.currentFaction || 'red',
          type: 'deployment',
          description: '游戏开始',
          stateSnapshot: createStateSnapshot(initialState),
          timestamp: Date.now()
        });
        frameIndex = 1;
      }
    },

    /**
     * @param {ReplayFrameType} type
     * @param {string} description
     * @param {GameState} state
     * @param {object} [actionDetails]
     */
    recordFrame(type, description, state, actionDetails) {
      if (!isRecording) return;

      const snapshot = createStateSnapshot(state);

      /** @type {ReplayFrame} */
      const frame = {
        index: frameIndex,
        turn: state?.turn || 1,
        faction: state?.currentFaction || 'red',
        type,
        description,
        stateSnapshot: snapshot,
        timestamp: Date.now()
      };

      if (actionDetails) {
        frame.actionDetails = JSON.parse(JSON.stringify(actionDetails));
      }

      frames.push(frame);
      frameIndex++;
    },

    /**
     * @param {GameState} finalState
     * @returns {ReplayData | null}
     */
    stopRecording(finalState) {
      if (!isRecording || frames.length === 0) {
        isRecording = false;
        return null;
      }

      isRecording = false;

      /** @type {ReplayData} */
      const replayData = {
        id: Date.now(),
        date: new Date().toISOString(),
        winner: finalState?.winner || '',
        victoryCondition: finalState?.victoryCondition || '',
        totalTurns: finalState?.turn || 1,
        frames,
        initialState: initialState || {},
        finalState: finalState ? JSON.parse(JSON.stringify(finalState)) : {},
        killCounts: { ...(finalState?.killCounts || { red: 0, blue: 0 }) },
        totalDamage: { ...(finalState?.turnDamageDealt || { red: 0, blue: 0 }) }
      };

      return replayData;
    },

    reset() {
      frames = [];
      frameIndex = 0;
      initialState = null;
      isRecording = false;
    }
  };
}

/**
 * @param {ReplayData} replay
 * @returns {{red: number, blue: number, total: number}}
 */
export function getReplayKillStats(replay) {
  const red = replay.killCounts?.red || 0;
  const blue = replay.killCounts?.blue || 0;
  return { red, blue, total: red + blue };
}

/**
 * @param {ReplayData} replay
 * @returns {ReplayFrame[]}
 */
export function getKeyFrames(replay) {
  if (!replay?.frames) return [];
  return replay.frames.filter((_, i) => i % KEYFRAME_EVERY_N_FRAMES === 0 || i === replay.frames.length - 1);
}

/**
 * @param {ReplayData} replay
 * @returns {ReplayFrame[]}
 */
export function getTurnStartFrames(replay) {
  if (!replay?.frames) return [];
  const result = [];
  let lastTurn = -1;
  for (const frame of replay.frames) {
    if (frame.turn !== lastTurn) {
      result.push(frame);
      lastTurn = frame.turn;
    }
  }
  return result;
}

/**
 * @param {ReplayData} replay
 * @param {ReplayFrameType} type
 * @returns {ReplayFrame[]}
 */
export function getFramesByType(replay, type) {
  if (!replay?.frames) return [];
  return replay.frames.filter(f => f.type === type);
}

/**
 * @param {ReplayData} replay
 * @returns {{
 *   moveCount: number,
 *   attackCount: number,
 *   cardCount: number,
 *   turnCount: number,
 *   framesByFaction: {red: number, blue: number}
 * }}
 */
export function getReplayStats(replay) {
  if (!replay?.frames) {
    return { moveCount: 0, attackCount: 0, cardCount: 0, turnCount: 0, framesByFaction: { red: 0, blue: 0 } };
  }

  let moveCount = 0, attackCount = 0, cardCount = 0, turnCount = 0;
  /** @type {{red: number, blue: number}} */
  const framesByFaction = { red: 0, blue: 0 };

  for (const frame of replay.frames) {
    switch (frame.type) {
      case 'move': moveCount++; break;
      case 'attack': attackCount++; break;
      case 'card': cardCount++; break;
      case 'turn': turnCount++; break;
    }
    if (frame.faction === 'red') framesByFaction.red++;
    else if (frame.faction === 'blue') framesByFaction.blue++;
  }

  return { moveCount, attackCount, cardCount, turnCount, framesByFaction };
}

export { saveReplay, getReplays, getReplayById, deleteReplay, clearReplays };

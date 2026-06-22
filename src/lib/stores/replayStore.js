import { writable, derived, get } from 'svelte/store';
import {
  createReplayRecorder,
  getReplayStats,
  getTurnStartFrames,
  getFramesByType,
  getKeyFrames,
  saveReplay,
  getReplays,
  getReplayById,
  deleteReplay,
  clearReplays
} from '$lib/utils/replaySystem';

/**
 * @typedef {import('../utils/replaySystem').ReplayData} ReplayData
 * @typedef {import('../utils/replaySystem').ReplayFrame} ReplayFrame
 * @typedef {import('../stores/gameStore').GameState} GameState
 */

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2, 4];
const DEFAULT_FRAME_DURATION = 1500;

/**
 * @typedef {object} ReplayPlayerState
 * @property {ReplayData | null} currentReplay
 * @property {number} currentFrameIndex
 * @property {boolean} isPlaying
 * @property {number} playbackSpeed
 * @property {ReplayFrame | null} currentFrame
 * @property {GameState | null} currentState
 * @property {string} message
 */

/**
 * @typedef {object} ReplayRecorderState
 * @property {boolean} isRecording
 * @property {number} recordedFrames
 * @property {boolean} autoSave
 */

function createReplayStore() {
  const recorder = createReplayRecorder();

  /** @type {ReplayPlayerState} */
  const initialPlayerState = {
    currentReplay: null,
    currentFrameIndex: -1,
    isPlaying: false,
    playbackSpeed: 1,
    currentFrame: null,
    currentState: null,
    message: ''
  };

  /** @type {ReplayRecorderState} */
  const initialRecorderState = {
    isRecording: false,
    recordedFrames: 0,
    autoSave: true
  };

  const player = writable(initialPlayerState);
  const recorderState = writable(initialRecorderState);
  const replayList = writable(/** @type {ReplayData[]} */ ([]));

  let playbackTimer = null;

  function refreshReplayList() {
    replayList.set(getReplays());
  }

  refreshReplayList();

  return {
    player: {
      subscribe: player.subscribe,
      
      /**
       * @param {ReplayData} replay
       */
      loadReplay(replay) {
        if (!replay || !replay.frames || replay.frames.length === 0) {
          player.update(s => ({ ...s, message: '无效的录像数据' }));
          return;
        }
        player.update(s => ({
          ...s,
          currentReplay: replay,
          currentFrameIndex: 0,
          isPlaying: false,
          currentFrame: replay.frames[0],
          currentState: /** @type {GameState} */ (replay.frames[0].stateSnapshot),
          message: `已加载录像，共 ${replay.frames.length} 帧`
        }));
        clearPlaybackTimer();
      },

      unloadReplay() {
        clearPlaybackTimer();
        player.set(initialPlayerState);
      },

      play() {
        player.update(s => {
          if (!s.currentReplay) return s;
          if (s.currentFrameIndex >= s.currentReplay.frames.length - 1) {
            return { ...s, currentFrameIndex: 0, isPlaying: true };
          }
          return { ...s, isPlaying: true };
        });
        startPlaybackTimer();
      },

      pause() {
        clearPlaybackTimer();
        player.update(s => ({ ...s, isPlaying: false }));
      },

      togglePlay() {
        player.update(s => {
          if (!s.currentReplay) return s;
          const newIsPlaying = !s.isPlaying;
          if (newIsPlaying) {
            if (s.currentFrameIndex >= s.currentReplay.frames.length - 1) {
              setTimeout(() => startPlaybackTimer(), 0);
              return { ...s, currentFrameIndex: 0, isPlaying: true };
            }
            setTimeout(() => startPlaybackTimer(), 0);
            return { ...s, isPlaying: true };
          } else {
            clearPlaybackTimer();
            return { ...s, isPlaying: false };
          }
        });
      },

      /**
       * @param {number} index
       */
      seekToFrame(index) {
        player.update(s => {
          if (!s.currentReplay) return s;
          const clampedIndex = Math.max(0, Math.min(index, s.currentReplay.frames.length - 1));
          const frame = s.currentReplay.frames[clampedIndex];
          return {
            ...s,
            currentFrameIndex: clampedIndex,
            currentFrame: frame,
            currentState: /** @type {GameState} */ (frame?.stateSnapshot || null)
          };
        });
      },

      nextFrame() {
        player.update(s => {
          if (!s.currentReplay) return s;
          const nextIndex = Math.min(s.currentFrameIndex + 1, s.currentReplay.frames.length - 1);
          const frame = s.currentReplay.frames[nextIndex];
          const wasPlaying = s.isPlaying;
          if (wasPlaying) clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: nextIndex,
            currentFrame: frame,
            currentState: /** @type {GameState} */ (frame?.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      prevFrame() {
        player.update(s => {
          if (!s.currentReplay) return s;
          const prevIndex = Math.max(s.currentFrameIndex - 1, 0);
          const frame = s.currentReplay.frames[prevIndex];
          const wasPlaying = s.isPlaying;
          if (wasPlaying) clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: prevIndex,
            currentFrame: frame,
            currentState: /** @type {GameState} */ (frame?.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      jumpToStart() {
        player.update(s => {
          if (!s.currentReplay) return s;
          const frame = s.currentReplay.frames[0];
          clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: 0,
            currentFrame: frame,
            currentState: /** @type {GameState} */ (frame?.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      jumpToEnd() {
        player.update(s => {
          if (!s.currentReplay) return s;
          const lastIndex = s.currentReplay.frames.length - 1;
          const frame = s.currentReplay.frames[lastIndex];
          clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: lastIndex,
            currentFrame: frame,
            currentState: /** @type {GameState} */ (frame?.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      /**
       * @param {number} turn
       */
      jumpToTurn(turn) {
        player.update(s => {
          if (!s.currentReplay) return s;
          const turnFrames = getTurnStartFrames(s.currentReplay);
          const targetFrame = turnFrames.find(f => f.turn >= turn) || turnFrames[turnFrames.length - 1] || s.currentReplay.frames[0];
          clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: targetFrame.index,
            currentFrame: targetFrame,
            currentState: /** @type {GameState} */ (targetFrame.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      /**
       * @param {'move' | 'attack' | 'card' | 'turn' | 'victory' | 'deployment' | 'summon'} type
       * @param {number} offset
       */
      jumpToFrameType(type, offset = 0) {
        player.update(s => {
          if (!s.currentReplay) return s;
          const frames = getFramesByType(s.currentReplay, type);
          if (frames.length === 0) return s;
          
          let targetIndex = 0;
          if (offset > 0) {
            const nextFrames = frames.filter(f => f.index > s.currentFrameIndex);
            if (nextFrames.length > 0) {
              targetIndex = nextFrames[Math.min(offset - 1, nextFrames.length - 1)].index;
            } else {
              targetIndex = frames[frames.length - 1].index;
            }
          } else if (offset < 0) {
            const prevFrames = frames.filter(f => f.index < s.currentFrameIndex);
            if (prevFrames.length > 0) {
              targetIndex = prevFrames[Math.max(0, prevFrames.length + offset)].index;
            } else {
              targetIndex = frames[0].index;
            }
          } else {
            targetIndex = frames[0].index;
          }

          const targetFrame = s.currentReplay.frames[targetIndex] || s.currentReplay.frames[0];
          clearPlaybackTimer();
          return {
            ...s,
            currentFrameIndex: targetIndex,
            currentFrame: targetFrame,
            currentState: /** @type {GameState} */ (targetFrame.stateSnapshot || null),
            isPlaying: false
          };
        });
      },

      /**
       * @param {number} speed
       */
      setPlaybackSpeed(speed) {
        if (!PLAYBACK_SPEEDS.includes(speed)) return;
        player.update(s => ({ ...s, playbackSpeed: speed }));
        if (playbackTimer) {
          clearPlaybackTimer();
          startPlaybackTimer();
        }
      },

      cycleSpeed() {
        player.update(s => {
          const currentIdx = PLAYBACK_SPEEDS.indexOf(s.playbackSpeed);
          const nextIdx = (currentIdx + 1) % PLAYBACK_SPEEDS.length;
          return { ...s, playbackSpeed: PLAYBACK_SPEEDS[nextIdx] };
        });
        if (playbackTimer) {
          clearPlaybackTimer();
          startPlaybackTimer();
        }
      }
    },

    recorder: {
      subscribe: recorderState.subscribe,

      /**
       * @param {GameState} initialState
       */
      startRecording(initialState) {
        recorder.startRecording(initialState);
        recorderState.set({ isRecording: true, recordedFrames: 1, autoSave: true });
      },

      /**
       * @param {'move' | 'attack' | 'card' | 'turn' | 'victory' | 'deployment' | 'summon'} type
       * @param {string} description
       * @param {GameState} state
       * @param {object} [actionDetails]
       */
      recordFrame(type, description, state, actionDetails) {
        if (!recorder.isRecording) return;
        recorder.recordFrame(type, description, state, actionDetails);
        recorderState.update(s => ({ ...s, recordedFrames: recorder.frameIndex }));
      },

      /**
       * @param {GameState} finalState
       * @returns {ReplayData | null}
       */
      stopRecording(finalState) {
        const replayData = recorder.stopRecording(finalState);
        recorderState.set({ isRecording: false, recordedFrames: 0, autoSave: true });
        
        if (replayData) {
          saveReplay(replayData);
          refreshReplayList();
        }
        
        return replayData;
      },

      reset() {
        recorder.reset();
        recorderState.set({ isRecording: false, recordedFrames: 0, autoSave: true });
      }
    },

    list: {
      subscribe: replayList.subscribe,
      refresh: refreshReplayList,

      /**
       * @param {number} replayId
       * @returns {ReplayData | null}
       */
      getById(replayId) {
        return getReplayById(replayId);
      },

      /**
       * @param {number} replayId
       */
      delete(replayId) {
        deleteReplay(replayId);
        refreshReplayList();
      },

      clearAll() {
        clearReplays();
        refreshReplayList();
      }
    },

    stats: {
      /**
       * @param {ReplayData} replay
       */
      getStats(replay) {
        return getReplayStats(replay);
      },

      /**
       * @param {ReplayData} replay
       */
      getTurnStarts(replay) {
        return getTurnStartFrames(replay);
      },

      /**
       * @param {ReplayData} replay
       */
      getKeyFrames(replay) {
        return getKeyFrames(replay);
      }
    },

    PLAYBACK_SPEEDS
  };

  function startPlaybackTimer() {
    clearPlaybackTimer();
    
    let state;
    const unsub = player.subscribe(s => { state = s; });
    unsub();

    if (!state?.currentReplay || !state?.isPlaying) return;

    const duration = DEFAULT_FRAME_DURATION / state.playbackSpeed;

    playbackTimer = setTimeout(() => {
      player.update(s => {
        if (!s.currentReplay || !s.isPlaying) return s;
        const nextIndex = s.currentFrameIndex + 1;
        
        if (nextIndex >= s.currentReplay.frames.length) {
          clearPlaybackTimer();
          return { ...s, isPlaying: false, message: '录像播放完成' };
        }

        const frame = s.currentReplay.frames[nextIndex];
        return {
          ...s,
          currentFrameIndex: nextIndex,
          currentFrame: frame,
          currentState: /** @type {GameState} */ (frame.stateSnapshot || null)
        };
      });

      startPlaybackTimer();
    }, duration);
  }

  function clearPlaybackTimer() {
    if (playbackTimer) {
      clearTimeout(playbackTimer);
      playbackTimer = null;
    }
  }
}

export const replayStore = createReplayStore();

export const currentReplayFrame = derived(
  [replayStore.player],
  ([$player]) => $player.currentFrame
);

export const currentReplayState = derived(
  [replayStore.player],
  ([$player]) => $player.currentState
);

export const isReplayPlaying = derived(
  [replayStore.player],
  ([$player]) => $player.isPlaying
);

export const replayProgress = derived(
  [replayStore.player],
  ([$player]) => {
    if (!$player.currentReplay || $player.currentReplay.frames.length === 0) return 0;
    return ($player.currentFrameIndex + 1) / $player.currentReplay.frames.length;
  }
);

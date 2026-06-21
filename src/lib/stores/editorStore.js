// @ts-nocheck
import { writable, derived } from 'svelte/store';
import {
  createCampaignTemplate,
  createEmptyMap,
  TERRAIN_TYPES,
  PUBLISH_STATUS,
  TERRAIN_CONFIG,
  EVENT_TRIGGER_TYPES,
  EVENT_ACTION_TYPES
} from '$lib/config/campaignConfig';

const TOOL_TYPES = {
  SELECT: 'select',
  PAINT_TERRAIN: 'paint_terrain',
  ERASE: 'erase',
  FILL: 'fill',
  SPAWN_POINT: 'spawn_point',
  EVENT_MARKER: 'event_marker'
};

const MAX_HISTORY = 50;

function createEditorState() {
  const initialCampaign = createCampaignTemplate();
  initialCampaign.map.terrain = createEmptyMap(
    initialCampaign.map.width,
    initialCampaign.map.height
  );

  const { subscribe, set, update } = writable({
    campaign: initialCampaign,
    activeTab: 'map',
    tool: TOOL_TYPES.PAINT_TERRAIN,
    selectedTerrain: TERRAIN_TYPES.PLAIN,
    selectedFaction: 'red',
    selectedUnitType: 'infantry',
    selectedSpawnPointIndex: null,
    selectedEventChainId: null,
    selectedEventIndex: null,
    selectedActionIndex: null,
    history: [],
    historyIndex: -1,
    isDirty: false,
    showPreview: false,
    brushSize: 1
  });

  function saveHistory() {
    update(state => {
      const campaignCopy = JSON.parse(JSON.stringify(state.campaign));
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(campaignCopy);

      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true
      };
    });
  }

  function undo() {
    update(state => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        campaign: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex
      };
    });
  }

  function redo() {
    update(state => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        campaign: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex
      };
    });
  }

  function setActiveTab(tab) {
    update(state => ({ ...state, activeTab: tab }));
  }

  function setTool(tool) {
    update(state => ({ ...state, tool }));
  }

  function setSelectedTerrain(terrain) {
    update(state => ({ ...state, selectedTerrain: terrain }));
  }

  function setSelectedFaction(faction) {
    update(state => ({ ...state, selectedFaction: faction }));
  }

  function setSelectedUnitType(unitType) {
    update(state => ({ ...state, selectedUnitType: unitType }));
  }

  function setBrushSize(size) {
    update(state => ({ ...state, brushSize: size }));
  }

  function togglePreview() {
    update(state => ({ ...state, showPreview: !state.showPreview }));
  }

  function updateCampaignBasicInfo(info) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        ...info,
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateMapSettings(settings) {
    saveHistory();
    update(state => {
      const oldTerrain = state.campaign.map.terrain;
      const { width, height } = settings;
      const newTerrain = [];

      for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
          if (oldTerrain[y] && oldTerrain[y][x] !== undefined) {
            row.push(oldTerrain[y][x]);
          } else {
            row.push(TERRAIN_TYPES.PLAIN);
          }
        }
        newTerrain.push(row);
      }

      return {
        ...state,
        campaign: {
          ...state.campaign,
          map: {
            ...state.campaign.map,
            ...settings,
            terrain: newTerrain
          },
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function paintTerrain(x, y, terrainType) {
    update(state => {
      const terrain = state.campaign.map.terrain.map(row => [...row]);
      const brushSize = state.brushSize;

      for (let dy = -Math.floor(brushSize / 2); dy <= Math.floor(brushSize / 2); dy++) {
        for (let dx = -Math.floor(brushSize / 2); dx <= Math.floor(brushSize / 2); dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            ny >= 0 &&
            ny < state.campaign.map.height &&
            nx >= 0 &&
            nx < state.campaign.map.width
          ) {
            terrain[ny][nx] = terrainType;
          }
        }
      }

      return {
        ...state,
        isDirty: true,
        campaign: {
          ...state.campaign,
          map: {
            ...state.campaign.map,
            terrain
          },
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function fillTerrain(startX, startY, targetTerrain) {
    saveHistory();
    update(state => {
      const terrain = state.campaign.map.terrain.map(row => [...row]);
      const sourceTerrain = terrain[startY][startX];

      if (sourceTerrain === targetTerrain) {
        return state;
      }

      const stack = [[startX, startY]];
      const visited = new Set();

      while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= state.campaign.map.width) continue;
        if (y < 0 || y >= state.campaign.map.height) continue;
        if (terrain[y][x] !== sourceTerrain) continue;

        visited.add(key);
        terrain[y][x] = targetTerrain;

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }

      return {
        ...state,
        campaign: {
          ...state.campaign,
          map: {
            ...state.campaign.map,
            terrain
          },
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function addSpawnPoint(faction, x, y) {
    saveHistory();
    update(state => {
      const spawnPoints = { ...state.campaign.spawnPoints };
      const factionPoints = [...spawnPoints[faction]];

      const exists = factionPoints.some(p => p.x === x && p.y === y);
      if (exists) return state;

      factionPoints.push({
        id: `spawn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x,
        y,
        unitType: 'infantry',
        maxUnits: 1,
        label: ''
      });

      spawnPoints[faction] = factionPoints;

      return {
        ...state,
        campaign: {
          ...state.campaign,
          spawnPoints,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function removeSpawnPoint(faction, spawnId) {
    saveHistory();
    update(state => {
      const spawnPoints = { ...state.campaign.spawnPoints };
      spawnPoints[faction] = spawnPoints[faction].filter(p => p.id !== spawnId);

      return {
        ...state,
        selectedSpawnPointIndex: null,
        campaign: {
          ...state.campaign,
          spawnPoints,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function updateSpawnPoint(faction, spawnId, updates) {
    saveHistory();
    update(state => {
      const spawnPoints = { ...state.campaign.spawnPoints };
      spawnPoints[faction] = spawnPoints[faction].map(p =>
        p.id === spawnId ? { ...p, ...updates } : p
      );

      return {
        ...state,
        campaign: {
          ...state.campaign,
          spawnPoints,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function addInitialUnit(faction, unitType, x, y) {
    saveHistory();
    update(state => {
      const initialUnits = { ...state.campaign.initialUnits };
      const factionUnits = [...initialUnits[faction]];

      factionUnits.push({
        id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: unitType,
        x,
        y,
        level: 1
      });

      initialUnits[faction] = factionUnits;

      return {
        ...state,
        campaign: {
          ...state.campaign,
          initialUnits,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function removeInitialUnit(faction, unitId) {
    saveHistory();
    update(state => {
      const initialUnits = { ...state.campaign.initialUnits };
      initialUnits[faction] = initialUnits[faction].filter(u => u.id !== unitId);

      return {
        ...state,
        campaign: {
          ...state.campaign,
          initialUnits,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function addEventChain(name = '新事件链') {
    saveHistory();
    update(state => {
      const newChain = {
        id: `chain_${Date.now()}`,
        name,
        enabled: true,
        trigger: {
          type: EVENT_TRIGGER_TYPES.TURN_START,
          params: { turn: 1 }
        },
        actions: [],
        cooldown: 0,
        maxTriggers: -1,
        triggerCount: 0
      };

      return {
        ...state,
        selectedEventChainId: newChain.id,
        campaign: {
          ...state.campaign,
          eventChains: [...state.campaign.eventChains, newChain],
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function removeEventChain(chainId) {
    saveHistory();
    update(state => ({
      ...state,
      selectedEventChainId: null,
      selectedEventIndex: null,
      selectedActionIndex: null,
      campaign: {
        ...state.campaign,
        eventChains: state.campaign.eventChains.filter(c => c.id !== chainId),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateEventChain(chainId, updates) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        eventChains: state.campaign.eventChains.map(c =>
          c.id === chainId ? { ...c, ...updates } : c
        ),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function selectEventChain(chainId) {
    update(state => ({
      ...state,
      selectedEventChainId: chainId,
      selectedEventIndex: null,
      selectedActionIndex: null
    }));
  }

  function addEventAction(chainId, actionType) {
    saveHistory();
    update(state => {
      const newAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: actionType,
        params: getDefaultActionParams(actionType),
        delay: 0,
        enabled: true
      };

      return {
        ...state,
        campaign: {
          ...state.campaign,
          eventChains: state.campaign.eventChains.map(c =>
            c.id === chainId
              ? { ...c, actions: [...c.actions, newAction] }
              : c
          ),
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function removeEventAction(chainId, actionId) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        eventChains: state.campaign.eventChains.map(c =>
          c.id === chainId
            ? { ...c, actions: c.actions.filter(a => a.id !== actionId) }
            : c
        ),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateEventAction(chainId, actionId, updates) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        eventChains: state.campaign.eventChains.map(c =>
          c.id === chainId
            ? {
                ...c,
                actions: c.actions.map(a =>
                  a.id === actionId ? { ...a, ...updates } : a
                )
              }
            : c
        ),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function reorderEventActions(chainId, fromIndex, toIndex) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        eventChains: state.campaign.eventChains.map(c => {
          if (c.id !== chainId) return c;
          const actions = [...c.actions];
          const [removed] = actions.splice(fromIndex, 1);
          actions.splice(toIndex, 0, removed);
          return { ...c, actions };
        }),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateVictoryConditions(conditions) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        victoryConditions: conditions,
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateSettings(settings) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        settings: { ...state.campaign.settings, ...settings },
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function setPublishStatus(status) {
    saveHistory();
    update(state => ({
      ...state,
      campaign: {
        ...state.campaign,
        status,
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function loadCampaign(campaign) {
    update(state => {
      const campaignCopy = JSON.parse(JSON.stringify(campaign));
      return {
        ...state,
        campaign: campaignCopy,
        history: [campaignCopy],
        historyIndex: 0,
        isDirty: false,
        selectedEventChainId: null,
        selectedSpawnPointIndex: null
      };
    });
  }

  function resetCampaign() {
    const newCampaign = createCampaignTemplate();
    newCampaign.map.terrain = createEmptyMap(
      newCampaign.map.width,
      newCampaign.map.height
    );
    set({
      campaign: newCampaign,
      activeTab: 'map',
      tool: TOOL_TYPES.PAINT_TERRAIN,
      selectedTerrain: TERRAIN_TYPES.PLAIN,
      selectedFaction: 'red',
      selectedUnitType: 'infantry',
      selectedSpawnPointIndex: null,
      selectedEventChainId: null,
      selectedEventIndex: null,
      selectedActionIndex: null,
      history: [JSON.parse(JSON.stringify(newCampaign))],
      historyIndex: 0,
      isDirty: false,
      showPreview: false,
      brushSize: 1
    });
  }

  function getDefaultActionParams(actionType) {
    switch (actionType) {
      case EVENT_ACTION_TYPES.SPAWN_UNIT:
        return {
          unitType: 'infantry',
          faction: 'red',
          x: 0,
          y: 0,
          count: 1
        };
      case EVENT_ACTION_TYPES.GIVE_BUFF:
        return {
          buffType: 'attackBoost',
          value: 0.2,
          duration: 3,
          target: 'all_allies'
        };
      case EVENT_ACTION_TYPES.DEAL_DAMAGE:
        return {
          damage: 20,
          target: 'all_enemies'
        };
      case EVENT_ACTION_TYPES.HEAL:
        return {
          amount: 20,
          target: 'all_allies'
        };
      case EVENT_ACTION_TYPES.CHANGE_TERRAIN:
        return {
          x: 0,
          y: 0,
          terrainType: TERRAIN_TYPES.PLAIN
        };
      case EVENT_ACTION_TYPES.SHOW_DIALOG:
        return {
          speaker: '系统',
          text: '剧情对话内容',
          portrait: ''
        };
      case EVENT_ACTION_TYPES.PLAY_SOUND:
        return {
          soundId: '',
          volume: 1
        };
      case EVENT_ACTION_TYPES.SET_VICTORY:
        return {
          winner: 'red',
          condition: 'custom'
        };
      case EVENT_ACTION_TYPES.ADD_RESOURCE:
        return {
          resourceType: 'gold',
          amount: 100
        };
      case EVENT_ACTION_TYPES.TRIGGER_CHAIN:
        return {
          chainId: ''
        };
      default:
        return {};
    }
  }

  const canUndo = derived(
    { subscribe },
    state => state.historyIndex > 0
  );

  const canRedo = derived(
    { subscribe },
    state => state.historyIndex < state.history.length - 1
  );

  const selectedEventChain = derived(
    { subscribe },
    state => state.campaign.eventChains.find(c => c.id === state.selectedEventChainId) || null
  );

  return {
    subscribe,
    setActiveTab,
    setTool,
    setSelectedTerrain,
    setSelectedFaction,
    setSelectedUnitType,
    setBrushSize,
    togglePreview,
    updateCampaignBasicInfo,
    updateMapSettings,
    paintTerrain,
    fillTerrain,
    addSpawnPoint,
    removeSpawnPoint,
    updateSpawnPoint,
    addInitialUnit,
    removeInitialUnit,
    addEventChain,
    removeEventChain,
    updateEventChain,
    selectEventChain,
    addEventAction,
    removeEventAction,
    updateEventAction,
    reorderEventActions,
    updateVictoryConditions,
    updateSettings,
    setPublishStatus,
    loadCampaign,
    resetCampaign,
    saveHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedEventChain
  };
}

export const editorStore = createEditorState();
export { TOOL_TYPES };

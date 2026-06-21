<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte';
  import { editorStore, TOOL_TYPES } from '$lib/stores/editorStore';
  import { TERRAIN_CONFIG, TERRAIN_TYPES, FACTION_CONFIG } from '$lib/config/campaignConfig';

  let container;
  let isDragging = false;
  let lastPaintPos = null;

  $: campaign = $editorStore.campaign;
  $: map = campaign.map;
  $: tool = $editorStore.tool;
  $: selectedTerrain = $editorStore.selectedTerrain;
  $: selectedFaction = $editorStore.selectedFaction;
  $: brushSize = $editorStore.brushSize;
  $: spawnPoints = campaign.spawnPoints;
  $: initialUnits = campaign.initialUnits;

  function getTerrainAt(x, y) {
    if (y < 0 || y >= map.height || x < 0 || x >= map.width) return null;
    return map.terrain[y][x];
  }

  function handleTileClick(x, y, event) {
    event.preventDefault();
    
    switch (tool) {
      case TOOL_TYPES.PAINT_TERRAIN:
        $editorStore.paintTerrain(x, y, selectedTerrain);
        break;
      case TOOL_TYPES.ERASE:
        $editorStore.paintTerrain(x, y, TERRAIN_TYPES.PLAIN);
        break;
      case TOOL_TYPES.FILL:
        $editorStore.fillTerrain(x, y, selectedTerrain);
        break;
      case TOOL_TYPES.SPAWN_POINT:
        handleSpawnPointClick(x, y);
        break;
    }
  }

  function handleTileMouseDown(x, y, event) {
    if (event.button !== 0) return;
    isDragging = true;
    lastPaintPos = { x, y };
    
    if (tool === TOOL_TYPES.PAINT_TERRAIN || tool === TOOL_TYPES.ERASE) {
      const terrain = tool === TOOL_TYPES.ERASE ? TERRAIN_TYPES.PLAIN : selectedTerrain;
      $editorStore.paintTerrain(x, y, terrain);
    }
  }

  function handleTileMouseEnter(x, y) {
    if (!isDragging) return;
    
    if (tool === TOOL_TYPES.PAINT_TERRAIN || tool === TOOL_TYPES.ERASE) {
      if (lastPaintPos && lastPaintPos.x === x && lastPaintPos.y === y) return;
      lastPaintPos = { x, y };
      const terrain = tool === TOOL_TYPES.ERASE ? TERRAIN_TYPES.PLAIN : selectedTerrain;
      $editorStore.paintTerrain(x, y, terrain);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    lastPaintPos = null;
  }

  function handleSpawnPointClick(x, y) {
    const existing = spawnPoints[selectedFaction].find(p => p.x === x && p.y === y);
    if (existing) {
      $editorStore.removeSpawnPoint(selectedFaction, existing.id);
    } else {
      $editorStore.addSpawnPoint(selectedFaction, x, y);
    }
  }

  function getSpawnPointAt(x, y, faction) {
    return spawnPoints[faction]?.find(p => p.x === x && p.y === y);
  }

  function getInitialUnitsAt(x, y) {
    const redUnits = initialUnits.red.filter(u => u.x === x && u.y === y);
    const blueUnits = initialUnits.blue.filter(u => u.x === x && u.y === y);
    return { red: redUnits, blue: blueUnits };
  }

  function getUnitIcon(type) {
    const icons = {
      infantry: '⚔️',
      cavalry: '🐴',
      archer: '🏹',
      mage: '🔮',
      tank: '🛡️',
      scout: '🔍'
    };
    return icons[type] || '❓';
  }

  onMount(() => {
    document.addEventListener('mouseup', handleMouseUp);
  });

  onDestroy(() => {
    document.removeEventListener('mouseup', handleMouseUp);
  });
</script>

<div class="map-editor" bind:this={container}>
  <div 
    class="map-grid"
    style="
      --tile-size: {map.tileSize}px;
      --map-width: {map.width};
      --map-height: {map.height};
    "
  >
    {#each map.terrain as row, y}
      {#each row as terrainType, x}
        {@const terrain = TERRAIN_CONFIG[terrainType] || TERRAIN_CONFIG[TERRAIN_TYPES.PLAIN]}
        {@const redSpawn = getSpawnPointAt(x, y, 'red')}
        {@const blueSpawn = getSpawnPointAt(x, y, 'blue')}
        {@const unitsAtPos = getInitialUnitsAt(x, y)}
        
        <div
          class="map-tile"
          class:selected={false}
          style="background-color: #{terrain.color.toString(16).padStart(6, '0')}"
          on:mousedown={(e) => handleTileMouseDown(x, y, e)}
          on:mouseenter={() => handleTileMouseEnter(x, y)}
          on:click={(e) => handleTileClick(x, y, e)}
          title="{terrain.name} ({x}, {y})"
        >
          <span class="terrain-icon">{terrain.icon}</span>
          
          {#if redSpawn}
            <div class="spawn-marker red" title="红方出生点">
              <span>🚩</span>
            </div>
          {/if}
          
          {#if blueSpawn}
            <div class="spawn-marker blue" title="蓝方出生点">
              <span>🚩</span>
            </div>
          {/if}

          {#if unitsAtPos.red.length > 0}
            <div class="unit-marker red" title="{unitsAtPos.red.length} 个红方单位">
              {getUnitIcon(unitsAtPos.red[0].type)}
              {#if unitsAtPos.red.length > 1}
                <span class="unit-count">{unitsAtPos.red.length}</span>
              {/if}
            </div>
          {/if}

          {#if unitsAtPos.blue.length > 0}
            <div class="unit-marker blue" title="{unitsAtPos.blue.length} 个蓝方单位">
              {getUnitIcon(unitsAtPos.blue[0].type)}
              {#if unitsAtPos.blue.length > 1}
                <span class="unit-count">{unitsAtPos.blue.length}</span>
              {/if}
            </div>
          {/if}

          <span class="tile-coords">{x},{y}</span>
        </div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .map-editor {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .map-grid {
    display: grid;
    grid-template-columns: repeat(var(--map-width), var(--tile-size));
    grid-template-rows: repeat(var(--map-height), var(--tile-size));
    gap: 1px;
    background: #0f0f1a;
    border: 2px solid #3a3a5a;
    border-radius: 4px;
    padding: 2px;
    user-select: none;
  }

  .map-tile {
    position: relative;
    width: var(--tile-size);
    height: var(--tile-size);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.1s, filter 0.1s;
    overflow: hidden;
  }

  .map-tile:hover {
    filter: brightness(1.2);
    transform: scale(1.02);
    z-index: 1;
  }

  .terrain-icon {
    font-size: 20px;
    opacity: 0.8;
  }

  .tile-coords {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.5);
    font-family: monospace;
    pointer-events: none;
  }

  .spawn-marker {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    border: 2px solid;
  }

  .spawn-marker.red {
    background: rgba(192, 57, 43, 0.8);
    border-color: #e74c3c;
  }

  .spawn-marker.blue {
    background: rgba(41, 128, 185, 0.8);
    border-color: #3498db;
    top: 2px;
    left: auto;
    right: 2px;
  }

  .unit-marker {
    position: absolute;
    bottom: 4px;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    border: 2px solid;
  }

  .unit-marker.red {
    background: rgba(192, 57, 43, 0.9);
    border-color: #e74c3c;
    left: 4px;
  }

  .unit-marker.blue {
    background: rgba(41, 128, 185, 0.9);
    border-color: #3498db;
    right: 4px;
  }

  .unit-count {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #2c3e50;
    color: white;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 8px;
    min-width: 16px;
    text-align: center;
  }
</style>

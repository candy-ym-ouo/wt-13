<script>
	import { expeditionStore, availableNodes, expeditionProgress, rosterAliveCount, totalRosterPower } from '$lib/stores/expeditionStore.js';
	import { EXPEDITION_DIFFICULTY, EXPEDITION_EVENT_INFO, SUPPLY_INFO, EXPEDITION_EVENT_TYPES } from '$lib/config/expeditionConfig.js';
	import { unitConfig } from '$lib/config/unitConfig.js';
	import { CARD_RARITY_COLORS } from '$lib/config/eventCardConfig.js';
	import { getRarityInfo } from '$lib/config/equipmentConfig.js';

	let selectedNodeId = null;

	$: selectedNode = selectedNodeId && $expeditionStore.map
		? $expeditionStore.map.layers.flat().find(n => n.id === selectedNodeId)
		: null;
	$: selectedNodeInfo = selectedNode ? EXPEDITION_EVENT_INFO[selectedNode.eventType] : null;

	$: currentNode = $expeditionStore.currentNode;
	$: currentNodeInfo = currentNode ? EXPEDITION_EVENT_INFO[currentNode.eventType] : null;
	$: currentEventData = $expeditionStore.currentEvent;

	function handleNodeClick(node) {
		if (node.available && !node.visited) {
			selectedNodeId = node.id;
		}
	}

	function confirmSelectNode() {
		if (selectedNodeId) {
			$expeditionStore.selectNode(selectedNodeId);
			selectedNodeId = null;
		}
	}

	function startExpedition(difficulty) {
		$expeditionStore.startExpedition(difficulty);
	}

	function goBackToMenu() {
		window.location.href = '/';
	}
</script>

<div class="expedition-container">
	{#if !$expeditionStore.active && $expeditionStore.phase === 'select_difficulty'}
		<div class="difficulty-select">
			<h1 class="expedition-title">🗺️ 随机远征</h1>
			<p class="expedition-subtitle">穿越未知之地，挑战层层险阻，击败终极首领！</p>
			
			<div class="difficulty-cards">
				{#each Object.values(EXPEDITION_DIFFICULTY) as diff}
					<div class="difficulty-card" style="--diff-color: {diff.color}" on:click={() => startExpedition(diff.id)}>
						<div class="diff-icon">{diff.icon}</div>
						<h3 class="diff-name">{diff.name}</h3>
						<div class="diff-info">
							<div class="diff-row"><span>地图层数</span><span>{diff.layerCount}</span></div>
							<div class="diff-row"><span>敌军强度</span><span>{Math.round(diff.enemyStrength * 100)}%</span></div>
							<div class="diff-row"><span>奖励倍率</span><span>{Math.round(diff.rewardMultiplier * 100)}%</span></div>
						</div>
						<button class="start-btn">开始远征</button>
					</div>
				{/each}
			</div>
			
			<button class="back-btn" on:click={goBackToMenu}>← 返回主菜单</button>
		</div>

	{:else if $expeditionStore.phase === 'map_view'}
		<div class="map-view">
			<div class="top-bar">
				<div class="stats-left">
					<div class="stat-item">
						<span class="stat-icon">🗺️</span>
						<span>进度 {$expeditionStore.map.currentLayer + 1}/{$expeditionStore.map.totalLayers}</span>
						<div class="progress-bar">
							<div class="progress-fill" style="width: {$expeditionProgress.percent}%"></div>
						</div>
					</div>
					<div class="stat-item">
						<span class="stat-icon">💰</span>
						<span>{$expeditionStore.gold}</span>
					</div>
					<div class="stat-item">
						<span class="stat-icon">⚔️</span>
						<span>战力 {$totalRosterPower}</span>
					</div>
					<div class="stat-item">
						<span class="stat-icon">👥</span>
						<span>{$rosterAliveCount} 存活</span>
					</div>
				</div>
				<div class="stats-right">
					<button class="abandon-btn" on:click={() => $expeditionStore.abandonExpedition()}>放弃远征</button>
				</div>
			</div>

			<div class="map-scroll">
				<div class="map-layers">
					{#each $expeditionStore.map.layers as layer, layerIdx}
						<div class="map-layer" style="--layer-idx: {layerIdx}">
							<div class="layer-label">第 {layerIdx + 1} 层</div>
							<div class="layer-nodes">
								{#each layer as node}
									{@const info = EXPEDITION_EVENT_INFO[node.eventType]}
									<button 
										class="map-node {node.visited ? 'visited' : ''} {node.available ? 'available' : ''} {selectedNodeId === node.id ? 'selected' : ''}"
										style="--node-color: {info?.color || '#666'}"
										on:click={() => handleNodeClick(node)}
										disabled={!node.available || node.visited}
									>
										<span class="node-icon">{info?.icon || '❓'}</span>
										<span class="node-name">{info?.name || '未知'}</span>
										{#if node.visited}
											<span class="check-mark">✓</span>
										{/if}
									</button>
									
									{#each node.connections as connId}
										{@const connNode = layer[layerIdx + 1]?.find(n => n.id === connId)}
										{#if connNode}
											<svg class="connection-line" preserveAspectRatio="none">
												<line x1="50%" y1="100%" x2="50%" y2="0%" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
											</svg>
										{/if}
									{/each}
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="roster-panel">
				<h3 class="panel-title">🎖️ 军团名册</h3>
				<div class="roster-list">
					{#each $expeditionStore.roster as unit}
						{@const config = unitConfig[unit.type]}
						<div class="roster-unit {unit.currentHp <= 0 ? 'dead' : ''}" style="--unit-color: #{config?.color?.toString(16) || '888'}">
							<div class="unit-icon">{config?.name?.[0] || '?'}</div>
							<div class="unit-info">
								<div class="unit-name">{unit.name} <span class="unit-level">Lv.{unit.level}</span></div>
								<div class="hp-bar">
									<div class="hp-fill" style="width: {Math.max(0, (unit.currentHp / unit.maxHp) * 100)}%"></div>
								</div>
								<div class="unit-stats">
									<span>❤️ {unit.currentHp}/{unit.maxHp}</span>
									<span>⚔️ {unit.attack}</span>
									<span>🛡️ {unit.defense}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			{#if selectedNodeId}
				<div class="node-confirm-overlay" on:click={() => selectedNodeId = null}>
					<div class="node-confirm-modal" on:click|stopPropagation>
						<h3>{selectedNodeInfo?.icon} {selectedNodeInfo?.name}</h3>
						<p>{selectedNodeInfo?.description}</p>
						<div class="confirm-actions">
							<button on:click={() => selectedNodeId = null}>取消</button>
							<button class="confirm-btn" on:click={confirmSelectNode}>进入节点</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

	{:else if $expeditionStore.phase === 'event_view'}
		<div class="event-view">
			<div class="event-header" style="--event-color: {currentNodeInfo?.color || '#666'}">
				<span class="event-icon">{currentNodeInfo?.icon}</span>
				<div>
					<h2>{currentNodeInfo?.name}</h2>
					<p>{currentNodeInfo?.description}</p>
				</div>
			</div>

			{#if currentNode?.eventType === EXPEDITION_EVENT_TYPES.BATTLE || currentNode?.eventType === EXPEDITION_EVENT_TYPES.BOSS}
				<div class="battle-event">
					<div class="enemy-preview">
						<h3>敌军编队</h3>
						<div class="enemy-list">
							{#each currentEventData?.enemies || [] as enemy}
								{@const eConfig = unitConfig[enemy.type]}
								<div class="enemy-card {enemy.isBoss ? 'boss' : ''}" style="--e-color: #{eConfig?.color?.toString(16) || '888'}">
									<div class="enemy-type-icon">{eConfig?.name?.[0] || '?'}</div>
									<div class="enemy-info">
										<div class="enemy-name">{enemy.name} {enemy.isBoss ? '👑' : ''}</div>
										<div class="enemy-stats">
											<span>❤️ {enemy.maxHp}</span>
											<span>⚔️ {enemy.attack}</span>
											<span>🛡️ {enemy.defense}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
						{#if currentEventData?.isElite}
							<div class="elite-badge">⭐ 精英战斗 - 奖励提升</div>
						{/if}
						{#if currentNode?.eventType === EXPEDITION_EVENT_TYPES.BOSS}
							<div class="boss-info">
								<p>{currentEventData?.bossDescription}</p>
							</div>
						{/if}
					</div>
					<button class="action-btn battle-btn" on:click={() => $expeditionStore.startBattle()}>
						⚔️ 开始战斗
					</button>
				</div>

			{:else if currentNode?.eventType === EXPEDITION_EVENT_TYPES.SUPPLY}
				<div class="supply-event">
					<h3>选择一份补给</h3>
					<div class="supply-options">
						{#each currentEventData?.options || [] as option}
							{@const supplyInfo = SUPPLY_INFO[option.type]}
							<button class="supply-card" on:click={() => $expeditionStore.selectSupply(option.type)}>
								<div class="supply-icon">{supplyInfo?.icon || '🎁'}</div>
								<h4>{supplyInfo?.name || option.type}</h4>
								<p>{supplyInfo?.description || ''}</p>
							</button>
						{/each}
					</div>
				</div>

			{:else if currentNode?.eventType === EXPEDITION_EVENT_TYPES.RANDOM}
				<div class="random-event">
					<div class="event-card big">
						<div class="event-big-icon">{currentEventData?.event?.icon || '❓'}</div>
						<h3>{currentEventData?.event?.name || '神秘事件'}</h3>
						<p>{currentEventData?.event?.description || '前方发生了未知的事情...'}</p>
						<div class="event-hint">可能的结果充满未知...</div>
					</div>
					<button class="action-btn" on:click={() => $expeditionStore.resolveEvent()}>
						🎲 触发事件
					</button>
				</div>

			{:else if currentNode?.eventType === EXPEDITION_EVENT_TYPES.SHRINE}
				<div class="shrine-event">
					<h3>⛩️ 古老神殿 - 选择一项祝福</h3>
					<div class="blessing-options">
						{#each currentEventData?.blessings || [] as blessing}
							<button class="blessing-card" on:click={() => $expeditionStore.selectBlessing(blessing)}>
								<div class="blessing-icon">{blessing.icon}</div>
								<h4>{blessing.name}</h4>
								<p>{blessing.description}</p>
							</button>
						{/each}
					</div>
				</div>

			{:else if currentNode?.eventType === EXPEDITION_EVENT_TYPES.REST}
				<div class="rest-event">
					<div class="rest-card">
						<div class="rest-icon">🏕️</div>
						<h3>安全营地</h3>
						<p>部队可以在此休整，恢复 {Math.round((currentEventData?.healAmount || 0.3) * 100)}% 生命值，士气提升 {currentEventData?.moraleBoost || 15} 点</p>
					</div>
					<button class="action-btn rest-btn" on:click={() => $expeditionStore.useRest()}>
						😴 开始休整
					</button>
				</div>

			{:else if currentNode?.eventType === EXPEDITION_EVENT_TYPES.SHOP}
				<div class="shop-event">
					<h3>🛒 旅行商人</h3>
					{#if (currentEventData?.discount || 1) < 1}
						<div class="discount-badge">🎉 限时折扣 {Math.round((1 - currentEventData.discount) * 100)}% OFF</div>
					{/if}
					<div class="shop-items">
						{#each currentEventData?.availableItems || [] as item}
							{@const price = Math.floor(item.price * ($expeditionStore.shopDiscount < 1 ? $expeditionStore.shopDiscount : (currentEventData?.discount || 1)))}
							<button 
								class="shop-item {item.purchased ? 'sold' : ''}" 
								on:click={() => $expeditionStore.purchaseShopItem(item.id)}
								disabled={item.purchased || $expeditionStore.gold < price}
							>
								<div class="item-type">{item.type === 'heal' ? '🧪' : item.type === 'buff' ? '📜' : item.type === 'card' ? '🃏' : '🎁'}</div>
								<div class="item-name">
									{item.type === 'heal' ? '治疗药水' : 
									 item.type === 'buff' ? '力量卷轴' : 
									 item.type === 'card' ? '神秘卡牌' : '装备宝箱'}
								</div>
								<div class="item-price {item.purchased ? 'sold' : ''}">
									{item.purchased ? '已售' : `💰 ${price}`}
								</div>
							</button>
						{/each}
					</div>
					<button class="action-btn" on:click={() => $expeditionStore.returnToMap()}>
						离开商店
					</button>
				</div>
			{/if}
		</div>

	{:else if $expeditionStore.phase === 'battle_result'}
		<div class="result-view">
			<div class="result-card victory">
				<div class="result-icon">🏆</div>
				<h2>战斗胜利！</h2>
				
				<div class="rewards-section">
					<div class="reward-item">
						<span class="reward-icon">💰</span>
						<span>金币 +{$expeditionStore.battleResult?.gold || 0}</span>
					</div>
					<div class="reward-item">
						<span class="reward-icon">✨</span>
						<span>经验 +{$expeditionStore.battleResult?.exp || 0}</span>
					</div>
				</div>

				{#if ($expeditionStore.battleResult?.cards?.length || 0) > 0}
					<div class="rewards-section">
						<h4>🃏 获得卡牌</h4>
						<div class="card-rewards">
							{#each $expeditionStore.battleResult.cards as card}
								<div class="card-reward" style="--rarity-color: {CARD_RARITY_COLORS[card.rarity] || '#888'}">
									<span class="card-icon">{card.icon}</span>
									<span class="card-name">{card.name}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if ($expeditionStore.battleResult?.equipment?.length || 0) > 0}
					<div class="rewards-section">
						<h4>🎁 获得装备</h4>
						<div class="equip-rewards">
							{#each $expeditionStore.battleResult.equipment as equip}
								{@const rarityInfo = getRarityInfo(equip.rarity)}
								<div class="equip-reward" style="--rarity-color: {rarityInfo?.color || '#888'}">
									<span class="equip-name">{equip.name}</span>
									<span class="equip-rarity">{rarityInfo?.name || equip.rarity}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<button class="action-btn" on:click={() => $expeditionStore.returnToMap()}>
					继续远征 →
				</button>
			</div>
		</div>

	{:else if $expeditionStore.phase === 'supply_result'}
		<div class="result-view">
			<div class="result-card supply">
				<div class="result-icon">🎁</div>
				<h2>补给已领取</h2>
				<p class="result-message">{$expeditionStore.supplyResult?.message || ''}</p>
				<button class="action-btn" on:click={() => $expeditionStore.returnToMap()}>
					继续远征 →
				</button>
			</div>
		</div>

	{:else if $expeditionStore.phase === 'event_result' || $expeditionStore.phase === 'shrine_result' || $expeditionStore.phase === 'rest_result'}
		<div class="result-view">
			<div class="result-card event">
				<div class="result-icon">{$expeditionStore.phase === 'shrine_result' ? '⛩️' : $expeditionStore.phase === 'rest_result' ? '😴' : '🎲'}</div>
				<h2>{$expeditionStore.phase === 'shrine_result' ? '祝福已获得' : $expeditionStore.phase === 'rest_result' ? '休整完成' : '事件已解决'}</h2>
				<p class="result-message">{$expeditionStore.eventResult?.message || ''}</p>
				<button class="action-btn" on:click={() => $expeditionStore.returnToMap()}>
					继续远征 →
				</button>
			</div>
		</div>

	{:else if $expeditionStore.phase === 'victory'}
		<div class="final-view victory">
			<div class="final-card">
				<div class="final-icon">🏆</div>
				<h1>远征胜利！</h1>
				<p class="final-subtitle">你成功击败了首领，凯旋归来！</p>
				
				<div class="final-score">
					<div class="score-big">总分: {$expeditionStore.finalScore?.total || 0}</div>
					<div class="score-breakdown">
						<div>军团战力: {$expeditionStore.finalScore?.roster || 0}</div>
						<div>金币奖励: {$expeditionStore.finalScore?.gold || 0}</div>
						<div>装备奖励: {$expeditionStore.finalScore?.equipment || 0}</div>
						<div>通关层数: {$expeditionStore.finalScore?.layer || 0}</div>
						<div>胜利奖励: {$expeditionStore.finalScore?.victory || 0}</div>
					</div>
				</div>

				<div class="final-stats">
					<h3>战斗统计</h3>
					<div class="stat-grid">
						<div><span>⚔️ 战斗获胜</span><span>{$expeditionStore.stats.battlesWon}</span></div>
						<div><span>💰 金币总计</span><span>{$expeditionStore.stats.totalGoldEarned}</span></div>
						<div><span>📍 节点探索</span><span>{$expeditionStore.stats.nodesVisited}</span></div>
						<div><span>💀 单位损失</span><span>{$expeditionStore.stats.unitsLost}</span></div>
					</div>
				</div>

				<button class="final-btn" on:click={() => $expeditionStore.reset()}>
					开始新远征
				</button>
				<button class="back-btn" on:click={goBackToMenu}>返回主菜单</button>
			</div>
		</div>

	{:else if $expeditionStore.phase === 'defeat'}
		<div class="final-view defeat">
			<div class="final-card">
				<div class="final-icon">💀</div>
				<h1>远征失败</h1>
				<p class="final-subtitle">你的军团倒在了征途之上...</p>
				
				<div class="final-score">
					<div class="score-big">最终得分: {$expeditionStore.finalScore?.total || 0}</div>
					<div class="score-breakdown">
						<div>到达层数: {($expeditionStore.map?.currentLayer || 0) + 1} / {$expeditionStore.map?.totalLayers || 0}</div>
					</div>
				</div>

				<button class="final-btn" on:click={() => $expeditionStore.reset()}>
					再次挑战
				</button>
				<button class="back-btn" on:click={goBackToMenu}>返回主菜单</button>
			</div>
		</div>
	{/if}

	{#if $expeditionStore.active && $expeditionStore.logs.length > 0}
		<div class="log-panel">
			<div class="log-header">📜 远征日志</div>
			<div class="log-list">
				{#each $expeditionStore.logs.slice(0, 10) as log}
					<div class="log-item type-{log.type}">
						<span class="log-turn">[L{log.turn + 1}]</span>
						<span>{log.message}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.expedition-container {
		width: 100vw;
		height: 100vh;
		overflow: auto;
		background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
		color: #fff;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}

	.difficulty-select {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		text-align: center;
	}

	.expedition-title {
		font-size: 52px;
		margin: 0 0 12px 0;
		background: linear-gradient(135deg, #ffd700, #ff9800, #e74c3c);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.expedition-subtitle {
		font-size: 18px;
		color: #aaa;
		margin: 0 0 50px 0;
	}

	.difficulty-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 24px;
		max-width: 1100px;
		width: 100%;
		margin-bottom: 40px;
	}

	.difficulty-card {
		padding: 32px 24px;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid var(--diff-color);
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.difficulty-card:hover {
		transform: translateY(-8px);
		background: rgba(255, 255, 255, 0.08);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px var(--diff-color);
	}

	.diff-icon {
		font-size: 56px;
		margin-bottom: 12px;
	}

	.diff-name {
		font-size: 28px;
		margin: 0 0 20px 0;
		color: var(--diff-color);
	}

	.diff-info {
		margin-bottom: 24px;
	}

	.diff-row {
		display: flex;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 14px;
	}

	.start-btn {
		width: 100%;
		padding: 14px;
		font-size: 16px;
		font-weight: bold;
		background: var(--diff-color);
		color: white;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.start-btn:hover {
		filter: brightness(1.2);
	}

	.back-btn {
		padding: 12px 32px;
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
	}

	.back-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.map-view {
		padding: 20px;
	}

	.top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 16px;
		margin-bottom: 24px;
		flex-wrap: wrap;
		gap: 16px;
	}

	.stats-left {
		display: flex;
		gap: 32px;
		flex-wrap: wrap;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 16px;
	}

	.stat-icon {
		font-size: 20px;
	}

	.progress-bar {
		width: 120px;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		margin-left: 8px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #ffd700, #ff9800);
		transition: width 0.5s ease;
	}

	.abandon-btn {
		padding: 10px 24px;
		background: rgba(231, 76, 60, 0.3);
		color: #e74c3c;
		border: 1px solid #e74c3c;
		border-radius: 8px;
		cursor: pointer;
		font-weight: bold;
	}

	.abandon-btn:hover {
		background: rgba(231, 76, 60, 0.5);
	}

	.map-scroll {
		overflow-x: auto;
		padding: 20px 0;
		margin-bottom: 24px;
	}

	.map-layers {
		display: flex;
		flex-direction: column-reverse;
		gap: 20px;
		min-width: fit-content;
		padding: 0 40px;
	}

	.map-layer {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.layer-label {
		font-size: 12px;
		color: #888;
		margin-bottom: 8px;
	}

	.layer-nodes {
		display: flex;
		gap: 24px;
		justify-content: center;
	}

	.map-node {
		position: relative;
		width: 100px;
		height: 100px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.3s ease;
		padding: 8px;
	}

	.map-node.available {
		border-color: var(--node-color);
		animation: pulse 2s infinite;
	}

	.map-node.selected {
		transform: scale(1.1);
		box-shadow: 0 0 30px var(--node-color);
	}

	.map-node.visited {
		background: rgba(255, 255, 255, 0.02);
		border-color: rgba(100, 100, 100, 0.3);
		opacity: 0.5;
		cursor: not-allowed;
	}

	.map-node:not(.available):not(.visited) {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.map-node.available:hover {
		transform: translateY(-4px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}

	@keyframes pulse {
		0%, 100% { box-shadow: 0 0 0 0 var(--node-color); }
		50% { box-shadow: 0 0 0 10px transparent; }
	}

	.node-icon {
		font-size: 32px;
	}

	.node-name {
		font-size: 12px;
		margin-top: 4px;
		color: #ddd;
	}

	.check-mark {
		position: absolute;
		top: 4px;
		right: 8px;
		color: #27ae60;
		font-size: 18px;
	}

	.roster-panel {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 16px;
		padding: 20px;
	}

	.panel-title {
		margin: 0 0 16px 0;
		font-size: 18px;
		color: #ffd700;
	}

	.roster-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}

	.roster-unit {
		display: flex;
		gap: 12px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.03);
		border-left: 4px solid var(--unit-color);
		border-radius: 8px;
	}

	.roster-unit.dead {
		opacity: 0.4;
		filter: grayscale(1);
	}

	.unit-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--unit-color);
		border-radius: 8px;
		font-weight: bold;
		font-size: 20px;
		color: #000;
	}

	.unit-info {
		flex: 1;
		min-width: 0;
	}

	.unit-name {
		font-size: 14px;
		font-weight: bold;
		margin-bottom: 4px;
	}

	.unit-level {
		color: #ffd700;
		font-size: 12px;
	}

	.hp-bar {
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		margin-bottom: 6px;
		overflow: hidden;
	}

	.hp-fill {
		height: 100%;
		background: linear-gradient(90deg, #e74c3c, #27ae60);
		transition: width 0.3s;
	}

	.unit-stats {
		display: flex;
		gap: 12px;
		font-size: 11px;
		color: #aaa;
	}

	.node-confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.node-confirm-modal {
		background: #1a1a2e;
		padding: 32px;
		border-radius: 16px;
		max-width: 400px;
		text-align: center;
		border: 2px solid #ffd700;
	}

	.confirm-actions {
		display: flex;
		gap: 16px;
		justify-content: center;
		margin-top: 24px;
	}

	.confirm-actions button {
		padding: 12px 32px;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		font-size: 14px;
		font-weight: bold;
	}

	.confirm-actions button:first-child {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
	}

	.confirm-btn {
		background: linear-gradient(135deg, #ffd700, #ff9800);
		color: #1a1a2e;
	}

	.event-view {
		padding: 40px 20px;
		max-width: 900px;
		margin: 0 auto;
	}

	.event-header {
		display: flex;
		gap: 20px;
		align-items: center;
		padding: 24px;
		background: rgba(0, 0, 0, 0.3);
		border-left: 6px solid var(--event-color);
		border-radius: 16px;
		margin-bottom: 32px;
	}

	.event-icon {
		font-size: 56px;
	}

	.event-header h2 {
		margin: 0 0 8px 0;
		color: var(--event-color);
	}

	.event-header p {
		margin: 0;
		color: #aaa;
	}

	.enemy-preview h3,
	.supply-event h3,
	.shrine-event h3,
	.shop-event h3 {
		margin: 0 0 20px 0;
		color: #ffd700;
	}

	.enemy-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 20px;
	}

	.enemy-card {
		display: flex;
		gap: 12px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.03);
		border-left: 4px solid var(--e-color);
		border-radius: 8px;
	}

	.enemy-card.boss {
		grid-column: 1 / -1;
		border-left-width: 6px;
		background: linear-gradient(135deg, rgba(192, 57, 43, 0.2), transparent);
	}

	.enemy-type-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--e-color);
		border-radius: 8px;
		font-weight: bold;
		color: #000;
		flex-shrink: 0;
	}

	.enemy-info {
		flex: 1;
	}

	.enemy-name {
		font-size: 14px;
		font-weight: bold;
		margin-bottom: 6px;
	}

	.enemy-stats {
		display: flex;
		gap: 10px;
		font-size: 11px;
		color: #aaa;
	}

	.elite-badge {
		display: inline-block;
		padding: 8px 16px;
		background: rgba(241, 196, 15, 0.2);
		color: #f1c40f;
		border-radius: 8px;
		margin-bottom: 20px;
		font-size: 14px;
		font-weight: bold;
	}

	.boss-info {
		padding: 16px;
		background: rgba(192, 57, 43, 0.1);
		border-radius: 8px;
		margin-bottom: 20px;
		color: #e74c3c;
	}

	.action-btn {
		width: 100%;
		padding: 18px;
		font-size: 18px;
		font-weight: bold;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s;
		margin-top: 20px;
	}

	.battle-btn {
		background: linear-gradient(135deg, #e74c3c, #c0392b);
		color: white;
	}

	.battle-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 30px rgba(231, 76, 60, 0.4);
	}

	.rest-btn {
		background: linear-gradient(135deg, #27ae60, #229954);
		color: white;
	}

	.supply-options,
	.blessing-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.supply-card,
	.blessing-card {
		padding: 24px;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		cursor: pointer;
		text-align: center;
		transition: all 0.3s;
	}

	.supply-card:hover,
	.blessing-card:hover {
		transform: translateY(-4px);
		border-color: #ffd700;
		background: rgba(255, 215, 0, 0.05);
	}

	.supply-icon,
	.blessing-icon {
		font-size: 48px;
		margin-bottom: 12px;
	}

	.supply-card h4,
	.blessing-card h4 {
		margin: 0 0 8px 0;
		color: #ffd700;
	}

	.supply-card p,
	.blessing-card p {
		margin: 0;
		color: #aaa;
		font-size: 13px;
	}

	.random-event {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.event-card.big {
		padding: 48px;
		background: linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(155, 89, 182, 0.05));
		border: 2px solid rgba(155, 89, 182, 0.3);
		border-radius: 24px;
		text-align: center;
		max-width: 500px;
	}

	.event-big-icon {
		font-size: 80px;
		margin-bottom: 20px;
	}

	.event-hint {
		margin-top: 20px;
		color: #888;
		font-style: italic;
	}

	.rest-card {
		text-align: center;
		padding: 48px;
		background: linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.05));
		border-radius: 24px;
		margin-bottom: 24px;
	}

	.rest-icon {
		font-size: 80px;
		margin-bottom: 16px;
	}

	.discount-badge {
		display: inline-block;
		padding: 8px 16px;
		background: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
		border-radius: 8px;
		margin-bottom: 16px;
		font-weight: bold;
	}

	.shop-items {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
		margin-bottom: 20px;
	}

	.shop-item {
		padding: 20px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		transition: all 0.2s;
	}

	.shop-item:hover:not(:disabled) {
		border-color: #e67e22;
		transform: translateY(-2px);
	}

	.shop-item.sold,
	.shop-item:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.item-type {
		font-size: 32px;
	}

	.item-name {
		font-size: 13px;
		text-align: center;
	}

	.item-price {
		color: #ffd700;
		font-weight: bold;
	}

	.item-price.sold {
		color: #888;
	}

	.result-view {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
	}

	.result-card {
		background: rgba(0, 0, 0, 0.4);
		border-radius: 24px;
		padding: 48px;
		max-width: 600px;
		width: 100%;
		text-align: center;
		border: 2px solid;
	}

	.result-card.victory {
		border-color: #f1c40f;
	}

	.result-card.supply {
		border-color: #3498db;
	}

	.result-card.event {
		border-color: #9b59b6;
	}

	.result-icon {
		font-size: 80px;
		margin-bottom: 20px;
	}

	.result-card h2 {
		margin: 0 0 24px 0;
		font-size: 36px;
	}

	.result-message {
		color: #ddd;
		font-size: 16px;
		margin: 0 0 24px 0;
	}

	.rewards-section {
		margin-bottom: 24px;
	}

	.rewards-section h4 {
		margin: 0 0 12px 0;
		color: #ffd700;
	}

	.reward-item {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px;
		font-size: 18px;
	}

	.reward-icon {
		font-size: 24px;
	}

	.card-rewards,
	.equip-rewards {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: center;
	}

	.card-reward,
	.equip-reward {
		padding: 12px 20px;
		background: var(--rarity-color);
		color: #1a1a2e;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: bold;
	}

	.equip-reward {
		flex-direction: column;
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
		border: 2px solid var(--rarity-color);
	}

	.equip-rarity {
		font-size: 11px;
		color: var(--rarity-color);
	}

	.final-view {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
	}

	.final-card {
		background: rgba(0, 0, 0, 0.5);
		border-radius: 32px;
		padding: 60px;
		max-width: 700px;
		width: 100%;
		text-align: center;
		border: 3px solid;
	}

	.final-view.victory .final-card {
		border-color: #ffd700;
		box-shadow: 0 0 100px rgba(255, 215, 0, 0.3);
	}

	.final-view.defeat .final-card {
		border-color: #e74c3c;
	}

	.final-icon {
		font-size: 120px;
		margin-bottom: 20px;
	}

	.final-card h1 {
		font-size: 48px;
		margin: 0 0 12px 0;
		background: linear-gradient(135deg, #ffd700, #ff9800);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.final-subtitle {
		font-size: 18px;
		color: #aaa;
		margin: 0 0 40px 0;
	}

	.final-score {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		padding: 32px;
		margin-bottom: 32px;
	}

	.score-big {
		font-size: 48px;
		font-weight: bold;
		color: #ffd700;
		margin-bottom: 20px;
	}

	.score-breakdown {
		display: grid;
		gap: 8px;
		color: #aaa;
	}

	.final-stats h3 {
		margin: 0 0 20px 0;
		color: #ffd700;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.stat-grid > div {
		display: flex;
		justify-content: space-between;
		padding: 12px 20px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
	}

	.final-btn {
		display: block;
		width: 100%;
		padding: 18px;
		margin-top: 32px;
		margin-bottom: 12px;
		font-size: 18px;
		font-weight: bold;
		background: linear-gradient(135deg, #ffd700, #ff9800);
		color: #1a1a2e;
		border: none;
		border-radius: 12px;
		cursor: pointer;
	}

	.log-panel {
		position: fixed;
		right: 20px;
		bottom: 20px;
		width: 320px;
		max-height: 300px;
		background: rgba(0, 0, 0, 0.85);
		border-radius: 12px;
		overflow: hidden;
		z-index: 500;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.log-header {
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.05);
		font-weight: bold;
		font-size: 13px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.log-list {
		padding: 8px;
		max-height: 240px;
		overflow-y: auto;
	}

	.log-item {
		padding: 6px 8px;
		font-size: 12px;
		border-radius: 4px;
		margin-bottom: 4px;
		line-height: 1.4;
	}

	.log-turn {
		color: #888;
		margin-right: 6px;
	}

	.log-item.type-success {
		background: rgba(39, 174, 96, 0.1);
		color: #27ae60;
	}

	.log-item.type-warning {
		background: rgba(241, 196, 15, 0.1);
		color: #f1c40f;
	}

	.log-item.type-error {
		background: rgba(231, 76, 60, 0.1);
		color: #e74c3c;
	}

	.log-item.type-system {
		background: rgba(155, 89, 182, 0.1);
		color: #9b59b6;
	}

	@media (max-width: 768px) {
		.expedition-title {
			font-size: 36px;
		}

		.difficulty-cards {
			grid-template-columns: 1fr;
		}

		.stats-left {
			gap: 16px;
		}

		.final-card {
			padding: 32px 20px;
		}

		.log-panel {
			display: none;
		}

		.stat-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

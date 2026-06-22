<script>
	import GameBoard from '$lib/components/GameBoard.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	import RoomLobby from '$lib/components/RoomLobby.svelte';
	import RoomPanel from '$lib/components/RoomPanel.svelte';
	import { seasonStore } from '$lib/stores/seasonStore.js';
	import { roomStore, isInRoom, isPlaying } from '$lib/stores/roomStore.js';
	import { achievementStore, totalAchievementPoints, unlockedCount, totalAchievementsCount } from '$lib/stores/achievementStore.js';
	import AchievementPanel from '$lib/components/AchievementPanel.svelte';
	import AchievementToast from '$lib/components/AchievementToast.svelte';
	import { RANK_TIERS, RANK_SUB_TIERS } from '$lib/config/seasonConfig.js';
	/** @typedef {import('$lib/config/seasonConfig.js').RankTier} RankTier */
	/** @typedef {import('$lib/config/seasonConfig.js').RankSubTier} RankSubTier */
	
	/** @type {'menu' | 'solo' | 'multiplayer' | 'playing'} */
	let viewMode = 'menu';
	let showAchievementPanel = false;

	function enterSoloGame() {
		viewMode = 'solo';
	}

	function enterMultiplayer() {
		viewMode = 'multiplayer';
	}

	function enterLegion() {
		window.location.href = '/legion';
	}

	function enterSeason() {
		window.location.href = '/season';
	}

	function goBackToMenu() {
		viewMode = 'menu';
	}

	$: if (viewMode === 'multiplayer' && $isPlaying) {
		viewMode = 'playing';
	}

	$: if (viewMode === 'playing' && !$isInRoom) {
		viewMode = 'menu';
	}

	/**
	 * @param {string} rankId
	 * @param {number} subTierId
	 * @returns {string}
	 */
	function getRankDisplay(rankId, subTierId) {
		const r = RANK_TIERS.find(/** @param {RankTier} t */ t => t.id === rankId) || RANK_TIERS[0];
		const st = RANK_SUB_TIERS.find(/** @param {RankSubTier} t */ t => t.id === subTierId) || RANK_SUB_TIERS[0];
		if (rankId === 'grandmaster') return `${r.icon} ${r.name}`;
		return `${r.icon} ${r.name} ${st.name}`;
	}
</script>

{#if viewMode === 'menu'}
	<div class="main-menu">
		<div class="menu-content">
			<h1 class="game-title">⚔️ 战棋军团</h1>
			<p class="game-subtitle">战术策略 · 军团养成 · 卡牌对决</p>
			
			<div class="menu-buttons">
				<button class="menu-btn primary" on:click={enterSoloGame}>
					🎮 单人战斗
				</button>
				<button class="menu-btn multiplayer" on:click={enterMultiplayer}>
					⚔️ 多人对战
				</button>
				<button class="menu-btn secondary" on:click={enterLegion}>
					🏰 军团养成
				</button>
				<button class="menu-btn season" on:click={enterSeason}>
					🏅 赛季天梯
				</button>
				<button class="menu-btn achievement" on:click={() => showAchievementPanel = true}>
					🎖️ 成就中心
				</button>
			</div>

			{#if $seasonStore}
				<div class="season-badge" style="--rank-color: {RANK_TIERS.find((/** @type {RankTier} */ r) => r.id === $seasonStore.rank)?.color || '#c0c0c0'}">
					<span class="badge-rank">{getRankDisplay($seasonStore.rank, $seasonStore.subTier)}</span>
					<span class="badge-points">{$seasonStore.points} 分</span>
					{#if $seasonStore.winStreak >= 3}
						<span class="badge-streak">🔥{$seasonStore.winStreak}连胜</span>
					{/if}
				</div>
			{/if}
			
			{#if $achievementStore}
				<div class="achievement-badge">
					<span class="badge-icon">🎖️</span>
					<span class="badge-points">{$totalAchievementPoints} 成就点</span>
					<span class="badge-count">已解锁 {$unlockedCount}/{$totalAchievementsCount}</span>
				</div>
			{/if}
			
			<div class="menu-features">
				<div class="feature">
					<span class="feature-icon">🎖️</span>
					<h3>单位招募</h3>
					<p>招募不同稀有度的兵种，组建你的专属军团</p>
				</div>
				<div class="feature">
					<span class="feature-icon">⬆️</span>
					<h3>升级转职</h3>
					<p>培养单位升级，解锁专精，晋升星级</p>
				</div>
				<div class="feature">
					<span class="feature-icon">⚔️</span>
					<h3>阵容搭配</h3>
					<p>多种阵容自由组合，发挥协同作战威力</p>
				</div>
				<div class="feature">
					<span class="feature-icon">🏅</span>
					<h3>赛季天梯</h3>
					<p>积分对决、段位晋升、赛季重置，攀登巅峰</p>
				</div>
			</div>
		</div>
	</div>
{:else if viewMode === 'multiplayer'}
	<div class="multiplayer-screen">
		<RoomLobby />
	</div>
{:else if viewMode === 'playing'}
	<div class="game-container multiplayer-game">
		<GameUI />
		<GameBoard />
		<div class="room-panel-wrapper">
			<RoomPanel />
		</div>
	</div>
{:else}
	<div class="game-container">
		<GameUI />
		<GameBoard />
	</div>
{/if}

<AchievementToast />
<AchievementPanel bind:show={showAchievementPanel} />

<style>
	.main-menu {
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
		color: #fff;
		overflow: auto;
	}
	
	.menu-content {
		text-align: center;
		max-width: 900px;
		padding: 40px 20px;
	}
	
	.game-title {
		font-size: 56px;
		margin: 0 0 12px 0;
		background: linear-gradient(135deg, #ffd700, #ff9800, #e74c3c);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-shadow: 0 0 40px rgba(255, 215, 0, 0.3);
	}
	
	.game-subtitle {
		font-size: 18px;
		color: #aaa;
		margin: 0 0 40px 0;
	}
	
	.menu-buttons {
		display: flex;
		gap: 20px;
		justify-content: center;
		margin-bottom: 60px;
		flex-wrap: wrap;
	}
	
	.menu-btn {
		padding: 18px 48px;
		font-size: 18px;
		font-weight: bold;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.menu-btn.primary {
		background: linear-gradient(135deg, #e74c3c, #c0392b);
		color: white;
		box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
	}
	
	.menu-btn.primary:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(231, 76, 60, 0.6);
	}
	
	.menu-btn.secondary {
		background: linear-gradient(135deg, #3498db, #2980b9);
		color: white;
		box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
	}
	
	.menu-btn.secondary:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(52, 152, 219, 0.6);
	}

	.menu-btn.season {
		background: linear-gradient(135deg, #ffd700, #ff9800);
		color: #1a1a2e;
		box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
	}

	.menu-btn.season:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(255, 215, 0, 0.6);
	}

	.menu-btn.achievement {
		background: linear-gradient(135deg, #e91e63, #c2185b);
		color: white;
		box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
	}

	.menu-btn.achievement:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(233, 30, 99, 0.6);
	}

	.achievement-badge {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 12px 24px;
		margin-bottom: 20px;
		margin-left: 12px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #e91e63;
		border-radius: 12px;
	}

	.achievement-badge .badge-icon {
		font-size: 20px;
	}

	.achievement-badge .badge-points {
		font-size: 16px;
		font-weight: bold;
		color: #e91e63;
	}

	.achievement-badge .badge-count {
		font-size: 14px;
		color: #ccc;
	}

	.season-badge {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 12px 24px;
		margin-bottom: 40px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--rank-color);
		border-radius: 12px;
	}

	.badge-rank {
		font-size: 16px;
		font-weight: bold;
		color: var(--rank-color);
	}

	.badge-points {
		font-size: 14px;
		color: #ccc;
	}

	.badge-streak {
		font-size: 14px;
		color: #ff5722;
		font-weight: bold;
	}
	
	.menu-features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 24px;
	}
	
	.feature {
		padding: 24px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		transition: all 0.3s ease;
	}
	
	.feature:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 215, 0, 0.3);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}
	
	.feature-icon {
		font-size: 40px;
		display: block;
		margin-bottom: 12px;
	}
	
	.feature h3 {
		margin: 0 0 8px 0;
		font-size: 18px;
		color: #ffd700;
	}
	
	.feature p {
		margin: 0;
		font-size: 14px;
		color: #aaa;
		line-height: 1.5;
	}
	
	.menu-btn.multiplayer {
		background: linear-gradient(135deg, #9b59b6, #8e44ad);
		color: white;
		box-shadow: 0 6px 20px rgba(155, 89, 182, 0.4);
	}

	.menu-btn.multiplayer:hover {
		transform: translateY(-3px);
		box-shadow: 0 10px 30px rgba(155, 89, 182, 0.6);
	}

	.multiplayer-screen {
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
		color: #fff;
		overflow: auto;
		padding-top: 40px;
	}

	.multiplayer-game {
		position: relative;
	}

	.room-panel-wrapper {
		position: fixed;
		top: 10px;
		right: 10px;
		width: 280px;
		z-index: 100;
	}

	.game-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #1a1a2e;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	}
	
	@media (max-width: 640px) {
		.game-title {
			font-size: 36px;
		}
		
		.game-subtitle {
			font-size: 14px;
		}
		
		.menu-btn {
			padding: 14px 32px;
			font-size: 16px;
		}
		
		.menu-features {
			grid-template-columns: 1fr;
		}

		.room-panel-wrapper {
			width: 220px;
		}
	}
</style>

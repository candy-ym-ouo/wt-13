<script>
	import GameBoard from '$lib/components/GameBoard.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
	
	let showMainMenu = true;
	
	function enterGame() {
		showMainMenu = false;
	}
	
	function enterLegion() {
		window.location.href = '/legion';
	}
</script>

{#if showMainMenu}
	<div class="main-menu">
		<div class="menu-content">
			<h1 class="game-title">⚔️ 战棋军团</h1>
			<p class="game-subtitle">战术策略 · 军团养成 · 卡牌对决</p>
			
			<div class="menu-buttons">
				<button class="menu-btn primary" on:click={enterGame}>
					🎮 开始战斗
				</button>
				<button class="menu-btn secondary" on:click={enterLegion}>
					🏰 军团养成
				</button>
			</div>
			
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
					<span class="feature-icon">🃏</span>
					<h3>卡牌奖励</h3>
					<p>战斗获取卡牌，强化你的战术选择</p>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="game-container">
		<GameUI />
		<GameBoard />
	</div>
{/if}

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
	}
</style>

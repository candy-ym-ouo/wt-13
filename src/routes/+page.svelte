<script>
	import GameBoard from '$lib/components/GameBoard.svelte';
	import GameUI from '$lib/components/GameUI.svelte';
</script>

<div class="game-container">
	<GameUI />
	<GameBoard />
</div>

<style>
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
</style>

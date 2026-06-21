<script>
  import SeasonLadder from '$lib/components/SeasonLadder.svelte';
</script>

<svelte:head>
  <title>赛季天梯 - 战棋军团</title>
</svelte:head>

<div class="season-page">
  <div class="page-header">
    <a href="/" class="back-btn">← 返回</a>
    <h1 class="page-title">🏅 赛季天梯</h1>
    <div class="header-spacer"></div>
  </div>
  <SeasonLadder />
</div>

<style>
  .season-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%);
    color: #fff;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .back-btn {
    color: #aaa;
    text-decoration: none;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .back-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .page-title {
    margin: 0;
    font-size: 22px;
    background: linear-gradient(135deg, #ffd700, #ff9800);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-spacer {
    width: 80px;
  }
</style>

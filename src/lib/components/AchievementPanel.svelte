<script>
  import {
    ACHIEVEMENT_CATEGORY,
    ACHIEVEMENT_CATEGORY_CONFIG,
    ACHIEVEMENT_RARITY_CONFIG,
    getAchievementById
  } from '$lib/config/achievementConfig.js';
  import { achievementStore, totalAchievementPoints, unlockedCount, totalAchievementsCount, achievementsByCategory } from '$lib/stores/achievementStore.js';
  import { legionStore } from '$lib/stores/legionStore.js';
  import { CARD_RARITY_COLORS, CARD_RARITY_LABELS, eventCards } from '$lib/config/eventCardConfig.js';

  export let show = false;

  let activeCategory = ACHIEVEMENT_CATEGORY.BATTLE;
  let claimedMessage = null;

  function closePanel() {
    show = false;
    claimedMessage = null;
  }

  function claimReward(achievementId) {
    const result = achievementStore.claimReward(achievementId);
    if (result.success) {
      const achievement = getAchievementById(achievementId);
      claimedMessage = `已领取【${achievement?.name}】奖励！`;
      if (result.rewards.gold > 0) {
        legionStore.addCurrency('gold', result.rewards.gold);
      }
      achievementStore.checkProgress($legionStore);
      setTimeout(() => {
        claimedMessage = null;
      }, 3000);
    }
  }

  function getCardInfo(cardId) {
    return eventCards.find(c => c.id === cardId);
  }

  $: categories = Object.values(ACHIEVEMENT_CATEGORY).map(cat => ({
    id: cat,
    ...ACHIEVEMENT_CATEGORY_CONFIG[cat]
  }));

  $: displayAchievements = $achievementStore ? (() => {
    const all = [];
    for (const key in $achievementsByCategory) {
      if (key === activeCategory) {
        all.push(...($achievementsByCategory[key] || []));
      }
    }
    return all.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (a.stageOrder && b.stageOrder) return a.stageOrder - b.stageOrder;
      return 0;
    });
  })() : [];

  function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toString();
  }
</script>

{#if show}
  <div class="achievement-overlay" on:click={closePanel}>
    <div class="achievement-panel" on:click|stopPropagation>
      <div class="panel-header">
        <h2>🎖️ 任务成就中心</h2>
        <button class="close-btn" on:click={closePanel}>✕</button>
      </div>

      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-icon">🏆</span>
          <div class="stat-info">
            <span class="stat-value">{$totalAchievementPoints}</span>
            <span class="stat-label">成就点数</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⭐</span>
          <div class="stat-info">
            <span class="stat-value">{$unlockedCount} / {$totalAchievementsCount}</span>
            <span class="stat-label">已解锁</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">⚔️</span>
          <div class="stat-info">
            <span class="stat-value">{$achievementStore.stats.totalBattles}</span>
            <span class="stat-label">战斗场次</span>
          </div>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💀</span>
          <div class="stat-info">
            <span class="stat-value">{$achievementStore.stats.totalKills}</span>
            <span class="stat-label">累计击杀</span>
          </div>
        </div>
      </div>

      <div class="category-tabs">
        {#each categories as cat}
          <button
            class="tab-btn {activeCategory === cat.id ? 'active' : ''}"
            style="--cat-color: {cat.color}"
            on:click={() => activeCategory = cat.id}
          >
            <span class="tab-icon">{cat.icon}</span>
            <span class="tab-label">{cat.name}</span>
          </button>
        {/each}
      </div>

      {#if claimedMessage}
        <div class="claim-success">
          ✅ {claimedMessage}
        </div>
      {/if}

      <div class="achievement-list">
        {#each displayAchievements as achievement}
          {@const rarityCfg = ACHIEVEMENT_RARITY_CONFIG[achievement.rarity]}
          {@const isUnlocked = achievement.unlocked}
          {@const isClaimed = achievement.claimed}
          {@const isHidden = achievement.isHidden && !isUnlocked}
          <div
            class="achievement-card {isUnlocked ? 'unlocked' : 'locked'} {isHidden ? 'hidden-card' : ''}"
            style="--rarity-color: {rarityCfg.color}"
          >
            <div class="card-icon">
              {#if isHidden}
                ❓
              {:else}
                {achievement.icon}
              {/if}
            </div>
            <div class="card-content">
              <div class="card-header">
                <h3 class="card-title">
                  {#if isHidden}
                    ??? 神秘成就
                  {:else}
                    {achievement.name}
                  {/if}
                  <span class="rarity-tag" style="background: {rarityCfg.color};">
                    {rarityCfg.name} · {rarityCfg.points}点
                  </span>
                </h3>
              </div>
              <p class="card-desc">
                {#if isHidden}
                  完成特定条件解锁该成就
                {:else}
                  {achievement.description}
                {/if}
              </p>

              {#if !isHidden}
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    style="width: {Math.min(100, achievement.progress.percentage)}%;"
                  ></div>
                  <span class="progress-text">
                    {#if isUnlocked}
                      ✅ 已完成
                    {:else}
                      {achievement.progress.current} / {achievement.progress.target} ({achievement.progress.percentage}%)
                    {/if}
                  </span>
                </div>
              {/if}

              {#if isUnlocked && !isHidden}
                <div class="rewards-section">
                  <span class="rewards-label">🎁 奖励：</span>
                  {#if achievement.rewards.gold > 0}
                    <span class="reward-tag gold">💰 {formatNumber(achievement.rewards.gold)}</span>
                  {/if}
                  {#if achievement.rewards.exp > 0}
                    <span class="reward-tag exp">✨ {formatNumber(achievement.rewards.exp)} EXP</span>
                  {/if}
                  {#each achievement.rewards.cards as cardId}
                    {@const card = getCardInfo(cardId)}
                    {#if card}
                      <span class="reward-tag card" style="border-color: {CARD_RARITY_COLORS[card.rarity]};">
                        {card.icon} {card.name}
                      </span>
                    {/if}
                  {/each}
                  {#each achievement.rewards.unlockCards as cardId}
                    {@const card = getCardInfo(cardId)}
                    {#if card}
                      <span class="reward-tag unlock" style="border-color: {CARD_RARITY_COLORS[card.rarity]};">
                        🔓 解锁 {card.icon} {card.name}
                      </span>
                    {/if}
                  {/each}

                  {#if !isClaimed}
                    <button class="claim-btn" on:click={() => claimReward(achievement.id)}>
                      领取奖励
                    </button>
                  {:else}
                    <span class="claimed-tag">✓ 已领取</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if displayAchievements.length === 0}
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>该分类暂无成就</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .achievement-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .achievement-panel {
    background: linear-gradient(135deg, #1e1e3c, #141428);
    border: 2px solid #ffd700;
    border-radius: 20px;
    width: 90vw;
    max-width: 800px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    color: #fff;
    animation: slideUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 215, 0, 0.2);
  }

  .panel-header h2 {
    margin: 0;
    font-size: 24px;
    background: linear-gradient(135deg, #ffd700, #ff9800);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 18px;
    transition: all 0.3s;
  }

  .close-btn:hover {
    background: rgba(255, 76, 76, 0.4);
    transform: scale(1.1);
  }

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 16px 24px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }

  .stat-icon {
    font-size: 28px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 18px;
    font-weight: bold;
    color: #ffd700;
  }

  .stat-label {
    font-size: 11px;
    color: #888;
  }

  .category-tabs {
    display: flex;
    gap: 8px;
    padding: 12px 24px;
    overflow-x: auto;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 10px;
    color: #aaa;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
    font-size: 14px;
  }

  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .tab-btn.active {
    background: rgba(255, 215, 0, 0.15);
    border-color: var(--cat-color);
    color: #fff;
  }

  .tab-icon {
    font-size: 16px;
  }

  .claim-success {
    margin: 12px 24px 0;
    padding: 12px 16px;
    background: rgba(46, 204, 113, 0.15);
    border: 1px solid #2ecc71;
    border-radius: 10px;
    color: #2ecc71;
    text-align: center;
    font-weight: 500;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .achievement-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px 24px;
  }

  .achievement-card {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    margin-bottom: 12px;
    transition: all 0.3s;
  }

  .achievement-card.unlocked {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 152, 0, 0.05));
    border-color: var(--rarity-color);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.15);
  }

  .achievement-card.locked {
    opacity: 0.7;
  }

  .achievement-card.hidden-card {
    background: linear-gradient(135deg, rgba(155, 89, 182, 0.08), rgba(142, 68, 173, 0.05));
    border-color: rgba(155, 89, 182, 0.4);
  }

  .card-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    flex-shrink: 0;
  }

  .achievement-card.unlocked .card-icon {
    background: linear-gradient(135deg, var(--rarity-color), rgba(255, 215, 0, 0.4));
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
  }

  .card-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .rarity-tag {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 10px;
    color: #fff;
    font-weight: 500;
  }

  .card-desc {
    margin: 0 0 10px;
    font-size: 13px;
    color: #aaa;
    line-height: 1.5;
  }

  .progress-bar {
    position: relative;
    height: 24px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffd700, #ff9800);
    border-radius: 12px;
    transition: width 0.5s ease;
  }

  .achievement-card.unlocked .progress-fill {
    background: linear-gradient(90deg, #2ecc71, #27ae60);
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .rewards-section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .rewards-label {
    font-size: 12px;
    color: #ffd700;
    font-weight: 500;
  }

  .reward-tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 8px;
    font-weight: 500;
  }

  .reward-tag.gold {
    background: rgba(255, 215, 0, 0.15);
    color: #ffd700;
  }

  .reward-tag.exp {
    background: rgba(52, 152, 219, 0.15);
    color: #3498db;
  }

  .reward-tag.card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid;
  }

  .reward-tag.unlock {
    background: rgba(46, 204, 113, 0.1);
    border: 1px solid;
    color: #2ecc71;
  }

  .claim-btn {
    margin-left: auto;
    padding: 6px 16px;
    background: linear-gradient(135deg, #ffd700, #ff9800);
    border: none;
    border-radius: 8px;
    color: #1a1a2e;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .claim-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
  }

  .claimed-tag {
    margin-left: auto;
    font-size: 12px;
    color: #2ecc71;
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
  }

  @media (max-width: 640px) {
    .achievement-panel {
      width: 95vw;
      max-height: 90vh;
    }

    .stats-bar {
      grid-template-columns: repeat(2, 1fr);
    }

    .achievement-card {
      flex-direction: column;
      gap: 12px;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }
  }
</style>

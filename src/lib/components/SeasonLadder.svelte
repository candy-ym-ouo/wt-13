<script>
  import {
    seasonStore,
    currentRankInfo,
    currentSubTierInfo,
    pointsToNextRank,
    rankProgress,
    totalMatches,
    winRate
  } from '$lib/stores/seasonStore.js';
  import { RANK_TIERS, RANK_SUB_TIERS, SEASON_REWARDS, PROMOTION_MATCHES } from '$lib/config/seasonConfig.js';

  export let showHistory = false;

  $: season = $seasonStore;
  $: rank = $currentRankInfo;
  $: subTier = $currentSubTierInfo;
  $: progress = $rankProgress;
  $: nextPts = $pointsToNextRank;
  $: matches = $totalMatches;
  $: wr = $winRate;

  $: daysLeft = (() => {
    if (!season || !season.endTime) return 0;
    const remaining = season.endTime - Date.now();
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  })();

  $: seasonHistory = $seasonStore.getSeasonHistory();

  $: rankChangeMsg = (() => {
    if (!season || !season.lastRankChange) return null;
    const change = season.lastRankChange;
    if (change.type === 'promote') {
      const fromRank = RANK_TIERS.find(r => r.id === change.from);
      const toRank = RANK_TIERS.find(r => r.id === change.to);
      return { type: 'promote', msg: `段位晋升！${fromRank?.icon || ''}${fromRank?.name || ''} → ${toRank?.icon || ''}${toRank?.name || ''}`, color: '#4caf50' };
    } else if (change.type === 'demote') {
      const fromRank = RANK_TIERS.find(r => r.id === change.from);
      const toRank = RANK_TIERS.find(r => r.id === change.to);
      return { type: 'demote', msg: `段位下降 ${fromRank?.icon || ''}${fromRank?.name || ''} → ${toRank?.icon || ''}${toRank?.name || ''}`, color: '#f44336' };
    } else if (change.type === 'demote_promo') {
      const fromRank = RANK_TIERS.find(r => r.id === change.from);
      const toRank = RANK_TIERS.find(r => r.id === change.to);
      return { type: 'demote', msg: `晋升赛未通过 ${fromRank?.icon || ''}${fromRank?.name || ''} → ${toRank?.icon || ''}${toRank?.name || ''}`, color: '#ff9800' };
    }
    return null;
  })();

  function getRankDisplay(rankId, subTierId) {
    const r = RANK_TIERS.find(t => t.id === rankId) || RANK_TIERS[0];
    const st = RANK_SUB_TIERS.find(t => t.id === subTierId) || RANK_SUB_TIERS[0];
    if (rankId === 'grandmaster') return `${r.icon} ${r.name}`;
    return `${r.icon} ${r.name} ${st.name}`;
  }

  function getPointsInRank() {
    if (!season) return 0;
    const r = RANK_TIERS.find(t => t.id === season.rank) || RANK_TIERS[0];
    return season.points - r.minPoints;
  }

  function getRankRange() {
    if (!season) return 0;
    const r = RANK_TIERS.find(t => t.id === season.rank) || RANK_TIERS[0];
    return r.maxPoints === Infinity ? 3000 : (r.maxPoints - r.minPoints);
  }

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function handleResetSeason() {
    if (confirm('确定要重置当前赛季吗？这将结算当前段位并开始新赛季。')) {
      seasonStore.resetSeason();
    }
  }

  function dismissRankChange() {
    seasonStore.clearLastRankChange();
  }
</script>

<div class="season-ladder">
  <div class="season-header">
    <div class="season-id">{season?.seasonId || 'S0000'}</div>
    <div class="season-timer">
      <span class="timer-icon">⏱️</span>
      <span class="timer-text">{daysLeft}天后结束</span>
    </div>
  </div>

  {#if rankChangeMsg}
    <div class="rank-change-banner" style="border-color: {rankChangeMsg.color};" on:click={dismissRankChange}>
      <span class="rank-change-text" style="color: {rankChangeMsg.color};">{rankChangeMsg.msg}</span>
      {#if season?.lastPointChange !== undefined && season?.lastPointChange !== null}
        <span class="rank-change-pts" style="color: {season.lastPointChange >= 0 ? '#4caf50' : '#f44336'};">
          {season.lastPointChange >= 0 ? '+' : ''}{season.lastPointChange}积分
        </span>
      {/if}
      <span class="rank-change-close">✕</span>
    </div>
  {/if}

  <div class="rank-display" style="--rank-color: {rank.color};">
    <div class="rank-icon-large">{rank.icon}</div>
    <div class="rank-info">
      <div class="rank-name">{getRankDisplay(season?.rank, season?.subTier)}</div>
      <div class="rank-points">
        <span class="points-value">{season?.points || 0}</span>
        <span class="points-label">积分</span>
        {#if nextPts > 0}
          <span class="points-next">距下一段还需 {nextPts} 分</span>
        {:else}
          <span class="points-next">已达到最高段位！</span>
        {/if}
      </div>
      <div class="rank-progress-bar">
        <div class="rank-progress-fill" style="width: {progress}%; background: {rank.color};"></div>
      </div>
      <div class="rank-progress-label">{progress}%</div>
    </div>
  </div>

  {#if season?.promotionProgress?.active}
    <div class="promotion-section">
      <div class="promotion-title">🔥 晋升赛</div>
      <div class="promotion-detail">
        <span>{season.promotionProgress.wins}胜 / {season.promotionProgress.matches}场</span>
        <span class="promotion-require">({PROMOTION_MATCHES}场中需{Math.ceil(PROMOTION_MATCHES * 0.67)}胜晋级)</span>
      </div>
      <div class="promotion-matches">
        {#each Array(PROMOTION_MATCHES) as _, i}
          <div class="promo-match" class:promo-win={i < season.promotionProgress.wins} class:promo-loss={i < season.promotionProgress.matches && i >= season.promotionProgress.wins}>
            {#if i < season.promotionProgress.matches}
              {#if i < season.promotionProgress.wins}
                ✅
              {:else}
                ❌
              {/if}
            {:else}
              ➖
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value" style="color: #4caf50;">{season?.totalWins || 0}</div>
      <div class="stat-label">胜利</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #f44336;">{season?.totalLosses || 0}</div>
      <div class="stat-label">失败</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #ff9800;">{season?.totalDraws || 0}</div>
      <div class="stat-label">平局</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{wr}%</div>
      <div class="stat-label">胜率</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #e91e63;">🔥{season?.winStreak || 0}</div>
      <div class="stat-label">连胜</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #ffd700;">{season?.maxPoints || 0}</div>
      <div class="stat-label">最高积分</div>
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="rank-ladder">
    <h3 class="section-title">🏆 段位天梯</h3>
    <div class="ladder-list">
      {#each RANK_TIERS as tier}
        {@const isCurrent = tier.id === season?.rank}
        {@const isReached = RANK_TIERS.findIndex(r => r.id === tier.id) <= RANK_TIERS.findIndex(r => r.id === season?.maxRank)}
        <div class="ladder-item" class:ladder-current={isCurrent} class:ladder-reached={isReached && !isCurrent} style="--tier-color: {tier.color};">
          <div class="ladder-icon">{tier.icon}</div>
          <div class="ladder-name" style="color: {isCurrent ? tier.color : (isReached ? '#ccc' : '#666')};">{tier.name}</div>
          <div class="ladder-range">{tier.minPoints}{tier.maxPoints === Infinity ? '+' : '-' + tier.maxPoints}</div>
          {#if isCurrent}
            <div class="ladder-marker">◀ 当前</div>
          {/if}
          {#if isReached && !isCurrent}
            <div class="ladder-reached-mark">✓</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="section-divider"></div>

  <div class="match-history">
    <h3 class="section-title">📋 近期战绩</h3>
    {#if season?.matchHistory && season.matchHistory.length > 0}
      <div class="history-list">
        {#each season.matchHistory.slice(0, 10) as match}
          <div class="history-item" class:history-win={match.result === 'win'} class:history-lose={match.result === 'lose'} class:history-draw={match.result === 'draw'}>
            <div class="history-result">
              {#if match.result === 'win'}
                ✅ 胜利
              {:else if match.result === 'lose'}
                ❌ 失败
              {:else}
                🤝 平局
              {/if}
            </div>
            <div class="history-points" style="color: {match.pointChange >= 0 ? '#4caf50' : '#f44336'};">
              {match.pointChange >= 0 ? '+' : ''}{match.pointChange}
            </div>
            <div class="history-rank">{getRankDisplay(match.rankAfter, match.subTierAfter)}</div>
            <div class="history-time">{formatTime(match.timestamp)}</div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="no-history">暂无战绩记录，开始对战获取积分吧！</div>
    {/if}
  </div>

  <div class="section-divider"></div>

  <div class="season-rewards-section">
    <h3 class="section-title">🎁 赛季奖励</h3>
    <div class="rewards-list">
      {#each RANK_TIERS as tier}
        {@const rewards = SEASON_REWARDS[tier.id]}
        {@const isCurrentOrAbove = RANK_TIERS.findIndex(r => r.id === tier.id) <= RANK_TIERS.findIndex(r => r.id === season?.rank)}
        {@const isCurrent = tier.id === season?.rank}
        <div class="reward-item" class:reward-current={isCurrent} class:reward-locked={!isCurrentOrAbove} style="--tier-color: {tier.color};">
          <div class="reward-rank" style="color: {tier.color};">
            {tier.icon} {tier.name}
          </div>
          <div class="reward-details">
            <span class="reward-gold">💰{rewards.gold}</span>
            <span class="reward-ticket">🎫{rewards.recruitTicket}</span>
            {#if rewards.promotionStone}
              <span class="reward-stone">💎{rewards.promotionStone}</span>
            {/if}
          </div>
          <div class="reward-title">「{rewards.title}」</div>
        </div>
      {/each}
    </div>
  </div>

  {#if seasonHistory && seasonHistory.length > 0}
    <div class="section-divider"></div>
    <div class="past-seasons">
      <h3 class="section-title">📚 历史赛季</h3>
      <div class="past-list">
        {#each seasonHistory as past}
          <div class="past-item">
            <div class="past-season-id">{past.seasonId}</div>
            <div class="past-rank">{getRankDisplay(past.settledRank || past.finalRank, past.finalSubTier || 3)}</div>
            <div class="past-stats">
              <span style="color:#4caf50">{past.totalWins}胜</span>
              <span style="color:#f44336">{past.totalLosses}负</span>
              <span style="color:#ff9800">{past.totalDraws}平</span>
            </div>
            <div class="past-max">最高：{getRankDisplay(past.maxRank, past.maxSubTier || 3)}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="season-actions">
    <button class="btn-reset" on:click={handleResetSeason}>
      🔄 重置赛季
    </button>
  </div>
</div>

<style>
  .season-ladder {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
    color: #eee;
  }

  .season-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 152, 0, 0.1));
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 12px;
  }

  .season-id {
    font-size: 22px;
    font-weight: bold;
    color: #ffd700;
  }

  .season-timer {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ff9800;
    font-size: 14px;
  }

  .timer-icon {
    font-size: 18px;
  }

  .rank-change-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px 20px;
    margin-bottom: 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 2px solid;
    border-radius: 10px;
    cursor: pointer;
    animation: bannerPulse 1.5s ease infinite;
  }

  @keyframes bannerPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.1); }
    50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.2); }
  }

  .rank-change-text {
    font-size: 16px;
    font-weight: bold;
  }

  .rank-change-pts {
    font-size: 14px;
    font-weight: 600;
  }

  .rank-change-close {
    font-size: 12px;
    color: #888;
    margin-left: auto;
  }

  .rank-display {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 28px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2));
    border: 2px solid var(--rank-color);
    border-radius: 16px;
    box-shadow: 0 0 30px color-mix(in srgb, var(--rank-color) 30%, transparent);
  }

  .rank-icon-large {
    font-size: 72px;
    filter: drop-shadow(0 0 10px var(--rank-color));
  }

  .rank-info {
    flex: 1;
  }

  .rank-name {
    font-size: 28px;
    font-weight: bold;
    color: var(--rank-color);
    margin-bottom: 8px;
  }

  .rank-points {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .points-value {
    font-size: 32px;
    font-weight: bold;
    color: #fff;
  }

  .points-label {
    font-size: 14px;
    color: #aaa;
  }

  .points-next {
    font-size: 12px;
    color: #888;
  }

  .rank-progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .rank-progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .rank-progress-label {
    font-size: 11px;
    color: #888;
    text-align: right;
  }

  .promotion-section {
    padding: 16px 20px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, rgba(255, 69, 0, 0.15), rgba(255, 152, 0, 0.1));
    border: 1px solid rgba(255, 69, 0, 0.4);
    border-radius: 12px;
  }

  .promotion-title {
    font-size: 18px;
    font-weight: bold;
    color: #ff5722;
    margin-bottom: 8px;
  }

  .promotion-detail {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .promotion-require {
    font-size: 12px;
    color: #888;
  }

  .promotion-matches {
    display: flex;
    gap: 8px;
  }

  .promo-match {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 16px;
  }

  .promo-win {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.15);
  }

  .promo-loss {
    border-color: #f44336;
    background: rgba(244, 67, 54, 0.15);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-card {
    padding: 16px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    text-align: center;
  }

  .stat-value {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #888;
  }

  .section-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    margin: 24px 0;
  }

  .section-title {
    font-size: 18px;
    font-weight: bold;
    color: #ffd700;
    margin: 0 0 16px 0;
  }

  .ladder-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ladder-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .ladder-current {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 152, 0, 0.05));
    border-color: var(--tier-color);
    box-shadow: 0 0 15px color-mix(in srgb, var(--tier-color) 25%, transparent);
  }

  .ladder-reached {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .ladder-icon {
    font-size: 24px;
  }

  .ladder-name {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
  }

  .ladder-range {
    font-size: 12px;
    color: #888;
  }

  .ladder-marker {
    font-size: 12px;
    color: var(--tier-color);
    font-weight: bold;
  }

  .ladder-reached-mark {
    font-size: 14px;
    color: #4caf50;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .history-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border-left: 3px solid #888;
    font-size: 14px;
  }

  .history-win {
    border-left-color: #4caf50;
    background: rgba(76, 175, 80, 0.06);
  }

  .history-lose {
    border-left-color: #f44336;
    background: rgba(244, 67, 54, 0.06);
  }

  .history-draw {
    border-left-color: #ff9800;
    background: rgba(255, 152, 0, 0.06);
  }

  .history-result {
    min-width: 70px;
  }

  .history-points {
    font-weight: bold;
    min-width: 50px;
  }

  .history-rank {
    flex: 1;
    color: #ccc;
  }

  .history-time {
    font-size: 12px;
    color: #666;
  }

  .no-history {
    text-align: center;
    color: #666;
    padding: 24px;
    font-size: 14px;
  }

  .rewards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .reward-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .reward-current {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 152, 0, 0.05));
    border-color: var(--tier-color);
  }

  .reward-locked {
    opacity: 0.4;
  }

  .reward-rank {
    min-width: 100px;
    font-weight: bold;
    font-size: 14px;
  }

  .reward-details {
    display: flex;
    gap: 10px;
    font-size: 13px;
    color: #ccc;
  }

  .reward-title {
    margin-left: auto;
    font-size: 12px;
    color: #999;
    font-style: italic;
  }

  .past-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .past-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    font-size: 14px;
  }

  .past-season-id {
    font-weight: bold;
    color: #ffd700;
    min-width: 60px;
  }

  .past-rank {
    min-width: 120px;
    color: #ccc;
  }

  .past-stats {
    display: flex;
    gap: 8px;
    font-size: 13px;
  }

  .past-max {
    margin-left: auto;
    font-size: 12px;
    color: #888;
  }

  .season-actions {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }

  .btn-reset {
    padding: 12px 32px;
    background: linear-gradient(135deg, #555, #333);
    border: 1px solid #666;
    border-radius: 10px;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-reset:hover {
    background: linear-gradient(135deg, #666, #444);
    color: #fff;
  }

  @media (max-width: 640px) {
    .season-ladder {
      padding: 12px;
    }

    .rank-display {
      flex-direction: column;
      text-align: center;
      gap: 12px;
      padding: 20px;
    }

    .rank-icon-large {
      font-size: 56px;
    }

    .rank-name {
      font-size: 22px;
    }

    .points-value {
      font-size: 26px;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .history-item {
      flex-wrap: wrap;
      gap: 6px;
    }

    .past-item {
      flex-wrap: wrap;
      gap: 6px;
    }
  }
</style>

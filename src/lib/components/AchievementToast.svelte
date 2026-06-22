<script>
  import { onMount, onDestroy } from 'svelte';
  import { achievementStore } from '$lib/stores/achievementStore.js';
  import { ACHIEVEMENT_RARITY_CONFIG } from '$lib/config/achievementConfig.js';

  let toasts = [];
  let checkInterval;
  let toastIdCounter = 0;

  function checkPendingToasts() {
    const toast = achievementStore.popToast();
    if (toast) {
      const id = ++toastIdCounter;
      toasts = [...toasts, { ...toast, _id: id }];
      setTimeout(() => {
        toasts = toasts.filter(t => t._id !== id);
      }, 4000);
    }
  }

  onMount(() => {
    checkInterval = setInterval(checkPendingToasts, 500);
  });

  onDestroy(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });

  function removeToast(id) {
    toasts = toasts.filter(t => t._id !== id);
  }
</script>

<div class="toast-container">
  {#each toasts as achievement (achievement._id)}
    {@const rarityCfg = ACHIEVEMENT_RARITY_CONFIG[achievement.rarity]}
    <div
      class="achievement-toast"
      style="--rarity-color: {rarityCfg.color}"
      on:click={() => removeToast(achievement._id)}
    >
      <div class="toast-glow"></div>
      <div class="toast-content">
        <div class="toast-icon">{achievement.icon}</div>
        <div class="toast-info">
          <div class="toast-unlock">🎊 成就解锁！</div>
          <div class="toast-name">{achievement.name}</div>
          <div class="toast-desc">{achievement.description}</div>
          <div class="toast-rewards">
            {#if achievement.rewards.gold > 0}
              <span class="reward-item">💰 {achievement.rewards.gold}</span>
            {/if}
            {#if achievement.rewards.exp > 0}
              <span class="reward-item">✨ {achievement.rewards.exp} EXP</span>
            {/if}
            {#if achievement.rewards.cards?.length > 0 || achievement.rewards.unlockCards?.length > 0}
              <span class="reward-item card-reward">🃏 {achievement.rewards.cards?.length || 0 + achievement.rewards.unlockCards?.length || 0}张卡牌</span>
            {/if}
            <span class="reward-points" style="color: {rarityCfg.color};">
              +{rarityCfg.points}点
            </span>
          </div>
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .achievement-toast {
    position: relative;
    background: linear-gradient(135deg, #1e1e3c, #141428);
    border: 2px solid var(--rarity-color);
    border-radius: 16px;
    padding: 16px 20px;
    min-width: 320px;
    max-width: 400px;
    color: #fff;
    cursor: pointer;
    pointer-events: auto;
    overflow: hidden;
    animation: toastIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.5),
      0 0 30px rgba(255, 215, 0, 0.2);
  }

  @keyframes toastIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .achievement-toast:hover {
    transform: scale(1.02);
    transition: transform 0.2s ease;
  }

  .toast-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--rarity-color), #ffd700, var(--rarity-color));
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .toast-content {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .toast-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    background: linear-gradient(135deg, var(--rarity-color), rgba(255, 215, 0, 0.4));
    border-radius: 12px;
    flex-shrink: 0;
    animation: iconBounce 0.6s ease infinite alternate;
  }

  @keyframes iconBounce {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
  }

  .toast-info {
    flex: 1;
    min-width: 0;
  }

  .toast-unlock {
    font-size: 12px;
    color: #ffd700;
    font-weight: 600;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .toast-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 4px;
    background: linear-gradient(135deg, #fff, #ffd700);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .toast-desc {
    font-size: 13px;
    color: #aaa;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .toast-rewards {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .reward-item {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .reward-item.card-reward {
    background: rgba(52, 152, 219, 0.15);
    color: #3498db;
  }

  .reward-points {
    margin-left: auto;
    font-size: 14px;
    font-weight: bold;
  }

  @media (max-width: 640px) {
    .toast-container {
      top: 10px;
      left: 10px;
      right: 10px;
    }

    .achievement-toast {
      min-width: auto;
      max-width: 100%;
    }
  }
</style>

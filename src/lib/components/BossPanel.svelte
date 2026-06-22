<script>
  import { gameState } from '$lib/stores/gameStore';
  import { getBossConfig, getBossSkill, BOSS_SKILL_TYPES } from '$lib/config/bossConfig.js';
  import { getCurrentPhase, getCircleAOETiles, getLineAOETiles, getFanAOETiles } from '$lib/utils/bossLogic.js';
  import { unitConfig } from '$lib/config/unitConfig';
  import { get } from 'svelte/store';

  /**
   * @typedef {import('../utils/cardSystem').Unit} Unit
   * @typedef {import('../config/bossConfig').BossConfig} BossConfig
   * @typedef {import('../config/bossConfig').BossSkill} BossSkill
   * @typedef {import('../utils/bossLogic').BossState} BossState
   */

  let state = get(gameState);
  const unsubscribe = gameState.subscribe(/** @param {any} s */ s => { state = s; });

  $: activeBossId = state?.activeBossId;
  $: bossState = state?.bossState;
  $: bossConfig = activeBossId ? getBossConfig(activeBossId) : null;
  $: bossUnit = state?.units?.find(/** @param {Unit} u */ u => u.id === bossState?.unitId);
  $: currentPhase = bossUnit && bossState && bossConfig ? getCurrentPhase(bossUnit, bossState, bossConfig) : null;
  $: hpPercent = bossUnit && bossUnit.maxHp > 0 ? (bossUnit.currentHp / bossUnit.maxHp) * 100 : 0;
  $: skillWarnings = bossState?.skillWarnings || {};
  $: skillCooldowns = bossState?.skillCooldowns || {};

  /**
   * @param {string} skillId
   * @returns {BossSkill | null}
   */
  function getSkill(skillId) {
    return getBossSkill(skillId);
  }

  /**
   * @param {string} skillType
   * @returns {string}
   */
  function getSkillTypeLabel(skillType) {
    const labels = {
      [BOSS_SKILL_TYPES.AOE_CIRCLE]: '范围攻击',
      [BOSS_SKILL_TYPES.AOE_LINE]: '直线攻击',
      [BOSS_SKILL_TYPES.AOE_FAN]: '扇形攻击',
      [BOSS_SKILL_TYPES.SUMMON]: '召唤',
      [BOSS_SKILL_TYPES.BUFF_SELF]: '自身增益',
      [BOSS_SKILL_TYPES.DEBUFF_AREA]: '范围减益',
      [BOSS_SKILL_TYPES.CHARGE]: '冲锋',
      [BOSS_SKILL_TYPES.HEAL_SELF]: '自我治疗'
    };
    return labels[skillType] || skillType;
  }

  /**
   * @param {{skillId: string, targetX: number, targetY: number, remainingTurns: number}} warning
   * @returns {string}
   */
  function getWarningTilesText(warning) {
    const skill = getSkill(warning.skillId);
    if (!skill) return '';

    const layout = state?.boardLayout;
    let tiles = [];

    switch (skill.type) {
      case BOSS_SKILL_TYPES.AOE_CIRCLE:
      case BOSS_SKILL_TYPES.DEBUFF_AREA:
        tiles = getCircleAOETiles(warning.targetX, warning.targetY, skill.aoeRadius || 2, layout);
        break;
      case BOSS_SKILL_TYPES.AOE_LINE:
        tiles = getLineAOETiles(bossUnit?.x || 0, bossUnit?.y || 0, warning.targetX, warning.targetY, skill.lineLength || 5, skill.lineWidth || 1, layout);
        break;
      case BOSS_SKILL_TYPES.AOE_FAN:
        tiles = getFanAOETiles(bossUnit?.x || 0, bossUnit?.y || 0, warning.targetX, warning.targetY, skill.aoeRadius || 3, skill.fanAngle || 90, layout);
        break;
      default:
        tiles = [{ x: warning.targetX, y: warning.targetY }];
    }

    return `影响 ${tiles.length} 格`;
  }
</script>

{#if activeBossId && bossConfig && bossUnit && bossState}
  <div class="boss-panel">
    <div class="boss-header" style="border-color: {currentPhase?.color || '#e74c3c'}">
      <div class="boss-icon">{bossConfig.icon || '👹'}</div>
      <div class="boss-info">
        <div class="boss-name">{bossConfig.name}</div>
        <div class="boss-phase" style="color: {currentPhase?.color || '#f39c12'}">
          {currentPhase?.icon || '⚔️'} {currentPhase?.name || '战斗中'}
        </div>
      </div>
      {#if bossState.isInvulnerable}
        <div class="invulnerable-badge">
          🛡️ 无敌
        </div>
      {/if}
    </div>

    <div class="boss-hp-section">
      <div class="hp-label">
        <span>生命</span>
        <span>{bossUnit.currentHp} / {bossUnit.maxHp}</span>
      </div>
      <div class="hp-bar-container">
        <div
          class="hp-bar"
          style="width: {hpPercent}%; background: {currentPhase?.color || '#e74c3c'}"
        />
        <div class="hp-bar-glow" style="width: {hpPercent}%; background: {currentPhase?.color || '#e74c3c'}" />
      </div>
      <div class="hp-percent">{Math.round(hpPercent)}%</div>
    </div>

    {#if currentPhase}
      <div class="phase-section">
        <div class="phase-title">阶段信息</div>
        <div class="phase-description">{currentPhase.description}</div>
        <div class="phase-modifiers">
          {#if currentPhase.statModifiers.attackMultiplier && currentPhase.statModifiers.attackMultiplier !== 1}
            <span class="modifier attack">⚔️ 攻击 ×{currentPhase.statModifiers.attackMultiplier.toFixed(1)}</span>
          {/if}
          {#if currentPhase.statModifiers.defenseMultiplier && currentPhase.statModifiers.defenseMultiplier !== 1}
            <span class="modifier defense">🛡️ 防御 ×{currentPhase.statModifiers.defenseMultiplier.toFixed(1)}</span>
          {/if}
          {#if currentPhase.statModifiers.moveRangeBonus}
            <span class="modifier move">👟 移动 +{currentPhase.statModifiers.moveRangeBonus}</span>
          {/if}
          {#if currentPhase.statModifiers.attackRangeBonus}
            <span class="modifier range">🎯 射程 +{currentPhase.statModifiers.attackRangeBonus}</span>
          {/if}
          {#if currentPhase.statModifiers.damageReduction}
            <span class="modifier reduction">💨 减伤 {Math.round(currentPhase.statModifiers.damageReduction * 100)}%</span>
          {/if}
        </div>
      </div>
    {/if}

    <div class="phases-progress">
      <div class="phases-title">阶段进度</div>
      <div class="phases-dots">
        {#each bossConfig.phases as phase}
          <div
            class="phase-dot {phase.id < bossState.currentPhaseId ? 'completed' : ''} {phase.id === bossState.currentPhaseId ? 'current' : ''}"
            style="background: {phase.id <= bossState.currentPhaseId ? phase.color : '#666'}"
            title="{phase.name}: {phase.description}"
          >
            {phase.icon}
          </div>
        {/each}
      </div>
    </div>

    <div class="skills-section">
      <div class="skills-title">首领技能</div>
      <div class="skills-list">
        {#each bossConfig.skills as skill}
          {#if currentPhase?.availableSkillIds.includes(skill.id)}
            <div
              class="skill-item {(skillCooldowns[skill.id] || 0) > 0 ? 'on-cooldown' : ''}"
              style="border-color: {skill.color || '#999'}"
            >
              <div class="skill-icon" style="background: {skill.color || '#666'}">
                {skill.icon || '✨'}
              </div>
              <div class="skill-info">
                <div class="skill-name">{skill.name}</div>
                <div class="skill-type">{getSkillTypeLabel(skill.type)}</div>
              </div>
              {#if (skillCooldowns[skill.id] || 0) > 0}
                <div class="skill-cooldown">CD: {skillCooldowns[skill.id]}</div>
              {:else}
                <div class="skill-ready">就绪</div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    {#if Object.keys(skillWarnings).length > 0}
      <div class="warnings-section">
        <div class="warnings-title">⚠️ 技能预警</div>
        <div class="warnings-list">
          {#each Object.values(skillWarnings) as warning}
            {@const skill = getSkill(warning.skillId)}
            {#if skill}
              <div class="warning-item" style="border-color: {skill.color || '#e74c3c'}">
                <div class="warning-icon" style="background: {skill.color || '#e74c3c'}">
                  {skill.icon || '⚠️'}
                </div>
                <div class="warning-info">
                  <div class="warning-name">{skill.name}</div>
                  <div class="warning-details">
                    目标: ({warning.targetX}, {warning.targetY}) · {getWarningTilesText(warning)}
                  </div>
                </div>
                <div class="warning-countdown">
                  {warning.remainingTurns} 回合后释放
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    <div class="victory-section">
      <div class="victory-title">🏆 胜利条件</div>
      <div class="victory-desc">{bossConfig.victoryCondition.description}</div>
      {#if bossConfig.victoryCondition.type === 'destroy_summons'}
        <div class="summon-progress">
          召唤物击杀: {bossState.summonKillCount || 0} / {bossConfig.victoryCondition.summonKillCount || 0}
          <div class="summon-bar">
            <div
              class="summon-fill"
              style="width: {Math.min(100, ((bossState.summonKillCount || 0) / (bossConfig.victoryCondition.summonKillCount || 1)) * 100)}%"
            />
          </div>
        </div>
      {/if}
      {#if bossConfig.victoryCondition.type === 'survive_turns'}
        <div class="turn-progress">
          已坚持: {bossState.bossTurnCount || 0} / {bossConfig.victoryCondition.turnCount || 0} 回合
          <div class="turn-bar">
            <div
              class="turn-fill"
              style="width: {Math.min(100, ((bossState.bossTurnCount || 0) / (bossConfig.victoryCondition.turnCount || 1)) * 100)}%"
            />
          </div>
        </div>
      {/if}
    </div>

    <div class="defeat-section">
      <div class="defeat-title">💀 失败条件</div>
      <div class="defeat-desc">{bossConfig.defeatCondition.description}</div>
      {#if bossConfig.defeatCondition.type === 'turn_limit_exceeded'}
        <div class="turn-limit">
          剩余回合: {Math.max(0, (bossConfig.defeatCondition.turnLimit || 0) - (bossState.bossTurnCount || 0))}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .boss-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    width: 320px;
    background: rgba(20, 20, 30, 0.95);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    border: 2px solid #e74c3c;
    z-index: 100;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }

  .boss-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid;
    margin-bottom: 12px;
  }

  .boss-icon {
    font-size: 48px;
    line-height: 1;
  }

  .boss-info {
    flex: 1;
  }

  .boss-name {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 4px;
  }

  .boss-phase {
    font-size: 14px;
    font-weight: 600;
  }

  .invulnerable-badge {
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: #fff;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .boss-hp-section {
    margin-bottom: 16px;
  }

  .hp-label {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #ccc;
    margin-bottom: 6px;
  }

  .hp-bar-container {
    position: relative;
    height: 20px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .hp-bar {
    height: 100%;
    border-radius: 10px;
    transition: width 0.3s ease;
  }

  .hp-bar-glow {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 10px;
    filter: blur(8px);
    opacity: 0.5;
    transition: width 0.3s ease;
  }

  .hp-percent {
    text-align: right;
    font-size: 12px;
    color: #888;
  }

  .phase-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .phase-title,
  .phases-title,
  .skills-title,
  .warnings-title,
  .victory-title,
  .defeat-title {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 8px;
  }

  .phase-description {
    font-size: 12px;
    color: #aaa;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .phase-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .modifier {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
  }

  .modifier.attack { color: #e74c3c; }
  .modifier.defense { color: #3498db; }
  .modifier.move { color: #2ecc71; }
  .modifier.range { color: #9b59b6; }
  .modifier.reduction { color: #f39c12; }

  .phases-progress {
    margin-bottom: 16px;
  }

  .phases-dots {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .phase-dot {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .phase-dot.completed {
    opacity: 1;
  }

  .phase-dot.current {
    opacity: 1;
    transform: scale(1.15);
    box-shadow: 0 0 15px currentColor;
  }

  .skills-section {
    margin-bottom: 16px;
  }

  .skills-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skill-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 2px solid;
    transition: all 0.2s ease;
  }

  .skill-item.on-cooldown {
    opacity: 0.6;
  }

  .skill-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .skill-info {
    flex: 1;
  }

  .skill-name {
    font-size: 13px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 2px;
  }

  .skill-type {
    font-size: 11px;
    color: #888;
  }

  .skill-cooldown {
    font-size: 12px;
    color: #e74c3c;
    font-weight: bold;
  }

  .skill-ready {
    font-size: 12px;
    color: #2ecc71;
    font-weight: bold;
  }

  .warnings-section {
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.5);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    animation: warningPulse 2s infinite;
  }

  @keyframes warningPulse {
    0%, 100% { background: rgba(231, 76, 60, 0.1); }
    50% { background: rgba(231, 76, 60, 0.2); }
  }

  .warnings-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .warning-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    border: 1px solid;
  }

  .warning-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .warning-info {
    flex: 1;
  }

  .warning-name {
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 2px;
  }

  .warning-details {
    font-size: 10px;
    color: #aaa;
  }

  .warning-countdown {
    font-size: 11px;
    color: #e74c3c;
    font-weight: bold;
    text-align: center;
    min-width: 60px;
  }

  .victory-section,
  .defeat-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .victory-desc,
  .defeat-desc {
    font-size: 12px;
    color: #aaa;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .summon-progress,
  .turn-progress,
  .turn-limit {
    font-size: 12px;
    color: #fff;
    margin-bottom: 6px;
  }

  .summon-bar,
  .turn-bar {
    height: 8px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 4px;
  }

  .summon-fill,
  .turn-fill {
    height: 100%;
    background: linear-gradient(90deg, #2ecc71, #27ae60);
    transition: width 0.3s ease;
  }

  .turn-limit {
    color: #e74c3c;
    font-weight: bold;
    text-align: center;
    font-size: 14px;
  }
</style>

<script>
  // @ts-nocheck
  import {
    guildStore,
    currentGuild,
    playerGuild,
    playerMember,
    playerRole,
    guildLevel,
    expToNextLevel,
    guildProgress,
    guildPower,
    pendingTasks,
    completedTasks,
    playerTasks,
    availableBosses,
    memberRankings,
    guildRankings,
    recentContributions,
    recentBattles,
    pendingApplications,
    hasPendingApplication,
    isInGuild,
    isGuildLeader,
    isGuildOfficer,
    sortedMembers
  } from '$lib/stores/guildStore.js';
  import {
    GUILD_MEMBER_ROLE,
    GUILD_ROLE_CONFIG,
    GUILD_TASK_CONFIG,
    GUILD_TASK_TEMPLATES,
    GUILD_BOSS_CONFIG,
    GUILD_TASK_DIFFICULTY,
    GUILD_DONATION_OPTIONS,
    RANKING_CATEGORY,
    RANKING_CONFIG,
    CONTRIBUTION_CONFIG,
    getGuildLevel
  } from '$lib/config/guildConfig.js';
  import { calculateGuildPower } from '$lib/utils/guildSystem.js';
  import { legionStore, totalPower } from '$lib/stores/legionStore.js';
  import { seasonStore } from '$lib/stores/seasonStore.js';
  import { achievementStore } from '$lib/stores/achievementStore.js';

  let activeTab = 'hall';
  let showCreateGuild = false;
  let showJoinGuild = false;
  let showCreateTask = false;
  let showDonate = false;
  let showAnnouncement = false;
  let showMemberDetail = null;
  let showGuildDetail = null;

  let newGuildName = '';
  let newGuildDescription = '';
  let newTaskTemplate = '';
  let newTaskName = '';
  let newTaskDescription = '';
  let newTaskDifficulty = 'normal';
  let newAnnouncementTitle = '';
  let newAnnouncementContent = '';
  let donateAmount = 1000;
  let selectedRankingCategory = 'total_contribution';
  let selectedGuildRankingCategory = 'guild_level';
  let searchGuildQuery = '';

  const tabs = [
    { id: 'hall', name: '公会大厅', icon: '🏰', showWhen: 'inGuild' },
    { id: 'members', name: '成员列表', icon: '👥', showWhen: 'inGuild' },
    { id: 'tasks', name: '公会任务', icon: '📋', showWhen: 'inGuild' },
    { id: 'boss', name: 'Boss攻坚', icon: '👹', showWhen: 'inGuild' },
    { id: 'ranking', name: '贡献排行', icon: '🏆', showWhen: 'inGuild' },
    { id: 'records', name: '战报记录', icon: '📊', showWhen: 'inGuild' },
    { id: 'manage', name: '公会管理', icon: '⚙️', showWhen: 'officer' },
    { id: 'browse', name: '浏览公会', icon: '🔍', showWhen: 'noGuild' }
  ];

  $: visibleTabs = tabs.filter(tab => {
    if (tab.showWhen === 'inGuild') return $isInGuild;
    if (tab.showWhen === 'officer') return $isGuildOfficer;
    if (tab.showWhen === 'noGuild') return !$isInGuild;
    return true;
  });

  $: filteredGuilds = $guildStore.allGuilds.filter(g =>
    g.name.toLowerCase().includes(searchGuildQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchGuildQuery.toLowerCase())
  );

  function formatTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  }

  function createGuild() {
    if (!newGuildName.trim()) return;
    guildStore.createGuild(newGuildName.trim(), newGuildDescription.trim());
    achievementStore.checkProgress(legionStore, guildStore);
    newGuildName = '';
    newGuildDescription = '';
    showCreateGuild = false;
  }

  function joinGuild(guildId) {
    guildStore.joinGuild(guildId);
    achievementStore.checkProgress(legionStore, guildStore);
    showJoinGuild = false;
  }

  function cancelApplication() {
    guildStore.cancelApplication();
  }

  function acceptApplicant(applicantId) {
    guildStore.acceptApplicant(applicantId);
  }

  function rejectApplicant(applicantId) {
    guildStore.rejectApplicant(applicantId);
  }

  function kickMember(memberId) {
    if (confirm('确定要将该成员移出公会吗？')) {
      guildStore.kickMember(memberId);
      showMemberDetail = null;
    }
  }

  function promoteMember(memberId, newRole) {
    guildStore.promoteMember(memberId, newRole);
  }

  function transferLeadership(newLeaderId) {
    if (confirm('确定要将会长职位转让给该成员吗？')) {
      guildStore.transferLeadership(newLeaderId);
      showMemberDetail = null;
    }
  }

  function leaveGuild() {
    if (confirm('确定要离开公会吗？')) {
      guildStore.leaveGuild();
      activeTab = 'browse';
    }
  }

  function createTask() {
    if (!newTaskTemplate) return;
    guildStore.createTask(newTaskTemplate, newTaskName.trim(), newTaskDescription.trim(), newTaskDifficulty);
    newTaskTemplate = '';
    newTaskName = '';
    newTaskDescription = '';
    newTaskDifficulty = 'normal';
    showCreateTask = false;
  }

  function joinTask(taskId) {
    guildStore.joinTask(taskId);
  }

  function leaveTask(taskId) {
    guildStore.leaveTask(taskId);
  }

  function updateTaskProgress(taskId, progress) {
    guildStore.updateTaskProgress(taskId, progress);
  }

  function simulateTaskCompletion(taskId) {
    const task = $currentGuild?.tasks?.find(t => t.id === taskId);
    if (task) {
      updateTaskProgress(taskId, 100);
    }
  }

  function cancelTask(taskId) {
    if (confirm('确定要取消这个任务吗？')) {
      guildStore.cancelTask(taskId);
    }
  }

  function attackBoss(bossId) {
    const damage = 500 + Math.floor(Math.random() * 1500);
    guildStore.attackBoss(bossId, damage);
  }

  function donate() {
    guildStore.donate(donateAmount);
    setTimeout(() => guildStore.clearDonationResult(), 3000);
  }

  function postAnnouncement() {
    if (!newAnnouncementTitle.trim()) return;
    guildStore.addAnnouncement(newAnnouncementTitle.trim(), newAnnouncementContent.trim());
    newAnnouncementTitle = '';
    newAnnouncementContent = '';
    showAnnouncement = false;
  }

  function removeAnnouncement(announcementId) {
    if (confirm('确定要删除这条公告吗？')) {
      guildStore.removeAnnouncement(announcementId);
    }
  }

  function resetGuildData() {
    if (confirm('确定要重置所有公会数据吗？此操作不可恢复！')) {
      guildStore.reset();
    }
  }

  function viewGuildDetail(guild) {
    showGuildDetail = guild;
  }

  function closeGuildDetail() {
    showGuildDetail = null;
  }

  function viewMemberDetail(member) {
    showMemberDetail = member;
  }

  function closeMemberDetail() {
    showMemberDetail = null;
  }

  function getTaskStatusLabel(status) {
    const labels = {
      pending: '待开始',
      in_progress: '进行中',
      completed: '已完成'
    };
    return labels[status] || status;
  }

  function getTaskStatusColor(status) {
    const colors = {
      pending: '#9e9e9e',
      in_progress: '#2196f3',
      completed: '#4caf50'
    };
    return colors[status] || '#9e9e9e';
  }

  function getDifficultyColor(difficulty) {
    return GUILD_TASK_CONFIG[difficulty]?.color || '#9e9e9e';
  }

  function getDifficultyName(difficulty) {
    return GUILD_TASK_CONFIG[difficulty]?.name || difficulty;
  }

  function getRoleIcon(role) {
    return GUILD_ROLE_CONFIG[role]?.icon || '👤';
  }

  function getRoleName(role) {
    return GUILD_ROLE_CONFIG[role]?.name || role;
  }

  function getRoleColor(role) {
    return GUILD_ROLE_CONFIG[role]?.color || '#9e9e9e';
  }

  $: donationResult = $guildStore.lastDonationResult;
</script>

<div class="guild-system">
  <div class="top-bar">
    <div class="title-section">
      <h1>🏰 公会协作系统</h1>
      {#if $currentGuild}
        <div class="guild-badge">
          <span class="guild-emblem">{$currentGuild.emblem}</span>
          <span class="guild-name">{$currentGuild.name}</span>
          <span class="guild-level-badge" style="background: {$guildLevel.level >= 5 ? '#ffd700' : '#4caf50'};">
            Lv.{$guildLevel.level}
          </span>
        </div>
      {/if}
    </div>

    <div class="quick-actions">
      {#if !$isInGuild && !$hasPendingApplication}
        <button class="btn-primary" on:click={() => showCreateGuild = true}>
          ➕ 创建公会
        </button>
        <button class="btn-secondary" on:click={() => showJoinGuild = true}>
          🔍 加入公会
        </button>
      {/if}
      {#if $hasPendingApplication}
        <div class="pending-badge">
          <span>⏳ 申请审核中...</span>
          <button class="btn-small" on:click={cancelApplication}>取消申请</button>
        </div>
      {/if}
      {#if $isInGuild}
        <button class="btn-secondary" on:click={() => showDonate = true}>
          💰 捐献
        </button>
        <button class="btn-danger" on:click={leaveGuild}>
          🚪 离开公会
        </button>
      {/if}
    </div>
  </div>

  {#if $currentGuild}
    <div class="guild-overview">
      <div class="overview-cards">
        <div class="overview-card">
          <span class="card-icon">👥</span>
          <div class="card-info">
            <span class="card-value">{$currentGuild.members.length} / {$guildLevel.maxMembers}</span>
            <span class="card-label">成员</span>
          </div>
        </div>
        <div class="overview-card">
          <span class="card-icon">⚔️</span>
          <div class="card-info">
            <span class="card-value">{$guildPower.toLocaleString()}</span>
            <span class="card-label">总战力</span>
          </div>
        </div>
        <div class="overview-card">
          <span class="card-icon">📋</span>
          <div class="card-info">
            <span class="card-value">{$currentGuild.stats.totalTasksCompleted}</span>
            <span class="card-label">完成任务</span>
          </div>
        </div>
        <div class="overview-card">
          <span class="card-icon">👹</span>
          <div class="card-info">
            <span class="card-value">{$currentGuild.stats.totalBossKills}</span>
            <span class="card-label">击杀Boss</span>
          </div>
        </div>
      </div>

      <div class="guild-exp-bar">
        <div class="exp-label">
          <span>{$guildLevel.name}</span>
          <span>经验: {$currentGuild.exp.toLocaleString()} / {$guildLevel.level < 7 ? ($guildLevel.expRequired + $expToNextLevel).toLocaleString() : '已满级'}</span>
        </div>
        <div class="exp-bar">
          <div class="exp-fill" style="width: {$guildProgress}%;"></div>
        </div>
        <div class="exp-bonus">
          <span>金币加成: +{Math.round(($guildLevel.bonus.gold - 1) * 100)}%</span>
          <span>经验加成: +{Math.round(($guildLevel.bonus.exp - 1) * 100)}%</span>
        </div>
      </div>
    </div>
  {/if}

  <div class="tabs">
    {#each visibleTabs as tab}
      <button 
        class="tab-btn {activeTab === tab.id ? 'active' : ''}"
        on:click={() => { activeTab = tab.id; showMemberDetail = null; showGuildDetail = null; }}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-name">{tab.name}</span>
      </button>
    {/each}
  </div>

  <div class="content-area">
    {#if activeTab === 'browse'}
      <div class="browse-tab">
        <div class="search-bar">
          <input 
            type="text" 
            bind:value={searchGuildQuery} 
            placeholder="搜索公会名称或描述..."
          />
          <span class="search-icon">🔍</span>
        </div>

        <div class="guild-list">
          {#each filteredGuilds as guild}
            <div class="guild-card" on:click={() => viewGuildDetail(guild)}>
              <div class="guild-card-header">
                <span class="guild-emblem-large">{guild.emblem}</span>
                <div class="guild-card-info">
                  <h3 class="guild-card-name">{guild.name}</h3>
                  <p class="guild-card-desc">{guild.description}</p>
                </div>
                <div class="guild-card-level">
                  <span class="level-badge">Lv.{guild.level}</span>
                </div>
              </div>
              <div class="guild-card-stats">
                <span>👥 {guild.members.length} 成员</span>
                <span>⚔️ {calculateGuildPower(guild).toLocaleString()} 战力</span>
                <span>📋 {guild.stats.totalTasksCompleted} 任务</span>
              </div>
              {#if !$isInGuild && !$hasPendingApplication}
                <button class="btn-primary btn-small join-btn" on:click|stopPropagation={() => joinGuild(guild.id)}>
                  申请加入
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if activeTab === 'hall'}
      <div class="hall-tab">
        <div class="hall-main">
          <div class="announcements-section">
            <div class="section-header">
              <h3>📢 公会公告</h3>
              {#if $isGuildOfficer}
                <button class="btn-small" on:click={() => showAnnouncement = true}>
                  + 发布公告
                </button>
              {/if}
            </div>
            <div class="announcements-list">
              {#if $currentGuild?.announcements && $currentGuild.announcements.length > 0}
                {#each $currentGuild.announcements as ann}
                  <div class="announcement-item">
                    <div class="announcement-header">
                      <span class="announcement-title">{ann.title}</span>
                      <span class="announcement-meta">
                        {ann.authorName} · {formatTime(ann.createdAt)}
                      </span>
                      {#if $isGuildOfficer}
                        <button class="btn-icon" on:click={() => removeAnnouncement(ann.id)}>✕</button>
                      {/if}
                    </div>
                    <p class="announcement-content">{ann.content}</p>
                  </div>
                {/each}
              {:else}
                <div class="empty-state">
                  <span class="empty-icon">📭</span>
                  <p>暂无公告</p>
                </div>
              {/if}
            </div>
          </div>

          <div class="activity-section">
            <h3>📊 最近贡献</h3>
            <div class="activity-list">
              {#if $recentContributions.length > 0}
                {#each $recentContributions as record}
                  <div class="activity-item">
                    <span class="activity-icon">{CONTRIBUTION_CONFIG[record.type]?.icon || '📌'}</span>
                    <div class="activity-info">
                      <span class="activity-name">{record.memberName}</span>
                      <span class="activity-desc">{record.description || CONTRIBUTION_CONFIG[record.type]?.name}</span>
                    </div>
                    <span class="activity-amount">+{record.amount}</span>
                    <span class="activity-time">{formatTime(record.timestamp)}</span>
                  </div>
                {/each}
              {:else}
                <div class="empty-state">
                  <span class="empty-icon">📊</span>
                  <p>暂无贡献记录</p>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="hall-sidebar">
          <div class="my-contribution">
            <h3>我的贡献</h3>
            {#if $playerMember}
              <div class="contribution-stats">
                <div class="contribution-stat">
                  <span class="stat-label">总贡献</span>
                  <span class="stat-value gold">{$playerMember.totalContribution.toLocaleString()}</span>
                </div>
                <div class="contribution-stat">
                  <span class="stat-label">本周贡献</span>
                  <span class="stat-value blue">{$playerMember.weeklyContribution.toLocaleString()}</span>
                </div>
                <div class="contribution-stat">
                  <span class="stat-label">公会职位</span>
                  <span class="stat-value" style="color: {getRoleColor($playerMember.role)};">
                    {getRoleIcon($playerMember.role)} {getRoleName($playerMember.role)}
                  </span>
                </div>
              </div>
            {/if}
          </div>

          <div class="quick-tasks">
            <h3>⚡ 快捷任务</h3>
            <div class="quick-task-list">
              {#each $pendingTasks.slice(0, 3) as task}
                <div class="quick-task-item">
                  <span class="task-icon">{task.icon}</span>
                  <div class="task-info">
                    <span class="task-name">{task.name}</span>
                    <span class="task-progress">
                      {task.participants.length}/{GUILD_TASK_CONFIG[task.difficulty].maxMembers}人
                    </span>
                  </div>
                  {#if task.participants.includes('player_1')}
                    <button class="btn-small btn-danger" on:click={() => leaveTask(task.id)}>退出</button>
                  {:else}
                    <button class="btn-small btn-primary" on:click={() => joinTask(task.id)}>加入</button>
                  {/if}
                </div>
              {/each}
              {#if $pendingTasks.length === 0}
                <div class="empty-state small">
                  <p>暂无进行中的任务</p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'members'}
      <div class="members-tab">
        <div class="members-header">
          <h3>👥 成员列表</h3>
          <span class="members-count">共 {$currentGuild?.members.length || 0} 名成员</span>
        </div>

        <div class="members-list">
          {#each $sortedMembers as member}
            <div class="member-card" on:click={() => viewMemberDetail(member)}>
              <div class="member-avatar" style="background: {getRoleColor(member.role)};">
                {member.name.charAt(0)}
              </div>
              <div class="member-info">
                <div class="member-name">
                  <span>{member.name}</span>
                  <span class="member-role" style="color: {getRoleColor(member.role)};">
                    {getRoleIcon(member.role)} {getRoleName(member.role)}
                  </span>
                </div>
                <div class="member-stats">
                  <span>⚔️ {member.power?.toLocaleString() || 0}</span>
                  <span>📊 {member.totalContribution.toLocaleString()} 贡献</span>
                  <span>⏰ {formatTime(member.lastActive)}</span>
                </div>
              </div>
              <div class="member-contribution">
                <span class="weekly-contrib">周贡献: {member.weeklyContribution.toLocaleString()}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if activeTab === 'tasks'}
      <div class="tasks-tab">
        <div class="tasks-header">
          <h3>📋 公会任务</h3>
          {#if $isGuildOfficer}
            <button class="btn-primary" on:click={() => showCreateTask = true}>
              ➕ 发布任务
            </button>
          {/if}
        </div>

        <div class="tasks-grid">
          {#each $pendingTasks as task}
            <div class="task-card" style="border-color: {getDifficultyColor(task.difficulty)};">
              <div class="task-header">
                <span class="task-icon-large">{task.icon}</span>
                <div class="task-title">
                  <h4>{task.name}</h4>
                  <span class="task-difficulty" style="background: {getDifficultyColor(task.difficulty)};">
                    {getDifficultyName(task.difficulty)}
                  </span>
                </div>
              </div>
              <p class="task-desc">{task.description}</p>
              
              <div class="task-progress-section">
                <div class="task-progress-bar">
                  <div class="task-progress-fill" style="width: {task.progress}%;"></div>
                </div>
                <span class="task-progress-text">{task.progress}%</span>
              </div>

              <div class="task-participants">
                <span>参与: {task.participants.length}/{GUILD_TASK_CONFIG[task.difficulty].maxMembers}</span>
                <span class="task-status" style="color: {getTaskStatusColor(task.status)};">
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>

              <div class="task-rewards">
                <span>💰 {task.rewards.gold}</span>
                <span>✨ {task.rewards.exp}</span>
                <span>📊 {task.rewards.contribution}</span>
              </div>

              <div class="task-actions">
                {#if task.participants.includes('player_1')}
                  <button class="btn-secondary" on:click={() => leaveTask(task.id)}>退出任务</button>
                  <button class="btn-primary" on:click={() => simulateTaskCompletion(task.id)}>模拟完成</button>
                {:else if task.participants.length < GUILD_TASK_CONFIG[task.difficulty].maxMembers}
                  <button class="btn-primary" on:click={() => joinTask(task.id)}>加入任务</button>
                {/if}
                {#if $isGuildOfficer}
                  <button class="btn-danger" on:click={() => cancelTask(task.id)}>取消</button>
                {/if}
              </div>
            </div>
          {/each}

          {#if $pendingTasks.length === 0}
            <div class="empty-state">
              <span class="empty-icon">📋</span>
              <p>暂无进行中的任务</p>
              {#if $isGuildOfficer}
                <button class="btn-primary" on:click={() => showCreateTask = true}>发布第一个任务</button>
              {/if}
            </div>
          {/if}
        </div>

        {#if $completedTasks.length > 0}
          <div class="completed-tasks">
            <h4>✅ 已完成任务</h4>
            <div class="completed-list">
              {#each $completedTasks.slice(0, 5) as task}
                <div class="completed-task-item">
                  <span class="task-icon">{task.icon}</span>
                  <span class="task-name">{task.name}</span>
                  <span class="task-participants">{task.participants.length}人参与</span>
                  <span class="task-time">{formatTime(task.endTime)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if activeTab === 'boss'}
      <div class="boss-tab">
        <h3>👹 公会Boss</h3>
        <p class="tab-desc">与公会成员一起挑战强力Boss，获取丰厚奖励</p>

        <div class="boss-grid">
          {#each $availableBosses as boss}
            <div class="boss-card" style="border-color: {getDifficultyColor(boss.difficulty)};">
              <div class="boss-header">
                <span class="boss-icon">{boss.icon}</span>
                <div class="boss-info">
                  <h4>{boss.name}</h4>
                  <span class="boss-difficulty" style="background: {getDifficultyColor(boss.difficulty)};">
                    {getDifficultyName(boss.difficulty)}
                  </span>
                </div>
              </div>

              <div class="boss-stats">
                <div class="boss-stat">
                  <span class="stat-label">生命值</span>
                  <div class="hp-bar">
                    <div class="hp-fill" style="width: {(boss.currentHp / boss.hp) * 100}%;"></div>
                  </div>
                  <span class="stat-value">{boss.currentHp.toLocaleString()} / {boss.hp.toLocaleString()}</span>
                </div>
                <div class="boss-stat-row">
                  <span>⚔️ 攻击: {boss.attack}</span>
                  <span>🛡️ 防御: {boss.defense}</span>
                </div>
                <div class="boss-stat-row">
                  <span>👥 需 {boss.minMembers}-{boss.maxMembers} 人</span>
                  <span>💀 已击杀: {boss.totalKills} 次</span>
                </div>
              </div>

              <div class="boss-rewards">
                <span class="reward-label">奖励:</span>
                <span>💰 {boss.rewards.gold}</span>
                <span>✨ {boss.rewards.exp}</span>
                <span>📊 {boss.rewards.contribution}</span>
              </div>

              <div class="boss-actions">
                {#if boss.canAttack}
                  <button class="btn-primary btn-large" on:click={() => attackBoss(boss.id)}>
                    ⚔️ 攻击Boss
                  </button>
                {:else}
                  <button class="btn-secondary btn-large" disabled>
                    ⏳ 复活中...
                  </button>
                  <span class="respawn-time">
                    下次刷新: {boss.lastKilledAt > 0 ? formatTime(boss.lastKilledAt + boss.respawnTime) : '—'}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if activeTab === 'ranking'}
      <div class="ranking-tab">
        <div class="ranking-tabs">
          <button 
            class="ranking-tab-btn {selectedRankingCategory === 'total_contribution' ? 'active' : ''}"
            on:click={() => selectedRankingCategory = 'total_contribution'}
          >
            📊 总贡献
          </button>
          <button 
            class="ranking-tab-btn {selectedRankingCategory === 'weekly_contribution' ? 'active' : ''}"
            on:click={() => selectedRankingCategory = 'weekly_contribution'}
          >
            📈 周贡献
          </button>
          <button 
            class="ranking-tab-btn {selectedRankingCategory === 'boss_damage' ? 'active' : ''}"
            on:click={() => selectedRankingCategory = 'boss_damage'}
          >
            💥 Boss伤害
          </button>
          <button 
            class="ranking-tab-btn {selectedRankingCategory === 'task_completion' ? 'active' : ''}"
            on:click={() => selectedRankingCategory = 'task_completion'}
          >
            ✅ 任务完成
          </button>
        </div>

        <div class="ranking-section">
          <h4>🏆 公会成员排行</h4>
          <div class="ranking-list">
            {#each ($memberRankings[selectedRankingCategory] || []).slice(0, 20) as entry, index}
              <div class="ranking-item {index < 3 ? 'top-rank' : ''}">
                <span class="rank-number rank-{index + 1}">{index + 1}</span>
                <div class="rank-avatar" style="background: {getRoleColor(entry.role)};">
                  {entry.memberName.charAt(0)}
                </div>
                <div class="rank-info">
                  <span class="rank-name">{entry.memberName}</span>
                  <span class="rank-role" style="color: {getRoleColor(entry.role)};">
                    {getRoleIcon(entry.role)} {getRoleName(entry.role)}
                  </span>
                </div>
                <span class="rank-value">{entry.value.toLocaleString()}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="ranking-section">
          <div class="section-header">
            <h4>🌍 全服公会排行</h4>
            <select bind:value={selectedGuildRankingCategory}>
              {#each Object.entries(RANKING_CONFIG) as [key, config]}
                <option value={key}>{config.icon} {config.name}</option>
              {/each}
            </select>
          </div>
          <div class="ranking-list">
            {#each ($guildRankings[selectedGuildRankingCategory] || []).slice(0, 10) as entry, index}
              <div class="ranking-item {index < 3 ? 'top-rank' : ''}">
                <span class="rank-number rank-{index + 1}">{index + 1}</span>
                <div class="rank-avatar guild-avatar">
                  {entry.guildEmblem}
                </div>
                <div class="rank-info">
                  <span class="rank-name">{entry.guildName}</span>
                  <span class="rank-role">Lv.{entry.level} · {entry.memberCount}人</span>
                </div>
                <span class="rank-value">{entry.value.toLocaleString()}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'records'}
      <div class="records-tab">
        <h3>📊 战报记录</h3>
        <p class="tab-desc">查看公会的战斗和任务记录</p>

        <div class="records-list">
          {#if $recentBattles.length > 0}
            {#each $recentBattles as record}
              <div class="record-item">
                <div class="record-icon">
                  {#if record.type === 'boss'}👹{:else if record.type === 'task'}📋{:else}⚔️{/if}
                </div>
                <div class="record-info">
                  <span class="record-title">
                    {#if record.type === 'boss'}
                      击杀Boss: {record.bossName}
                    {:else if record.type === 'task'}
                      完成任务: {record.taskName}
                    {:else}
                      公会战
                    {/if}
                  </span>
                  <span class="record-meta">
                    {record.participants?.length || 0} 人参与 · {formatTime(record.timestamp)}
                  </span>
                </div>
                <div class="record-rewards">
                  {#if record.rewards}
                    <span>💰 {record.rewards.gold || 0}</span>
                    <span>✨ {record.rewards.exp || 0}</span>
                    <span>📊 {record.rewards.contribution || 0}</span>
                  {/if}
                </div>
              </div>
            {/each}
          {:else}
            <div class="empty-state">
              <span class="empty-icon">📊</span>
              <p>暂无战报记录</p>
              <p class="hint">完成任务或击杀Boss后会在这里显示</p>
            </div>
          {/if}
        </div>

        <div class="stats-overview">
          <h4>📈 公会统计</h4>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">总任务完成</span>
              <span class="stat-value">{$currentGuild?.stats.totalTasksCompleted || 0}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">总Boss击杀</span>
              <span class="stat-value">{$currentGuild?.stats.totalBossKills || 0}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">公会战胜场</span>
              <span class="stat-value">{$currentGuild?.stats.totalWarsWon || 0}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">总捐献金币</span>
              <span class="stat-value">{$currentGuild?.stats.totalGoldDonated?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'manage'}
      <div class="manage-tab">
        <h3>⚙️ 公会管理</h3>

        {#if $pendingApplications.length > 0}
          <div class="manage-section">
            <h4>📝 入会申请 ({$pendingApplications.length})</h4>
            <div class="applications-list">
              {#each $pendingApplications as applicant}
                <div class="application-item">
                  <div class="applicant-info">
                    <span class="applicant-name">{applicant.name}</span>
                    <span class="application-message">{applicant.message}</span>
                    <span class="application-time">{formatTime(applicant.appliedAt)}</span>
                  </div>
                  <div class="application-actions">
                    <button class="btn-primary" on:click={() => acceptApplicant(applicant.id)}>✓ 接受</button>
                    <button class="btn-danger" on:click={() => rejectApplicant(applicant.id)}>✕ 拒绝</button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if $currentGuild}
        <div class="manage-section">
          <h4>🎛️ 公会设置</h4>
          <div class="settings-grid">
            <div class="setting-item">
              <label>自动接受申请</label>
              <label class="toggle-switch">
                <input type="checkbox" bind:checked={$currentGuild.settings.autoAccept} 
                       on:change={() => guildStore.updateGuildInfo({ settings: { ...$currentGuild.settings, autoAccept: !$currentGuild.settings.autoAccept } })} />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <label>公会公开</label>
              <label class="toggle-switch">
                <input type="checkbox" bind:checked={$currentGuild.settings.public}
                       on:change={() => guildStore.updateGuildInfo({ settings: { ...$currentGuild.settings, public: !$currentGuild.settings.public } })} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        {/if}

        {#if $isGuildLeader}
          <div class="manage-section danger">
            <h4>⚠️ 危险操作</h4>
            <div class="danger-actions">
              <button class="btn-danger" on:click={resetGuildData}>
                🔄 重置公会数据
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if showCreateGuild}
    <div class="modal-overlay" on:click={() => showCreateGuild = false}>
      <div class="modal" on:click|stopPropagation>
        <h2>🏰 创建公会</h2>
        <div class="form-group">
          <label>公会名称</label>
          <input type="text" bind:value={newGuildName} placeholder="请输入公会名称" maxlength="20" />
        </div>
        <div class="form-group">
          <label>公会描述</label>
          <textarea bind:value={newGuildDescription} placeholder="请输入公会描述" maxlength="200" rows="3"></textarea>
        </div>
        <div class="form-hint">
          创建公会需要 10,000 金币
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showCreateGuild = false}>取消</button>
          <button class="btn-primary" on:click={createGuild} disabled={!newGuildName.trim()}>创建</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showCreateTask}
    <div class="modal-overlay" on:click={() => showCreateTask = false}>
      <div class="modal" on:click|stopPropagation>
        <h2>📋 发布任务</h2>
        <div class="form-group">
          <label>任务模板</label>
          <select bind:value={newTaskTemplate}>
            <option value="">选择任务模板</option>
            {#each GUILD_TASK_TEMPLATES as template}
              <option value={template.id}>{template.icon} {template.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label>任务名称 (可选)</label>
          <input type="text" bind:value={newTaskName} placeholder="自定义任务名称" maxlength="30" />
        </div>
        <div class="form-group">
          <label>任务描述 (可选)</label>
          <textarea bind:value={newTaskDescription} placeholder="自定义任务描述" maxlength="200" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>任务难度</label>
          <div class="difficulty-options">
            {#each Object.entries(GUILD_TASK_DIFFICULTY) as [key, value]}
              <label class="difficulty-option">
                <input type="radio" bind:group={newTaskDifficulty} value={value} />
                <span style="background: {getDifficultyColor(value)};">{getDifficultyName(value)}</span>
              </label>
            {/each}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showCreateTask = false}>取消</button>
          <button class="btn-primary" on:click={createTask} disabled={!newTaskTemplate}>发布</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showDonate}
    <div class="modal-overlay" on:click={() => showDonate = false}>
      <div class="modal" on:click|stopPropagation>
        <h2>💰 公会捐献</h2>
        <p class="modal-desc">捐献金币获得贡献值，帮助公会升级</p>
        <div class="donation-options">
          {#each GUILD_DONATION_OPTIONS as option}
            <button 
              class="donation-option {donateAmount === option.gold ? 'selected' : ''}"
              on:click={() => donateAmount = option.gold}
            >
              <span class="donation-amount">💰 {option.gold.toLocaleString()}</span>
              <span class="donation-contrib">📊 +{option.contribution}</span>
            </button>
          {/each}
        </div>
        {#if donationResult}
          <div class="donation-result" class:success={donationResult.success} class:error={!donationResult.success}>
            {#if donationResult.success}
              ✅ 捐献成功！获得 {donationResult.contribution} 贡献值
            {:else}
              ❌ {donationResult.reason}
            {/if}
          </div>
        {/if}
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showDonate = false}>取消</button>
          <button class="btn-primary" on:click={donate}>确认捐献</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showAnnouncement}
    <div class="modal-overlay" on:click={() => showAnnouncement = false}>
      <div class="modal" on:click|stopPropagation>
        <h2>📢 发布公告</h2>
        <div class="form-group">
          <label>公告标题</label>
          <input type="text" bind:value={newAnnouncementTitle} placeholder="请输入公告标题" maxlength="50" />
        </div>
        <div class="form-group">
          <label>公告内容</label>
          <textarea bind:value={newAnnouncementContent} placeholder="请输入公告内容" maxlength="500" rows="4"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showAnnouncement = false}>取消</button>
          <button class="btn-primary" on:click={postAnnouncement} disabled={!newAnnouncementTitle.trim()}>发布</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showMemberDetail}
    <div class="modal-overlay" on:click={closeMemberDetail}>
      <div class="modal member-detail-modal" on:click|stopPropagation>
        <div class="member-detail-header">
          <div class="member-avatar-large" style="background: {getRoleColor(showMemberDetail.role)};">
            {showMemberDetail.name.charAt(0)}
          </div>
          <div class="member-detail-info">
            <h3>{showMemberDetail.name}</h3>
            <span style="color: {getRoleColor(showMemberDetail.role)};">
              {getRoleIcon(showMemberDetail.role)} {getRoleName(showMemberDetail.role)}
            </span>
          </div>
          <button class="btn-icon" on:click={closeMemberDetail}>✕</button>
        </div>
        
        <div class="member-detail-stats">
          <div class="detail-stat">
            <span class="stat-label">总贡献</span>
            <span class="stat-value">{showMemberDetail.totalContribution.toLocaleString()}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">本周贡献</span>
            <span class="stat-value">{showMemberDetail.weeklyContribution.toLocaleString()}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">战力</span>
            <span class="stat-value">{showMemberDetail.power?.toLocaleString() || 0}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">加入时间</span>
            <span class="stat-value">{formatTime(showMemberDetail.joinedAt)}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">最后活跃</span>
            <span class="stat-value">{formatTime(showMemberDetail.lastActive)}</span>
          </div>
        </div>

        {#if $isGuildOfficer && showMemberDetail.id !== 'player_1'}
          <div class="member-actions">
            <h4>管理操作</h4>
            {#if $isGuildLeader && showMemberDetail.role !== GUILD_MEMBER_ROLE.LEADER}
              <button class="btn-primary" on:click={() => transferLeadership(showMemberDetail.id)}>
                👑 转让会长
              </button>
            {/if}
            {#if showMemberDetail.role === GUILD_MEMBER_ROLE.MEMBER}
              <button class="btn-secondary" on:click={() => promoteMember(showMemberDetail.id, GUILD_MEMBER_ROLE.OFFICER)}>
                ⬆️ 晋升官员
              </button>
            {:else if showMemberDetail.role === GUILD_MEMBER_ROLE.OFFICER && $isGuildLeader}
              <button class="btn-secondary" on:click={() => promoteMember(showMemberDetail.id, GUILD_MEMBER_ROLE.MEMBER)}>
                ⬇️ 降为成员
              </button>
            {/if}
            <button class="btn-danger" on:click={() => kickMember(showMemberDetail.id)}>
              🚫 移出公会
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showGuildDetail}
    <div class="modal-overlay" on:click={closeGuildDetail}>
      <div class="modal guild-detail-modal" on:click|stopPropagation>
        <div class="guild-detail-header">
          <span class="guild-emblem-xl">{showGuildDetail.emblem}</span>
          <div class="guild-detail-info">
            <h2>{showGuildDetail.name}</h2>
            <span class="guild-level-tag">Lv.{showGuildDetail.level}</span>
          </div>
          <button class="btn-icon" on:click={closeGuildDetail}>✕</button>
        </div>
        
        <p class="guild-detail-desc">{showGuildDetail.description}</p>
        
        <div class="guild-detail-stats">
          <div class="detail-stat">
            <span class="stat-label">成员</span>
            <span class="stat-value">{showGuildDetail.members.length} / {getGuildLevel(showGuildDetail.exp).maxMembers}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">战力</span>
            <span class="stat-value">{calculateGuildPower(showGuildDetail).toLocaleString()}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">创建时间</span>
            <span class="stat-value">{formatTime(showGuildDetail.createdAt)}</span>
          </div>
          <div class="detail-stat">
            <span class="stat-label">完成任务</span>
            <span class="stat-value">{showGuildDetail.stats.totalTasksCompleted}</span>
          </div>
        </div>

        <div class="guild-detail-members">
          <h4>主要成员</h4>
          <div class="mini-members-list">
            {#each showGuildDetail.members.slice(0, 6) as member}
              <div class="mini-member-item">
                <div class="mini-avatar" style="background: {getRoleColor(member.role)};">
                  {member.name.charAt(0)}
                </div>
                <span class="mini-name">{member.name}</span>
              </div>
            {/each}
            {#if showGuildDetail.members.length > 6}
              <div class="mini-member-item more">
                <span>+{showGuildDetail.members.length - 6}</span>
              </div>
            {/if}
          </div>
        </div>

        {#if !$isInGuild && !$hasPendingApplication}
          <div class="modal-actions">
            <button class="btn-secondary" on:click={closeGuildDetail}>关闭</button>
            <button class="btn-primary" on:click={() => { joinGuild(showGuildDetail.id); closeGuildDetail(); }}>
              申请加入
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .guild-system {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #0f0f1e, #1a1a2e);
    color: #fff;
    overflow: hidden;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-wrap: wrap;
    gap: 16px;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .title-section h1 {
    margin: 0;
    font-size: 24px;
  }

  .guild-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 20px;
  }

  .guild-emblem {
    font-size: 20px;
  }

  .guild-name {
    font-weight: bold;
  }

  .guild-level-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: bold;
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .pending-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(255, 152, 0, 0.2);
    border: 1px solid rgba(255, 152, 0, 0.4);
    border-radius: 8px;
    color: #ff9800;
  }

  .btn-primary, .btn-secondary, .btn-danger, .btn-small {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #2196f3, #1565c0);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn-danger {
    background: linear-gradient(135deg, #f44336, #c62828);
    color: white;
  }

  .btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
  }

  .btn-small {
    padding: 6px 14px;
    font-size: 12px;
  }

  .btn-large {
    padding: 14px 28px;
    font-size: 16px;
    width: 100%;
  }

  .btn-icon {
    background: none;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
  }

  .btn-icon:hover {
    color: #fff;
  }

  .guild-overview {
    padding: 16px 24px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .overview-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .overview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .card-icon {
    font-size: 32px;
  }

  .card-info {
    display: flex;
    flex-direction: column;
  }

  .card-value {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }

  .card-label {
    font-size: 12px;
    color: #888;
  }

  .guild-exp-bar {
    background: rgba(0, 0, 0, 0.2);
    padding: 16px;
    border-radius: 12px;
  }

  .exp-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: #aaa;
  }

  .exp-bar {
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    border-radius: 5px;
    transition: width 0.5s ease;
  }

  .exp-bonus {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #4caf50;
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 24px;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    overflow-x: auto;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-btn.active {
    color: #2196f3;
    border-bottom-color: #2196f3;
    background: rgba(33, 150, 243, 0.1);
  }

  .tab-icon {
    font-size: 18px;
  }

  .content-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-header h3,
  .section-header h4 {
    margin: 0;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #666;
  }

  .empty-state.small {
    padding: 20px;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-state .hint {
    font-size: 12px;
    color: #555;
  }

  .browse-tab {
    max-width: 900px;
    margin: 0 auto;
  }

  .search-bar {
    position: relative;
    margin-bottom: 20px;
  }

  .search-bar input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
  }

  .search-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
  }

  .guild-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guild-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .guild-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateX(4px);
  }

  .guild-card-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }

  .guild-emblem-large {
    font-size: 48px;
  }

  .guild-emblem-xl {
    font-size: 64px;
  }

  .guild-card-info {
    flex: 1;
  }

  .guild-card-name {
    margin: 0 0 4px 0;
    font-size: 18px;
  }

  .guild-card-desc {
    margin: 0;
    color: #888;
    font-size: 13px;
  }

  .level-badge {
    padding: 4px 12px;
    background: #4caf50;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .guild-card-stats {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #aaa;
  }

  .join-btn {
    margin-top: 12px;
  }

  .hall-tab {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 24px;
    height: 100%;
  }

  .hall-main {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .announcements-section,
  .activity-section,
  .my-contribution,
  .quick-tasks {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
  }

  .announcements-section h3,
  .activity-section h3,
  .my-contribution h3,
  .quick-tasks h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
  }

  .announcements-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 300px;
    overflow-y: auto;
  }

  .announcement-item {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    padding: 12px;
  }

  .announcement-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .announcement-title {
    font-weight: 600;
    flex: 1;
  }

  .announcement-meta {
    font-size: 12px;
    color: #666;
  }

  .announcement-content {
    margin: 0;
    color: #aaa;
    font-size: 14px;
    line-height: 1.5;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 400px;
    overflow-y: auto;
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }

  .activity-icon {
    font-size: 20px;
  }

  .activity-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .activity-name {
    font-size: 14px;
    font-weight: 500;
  }

  .activity-desc {
    font-size: 12px;
    color: #888;
  }

  .activity-amount {
    font-weight: bold;
    color: #4caf50;
  }

  .activity-time {
    font-size: 11px;
    color: #666;
  }

  .hall-sidebar {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .contribution-stats {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .contribution-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    color: #888;
    font-size: 13px;
  }

  .stat-value {
    font-weight: bold;
    font-size: 16px;
  }

  .stat-value.gold {
    color: #ffd700;
  }

  .stat-value.blue {
    color: #2196f3;
  }

  .quick-task-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .quick-task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }

  .task-icon {
    font-size: 24px;
  }

  .task-icon-large {
    font-size: 36px;
  }

  .task-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .task-name {
    font-weight: 500;
  }

  .task-progress {
    font-size: 12px;
    color: #888;
  }

  .members-tab {
    max-width: 900px;
    margin: 0 auto;
  }

  .members-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .members-header h3 {
    margin: 0;
  }

  .members-count {
    color: #888;
    font-size: 14px;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .member-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .member-card:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .member-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    color: #fff;
  }

  .member-avatar-large {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 24px;
    color: #fff;
  }

  .member-info {
    flex: 1;
  }

  .member-name {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .member-name span:first-child {
    font-weight: 600;
    font-size: 16px;
  }

  .member-role {
    font-size: 12px;
    font-weight: 500;
  }

  .member-stats {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: #888;
  }

  .member-contribution {
    text-align: right;
  }

  .weekly-contrib {
    font-size: 12px;
    color: #2196f3;
  }

  .tasks-tab {
    max-width: 1200px;
    margin: 0 auto;
  }

  .tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .tasks-header h3 {
    margin: 0;
  }

  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .task-card {
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .task-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .task-title {
    flex: 1;
  }

  .task-title h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
  }

  .task-difficulty {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
    color: #fff;
  }

  .task-desc {
    color: #aaa;
    font-size: 13px;
    margin: 0;
    line-height: 1.5;
  }

  .task-progress-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .task-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2196f3, #03a9f4);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .task-progress-text {
    font-size: 12px;
    color: #888;
    min-width: 40px;
    text-align: right;
  }

  .task-participants {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #888;
  }

  .task-status {
    font-weight: 500;
  }

  .task-rewards {
    display: flex;
    gap: 12px;
    padding: 8px;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 8px;
    font-size: 13px;
  }

  .task-rewards span {
    color: #ffd700;
  }

  .task-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
  }

  .task-actions button {
    flex: 1;
  }

  .completed-tasks h4 {
    margin: 0 0 12px 0;
  }

  .completed-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .completed-task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 8px;
  }

  .completed-task-item .task-name {
    flex: 1;
  }

  .completed-task-item .task-participants {
    color: #888;
    font-size: 12px;
  }

  .completed-task-item .task-time {
    color: #666;
    font-size: 12px;
  }

  .boss-tab {
    max-width: 1200px;
    margin: 0 auto;
  }

  .boss-tab h3 {
    margin: 0 0 8px 0;
  }

  .tab-desc {
    color: #888;
    margin: 0 0 24px 0;
  }

  .boss-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .boss-card {
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .boss-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .boss-icon {
    font-size: 48px;
  }

  .boss-info {
    flex: 1;
  }

  .boss-info h4 {
    margin: 0 0 4px 0;
    font-size: 18px;
  }

  .boss-difficulty {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
    color: #fff;
  }

  .boss-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .boss-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hp-bar {
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
  }

  .hp-fill {
    height: 100%;
    background: linear-gradient(90deg, #f44336, #e91e63);
    border-radius: 6px;
    transition: width 0.3s ease;
  }

  .boss-stat .stat-value {
    font-size: 12px;
    color: #888;
  }

  .boss-stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #aaa;
  }

  .boss-rewards {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 8px;
    font-size: 13px;
  }

  .reward-label {
    color: #888;
  }

  .boss-rewards span:not(.reward-label) {
    color: #ffd700;
  }

  .boss-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
  }

  .respawn-time {
    text-align: center;
    font-size: 12px;
    color: #ff9800;
  }

  .ranking-tab {
    max-width: 900px;
    margin: 0 auto;
  }

  .ranking-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .ranking-tab-btn {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ranking-tab-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .ranking-tab-btn.active {
    background: linear-gradient(135deg, #2196f3, #1565c0);
    color: #fff;
    border-color: transparent;
  }

  .ranking-section {
    margin-bottom: 32px;
  }

  .ranking-section h4 {
    margin: 0 0 16px 0;
  }

  .ranking-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ranking-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }

  .ranking-item.top-rank {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.2);
  }

  .rank-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.1);
    color: #888;
  }

  .rank-number.rank-1 {
    background: linear-gradient(135deg, #ffd700, #ffb300);
    color: #1a1a2e;
  }

  .rank-number.rank-2 {
    background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
    color: #1a1a2e;
  }

  .rank-number.rank-3 {
    background: linear-gradient(135deg, #cd7f32, #b8860b);
    color: #fff;
  }

  .rank-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
    color: #fff;
  }

  .rank-avatar.guild-avatar {
    background: rgba(255, 255, 255, 0.1);
    font-size: 20px;
  }

  .rank-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .rank-name {
    font-weight: 500;
  }

  .rank-role {
    font-size: 12px;
    color: #888;
  }

  .rank-value {
    font-weight: bold;
    font-size: 16px;
    color: #ffd700;
  }

  .records-tab {
    max-width: 900px;
    margin: 0 auto;
  }

  .records-tab h3 {
    margin: 0 0 8px 0;
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
  }

  .record-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .record-icon {
    font-size: 32px;
  }

  .record-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .record-title {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .record-meta {
    font-size: 12px;
    color: #888;
  }

  .record-rewards {
    display: flex;
    gap: 12px;
    font-size: 13px;
  }

  .record-rewards span {
    color: #ffd700;
  }

  .stats-overview h4 {
    margin: 0 0 16px 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    text-align: center;
  }

  .stat-card .stat-label {
    display: block;
    margin-bottom: 8px;
  }

  .stat-card .stat-value {
    font-size: 24px;
    color: #ffd700;
  }

  .manage-tab {
    max-width: 900px;
    margin: 0 auto;
  }

  .manage-tab h3 {
    margin: 0 0 24px 0;
  }

  .manage-section {
    margin-bottom: 32px;
  }

  .manage-section h4 {
    margin: 0 0 16px 0;
  }

  .manage-section.danger h4 {
    color: #f44336;
  }

  .applications-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .application-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .applicant-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .applicant-name {
    font-weight: 500;
  }

  .application-message {
    font-size: 13px;
    color: #888;
  }

  .application-time {
    font-size: 12px;
    color: #666;
  }

  .application-actions {
    display: flex;
    gap: 8px;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .setting-item label {
    color: #fff;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.1);
    transition: .3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: #4caf50;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(24px);
  }

  .danger-actions {
    display: flex;
    gap: 12px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal {
    background: #1a1a2e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal h2 {
    margin: 0 0 20px 0;
  }

  .modal-desc {
    color: #888;
    margin: 0 0 20px 0;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #ccc;
  }

  .form-group input,
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
  }

  .form-group textarea {
    resize: vertical;
  }

  .form-hint {
    font-size: 12px;
    color: #888;
    margin-top: 8px;
  }

  .difficulty-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .difficulty-option {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .difficulty-option input {
    display: none;
  }

  .difficulty-option span {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
    opacity: 0.7;
    transition: all 0.2s;
  }

  .difficulty-option input:checked + span {
    opacity: 1;
    transform: scale(1.05);
  }

  .donation-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .donation-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .donation-option:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .donation-option.selected {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
  }

  .donation-amount {
    font-weight: bold;
    font-size: 16px;
  }

  .donation-contrib {
    font-size: 12px;
    color: #4caf50;
  }

  .donation-result {
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    text-align: center;
  }

  .donation-result.success {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
  }

  .donation-result.error {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .modal-actions button {
    flex: 1;
  }

  .member-detail-modal,
  .guild-detail-modal {
    max-width: 450px;
  }

  .member-detail-header,
  .guild-detail-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .member-detail-info,
  .guild-detail-info {
    flex: 1;
  }

  .member-detail-info h3,
  .guild-detail-info h2 {
    margin: 0 0 4px 0;
  }

  .member-detail-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .detail-stat {
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    text-align: center;
  }

  .detail-stat .stat-label {
    display: block;
    margin-bottom: 4px;
  }

  .detail-stat .stat-value {
    font-size: 18px;
    font-weight: bold;
  }

  .member-actions {
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .member-actions h4 {
    margin: 0 0 12px 0;
  }

  .member-actions button {
    width: 100%;
    margin-bottom: 8px;
  }

  .guild-detail-desc {
    color: #aaa;
    margin: 0 0 20px 0;
    line-height: 1.6;
  }

  .guild-detail-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .guild-detail-members h4 {
    margin: 0 0 12px 0;
  }

  .mini-members-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .mini-member-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 60px;
  }

  .mini-member-item.more {
    justify-content: center;
    height: 60px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    color: #888;
    font-size: 14px;
  }

  .mini-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    color: #fff;
  }

  .mini-name {
    font-size: 11px;
    color: #888;
    text-align: center;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .guild-level-tag {
    padding: 4px 12px;
    background: #4caf50;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }

  .hint {
    font-size: 12px;
    color: #666;
  }

  @media (max-width: 768px) {
    .hall-tab {
      grid-template-columns: 1fr;
    }

    .top-bar {
      flex-direction: column;
      align-items: flex-start;
    }

    .overview-cards {
      grid-template-columns: repeat(2, 1fr);
    }

    .tasks-grid,
    .boss-grid {
      grid-template-columns: 1fr;
    }

    .member-detail-stats,
    .guild-detail-stats {
      grid-template-columns: 1fr;
    }

    .menu-buttons {
      flex-direction: column;
    }

    .menu-btn {
      width: 100%;
    }
  }
</style>
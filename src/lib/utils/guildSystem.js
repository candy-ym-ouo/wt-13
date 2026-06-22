// @ts-nocheck
import {
  GUILD_STORAGE_KEY,
  GUILD_RECORDS_KEY,
  GUILD_RANKING_KEY,
  GUILD_MEMBER_ROLE,
  GUILD_ROLE_CONFIG,
  GUILD_LEVEL_CONFIG,
  GUILD_TASK_CONFIG,
  GUILD_TASK_TEMPLATES,
  GUILD_BOSS_CONFIG,
  CONTRIBUTION_TYPE,
  CONTRIBUTION_CONFIG,
  GUILD_WAR_STATUS,
  GUILD_CREATION_COST,
  GUILD_DONATION_OPTIONS,
  RANKING_CATEGORY,
  RANKING_CONFIG,
  getGuildLevel,
  getExpToNextLevel,
  calculateContributionReward,
  calculateTaskRewards
} from '$lib/config/guildConfig.js';
import { legionStore, totalPower } from '$lib/stores/legionStore.js';

export function generateGuildId() {
  return `guild_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTaskId() {
  return `guild_task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateMemberId() {
  return `member_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createGuild(name, description, leaderId, leaderName, power = 0) {
  const id = generateGuildId();
  const now = Date.now();
  
  const guild = {
    id,
    name,
    description,
    level: 1,
    exp: 0,
    emblem: '🏰',
    createdAt: now,
    leaderId,
    members: [
      {
        id: leaderId,
        name: leaderName,
        role: GUILD_MEMBER_ROLE.LEADER,
        joinedAt: now,
        totalContribution: 0,
        weeklyContribution: 0,
        lastActive: now,
        power: power || 0
      }
    ],
    applicants: [],
    tasks: [],
    bossStates: GUILD_BOSS_CONFIG.map(boss => ({
      bossId: boss.id,
      currentHp: boss.hp,
      lastKilledAt: 0,
      totalKills: 0,
      damageRecords: []
    })),
    warStatus: {
      status: GUILD_WAR_STATUS.IDLE,
      enemyGuildId: null,
      enemyGuildName: null,
      startTime: 0,
      endTime: 0,
      ourScore: 0,
      enemyScore: 0
    },
    stats: {
      totalTasksCompleted: 0,
      totalBossKills: 0,
      totalWarsWon: 0,
      totalWarsLost: 0,
      totalGoldDonated: 0
    },
    announcements: [],
    settings: {
      autoAccept: false,
      minLevel: 1,
      minPower: 0,
      public: true
    }
  };
  
  return guild;
}

export function createGuildMember(userId, userName, role = GUILD_MEMBER_ROLE.MEMBER, power = 0) {
  return {
    id: userId,
    name: userName,
    role,
    joinedAt: Date.now(),
    totalContribution: 0,
    weeklyContribution: 0,
    lastActive: Date.now(),
    power: power || 0
  };
}

export function createGuildTask(templateId, customName, customDescription, difficulty, createdBy) {
  const template = GUILD_TASK_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;
  
  const now = Date.now();
  const config = GUILD_TASK_CONFIG[difficulty];
  
  return {
    id: generateTaskId(),
    templateId,
    name: customName || template.name,
    description: customDescription || template.description,
    type: template.type,
    difficulty,
    objective: { ...template.objective },
    icon: template.icon,
    createdBy,
    createdAt: now,
    startTime: null,
    endTime: null,
    deadline: now + config.duration,
    status: 'pending',
    progress: 0,
    participants: [],
    rewards: config.rewards
  };
}

export function addContribution(guild, memberId, amount, type, description = '') {
  const memberIndex = guild.members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return guild;
  
  const config = CONTRIBUTION_CONFIG[type];
  const multiplier = config ? config.multiplier : 1.0;
  const actualAmount = Math.floor(amount * multiplier);
  
  const guildLevel = getGuildLevel(guild.exp);
  const member = guild.members[memberIndex];
  const finalAmount = calculateContributionReward(actualAmount, member.role, guildLevel.bonus.exp);
  
  const newMembers = [...guild.members];
  newMembers[memberIndex] = {
    ...member,
    totalContribution: member.totalContribution + finalAmount,
    weeklyContribution: member.weeklyContribution + finalAmount,
    lastActive: Date.now()
  };
  
  const expGain = Math.floor(finalAmount * 0.5);
  const newExp = guild.exp + expGain;
  const newLevel = getGuildLevel(newExp).level;
  
  const record = {
    id: Date.now(),
    memberId,
    memberName: member.name,
    amount: finalAmount,
    type,
    description,
    timestamp: Date.now()
  };
  
  return {
    ...guild,
    members: newMembers,
    exp: newExp,
    level: newLevel,
    contributionRecords: [...(guild.contributionRecords || []), record].slice(-100)
  };
}

export function joinTask(guild, taskId, memberId) {
  const taskIndex = guild.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return guild;
  
  const task = guild.tasks[taskIndex];
  const config = GUILD_TASK_CONFIG[task.difficulty];
  
  if (task.participants.includes(memberId)) return guild;
  if (task.participants.length >= config.maxMembers) return guild;
  if (task.status !== 'pending' && task.status !== 'in_progress') return guild;
  
  const newTasks = [...guild.tasks];
  newTasks[taskIndex] = {
    ...task,
    participants: [...task.participants, memberId],
    startTime: task.participants.length === 0 ? Date.now() : task.startTime,
    status: task.participants.length === 0 ? 'in_progress' : task.status
  };
  
  return { ...guild, tasks: newTasks };
}

export function leaveTask(guild, taskId, memberId) {
  const taskIndex = guild.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return guild;
  
  const task = guild.tasks[taskIndex];
  if (!task.participants.includes(memberId)) return guild;
  
  const newParticipants = task.participants.filter(id => id !== memberId);
  
  const newTasks = [...guild.tasks];
  newTasks[taskIndex] = {
    ...task,
    participants: newParticipants,
    status: newParticipants.length === 0 ? 'pending' : task.status,
    startTime: newParticipants.length === 0 ? null : task.startTime
  };
  
  return { ...guild, tasks: newTasks };
}

export function updateTaskProgress(guild, taskId, progress) {
  const taskIndex = guild.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return guild;
  
  const task = guild.tasks[taskIndex];
  if (task.status !== 'in_progress') return guild;
  
  const newProgress = Math.min(100, Math.max(0, progress));
  const isComplete = newProgress >= 100;
  
  const newTasks = [...guild.tasks];
  newTasks[taskIndex] = {
    ...task,
    progress: newProgress,
    status: isComplete ? 'completed' : 'in_progress',
    endTime: isComplete ? Date.now() : task.endTime
  };
  
  let updatedGuild = { ...guild, tasks: newTasks };
  
  if (isComplete) {
    const rewards = calculateTaskRewards(task.difficulty, task.participants.length);
    
    for (const participantId of task.participants) {
      updatedGuild = addContribution(updatedGuild, participantId, rewards.contribution, CONTRIBUTION_TYPE.TASK, `完成任务: ${task.name}`);
    }
    
    updatedGuild = {
      ...updatedGuild,
      stats: {
        ...updatedGuild.stats,
        totalTasksCompleted: updatedGuild.stats.totalTasksCompleted + 1
      }
    };
  }
  
  return updatedGuild;
}

export function cancelTask(guild, taskId) {
  const taskIndex = guild.tasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return guild;
  
  const newTasks = guild.tasks.filter(t => t.id !== taskId);
  return { ...guild, tasks: newTasks };
}

export function attackBoss(guild, bossId, memberId, damage) {
  const bossStateIndex = guild.bossStates.findIndex(b => b.bossId === bossId);
  if (bossStateIndex === -1) return guild;
  
  const bossState = guild.bossStates[bossStateIndex];
  const bossConfig = GUILD_BOSS_CONFIG.find(b => b.id === bossId);
  if (!bossConfig) return guild;
  
  if (bossState.currentHp <= 0) return guild;
  
  const actualDamage = Math.max(0, Math.min(damage, bossState.currentHp - bossConfig.defense));
  const newHp = bossState.currentHp - actualDamage;
  const isKilled = newHp <= 0;
  
  const damageRecord = {
    memberId,
    damage: actualDamage,
    timestamp: Date.now()
  };
  
  const newBossStates = [...guild.bossStates];
  newBossStates[bossStateIndex] = {
    ...bossState,
    currentHp: isKilled ? bossConfig.hp : newHp,
    lastKilledAt: isKilled ? Date.now() : bossState.lastKilledAt,
    totalKills: isKilled ? bossState.totalKills + 1 : bossState.totalKills,
    damageRecords: [...bossState.damageRecords, damageRecord].slice(-100)
  };
  
  let updatedGuild = { ...guild, bossStates: newBossStates };
  
  updatedGuild = addContribution(updatedGuild, memberId, Math.floor(actualDamage / 10), CONTRIBUTION_TYPE.BOSS, `攻击Boss: ${bossConfig.name}`);
  
  if (isKilled) {
    const participants = [...new Set(bossState.damageRecords.map(r => r.memberId))];
    const memberName = guild.members.find(m => m.id === memberId)?.name || '';
    
    for (const participantId of participants) {
      const memberDamage = bossState.damageRecords
        .filter(r => r.memberId === participantId)
        .reduce((sum, r) => sum + r.damage, 0);
      
      const damageRatio = memberDamage / bossConfig.hp;
      const contributionBonus = Math.floor(bossConfig.rewards.contribution * damageRatio);
      
      updatedGuild = addContribution(updatedGuild, participantId, contributionBonus, CONTRIBUTION_TYPE.BOSS, `击杀Boss: ${bossConfig.name}`);
    }
    
    updatedGuild = {
      ...updatedGuild,
      stats: {
        ...updatedGuild.stats,
        totalBossKills: updatedGuild.stats.totalBossKills + 1
      },
      battleRecords: [...(updatedGuild.battleRecords || []), createBossBattleRecord(bossConfig, participants, memberId)].slice(-50)
    };
  }
  
  return updatedGuild;
}

export function createBossBattleRecord(bossConfig, participants, killerId) {
  return {
    id: Date.now(),
    type: 'boss',
    bossId: bossConfig.id,
    bossName: bossConfig.name,
    participants,
    killerId,
    rewards: bossConfig.rewards,
    timestamp: Date.now()
  };
}

export function donate(guild, memberId, amount) {
  const donationOption = GUILD_DONATION_OPTIONS.find(d => d.gold === amount);
  if (!donationOption) return guild;
  
  const memberIndex = guild.members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return guild;
  
  let updatedGuild = addContribution(guild, memberId, donationOption.contribution, CONTRIBUTION_TYPE.DONATION, `捐献金币: ${amount}`);
  
  updatedGuild = {
    ...updatedGuild,
    stats: {
      ...updatedGuild.stats,
      totalGoldDonated: updatedGuild.stats.totalGoldDonated + amount
    }
  };
  
  return updatedGuild;
}

export function inviteMember(guild, inviterId, inviteeId, inviteeName) {
  const inviter = guild.members.find(m => m.id === inviterId);
  if (!inviter) return guild;
  
  const inviterRole = GUILD_ROLE_CONFIG[inviter.role];
  if (!inviterRole?.permissions.includes('invite')) return guild;
  
  if (guild.applicants.some(a => a.id === inviteeId)) return guild;
  if (guild.members.some(m => m.id === inviteeId)) return guild;
  
  const guildLevel = getGuildLevel(guild.exp);
  if (guild.members.length >= guildLevel.maxMembers) return guild;
  
  const newApplicant = {
    id: inviteeId,
    name: inviteeName,
    invitedBy: inviterId,
    appliedAt: Date.now(),
    message: `${inviter.name} 邀请加入`
  };
  
  return {
    ...guild,
    applicants: [...guild.applicants, newApplicant]
  };
}

export function acceptApplicant(guild, applicantId, acceptorId, power = 0) {
  const acceptor = guild.members.find(m => m.id === acceptorId);
  if (!acceptor) return guild;
  
  const acceptorRole = GUILD_ROLE_CONFIG[acceptor.role];
  if (!acceptorRole?.permissions.includes('invite')) return guild;
  
  const applicantIndex = guild.applicants.findIndex(a => a.id === applicantId);
  if (applicantIndex === -1) return guild;
  
  const applicant = guild.applicants[applicantIndex];
  const guildLevel = getGuildLevel(guild.exp);
  
  if (guild.members.length >= guildLevel.maxMembers) return guild;
  
  const newMember = createGuildMember(applicant.id, applicant.name, GUILD_MEMBER_ROLE.MEMBER, power);
  
  const newApplicants = guild.applicants.filter(a => a.id !== applicantId);
  
  return {
    ...guild,
    members: [...guild.members, newMember],
    applicants: newApplicants
  };
}

export function rejectApplicant(guild, applicantId, rejectorId) {
  const rejector = guild.members.find(m => m.id === rejectorId);
  if (!rejector) return guild;
  
  const rejectorRole = GUILD_ROLE_CONFIG[rejector.role];
  if (!rejectorRole?.permissions.includes('invite')) return guild;
  
  const newApplicants = guild.applicants.filter(a => a.id !== applicantId);
  return { ...guild, applicants: newApplicants };
}

export function kickMember(guild, memberId, kickerId) {
  if (memberId === guild.leaderId) return guild;
  
  const kicker = guild.members.find(m => m.id === kickerId);
  if (!kicker) return guild;
  
  const kickerRole = GUILD_ROLE_CONFIG[kicker.role];
  if (!kickerRole?.permissions.includes('kick')) return guild;
  
  const memberToKick = guild.members.find(m => m.id === memberId);
  if (!memberToKick) return guild;
  
  const kickerRoleIndex = Object.keys(GUILD_MEMBER_ROLE).indexOf(kicker.role);
  const memberRoleIndex = Object.keys(GUILD_MEMBER_ROLE).indexOf(memberToKick.role);
  if (kickerRoleIndex >= memberRoleIndex) return guild;
  
  const newMembers = guild.members.filter(m => m.id !== memberId);
  return { ...guild, members: newMembers };
}

export function promoteMember(guild, memberId, newRole, promoterId) {
  if (memberId === guild.leaderId) return guild;
  if (!Object.values(GUILD_MEMBER_ROLE).includes(newRole)) return guild;
  if (newRole === GUILD_MEMBER_ROLE.LEADER) return guild;
  if (newRole === GUILD_MEMBER_ROLE.APPLICANT) return guild;
  
  const promoter = guild.members.find(m => m.id === promoterId);
  if (!promoter) return guild;
  
  const promoterRole = GUILD_ROLE_CONFIG[promoter.role];
  if (!promoterRole?.permissions.includes('promote')) return guild;
  
  const memberIndex = guild.members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return guild;
  
  const newMembers = [...guild.members];
  newMembers[memberIndex] = {
    ...newMembers[memberIndex],
    role: newRole
  };
  
  return { ...guild, members: newMembers };
}

export function transferLeadership(guild, newLeaderId, oldLeaderId) {
  if (oldLeaderId !== guild.leaderId) return guild;
  
  const oldLeaderIndex = guild.members.findIndex(m => m.id === oldLeaderId);
  const newLeaderIndex = guild.members.findIndex(m => m.id === newLeaderId);
  
  if (oldLeaderIndex === -1 || newLeaderIndex === -1) return guild;
  
  const newMembers = [...guild.members];
  newMembers[oldLeaderIndex] = {
    ...newMembers[oldLeaderIndex],
    role: GUILD_MEMBER_ROLE.OFFICER
  };
  newMembers[newLeaderIndex] = {
    ...newMembers[newLeaderIndex],
    role: GUILD_MEMBER_ROLE.LEADER
  };
  
  return {
    ...guild,
    leaderId: newLeaderId,
    members: newMembers
  };
}

export function leaveGuild(guild, memberId) {
  if (memberId === guild.leaderId) return guild;
  
  const newMembers = guild.members.filter(m => m.id !== memberId);
  return { ...guild, members: newMembers };
}

export function updateGuildInfo(guild, updates, editorId) {
  const editor = guild.members.find(m => m.id === editorId);
  if (!editor) return guild;
  
  const editorRole = GUILD_ROLE_CONFIG[editor.role];
  if (!editorRole?.permissions.includes('edit')) return guild;
  
  return {
    ...guild,
    ...updates
  };
}

export function addAnnouncement(guild, title, content, authorId) {
  const author = guild.members.find(m => m.id === authorId);
  if (!author) return guild;
  
  const authorRole = GUILD_ROLE_CONFIG[author.role];
  if (!authorRole?.permissions.includes('edit')) return guild;
  
  const announcement = {
    id: Date.now(),
    title,
    content,
    authorId,
    authorName: author.name,
    createdAt: Date.now(),
    pinned: false
  };
  
  return {
    ...guild,
    announcements: [announcement, ...(guild.announcements || [])].slice(0, 20)
  };
}

export function removeAnnouncement(guild, announcementId, removerId) {
  const remover = guild.members.find(m => m.id === removerId);
  if (!remover) return guild;
  
  const removerRole = GUILD_ROLE_CONFIG[remover.role];
  if (!removerRole?.permissions.includes('edit')) return guild;
  
  const newAnnouncements = (guild.announcements || []).filter(a => a.id !== announcementId);
  return { ...guild, announcements: newAnnouncements };
}

export function calculateGuildPower(guild) {
  return guild.members.reduce((sum, member) => sum + (member.power || 0), 0);
}

export function getRanking(guilds, category) {
  const config = RANKING_CONFIG[category];
  if (!config) return [];
  
  let sorted = [...guilds];
  
  switch (category) {
    case RANKING_CATEGORY.TOTAL_CONTRIBUTION:
      sorted.sort((a, b) => {
        const aTotal = a.members.reduce((sum, m) => sum + m.totalContribution, 0);
        const bTotal = b.members.reduce((sum, m) => sum + m.totalContribution, 0);
        return bTotal - aTotal;
      });
      break;
    case RANKING_CATEGORY.WEEKLY_CONTRIBUTION:
      sorted.sort((a, b) => {
        const aWeekly = a.members.reduce((sum, m) => sum + m.weeklyContribution, 0);
        const bWeekly = b.members.reduce((sum, m) => sum + m.weeklyContribution, 0);
        return bWeekly - aWeekly;
      });
      break;
    case RANKING_CATEGORY.BOSS_DAMAGE:
      sorted.sort((a, b) => {
        const aDamage = a.bossStates.reduce((sum, bs) => sum + bs.damageRecords.reduce((s, r) => s + r.damage, 0), 0);
        const bDamage = b.bossStates.reduce((sum, bs) => sum + bs.damageRecords.reduce((s, r) => s + r.damage, 0), 0);
        return bDamage - aDamage;
      });
      break;
    case RANKING_CATEGORY.TASK_COMPLETION:
      sorted.sort((a, b) => b.stats.totalTasksCompleted - a.stats.totalTasksCompleted);
      break;
    case RANKING_CATEGORY.GUILD_LEVEL:
      sorted.sort((a, b) => b.exp - a.exp);
      break;
    case RANKING_CATEGORY.GUILD_POWER:
      sorted.sort((a, b) => calculateGuildPower(b) - calculateGuildPower(a));
      break;
    default:
      break;
  }
  
  return sorted.map((guild, index) => ({
    rank: index + 1,
    guildId: guild.id,
    guildName: guild.name,
    guildEmblem: guild.emblem,
    level: guild.level,
    value: getRankingValue(guild, category),
    memberCount: guild.members.length
  }));
}

export function getRankingValue(guild, category) {
  switch (category) {
    case RANKING_CATEGORY.TOTAL_CONTRIBUTION:
      return guild.members.reduce((sum, m) => sum + m.totalContribution, 0);
    case RANKING_CATEGORY.WEEKLY_CONTRIBUTION:
      return guild.members.reduce((sum, m) => sum + m.weeklyContribution, 0);
    case RANKING_CATEGORY.BOSS_DAMAGE:
      return guild.bossStates.reduce((sum, bs) => sum + bs.damageRecords.reduce((s, r) => s + r.damage, 0), 0);
    case RANKING_CATEGORY.TASK_COMPLETION:
      return guild.stats.totalTasksCompleted;
    case RANKING_CATEGORY.GUILD_LEVEL:
      return guild.exp;
    case RANKING_CATEGORY.GUILD_POWER:
      return calculateGuildPower(guild);
    default:
      return 0;
  }
}

export function getMemberRanking(guild, category) {
  let sorted = [...guild.members];
  
  switch (category) {
    case RANKING_CATEGORY.TOTAL_CONTRIBUTION:
      sorted.sort((a, b) => b.totalContribution - a.totalContribution);
      break;
    case RANKING_CATEGORY.WEEKLY_CONTRIBUTION:
      sorted.sort((a, b) => b.weeklyContribution - a.weeklyContribution);
      break;
    case RANKING_CATEGORY.BOSS_DAMAGE:
      sorted.sort((a, b) => {
        const aDamage = guild.bossStates.reduce((sum, bs) => 
          sum + bs.damageRecords.filter(r => r.memberId === a.id).reduce((s, r) => s + r.damage, 0), 0);
        const bDamage = guild.bossStates.reduce((sum, bs) => 
          sum + bs.damageRecords.filter(r => r.memberId === b.id).reduce((s, r) => s + r.damage, 0), 0);
        return bDamage - aDamage;
      });
      break;
    case RANKING_CATEGORY.TASK_COMPLETION:
      sorted.sort((a, b) => {
        const aTasks = guild.tasks.filter(t => t.status === 'completed' && t.participants.includes(a.id)).length;
        const bTasks = guild.tasks.filter(t => t.status === 'completed' && t.participants.includes(b.id)).length;
        return bTasks - aTasks;
      });
      break;
    case RANKING_CATEGORY.GUILD_POWER:
      sorted.sort((a, b) => (b.power || 0) - (a.power || 0));
      break;
    default:
      sorted.sort((a, b) => b.totalContribution - a.totalContribution);
      break;
  }
  
  return sorted.map((member, index) => ({
    rank: index + 1,
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    value: getMemberRankingValue(member, guild, category),
    level: getMemberRoleLevel(member.role)
  }));
}

export function getMemberRankingValue(member, guild, category) {
  switch (category) {
    case RANKING_CATEGORY.TOTAL_CONTRIBUTION:
      return member.totalContribution;
    case RANKING_CATEGORY.WEEKLY_CONTRIBUTION:
      return member.weeklyContribution;
    case RANKING_CATEGORY.BOSS_DAMAGE:
      return guild.bossStates.reduce((sum, bs) => 
        sum + bs.damageRecords.filter(r => r.memberId === member.id).reduce((s, r) => s + r.damage, 0), 0);
    case RANKING_CATEGORY.TASK_COMPLETION:
      return guild.tasks.filter(t => t.status === 'completed' && t.participants.includes(member.id)).length;
    case RANKING_CATEGORY.GUILD_POWER:
      return member.power || 0;
    default:
      return member.totalContribution;
  }
}

function getMemberRoleLevel(role) {
  return Object.keys(GUILD_MEMBER_ROLE).indexOf(role);
}

export function resetWeeklyContribution(guild) {
  const newMembers = guild.members.map(member => ({
    ...member,
    weeklyContribution: 0
  }));
  return { ...guild, members: newMembers };
}

export function saveGuildData(guild) {
  try {
    localStorage.setItem(GUILD_STORAGE_KEY, JSON.stringify(guild));
    return true;
  } catch (e) {
    console.error('保存公会数据失败:', e);
    return false;
  }
}

export function loadGuildData() {
  try {
    const data = localStorage.getItem(GUILD_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('加载公会数据失败:', e);
    return null;
  }
}

export function saveGuildBattleRecord(record) {
  try {
    const records = getGuildBattleRecords();
    records.unshift({ ...record, id: Date.now(), timestamp: Date.now() });
    if (records.length > 100) records.length = 100;
    localStorage.setItem(GUILD_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('保存公会战报失败:', e);
    return false;
  }
}

export function getGuildBattleRecords() {
  try {
    const data = localStorage.getItem(GUILD_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取公会战报失败:', e);
    return [];
  }
}

export function saveRankingData(rankings) {
  try {
    localStorage.setItem(GUILD_RANKING_KEY, JSON.stringify(rankings));
    return true;
  } catch (e) {
    console.error('保存排行榜数据失败:', e);
    return false;
  }
}

export function loadRankingData() {
  try {
    const data = localStorage.getItem(GUILD_RANKING_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('加载排行榜数据失败:', e);
    return {};
  }
}

export function createInitialGuildData() {
  const sampleGuilds = [
    {
      id: 'guild_sample_1',
      name: '星辰议会',
      description: '最古老的公会之一，追求智慧与力量的平衡',
      level: 5,
      exp: 25000,
      emblem: '⭐',
      createdAt: Date.now() - 86400000 * 30,
      leaderId: 'sample_leader_1',
      members: [
        { id: 'sample_leader_1', name: '星尘大法师', role: GUILD_MEMBER_ROLE.LEADER, joinedAt: Date.now() - 86400000 * 30, totalContribution: 15000, weeklyContribution: 2500, lastActive: Date.now(), power: 15000 },
        { id: 'sample_officer_1', name: '银河守护者', role: GUILD_MEMBER_ROLE.OFFICER, joinedAt: Date.now() - 86400000 * 25, totalContribution: 12000, weeklyContribution: 2000, lastActive: Date.now(), power: 12000 },
        { id: 'sample_member_1', name: '流星战士', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 20, totalContribution: 8000, weeklyContribution: 1500, lastActive: Date.now(), power: 8000 },
        { id: 'sample_member_2', name: '星云猎手', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 15, totalContribution: 6000, weeklyContribution: 1200, lastActive: Date.now(), power: 6000 },
        { id: 'sample_member_3', name: '彗星骑士', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 10, totalContribution: 4000, weeklyContribution: 800, lastActive: Date.now(), power: 4000 }
      ],
      applicants: [],
      tasks: [],
      bossStates: GUILD_BOSS_CONFIG.map(boss => ({
        bossId: boss.id,
        currentHp: boss.hp,
        lastKilledAt: 0,
        totalKills: Math.floor(Math.random() * 10),
        damageRecords: []
      })),
      warStatus: { status: GUILD_WAR_STATUS.IDLE, enemyGuildId: null, enemyGuildName: null, startTime: 0, endTime: 0, ourScore: 0, enemyScore: 0 },
      stats: { totalTasksCompleted: 45, totalBossKills: 28, totalWarsWon: 12, totalWarsLost: 5, totalGoldDonated: 50000 },
      announcements: [
        { id: 1, title: '欢迎新成员', content: '欢迎所有新加入的成员！让我们一起壮大星辰议会！', authorId: 'sample_leader_1', authorName: '星尘大法师', createdAt: Date.now() - 86400000 * 5, pinned: true }
      ],
      settings: { autoAccept: false, minLevel: 1, minPower: 1000, public: true }
    },
    {
      id: 'guild_sample_2',
      name: '烈焰军团',
      description: '以火焰净化一切，战斗是我们的信仰',
      level: 4,
      exp: 12000,
      emblem: '🔥',
      createdAt: Date.now() - 86400000 * 20,
      leaderId: 'sample_leader_2',
      members: [
        { id: 'sample_leader_2', name: '烈焰战神', role: GUILD_MEMBER_ROLE.LEADER, joinedAt: Date.now() - 86400000 * 20, totalContribution: 10000, weeklyContribution: 1800, lastActive: Date.now(), power: 12000 },
        { id: 'sample_officer_2', name: '炎魔将军', role: GUILD_MEMBER_ROLE.OFFICER, joinedAt: Date.now() - 86400000 * 18, totalContribution: 8500, weeklyContribution: 1500, lastActive: Date.now(), power: 10000 },
        { id: 'sample_member_4', name: '火焰使者', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 15, totalContribution: 5000, weeklyContribution: 1000, lastActive: Date.now(), power: 6500 },
        { id: 'sample_member_5', name: '灰烬行者', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 10, totalContribution: 3500, weeklyContribution: 700, lastActive: Date.now(), power: 4500 }
      ],
      applicants: [],
      tasks: [],
      bossStates: GUILD_BOSS_CONFIG.map(boss => ({
        bossId: boss.id,
        currentHp: boss.hp,
        lastKilledAt: 0,
        totalKills: Math.floor(Math.random() * 8),
        damageRecords: []
      })),
      warStatus: { status: GUILD_WAR_STATUS.IDLE, enemyGuildId: null, enemyGuildName: null, startTime: 0, endTime: 0, ourScore: 0, enemyScore: 0 },
      stats: { totalTasksCompleted: 32, totalBossKills: 18, totalWarsWon: 8, totalWarsLost: 6, totalGoldDonated: 35000 },
      announcements: [],
      settings: { autoAccept: true, minLevel: 1, minPower: 500, public: true }
    },
    {
      id: 'guild_sample_3',
      name: '暗影刺客',
      description: '潜行于黑暗之中，一击必杀',
      level: 3,
      exp: 5000,
      emblem: '🗡️',
      createdAt: Date.now() - 86400000 * 15,
      leaderId: 'sample_leader_3',
      members: [
        { id: 'sample_leader_3', name: '暗影主宰', role: GUILD_MEMBER_ROLE.LEADER, joinedAt: Date.now() - 86400000 * 15, totalContribution: 6000, weeklyContribution: 1200, lastActive: Date.now(), power: 9000 },
        { id: 'sample_member_6', name: '午夜屠夫', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 12, totalContribution: 3000, weeklyContribution: 600, lastActive: Date.now(), power: 5000 },
        { id: 'sample_member_7', name: '寂静之刃', role: GUILD_MEMBER_ROLE.MEMBER, joinedAt: Date.now() - 86400000 * 8, totalContribution: 2000, weeklyContribution: 400, lastActive: Date.now(), power: 3500 }
      ],
      applicants: [],
      tasks: [],
      bossStates: GUILD_BOSS_CONFIG.map(boss => ({
        bossId: boss.id,
        currentHp: boss.hp,
        lastKilledAt: 0,
        totalKills: Math.floor(Math.random() * 5),
        damageRecords: []
      })),
      warStatus: { status: GUILD_WAR_STATUS.IDLE, enemyGuildId: null, enemyGuildName: null, startTime: 0, endTime: 0, ourScore: 0, enemyScore: 0 },
      stats: { totalTasksCompleted: 18, totalBossKills: 10, totalWarsWon: 4, totalWarsLost: 3, totalGoldDonated: 18000 },
      announcements: [],
      settings: { autoAccept: false, minLevel: 2, minPower: 2000, public: true }
    }
  ];
  
  return {
    currentGuildId: null,
    allGuilds: sampleGuilds,
    playerGuildId: null
  };
}

export function getAllGuilds() {
  const data = loadGuildData();
  return data?.allGuilds || [];
}

export function getGuildById(guildId) {
  const allGuilds = getAllGuilds();
  return allGuilds.find(g => g.id === guildId) || null;
}

export function updateGuildInList(guild) {
  const data = loadGuildData() || createInitialGuildData();
  const index = data.allGuilds.findIndex(g => g.id === guild.id);
  
  if (index !== -1) {
    data.allGuilds[index] = guild;
  } else {
    data.allGuilds.push(guild);
  }
  
  saveGuildData(data);
  return data;
}

export function removeGuildFromList(guildId) {
  const data = loadGuildData() || createInitialGuildData();
  data.allGuilds = data.allGuilds.filter(g => g.id !== guildId);
  saveGuildData(data);
  return data;
}

// @ts-nocheck
import { writable, derived, get } from 'svelte/store';
import {
  GUILD_MEMBER_ROLE,
  GUILD_ROLE_CONFIG,
  GUILD_LEVEL_CONFIG,
  GUILD_TASK_CONFIG,
  GUILD_TASK_TEMPLATES,
  GUILD_BOSS_CONFIG,
  CONTRIBUTION_TYPE,
  CONTRIBUTION_CONFIG,
  GUILD_DONATION_OPTIONS,
  RANKING_CATEGORY,
  RANKING_CONFIG,
  getGuildLevel,
  getExpToNextLevel,
  calculateTaskRewards
} from '$lib/config/guildConfig.js';
import {
  createGuild,
  createGuildTask,
  addContribution,
  joinTask,
  leaveTask,
  updateTaskProgress,
  cancelTask,
  attackBoss,
  donate,
  acceptApplicant,
  rejectApplicant,
  kickMember,
  promoteMember,
  transferLeadership,
  leaveGuild,
  updateGuildInfo,
  addAnnouncement,
  removeAnnouncement,
  calculateGuildPower,
  getRanking,
  getMemberRanking,
  resetWeeklyContribution,
  loadGuildData,
  saveGuildData,
  saveGuildBattleRecord,
  getGuildBattleRecords,
  loadRankingData,
  saveRankingData,
  createInitialGuildData,
  getAllGuilds,
  getGuildById,
  updateGuildInList,
  removeGuildFromList
} from '$lib/utils/guildSystem.js';
import { legionStore, totalPower } from '$lib/stores/legionStore.js';
import { seasonStore } from '$lib/stores/seasonStore.js';
import { achievementStore } from '$lib/stores/achievementStore.js';

const PLAYER_ID = 'player_1';
const PLAYER_NAME = '玩家指挥官';

function createGuildStore() {
  const savedData = loadGuildData();
  const initialData = savedData || createInitialGuildData();
  
  const { subscribe, set, update } = writable(initialData);
  
  let autoSaveEnabled = true;
  
  function enableAutoSave() {
    autoSaveEnabled = true;
  }
  
  function disableAutoSave() {
    autoSaveEnabled = false;
  }
  
  subscribe(state => {
    if (autoSaveEnabled && state) {
      saveGuildData(state);
    }
  });
  
  function updateCurrentGuild(guild) {
    update(state => {
      const allGuilds = state.allGuilds.map(g => g.id === guild.id ? guild : g);
      return {
        ...state,
        allGuilds,
        currentGuild: guild
      };
    });
  }
  
  return {
    subscribe,
    set,
    update,
    enableAutoSave,
    disableAutoSave,
    
    reset: () => {
      const newData = createInitialGuildData();
      set(newData);
      return newData;
    },
    
    createGuild: (name, description) => update(state => {
      if (state.playerGuildId) return state;
      
      const power = get(totalPower) || 0;
      const guild = createGuild(name, description, PLAYER_ID, PLAYER_NAME, power);
      const allGuilds = [...state.allGuilds, guild];
      
      return {
        ...state,
        allGuilds,
        currentGuildId: guild.id,
        playerGuildId: guild.id,
        currentGuild: guild
      };
    }),
    
    joinGuild: (guildId) => update(state => {
      if (state.playerGuildId) return state;
      
      const guild = state.allGuilds.find(g => g.id === guildId);
      if (!guild) return state;
      
      const newApplicant = {
        id: PLAYER_ID,
        name: PLAYER_NAME,
        invitedBy: null,
        appliedAt: Date.now(),
        message: '申请加入'
      };
      
      const updatedGuild = {
        ...guild,
        applicants: [...guild.applicants, newApplicant]
      };
      
      const allGuilds = state.allGuilds.map(g => g.id === guildId ? updatedGuild : g);
      
      return {
        ...state,
        allGuilds,
        currentGuildId: null,
        playerGuildId: null,
        pendingApplication: guildId
      };
    }),
    
    cancelApplication: () => update(state => {
      if (!state.pendingApplication) return state;
      
      const guild = state.allGuilds.find(g => g.id === state.pendingApplication);
      if (!guild) return { ...state, pendingApplication: null };
      
      const updatedGuild = {
        ...guild,
        applicants: guild.applicants.filter(a => a.id !== PLAYER_ID)
      };
      
      const allGuilds = state.allGuilds.map(g => g.id === state.pendingApplication ? updatedGuild : g);
      
      return {
        ...state,
        allGuilds,
        pendingApplication: null
      };
    }),
    
    acceptApplicant: (applicantId) => update(state => {
      if (!state.currentGuild) return state;
      
      const power = applicantId === PLAYER_ID ? (get(totalPower) || 0) : 0;
      const updatedGuild = acceptApplicant(state.currentGuild, applicantId, PLAYER_ID, power);
      updateCurrentGuild(updatedGuild);
      
      if (applicantId === PLAYER_ID) {
        return {
          ...state,
          currentGuild: updatedGuild,
          playerGuildId: updatedGuild.id,
          pendingApplication: null
        };
      }
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    rejectApplicant: (applicantId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = rejectApplicant(state.currentGuild, applicantId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      if (applicantId === PLAYER_ID) {
        return {
          ...state,
          currentGuild: null,
          currentGuildId: null,
          playerGuildId: null,
          pendingApplication: null
        };
      }
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    kickMember: (memberId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = kickMember(state.currentGuild, memberId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    promoteMember: (memberId, newRole) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = promoteMember(state.currentGuild, memberId, newRole, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    transferLeadership: (newLeaderId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = transferLeadership(state.currentGuild, newLeaderId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    leaveGuild: () => update(state => {
      if (!state.currentGuild || !state.playerGuildId) return state;
      
      if (state.currentGuild.leaderId === PLAYER_ID) {
        if (!confirm('作为会长，离开公会将解散公会。确定要继续吗？')) {
          return state;
        }
        const allGuilds = state.allGuilds.filter(g => g.id !== state.currentGuild.id);
        return {
          ...state,
          allGuilds,
          currentGuild: null,
          currentGuildId: null,
          playerGuildId: null
        };
      }
      
      const updatedGuild = leaveGuild(state.currentGuild, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return {
        ...state,
        currentGuild: null,
        currentGuildId: null,
        playerGuildId: null
      };
    }),
    
    updateGuildInfo: (updates) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = updateGuildInfo(state.currentGuild, updates, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    addAnnouncement: (title, content) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = addAnnouncement(state.currentGuild, title, content, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    removeAnnouncement: (announcementId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = removeAnnouncement(state.currentGuild, announcementId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    createTask: (templateId, customName, customDescription, difficulty) => update(state => {
      if (!state.currentGuild) return state;
      
      const task = createGuildTask(templateId, customName, customDescription, difficulty, PLAYER_ID);
      if (!task) return state;
      
      const updatedGuild = {
        ...state.currentGuild,
        tasks: [...state.currentGuild.tasks, task]
      };
      
      updateCurrentGuild(updatedGuild);
      return { ...state, currentGuild: updatedGuild };
    }),
    
    joinTask: (taskId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = joinTask(state.currentGuild, taskId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    leaveTask: (taskId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = leaveTask(state.currentGuild, taskId, PLAYER_ID);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    updateTaskProgress: (taskId, progress) => update(state => {
      if (!state.currentGuild) return state;
      
      let updatedGuild = updateTaskProgress(state.currentGuild, taskId, progress);
      
      const task = updatedGuild.tasks.find(t => t.id === taskId);
      if (task && task.status === 'completed') {
        const rewards = calculateTaskRewards(task.difficulty, task.participants.length);
        
        if (task.participants.includes(PLAYER_ID)) {
          legionStore.addGold(rewards.gold);
          legionStore.addExpToAllUnits(rewards.exp);
        }
        
        const record = {
          type: 'task',
          taskId: task.id,
          taskName: task.name,
          participants: task.participants,
          rewards,
          timestamp: Date.now()
        };
        saveGuildBattleRecord(record);
        
        seasonStore.processMatchResult('win', { kills: 5, turns: 10 });
        achievementStore.checkProgress(legionStore, state);
      }
      
      updateCurrentGuild(updatedGuild);
      return { ...state, currentGuild: updatedGuild };
    }),
    
    cancelTask: (taskId) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = cancelTask(state.currentGuild, taskId);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    attackBoss: (bossId, damage) => update(state => {
      if (!state.currentGuild) return state;
      
      let updatedGuild = attackBoss(state.currentGuild, bossId, PLAYER_ID, damage);
      
      const bossState = updatedGuild.bossStates.find(b => b.bossId === bossId);
      const bossConfig = GUILD_BOSS_CONFIG.find(b => b.id === bossId);
      
      if (bossState && bossConfig && bossState.currentHp === bossConfig.hp) {
        const rewards = bossConfig.rewards;
        legionStore.addGold(rewards.gold);
        legionStore.addExpToAllUnits(rewards.exp);
        
        if (rewards.items && rewards.items.length > 0) {
          rewards.items.forEach(itemId => {
            legionStore.rollAndAddEquipment({ rarity: 'epic' });
          });
        }
        
        seasonStore.processMatchResult('win', { kills: 10, turns: 20, baseCaptured: true });
        achievementStore.checkProgress(legionStore, state);
      }
      
      updateCurrentGuild(updatedGuild);
      return { ...state, currentGuild: updatedGuild };
    }),
    
    donate: (amount) => update(state => {
      if (!state.currentGuild) return state;
      
      const donation = GUILD_DONATION_OPTIONS.find(d => d.gold === amount);
      if (!donation) return state;
      
      let hasEnough = false;
      legionStore.subscribe(s => {
        hasEnough = (s.currency.gold || 0) >= amount;
      })();
      
      if (!hasEnough) {
        return { ...state, lastDonationResult: { success: false, reason: '金币不足' } };
      }
      
      legionStore.addCurrency('gold', -amount);
      
      const updatedGuild = donate(state.currentGuild, PLAYER_ID, amount);
      updateCurrentGuild(updatedGuild);
      
      achievementStore.checkProgress(legionStore, state);
      
      return { 
        ...state, 
        currentGuild: updatedGuild,
        lastDonationResult: { success: true, amount, contribution: donation.contribution }
      };
    }),
    
    clearDonationResult: () => update(state => ({
      ...state,
      lastDonationResult: null
    })),
    
    addContribution: (amount, type, description) => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = addContribution(state.currentGuild, PLAYER_ID, amount, type, description);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    setCurrentGuild: (guildId) => update(state => {
      const guild = state.allGuilds.find(g => g.id === guildId);
      return {
        ...state,
        currentGuildId: guildId,
        currentGuild: guild || null
      };
    }),
    
    clearCurrentGuild: () => update(state => ({
      ...state,
      currentGuildId: null,
      currentGuild: null
    })),
    
    refreshRankings: () => update(state => {
      const rankings = {};
      
      for (const category of Object.values(RANKING_CATEGORY)) {
        rankings[category] = getRanking(state.allGuilds, category);
      }
      
      saveRankingData(rankings);
      
      return { ...state, rankings };
    }),
    
    getGuildRanking: (category) => {
      let result = [];
      subscribe(state => {
        result = getRanking(state.allGuilds, category);
      })();
      return result;
    },
    
    getMemberRanking: (guildId, category) => {
      let result = [];
      subscribe(state => {
        const guild = state.allGuilds.find(g => g.id === guildId) || state.currentGuild;
        if (guild) {
          result = getMemberRanking(guild, category);
        }
      })();
      return result;
    },
    
    getBattleRecords: () => {
      return getGuildBattleRecords();
    },
    
    resetWeeklyContribution: () => update(state => {
      if (!state.currentGuild) return state;
      
      const updatedGuild = resetWeeklyContribution(state.currentGuild);
      updateCurrentGuild(updatedGuild);
      
      return { ...state, currentGuild: updatedGuild };
    }),
    
    getPlayerRole: () => {
      let role = null;
      subscribe(state => {
        if (state.currentGuild) {
          const member = state.currentGuild.members.find(m => m.id === PLAYER_ID);
          role = member?.role || null;
        }
      })();
      return role;
    },
    
    hasPermission: (permission) => {
      let hasPerm = false;
      subscribe(state => {
        if (state.currentGuild) {
          const member = state.currentGuild.members.find(m => m.id === PLAYER_ID);
          if (member) {
            const roleConfig = GUILD_ROLE_CONFIG[member.role];
            hasPerm = roleConfig?.permissions.includes(permission) || false;
          }
        }
      })();
      return hasPerm;
    }
  };
}

export const guildStore = createGuildStore();

export const currentGuild = derived(guildStore, $store => $store.currentGuild || null);

export const playerGuild = derived(guildStore, $store => {
  if (!$store.playerGuildId) return null;
  return $store.allGuilds.find(g => g.id === $store.playerGuildId) || null;
});

export const playerMember = derived(currentGuild, $guild => {
  if (!$guild) return null;
  return $guild.members.find(m => m.id === PLAYER_ID) || null;
});

export const playerRole = derived(playerMember, $member => $member?.role || null);

export const playerPermissions = derived(playerRole, $role => {
  if (!$role) return [];
  return GUILD_ROLE_CONFIG[$role]?.permissions || [];
});

export const guildLevel = derived(currentGuild, $guild => {
  if (!$guild) return GUILD_LEVEL_CONFIG[0];
  return getGuildLevel($guild.exp);
});

export const expToNextLevel = derived(currentGuild, $guild => {
  if (!$guild) return 0;
  return getExpToNextLevel($guild.exp);
});

export const guildProgress = derived([currentGuild, guildLevel], ([$guild, $level]) => {
  if (!$guild) return 0;
  const nextLevelIndex = GUILD_LEVEL_CONFIG.findIndex(l => l.level === $level.level) + 1;
  if (nextLevelIndex >= GUILD_LEVEL_CONFIG.length) return 100;
  
  const expInLevel = $guild.exp - $level.expRequired;
  const expNeeded = GUILD_LEVEL_CONFIG[nextLevelIndex].expRequired - $level.expRequired;
  
  return Math.min(100, Math.floor((expInLevel / expNeeded) * 100));
});

export const guildPower = derived(currentGuild, $guild => {
  if (!$guild) return 0;
  return calculateGuildPower($guild);
});

export const pendingTasks = derived(currentGuild, $guild => {
  if (!$guild) return [];
  return $guild.tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
});

export const completedTasks = derived(currentGuild, $guild => {
  if (!$guild) return [];
  return $guild.tasks.filter(t => t.status === 'completed');
});

export const playerTasks = derived([currentGuild], ([$guild]) => {
  if (!$guild) return [];
  return $guild.tasks.filter(t => t.participants.includes(PLAYER_ID));
});

export const availableBosses = derived(currentGuild, $guild => {
  if (!$guild) return [];
  return GUILD_BOSS_CONFIG.map(boss => {
    const state = $guild.bossStates.find(bs => bs.bossId === boss.id);
    return {
      ...boss,
      currentHp: state?.currentHp || boss.hp,
      lastKilledAt: state?.lastKilledAt || 0,
      totalKills: state?.totalKills || 0,
      canAttack: state?.currentHp > 0
    };
  });
});

export const memberRankings = derived([currentGuild], ([$guild]) => {
  if (!$guild) return {};
  
  const rankings = {};
  for (const category of Object.values(RANKING_CATEGORY)) {
    rankings[category] = getMemberRanking($guild, category);
  }
  return rankings;
});

export const guildRankings = derived(guildStore, $store => {
  const rankings = {};
  for (const category of Object.values(RANKING_CATEGORY)) {
    rankings[category] = getRanking($store.allGuilds, category);
  }
  return rankings;
});

export const recentContributions = derived(currentGuild, $guild => {
  if (!$guild?.contributionRecords) return [];
  return $guild.contributionRecords.slice(0, 20);
});

export const recentBattles = derived(currentGuild, $guild => {
  return getGuildBattleRecords().slice(0, 10);
});

export const pendingApplications = derived(currentGuild, $guild => {
  if (!$guild) return [];
  return $guild.applicants;
});

export const hasPendingApplication = derived(guildStore, $store => {
  return !!$store.pendingApplication;
});

export const isInGuild = derived(guildStore, $store => {
  return !!$store.playerGuildId;
});

export const isGuildLeader = derived(playerRole, $role => {
  return $role === GUILD_MEMBER_ROLE.LEADER;
});

export const isGuildOfficer = derived(playerRole, $role => {
  return $role === GUILD_MEMBER_ROLE.LEADER || $role === GUILD_MEMBER_ROLE.OFFICER;
});

export const sortedMembers = derived(currentGuild, $guild => {
  if (!$guild) return [];
  return [...$guild.members].sort((a, b) => {
    const roleOrder = [GUILD_MEMBER_ROLE.LEADER, GUILD_MEMBER_ROLE.OFFICER, GUILD_MEMBER_ROLE.MEMBER];
    const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
    if (roleDiff !== 0) return roleDiff;
    return b.totalContribution - a.totalContribution;
  });
});

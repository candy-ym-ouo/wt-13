// @ts-nocheck
import { createCampaignTemplate, PUBLISH_STATUS } from '$lib/config/campaignConfig';

const STORAGE_KEY = 'tactical_board_game_campaigns';
const AUTOSAVE_KEY = 'tactical_board_game_campaign_autosave';

export function saveCampaign(campaign) {
  try {
    const campaigns = getCampaigns();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    
    const campaignToSave = {
      ...campaign,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      campaigns[existingIndex] = campaignToSave;
    } else {
      campaigns.unshift(campaignToSave);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    return { success: true, message: '保存成功' };
  } catch (e) {
    console.error('保存战役失败:', e);
    return { success: false, message: '保存失败: ' + e.message };
  }
}

export function getCampaigns() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取战役列表失败:', e);
    return [];
  }
}

export function getCampaignById(id) {
  try {
    const campaigns = getCampaigns();
    return campaigns.find(c => c.id === id) || null;
  } catch (e) {
    console.error('读取战役失败:', e);
    return null;
  }
}

export function deleteCampaign(id) {
  try {
    const campaigns = getCampaigns();
    const filtered = campaigns.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true, message: '删除成功' };
  } catch (e) {
    console.error('删除战役失败:', e);
    return { success: false, message: '删除失败: ' + e.message };
  }
}

export function duplicateCampaign(id) {
  try {
    const campaign = getCampaignById(id);
    if (!campaign) {
      return { success: false, message: '战役不存在' };
    }

    const duplicated = {
      ...JSON.parse(JSON.stringify(campaign)),
      id: `campaign_${Date.now()}`,
      name: `${campaign.name} (副本)`,
      status: PUBLISH_STATUS.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const campaigns = getCampaigns();
    campaigns.unshift(duplicated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));

    return { success: true, message: '复制成功', campaign: duplicated };
  } catch (e) {
    console.error('复制战役失败:', e);
    return { success: false, message: '复制失败: ' + e.message };
  }
}

export function autosaveCampaign(campaign) {
  try {
    const autosaveData = {
      ...campaign,
      updatedAt: new Date().toISOString(),
      isAutosave: true
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosaveData));
    return true;
  } catch (e) {
    console.error('自动保存失败:', e);
    return false;
  }
}

export function getAutosaveCampaign() {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('读取自动保存失败:', e);
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
    return true;
  } catch (e) {
    console.error('清除自动保存失败:', e);
    return false;
  }
}

export function exportCampaign(campaign) {
  try {
    const exportData = JSON.stringify(campaign, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name || 'campaign'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, message: '导出成功' };
  } catch (e) {
    console.error('导出战役失败:', e);
    return { success: false, message: '导出失败: ' + e.message };
  }
}

export function importCampaign(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const campaign = JSON.parse(e.target.result);
        
        if (!validateCampaign(campaign)) {
          resolve({ success: false, message: '文件格式不正确' });
          return;
        }

        campaign.id = `campaign_${Date.now()}`;
        campaign.createdAt = new Date().toISOString();
        campaign.updatedAt = new Date().toISOString();
        campaign.status = PUBLISH_STATUS.DRAFT;

        const campaigns = getCampaigns();
        campaigns.unshift(campaign);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));

        resolve({ success: true, message: '导入成功', campaign });
      } catch (err) {
        resolve({ success: false, message: '解析失败: ' + err.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: '读取文件失败' });
    };

    reader.readAsText(file);
  });
}

export function validateCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object') return false;
  if (!campaign.id && !campaign.name) return false;
  if (!campaign.map || !Array.isArray(campaign.map.terrain)) return false;
  if (!campaign.spawnPoints || !campaign.spawnPoints.red || !campaign.spawnPoints.blue) return false;
  if (!Array.isArray(campaign.eventChains)) return false;
  return true;
}

export function getCampaignStats(campaigns) {
  const stats = {
    total: campaigns.length,
    draft: 0,
    testing: 0,
    published: 0,
    archived: 0
  };

  for (const campaign of campaigns) {
    switch (campaign.status) {
      case PUBLISH_STATUS.DRAFT:
        stats.draft++;
        break;
      case PUBLISH_STATUS.TESTING:
        stats.testing++;
        break;
      case PUBLISH_STATUS.PUBLISHED:
        stats.published++;
        break;
      case PUBLISH_STATUS.ARCHIVED:
        stats.archived++;
        break;
    }
  }

  return stats;
}

export function publishCampaign(id) {
  try {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return { success: false, message: '战役不存在' };
    }

    const validation = validateCampaignForPublish(campaign);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    campaign.status = PUBLISH_STATUS.PUBLISHED;
    campaign.publishedAt = new Date().toISOString();
    campaign.updatedAt = new Date().toISOString();

    const index = campaigns.findIndex(c => c.id === id);
    campaigns[index] = campaign;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));

    return { success: true, message: '发布成功' };
  } catch (e) {
    console.error('发布战役失败:', e);
    return { success: false, message: '发布失败: ' + e.message };
  }
}

export function validateCampaignForPublish(campaign) {
  const issues = [];

  if (!campaign.name || campaign.name.trim() === '') {
    issues.push('战役名称不能为空');
  }

  if (!campaign.map || campaign.map.terrain.length === 0) {
    issues.push('地图不能为空');
  }

  const terrain = campaign.map.terrain;
  let hasRedBase = false;
  let hasBlueBase = false;

  for (const row of terrain) {
    for (const tile of row) {
      if (tile === 'base_red') hasRedBase = true;
      if (tile === 'base_blue') hasBlueBase = true;
    }
  }

  if (!hasRedBase) {
    issues.push('地图需要至少一个红方基地');
  }
  if (!hasBlueBase) {
    issues.push('地图需要至少一个蓝方基地');
  }

  if (!campaign.initialUnits || 
      campaign.initialUnits.red.length === 0 || 
      campaign.initialUnits.blue.length === 0) {
    issues.push('双方都需要至少一个初始单位');
  }

  if (issues.length > 0) {
    return { valid: false, message: issues.join('；') };
  }

  return { valid: true };
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function clearAllCampaigns() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清除所有战役失败:', e);
    return false;
  }
}

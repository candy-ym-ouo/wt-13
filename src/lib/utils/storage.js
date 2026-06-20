const STORAGE_KEY = 'tactical_board_game_records';

export function saveGameRecord(record) {
  try {
    const records = getGameRecords();
    records.unshift({
      ...record,
      id: Date.now(),
      date: new Date().toISOString()
    });
    if (records.length > 50) {
      records.length = 50;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    console.error('保存游戏记录失败:', e);
    return false;
  }
}

export function getGameRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取游戏记录失败:', e);
    return [];
  }
}

export function clearGameRecords() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('清除游戏记录失败:', e);
    return false;
  }
}

export function saveGameState(state) {
  try {
    localStorage.setItem('tactical_board_game_save', JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('保存游戏状态失败:', e);
    return false;
  }
}

export function loadGameState() {
  try {
    const data = localStorage.getItem('tactical_board_game_save');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('加载游戏状态失败:', e);
    return null;
  }
}

export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

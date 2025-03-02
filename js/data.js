// 联赛名称映射
const LEAGUES = {
    "PL": "英超",
    "PD": "西甲",
    "SA": "意甲",
    "BL1": "德甲",
    "FL1": "法甲"
};

// 存储各联赛的球队特征数据
let featuresData = {};

// 预加载所有联赛的数据
async function loadAllLeaguesData() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    
    try {
        // 并行加载所有联赛数据
        const promises = Object.keys(LEAGUES).map(leagueCode => 
            loadLeagueData(leagueCode)
        );
        
        await Promise.all(promises);
        console.log('所有联赛数据加载完成');
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载球队数据失败，请刷新页面重试');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// 加载单个联赛的数据
async function loadLeagueData(leagueCode) {
    try {
        // 这里我们使用JSON文件而不是CSV，更容易在前端处理
        const response = await fetch(`data/features_${leagueCode}2024.json`);
        if (!response.ok) {
            throw new Error(`无法加载 ${LEAGUES[leagueCode]} 数据`);
        }
        
        const data = await response.json();
        featuresData[leagueCode] = data;
        
        // 填充球队选择框
        populateTeamSelects(leagueCode, Object.keys(data));
        
        return data;
    } catch (error) {
        console.error(`加载 ${LEAGUES[leagueCode]} 数据失败:`, error);
        throw error;
    }
}

// 获取球队特征
function getTeamFeatures(teamName, leagueCode = null) {
    if (leagueCode && featuresData[leagueCode] && featuresData[leagueCode][teamName]) {
        return featuresData[leagueCode][teamName];
    }
    
    // 在所有联赛中查找
    for (const [code, teams] of Object.entries(featuresData)) {
        if (teams[teamName]) {
            return teams[teamName];
        }
    }
    
    return null;
}

// 填充球队选择框
function populateTeamSelects(leagueCode, teamsList) {
    // 这个函数会在app.js中实现
    // 这里只是声明，实际实现会在主应用逻辑中
}

// 记录用户预测到本地存储
function logUserPrediction(matches) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
        timestamp,
        matches
    };
    
    // 获取现有日志
    let logs = [];
    const storedLogs = localStorage.getItem('prediction_logs');
    if (storedLogs) {
        logs = JSON.parse(storedLogs);
    }
    
    // 添加新日志
    logs.push(logEntry);
    
    // 限制日志数量，防止本地存储过大
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    
    // 保存到本地存储
    localStorage.setItem('prediction_logs', JSON.stringify(logs));
}

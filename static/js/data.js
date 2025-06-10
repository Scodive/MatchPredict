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
    try {
        // 从API获取球队数据
        const response = await fetch('/api/teams');
        if (!response.ok) {
            throw new Error('无法获取球队数据');
        }
        
        const data = await response.json();
        if (data.success) {
            featuresData = data.teams;
            
            // 填充球队选择框
            for (const [leagueCode, teams] of Object.entries(featuresData)) {
                populateTeamSelects(leagueCode, teams);
            }
            
            console.log('所有联赛数据加载完成');
        } else {
            throw new Error(data.message || '获取球队数据失败');
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        // 使用默认数据
        featuresData = {
            "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC", "Chelsea FC", "Tottenham Hotspur FC"],
            "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC", "Valencia CF", "Real Betis Balompié"],
            "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli", "AS Roma", "SS Lazio"],
            "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen", "VfB Stuttgart", "Eintracht Frankfurt"],
            "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais", "OGC Nice", "Stade Rennais FC"]
        };
        
        // 填充默认数据
        for (const [leagueCode, teams] of Object.entries(featuresData)) {
            populateTeamSelects(leagueCode, teams);
        }
        
        console.log('使用默认球队数据');
    }
}

// 获取球队特征 (简化版)
function getTeamFeatures(teamName, leagueCode = null) {
    // 返回基础信息，不再依赖复杂的统计数据
    return {
        team_name: teamName,
        league_code: leagueCode,
        // 默认数据，实际预测会通过AI进行
        home_goals_scored_avg: 1.5,
        away_goals_scored_avg: 1.2,
        home_goals_conceded_avg: 1.0,
        away_goals_conceded_avg: 1.3
    };
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
    try {
        const storedLogs = localStorage.getItem('prediction_logs');
        if (storedLogs) {
            logs = JSON.parse(storedLogs);
        }
    } catch (e) {
        console.warn('读取本地日志失败:', e);
        logs = [];
    }
    
    // 添加新日志
    logs.push(logEntry);
    
    // 限制日志数量，防止本地存储过大
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    
    // 保存到本地存储
    try {
        localStorage.setItem('prediction_logs', JSON.stringify(logs));
    } catch (e) {
        console.warn('保存本地日志失败:', e);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保加载遮罩在页面加载后隐藏
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    
    // 加载球队数据
    loadAllLeaguesData();
});

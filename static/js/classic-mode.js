/**
 * 经典模式 - 本地预测功能
 * 使用本地特征数据进行预测，不依赖AI
 */

// 全局变量
let classicMatches = [];
let teamFeaturesData = {};

// 初始化经典模式
function initClassicMode() {
    // 加载本地特征数据
    loadTeamFeatures();
    
    // 绑定事件监听器
    const addMatchBtn = document.getElementById('add-match-btn');
    const clearClassicBtn = document.getElementById('clear-classic-selection-btn');
    const classicPredictBtn = document.getElementById('classic-predict-btn');
    
    if (addMatchBtn) {
        addMatchBtn.addEventListener('click', addClassicMatch);
    }
    
    if (clearClassicBtn) {
        clearClassicBtn.addEventListener('click', clearClassicMatches);
    }
    
    if (classicPredictBtn) {
        classicPredictBtn.addEventListener('click', predictClassicMatches);
    }
}

// 加载球队特征数据
async function loadTeamFeatures() {
    const leagues = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
    
    for (const league of leagues) {
        try {
            // 尝试加载JSON特征文件
            const response = await fetch(`/data/features_${league}2024.json`);
            if (response.ok) {
                const data = await response.json();
                teamFeaturesData[league] = data;
                console.log(`成功加载 ${league} 特征数据`);
            } else {
                console.warn(`无法加载 ${league} 特征数据`);
                // 使用默认数据
                teamFeaturesData[league] = generateDefaultFeatures(league);
            }
        } catch (error) {
            console.error(`加载 ${league} 特征数据失败:`, error);
            teamFeaturesData[league] = generateDefaultFeatures(league);
        }
    }
}

// 生成默认特征数据
function generateDefaultFeatures(league) {
    const teams = getTeamsByLeague(league);
    const features = {};
    
    teams.forEach((team, index) => {
        // 基于球队名称生成一些基础特征
        const seed = hashCode(team) / 2147483647; // 归一化到 0-1
        
        features[team] = {
            home_goals_scored_avg: 1.2 + seed * 1.5,
            home_goals_conceded_avg: 0.8 + seed * 1.2,
            away_goals_scored_avg: 1.0 + seed * 1.2,
            away_goals_conceded_avg: 1.0 + seed * 1.4,
            home_win_rate: 0.3 + seed * 0.4,
            away_win_rate: 0.2 + seed * 0.4,
            overall_win_rate: 0.25 + seed * 0.4,
            recent_form: 0.3 + seed * 0.7,
            attack: 1.0 + seed * 0.8,
            defense: 1.0 + seed * 0.6,
            xG: 1.1 + seed * 0.8,
            xGA: 1.0 + seed * 0.7
        };
    });
    
    return features;
}

// 字符串哈希函数
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return hash;
}

// 根据联赛获取球队列表
function getTeamsByLeague(league) {
    const teams = {
        'PL': ['Arsenal FC', 'Manchester City FC', 'Liverpool FC', 'Manchester United FC', 'Chelsea FC', 'Tottenham Hotspur FC', 'Newcastle United FC', 'Brighton & Hove Albion FC'],
        'PD': ['Real Madrid CF', 'FC Barcelona', 'Atlético de Madrid', 'Sevilla FC', 'Valencia CF', 'Real Betis Balompié', 'Real Sociedad', 'Athletic Bilbao'],
        'SA': ['FC Internazionale Milano', 'AC Milan', 'Juventus FC', 'SSC Napoli', 'AS Roma', 'SS Lazio', 'Atalanta BC', 'ACF Fiorentina'],
        'BL1': ['FC Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'Bayer 04 Leverkusen', 'VfB Stuttgart', 'Eintracht Frankfurt', 'Borussia Mönchengladbach', 'VfL Wolfsburg'],
        'FL1': ['Paris Saint-Germain FC', 'Olympique de Marseille', 'AS Monaco FC', 'Olympique Lyonnais', 'OGC Nice', 'Stade Rennais FC', 'RC Lens', 'RC Strasbourg Alsace']
    };
    
    return teams[league] || [];
}

// 添加经典模式比赛
function addClassicMatch() {
    const leagueSelect = document.getElementById('league-select');
    const homeTeamSelect = document.getElementById('home-team-select');
    const awayTeamSelect = document.getElementById('away-team-select');
    const homeOddsInput = document.getElementById('home-odds');
    const drawOddsInput = document.getElementById('draw-odds');
    const awayOddsInput = document.getElementById('away-odds');
    
    // 验证输入
    if (!leagueSelect.value) {
        showMessage('请选择联赛', 'error');
        return;
    }
    
    if (!homeTeamSelect.value || !awayTeamSelect.value) {
        showMessage('请选择主队和客队', 'error');
        return;
    }
    
    if (homeTeamSelect.value === awayTeamSelect.value) {
        showMessage('主队和客队不能相同', 'error');
        return;
    }
    
    if (!homeOddsInput.value || !drawOddsInput.value || !awayOddsInput.value) {
        showMessage('请填写完整的赔率信息', 'error');
        return;
    }
    
    // 检查是否已存在相同比赛
    const existingMatch = classicMatches.find(match => 
        match.league_code === leagueSelect.value &&
        match.home_team === homeTeamSelect.value &&
        match.away_team === awayTeamSelect.value
    );
    
    if (existingMatch) {
        showMessage('该比赛已存在', 'error');
        return;
    }
    
    // 创建比赛对象
    const match = {
        id: Date.now(),
        league_code: leagueSelect.value,
        league_name: leagueSelect.options[leagueSelect.selectedIndex].text,
        home_team: homeTeamSelect.value,
        away_team: awayTeamSelect.value,
        home_odds: parseFloat(homeOddsInput.value),
        draw_odds: parseFloat(drawOddsInput.value),
        away_odds: parseFloat(awayOddsInput.value)
    };
    
    // 添加到数组
    classicMatches.push(match);
    
    // 更新显示
    updateClassicMatchesDisplay();
    
    // 清空表单
    homeOddsInput.value = '';
    drawOddsInput.value = '';
    awayOddsInput.value = '';
    
    showMessage('比赛已添加到购物车', 'success');
}

// 更新经典模式比赛显示
function updateClassicMatchesDisplay() {
    const container = document.getElementById('classic-selected-matches');
    const countSpan = document.getElementById('classic-match-count');
    const clearBtn = document.getElementById('clear-classic-selection-btn');
    const predictBtn = document.getElementById('classic-predict-btn');
    
    // 更新计数
    countSpan.textContent = `(${classicMatches.length})`;
    
    // 更新按钮状态
    const hasMatches = classicMatches.length > 0;
    clearBtn.disabled = !hasMatches;
    predictBtn.disabled = !hasMatches;
    
    if (classicMatches.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <p>购物车为空</p>
                <small>请在左侧添加比赛</small>
            </div>
        `;
        return;
    }
    
    // 生成比赛卡片
    container.innerHTML = classicMatches.map(match => `
        <div class="match-card" data-match-id="${match.id}">
            <div class="match-info">
                <div class="teams">
                    <div class="home-team">${match.home_team}</div>
                    <div class="vs">VS</div>
                    <div class="away-team">${match.away_team}</div>
                </div>
                <div class="league">${match.league_name}</div>
            </div>
            
            <div class="odds-info">
                <div class="odds-group">
                    <span class="odds-label">赔率</span>
                    <span class="odds-values">${match.home_odds} / ${match.draw_odds} / ${match.away_odds}</span>
                </div>
            </div>
            
            <div class="match-actions">
                <button class="remove-match-btn" onclick="removeClassicMatch(${match.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 移除经典模式比赛
function removeClassicMatch(matchId) {
    classicMatches = classicMatches.filter(match => match.id !== matchId);
    updateClassicMatchesDisplay();
    showMessage('比赛已移除', 'info');
}

// 清空经典模式比赛
function clearClassicMatches() {
    classicMatches = [];
    updateClassicMatchesDisplay();
    showMessage('购物车已清空', 'info');
}

// 预测经典模式比赛
async function predictClassicMatches() {
    if (classicMatches.length === 0) {
        showMessage('请先添加比赛', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // 使用本地预测算法
        const predictions = classicMatches.map(match => {
            return predictMatchLocally(match);
        });
        
        // 生成串关组合
        const parlayPredictions = generateClassicParlays(predictions);
        
        // 显示结果
        displayClassicPredictions(predictions);
        displayClassicParlays(parlayPredictions);
        
        // 显示结果区域
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('hidden');
        
        // 切换到单场预测标签
        const individualTab = document.querySelector('[data-tab="individual"]');
        if (individualTab) {
            individualTab.click();
        }
        
        showMessage(`成功预测 ${predictions.length} 场比赛`, 'success');
        
    } catch (error) {
        console.error('预测失败:', error);
        showMessage('预测失败，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

// 本地预测算法
function predictMatchLocally(match) {
    const homeFeatures = getTeamFeatures(match.home_team, match.league_code);
    const awayFeatures = getTeamFeatures(match.away_team, match.league_code);
    
    if (!homeFeatures || !awayFeatures) {
        throw new Error(`找不到球队数据: ${match.home_team} 或 ${match.away_team}`);
    }
    
    // 计算预期进球
    const homeExpectedGoals = calculateExpectedGoals(homeFeatures, awayFeatures, true, match.home_odds, match.away_odds);
    const awayExpectedGoals = calculateExpectedGoals(awayFeatures, homeFeatures, false, match.away_odds, match.home_odds);
    
    // 使用泊松分布计算概率
    const probabilities = calculateMatchProbabilities(homeExpectedGoals, awayExpectedGoals);
    
    // 根据赔率调整概率
    const adjustedProbs = adjustProbabilitiesWithOdds(probabilities, match.home_odds, match.draw_odds, match.away_odds);
    
    // 计算期望值
    const homeEV = (adjustedProbs.home * match.home_odds) - 1;
    const drawEV = (adjustedProbs.draw * match.draw_odds) - 1;
    const awayEV = (adjustedProbs.away * match.away_odds) - 1;
    
    // 确定最佳投注
    const bestBet = homeEV > drawEV && homeEV > awayEV ? 'home' : 
                   drawEV > awayEV ? 'draw' : 'away';
    
    const bestEV = Math.max(homeEV, drawEV, awayEV);
    
    // 计算最可能的比分
    const mostLikelyScores = calculateMostLikelyScores(homeExpectedGoals, awayExpectedGoals);
    
    return {
        match_id: match.id,
        league_code: match.league_code,
        home_team: match.home_team,
        away_team: match.away_team,
        home_win_prob: adjustedProbs.home,
        draw_prob: adjustedProbs.draw,
        away_win_prob: adjustedProbs.away,
        home_odds: match.home_odds,
        draw_odds: match.draw_odds,
        away_odds: match.away_odds,
        best_bet: bestBet,
        best_ev: bestEV,
        expected_goals: {
            home: homeExpectedGoals,
            away: awayExpectedGoals
        },
        most_likely_scores: mostLikelyScores,
        recommendation: getBetRecommendation(bestBet, bestEV)
    };
}

// 获取球队特征
function getTeamFeatures(teamName, leagueCode) {
    const leagueData = teamFeaturesData[leagueCode];
    if (!leagueData) return null;
    
    return leagueData[teamName] || null;
}

// 计算预期进球
function calculateExpectedGoals(teamFeatures, opponentFeatures, isHome, teamOdds, opponentOdds) {
    let expectedGoals;
    
    if (isHome) {
        expectedGoals = (
            (teamFeatures.home_goals_scored_avg || 1.3) * 0.4 +
            (teamFeatures.attack || 1.3) * 0.3 +
            (teamFeatures.recent_form || 1.0) * 0.2 +
            (teamFeatures.xG || 1.2) * 0.1
        );
        
        // 主场优势
        expectedGoals *= 1.05;
    } else {
        expectedGoals = (
            (teamFeatures.away_goals_scored_avg || 1.1) * 0.4 +
            (teamFeatures.attack || 1.3) * 0.3 +
            (teamFeatures.recent_form || 1.0) * 0.2 +
            (teamFeatures.xG || 1.2) * 0.1
        );
    }
    
    // 根据对手防守调整
    const opponentDefense = opponentFeatures.defense || 1.0;
    expectedGoals *= (2.0 - opponentDefense) / 1.0; // 防守越强，进球越少
    
    // 根据赔率调整
    const oddsRatio = teamOdds / opponentOdds;
    if (oddsRatio < 0.7) { // 明显强队
        expectedGoals *= 1.2;
    } else if (oddsRatio > 1.5) { // 明显弱队
        expectedGoals *= 0.8;
    }
    
    return Math.max(expectedGoals, 0.3); // 最小期望进球
}

// 计算比赛概率
function calculateMatchProbabilities(homeGoals, awayGoals) {
    let homeWin = 0, draw = 0, awayWin = 0;
    
    // 使用泊松分布计算各种比分的概率
    for (let h = 0; h <= 5; h++) {
        for (let a = 0; a <= 5; a++) {
            const prob = poissonProbability(h, homeGoals) * poissonProbability(a, awayGoals);
            
            if (h > a) homeWin += prob;
            else if (h === a) draw += prob;
            else awayWin += prob;
        }
    }
    
    // 归一化
    const total = homeWin + draw + awayWin;
    return {
        home: homeWin / total,
        draw: draw / total,
        away: awayWin / total
    };
}

// 泊松概率质量函数
function poissonProbability(k, lambda) {
    return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

// 阶乘函数
function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// 根据赔率调整概率
function adjustProbabilitiesWithOdds(probs, homeOdds, drawOdds, awayOdds) {
    // 计算隐含概率
    const totalMargin = 1/homeOdds + 1/drawOdds + 1/awayOdds - 1;
    const homeImplied = (1/homeOdds) / (1 + totalMargin);
    const drawImplied = (1/drawOdds) / (1 + totalMargin);
    const awayImplied = (1/awayOdds) / (1 + totalMargin);
    
    // 混合计算概率和隐含概率
    const weight = 0.7; // 计算概率权重
    const oddsWeight = 0.3; // 赔率权重
    
    const adjustedHome = probs.home * weight + homeImplied * oddsWeight;
    const adjustedDraw = probs.draw * weight + drawImplied * oddsWeight;
    const adjustedAway = probs.away * weight + awayImplied * oddsWeight;
    
    // 归一化
    const total = adjustedHome + adjustedDraw + adjustedAway;
    return {
        home: adjustedHome / total,
        draw: adjustedDraw / total,
        away: adjustedAway / total
    };
}

// 计算最可能的比分
function calculateMostLikelyScores(homeGoals, awayGoals) {
    const scores = [];
    
    for (let h = 0; h <= 4; h++) {
        for (let a = 0; a <= 4; a++) {
            const prob = poissonProbability(h, homeGoals) * poissonProbability(a, awayGoals);
            scores.push({
                score: `${h}-${a}`,
                probability: prob
            });
        }
    }
    
    return scores
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3)
        .map(s => ({ score: s.score, probability: s.probability }));
}

// 获取投注建议
function getBetRecommendation(bestBet, bestEV) {
    const betNames = {
        'home': '主胜',
        'draw': '平局', 
        'away': '客胜'
    };
    
    if (bestEV > 0.05) {
        return `强烈推荐 ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    } else if (bestEV > 0) {
        return `推荐 ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    } else {
        return `谨慎投注 ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    }
}

// 显示经典预测结果
function displayClassicPredictions(predictions) {
    const container = document.getElementById('individual-results');
    
    container.innerHTML = predictions.map(pred => `
        <div class="prediction-card classic-prediction">
            <div class="match-header">
                <h3>${pred.home_team} vs ${pred.away_team}</h3>
                <span class="league-badge">${pred.league_code}</span>
            </div>
            
            <div class="probabilities-section">
                <h4>胜平负概率</h4>
                <div class="probability-bars">
                    <div class="prob-bar">
                        <span class="prob-label">主胜</span>
                        <div class="prob-value">${(pred.home_win_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.home_win_prob * 100}%"></div>
                        </div>
                    </div>
                    <div class="prob-bar">
                        <span class="prob-label">平局</span>
                        <div class="prob-value">${(pred.draw_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.draw_prob * 100}%"></div>
                        </div>
                    </div>
                    <div class="prob-bar">
                        <span class="prob-label">客胜</span>
                        <div class="prob-value">${(pred.away_win_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.away_win_prob * 100}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="prediction-details">
                <div class="detail-item">
                    <strong>预期进球:</strong> 
                    ${pred.expected_goals.home.toFixed(1)} - ${pred.expected_goals.away.toFixed(1)}
                </div>
                <div class="detail-item">
                    <strong>最可能比分:</strong> 
                    ${pred.most_likely_scores.map(s => s.score).join(', ')}
                </div>
                <div class="detail-item recommendation">
                    <strong>投注建议:</strong> ${pred.recommendation}
                </div>
            </div>
            
            <div class="odds-comparison">
                <h4>赔率对比</h4>
                <div class="odds-row">
                    <span>主胜: ${pred.home_odds}</span>
                    <span>平局: ${pred.draw_odds}</span>
                    <span>客胜: ${pred.away_odds}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        ${message}
    `;
    
    // 添加到页面
    document.body.appendChild(messageEl);
    
    // 3秒后移除
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// 显示/隐藏加载状态
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

// 生成经典模式串关组合
function generateClassicParlays(predictions) {
    if (predictions.length < 2) {
        return { best: null, all: [] };
    }
    
    const allCombinations = [];
    
    // 为每场比赛创建所有可能的选择
    const allSelections = predictions.map(pred => [
        { type: 'home', odds: pred.home_odds, prob: pred.home_win_prob, ev: (pred.home_win_prob * pred.home_odds) - 1 },
        { type: 'draw', odds: pred.draw_odds, prob: pred.draw_prob, ev: (pred.draw_prob * pred.draw_odds) - 1 },
        { type: 'away', odds: pred.away_odds, prob: pred.away_win_prob, ev: (pred.away_win_prob * pred.away_odds) - 1 }
    ]);
    
    // 生成所有可能的组合（笛卡尔积）
    function generateCombinations(index, currentCombo) {
        if (index === allSelections.length) {
            const combo = {
                selections: currentCombo.map((sel, i) => ({
                    match: `${predictions[i].home_team} vs ${predictions[i].away_team}`,
                    pick: sel.type,
                    odds: sel.odds,
                    prob: sel.prob
                })),
                totalOdds: currentCombo.reduce((acc, sel) => acc * sel.odds, 1),
                totalProb: currentCombo.reduce((acc, sel) => acc * sel.prob, 1),
                avgEV: currentCombo.reduce((acc, sel) => acc + sel.ev, 0) / currentCombo.length
            };
            combo.expectedValue = (combo.totalProb * combo.totalOdds) - 1;
            allCombinations.push(combo);
            return;
        }
        
        for (const selection of allSelections[index]) {
            currentCombo.push(selection);
            generateCombinations(index + 1, currentCombo);
            currentCombo.pop();
        }
    }
    
    generateCombinations(0, []);
    
    // 按期望值排序
    allCombinations.sort((a, b) => b.expectedValue - a.expectedValue);
    
    return {
        best: allCombinations[0],
        all: allCombinations.slice(0, 10) // 只取前10个最佳组合
    };
}

// 显示经典模式串关结果
function displayClassicParlays(parlayPredictions) {
    // 显示最佳串关
    const bestParlayContainer = document.getElementById('best-parlay-results');
    if (parlayPredictions.best) {
        bestParlayContainer.innerHTML = `
            <div class="best-parlay-card">
                <h3><i class="fas fa-star"></i> 最佳串关组合</h3>
                <div class="parlay-details">
                    <div class="parlay-info">
                        <span class="parlay-odds">总赔率: ${parlayPredictions.best.totalOdds.toFixed(2)}</span>
                        <span class="parlay-prob">成功概率: ${(parlayPredictions.best.totalProb * 100).toFixed(1)}%</span>
                        <span class="parlay-ev ${parlayPredictions.best.expectedValue > 0 ? 'positive' : 'negative'}">
                            期望值: ${(parlayPredictions.best.expectedValue * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div class="parlay-selections">
                        ${parlayPredictions.best.selections.map(sel => `
                            <div class="selection-item">
                                <span class="match-name">${sel.match}</span>
                                <span class="pick-type">${getPickDisplayName(sel.pick)}</span>
                                <span class="pick-odds">@${sel.odds}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        bestParlayContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-info-circle"></i>
                <p>需要至少2场比赛才能生成串关</p>
            </div>
        `;
    }
    
    // 显示其他组合
    const allParlaysContainer = document.getElementById('all-parlays-results');
    if (parlayPredictions.all.length > 1) {
        allParlaysContainer.innerHTML = `
            <div class="parlays-list">
                <h3><i class="fas fa-layer-group"></i> 其他推荐组合</h3>
                ${parlayPredictions.all.slice(1).map((parlay, index) => `
                    <div class="parlay-item">
                        <div class="parlay-header">
                            <span class="parlay-rank">#${index + 2}</span>
                            <span class="parlay-odds">@${parlay.totalOdds.toFixed(2)}</span>
                            <span class="parlay-prob">${(parlay.totalProb * 100).toFixed(1)}%</span>
                            <span class="parlay-ev ${parlay.expectedValue > 0 ? 'positive' : 'negative'}">
                                ${(parlay.expectedValue * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="parlay-picks">
                            ${parlay.selections.map(sel => `
                                <span class="pick-chip">${getPickDisplayName(sel.pick)}</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        allParlaysContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-info-circle"></i>
                <p>暂无其他组合可显示</p>
            </div>
        `;
    }
}

// 获取投注类型显示名称
function getPickDisplayName(pick) {
    const names = {
        'home': '主胜',
        'draw': '平局',
        'away': '客胜'
    };
    return names[pick] || pick;
}

// 暴露给全局使用的函数和变量
window.getClassicMatches = () => classicMatches;
window.setClassicMatches = (matches) => { classicMatches = matches; };
window.updateClassicMatchesDisplay = updateClassicMatchesDisplay;
window.clearClassicMatches = clearClassicMatches;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initClassicMode();
});

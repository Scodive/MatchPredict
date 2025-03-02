/**
 * 预测单场比赛结果
 */
function predictMatch(league_code, home_team, away_team, home_odds, draw_odds, away_odds) {
    // 获取球队特征
    const home_features = getTeamFeatures(home_team, league_code);
    const away_features = getTeamFeatures(away_team, league_code);
    
    if (!home_features || !away_features) {
        throw new Error(`找不到球队数据: ${home_team} 或 ${away_team}`);
    }
    
    // 改进的概率计算，增加平局的权重
    // 考虑球队的进攻和防守能力
    const homeAttack = home_features.attack || home_features.home_goals_scored_avg || 1.5;
    const homeDefense = home_features.defense || home_features.home_goals_conceded_avg || 1.2;
    const awayAttack = away_features.attack || away_features.away_goals_scored_avg || 1.3;
    const awayDefense = away_features.defense || away_features.away_goals_conceded_avg || 1.4;
    
    // 计算预期进球
    const homeExpectedGoals = (homeAttack * 0.7 + awayDefense * 0.3) * 1.05; // 主场优势
    const awayExpectedGoals = (awayAttack * 0.7 + homeDefense * 0.3) * 0.97; // 客场劣势
    
    // 使用泊松分布计算比分概率
    const maxGoals = 5;
    const scoreProbs = {};
    let totalProb = 0;
    
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            // 使用泊松分布计算特定比分的概率
            const homeProb = Math.exp(-homeExpectedGoals) * Math.pow(homeExpectedGoals, i) / factorial(i);
            const awayProb = Math.exp(-awayExpectedGoals) * Math.pow(awayExpectedGoals, j) / factorial(j);
            scoreProbs[`${i}-${j}`] = homeProb * awayProb;
            totalProb += homeProb * awayProb;
        }
    }
    
    // 计算胜平负概率
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;
    
    for (const [score, prob] of Object.entries(scoreProbs)) {
        const [home, away] = score.split('-').map(Number);
        
        if (home > away) {
            homeWinProb += prob;
        } else if (home === away) {
            drawProb += prob;
        } else {
            awayWinProb += prob;
        }
    }
    
    // 归一化概率
    const normalizationFactor = 1 / totalProb;
    homeWinProb *= normalizationFactor;
    drawProb *= normalizationFactor;
    awayWinProb *= normalizationFactor;
    
    // 增加平局的权重 - 根据历史数据调整
    // 足球比赛中平局的概率通常在25%-30%之间
    const leagueDrawAdjustment = {
        'PL': 1.1,  // 英超平局率略高
        'PD': 1.3,  // 西甲平局率更高
        'SA': 1.1,  // 意甲平局率很高
        'BL1': 0.9, // 德甲平局率较低
        'FL1': 1.0  // 法甲平局率中等
    };
    
    const drawAdjustment = leagueDrawAdjustment[league_code] || 1.1;
    
    // 应用平局调整
    let adjustedDrawProb = drawProb * drawAdjustment;
    const reduction = (adjustedDrawProb - drawProb) / 2;
    let adjustedHomeWinProb = homeWinProb - reduction;
    let adjustedAwayWinProb = awayWinProb - reduction;
    
    // 再次归一化
    const totalAdjustedProb = adjustedHomeWinProb + adjustedDrawProb + adjustedAwayWinProb;
    adjustedHomeWinProb /= totalAdjustedProb;
    adjustedDrawProb /= totalAdjustedProb;
    adjustedAwayWinProb /= totalAdjustedProb;
    
    // 计算期望值
    const homeEV = (adjustedHomeWinProb * home_odds) - 1;
    const drawEV = (adjustedDrawProb * draw_odds) - 1;
    const awayEV = (adjustedAwayWinProb * away_odds) - 1;
    
    // 所有投注选项（按期望值排序）
    const allBets = [
        ['home', homeEV, home_odds, adjustedHomeWinProb],
        ['draw', drawEV, draw_odds, adjustedDrawProb],
        ['away', awayEV, away_odds, adjustedAwayWinProb]
    ];
    
    // 按期望值排序
    allBets.sort((a, b) => b[1] - a[1]);
    
    // 返回预测结果
    return {
        league_code: league_code,
        home_team: home_team,
        away_team: away_team,
        home_win_prob: adjustedHomeWinProb,
        draw_prob: adjustedDrawProb,
        away_win_prob: adjustedAwayWinProb,
        home_odds: home_odds,
        draw_odds: draw_odds,
        away_odds: away_odds,
        best_bet: allBets[0][0],
        best_ev: allBets[0][1],
        all_bets: allBets
    };
}

/**
 * 生成所有可能的串关组合
 */
function generateParlays(predictions) {
    // 为每场比赛创建所有可能的选择
    const all_selections = [];
    
    for (const pred of predictions) {
        const match_selections = [];
        
        for (const [bet_type, ev, odds, prob] of pred.all_bets) {
            const selection = {
                match: `${pred.home_team} vs ${pred.away_team}`,
                pick: bet_type,
                odds,
                prob,
                ev
            };
            
            match_selections.push(selection);
        }
        
        all_selections.push(match_selections);
    }
    
    // 生成所有可能的组合
    const all_combinations = [];
    
    // 递归生成所有组合
    function generateCombinations(index, current_combo) {
        if (index === all_selections.length) {
            let total_odds = 1.0;
            let total_prob = 1.0;
            
            for (const selection of current_combo) {
                total_odds *= selection.odds;
                total_prob *= selection.prob;
            }
            
            const expected_value = (total_prob * total_odds) - 1;
            
            all_combinations.push({
                selections: [...current_combo],
                total_odds,
                total_prob,
                expected_value
            });
            
            return;
        }
        
        for (const selection of all_selections[index]) {
            current_combo.push(selection);
            generateCombinations(index + 1, current_combo);
            current_combo.pop();
        }
    }
    
    generateCombinations(0, []);
    
    // 按期望值排序
    all_combinations.sort((a, b) => b.expected_value - a.expected_value);
    
    return all_combinations;
}

/**
 * 泊松分布概率质量函数
 */
function poissonPmf(k, lambda) {
    return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

/**
 * 计算阶乘
 */
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

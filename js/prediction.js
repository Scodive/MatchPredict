/**
 * 预测单场比赛结果
 */
function predictMatch(league_code, home_team, away_team, home_odds, draw_odds, away_odds) {
    // 计算期望进球
    const { homeExpectedGoals, awayExpectedGoals } = calculateExpectedGoals(
        home_team, away_team, league_code, home_odds, away_odds
    );
    
    // 根据赔率差异和联赛特性调整最大进球数
    let maxGoals = 5;  // 默认最大进球数
    
    // 获取联赛大球率
    const highScoringFactor = leagueHighScoringFactor[league_code] || 1.0;
    
    // 根据联赛大球率调整基础最大进球数
    maxGoals = Math.ceil(maxGoals * highScoringFactor);
    
    // 计算赔率比例来判断实力差距
    const favoriteOdds = Math.min(home_odds, away_odds);
    const underdogOdds = Math.max(home_odds, away_odds);
    const oddsRatio = underdogOdds / favoriteOdds;
    
    // 更激进的最大进球数调整
    if (oddsRatio > 5) {
        maxGoals = Math.max(9, maxGoals + 3);  // 实力极度悬殊
    } else if (oddsRatio > 3) {
        maxGoals = Math.max(8, maxGoals + 2);  // 实力非常悬殊
    } else if (oddsRatio > 2) {
        maxGoals = Math.max(7, maxGoals + 1);  // 实力明显悬殊
    } else if (oddsRatio > 1.5) {
        maxGoals = Math.max(6, maxGoals);      // 实力有差距
    }
    
    // 确保最大进球数不会太小
    maxGoals = Math.max(maxGoals, 6);
    
    // 使用泊松分布计算比分概率
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
    
    // 计算最可能的比分
    const normalizedScoreProbs = {};
    for (const [score, prob] of Object.entries(scoreProbs)) {
        normalizedScoreProbs[score] = prob * normalizationFactor;
    }
    
    // 按概率排序找出最可能的比分
    const sortedScores = Object.entries(normalizedScoreProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // 取前三个最可能的比分
    
    // 计算半场比分
    const halfTimeHomeExpectedGoals = homeExpectedGoals * 0.45; // 上半场进球通常少于下半场
    const halfTimeAwayExpectedGoals = awayExpectedGoals * 0.45;
    
    const halfTimeScoreProbs = {};
    let halfTimeTotalProb = 0;
    
    // 半场最大进球数也应该根据实力差距调整
    const halfTimeMaxGoals = Math.min(4, Math.ceil(maxGoals * 0.6));
    
    for (let i = 0; i <= halfTimeMaxGoals; i++) {
        for (let j = 0; j <= halfTimeMaxGoals; j++) {
            const homeProb = Math.exp(-halfTimeHomeExpectedGoals) * Math.pow(halfTimeHomeExpectedGoals, i) / factorial(i);
            const awayProb = Math.exp(-halfTimeAwayExpectedGoals) * Math.pow(halfTimeAwayExpectedGoals, j) / factorial(j);
            halfTimeScoreProbs[`${i}-${j}`] = homeProb * awayProb;
            halfTimeTotalProb += homeProb * awayProb;
        }
    }
    
    // 归一化半场比分概率
    const halfTimeNormalizationFactor = 1 / halfTimeTotalProb;
    for (const score in halfTimeScoreProbs) {
        halfTimeScoreProbs[score] *= halfTimeNormalizationFactor;
    }
    
    // 找出最可能的半场比分
    const sortedHalfTimeScores = Object.entries(halfTimeScoreProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // 取前三个最可能的半场比分
    
    // 计算半全场结果
    const halfTimeFullTimeProbs = {};
    
    // 半场结果: 主胜(H)、平(D)、客胜(A)
    // 全场结果: 主胜(H)、平(D)、客胜(A)
    // 组合: HH, HD, HA, DH, DD, DA, AH, AD, AA
    const halfTimeResults = ['H', 'D', 'A'];
    const fullTimeResults = ['H', 'D', 'A'];
    
    // 计算半场结果概率
    let halfTimeHomeWinProb = 0;
    let halfTimeDrawProb = 0;
    let halfTimeAwayWinProb = 0;
    
    for (const [score, prob] of Object.entries(halfTimeScoreProbs)) {
        const [home, away] = score.split('-').map(Number);
        
        if (home > away) {
            halfTimeHomeWinProb += prob;
        } else if (home === away) {
            halfTimeDrawProb += prob;
        } else {
            halfTimeAwayWinProb += prob;
        }
    }
    
    // 计算半全场组合概率
    for (const ht of halfTimeResults) {
        for (const ft of fullTimeResults) {
            let htProb = 0;
            let ftProb = 0;
            
            if (ht === 'H') htProb = halfTimeHomeWinProb;
            else if (ht === 'D') htProb = halfTimeDrawProb;
            else htProb = halfTimeAwayWinProb;
            
            if (ft === 'H') ftProb = adjustedHomeWinProb;
            else if (ft === 'D') ftProb = adjustedDrawProb;
            else ftProb = adjustedAwayWinProb;
            
            // 半全场结果不是完全独立的，需要调整
            // 例如，半场领先的球队更可能赢得比赛
            let adjustmentFactor = 1.0;
            
            if (ht === ft) {
                adjustmentFactor = 1.5; // 半场和全场结果相同的概率更高
            } else if ((ht === 'H' && ft === 'A') || (ht === 'A' && ft === 'H')) {
                adjustmentFactor = 0.5; // 半场主胜全场客胜或半场客胜全场主胜的概率较低
            }
            
            halfTimeFullTimeProbs[`${ht}/${ft}`] = htProb * ftProb * adjustmentFactor;
        }
    }
    
    // 归一化半全场概率
    const htftTotal = Object.values(halfTimeFullTimeProbs).reduce((sum, prob) => sum + prob, 0);
    for (const key in halfTimeFullTimeProbs) {
        halfTimeFullTimeProbs[key] /= htftTotal;
    }
    
    // 找出最可能的半全场结果
    const sortedHalfTimeFullTime = Object.entries(halfTimeFullTimeProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // 取前三个最可能的半全场结果
    
    // 计算总进球数概率
    const totalGoalsProbs = {};
    for (let total = 0; total <= maxGoals * 2; total++) {
        totalGoalsProbs[total] = 0;
        
        for (const [score, prob] of Object.entries(normalizedScoreProbs)) {
            const [home, away] = score.split('-').map(Number);
            if (home + away === total) {
                totalGoalsProbs[total] += prob;
            }
        }
    }
    
    // 找出最可能的总进球数
    const sortedTotalGoals = Object.entries(totalGoalsProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // 取前三个最可能的总进球数
    
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
        all_bets: allBets,
        // 详细预测结果
        most_likely_scores: sortedScores,
        most_likely_ht_scores: sortedHalfTimeScores,
        most_likely_htft: sortedHalfTimeFullTime,
        most_likely_total_goals: sortedTotalGoals
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

/**
 * 计算球队的进攻强度
 */
function calculateAttackStrength(features, isHome) {
    if (isHome) {
        // 主场进攻强度计算
        return (
            (features.home_goals_scored_avg || 1.3) * 0.4 +
            (features.attack || 1.3) * 0.3 +
            (features.recent_scoring_rate || 1.2) * 0.2 +
            (features.xG || 1.2) * 0.1
        );
    } else {
        // 客场进攻强度计算
        return (
            (features.away_goals_scored_avg || 1.1) * 0.4 +
            (features.attack || 1.3) * 0.3 +
            (features.recent_scoring_rate || 1.2) * 0.2 +
            (features.xG || 1.2) * 0.1
        );
    }
}

/**
 * 计算球队的防守强度
 */
function calculateDefenseStrength(features, isHome) {
    if (isHome) {
        // 主场防守强度计算
        return (
            (features.home_goals_conceded_avg || 1.1) * 0.4 +
            (features.defense || 1.2) * 0.3 +
            (features.recent_conceding_rate || 1.1) * 0.2 +
            (features.xGA || 1.1) * 0.1
        );
    } else {
        // 客场防守强度计算
        return (
            (features.away_goals_conceded_avg || 1.3) * 0.4 +
            (features.defense || 1.2) * 0.3 +
            (features.recent_conceding_rate || 1.1) * 0.2 +
            (features.xGA || 1.1) * 0.1
        );
    }
}

/**
 * 计算球队近期状态
 */
function calculateTeamForm(features) {
    // 使用近期比赛结果计算状态
    return (features.form || 1.0);
}

/**
 * 计算历史交锋因素
 */
function calculateHeadToHeadFactor(home_team, away_team, league_code) {
    // 这里需要实现获取历史交锋数据的逻辑
    // 暂时返回默认值
    return { home: 1.0, away: 1.0 };
}

/**
 * 计算预期进球
 */
function calculateExpectedGoals(homeTeam, awayTeam, league_code, home_odds, away_odds) {
    // 获取球队特征
    const home_features = getTeamFeatures(homeTeam, league_code);
    const away_features = getTeamFeatures(awayTeam, league_code);
    
    if (!home_features || !away_features) {
        throw new Error(`找不到球队数据: ${homeTeam} 或 ${awayTeam}`);
    }
    
    // 基础计算
    const homeAttack = calculateAttackStrength(home_features, true);
    const homeDefense = calculateDefenseStrength(home_features, true);
    const awayAttack = calculateAttackStrength(away_features, false);
    const awayDefense = calculateDefenseStrength(away_features, false);
    
    // 考虑球队近期状态
    const homeForm = calculateTeamForm(home_features);
    const awayForm = calculateTeamForm(away_features);
    
    // 联赛特定的主场优势
    const leagueHomeAdvantage = {
        'PL': 1.02,  // 英超
        'PD': 1.00,  // 西甲
        'SA': 1.02,  // 意甲
        'BL1': 1.04, // 德甲
        'FL1': 1.0   // 法甲
    }[league_code] || 1.02;
    
    // 获取联赛大球率
    const highScoringFactor = leagueHighScoringFactor[league_code] || 1.0;
    
    // 基础期望进球
    let homeExpectedGoals = homeAttack * 0.5 + awayDefense * 0.3 + homeForm * 0.1;
    let awayExpectedGoals = awayAttack * 0.5 + homeDefense * 0.3 + awayForm * 0.1;
    
    // 应用主场优势
    homeExpectedGoals *= leagueHomeAdvantage;
    
    // 根据赔率调整期望进球 - 更激进的调整
    const oddsRatio = home_odds / away_odds;
    
    if (oddsRatio < 0.5) {  // 主队明显强于客队
        const strengthDiff = Math.pow(0.5 / oddsRatio, 0.7); // 增加指数以放大效果
        homeExpectedGoals *= (1 + (strengthDiff - 1) * 0.7);  // 增加系数
        awayExpectedGoals *= (1 - (strengthDiff - 1) * 0.4);
    } else if (oddsRatio > 2.0) {  // 客队明显强于主队
        const strengthDiff = Math.pow(oddsRatio / 2.0, 0.7); // 增加指数以放大效果
        homeExpectedGoals *= (1 - (strengthDiff - 1) * 0.4);
        awayExpectedGoals *= (1 + (strengthDiff - 1) * 0.7);  // 增加系数
    }
    
    // 应用联赛大球率
    homeExpectedGoals *= highScoringFactor;
    awayExpectedGoals *= highScoringFactor;
    
    // 确保期望进球不会低于一个最小值
    homeExpectedGoals = Math.max(homeExpectedGoals, 0.3);
    awayExpectedGoals = Math.max(awayExpectedGoals, 0.2);
    
    return { homeExpectedGoals, awayExpectedGoals };
}

// 联赛大球率参数 - 表示各联赛进球数的倾向
const leagueHighScoringFactor = {
    'PL': 1.15,  // 英超进球较多
    'PD': 1.15,  // 西甲进球适中
    'SA': 0.95,  // 意甲进球较少
    'BL1': 1.25, // 德甲进球最多
    'FL1': 1.10, // 法甲进球较多
};

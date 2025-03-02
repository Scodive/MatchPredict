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
    
    // 计算预期进球数
    const home_expected_goals = home_features.home_goals_scored_avg * away_features.away_goals_conceded_avg / 1.3;
    const away_expected_goals = away_features.away_goals_scored_avg * home_features.home_goals_conceded_avg / 1.3;
    
    // 使用泊松分布计算比分概率
    const max_goals = 10;
    const score_probs = {};
    
    for (let i = 0; i <= max_goals; i++) {
        for (let j = 0; j <= max_goals; j++) {
            score_probs[`${i}-${j}`] = poissonPmf(i, home_expected_goals) * poissonPmf(j, away_expected_goals);
        }
    }
    
    // 计算结果概率
    let home_win_prob = 0;
    let draw_prob = 0;
    let away_win_prob = 0;
    
    for (const [score, prob] of Object.entries(score_probs)) {
        const [home_goals, away_goals] = score.split('-').map(Number);
        
        if (home_goals > away_goals) {
            home_win_prob += prob;
        } else if (home_goals === away_goals) {
            draw_prob += prob;
        } else {
            away_win_prob += prob;
        }
    }
    
    // 计算期望值
    const home_ev = (home_win_prob * home_odds) - 1;
    const draw_ev = (draw_prob * draw_odds) - 1;
    const away_ev = (away_win_prob * away_odds) - 1;
    
    // 确定最佳投注
    const all_bets = [
        ['home', home_ev, home_odds, home_win_prob],
        ['draw', draw_ev, draw_odds, draw_prob],
        ['away', away_ev, away_odds, away_win_prob]
    ];
    
    all_bets.sort((a, b) => b[1] - a[1]);
    const [best_bet, best_ev] = all_bets[0];
    
    return {
        home_team,
        away_team,
        home_win_prob,
        draw_prob,
        away_win_prob,
        home_odds,
        draw_odds,
        away_odds,
        best_bet,
        best_ev,
        all_bets
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

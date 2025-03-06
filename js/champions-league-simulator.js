/**
 * 欧冠足球比赛模拟预测系统
 * 每次运行生成随机但合理的比赛结果
 */

// 定义球队数据结构
class Team {
    constructor(name, attackStrength, defenseStrength, homeAdvantage, formFactor, experience, logo) {
        this.name = name;
        this.attackStrength = attackStrength;      // 进攻能力 (1-10)
        this.defenseStrength = defenseStrength;    // 防守能力 (1-10)
        this.homeAdvantage = homeAdvantage;        // 主场优势 (1-1.5)
        this.formFactor = formFactor;              // 当前状态 (0.8-1.2)
        this.experience = experience;              // 欧冠经验 (1-10)
        this.logo = logo;                          // 球队logo URL
    }
}

// 定义欧冠球队数据
const teams = {
    "皇家马德里": new Team("皇家马德里", 9.2, 8.5, 1.3, 1.1, 10, "logos/real_madrid.png"),
    "巴塞罗那": new Team("巴塞罗那", 8.8, 8.3, 1.3, 1.05, 9.5, "logos/barcelona.png"),
    "拜仁慕尼黑": new Team("拜仁慕尼黑", 9.0, 8.4, 1.3, 1.15, 9.5, "logos/bayern.png"),
    "利物浦": new Team("利物浦", 8.9, 8.4, 1.35, 1.1, 9.0, "logos/liverpool.png"),
    "巴黎圣日耳曼": new Team("巴黎圣日耳曼", 8.7, 8.0, 1.25, 0.95, 8.0, "logos/psg.png"),
    "阿森纳": new Team("阿森纳", 8.6, 8.7, 1.3, 1.2, 7.5, "logos/arsenal.png"),
    "马德里竞技": new Team("马德里竞技", 8.2, 8.5, 1.25, 1.0, 8.5, "logos/atletico.png"),
    "多特蒙德": new Team("多特蒙德", 8.3, 7.8, 1.3, 1.0, 8.0, "logos/dortmund.png"),
    "国际米兰": new Team("国际米兰", 8.4, 8.2, 1.25, 1.1, 8.5, "logos/inter.png"),
    "阿斯顿维拉": new Team("阿斯顿维拉", 8.0, 7.9, 1.25, 1.15, 6.0, "logos/aston_villa.png"),
    "勒沃库森": new Team("勒沃库森", 8.1, 7.8, 1.2, 0.9, 6.5, "logos/leverkusen.png"),
    "里尔": new Team("里尔", 7.8, 7.7, 1.2, 1.0, 6.0, "logos/lille.png"),
    "PSV埃因霍温": new Team("PSV埃因霍温", 7.7, 7.5, 1.2, 0.9, 6.0, "logos/psv.png"),
    "布鲁日": new Team("布鲁日", 7.5, 7.4, 1.2, 0.95, 5.5, "logos/brugge.png"),
    "本菲卡": new Team("本菲卡", 7.9, 7.6, 1.25, 0.95, 7.0, "logos/benfica.png"),
    "费耶诺德": new Team("费耶诺德", 7.6, 7.5, 1.2, 0.9, 6.0, "logos/feyenoord.png")
};

// 1/8决赛第一回合结果
const firstLegResults = [
    { home: "PSV埃因霍温", away: "阿森纳", homeGoals: 1, awayGoals: 7, date: "03/13" },
    { home: "皇家马德里", away: "马德里竞技", homeGoals: 2, awayGoals: 1, date: "03/13" },
    { home: "巴黎圣日耳曼", away: "利物浦", homeGoals: 0, awayGoals: 1, date: "03/12" },
    { home: "布鲁日", away: "阿斯顿维拉", homeGoals: 1, awayGoals: 3, date: "03/13" },
    { home: "本菲卡", away: "巴塞罗那", homeGoals: 0, awayGoals: 1, date: "03/12" },
    { home: "多特蒙德", away: "里尔", homeGoals: 1, awayGoals: 1, date: "03/13" },
    { home: "拜仁慕尼黑", away: "勒沃库森", homeGoals: 3, awayGoals: 0, date: "03/12" },
    { home: "费耶诺德", away: "国际米兰", homeGoals: 0, awayGoals: 2, date: "03/12" }
];

// 添加随机性因素
function addRandomness(value, range = 0.2) {
    return value * (1 - range/2 + Math.random() * range);
}

// 模拟单场比赛
function simulateMatch(homeTeam, awayTeam, isNeutralVenue = false, isKnockout = true) {
    // 基础进攻和防守能力
    let homeAttack = homeTeam.attackStrength * homeTeam.formFactor;
    let homeDefense = homeTeam.defenseStrength * homeTeam.formFactor;
    let awayAttack = awayTeam.attackStrength * awayTeam.formFactor;
    let awayDefense = awayTeam.defenseStrength * awayTeam.formFactor;
    
    // 添加随机性
    homeAttack = addRandomness(homeAttack, 0.3);
    homeDefense = addRandomness(homeDefense, 0.3);
    awayAttack = addRandomness(awayAttack, 0.3);
    awayDefense = addRandomness(awayDefense, 0.3);
    
    // 主场优势
    if (!isNeutralVenue) {
        homeAttack *= homeTeam.homeAdvantage;
        homeDefense *= 1.1;
    }
    
    // 欧冠经验因素 - 在关键比赛中更重要
    if (isKnockout) {
        const homeExpFactor = 1 + (homeTeam.experience - 5) * 0.02;
        const awayExpFactor = 1 + (awayTeam.experience - 5) * 0.02;
        
        homeAttack *= homeExpFactor;
        homeDefense *= homeExpFactor;
        awayAttack *= awayExpFactor;
        awayDefense *= awayExpFactor;
    }
    
    // 计算期望进球
    const homeExpectedGoals = Math.max(0.3, (homeAttack / awayDefense) * 1.4);
    const awayExpectedGoals = Math.max(0.2, (awayAttack / homeDefense) * 1.1);
    
    // 使用泊松分布模拟进球数
    const homeGoals = simulatePoissonGoals(homeExpectedGoals);
    const awayGoals = simulatePoissonGoals(awayExpectedGoals);
    
    return { homeGoals, awayGoals };
}

// 使用泊松分布模拟进球数
function simulatePoissonGoals(lambda) {
    let L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;
    
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    
    return k - 1;
}

// 模拟两回合淘汰赛
function simulateTwoLegTie(team1, team2, firstLegResult = null) {
    // 第一回合
    let firstLeg;
    if (firstLegResult) {
        firstLeg = firstLegResult;
    } else {
        firstLeg = simulateMatch(team1, team2);
    }
    
    // 第二回合
    const secondLeg = simulateMatch(team2, team1);
    
    // 计算总比分
    const team1TotalGoals = firstLeg.homeGoals + secondLeg.awayGoals;
    const team2TotalGoals = firstLeg.awayGoals + secondLeg.homeGoals;
    
    // 如果总比分相同，客场进球规则不再适用（从2021/22赛季开始）
    if (team1TotalGoals === team2TotalGoals) {
        // 模拟加时赛
        const extraTime = simulateExtraTime(team2, team1);
        
        if (extraTime.homeGoals === extraTime.awayGoals) {
            // 模拟点球大战
            const penalties = simulatePenalties(team2, team1);
            return {
                winner: penalties.winner === team2 ? team2 : team1,
                loser: penalties.winner === team2 ? team1 : team2,
                firstLeg,
                secondLeg,
                extraTime,
                penalties,
                aggregate: `${team1TotalGoals}-${team2TotalGoals} (点球决胜)`
            };
        } else {
            return {
                winner: extraTime.homeGoals > extraTime.awayGoals ? team2 : team1,
                loser: extraTime.homeGoals > extraTime.awayGoals ? team1 : team2,
                firstLeg,
                secondLeg,
                extraTime,
                aggregate: `${team1TotalGoals + extraTime.awayGoals}-${team2TotalGoals + extraTime.homeGoals} (加时)`
            };
        }
    } else {
        return {
            winner: team1TotalGoals > team2TotalGoals ? team1 : team2,
            loser: team1TotalGoals > team2TotalGoals ? team2 : team1,
            firstLeg,
            secondLeg,
            aggregate: `${team1TotalGoals}-${team2TotalGoals}`
        };
    }
}

// 模拟加时赛
function simulateExtraTime(homeTeam, awayTeam) {
    // 加时赛进球期望值降低
    const homeExpectedGoals = (homeTeam.attackStrength / awayTeam.defenseStrength) * 0.4;
    const awayExpectedGoals = (awayTeam.attackStrength / homeTeam.defenseStrength) * 0.3;
    
    // 疲劳因素和心理因素
    const homeFatigue = 0.9 + Math.random() * 0.2;
    const awayFatigue = 0.85 + Math.random() * 0.2;
    
    const homeGoals = simulatePoissonGoals(homeExpectedGoals * homeFatigue);
    const awayGoals = simulatePoissonGoals(awayExpectedGoals * awayFatigue);
    
    return { homeGoals, awayGoals };
}

// 模拟点球大战
function simulatePenalties(homeTeam, awayTeam) {
    // 点球成功率基于球队经验和当前状态
    const homeSuccessRate = 0.7 + (homeTeam.experience / 30) + (homeTeam.formFactor - 1) * 0.1;
    const awaySuccessRate = 0.7 + (awayTeam.experience / 30) + (awayTeam.formFactor - 1) * 0.1;
    
    let homeScore = 0;
    let awayScore = 0;
    
    // 常规5轮点球
    for (let i = 0; i < 5; i++) {
        if (Math.random() < homeSuccessRate) homeScore++;
        if (Math.random() < awaySuccessRate) awayScore++;
        
        // 如果一方已经无法追平，提前结束
        if (homeScore > awayScore + (5 - i) || awayScore > homeScore + (5 - i)) {
            break;
        }
    }
    
    // 如果平局，进行突然死亡
    if (homeScore === awayScore) {
        let round = 0;
        while (homeScore === awayScore) {
            round++;
            const homeSuccess = Math.random() < homeSuccessRate;
            const awaySuccess = Math.random() < awaySuccessRate;
            
            if (homeSuccess) homeScore++;
            if (awaySuccess) awayScore++;
            
            // 如果这轮有差距，结束
            if (homeScore !== awayScore) break;
        }
    }
    
    return {
        homeScore,
        awayScore,
        winner: homeScore > awayScore ? homeTeam : awayTeam
    };
}

// 模拟单场决赛
function simulateFinal(team1, team2) {
    // 决赛在中立场地
    const result = simulateMatch(team1, team2, true, true);
    
    if (result.homeGoals === result.awayGoals) {
        // 加时赛
        const extraTime = simulateExtraTime(team1, team2);
        
        if (extraTime.homeGoals === extraTime.awayGoals) {
            // 点球大战
            const penalties = simulatePenalties(team1, team2);
            return {
                winner: penalties.winner,
                loser: penalties.winner === team1 ? team2 : team1,
                result,
                extraTime,
                penalties,
                finalScore: `${result.homeGoals + extraTime.homeGoals}-${result.awayGoals + extraTime.awayGoals} (点球${penalties.homeScore}-${penalties.awayScore})`
            };
        } else {
            return {
                winner: extraTime.homeGoals > extraTime.awayGoals ? team1 : team2,
                loser: extraTime.homeGoals > extraTime.awayGoals ? team2 : team1,
                result,
                extraTime,
                finalScore: `${result.homeGoals + extraTime.homeGoals}-${result.awayGoals + extraTime.awayGoals} (加时)`
            };
        }
    } else {
        return {
            winner: result.homeGoals > result.awayGoals ? team1 : team2,
            loser: result.homeGoals > result.awayGoals ? team2 : team1,
            result,
            finalScore: `${result.homeGoals}-${result.awayGoals}`
        };
    }
}

// 生成随机日期 (03/XX 格式)
function generateRandomDate() {
    const day = Math.floor(Math.random() * 15) + 15; // 15-30之间
    return `03/${day}`;
}

// 模拟整个欧冠剩余赛程
function simulateChampionsLeague() {
    // 准备存储所有比赛结果的对象
    const results = {
        round16: [],
        quarterFinals: [],
        semiFinals: [],
        final: null,
        champion: null
    };
    
    // 1/8决赛第二回合和晋级球队
    const quarterFinalists = [];
    
    // 根据第一回合结果模拟第二回合
    const round16Matches = [
        { team1: teams["PSV埃因霍温"], team2: teams["阿森纳"], firstLeg: { homeGoals: 1, awayGoals: 7 } },
        { team1: teams["皇家马德里"], team2: teams["马德里竞技"], firstLeg: { homeGoals: 2, awayGoals: 1 } },
        { team1: teams["巴黎圣日耳曼"], team2: teams["利物浦"], firstLeg: { homeGoals: 0, awayGoals: 1 } },
        { team1: teams["布鲁日"], team2: teams["阿斯顿维拉"], firstLeg: { homeGoals: 1, awayGoals: 3 } },
        { team1: teams["本菲卡"], team2: teams["巴塞罗那"], firstLeg: { homeGoals: 0, awayGoals: 1 } },
        { team1: teams["多特蒙德"], team2: teams["里尔"], firstLeg: { homeGoals: 1, awayGoals: 1 } },
        { team1: teams["拜仁慕尼黑"], team2: teams["勒沃库森"], firstLeg: { homeGoals: 3, awayGoals: 0 } },
        { team1: teams["费耶诺德"], team2: teams["国际米兰"], firstLeg: { homeGoals: 0, awayGoals: 2 } }
    ];
    
    for (const match of round16Matches) {
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, { homeGoals: match.firstLeg.homeGoals, awayGoals: match.firstLeg.awayGoals });
        
        results.round16.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: match.firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate
        });
        
        quarterFinalists.push(result.winner);
    }
    
    // 1/4决赛抽签 (随机配对)
    const shuffledQuarterFinalists = [...quarterFinalists].sort(() => Math.random() - 0.5);
    const quarterFinalMatches = [];
    
    for (let i = 0; i < shuffledQuarterFinalists.length; i += 2) {
        quarterFinalMatches.push({
            team1: shuffledQuarterFinalists[i],
            team2: shuffledQuarterFinalists[i + 1]
        });
    }
    
    const semiFinalists = [];
    
    for (const match of quarterFinalMatches) {
        const firstLeg = simulateMatch(match.team1, match.team2);
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, firstLeg);
        
        results.quarterFinals.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate,
            date: generateRandomDate()
        });
        
        semiFinalists.push(result.winner);
    }
    
    // 半决赛
    const semiFinalMatches = [
        { team1: semiFinalists[0], team2: semiFinalists[1] },
        { team1: semiFinalists[2], team2: semiFinalists[3] }
    ];
    
    const finalists = [];
    
    for (const match of semiFinalMatches) {
        const firstLeg = simulateMatch(match.team1, match.team2);
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, firstLeg);
        
        results.semiFinals.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate,
            date: generateRandomDate()
        });
        
        finalists.push(result.winner);
    }
    
    // 决赛
    const finalResult = simulateFinal(finalists[0], finalists[1]);
    
    results.final = {
        team1: finalists[0],
        team2: finalists[1],
        result: finalResult.result,
        winner: finalResult.winner,
        finalScore: finalResult.finalScore,
        date: "05/31"
    };
    
    results.champion = finalResult.winner;
    
    return results;
}

// 导出模拟函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        simulateChampionsLeague,
        teams
    };
}

// 欧冠模拟器前端实现

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const simulateClBtn = document.getElementById('simulate-cl-btn');
    const clBracket = document.getElementById('cl-bracket');
    
    // 绑定模拟按钮事件
    if (simulateClBtn) {
        simulateClBtn.addEventListener('click', function() {
            // 显示加载状态
            clBracket.innerHTML = '<div class="loading">正在模拟比赛...</div>';
            
            // 延迟执行以显示加载状态
            setTimeout(() => {
                // 模拟欧冠赛程
                simulateAndRender();
            }, 300);
        });
    }
    
    // 模拟并渲染欧冠赛程
    function simulateAndRender() {
        // 清空内容
        clBracket.innerHTML = '';
        
        // 1/8决赛第一回合结果（固定的）
        const firstLegMatches = [
            { team1: "PSV埃因霍温", team2: "阿森纳", score1: 1, score2: 7, date: "03/13" },
            { team1: "皇家马德里", team2: "马德里竞技", score1: 2, score2: 1, date: "03/13" },
            { team1: "巴黎圣日耳曼", team2: "利物浦", score1: 0, score2: 1, date: "03/12" },
            { team1: "布鲁日", team2: "阿斯顿维拉", score1: 1, score2: 3, date: "03/13" },
            { team1: "本菲卡", team2: "巴塞罗那", score1: 0, score2: 1, date: "03/12" },
            { team1: "多特蒙德", team2: "里尔", score1: 1, score2: 1, date: "03/13" },
            { team1: "拜仁慕尼黑", team2: "勒沃库森", score1: 3, score2: 0, date: "03/12" },
            { team1: "费耶诺德", team2: "国际米兰", score1: 0, score2: 2, date: "03/12" }
        ];
        
        // 模拟第二回合和后续比赛
        const round16Results = simulateRound16(firstLegMatches);
        
        // 按照固定的晋级路线配对1/4决赛
        const quarterFinalPairs = [
            { match1Index: 0, match2Index: 1 }, // PSV/阿森纳 vs 皇马/马竞
            { match1Index: 2, match2Index: 3 }, // 巴黎/利物浦 vs 布鲁日/维拉
            { match1Index: 4, match2Index: 5 }, // 本菲卡/巴萨 vs 多特/里尔
            { match1Index: 6, match2Index: 7 }  // 拜仁/勒沃库森 vs 费耶诺德/国米
        ];
        
        const quarterFinalMatches = quarterFinalPairs.map(pair => {
            const team1 = round16Results[pair.match1Index].winner;
            const team2 = round16Results[pair.match2Index].winner;
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);
            
            return {
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                winner: score1 > score2 ? team1 : (score1 < score2 ? team2 : (Math.random() > 0.5 ? team1 : team2))
            };
        });
        
        // 按照固定的晋级路线配对半决赛
        const semiFinalPairs = [
            { match1Index: 0, match2Index: 1 }, // 1/4决赛1胜者 vs 1/4决赛2胜者
            { match1Index: 2, match2Index: 3 }  // 1/4决赛3胜者 vs 1/4决赛4胜者
        ];
        
        const semiFinalMatches = semiFinalPairs.map(pair => {
            const team1 = quarterFinalMatches[pair.match1Index].winner;
            const team2 = quarterFinalMatches[pair.match2Index].winner;
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);
            
            return {
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                winner: score1 > score2 ? team1 : (score1 < score2 ? team2 : (Math.random() > 0.5 ? team1 : team2))
            };
        });
        
        // 决赛
        const team1 = semiFinalMatches[0].winner;
        const team2 = semiFinalMatches[1].winner;
        const finalScore1 = Math.floor(Math.random() * 4);
        const finalScore2 = Math.floor(Math.random() * 4);
        const champion = finalScore1 > finalScore2 ? team1 : (finalScore1 < finalScore2 ? team2 : (Math.random() > 0.5 ? team1 : team2));
        
        const finalMatch = {
            team1: team1,
            team2: team2,
            score1: finalScore1,
            score2: finalScore2,
            winner: champion
        };
        
        // 创建赛程图HTML
        const bracketHTML = createBracketHTML(
            firstLegMatches,
            round16Results,
            quarterFinalMatches,
            semiFinalMatches,
            finalMatch
        );
        
        clBracket.innerHTML = bracketHTML;
    }
    
    // 模拟1/8决赛第二回合
    function simulateRound16(firstLegMatches) {
        return firstLegMatches.map(match => {
            // 模拟第二回合比分
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);
            
            // 计算总比分
            const totalScore1 = match.score1 + score2;
            const totalScore2 = match.score2 + score1;
            
            // 确定晋级球队
            let winner;
            if (totalScore1 > totalScore2) {
                winner = match.team1;
            } else if (totalScore1 < totalScore2) {
                winner = match.team2;
            } else {
                // 如果总比分相同，客场进球多的晋级
                winner = match.score2 > score2 ? match.team2 : match.team1;
            }
            
            return {
                firstLeg: { team1: match.team1, team2: match.team2, score1: match.score1, score2: match.score2, date: match.date },
                secondLeg: { team1: match.team2, team2: match.team1, score1: score1, score2: score2, date: getNextDate(match.date) },
                winner: winner
            };
        });
    }
    
    // 创建赛程图HTML
    function createBracketHTML(firstLegMatches, round16Results, quarterFinals, semiFinals, final) {
        let html = `
        <div class="tournament-bracket">
            <div class="bracket-container">
                <!-- 1/8决赛 - 左侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">1/8决赛</h3>
                    <div class="matches-container">`;
        
        // 添加1/8决赛左侧4场
        for (let i = 0; i < 4; i++) {
            const match = firstLegMatches[i];
            const result = round16Results[i];
            
            html += `
                <div class="match-pair">
                    <div class="match">
                        <div class="match-date">${match.date}</div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                    <div class="connector"></div>
                    <div class="match">
                        <div class="match-date">${result.secondLeg.date}</div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${result.secondLeg.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${result.secondLeg.score2}</div>
                        </div>
                    </div>
                </div>`;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- 1/4决赛 - 左侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">1/4决赛</h3>
                    <div class="matches-container">`;
        
        // 添加1/4决赛左侧2场
        for (let i = 0; i < 2; i++) {
            const match = quarterFinals[i];
            
            html += `
                <div class="match-single">
                    <div class="match">
                        <div class="team ${match.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${match.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                </div>`;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- 半决赛 - 左侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">半决赛</h3>
                    <div class="matches-container">
                        <div class="match-single">
                            <div class="match">
                                <div class="team ${semiFinals[0].winner === semiFinals[0].team1 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[0].team1}</div>
                                    <div class="score">${semiFinals[0].score1}</div>
                                </div>
                                <div class="team ${semiFinals[0].winner === semiFinals[0].team2 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[0].team2}</div>
                                    <div class="score">${semiFinals[0].score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 决赛 -->
                <div class="bracket-column">
                    <h3 class="round-title">决赛</h3>
                    <div class="matches-container">
                        <div class="match-single final">
                            <div class="match">
                                <div class="team ${final.winner === final.team1 ? 'winner' : ''}">
                                    <div class="team-name">${final.team1}</div>
                                    <div class="score">${final.score1}</div>
                                </div>
                                <div class="team ${final.winner === final.team2 ? 'winner' : ''}">
                                    <div class="team-name">${final.team2}</div>
                                    <div class="score">${final.score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 半决赛 - 右侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">半决赛</h3>
                    <div class="matches-container">
                        <div class="match-single">
                            <div class="match">
                                <div class="team ${semiFinals[1].winner === semiFinals[1].team1 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[1].team1}</div>
                                    <div class="score">${semiFinals[1].score1}</div>
                                </div>
                                <div class="team ${semiFinals[1].winner === semiFinals[1].team2 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[1].team2}</div>
                                    <div class="score">${semiFinals[1].score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 1/4决赛 - 右侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">1/4决赛</h3>
                    <div class="matches-container">`;
        
        // 添加1/4决赛右侧2场
        for (let i = 2; i < 4; i++) {
            const match = quarterFinals[i];
            
            html += `
                <div class="match-single">
                    <div class="match">
                        <div class="team ${match.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${match.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                </div>`;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- 1/8决赛 - 右侧 -->
                <div class="bracket-column">
                    <h3 class="round-title">1/8决赛</h3>
                    <div class="matches-container">`;
        
        // 添加1/8决赛右侧4场
        for (let i = 4; i < 8; i++) {
            const match = firstLegMatches[i];
            const result = round16Results[i];
            
            html += `
                <div class="match-pair">
                    <div class="match">
                        <div class="match-date">${match.date}</div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                    <div class="connector"></div>
                    <div class="match">
                        <div class="match-date">${result.secondLeg.date}</div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${result.secondLeg.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${result.secondLeg.score2}</div>
                        </div>
                    </div>
                </div>`;
        }
        
        html += `
                    </div>
                </div>
            </div>
            
            <!-- 冠军 -->
            <div class="champion-container">
                <h3 class="champion-title">🏆 冠军</h3>
                <div class="champion-team">${final.winner}</div>
            </div>
        </div>`;
        
        return html;
    }
    
    // 获取下一个比赛日期
    function getNextDate(date) {
        const parts = date.split('/');
        let month = parseInt(parts[0]);
        let day = parseInt(parts[1]) + 7;
        
        if (day > 30) {
            day = day - 30;
            month++;
        }
        
        return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}`;
    }
});
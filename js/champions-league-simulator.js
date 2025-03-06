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
    const championsLeagueSection = document.getElementById('champions-league-section');
    
    // 添加导航菜单项
    addChampionsLeagueNavItem();
    
    // 绑定模拟按钮事件
    if (simulateClBtn) {
        simulateClBtn.addEventListener('click', function() {
            simulateAndRenderChampionsLeague();
        });
    }
    
    // 添加导航菜单项函数
    function addChampionsLeagueNavItem() {
        // 创建导航菜单项
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.innerHTML = '<a href="#" id="cl-nav-link"><i class="fas fa-trophy"></i> 欧冠模拟</a>';
        
        // 获取导航菜单
        const navMenu = document.querySelector('header nav ul');
        if (navMenu) {
            navMenu.appendChild(navItem);
            
            // 绑定点击事件
            document.getElementById('cl-nav-link').addEventListener('click', function(e) {
                e.preventDefault();
                
                // 隐藏其他部分
                document.querySelectorAll('main > section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                // 显示欧冠模拟部分
                championsLeagueSection.classList.remove('hidden');
                
                // 如果还没有模拟过，自动模拟一次
                if (clBracket.innerHTML === '') {
                    simulateAndRenderChampionsLeague();
                }
            });
        } else {
            // 如果没有找到导航菜单，添加一个按钮到页面顶部
            const headerButtons = document.createElement('div');
            headerButtons.className = 'header-buttons';
            headerButtons.innerHTML = '<button id="show-cl-btn" class="btn secondary-btn"><i class="fas fa-trophy"></i> 欧冠模拟</button>';
            
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(headerButtons);
                
                document.getElementById('show-cl-btn').addEventListener('click', function() {
                    // 隐藏其他部分
                    document.querySelectorAll('main > section').forEach(section => {
                        section.classList.add('hidden');
                    });
                    
                    // 显示欧冠模拟部分
                    championsLeagueSection.classList.remove('hidden');
                    
                    // 如果还没有模拟过，自动模拟一次
                    if (clBracket.innerHTML === '') {
                        simulateAndRenderChampionsLeague();
                    }
                });
            }
        }
    }
    
    // 模拟并渲染欧冠赛程
    function simulateAndRenderChampionsLeague() {
        // 显示加载状态
        clBracket.innerHTML = '<div class="loading">正在模拟比赛...</div>';
        
        // 使用setTimeout让UI有时间更新
        setTimeout(() => {
            // 模拟欧冠赛程
            const results = simulateChampionsLeague();
            
            // 渲染结果
            renderChampionsLeagueBracket(results);
        }, 500);
    }
    
    // 渲染欧冠赛程图
    function renderChampionsLeagueBracket(results) {
        // 清空内容
        clBracket.innerHTML = '';
        
        // 创建赛程图容器
        const bracketContainer = document.createElement('div');
        bracketContainer.className = 'cl-bracket-container';
        
        // 创建各轮次容器
        const roundsContainer = document.createElement('div');
        roundsContainer.className = 'cl-rounds';
        
        // 渲染1/8决赛
        const round16Container = createRoundContainer('1/8决赛');
        renderRound16Matches(round16Container, results.round16);
        roundsContainer.appendChild(round16Container);
        
        // 渲染1/4决赛
        const quarterFinalsContainer = createRoundContainer('1/4决赛');
        renderQuarterFinalMatches(quarterFinalsContainer, results.quarterFinals);
        roundsContainer.appendChild(quarterFinalsContainer);
        
        // 渲染半决赛
        const semiFinalsContainer = createRoundContainer('半决赛');
        renderSemiFinalMatches(semiFinalsContainer, results.semiFinals);
        roundsContainer.appendChild(semiFinalsContainer);
        
        // 渲染决赛
        const finalContainer = createRoundContainer('决赛');
        renderFinalMatch(finalContainer, results.final);
        roundsContainer.appendChild(finalContainer);
        
        bracketContainer.appendChild(roundsContainer);
        
        // 渲染冠军
        const championSection = createChampionSection(results.champion);
        bracketContainer.appendChild(championSection);
        
        clBracket.appendChild(bracketContainer);
    }
    
    // 创建轮次容器
    function createRoundContainer(title) {
        const container = document.createElement('div');
        container.className = 'cl-round';
        
        const titleElement = document.createElement('div');
        titleElement.className = 'cl-round-title';
        titleElement.textContent = title;
        
        container.appendChild(titleElement);
        
        return container;
    }
    
    // 渲染1/8决赛
    function renderRound16Matches(container, matches) {
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'cl-matches';
        
        // 第一回合结果
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const matchElement = createMatchElement(
                match.team1.name, 
                match.team2.name, 
                match.firstLeg.homeGoals, 
                match.firstLeg.awayGoals,
                firstLegResults[i].date,
                match.team1.logo,
                match.team2.logo
            );
            
            const matchContainer = document.createElement('div');
            matchContainer.className = 'cl-match-container';
            matchContainer.appendChild(matchElement);
            
            // 添加连接线
            if (i < matches.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'cl-connector';
                matchContainer.appendChild(connector);
            }
            
            matchesContainer.appendChild(matchContainer);
        }
        
        container.appendChild(matchesContainer);
    }
    
    // 渲染1/4决赛
    function renderQuarterFinalMatches(container, matches) {
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'cl-matches';
        
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            
            // 创建两回合比赛元素
            const firstLegElement = createMatchElement(
                match.team1.name, 
                match.team2.name, 
                match.firstLeg.homeGoals, 
                match.firstLeg.awayGoals,
                match.date || generateRandomDate(),
                match.team1.logo,
                match.team2.logo
            );
            
            const secondLegElement = createMatchElement(
                match.team2.name, 
                match.team1.name, 
                match.secondLeg.homeGoals, 
                match.secondLeg.awayGoals,
                match.date ? incrementDate(match.date) : generateRandomDate(),
                match.team2.logo,
                match.team1.logo
            );
            
            // 添加晋级标记
            markWinningTeam(firstLegElement, secondLegElement, match.winner);
            
            const matchContainer = document.createElement('div');
            matchContainer.className = 'cl-match-container';
            matchContainer.appendChild(firstLegElement);
            
            const connector = document.createElement('div');
            connector.className = 'cl-connector';
            matchContainer.appendChild(connector);
            
            matchContainer.appendChild(secondLegElement);
            
            // 添加连接线
            if (i < matches.length - 1) {
                const connector2 = document.createElement('div');
                connector2.className = 'cl-connector';
                connector2.style.height = '50px';
                matchContainer.appendChild(connector2);
            }
            
            matchesContainer.appendChild(matchContainer);
        }
        
        container.appendChild(matchesContainer);
    }
    
    // 渲染半决赛
    function renderSemiFinalMatches(container, matches) {
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'cl-matches';
        
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            
            // 创建两回合比赛元素
            const firstLegElement = createMatchElement(
                match.team1.name, 
                match.team2.name, 
                match.firstLeg.homeGoals, 
                match.firstLeg.awayGoals,
                match.date || generateRandomDate(),
                match.team1.logo,
                match.team2.logo
            );
            
            const secondLegElement = createMatchElement(
                match.team2.name, 
                match.team1.name, 
                match.secondLeg.homeGoals, 
                match.secondLeg.awayGoals,
                match.date ? incrementDate(match.date) : generateRandomDate(),
                match.team2.logo,
                match.team1.logo
            );
            
            // 添加晋级标记
            markWinningTeam(firstLegElement, secondLegElement, match.winner);
            
            const matchContainer = document.createElement('div');
            matchContainer.className = 'cl-match-container';
            matchContainer.appendChild(firstLegElement);
            
            const connector = document.createElement('div');
            connector.className = 'cl-connector';
            matchContainer.appendChild(connector);
            
            matchContainer.appendChild(secondLegElement);
            
            // 添加连接线
            if (i < matches.length - 1) {
                const connector2 = document.createElement('div');
                connector2.className = 'cl-connector';
                connector2.style.height = '80px';
                matchContainer.appendChild(connector2);
            }
            
            matchesContainer.appendChild(matchContainer);
        }
        
        container.appendChild(matchesContainer);
    }
    
    // 渲染决赛
    function renderFinalMatch(container, finalMatch) {
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'cl-matches';
        
        const matchElement = createMatchElement(
            finalMatch.team1.name, 
            finalMatch.team2.name, 
            finalMatch.result.homeGoals, 
            finalMatch.result.awayGoals,
            finalMatch.date || "05/31",
            finalMatch.team1.logo,
            finalMatch.team2.logo,
            true
        );
        
        // 添加冠军标记
        const team1Element = matchElement.querySelector('.cl-team:first-child');
        const team2Element = matchElement.querySelector('.cl-team:last-child');
        
        if (finalMatch.winner.name === finalMatch.team1.name) {
            team1Element.classList.add('cl-winner');
        } else {
            team2Element.classList.add('cl-winner');
        }
        
        const matchContainer = document.createElement('div');
        matchContainer.className = 'cl-match-container';
        matchContainer.appendChild(matchElement);
        
        matchesContainer.appendChild(matchContainer);
        container.appendChild(matchesContainer);
    }
    
    // 创建比赛元素
    function createMatchElement(homeTeam, awayTeam, homeGoals, awayGoals, date, homeLogo, awayLogo, isFinal = false) {
        const matchElement = document.createElement('div');
        matchElement.className = 'cl-match';
        
        // 添加日期
        const dateElement = document.createElement('div');
        dateElement.className = 'cl-match-date';
        dateElement.textContent = date;
        matchElement.appendChild(dateElement);
        
        // 添加主队
        const homeTeamElement = document.createElement('div');
        homeTeamElement.className = 'cl-team';
        
        const homeLogoElement = document.createElement('div');
        homeLogoElement.className = 'cl-team-logo';
        
        // 如果有logo，添加logo
        if (homeLogo) {
            const logoImg = document.createElement('img');
            logoImg.src = homeLogo;
            logoImg.alt = homeTeam;
            homeLogoElement.appendChild(logoImg);
        } else {
            homeLogoElement.textContent = homeTeam.charAt(0);
        }
        
        homeTeamElement.appendChild(homeLogoElement);
        
        const homeNameElement = document.createElement('div');
        homeNameElement.className = 'cl-team-name';
        homeNameElement.textContent = homeTeam;
        homeTeamElement.appendChild(homeNameElement);
        
        const homeScoreElement = document.createElement('div');
        homeScoreElement.className = 'cl-score';
        homeScoreElement.textContent = homeGoals;
        homeTeamElement.appendChild(homeScoreElement);
        
        matchElement.appendChild(homeTeamElement);
        
        // 添加客队
        const awayTeamElement = document.createElement('div');
        awayTeamElement.className = 'cl-team';
        
        const awayLogoElement = document.createElement('div');
        awayLogoElement.className = 'cl-team-logo';
        
        // 如果有logo，添加logo
        if (awayLogo) {
            const logoImg = document.createElement('img');
            logoImg.src = awayLogo;
            logoImg.alt = awayTeam;
            awayLogoElement.appendChild(logoImg);
        } else {
            awayLogoElement.textContent = awayTeam.charAt(0);
        }
        
        awayTeamElement.appendChild(awayLogoElement);
        
        const awayNameElement = document.createElement('div');
        awayNameElement.className = 'cl-team-name';
        awayNameElement.textContent = awayTeam;
        awayTeamElement.appendChild(awayNameElement);
        
        const awayScoreElement = document.createElement('div');
        awayScoreElement.className = 'cl-score';
        awayScoreElement.textContent = awayGoals;
        awayTeamElement.appendChild(awayScoreElement);
        
        matchElement.appendChild(awayTeamElement);
        
        // 如果是决赛，添加额外样式
        if (isFinal) {
            matchElement.classList.add('cl-final-match');
        }
        
        return matchElement;
    }
    
    // 标记晋级球队
    function markWinningTeam(firstLegElement, secondLegElement, winner) {
        const firstLegHomeTeam = firstLegElement.querySelector('.cl-team:first-child .cl-team-name').textContent;
        const firstLegAwayTeam = firstLegElement.querySelector('.cl-team:last-child .cl-team-name').textContent;
        
        if (winner.name === firstLegHomeTeam) {
            firstLegElement.querySelector('.cl-team:first-child').classList.add('cl-winner');
            secondLegElement.querySelector('.cl-team:last-child').classList.add('cl-winner');
        } else if (winner.name === firstLegAwayTeam) {
            firstLegElement.querySelector('.cl-team:last-child').classList.add('cl-winner');
            secondLegElement.querySelector('.cl-team:first-child').classList.add('cl-winner');
        }
    }
    
    // 创建冠军部分
    function createChampionSection(champion) {
        const championSection = document.createElement('div');
        championSection.className = 'cl-champion-section';
        
        const championTitle = document.createElement('div');
        championTitle.className = 'cl-champion-title';
        championTitle.textContent = '🏆 冠军';
        championSection.appendChild(championTitle);
        
        const championTeam = document.createElement('div');
        championTeam.className = 'cl-champion-team';
        
        const championLogo = document.createElement('div');
        championLogo.className = 'cl-champion-logo';
        
        if (champion.logo) {
            const logoImg = document.createElement('img');
            logoImg.src = champion.logo;
            logoImg.alt = champion.name;
            championLogo.appendChild(logoImg);
        } else {
            championLogo.textContent = champion.name.charAt(0);
        }
        
        championTeam.appendChild(championLogo);
        
        const championName = document.createElement('div');
        championName.className = 'cl-champion-name';
        championName.textContent = champion.name;
        championTeam.appendChild(championName);
        
        championSection.appendChild(championTeam);
        
        return championSection;
    }
    
    // 生成随机日期 (03/XX 格式)
    function generateRandomDate() {
        const day = Math.floor(Math.random() * 15) + 15; // 15-30之间
        return `03/${day < 10 ? '0' + day : day}`;
    }
    
    // 增加日期
    function incrementDate(date) {
        const parts = date.split('/');
        let day = parseInt(parts[1]) + 7;
        let month = parseInt(parts[0]);
        
        if (day > 30) {
            day = day - 30;
            month++;
        }
        
        return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}`;
    }
});
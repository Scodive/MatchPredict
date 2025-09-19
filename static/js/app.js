document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const leagueSelect = document.getElementById('league-select');
    const homeTeamSelect = document.getElementById('home-team-select');
    const awayTeamSelect = document.getElementById('away-team-select');
    const homeOddsInput = document.getElementById('home-odds');
    const drawOddsInput = document.getElementById('draw-odds');
    const awayOddsInput = document.getElementById('away-odds');
    const addMatchBtn = document.getElementById('add-match-btn');
    const clearMatchesBtn = document.getElementById('clear-matches-btn');
    const predictBtn = document.getElementById('predict-btn');
    const matchesContainer = document.getElementById('matches-container');
    const matchCountSpan = document.getElementById('match-count');
    const resultsSection = document.getElementById('results-section');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 存储已添加的比赛
    let matches = [];
    window.matches = matches;  // 暴露为全局变量
    
    // 初始化函数
    function init() {
        // 加载所有联赛的球队数据
        loadAllLeaguesData();
        
        // 事件监听器
        leagueSelect.addEventListener('change', handleLeagueChange);
        clearMatchesBtn.addEventListener('click', clearMatches);
        predictBtn.addEventListener('click', predictMatches);
        
        // 模式切换
        initModeSelection();
        
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                console.log('标签切换:', this.getAttribute('data-tab'));
                
                // 移除所有标签的活动状态
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // 添加当前标签的活动状态
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab') + '-tab';
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                    console.log('显示标签页:', tabId);
                } else {
                    console.error('找不到标签页:', tabId);
                }
            });
        });
    }
    
    // 初始化模式选择
    function initModeSelection() {
        console.log('开始初始化模式选择');
        const modeButtons = document.querySelectorAll('.nav-btn');
        console.log('找到导航按钮数量:', modeButtons.length);
        
        modeButtons.forEach((btn, index) => {
            console.log(`绑定按钮 ${index + 1}:`, btn.id, btn.getAttribute('data-mode'));
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('按钮被点击:', this.id, this.getAttribute('data-mode'));
                const mode = this.getAttribute('data-mode');
                switchMode(mode);
            });
        });
    }
    
    // 切换模式
    function switchMode(mode) {
        console.log('切换到模式:', mode);
        
        // 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.getElementById(mode + '-mode-btn');
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // 隐藏所有模式区域
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 显示选中的模式
        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('显示模式区域:', mode);
        }
        
        // 为AI模式绑定按钮事件
        if (mode === 'ai') {
            const aiAddMatchBtn = document.getElementById('add-ai-match-btn');
            const aiPredictBtn = document.getElementById('ai-predict-btn');
            
            if (aiAddMatchBtn && !aiAddMatchBtn.hasAttribute('data-bound')) {
                aiAddMatchBtn.addEventListener('click', addAIMatch);
                aiAddMatchBtn.setAttribute('data-bound', 'true');
            }
            
            if (aiPredictBtn && !aiPredictBtn.hasAttribute('data-bound')) {
                aiPredictBtn.addEventListener('click', function() {
                    console.log('AI预测按钮点击');
                    // 这里可以添加AI预测逻辑
                });
                aiPredictBtn.setAttribute('data-bound', 'true');
            }
        }
        
        // 清空所有数据和结果
        clearAllDataAndResults();
        
        // 隐藏结果区域
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    }
    
    // 清空所有数据和结果
    function clearAllDataAndResults() {
        // 清空AI模式比赛
        matches = [];
        updateMatchesDisplay();
        
        // 清空经典模式比赛
        if (window.clearClassicMatches) {
            window.clearClassicMatches();
        }
        
        // 清空彩票模式选择
        if (window.lotteryManager) {
            window.lotteryManager.clearSelection();
        }
        
        // 清空所有结果区域
        const containers = [
            'individual-results',
            'best-parlay-results', 
            'all-parlays-results',
            'ai-analysis-results'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });
        
        console.log('已清空所有数据和预测结果');
    }
    
    // 处理联赛选择变化
    function handleLeagueChange() {
        const leagueCode = leagueSelect.value;
        
        // 重置球队选择
        homeTeamSelect.innerHTML = '<option value="">请选择主队</option>';
        awayTeamSelect.innerHTML = '<option value="">请选择客队</option>';
        
        if (!leagueCode) {
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
            return;
        }
        
        // 如果数据已加载，填充球队选择框
        if (featuresData[leagueCode]) {
            // 检查数据格式：如果是数组直接使用，如果是对象则提取键名
            const teamsList = Array.isArray(featuresData[leagueCode]) 
                ? featuresData[leagueCode] 
                : Object.keys(featuresData[leagueCode]);
            populateTeamSelects(leagueCode, teamsList);
        } else {
            // 如果没有数据，显示加载中状态
            homeTeamSelect.innerHTML = '<option value="">加载中...</option>';
            awayTeamSelect.innerHTML = '<option value="">加载中...</option>';
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
        }
    }
    
    // 填充球队选择框
    function populateTeamSelects(leagueCode, teamsList) {
        homeTeamSelect.innerHTML = '<option value="">请选择主队</option>';
        awayTeamSelect.innerHTML = '<option value="">请选择客队</option>';
        
        teamsList.forEach(team => {
            const homeOption = document.createElement('option');
            homeOption.value = team;
            homeOption.textContent = team;
            homeTeamSelect.appendChild(homeOption);
            
            const awayOption = document.createElement('option');
            awayOption.value = team;
            awayOption.textContent = team;
            awayTeamSelect.appendChild(awayOption);
        });
        
        homeTeamSelect.disabled = false;
        awayTeamSelect.disabled = false;
    }
    
    // 添加AI模式比赛
    function addAIMatch() {
        const homeTeam = document.getElementById('ai-home-team').value.trim();
        const awayTeam = document.getElementById('ai-away-team').value.trim();
        const league = document.getElementById('ai-league').value.trim();
        const homeOdds = document.getElementById('ai-home-odds').value;
        const drawOdds = document.getElementById('ai-draw-odds').value;
        const awayOdds = document.getElementById('ai-away-odds').value;
        
        // 验证输入
        if (!homeTeam || !awayTeam || !league) {
            showMessage('请填写完整的比赛信息', 'error');
            return;
        }
        
        if (homeTeam === awayTeam) {
            showMessage('主队和客队不能相同', 'error');
            return;
        }
        
        if (!homeOdds || !drawOdds || !awayOdds) {
            showMessage('请填写完整的赔率信息', 'error');
            return;
        }
        
        // 检查是否已存在相同比赛
        const existingMatch = matches.find(match => 
            match.home_team === homeTeam && match.away_team === awayTeam && match.league === league
        );
        
        if (existingMatch) {
            showMessage('该比赛已存在', 'error');
            return;
        }
        
        // 创建比赛对象
        const match = {
            id: Date.now(),
            home_team: homeTeam,
            away_team: awayTeam,
            league: league,
            home_odds: parseFloat(homeOdds),
            draw_odds: parseFloat(drawOdds),
            away_odds: parseFloat(awayOdds),
            source: 'ai'
        };
        
        // 添加到数组
        matches.push(match);
        
        // 更新显示
        updateMatchesDisplay();
        
        // 清空表单
        document.getElementById('ai-home-team').value = '';
        document.getElementById('ai-away-team').value = '';
        document.getElementById('ai-league').value = '';
        document.getElementById('ai-home-odds').value = '';
        document.getElementById('ai-draw-odds').value = '';
        document.getElementById('ai-away-odds').value = '';
        
        showMessage('比赛已添加', 'success');
    }

    // 添加比赛
    function addMatch() {
        const league = leagueSelect.value;
        const homeTeam = homeTeamSelect.value;
        const awayTeam = awayTeamSelect.value;
        const homeOdds = parseFloat(homeOddsInput.value);
        const drawOdds = parseFloat(drawOddsInput.value);
        const awayOdds = parseFloat(awayOddsInput.value);
        
        // 验证输入
        if (!league) {
            alert('请选择联赛');
            return;
        }
        
        if (!homeTeam) {
            alert('请选择主队');
            return;
        }
        
        if (!awayTeam) {
            alert('请选择客队');
            return;
        }
        
        if (homeTeam === awayTeam) {
            alert('主队和客队不能相同');
            return;
        }
        
        if (isNaN(homeOdds) || homeOdds < 1.01) {
            alert('请输入有效的主胜赔率（大于1.01）');
            return;
        }
        
        if (isNaN(drawOdds) || drawOdds < 1.01) {
            alert('请输入有效的平局赔率（大于1.01）');
            return;
        }
        
        if (isNaN(awayOdds) || awayOdds < 1.01) {
            alert('请输入有效的客胜赔率（大于1.01）');
            return;
        }
        
        // 创建比赛对象
        const match = {
            id: Date.now(), // 使用时间戳作为唯一ID
            league_code: league,
            leagueName: LEAGUES[league],
            home_team: homeTeam,
            away_team: awayTeam,
            home_odds: homeOdds,
            draw_odds: drawOdds,
            away_odds: awayOdds
        };
        
        // 添加到比赛列表
        matches.push(match);
        
        // 更新UI
        updateMatchesUI();
        
        // 重置表单
        homeTeamSelect.value = '';
        awayTeamSelect.value = '';
        homeOddsInput.value = '';
        drawOddsInput.value = '';
        awayOddsInput.value = '';
    }
    
    // 更新比赛列表UI
    function updateMatchesUI() {
        // 更新比赛数量
        matchCountSpan.textContent = `(${matches.length})`;
        
        // 更新按钮状态
        clearMatchesBtn.disabled = matches.length === 0;
        
        // 更新AI预测按钮
        if (window.aiPredictionManager) {
            window.aiPredictionManager.updateMatchCount();
        }
        
        // 更新比赛列表
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-futbol"></i><p>尚未添加任何比赛</p></div>';
            return;
        }
        
        let html = '';
        matches.forEach((match, index) => {
            html += `
                <div class="match-card" data-match-id="${match.id}">
                    <div class="match-info">
                        <div class="teams">
                            <span class="home-team">${match.home_team}</span>
                            <span class="vs">VS</span>
                            <span class="away-team">${match.away_team}</span>
                        </div>
                        <div class="league">${match.leagueName}</div>
                    </div>
                    
                    <div class="odds-info">
                        <div class="odds-group">
                            <span class="odds-label">胜平负:</span>
                            <span class="odds-values">${match.home_odds.toFixed(2)} / ${match.draw_odds.toFixed(2)} / ${match.away_odds.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="match-actions">
                        <button class="remove-match-btn" onclick="removeMatch(${match.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        matchesContainer.innerHTML = html;
    }
    
    // 暴露为全局函数
    window.updateMatchesUI = updateMatchesUI;
    
    // 删除比赛
    function removeMatch(matchId) {
        matches = matches.filter(match => match.id !== matchId);
        updateMatchesUI();
        
        // 如果删除所有比赛，隐藏结果区域
        if (matches.length === 0) {
            resultsSection.classList.add('hidden');
        }
    }
    
    // 清空所有比赛
    function clearMatches() {
        matches = [];
        updateMatchesUI();
        resultsSection.classList.add('hidden');
    }
    
    // 预测比赛
    function predictMatches() {
        if (matches.length === 0) return;

        
        
        // 使用setTimeout来模拟异步操作，让UI有时间更新
        setTimeout(() => {
            try {
                // 记录用户输入
                logUserPrediction(matches);
                
                // 处理每场比赛
                const individual_predictions = [];
                for (const match of matches) {
                    const prediction = predictMatch(
                        match.league_code,
                        match.home_team,
                        match.away_team,
                        match.home_odds,
                        match.draw_odds,
                        match.away_odds
                    );
                    individual_predictions.push(prediction);
                }
                
                // 生成所有可能的串关组合
                const all_combinations = generateParlays(individual_predictions);
                
                // 最佳串关
                const best_parlay = all_combinations.length > 0 ? all_combinations[0] : null;
                
                // 渲染结果
                displayIndividualResults(individual_predictions);
                renderBestParlay(best_parlay);
                renderAllParlays(all_combinations);
                
                // 显示结果区域
                resultsSection.classList.remove('hidden');
                
                // 滚动到结果区域
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error('预测出错:', error);
                alert('预测过程中发生错误: ' + error.message);
            } finally {
                
            }
        }, 100);
    }
    
    // 渲染单场预测结果
    function displayIndividualResults(predictions) {
        const container = document.getElementById('individual-results');
        container.innerHTML = '';
        
        predictions.forEach(prediction => {
            const homeWinPercentage = (prediction.home_win_prob * 100).toFixed(1);
            const drawPercentage = (prediction.draw_prob * 100).toFixed(1);
            const awayWinPercentage = (prediction.away_win_prob * 100).toFixed(1);
            
            const bestBet = prediction.best_bet;
            const bestEV = prediction.best_ev.toFixed(2);
            
            let bestBetText = '';
            if (bestBet === 'home') {
                bestBetText = `主胜 (${prediction.home_odds})`;
            } else if (bestBet === 'draw') {
                bestBetText = `平局 (${prediction.draw_odds})`;
            } else {
                bestBetText = `客胜 (${prediction.away_odds})`;
            }
            
            // 格式化最可能的比分（前三个）
            let scoresHTML = '<div class="no-data">无数据</div>';
            if (prediction.most_likely_scores && prediction.most_likely_scores.length > 0) {
                scoresHTML = prediction.most_likely_scores.map(score => 
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }
            
            // 格式化最可能的半场比分（前三个）
            let htScoresHTML = '<div class="no-data">无数据</div>';
            if (prediction.most_likely_ht_scores && prediction.most_likely_ht_scores.length > 0) {
                htScoresHTML = prediction.most_likely_ht_scores.map(score => 
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }
            
            // 格式化最可能的半全场结果（前三个）
            let htftHTML = '<div class="no-data">无数据</div>';
            if (prediction.most_likely_htft && prediction.most_likely_htft.length > 0) {
                htftHTML = prediction.most_likely_htft.map(htft => {
                    // 将半全场结果格式化为中文
                    const [ht, ft] = htft[0].split('/');
                    const htText = ht === 'H' ? '主胜' : (ht === 'D' ? '平局' : '客胜');
                    const ftText = ft === 'H' ? '主胜' : (ft === 'D' ? '平局' : '客胜');
                    return `<div class="prediction-item">${htText}/${ftText} (${(htft[1] * 100).toFixed(1)}%)</div>`;
                }).join('');
            }
            
            // 格式化最可能的总进球数（前三个）
            let totalGoalsHTML = '<div class="no-data">无数据</div>';
            if (prediction.most_likely_total_goals && prediction.most_likely_total_goals.length > 0) {
                totalGoalsHTML = prediction.most_likely_total_goals.map(goals => 
                    `<div class="prediction-item">${goals[0]} (${(goals[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }
            
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            
            resultCard.innerHTML = `
                <div class="match-info">
                    <div class="league">${getLeagueName(prediction.league_code)}</div>
                    <div class="teams">${prediction.home_team} vs ${prediction.away_team}</div>
                </div>
                
                <div class="prediction-details">
                    <div class="probabilities">
                        <div class="prob-item">
                            <div class="prob-label">主胜</div>
                            <div class="prob-value">${homeWinPercentage}%</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-label">平局</div>
                            <div class="prob-value">${drawPercentage}%</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-label">客胜</div>
                            <div class="prob-value">${awayWinPercentage}%</div>
                        </div>
                    </div>
                    
                    <div class="detailed-predictions">
                        <div class="detail-item">
                            <div class="detail-label">最可能比分:</div>
                            <div class="detail-value">${scoresHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">最可能半场比分:</div>
                            <div class="detail-value">${htScoresHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">最可能半全场:</div>
                            <div class="detail-value">${htftHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">最可能总进球:</div>
                            <div class="detail-value">${totalGoalsHTML}</div>
                        </div>
                    </div>
                    
                    <div class="best-bet">
                        <div class="bet-label">最佳投注:</div>
                        <div class="bet-value">${bestBetText} (期望值: ${bestEV})</div>
                    </div>
                </div>
            `;
            
            container.appendChild(resultCard);
        });
    }
    
    // 辅助函数：获取联赛名称
    function getLeagueName(leagueCode) {
        const leagueNames = {
            'PL': '英超',
            'PD': '西甲',
            'SA': '意甲',
            'BL1': '德甲',
            'FL1': '法甲'
        };
        
        return leagueNames[leagueCode] || leagueCode;
    }
    
    // 渲染最佳串关
    function renderBestParlay(parlay) {
        const container = document.getElementById('best-parlay-results');
        container.innerHTML = '';
        
        if (!parlay) {
            container.innerHTML = '<div class="empty-message">无法生成串关组合</div>';
            return;
        }
        
        // 格式化结果名称
        function formatResult(result) {
            if (result === 'home') return '主胜';
            if (result === 'draw') return '平局';
            if (result === 'away') return '客胜';
            return result;
        }
        
        // 创建选择项HTML
        let selectionsHTML = '';
        parlay.selections.forEach(selection => {
            selectionsHTML += `
                <div class="selection-item">
                    <div class="selection-match">${selection.match}</div>
                    <div class="selection-pick">
                        <div class="pick-type">${formatResult(selection.pick)}</div>
                        <div class="pick-odds">${selection.odds.toFixed(2)}</div>
                    </div>
                </div>
            `;
        });
        
        const parlayElement = document.createElement('div');
        parlayElement.className = 'parlay-result best-parlay';
        
        parlayElement.innerHTML = `
            <div class="parlay-header">
                <h3>最佳串关组合</h3>
                <div class="parlay-odds">总赔率: ${parlay.total_odds.toFixed(2)}</div>
            </div>
            <div class="parlay-stats">
                <div class="parlay-stat">
                    <div class="stat-value">${(parlay.total_prob * 100).toFixed(2)}%</div>
                    <div class="stat-label">中奖概率</div>
                </div>
                <div class="parlay-stat">
                    <div class="stat-value">${parlay.expected_value.toFixed(4)}</div>
                    <div class="stat-label">期望值</div>
                </div>
                <div class="parlay-stat">
                    <div class="stat-value">${parlay.selections.length}</div>
                    <div class="stat-label">比赛数量</div>
                </div>
            </div>
            <div class="parlay-selections">
                ${selectionsHTML}
            </div>
        `;
        
        container.appendChild(parlayElement);
    }
    
    // 渲染所有串关组合
    function renderAllParlays(parlays) {
        const container = document.getElementById('all-parlays-results');
        container.innerHTML = '';
        
        if (!parlays || parlays.length === 0) {
            container.innerHTML = '<div class="empty-message">无法生成串关组合</div>';
            return;
        }
        
        // 只显示前10个组合
        const displayParlays = parlays.slice(1, 11);
        
        if (displayParlays.length === 0) {
            container.innerHTML = '<div class="empty-message">没有更多串关组合</div>';
            return;
        }
        
        // 格式化结果名称
        function formatResult(result) {
            if (result === 'home') return '主胜';
            if (result === 'draw') return '平局';
            if (result === 'away') return '客胜';
            return result;
        }
        
        for (let i = 0; i < displayParlays.length; i++) {
            const parlay = displayParlays[i];
            
            // 创建选择项HTML
            let selectionsHTML = '';
            parlay.selections.forEach(selection => {
                selectionsHTML += `
                    <div class="selection-item">
                        <div class="selection-match">${selection.match}</div>
                        <div class="selection-pick">
                            <div class="pick-type">${formatResult(selection.pick)}</div>
                            <div class="pick-odds">${selection.odds.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            });
            
            const parlayElement = document.createElement('div');
            parlayElement.className = 'parlay-result';
            
            parlayElement.innerHTML = `
                <div class="parlay-header">
                    <h3>组合 #${i + 2}</h3>
                    <div class="parlay-odds">总赔率: ${parlay.total_odds.toFixed(2)}</div>
                </div>
                <div class="parlay-stats">
                    <div class="parlay-stat">
                        <div class="stat-value">${(parlay.total_prob * 100).toFixed(2)}%</div>
                        <div class="stat-label">中奖概率</div>
                    </div>
                    <div class="parlay-stat">
                        <div class="stat-value">${parlay.expected_value.toFixed(4)}</div>
                        <div class="stat-label">期望值</div>
                    </div>
                    <div class="parlay-stat">
                        <div class="stat-value">${parlay.selections.length}</div>
                        <div class="stat-label">比赛数量</div>
                    </div>
                </div>
                <div class="parlay-selections">
                    ${selectionsHTML}
                </div>
            `;
            
            container.appendChild(parlayElement);
        }
    }
    
    // 添加欧冠模拟导航功能
    const championsLeagueBtn = document.getElementById('champions-league-btn');
    const championsLeagueSection = document.getElementById('champions-league-section');
    
    // 如果没有这个按钮，创建一个
    if (!championsLeagueBtn) {
        // 创建欧冠模拟按钮
        const navContainer = document.querySelector('header .container') || document.querySelector('header');
        if (navContainer) {
            const clBtn = document.createElement('button');
            clBtn.id = 'champions-league-btn';
            clBtn.className = 'btn secondary-btn';
            clBtn.innerHTML = '<i class="fas fa-trophy"></i> 欧冠模拟';
            clBtn.style.marginLeft = '10px';
            
            // 找到合适的位置插入按钮
            const existingBtn = document.querySelector('header button') || document.querySelector('header h1');
            if (existingBtn) {
                existingBtn.parentNode.insertBefore(clBtn, existingBtn.nextSibling);
            } else {
                navContainer.appendChild(clBtn);
            }
            
            // 绑定点击事件
            clBtn.addEventListener('click', showChampionsLeagueSection);
        }
    } else {
        championsLeagueBtn.addEventListener('click', showChampionsLeagueSection);
    }
    
    // 显示欧冠模拟部分
    function showChampionsLeagueSection() {
        // 隐藏其他部分
        const sections = document.querySelectorAll('main > section');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // 显示欧冠模拟部分
        if (championsLeagueSection) {
            championsLeagueSection.classList.remove('hidden');
        }
    }
    
    // 调用初始化函数
    init();
    
    // 暴露全局函数
    window.removeMatch = removeMatch;
    window.clearMatches = clearMatches;
});

// 确保导航按钮功能正常工作
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM完全加载，开始绑定导航按钮');
    
    // 延迟一点确保所有元素都已渲染
    setTimeout(function() {
        const navButtons = document.querySelectorAll('.nav-btn');
        console.log('重新检查导航按钮:', navButtons.length);
        
        navButtons.forEach(btn => {
            // 移除可能的旧事件监听器
            btn.removeEventListener('click', handleNavClick);
            // 添加新的事件监听器
            btn.addEventListener('click', handleNavClick);
        });
    }, 100);
});

// 导航按钮点击处理函数
function handleNavClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('导航按钮被点击:', this.id);
    const mode = this.getAttribute('data-mode');
    console.log('切换到模式:', mode);
    
    if (mode) {
        // 更新按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // 隐藏所有模式区域
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 显示目标模式
        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('成功切换到模式:', mode);
        }
        
        // 隐藏结果区域
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    }
}
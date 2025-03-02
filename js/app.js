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
    
    // 初始化函数
    function init() {
        // 加载所有联赛的球队数据
        loadAllLeaguesData();
        
        // 事件监听器
        leagueSelect.addEventListener('change', handleLeagueChange);
        addMatchBtn.addEventListener('click', addMatch);
        clearMatchesBtn.addEventListener('click', clearMatches);
        predictBtn.addEventListener('click', predictMatches);
        
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // 移除所有标签的活动状态
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // 添加当前标签的活动状态
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
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
            populateTeamSelects(leagueCode, Object.keys(featuresData[leagueCode]));
        } else {
            // 否则加载数据
            loadingOverlay.classList.remove('hidden');
            loadLeagueData(leagueCode)
                .then(() => {
                    loadingOverlay.classList.add('hidden');
                })
                .catch(error => {
                    loadingOverlay.classList.add('hidden');
                    alert(`加载 ${LEAGUES[leagueCode]} 数据失败: ${error.message}`);
                });
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
        predictBtn.disabled = matches.length === 0;
        
        // 更新比赛列表
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<div class="empty-message">尚未添加任何比赛</div>';
            return;
        }
        
        matchesContainer.innerHTML = '';
        
        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-header">
                    <div class="match-teams">${match.home_team} vs ${match.away_team}</div>
                    <div class="match-league">${match.leagueName}</div>
                </div>
                <div class="match-odds">
                    <div class="odds-item">
                        <div class="odds-label">主胜</div>
                        <div class="odds-value">${match.home_odds.toFixed(2)}</div>
                    </div>
                    <div class="odds-item">
                        <div class="odds-label">平局</div>
                        <div class="odds-value">${match.draw_odds.toFixed(2)}</div>
                    </div>
                    <div class="odds-item">
                        <div class="odds-label">客胜</div>
                        <div class="odds-value">${match.away_odds.toFixed(2)}</div>
                    </div>
                </div>
                <button class="remove-match" data-id="${match.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            matchesContainer.appendChild(matchCard);
        });
        
        // 添加删除按钮事件
        document.querySelectorAll('.remove-match').forEach(btn => {
            btn.addEventListener('click', function() {
                const matchId = parseInt(this.getAttribute('data-id'));
                removeMatch(matchId);
            });
        });
    }
    
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
        
        // 显示加载动画
        loadingOverlay.classList.remove('hidden');
        
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
                renderIndividualPredictions(individual_predictions);
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
                // 隐藏加载动画
                loadingOverlay.classList.add('hidden');
            }
        }, 100);
    }
    
    // 渲染单场预测结果
    function renderIndividualPredictions(predictions) {
        const container = document.getElementById('individual-results');
        container.innerHTML = '';
        
        predictions.forEach((pred, index) => {
            // 格式化结果名称
            function formatResult(result) {
                if (result === 'home') return '主胜';
                if (result === 'draw') return '平局';
                if (result === 'away') return '客胜';
                return result;
            }
            
            // 创建投注选项HTML
            let betsHTML = '';
            pred.all_bets.forEach(([result, ev, odds, prob]) => {
                const resultName = formatResult(result);
                const evClass = ev > 0 ? 'positive-ev' : 'negative-ev';
                
                betsHTML += `
                    <div class="bet-option ${result === pred.best_bet ? 'best-bet' : ''}">
                        <div class="bet-name">${resultName}</div>
                        <div class="bet-details">
                            <span class="bet-odds">赔率: ${odds.toFixed(2)}</span>
                            <span class="bet-prob">概率: ${(prob * 100).toFixed(1)}%</span>
                            <span class="bet-ev ${evClass}">期望值: ${ev.toFixed(4)}</span>
                        </div>
                    </div>
                `;
            });
            
            const card = document.createElement('div');
            card.className = 'prediction-card';
            
            card.innerHTML = `
                <div class="prediction-header">
                    <h3>${pred.home_team} vs ${pred.away_team}</h3>
                    <div class="match-number">比赛 #${index + 1}</div>
                </div>
                <div class="prediction-content">
                    <div class="probabilities">
                        <div class="prob-item">
                            <div class="prob-value">${(pred.home_win_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">主胜</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-value">${(pred.draw_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">平局</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-value">${(pred.away_win_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">客胜</div>
                        </div>
                    </div>
                    <div class="betting-options">
                        <h4>投注选项</h4>
                        ${betsHTML}
                    </div>
                    <div class="best-prediction">
                        <div class="best-label">最佳投注</div>
                        <div class="best-value">${formatResult(pred.best_bet)}</div>
                        <div class="best-ev">期望值: ${pred.best_ev.toFixed(4)}</div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
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
    
    // 调用初始化函数
    init();
});
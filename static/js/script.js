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
    
    // 联赛名称映射
    const leagueNames = {
        'PL': '英超',
        'PD': '西甲',
        'SA': '意甲',
        'BL1': '德甲',
        'FL1': '法甲'
    };
    
    // 存储已添加的比赛
    let matches = [];
    
    // 存储各联赛的球队
    let teams = {};
    
    // 初始化函数
    function init() {
        // 加载所有联赛的球队数据
        fetchTeams();
        
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
    
    // 获取各联赛的球队数据
    async function fetchTeams() {
        try {
            const response = await fetch('/api/teams');
            const data = await response.json();
            
            if (data.success) {
                teams = data.teams;
                console.log('球队数据加载成功');
            } else {
                console.error('加载球队数据失败:', data.message);
                alert('加载球队数据失败，请刷新页面重试');
            }
        } catch (error) {
            console.error('加载球队数据出错:', error);
            alert('加载球队数据出错，请刷新页面重试');
        }
    }
    
    // 处理联赛选择变化
    function handleLeagueChange() {
        const selectedLeague = leagueSelect.value;
        
        // 清空并禁用球队选择框
        homeTeamSelect.innerHTML = '<option value="">请选择主队</option>';
        awayTeamSelect.innerHTML = '<option value="">请选择客队</option>';
        
        if (!selectedLeague) {
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
            return;
        }
        
        // 如果已加载该联赛的球队数据
        if (teams[selectedLeague]) {
            populateTeamSelects(teams[selectedLeague]);
        } else {
            // 如果尚未加载，尝试从服务器获取
            fetchLeagueTeams(selectedLeague);
        }
    }
    
    // 获取特定联赛的球队
    async function fetchLeagueTeams(leagueCode) {
        try {
            const response = await fetch(`/api/teams/${leagueCode}`);
            const data = await response.json();
            
            if (data.success) {
                teams[leagueCode] = data.teams;
                populateTeamSelects(data.teams);
            } else {
                console.error(`加载${leagueNames[leagueCode]}球队数据失败:`, data.message);
                alert(`加载${leagueNames[leagueCode]}球队数据失败，请重试`);
            }
        } catch (error) {
            console.error(`加载${leagueNames[leagueCode]}球队数据出错:`, error);
            alert(`加载${leagueNames[leagueCode]}球队数据出错，请重试`);
        }
    }
    
    // 填充球队选择框
    function populateTeamSelects(teamsList) {
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
            league,
            leagueName: leagueNames[league],
            homeTeam,
            awayTeam,
            homeOdds,
            drawOdds,
            awayOdds
        };
        
        // 添加到比赛列表
        matches.push(match);
        
        // 更新UI
        renderMatches();
        updateMatchCount();
        
        // 启用按钮
        clearMatchesBtn.disabled = false;
        predictBtn.disabled = false;
        
        // 重置表单
        leagueSelect.selectedIndex = 0;
        homeTeamSelect.innerHTML = '<option value="">请先选择联赛</option>';
        awayTeamSelect.innerHTML = '<option value="">请先选择联赛</option>';
        homeTeamSelect.disabled = true;
        awayTeamSelect.disabled = true;
        homeOddsInput.value = '';
        drawOddsInput.value = '';
        awayOddsInput.value = '';
    }
    
    // 渲染已添加的比赛
    function renderMatches() {
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<p class="empty-message">尚未添加任何比赛</p>';
            return;
        }
        
        matchesContainer.innerHTML = '';
        
        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-header">
                    <span class="league-name">${match.leagueName}</span>
                    <button class="remove-match" data-id="${match.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="match-teams">
                    <div class="team home-team">${match.homeTeam}</div>
                    <div class="vs">VS</div>
                    <div class="team away-team">${match.awayTeam}</div>
                </div>
                <div class="match-odds">
                    <div class="odd-item">
                        <div class="odd-value">${match.homeOdds.toFixed(2)}</div>
                        <div class="odd-label">主胜</div>
                    </div>
                    <div class="odd-item">
                        <div class="odd-value">${match.drawOdds.toFixed(2)}</div>
                        <div class="odd-label">平局</div>
                    </div>
                    <div class="odd-item">
                        <div class="odd-value">${match.awayOdds.toFixed(2)}</div>
                        <div class="odd-label">客胜</div>
                    </div>
                </div>
            `;
            
            matchesContainer.appendChild(matchCard);
        });
        
        // 添加删除比赛的事件监听器
        document.querySelectorAll('.remove-match').forEach(btn => {
            btn.addEventListener('click', function() {
                const matchId = parseInt(this.getAttribute('data-id'));
                removeMatch(matchId);
            });
        });
    }
    
    // 更新比赛计数
    function updateMatchCount() {
        matchCountSpan.textContent = `(${matches.length})`;
    }
    
    // 删除比赛
    function removeMatch(matchId) {
        matches = matches.filter(match => match.id !== matchId);
        renderMatches();
        updateMatchCount();
        
        clearMatchesBtn.disabled = matches.length === 0;
        predictBtn.disabled = matches.length < 1;
    }
    
    // 清空所有比赛
    function clearMatches() {
        if (confirm('确定要清空所有已添加的比赛吗？')) {
            matches = [];
            renderMatches();
            updateMatchCount();
            
            clearMatchesBtn.disabled = true;
            predictBtn.disabled = true;
            
            // 隐藏结果区域
            resultsSection.classList.add('hidden');
        }
    }
    
    // 预测比赛
    async function predictMatches() {
        if (matches.length === 0) {
            alert('请至少添加一场比赛');
            return;
        }
        
        try {
            // 显示加载动画
            loadingOverlay.classList.remove('hidden');
            
            // 准备请求数据
            const requestData = {
                matches: matches.map(match => ({
                    league_code: match.league,
                    home_team: match.homeTeam,
                    away_team: match.awayTeam,
                    home_odds: match.homeOdds,
                    draw_odds: match.drawOdds,
                    away_odds: match.awayOdds
                }))
            };
            
            // 发送预测请求
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 显示结果区域
                resultsSection.classList.remove('hidden');
                
                // 渲染预测结果
                renderIndividualPredictions(result.individual_predictions);
                renderBestParlay(result.best_parlay);
                renderAllParlays(result.all_combinations);
                
                // 滚动到结果区域
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(`预测失败: ${result.message}`);
            }
        } catch (error) {
            console.error('预测出错:', error);
            alert('预测过程中发生错误，请重试');
        } finally {
            // 隐藏加载动画
            loadingOverlay.classList.add('hidden');
        }
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
        const container = document.getElementById('best-parlay-result');
        
        // 格式化结果名称
        function formatResult(result) {
            if (result === 'home') return '主胜';
            if (result === 'draw') return '平局';
            if (result === 'away') return '客胜';
            return result;
        }
        
        // 创建选择项HTML
        let selectionsHTML = '';
        parlay.selections.forEach((sel, index) => {
            selectionsHTML += `
                <div class="selection-item">
                    <div class="selection-match">${sel.match}</div>
                    <div class="selection-pick">
                        <span class="pick-type">${formatResult(sel.pick)}</span>
                        <span class="pick-odds">@${sel.odds.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = `
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
    }
    
    // 渲染所有串关组合
    function renderAllParlays(combinations) {
        const container = document.getElementById('all-parlays-results');
        container.innerHTML = '';
        
        // 跳过第一个组合，因为它是最佳组合，已经在另一个标签中显示
        for (let i = 1; i < Math.min(combinations.length, 5); i++) {
            const parlay = combinations[i];
            
            // 格式化结果名称
            function formatResult(result) {
                if (result === 'home') return '主胜';
                if (result === 'draw') return '平局';
                if (result === 'away') return '客胜';
                return result;
            }
            
            // 创建选择项HTML
            let selectionsHTML = '';
            parlay.selections.forEach((sel, index) => {
                selectionsHTML += `
                    <div class="selection-item">
                        <div class="selection-match">${sel.match}</div>
                        <div class="selection-pick">
                            <span class="pick-type">${formatResult(sel.pick)}</span>
                            <span class="pick-odds">@${sel.odds.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });
            
            const parlayElement = document.createElement('div');
            parlayElement.className = 'parlay-result';
            parlayElement.innerHTML = `
                <div class="parlay-header">
                    <h3>组合 #${i + 1}</h3>
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
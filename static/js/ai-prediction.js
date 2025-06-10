/**
 * AI智能预测模块
 */

class AIPredictionManager {
    constructor() {
        this.currentMode = 'classic';
        this.aiMatches = [];
        this.aiResults = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 模式切换按钮
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.id.replace('-mode-btn', '');
                this.switchMode(mode);
            });
        });

        // AI模式添加比赛按钮
        const addAiMatchBtn = document.getElementById('add-ai-match-btn');
        if (addAiMatchBtn) {
            addAiMatchBtn.addEventListener('click', () => this.addAIMatch());
        }

        // AI预测按钮
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        if (aiPredictBtn) {
            aiPredictBtn.addEventListener('click', () => this.startAIPrediction());
        }

        // 标签页切换
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // 更新模式按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode-btn`).classList.add('active');

        // 显示/隐藏对应的输入区域
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(`${mode}-mode`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // 更新预测按钮显示
        const classicPredictBtn = document.getElementById('predict-btn');
        const aiPredictBtn = document.getElementById('ai-predict-btn');

        if (mode === 'ai' || mode === 'lottery') {
            classicPredictBtn.classList.add('hidden');
            aiPredictBtn.classList.remove('hidden');
        } else {
            classicPredictBtn.classList.remove('hidden');
            aiPredictBtn.classList.add('hidden');
        }

        // 更新标签页显示
        this.updateTabsVisibility(mode);
    }

    updateTabsVisibility(mode) {
        const aiTabs = document.querySelectorAll('.ai-tab');
        const classicTabs = document.querySelectorAll('.tab-btn:not(.ai-tab)');

        if (mode === 'ai' || mode === 'lottery') {
            aiTabs.forEach(tab => tab.classList.remove('hidden'));
        } else {
            aiTabs.forEach(tab => tab.classList.add('hidden'));
        }
    }

    addAIMatch() {
        const homeTeam = document.getElementById('ai-home-team').value.trim();
        const awayTeam = document.getElementById('ai-away-team').value.trim();
        const league = document.getElementById('ai-league').value.trim();
        const homeOdds = parseFloat(document.getElementById('ai-home-odds').value);
        const drawOdds = parseFloat(document.getElementById('ai-draw-odds').value);
        const awayOdds = parseFloat(document.getElementById('ai-away-odds').value);

        // 验证输入
        if (!homeTeam || !awayTeam) {
            this.showMessage('请填写主队和客队名称', 'error');
            return;
        }

        if (!league) {
            this.showMessage('请填写联赛名称', 'error');
            return;
        }

        if (isNaN(homeOdds) || isNaN(drawOdds) || isNaN(awayOdds)) {
            this.showMessage('请填写正确的赔率信息', 'error');
            return;
        }

        // 创建比赛数据
        const match = {
            match_id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            home_team: homeTeam,
            away_team: awayTeam,
            league_name: league,
            odds: {
                hhad: {
                    h: homeOdds.toString(),
                    d: drawOdds.toString(),
                    a: awayOdds.toString()
                }
            }
        };

        this.aiMatches.push(match);
        this.renderAIMatches();
        this.clearAIForm();
        this.updateAIPredictButton();

        this.showMessage('比赛添加成功', 'success');
    }

    clearAIForm() {
        document.getElementById('ai-home-team').value = '';
        document.getElementById('ai-away-team').value = '';
        document.getElementById('ai-league').value = '';
        document.getElementById('ai-home-odds').value = '';
        document.getElementById('ai-draw-odds').value = '';
        document.getElementById('ai-away-odds').value = '';
    }

    renderAIMatches() {
        const container = document.getElementById('matches-container');
        
        if (this.aiMatches.length === 0) {
            container.innerHTML = '<div class="empty-message">尚未添加任何比赛</div>';
            return;
        }

        let html = '';
        this.aiMatches.forEach((match, index) => {
            html += this.renderAIMatchCard(match, index);
        });

        container.innerHTML = html;
        this.bindAIMatchEvents();
    }

    renderAIMatchCard(match, index) {
        const odds = match.odds.hhad;
        return `
            <div class="match-card ai-match-card" data-index="${index}">
                <div class="match-info">
                    <div class="teams">
                        <span class="home-team">${match.home_team}</span>
                        <span class="vs">VS</span>
                        <span class="away-team">${match.away_team}</span>
                    </div>
                    <div class="league">${match.league_name}</div>
                </div>
                
                <div class="odds-info">
                    <div class="odds-group">
                        <span class="odds-label">胜平负:</span>
                        <span class="odds-values">${odds.h} / ${odds.d} / ${odds.a}</span>
                    </div>
                </div>
                
                <div class="match-actions">
                    <button class="remove-match-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    bindAIMatchEvents() {
        // 删除比赛按钮
        document.querySelectorAll('.remove-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.removeAIMatch(index);
            });
        });
    }

    removeAIMatch(index) {
        this.aiMatches.splice(index, 1);
        this.renderAIMatches();
        this.updateAIPredictButton();
        this.updateMatchCount();
    }

    updateAIPredictButton() {
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        const clearBtn = document.getElementById('clear-matches-btn');
        
        if (this.aiMatches.length > 0) {
            aiPredictBtn.disabled = false;
            clearBtn.disabled = false;
        } else {
            aiPredictBtn.disabled = true;
            clearBtn.disabled = true;
        }

        this.updateMatchCount();
    }

    updateMatchCount() {
        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${this.aiMatches.length})`;
        }
    }

    async startAIPrediction() {
        let matches = [];
        
        if (this.currentMode === 'lottery') {
            // 彩票模式：使用选中的彩票比赛
            if (window.lotteryManager) {
                matches = window.lotteryManager.getSelectedMatches();
            }
        } else if (this.currentMode === 'ai') {
            // AI模式：使用手动添加的比赛
            matches = this.aiMatches;
        }

        if (matches.length === 0) {
            this.showMessage('请先添加或选择比赛', 'error');
            return;
        }

        const aiPredictBtn = document.getElementById('ai-predict-btn');
        
        try {
            // 显示加载状态
            aiPredictBtn.disabled = true;
            aiPredictBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> AI分析中...';

            // 调用AI预测API
            const response = await fetch('/api/ai/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ matches })
            });

            const data = await response.json();

            if (data.success) {
                this.aiResults = data;
                this.displayAIResults();
                this.showMessage('AI分析完成', 'success');
            } else {
                throw new Error(data.message || 'AI预测失败');
            }

        } catch (error) {
            console.error('AI预测失败:', error);
            this.showMessage('AI预测失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            aiPredictBtn.disabled = false;
            aiPredictBtn.innerHTML = '<i class="fas fa-brain"></i> AI智能预测';
        }
    }

    displayAIResults() {
        if (!this.aiResults) return;

        // 显示结果区域
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('hidden');

        // 切换到AI分析标签页
        this.switchTab('ai-analysis');

        // 渲染各种结果
        this.renderAIAnalysisResults();
        this.renderHalfFullResults();
        this.renderGoalsResults();
        this.renderScoresResults();
    }

    renderAIAnalysisResults() {
        const container = document.getElementById('ai-analysis-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="ai-analysis-container">';

        analyses.forEach(analysis => {
            html += this.renderSingleAnalysis(analysis);
        });

        // 添加组合预测
        if (this.aiResults.combination_predictions) {
            html += this.renderCombinationPredictions(this.aiResults.combination_predictions);
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderSingleAnalysis(analysis) {
        const wdl = analysis.win_draw_loss;
        const confidence = Math.round(analysis.confidence_level * 100);

        return `
            <div class="analysis-card">
                <div class="match-header">
                    <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                    <span class="league">${analysis.league_name}</span>
                    <span class="confidence ${confidence > 70 ? 'high' : confidence > 50 ? 'medium' : 'low'}">
                        置信度: ${confidence}%
                    </span>
                </div>
                
                <div class="prediction-section">
                    <h4><i class="fas fa-chart-pie"></i> 胜平负预测</h4>
                    <div class="wdl-predictions">
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'home' ? 'best' : ''}">
                            <span class="label">主胜</span>
                            <span class="probability">${Math.round(wdl.home * 100)}%</span>
                            <div class="probability-bar">
                                <div class="probability-fill home-fill" style="width: ${wdl.home * 100}%"></div>
                            </div>
                        </div>
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'draw' ? 'best' : ''}">
                            <span class="label">平局</span>
                            <span class="probability">${Math.round(wdl.draw * 100)}%</span>
                            <div class="probability-bar">
                                <div class="probability-fill draw-fill" style="width: ${wdl.draw * 100}%"></div>
                            </div>
                        </div>
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'away' ? 'best' : ''}">
                            <span class="label">客胜</span>
                            <span class="probability">${Math.round(wdl.away * 100)}%</span>
                            <div class="probability-bar">
                                <div class="probability-fill away-fill" style="width: ${wdl.away * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-reason">
                    <h4><i class="fas fa-brain"></i> AI分析理由</h4>
                    <div class="reason-content">
                        <p>${analysis.analysis_reason}</p>
                    </div>
                </div>
                
                ${this.renderQuickStats(analysis)}
                ${this.renderRecommendedBets(analysis.recommended_bets)}
                ${this.renderValueBets(analysis.value_bets)}
            </div>
        `;
    }

    renderQuickStats(analysis) {
        const wdl = analysis.win_draw_loss;
        const hf = analysis.half_full_time;
        const goals = analysis.total_goals;
        const scores = analysis.exact_scores;

        // 找出最可能的结果
        const bestHalfFull = Object.entries(hf || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        const bestGoals = Object.entries(goals || {})
            .sort(([,a], [,b]) => b - a)[0];
        
        const topScore = scores && scores.length > 0 ? scores[0] : ['1-1', 0.1];

        return `
            <div class="quick-stats">
                <h4><i class="fas fa-chart-line"></i> 关键预测</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">最可能结果</span>
                        <span class="stat-value">${this.formatOutcome(this.getBestOutcome(wdl))}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">最可能比分</span>
                        <span class="stat-value">${topScore[0]}</span>
                        <span class="stat-prob">${Math.round(topScore[1] * 100)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">进球数区间</span>
                        <span class="stat-value">${this.formatGoalsRange(bestGoals?.[0])}</span>
                        <span class="stat-prob">${Math.round((bestGoals?.[1] || 0) * 100)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">半全场推荐</span>
                        <span class="stat-value">${this.formatHalfFull(bestHalfFull[0]?.[0])}</span>
                        <span class="stat-prob">${Math.round((bestHalfFull[0]?.[1] || 0) * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    formatOutcome(outcome) {
        const map = {'home': '主胜', 'draw': '平局', 'away': '客胜'};
        return map[outcome] || outcome;
    }

    formatGoalsRange(range) {
        const map = {
            '0-1': '0-1球',
            '2-3': '2-3球', 
            '4-6': '4-6球',
            '7+': '7球以上'
        };
        return map[range] || range;
    }

    formatHalfFull(hf) {
        const map = {
            'home_home': '主/主',
            'home_draw': '主/平',
            'home_away': '主/客',
            'draw_home': '平/主',
            'draw_draw': '平/平',
            'draw_away': '平/客',
            'away_home': '客/主',
            'away_draw': '客/平',
            'away_away': '客/客'
        };
        return map[hf] || hf;
    }

    getBestOutcome(wdl) {
        const max = Math.max(wdl.home, wdl.draw, wdl.away);
        if (wdl.home === max) return 'home';
        if (wdl.draw === max) return 'draw';
        return 'away';
    }

    renderRecommendedBets(bets) {
        if (!bets || bets.length === 0) return '';

        let html = '<div class="recommended-bets"><h4>推荐投注</h4><div class="bets-list">';
        
        bets.forEach(bet => {
            const confidence = Math.round((bet.confidence || 0) * 100);
            html += `
                <div class="bet-item">
                    <span class="bet-type">${bet.bet_type}</span>
                    <span class="bet-selection">${bet.selection}</span>
                    <span class="bet-confidence">${confidence}%</span>
                    <p class="bet-reason">${bet.reason}</p>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    renderValueBets(bets) {
        if (!bets || bets.length === 0) return '';

        let html = '<div class="value-bets"><h4>价值投注机会</h4><div class="bets-list">';
        
        bets.forEach(bet => {
            const expectedValue = Math.round(bet.expected_value * 100);
            const probability = Math.round(bet.predicted_probability * 100);
            
            html += `
                <div class="value-bet-item ${expectedValue > 10 ? 'high-value' : ''}">
                    <div class="bet-info">
                        <span class="bet-type">${bet.bet_type}</span>
                        <span class="bet-selection">${bet.selection}</span>
                        <span class="odds">赔率: ${bet.odds}</span>
                    </div>
                    <div class="bet-stats">
                        <span class="probability">预测概率: ${probability}%</span>
                        <span class="expected-value">期望值: ${expectedValue > 0 ? '+' : ''}${expectedValue}%</span>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    renderCombinationPredictions(combinations) {
        if (!combinations || combinations.length === 0) return '';

        let html = '<div class="combination-predictions"><h3>AI推荐组合</h3>';

        combinations.forEach(combo => {
            html += `
                <div class="combination-card">
                    <h4>${combo.type}</h4>
                    <p class="combination-desc">${combo.description}</p>
                    
                    <div class="selections">
                        ${combo.selections.map(selection => `
                            <div class="selection-item">
                                <span class="match">${selection.match}</span>
                                <span class="prediction">${this.formatPrediction(selection.prediction)}</span>
                                <span class="probability">${Math.round((selection.probability || 0) * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${combo.total_confidence ? `
                        <div class="combination-confidence">
                            组合置信度: ${Math.round(combo.total_confidence * 100)}%
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    formatPrediction(prediction) {
        const formatMap = {
            'home': '主胜',
            'draw': '平局',
            'away': '客胜',
            'home_home': '主/主',
            'home_draw': '主/平',
            'home_away': '主/客',
            'draw_home': '平/主',
            'draw_draw': '平/平',
            'draw_away': '平/客',
            'away_home': '客/主',
            'away_draw': '客/平',
            'away_away': '客/客',
            '0-1': '0-1球',
            '2-3': '2-3球',
            '4-6': '4-6球',
            '7+': '7球或以上'
        };
        return formatMap[prediction] || prediction;
    }

    renderHalfFullResults() {
        const container = document.getElementById('half-full-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="half-full-container">';

        analyses.forEach(analysis => {
            if (analysis.half_full_time) {
                html += this.renderHalfFullAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderHalfFullAnalysis(analysis) {
        const hf = analysis.half_full_time;
        const sortedHF = Object.entries(hf)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // 只显示前5个最可能的结果

        return `
            <div class="half-full-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="half-full-predictions">
                    ${sortedHF.map(([outcome, prob], index) => `
                        <div class="hf-item ${index === 0 ? 'best' : ''}">
                            <span class="outcome">${this.formatPrediction(outcome)}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderGoalsResults() {
        const container = document.getElementById('goals-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="goals-container">';

        analyses.forEach(analysis => {
            if (analysis.total_goals) {
                html += this.renderGoalsAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderGoalsAnalysis(analysis) {
        const goals = analysis.total_goals;
        const sortedGoals = Object.entries(goals)
            .sort(([,a], [,b]) => b - a);

        return `
            <div class="goals-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="goals-predictions">
                    ${sortedGoals.map(([range, prob], index) => `
                        <div class="goals-item ${index === 0 ? 'best' : ''}">
                            <span class="range">${this.formatPrediction(range)}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderScoresResults() {
        const container = document.getElementById('scores-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="scores-container">';

        analyses.forEach(analysis => {
            if (analysis.exact_scores) {
                html += this.renderScoresAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderScoresAnalysis(analysis) {
        const scores = analysis.exact_scores;

        return `
            <div class="scores-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="scores-predictions">
                    ${scores.map(([score, prob], index) => `
                        <div class="score-item ${index === 0 ? 'best' : ''}">
                            <span class="score">${score}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // 更新标签内容显示
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            ${message}
        `;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// 全局实例
let aiPredictionManager = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    aiPredictionManager = new AIPredictionManager();
});

// 导出给其他模块使用
window.AIPredictionManager = AIPredictionManager; 
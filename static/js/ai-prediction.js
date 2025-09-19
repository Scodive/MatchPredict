/**
 * AI智能预测模块
 */

class AIPredictionManager {
    constructor() {
        this.currentMode = 'classic';
        this.aiMatches = [];
        this.aiResults = null;
        this.initializeEventListeners();
        
        // 初始化按钮状态
        setTimeout(() => {
            this.updateAIPredictButtonText();
        }, 100);
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
        
        // 清空所有结果
        this.clearAllResults();
        
        // 更新UI显示
        this.updateTabsVisibility(mode);
        this.updateModeButtons(mode);
        this.updateModeSpecificDisplay(mode);
        
        // 根据模式更新按钮文本和比赛计数
        this.updateMatchCount();
        
        // 重新渲染当前模式的比赛
        if (mode === 'lottery' && window.lotteryManager) {
            // 重新显示体彩选中的比赛
            setTimeout(() => {
                this.updateModeSpecificDisplay(mode);
                this.updateMatchCount();
            }, 100);
        }
        
        console.log(`切换到${mode}模式`);
    }

    clearAllResults() {
        // 清空分析结果显示
        const resultContainer = document.getElementById('ai-analysis-results');
        if (resultContainer) {
            resultContainer.innerHTML = '';
        }
        
        // 清空经典模式结果
        const classicResults = document.getElementById('results');
        if (classicResults) {
            classicResults.innerHTML = '';
        }
        
        // 重置为默认标签页
        this.switchTab('ai-input');
    }

    updateModeButtons(mode) {
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

        // 所有模式都只显示AI预测按钮，隐藏经典预测按钮
        const classicPredictBtn = document.getElementById('predict-btn');
        const aiPredictBtn = document.getElementById('ai-predict-btn');

        // 隐藏经典预测按钮
        if (classicPredictBtn) classicPredictBtn.classList.add('hidden');
        
        // 显示AI预测按钮
        if (aiPredictBtn) {
            aiPredictBtn.classList.remove('hidden');
        }
    }

    updateModeSpecificDisplay(mode) {
        const matchesContainer = document.getElementById('matches-container');
        if (!matchesContainer) return;

        if (mode === 'classic') {
            // 经典模式：显示全局比赛列表
            if (typeof window.updateMatchesUI === 'function') {
                window.updateMatchesUI();
            } else {
                matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-futbol"></i><p>尚未添加任何比赛</p></div>';
            }
        } else if (mode === 'ai') {
            // AI模式：显示AI模式的比赛列表
            this.renderAIMatches();
        } else if (mode === 'lottery') {
            // 体彩模式：隐藏matches-container，因为体彩有自己的显示区域
            matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-info-circle"></i><p>体彩模式的比赛显示在上方选择区域</p></div>';
        }
    }

    renderLotterySelectedCard(match, index) {
        const odds = match.odds?.hhad || {};
        return `
            <div class="match-card lottery-selected-card" data-match-id="${match.match_id}">
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
                        <span class="odds-values">${odds.h || 'N/A'} / ${odds.d || 'N/A'} / ${odds.a || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="match-source">
                    <span class="source-tag">体彩数据</span>
                </div>
            </div>
        `;
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
        
        // 强制更新按钮状态
        setTimeout(() => {
            this.updateAIPredictButtonText();
        }, 50);

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
        
        if (!container) {
            console.warn('找不到matches-container元素');
            return;
        }
        
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
        this.updateAIPredictButtonText();
        this.updateMatchCount();
    }

    updateMatchCount() {
        const matchCount = document.getElementById('match-count');
        if (!matchCount) return;
        
        let count = 0;
        
        if (this.currentMode === 'lottery') {
            count = window.lotteryManager ? window.lotteryManager.selectedMatches.size : 0;
        } else if (this.currentMode === 'ai') {
            count = this.aiMatches.length;
        } else if (this.currentMode === 'classic') {
            count = window.matches ? window.matches.length : 0;
        }
        
        matchCount.textContent = `(${count})`;
        
        // 同时更新按钮状态
        this.updateAIPredictButtonText();
    }

    async startAIPrediction() {
        try {
            // 获取要预测的比赛数据
            let matchesToPredict = [];
            
            if (this.currentMode === 'lottery') {
                // 体彩模式：获取体彩选中的比赛
                if (window.lotteryManager && window.lotteryManager.getSelectedMatches) {
                    const lotteryMatches = window.lotteryManager.getSelectedMatches();
                    matchesToPredict = lotteryMatches.map(match => this.convertToAIFormat(match));
                    console.log('体彩模式选中比赛:', lotteryMatches);
                }
            } else if (this.currentMode === 'ai') {
                // AI模式：使用AI模式添加的比赛
                matchesToPredict = this.aiMatches;
            } else if (this.currentMode === 'classic') {
                // 经典模式：使用全局比赛列表
                if (window.matches && window.matches.length > 0) {
                    matchesToPredict = window.matches.map(match => this.convertToAIFormat(match));
                }
            }

            if (!matchesToPredict || matchesToPredict.length === 0) {
                this.showMessage('请先选择或添加比赛', 'error');
                return;
            }

            console.log('开始AI预测，比赛数量:', matchesToPredict.length);
            console.log('比赛数据:', matchesToPredict);

            // 显示加载状态
            const loadingElement = document.getElementById('loading-overlay');
            if (loadingElement) {
                loadingElement.classList.remove('hidden');
            }

            // 更新按钮状态
            const aiPredictBtn = document.getElementById('ai-predict-btn');
            if (aiPredictBtn) {
                aiPredictBtn.disabled = true;
                aiPredictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI分析中...';
            }

            // 发送预测请求
            const response = await fetch('/api/ai/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    matches: matchesToPredict
                })
            });

            if (!response.ok) {
                throw new Error(`网络错误: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.aiResults = result.predictions;
                this.displayAIResults();
                this.showMessage('AI预测完成', 'success');
                
                // 显示结果区域并切换到AI分析标签页
                const resultsSection = document.getElementById('results-section');
                if (resultsSection) {
                    resultsSection.classList.remove('hidden');
                }
                this.switchTab('ai-analysis');
            } else {
                throw new Error(result.error || '预测失败');
            }

        } catch (error) {
            console.error('AI预测失败:', error);
            this.showMessage(`AI预测失败: ${error.message}`, 'error');
        } finally {
            // 隐藏加载状态
            const loadingElement = document.getElementById('loading-overlay');
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }

            // 恢复按钮状态
            const aiPredictBtn = document.getElementById('ai-predict-btn');
            if (aiPredictBtn) {
                aiPredictBtn.disabled = false;
                this.updateAIPredictButtonText();
            }
        }
    }

    convertToAIFormat(match) {
        // 将不同格式的比赛数据转换为AI预测API需要的格式
        if (match.odds && match.odds.hhad) {
            // 已经是正确格式（体彩或AI格式）
            return match;
        } else {
            // 从全局格式转换
            return {
                match_id: match.id || match.match_id || `converted_${Date.now()}`,
                home_team: match.home_team,
                away_team: match.away_team,
                league_name: match.leagueName || match.league_name || '未知联赛',
                odds: {
                    hhad: {
                        h: (match.home_odds || 2.0).toString(),
                        d: (match.draw_odds || 3.2).toString(),
                        a: (match.away_odds || 2.8).toString()
                    }
                }
            };
        }
    }

    updateAIPredictButtonText() {
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        if (!aiPredictBtn) {
            return;
        }

        let matchCount = 0;
        
        if (this.currentMode === 'lottery') {
            if (window.lotteryManager && window.lotteryManager.selectedMatches) {
                matchCount = window.lotteryManager.selectedMatches.size;
            }
        } else if (this.currentMode === 'ai') {
            matchCount = this.aiMatches.length;
        } else if (this.currentMode === 'classic') {
            matchCount = window.matches ? window.matches.length : 0;
        }
        
        if (matchCount > 0) {
            aiPredictBtn.innerHTML = `<i class="fas fa-brain"></i> AI预测选中的 ${matchCount} 场比赛`;
            aiPredictBtn.disabled = false;
        } else {
            aiPredictBtn.innerHTML = '<i class="fas fa-brain"></i> AI智能预测';
            aiPredictBtn.disabled = true;
        }
    }

    displayAIResults() {
        if (!this.aiResults || this.aiResults.length === 0) {
            this.showMessage('没有AI分析结果', 'error');
            return;
        }

        // 显示简化的AI分析结果到ai-analysis-results容器
        this.renderSimpleAIResults();
    }

    renderSimpleAIResults() {
        const container = document.getElementById('ai-analysis-results');
        if (!container) {
            console.error('ai-analysis-results容器不存在');
            return;
        }

        let html = '<div class="simple-ai-results">';
        
        this.aiResults.forEach((result, index) => {
            html += `
                <div class="ai-result-card">
                    <div class="match-header">
                        <h3 class="match-title">
                            <span class="home-team">${result.home_team}</span>
                            <span class="vs">VS</span>
                            <span class="away-team">${result.away_team}</span>
                        </h3>
                        <div class="league-info">${result.league_name}</div>
                    </div>
                    
                    <div class="odds-display">
                        <span class="odds-item">主胜: ${result.odds.home}</span>
                        <span class="odds-item">平局: ${result.odds.draw}</span>
                        <span class="odds-item">客胜: ${result.odds.away}</span>
                    </div>
                    
                    <div class="ai-analysis-content">
                        <h4><i class="fas fa-brain"></i> AI智能分析</h4>
                        <div class="analysis-text">${this.formatAnalysisText(result.ai_analysis)}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    formatAnalysisText(text) {
        if (!text) return '暂无分析';
        
        // 将换行符转换为HTML换行
        return text.replace(/\n/g, '<br>').replace(/\r/g, '');
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
    window.aiPredictionManager = aiPredictionManager;  // 暴露为全局变量
});

// 导出给其他模块使用
window.AIPredictionManager = AIPredictionManager; 
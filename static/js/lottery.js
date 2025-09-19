/**
 * 中国体育彩票数据处理模块
 */

class LotteryManager {
    constructor() {
        this.matches = [];
        this.selectedMatches = new Set();
        this.isCollapsed = true; // 默认折叠状态
        this.defaultShowCount = 10; // 默认显示的比赛数量
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 刷新比赛数据按钮
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const daysSelect = document.getElementById('days-filter');
                const days = daysSelect ? parseInt(daysSelect.value) : 3;
                this.refreshMatches(days);
            });
        }

        // 强制刷新按钮 (提示用户运行同步脚本)
        const forceRefreshBtn = document.getElementById('force-refresh-lottery-btn');
        if (forceRefreshBtn) {
            forceRefreshBtn.addEventListener('click', () => {
                this.showForceRefreshModal();
            });
        }

        // 天数筛选
        const daysFilter = document.getElementById('days-filter');
        if (daysFilter) {
            daysFilter.addEventListener('change', (e) => {
                this.refreshMatches(parseInt(e.target.value));
            });
        }

        // 折叠/展开切换按钮
        const toggleBtn = document.getElementById('toggle-matches-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleMatchesDisplay();
            });
        }

        // 生成最佳串关按钮
        const generateParlayBtn = document.getElementById('generate-parlay-btn');
        if (generateParlayBtn) {
            generateParlayBtn.addEventListener('click', () => {
                this.generateBestParlay();
            });
        }

        // 清空选择按钮
        const clearBtn = document.getElementById('clear-lottery-selection-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
        
        // 体彩AI预测按钮
        const predictBtn = document.getElementById('lottery-ai-predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                this.startLotteryAIPrediction();
            });
        }
    }

    async refreshMatches(days = 3) {
        const container = document.getElementById('lottery-matches');
        const refreshBtn = document.getElementById('refresh-lottery-btn');

        try {
            // 显示加载状态
            container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> 正在获取比赛数据...</div>';
            
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 获取中...';
            }

            // 从数据库获取比赛数据
            const response = await fetch(`/api/lottery/matches?days=${days}`);
            
            // 检查HTTP状态
            if (!response.ok) {
                if (response.status === 504) {
                    throw new Error('服务器响应超时，请稍后重试');
                } else if (response.status === 500) {
                    throw new Error('服务器内部错误，请联系管理员');
                } else {
                    throw new Error(`请求失败 (${response.status})`);
                }
            }

            // 尝试解析JSON
            let data;
            try {
                const responseText = await response.text();
                if (!responseText.trim()) {
                    throw new Error('服务器返回空响应');
                }
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('JSON解析错误:', jsonError);
                throw new Error('服务器响应格式错误，请刷新页面重试');
            }

            if (data.success) {
                this.matches = data.matches || [];
                this.renderMatches();
                
                // 显示数据来源信息
                this.showMessage(`💾 成功从数据库获取 ${data.count || this.matches.length} 场比赛`, 'success');
            } else {
                throw new Error(data.message || '获取比赛数据失败');
            }

        } catch (error) {
            console.error('获取彩票数据失败:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>获取比赛数据失败</h3>
                    <p>${error.message}</p>
                    <button onclick="lotteryManager.refreshMatches()" class="retry-btn">
                        <i class="fas fa-redo"></i> 重试
                    </button>
                </div>
            `;
            this.showMessage('获取数据失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> 刷新比赛数据';
            }
        }
    }

    renderMatches() {
        const container = document.getElementById('lottery-matches');
        
        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = '<div class="empty-message">暂无比赛数据</div>';
            this.updateMatchesCount(0, 0);
            return;
        }

        // 按联赛分组
        const matchesByLeague = this.groupMatchesByLeague(this.matches);
        
        let html = '';
        let cardIndex = 0;
        for (const [leagueName, matches] of Object.entries(matchesByLeague)) {
            html += this.renderLeagueSection(leagueName, matches, cardIndex);
            cardIndex += matches.length;
        }

        container.innerHTML = html;
        
        // 应用折叠状态
        this.applyCollapseState();
        
        // 更新统计信息
        this.updateMatchesCount(this.matches.length, this.getVisibleMatchesCount());
        
        // 更新按钮文字
        this.updateToggleButton();
        
        // 绑定事件
        this.bindMatchEvents();
    }

    groupMatchesByLeague(matches) {
        const grouped = {};
        matches.forEach(match => {
            const league = match.league_name || '其他';
            if (!grouped[league]) {
                grouped[league] = [];
            }
            grouped[league].push(match);
        });
        return grouped;
    }

    renderLeagueSection(leagueName, matches, startIndex = 0) {
        let html = `
            <div class="league-section">
                <h3 class="league-title">
                    <i class="fas fa-futbol"></i> ${leagueName} 
                    <span class="match-count">(${matches.length}场)</span>
                </h3>
                <div class="league-matches">
        `;

        matches.forEach((match, index) => {
            const cardIndex = startIndex + index;
            html += this.renderMatchCard(match, cardIndex);
        });

        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    renderMatchCard(match, cardIndex) {
        const isSelected = this.selectedMatches.has(match.match_id);
        const matchTime = this.formatMatchTime(match.match_time, match.match_date);
        const collapseClass = cardIndex >= this.defaultShowCount ? 'collapsed' : 'show-first-few';
        
        // 获取赔率信息
        const odds = match.odds || {};
        const hhadOdds = odds.hhad || {};
        
        return `
            <div class="lottery-match-card ${isSelected ? 'selected' : ''}" 
                 data-match-id="${match.match_id}">
                <div class="match-header">
                    <div class="match-time">${matchTime}</div>
                    <div class="match-status">${this.getMatchStatus(match.status)}</div>
                </div>
                
                <div class="match-teams">
                    <div class="team home-team">
                        <span class="team-name">${match.home_team}</span>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team away-team">
                        <span class="team-name">${match.away_team}</span>
                    </div>
                </div>
                
                ${this.renderOddsSection(odds)}
                
                <div class="match-actions">
                    <button class="select-match-btn ${isSelected ? 'selected' : ''}" 
                            data-match-id="${match.match_id}">
                        <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                        ${isSelected ? '已选择' : '选择比赛'}
                    </button>
                </div>
            </div>
        `;
    }

    renderOddsSection(odds) {
        const hhadOdds = odds.hhad || {};
        const scoreOdds = odds.score || {};
        const goalOdds = odds.goal || {};
        const halfFullOdds = odds.half_full || {};

        let html = '<div class="odds-section">';

        // 胜平负赔率
        if (hhadOdds.h || hhadOdds.d || hhadOdds.a) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">胜平负</div>
                    <div class="odds-values">
                        <span class="odds-item">主胜: ${hhadOdds.h || 'N/A'}</span>
                        <span class="odds-item">平局: ${hhadOdds.d || 'N/A'}</span>
                        <span class="odds-item">客胜: ${hhadOdds.a || 'N/A'}</span>
                    </div>
                </div>
            `;
        }

        // 如果有其他赔率，也可以显示
        if (Object.keys(scoreOdds).length > 0) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">比分玩法</div>
                    <div class="odds-note">共 ${Object.keys(scoreOdds).length} 个选项</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    formatMatchTime(matchTime, matchDate) {
        try {
            if (matchDate && matchTime) {
                return `${matchDate} ${matchTime}`;
            } else if (matchDate) {
                return matchDate;
            } else if (matchTime) {
                return matchTime;
            } else {
                return '时间待定';
            }
        } catch (error) {
            return '时间待定';
        }
    }

    getMatchStatus(status) {
        const statusMap = {
            'PENDING': '未开始',
            'LIVE': '进行中',
            'FINISHED': '已结束',
            'CANCELLED': '已取消',
            'Selling': '销售中',
            'Unknown': '未知'
        };
        return statusMap[status] || '未知';
    }

    bindMatchEvents() {
        // 选择比赛按钮
        document.querySelectorAll('.select-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = btn.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });

        // 点击比赛卡片也能选择
        document.querySelectorAll('.lottery-match-card').forEach(card => {
            card.addEventListener('click', () => {
                const matchId = card.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });
    }

    toggleMatchSelection(matchId) {
        const match = this.matches.find(m => m.match_id === matchId);
        if (!match) return;

        if (this.selectedMatches.has(matchId)) {
            // 取消选择
            this.selectedMatches.delete(matchId);
        } else {
            // 选择比赛
            this.selectedMatches.add(matchId);
        }

        // 更新显示
        this.updateMatchCardSelection(matchId);
        this.updateSelectionInfo();
        this.updateSelectedMatchesDisplay();
        
        // 检查是否显示串关推荐
        this.checkParlayRecommendation();
        
        // 如果当前是体彩模式，立即更新AI模式的显示
        if (window.aiPredictionManager && window.aiPredictionManager.currentMode === 'lottery') {
            window.aiPredictionManager.updateModeSpecificDisplay('lottery');
            window.aiPredictionManager.updateAIPredictButtonText();
        }
    }

    updateMatchCardSelection(matchId) {
        const card = document.querySelector(`[data-match-id="${matchId}"]`);
        const btn = card.querySelector('.select-match-btn');
        const isSelected = this.selectedMatches.has(matchId);

        if (isSelected) {
            card.classList.add('selected');
            btn.classList.add('selected');
            btn.innerHTML = '<i class="fas fa-check-square"></i> 已选择';
        } else {
            card.classList.remove('selected');
            btn.classList.remove('selected');
            btn.innerHTML = '<i class="fas fa-square"></i> 选择比赛';
        }
    }

    updateSelectionInfo() {
        const count = this.selectedMatches.size;
        
        // 更新主界面的比赛计数
        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${count})`;
        }
        
        // 更新AI预测按钮状态（如果AI预测管理器存在）
        if (window.aiPredictionManager && typeof window.aiPredictionManager.updateAIPredictButtonText === 'function') {
            window.aiPredictionManager.updateAIPredictButtonText();
        }
    }

    updateSelectedMatchesDisplay() {
        const container = document.getElementById('lottery-selected-matches');
        const countElement = document.getElementById('lottery-selected-count');
        const clearBtn = document.getElementById('clear-lottery-selection-btn');
        const predictBtn = document.getElementById('lottery-ai-predict-btn');
        
        if (!container) return;
        
        const selectedMatches = this.getSelectedMatches();
        const count = selectedMatches.length;
        
        // 更新计数
        if (countElement) {
            countElement.textContent = `(${count})`;
        }
        
        // 更新按钮状态
        if (clearBtn) {
            clearBtn.disabled = count === 0;
        }
        if (predictBtn) {
            predictBtn.disabled = count === 0;
        }
        
        // 更新选中比赛列表
        if (count === 0) {
            container.innerHTML = '<div class="empty-message"><i class="fas fa-info-circle"></i><p>请在上方选择比赛</p></div>';
            return;
        }
        
        let html = '';
        selectedMatches.forEach((match, index) => {
            html += this.renderSelectedMatchCard(match, index);
        });
        
        container.innerHTML = html;
        this.bindSelectedMatchEvents();
    }

    renderSelectedMatchCard(match, index) {
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
                
                <div class="match-actions">
                    <button class="remove-selected-match-btn" data-match-id="${match.match_id}">
                        <i class="fas fa-times"></i> 移除
                    </button>
                </div>
            </div>
        `;
    }

    bindSelectedMatchEvents() {
        // 移除选中比赛按钮
        document.querySelectorAll('.remove-selected-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = btn.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId); // 重用现有逻辑
            });
        });
    }

    getSelectedMatches() {
        return this.matches.filter(match => this.selectedMatches.has(match.match_id));
    }

    clearSelection() {
        this.selectedMatches.clear();
        document.querySelectorAll('.lottery-match-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelectorAll('.select-match-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.innerHTML = '<i class="fas fa-square"></i> 选择比赛';
        });
        this.updateSelectionInfo();
        this.updateSelectedMatchesDisplay();
    }

    showMessage(message, type = 'info') {
        // 简单的消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // 开始彩票AI预测
    async startLotteryAIPrediction() {
        const selectedMatches = this.getSelectedMatches();
        
        if (selectedMatches.length === 0) {
            this.showMessage('请先选择比赛', 'error');
            return;
        }

        console.log('开始彩票AI预测，选中比赛:', selectedMatches.length);
        
        try {
            // 显示加载状态
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
            }

            // 转换数据格式为AI预测需要的格式
            const aiMatches = selectedMatches.map(match => ({
                match_id: match.match_id,
                home_team: match.home_team,
                away_team: match.away_team,
                league_name: match.league_name,
                home_odds: parseFloat(match.odds.hhad.h),
                draw_odds: parseFloat(match.odds.hhad.d),
                away_odds: parseFloat(match.odds.hhad.a),
                source: 'lottery'
            }));

            // 直接调用Gemini API进行预测
            const predictions = [];
            for (const match of aiMatches) {
                try {
                    console.log(`开始预测彩票比赛: ${match.home_team} vs ${match.away_team}`);
                    
                    // 使用AI预测管理器的方法
                    if (window.aiPredictionManager) {
                        const prediction = await window.aiPredictionManager.predictMatchWithGemini(match);
                        if (prediction) {
                            predictions.push(prediction);
                            console.log(`彩票比赛预测成功: ${match.home_team} vs ${match.away_team}`);
                        }
                    } else {
                        throw new Error('AI预测管理器未初始化');
                    }
                } catch (error) {
                    console.error(`预测彩票比赛失败 ${match.home_team} vs ${match.away_team}:`, error);
                    // 继续处理其他比赛
                }
            }

            if (predictions.length > 0) {
                console.log('彩票AI预测成功:', predictions);
                this.displayAIPredictionResults(predictions);
                
                // 保存预测结果到数据库
                this.savePredictionsToDatabase(predictions);
            } else {
                throw new Error('所有彩票比赛预测都失败了，请检查网络连接或API配置');
            }

        } catch (error) {
            console.error('AI预测错误:', error);
            this.showMessage('AI预测失败: ' + error.message, 'error');
        } finally {
            // 隐藏加载状态
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    // 显示AI预测结果
    displayAIPredictionResults(predictions) {
        // 显示结果区域
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            
            // 显示AI分析标签
            const aiTab = document.querySelector('[data-tab="ai-analysis"]');
            if (aiTab) {
                aiTab.classList.remove('hidden');
                aiTab.click(); // 切换到AI分析标签
            }
            
            // 渲染AI结果
            const aiResultsContainer = document.getElementById('ai-analysis-results');
            if (aiResultsContainer) {
                let html = '<div class="simple-ai-results">';
                
                predictions.forEach(prediction => {
                    html += `
                        <div class="ai-result-card lottery-selected-card">
                            <div class="match-header">
                                <div class="match-title">
                                    <span>${prediction.home_team}</span>
                                    <span> vs </span>
                                    <span>${prediction.away_team}</span>
                                </div>
                                <div class="league-info">${prediction.league_name}</div>
                            </div>
                            
                            <div class="odds-display">
                                <div class="odds-item">主胜: ${prediction.odds.home}</div>
                                <div class="odds-item">平局: ${prediction.odds.draw}</div>
                                <div class="odds-item">客胜: ${prediction.odds.away}</div>
                            </div>
                            
                            <div class="ai-analysis-content">
                                <h4><i class="fas fa-brain"></i> AI智能分析</h4>
                                <div class="analysis-text">${this.formatAnalysisText(prediction.ai_analysis)}</div>
                            </div>
                            
                            <div class="match-source">
                                <span class="source-tag">体彩数据</span>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                aiResultsContainer.innerHTML = html;
            }
        }
        
        this.showMessage(`AI预测完成，分析了 ${predictions.length} 场比赛`, 'success');
    }

    // 格式化AI分析文本（与AI模式保持一致）
    formatAnalysisText(text) {
        if (!text) return '暂无分析';
        
        // 处理markdown格式并转换为HTML
        let formatted = text
            // 处理标题
            .replace(/\*\*([^*]+)\*\*/g, '<h5>$1</h5>')
            // 处理粗体
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
            // 处理列表项
            .replace(/^\s*[\*\-]\s+(.+)$/gm, '<li>$1</li>')
            // 处理数字列表
            .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
            // 处理换行
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // 包装在段落中
        if (!formatted.includes('<p>')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        // 处理列表包装
        formatted = formatted.replace(/(<li>.*?<\/li>)/gs, function(match) {
            if (!match.includes('<ul>')) {
                return '<ul>' + match + '</ul>';
            }
            return match;
        });
        
        // 处理连续的列表项
        formatted = formatted.replace(/(<\/li>)\s*(<li>)/g, '$1$2');
        formatted = formatted.replace(/(<\/ul>)\s*(<ul>)/g, '');
        
        return formatted;
    }

    // 显示强制刷新模态框
    showForceRefreshModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> 更新比赛数据</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p><strong>当前数据来源：</strong>数据库缓存</p>
                    <p><strong>如需获取最新数据，请在服务器上运行以下命令：</strong></p>
                    <div class="code-block">
                        <code>python scripts/sync_daily_matches.py --days 7</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('python scripts/sync_daily_matches.py --days 7')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <p class="help-text">
                        <i class="fas fa-info-circle"></i>
                        该命令将从体彩官网获取最新7天的比赛数据并更新数据库
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                    <button class="btn primary-btn" onclick="this.closest('.modal-overlay').remove(); lotteryManager.refreshMatches();">
                        <i class="fas fa-sync"></i> 刷新当前数据
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 点击背景关闭模态框
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 保存预测结果到数据库
    async savePredictionsToDatabase(predictions) {
        try {
            for (const prediction of predictions) {
                // 提取预测结果和信心指数
                const aiAnalysis = prediction.ai_analysis || '';
                let predictedResult = '未知';
                let confidence = 5.0;

                // 从AI分析中提取预测结果
                if (aiAnalysis.includes('主胜') || aiAnalysis.includes('主队')) {
                    predictedResult = '主胜';
                } else if (aiAnalysis.includes('客胜') || aiAnalysis.includes('客队')) {
                    predictedResult = '客胜';
                } else if (aiAnalysis.includes('平局') || aiAnalysis.includes('平')) {
                    predictedResult = '平局';
                }

                // 从AI分析中提取信心指数
                const confidenceMatch = aiAnalysis.match(/信心指数[：:]?\s*(\d+(?:\.\d+)?)/);
                if (confidenceMatch) {
                    confidence = parseFloat(confidenceMatch[1]);
                }

                const saveData = {
                    mode: 'lottery',
                    match_data: prediction,
                    prediction_result: predictedResult,
                    confidence: confidence,
                    ai_analysis: aiAnalysis
                };

                // 发送到后端保存
                const response = await fetch('/api/save-prediction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(saveData)
                });

                if (response.ok) {
                    console.log(`✅ 彩票预测结果已保存: ${prediction.home_team} vs ${prediction.away_team}`);
                } else {
                    console.warn(`⚠️ 彩票预测结果保存失败: ${prediction.home_team} vs ${prediction.away_team}`);
                }
            }
        } catch (error) {
            console.error('保存彩票预测结果到数据库失败:', error);
        }
    }

    // 折叠/展开功能
    toggleMatchesDisplay() {
        this.isCollapsed = !this.isCollapsed;
        this.applyCollapseState();
        this.updateMatchesCount(this.matches.length, this.getVisibleMatchesCount());
        this.updateToggleButton();
    }

    applyCollapseState() {
        const cards = document.querySelectorAll('#lottery-matches .lottery-match-card');
        const container = document.getElementById('lottery-matches');
        
        // 清除现有的折叠指示器
        const existingOverlay = container.querySelector('.matches-fade-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        cards.forEach((card, index) => {
            if (this.isCollapsed && index >= this.defaultShowCount) {
                card.classList.add('hidden-match');
            } else {
                card.classList.remove('hidden-match');
            }
        });
        
        // 如果是折叠状态且有超过10场比赛，添加渐变指示器
        if (this.isCollapsed && cards.length > this.defaultShowCount) {
            const overlay = document.createElement('div');
            overlay.className = 'matches-fade-overlay';
            overlay.innerHTML = `还有 ${cards.length - this.defaultShowCount} 场比赛...`;
            container.appendChild(overlay);
        }
    }

    getVisibleMatchesCount() {
        if (this.isCollapsed) {
            return Math.min(this.matches.length, this.defaultShowCount);
        }
        return this.matches.length;
    }

    updateMatchesCount(total, visible) {
        const totalElement = document.getElementById('total-matches-count');
        const visibleElement = document.getElementById('visible-matches-count');
        
        if (totalElement) totalElement.textContent = total;
        if (visibleElement) visibleElement.textContent = visible;
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('toggle-matches-btn');
        if (!toggleBtn) return;

        if (this.isCollapsed) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> 显示全部';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> 收起';
        }
    }

    // 最佳串关推荐
    async generateBestParlay() {
        const selectedMatchesArray = Array.from(this.selectedMatches).map(id => 
            this.matches.find(match => match.match_id === id)
        ).filter(Boolean);

        if (selectedMatchesArray.length < 2) {
            this.showMessage('请至少选择2场比赛才能生成串关推荐', 'warning');
            return;
        }

        const parlaySection = document.getElementById('best-parlay-recommendation');
        const parlayContent = document.getElementById('parlay-content');
        const generateBtn = document.getElementById('generate-parlay-btn');
        
        if (!parlaySection || !parlayContent) return;

        // 显示推荐区域
        parlaySection.classList.remove('hidden');
        
        // 显示加载状态
        parlayContent.innerHTML = '<div class="parlay-loading"><i class="fas fa-spinner fa-spin"></i> AI正在分析最佳组合...</div>';
        
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中';
        }

        try {
            // 构建AI分析提示词
            const prompt = this.buildParlayPrompt(selectedMatchesArray);
            
            // 调用AI分析
            const aiResponse = await this.callGeminiForParlay(prompt);
            
            // 显示推荐结果
            this.displayParlayRecommendation(aiResponse, selectedMatchesArray);
            
        } catch (error) {
            console.error('生成串关推荐失败:', error);
            parlayContent.innerHTML = `
                <div class="parlay-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>AI分析失败: ${error.message}</p>
                    <button class="btn compact-btn" onclick="lotteryManager.generateBestParlay()">
                        <i class="fas fa-refresh"></i> 重试
                    </button>
                </div>
            `;
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> 重新生成';
            }
        }
    }

    buildParlayPrompt(matches) {
        let prompt = `作为专业的足球分析师，请为以下${matches.length}场比赛提供最佳串关推荐：\n\n`;
        
        matches.forEach((match, index) => {
            const odds = match.odds?.hhad || {};
            prompt += `比赛${index + 1}: ${match.home_team} vs ${match.away_team}\n`;
            prompt += `联赛: ${match.league_name}\n`;
            prompt += `时间: ${match.match_time}\n`;
            prompt += `赔率: 主胜${odds.h || 'N/A'} 平局${odds.d || 'N/A'} 客胜${odds.a || 'N/A'}\n\n`;
        });

        prompt += `请提供：
1. **推荐串关组合**: 每场比赛的推荐结果(主胜/平局/客胜)
2. **组合赔率**: 计算总赔率
3. **信心指数**: 1-10分评分
4. **分析理由**: 每场比赛的简要分析(球队实力、近期状态、历史对战等)
5. **风险评估**: 指出潜在风险点

要求：
- 格式简洁明了
- 突出重点信息
- 控制在300字以内`;

        return prompt;
    }

    async callGeminiForParlay(prompt) {
        // 获取API密钥
        const apiKey = window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('未配置Gemini API密钥');
        }

        const model = window.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API调用失败: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('AI响应格式异常');
        }

        return data.candidates[0].content.parts[0].text;
    }

    displayParlayRecommendation(aiResponse, matches) {
        const parlayContent = document.getElementById('parlay-content');
        if (!parlayContent) return;

        // 计算总赔率 (简单估算)
        let totalOdds = 1;
        matches.forEach(match => {
            const odds = match.odds?.hhad || {};
            const avgOdds = (parseFloat(odds.h || 0) + parseFloat(odds.d || 0) + parseFloat(odds.a || 0)) / 3;
            totalOdds *= (avgOdds || 2.5);
        });

        parlayContent.innerHTML = `
            <div class="parlay-recommendation">
                <div class="parlay-stats">
                    <div class="parlay-stat">
                        <span class="parlay-stat-value">${matches.length}</span>
                        <span class="parlay-stat-label">场比赛</span>
                    </div>
                    <div class="parlay-stat">
                        <span class="parlay-stat-value">${totalOdds.toFixed(2)}</span>
                        <span class="parlay-stat-label">预估赔率</span>
                    </div>
                </div>
                
                <div class="parlay-analysis">
                    ${this.formatAnalysisText(aiResponse)}
                </div>
            </div>
        `;
    }

    // 检查是否显示串关推荐
    checkParlayRecommendation() {
        const parlaySection = document.getElementById('best-parlay-recommendation');
        if (!parlaySection) return;

        if (this.selectedMatches.size >= 2) {
            parlaySection.classList.remove('hidden');
        } else {
            parlaySection.classList.add('hidden');
        }
    }
}

// 全局实例
let lotteryManager = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    lotteryManager = new LotteryManager();
    window.lotteryManager = lotteryManager; // 暴露为全局变量
});

// 导出给其他模块使用
window.LotteryManager = LotteryManager; 
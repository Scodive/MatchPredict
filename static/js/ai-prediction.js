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
        this.updateAICartDisplay();
        this.clearAIForm();
        
        // 更新按钮状态和计数
        this.updateAIMatchCount();
        this.updateAIPredictButtonText();

        this.showMessage('比赛已添加到购物车', 'success');
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
        // 使用新的购物车显示方法
        this.updateAICartDisplay();
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

            // 直接调用Gemini API进行预测
            const predictions = [];
            for (const match of matchesToPredict) {
                try {
                    console.log(`开始预测比赛: ${match.home_team} vs ${match.away_team}`);
                    const prediction = await this.predictMatchWithGemini(match);
                    if (prediction) {
                        predictions.push(prediction);
                        console.log(`比赛预测成功: ${match.home_team} vs ${match.away_team}`);
                    }
                } catch (error) {
                    console.error(`预测比赛失败 ${match.home_team} vs ${match.away_team}:`, error);
                    // 继续处理其他比赛，不中断整个流程
                }
            }

            if (predictions.length > 0) {
                this.aiResults = { predictions: predictions };
                this.displayAIResults();
                this.showMessage(`AI预测完成，成功分析了 ${predictions.length}/${matchesToPredict.length} 场比赛`, 'success');
                
                // 显示结果区域并切换到AI分析标签页
                const resultsSection = document.getElementById('results-section');
                if (resultsSection) {
                    resultsSection.classList.remove('hidden');
                }
                this.switchTab('ai-analysis');
            } else {
                throw new Error('所有比赛预测都失败了，请检查网络连接或API配置');
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

    // 直接调用Gemini API预测单场比赛
    async predictMatchWithGemini(match) {
        // 从环境变量或配置中获取API密钥
        const GEMINI_API_KEY = this.getGeminiApiKey();
        if (!GEMINI_API_KEY) {
            throw new Error('未找到GEMINI_API_KEY。请确保在Vercel中配置了环境变量，或在控制台中设置: localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")');
        }

        const GEMINI_MODEL = window.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

        // 构建详细的提示词
        const prompt = this.buildPrompt(match);

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2000
            }
        };

        try {
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API调用失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0) {
                const aiAnalysis = data.candidates[0].content.parts[0].text;
                
                return {
                    match_id: match.match_id || `match_${Date.now()}`,
                    home_team: match.home_team,
                    away_team: match.away_team,
                    league_name: match.league_name || '未知联赛',
                    ai_analysis: aiAnalysis,
                    odds: {
                        home: match.home_odds || match.odds?.hhad?.h || '2.00',
                        draw: match.draw_odds || match.odds?.hhad?.d || '3.20',
                        away: match.away_odds || match.odds?.hhad?.a || '2.80'
                    }
                };
            } else {
                throw new Error('Gemini API返回数据格式错误');
            }

        } catch (error) {
            console.error('Gemini API调用失败:', error);
            throw error;
        }
    }

    // 构建提示词
    buildPrompt(match) {
        const home_team = match.home_team || '主队';
        const away_team = match.away_team || '客队';
        const league_name = match.league_name || '未知联赛';
        
        // 获取赔率
        let home_odds, draw_odds, away_odds;
        if (match.odds && match.odds.hhad) {
            home_odds = match.odds.hhad.h;
            draw_odds = match.odds.hhad.d;
            away_odds = match.odds.hhad.a;
        } else {
            home_odds = match.home_odds || '2.00';
            draw_odds = match.draw_odds || '3.20';
            away_odds = match.away_odds || '2.80';
        }

        return `请详细分析这场足球比赛并给出完整预测：

比赛：${home_team} vs ${away_team}
联赛：${league_name}
赔率：主胜 ${home_odds} | 平局 ${draw_odds} | 客胜 ${away_odds}

请按以下格式提供详细预测：

**一、比赛分析**
（考虑两队实力、近期状态、历史对战、主客场优势等因素）

**二、胜平负预测**
推荐结果：[主胜/平局/客胜]
推荐理由：
信心指数：[1-10]

**三、比分预测**
最可能比分：
其他可能比分：

**四、半场胜平负预测**
半场结果：[主胜/平局/客胜]
全场结果：[主胜/平局/客胜]
半全场组合：

**五、进球数预测**
总进球数：[0-1球/2-3球/4球以上]
主队进球：
客队进球：

**六、其他分析**
- 大小球分析
- 亚盘分析
- 风险提示

请用中文回答，保持专业分析水准。`;
    }

    // 获取Gemini API密钥
    getGeminiApiKey() {
        // 首先尝试从环境变量获取 (Vercel配置)
        if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
            return process.env.GEMINI_API_KEY;
        }
        
        // 然后尝试从全局变量获取 (环境变量注入)
        if (window.GEMINI_API_KEY) {
            return window.GEMINI_API_KEY;
        }
        
        // 最后尝试从localStorage获取 (用户手动设置)
        const localKey = localStorage.getItem('GEMINI_API_KEY');
        if (localKey) {
            return localKey;
        }
        
        // 如果都没有，提示用户设置
        console.warn('未找到GEMINI_API_KEY，请通过以下方式之一配置：');
        console.warn('1. 在Vercel中配置环境变量 GEMINI_API_KEY');
        console.warn('2. 在控制台中设置: localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")');
        console.warn('3. 定义全局变量: window.GEMINI_API_KEY = "your_api_key_here"');
        
        return null;
    }

    // 设置API密钥的便捷方法
    setGeminiApiKey(apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
        console.log('GEMINI_API_KEY已保存到localStorage');
    }

    // 更新AI购物车显示
    updateAICartDisplay() {
        const container = document.getElementById('ai-selected-matches');
        if (!container) return;

        if (this.aiMatches.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>购物车为空</p>
                    <small>请在左侧添加比赛</small>
                </div>
            `;
        } else {
            let html = '';
            this.aiMatches.forEach((match, index) => {
                html += this.renderAICartItem(match, index);
            });
            container.innerHTML = html;
            
            // 绑定删除按钮事件
            this.bindAICartEvents();
        }
        
        // 更新按钮状态
        const clearBtn = document.getElementById('clear-ai-selection-btn');
        const predictBtn = document.getElementById('ai-predict-btn');
        
        if (clearBtn) {
            clearBtn.disabled = this.aiMatches.length === 0;
        }
        if (predictBtn) {
            predictBtn.disabled = this.aiMatches.length === 0;
        }
    }

    // 渲染单个购物车项目
    renderAICartItem(match, index) {
        const odds = match.odds.hhad;
        return `
            <div class="ai-selected-card" data-index="${index}">
                <div class="match-header">
                    <div class="match-title">${match.home_team} vs ${match.away_team}</div>
                    <button class="remove-btn" onclick="window.aiPredictionManager.removeAIMatch(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="match-info">
                    <span><i class="fas fa-trophy"></i> ${match.league_name}</span>
                    <span><i class="fas fa-clock"></i> 待预测</span>
                </div>
                <div class="odds-info">
                    <span>主胜: ${odds.h}</span>
                    <span>平局: ${odds.d}</span>
                    <span>客胜: ${odds.a}</span>
                </div>
            </div>
        `;
    }

    // 绑定购物车事件
    bindAICartEvents() {
        // 清空购物车按钮
        const clearBtn = document.getElementById('clear-ai-selection-btn');
        if (clearBtn && !clearBtn.hasAttribute('data-bound')) {
            clearBtn.addEventListener('click', () => {
                this.clearAISelection();
            });
            clearBtn.setAttribute('data-bound', 'true');
        }
    }

    // 移除AI比赛
    removeAIMatch(index) {
        if (index >= 0 && index < this.aiMatches.length) {
            const match = this.aiMatches[index];
            this.aiMatches.splice(index, 1);
            this.updateAICartDisplay();
            this.updateAIMatchCount();
            this.updateAIPredictButtonText();
            this.showMessage(`已移除 ${match.home_team} vs ${match.away_team}`, 'info');
        }
    }

    // 清空AI选择
    clearAISelection() {
        this.aiMatches = [];
        this.updateAICartDisplay();
        this.updateAIMatchCount();
        this.updateAIPredictButtonText();
        this.showMessage('购物车已清空', 'info');
    }

    // 更新AI比赛计数
    updateAIMatchCount() {
        const countElement = document.getElementById('ai-match-count');
        if (countElement) {
            countElement.textContent = `(${this.aiMatches.length})`;
        }
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
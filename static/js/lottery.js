/**
 * 中国体育彩票数据处理模块
 */

class LotteryManager {
    constructor() {
        this.matches = [];
        this.selectedMatches = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 刷新比赛数据按钮
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshMatches());
        }

        // 天数筛选
        const daysFilter = document.getElementById('days-filter');
        if (daysFilter) {
            daysFilter.addEventListener('change', (e) => {
                this.refreshMatches(parseInt(e.target.value));
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

            // 调用API获取比赛数据
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
                this.showMessage(`成功获取 ${data.count || this.matches.length} 场比赛`, 'success');
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
            return;
        }

        // 按联赛分组
        const matchesByLeague = this.groupMatchesByLeague(this.matches);
        
        let html = '';
        for (const [leagueName, matches] of Object.entries(matchesByLeague)) {
            html += this.renderLeagueSection(leagueName, matches);
        }

        container.innerHTML = html;
        
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

    renderLeagueSection(leagueName, matches) {
        let html = `
            <div class="league-section">
                <h3 class="league-title">
                    <i class="fas fa-futbol"></i> ${leagueName} 
                    <span class="match-count">(${matches.length}场)</span>
                </h3>
                <div class="league-matches">
        `;

        matches.forEach(match => {
            html += this.renderMatchCard(match);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    renderMatchCard(match) {
        const isSelected = this.selectedMatches.has(match.match_id);
        const matchTime = this.formatMatchTime(match.match_time, match.match_date);
        
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
            'CANCELLED': '已取消'
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
            // 从全局matches数组中移除
            this.removeFromGlobalMatches(matchId);
        } else {
            // 选择比赛
            this.selectedMatches.add(matchId);
            // 添加到全局matches数组
            this.addToGlobalMatches(match);
        }

        // 更新显示
        this.updateMatchCardSelection(matchId);
        this.updateSelectionInfo();
        
        // 如果当前是体彩模式，立即更新AI模式的显示
        if (window.aiPredictionManager && window.aiPredictionManager.currentMode === 'lottery') {
            window.aiPredictionManager.updateModeSpecificDisplay('lottery');
            window.aiPredictionManager.updateAIPredictButtonText();
        }
    }

    addToGlobalMatches(match) {
        // 检查全局matches数组是否存在
        if (typeof window.matches === 'undefined') {
            window.matches = [];
        }

        // 转换体彩数据格式为全局格式
        const globalMatch = this.convertToGlobalFormat(match);
        
        // 检查是否已存在（避免重复添加）
        const existingIndex = window.matches.findIndex(m => m.id === globalMatch.id);
        if (existingIndex === -1) {
            window.matches.push(globalMatch);
            console.log('添加比赛到全局:', globalMatch);
        }
    }

    removeFromGlobalMatches(matchId) {
        if (typeof window.matches !== 'undefined') {
            const index = window.matches.findIndex(m => m.id === matchId);
            if (index !== -1) {
                window.matches.splice(index, 1);
                console.log('从全局移除比赛:', matchId);
            }
        }
    }

    convertToGlobalFormat(match) {
        // 从体彩格式转换为全局比赛格式
        const odds = match.odds || {};
        const hhadOdds = odds.hhad || {};
        
        return {
            id: match.match_id,
            league_code: this.getLeagueCode(match.league_name),
            leagueName: match.league_name,
            home_team: match.home_team,
            away_team: match.away_team,
            home_odds: parseFloat(hhadOdds.h) || 2.0,
            draw_odds: parseFloat(hhadOdds.d) || 3.2,
            away_odds: parseFloat(hhadOdds.a) || 2.8,
            match_time: match.match_time,
            source: 'lottery' // 标记来源
        };
    }

    getLeagueCode(leagueName) {
        // 将联赛名称映射为代码
        const leagueMap = {
            '英超': 'PL',
            '西甲': 'PD', 
            '德甲': 'BL1',
            '意甲': 'SA',
            '法甲': 'FL1',
            '中超': 'CSL',
            '中超联赛': 'CSL'
        };
        return leagueMap[leagueName] || 'OTHER';
    }

    updateGlobalMatchesDisplay() {
        // 更新全局比赛显示
        if (typeof window.updateMatchesUI === 'function') {
            window.updateMatchesUI();
        }
        
        // 更新主界面的比赛计数
        const matchCountSpan = document.getElementById('match-count');
        if (matchCountSpan && typeof window.matches !== 'undefined') {
            matchCountSpan.textContent = `(${window.matches.length})`;
        }
        
        // 更新主界面的预测按钮状态
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn && typeof window.matches !== 'undefined') {
            predictBtn.disabled = window.matches.length === 0;
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
}

// 全局实例
let lotteryManager = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    lotteryManager = new LotteryManager();
});

// 导出给其他模块使用
window.LotteryManager = LotteryManager; 
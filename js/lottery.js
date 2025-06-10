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
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        const container = document.getElementById('lottery-matches');
        
        try {
            // 显示加载状态
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> 获取中...';
            }
            
            container.innerHTML = '<div class="loading-message"><i class="fas fa-spin fa-spinner"></i> 正在获取最新比赛数据...</div>';

            // 调用API获取比赛数据
            const response = await fetch(`/api/lottery/matches?days=${days}`);
            const data = await response.json();

            if (data.success) {
                this.matches = data.matches;
                this.renderMatches();
                this.showMessage(`成功获取 ${data.count} 场比赛`, 'success');
            } else {
                throw new Error(data.message || '获取比赛数据失败');
            }

        } catch (error) {
            console.error('获取彩票数据失败:', error);
            container.innerHTML = '<div class="error-message">获取比赛数据失败，请稍后重试</div>';
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
            this.selectedMatches.delete(matchId);
        } else {
            this.selectedMatches.add(matchId);
        }

        // 更新显示
        this.updateMatchCardSelection(matchId);
        this.updateSelectionInfo();
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
        
        // 更新按钮状态
        const predictBtn = document.getElementById('ai-predict-btn');
        if (predictBtn) {
            if (count > 0) {
                predictBtn.disabled = false;
                predictBtn.innerHTML = `<i class="fas fa-brain"></i> AI预测选中的 ${count} 场比赛`;
            } else {
                predictBtn.disabled = true;
                predictBtn.innerHTML = '<i class="fas fa-brain"></i> AI智能预测';
            }
        }

        // 更新匹配数计数
        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${count})`;
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
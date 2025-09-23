/**
 * 用户认证管理
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeEventListeners();
        this.checkLoginStatus();
    }

    initializeEventListeners() {
        // 登录按钮
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // 注册按钮
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.showRegisterModal());
        }

        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // 确保DOM完全加载后再绑定表单事件
        document.addEventListener('DOMContentLoaded', () => {
            // 登录表单
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
                console.log('✅ 登录表单事件监听器绑定成功');
            } else {
                console.warn('❌ 未找到登录表单 (login-form)');
            }

            // 注册表单
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.addEventListener('submit', (e) => this.handleRegister(e));
                console.log('✅ 注册表单事件监听器绑定成功');
            } else {
                console.warn('❌ 未找到注册表单 (register-form)');
            }
        });
        
        // 点击背景关闭弹窗
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    async checkLoginStatus() {
        try {
            const response = await fetch('/api/user/info', { credentials: 'include' });
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.currentUser = data.user;
                console.log('✅ 用户已登录:', this.currentUser);
                this.updateUserInterface();
                this.enableAllPredictionButtons();
                return;
            } else {
                console.log('ℹ️ 用户未登录:', data.message);
            }
        } catch (error) {
            console.log('⚠️ 检查登录状态失败:', error);
        }
        
        // 未登录时禁用所有预测按钮并更新界面
        this.currentUser = null;
        this.updateUserInterface();
        this.disableAllPredictionButtons();
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('login-username').focus();
        }
    }

    showRegisterModal() {
        const modal = document.getElementById('register-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('register-username').focus();
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
            submitBtn.disabled = true;

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.showMessage('登录成功！', 'success');
                this.closeModal('login-modal');
                this.updateUserInterface();
                this.enableAllPredictionButtons();
                
                // 重新加载页面以更新服务器端状态
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showMessage(data.message || '登录失败', 'error');
            }

        } catch (error) {
            console.error('登录失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
            submitBtn.disabled = false;
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');

        // 验证密码匹配
        if (password !== confirmPassword) {
            this.showMessage('两次输入的密码不一致', 'error');
            return;
        }

        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: password
        };

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';
            submitBtn.disabled = true;

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(registerData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('注册成功！请登录', 'success');
                this.closeModal('register-modal');
                
                // 自动切换到登录弹窗
                setTimeout(() => {
                    this.showLoginModal();
                    document.getElementById('login-username').value = registerData.username;
                }, 1000);
            } else {
                this.showMessage(data.message || '注册失败', 'error');
            }

        } catch (error) {
            console.error('注册失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> 注册';
            submitBtn.disabled = false;
        }
    }

    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = null;
                this.showMessage('已安全退出', 'success');
                
                // 重新加载页面
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('退出失败:', error);
            this.showMessage('退出失败，请稍后重试', 'error');
        }
    }

    updateUserInterface() {
        // 这个方法在页面重新加载时由服务器端模板更新
        // 客户端主要负责更新剩余次数
        this.updatePredictionCount();
    }

    async updatePredictionCount() {
        try {
            const response = await fetch('/api/user/can-predict', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const remainingElement = document.getElementById('predictions-remaining');
                    if (remainingElement && data.user_type === 'free') {
                        remainingElement.textContent = data.remaining;
                    }
                }
            }
        } catch (error) {
            console.log('更新预测次数失败:', error);
        }
    }

    async checkCanPredict() {
        try {
            const response = await fetch('/api/user/can-predict', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                return data.can_predict;
            }
            return false;
        } catch (error) {
            console.error('检查预测权限失败:', error);
            return false;
        }
    }

    async requireLogin() {
        if (!this.currentUser) {
            this.showMessage('请先登录才能使用预测功能', 'warning');
            this.showLoginModal();
            return false;
        }
        return true;
    }

    async checkPredictionLimit() {
        // 检查是否需要登录
        if (!this.currentUser) {
            this.showMessage('请先登录后使用预测功能', 'warning');
            this.showLoginModal();
            return false;
        }
        
        const canPredict = await this.checkCanPredict();
        if (!canPredict) {
            this.showMessage('今日免费预测次数已用完，请升级到会员版本', 'warning');
            return false;
        }
        return true;
    }

    // 禁用所有预测按钮
    disableAllPredictionButtons() {
        const buttons = [
            'classic-predict-btn',
            'lottery-ai-predict-btn', 
            'ai-prediction-btn',
            'generate-parlay-btn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.add('disabled');
                btn.title = '请先登录';
                btn.dataset.loginRequired = 'true';
            }
        });
    }

    // 启用所有预测按钮  
    enableAllPredictionButtons() {
        const buttons = [
            'classic-predict-btn',
            'lottery-ai-predict-btn',
            'ai-prediction-btn', 
            'generate-parlay-btn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.remove('disabled');
                btn.title = '';
                btn.dataset.loginRequired = 'false';
            }
        });
    }

    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas ${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(messageDiv);

        // 3秒后自动消失
        setTimeout(() => {
            messageDiv.classList.add('fade-out');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-times-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
}

// 弹窗相关全局函数
function closeModal(modalId) {
    authManager.closeModal(modalId);
}

function switchToRegister() {
    authManager.closeModal('login-modal');
    authManager.showRegisterModal();
}

function switchToLogin() {
    authManager.closeModal('register-modal');
    authManager.showLoginModal();
}

// 创建全局认证管理器实例
const authManager = new AuthManager();

// 暴露到全局作用域
window.authManager = authManager;

/**
 * API配置助手
 * 帮助用户配置和管理Gemini API密钥
 */

// API配置管理器
class APIConfigManager {
    constructor() {
        this.apiKey = null;
        this.loadApiKey();
    }

    // 从localStorage加载API密钥
    loadApiKey() {
        this.apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (this.apiKey) {
            console.log('✅ 已加载GEMINI_API_KEY');
        } else {
            console.warn('⚠️ 未找到GEMINI_API_KEY，请进行配置');
            this.showConfigInstructions();
        }
    }

    // 设置API密钥
    setApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('API密钥不能为空');
        }

        localStorage.setItem('GEMINI_API_KEY', apiKey);
        this.apiKey = apiKey;
        console.log('✅ GEMINI_API_KEY已保存');
        
        // 通知用户
        this.showSuccessMessage('API密钥配置成功！');
        
        return true;
    }

    // 获取API密钥
    getApiKey() {
        return this.apiKey || localStorage.getItem('GEMINI_API_KEY');
    }

    // 检查API密钥是否有效
    isConfigured() {
        const key = this.getApiKey();
        return key && key.length > 0;
    }

    // 清除API密钥
    clearApiKey() {
        localStorage.removeItem('GEMINI_API_KEY');
        this.apiKey = null;
        console.log('🗑️ API密钥已清除');
        this.showConfigInstructions();
    }

    // 显示配置说明
    showConfigInstructions() {
        const instructions = `
🔑 配置Gemini API密钥：

方法1 - 使用助手函数：
setGeminiApiKey("your_api_key_here")

方法2 - 直接设置：
localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")

方法3 - 使用配置管理器：
window.apiConfigManager.setApiKey("your_api_key_here")

🌟 获取API密钥：
1. 访问 https://makersuite.google.com/app/apikey
2. 创建新的API密钥
3. 复制密钥并在上面的代码中替换 "your_api_key_here"

📋 其他命令：
- 查看当前配置：checkGeminiConfig()
- 清除配置：clearGeminiApiKey()
- 测试API：testGeminiAPI()
        `;
        
        console.log(instructions);
    }

    // 显示当前配置状态
    showStatus() {
        const key = this.getApiKey();
        
        if (key) {
            const maskedKey = key.substring(0, 8) + '...' + key.substring(key.length - 4);
            console.log('✅ API密钥已配置:', maskedKey);
            console.log('🔧 API状态: 就绪');
        } else {
            console.log('❌ API密钥未配置');
            this.showConfigInstructions();
        }
    }

    // 测试API连接
    async testAPI() {
        const apiKey = this.getApiKey();
        
        if (!apiKey) {
            console.error('❌ 请先配置API密钥');
            this.showConfigInstructions();
            return false;
        }

        try {
            console.log('🧪 测试Gemini API连接...');
            
            const testMatch = {
                home_team: '测试主队',
                away_team: '测试客队',
                league_name: '测试联赛',
                home_odds: '2.00',
                draw_odds: '3.20',
                away_odds: '2.80'
            };

            if (window.aiPredictionManager) {
                await window.aiPredictionManager.predictMatchWithGemini(testMatch);
                console.log('✅ API测试成功！');
                this.showSuccessMessage('API连接测试成功！');
                return true;
            } else {
                throw new Error('AI预测管理器未初始化');
            }
            
        } catch (error) {
            console.error('❌ API测试失败:', error.message);
            this.showErrorMessage('API测试失败: ' + error.message);
            return false;
        }
    }

    // 显示成功消息
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    // 显示错误消息
    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `api-config-message ${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 300px;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // 自动移除
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// 创建全局实例
window.apiConfigManager = new APIConfigManager();

// 便捷函数
window.setGeminiApiKey = function(apiKey) {
    return window.apiConfigManager.setApiKey(apiKey);
};

window.checkGeminiConfig = function() {
    return window.apiConfigManager.showStatus();
};

window.clearGeminiApiKey = function() {
    return window.apiConfigManager.clearApiKey();
};

window.testGeminiAPI = function() {
    return window.apiConfigManager.testAPI();
};

// 页面加载完成后显示配置状态  
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // 检查是否通过环境变量配置了API密钥
        const hasEnvKey = window.GEMINI_API_KEY || 
                          (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY);
        
        if (hasEnvKey) {
            console.log('✅ 检测到环境变量中的API密钥，AI功能已就绪');
        } else if (!window.apiConfigManager.isConfigured()) {
            console.log('💡 AI功能需要配置Gemini API密钥才能使用');
            window.apiConfigManager.showConfigInstructions();
        } else {
            console.log('✅ API配置完成，AI功能已就绪');
        }
    }, 1000);
});

console.log('🚀 API配置助手已加载');

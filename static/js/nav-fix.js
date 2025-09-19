/**
 * 导航按钮修复脚本
 * 确保导航按钮正常工作
 */

// 等待页面完全加载
window.addEventListener('load', function() {
    console.log('页面完全加载，开始修复导航按钮');
    
    // 等待一小段时间确保所有脚本都已执行
    setTimeout(function() {
        setupNavigation();
    }, 200);
});

// 设置导航功能
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('找到导航按钮:', navButtons.length);
    
    // 为每个按钮绑定事件
    navButtons.forEach((btn, index) => {
        console.log(`设置按钮 ${index + 1}:`, btn.id, btn.getAttribute('data-mode'));
        
        // 移除所有可能的旧事件
        btn.onclick = null;
        btn.removeAttribute('onclick');
        
        // 添加新的点击事件
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const mode = this.getAttribute('data-mode');
            console.log('导航按钮点击:', this.id, '模式:', mode);
            
            if (mode) {
                switchToMode(mode);
            }
        });
        
        // 添加悬停效果确保按钮可交互
        btn.style.cursor = 'pointer';
    });
}

// 切换模式
function switchToMode(mode) {
    console.log('切换到模式:', mode);
    
    try {
        // 1. 更新导航按钮状态
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            console.log('激活按钮:', activeBtn.id);
        }
        
        // 2. 隐藏所有模式区域
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 3. 显示目标模式区域
        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('显示模式区域:', mode + '-mode');
        } else {
            console.error('找不到模式区域:', mode + '-mode');
        }
        
        // 4. 隐藏结果区域
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
        
        console.log('模式切换完成:', mode);
        
    } catch (error) {
        console.error('模式切换失败:', error);
    }
}

// 调试函数：显示当前状态
function debugNavigation() {
    console.log('=== 导航调试信息 ===');
    
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('导航按钮数量:', navButtons.length);
    
    navButtons.forEach((btn, index) => {
        console.log(`按钮 ${index + 1}:`, {
            id: btn.id,
            mode: btn.getAttribute('data-mode'),
            active: btn.classList.contains('active'),
            visible: !btn.hidden,
            clickable: btn.style.pointerEvents !== 'none'
        });
    });
    
    const sections = document.querySelectorAll('.match-input-section');
    console.log('模式区域数量:', sections.length);
    
    sections.forEach((section, index) => {
        console.log(`区域 ${index + 1}:`, {
            id: section.id,
            hidden: section.classList.contains('hidden'),
            visible: !section.hidden
        });
    });
}

// 暴露调试函数到全局
window.debugNavigation = debugNavigation;

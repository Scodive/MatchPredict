# 🤖 AI预测功能使用指南

## 🚀 功能说明

现在系统已经支持在JavaScript中直接调用Gemini AI API进行足球比赛预测，无需Python后端支持！

## 🔑 API密钥配置

### 步骤1：获取Gemini API密钥
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 点击 "Create API Key" 创建新的API密钥
3. 复制生成的API密钥

### 步骤2：配置API密钥

在浏览器控制台中输入以下任一命令：

```javascript
// 方法1：使用便捷函数（推荐）
setGeminiApiKey("your_api_key_here")

// 方法2：使用配置管理器
window.apiConfigManager.setApiKey("your_api_key_here")

// 方法3：直接设置localStorage
localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")
```

**注意**：请将 `your_api_key_here` 替换为你的实际API密钥

## 🛠️ 配置管理命令

### 查看配置状态
```javascript
checkGeminiConfig()
```

### 测试API连接
```javascript
testGeminiAPI()
```

### 清除配置
```javascript
clearGeminiApiKey()
```

## 📍 使用方法

### 1. AI智能模式
1. 切换到"AI智能模式"
2. 填写比赛信息（主队、客队、联赛、赔率）
3. 点击"添加AI分析比赛"
4. 点击"AI智能预测"按钮
5. 系统会直接调用Gemini API进行分析

### 2. 彩票模式AI预测
1. 切换到"彩票模式"
2. 点击"刷新数据"获取体彩比赛
3. 选择要分析的比赛（添加到购物车）
4. 点击"AI智能预测"按钮
5. 系统会对选中的比赛进行AI分析

### 3. 经典模式（待开发）
经典模式目前使用本地算法预测，未来可能集成AI功能。

## 🔧 技术实现

### API调用流程
1. **前端JavaScript** → 直接调用Gemini API
2. **提示词构建** → 专业的足球分析提示模板
3. **AI分析** → Gemini模型返回详细分析
4. **结果展示** → 格式化显示预测结果

### 核心提示词模板
系统使用专业的足球分析提示词，包含：
- 比赛基本信息分析
- 胜平负预测和推荐理由
- 比分预测
- 半场胜平负预测  
- 进球数预测
- 大小球和亚盘分析
- 风险提示

### API端点
- **Gemini API**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

## 🛡️ 安全性

- API密钥存储在浏览器的localStorage中
- 仅在前端使用，不会发送到服务器
- 可随时清除和重新配置

## 🚨 注意事项

1. **网络要求**：需要能够访问Google AI服务
2. **API配额**：请注意Gemini API的使用配额限制
3. **数据安全**：API密钥仅存储在本地浏览器中
4. **结果仅供参考**：AI预测结果仅供参考，请理性分析

## 🔍 故障排除

### 常见错误

1. **"请先配置GEMINI_API_KEY"**
   - 解决：使用 `setGeminiApiKey("your_key")` 配置API密钥

2. **"Gemini API调用失败: 403"**
   - 解决：检查API密钥是否正确，是否有调用权限

3. **"网络错误"**
   - 解决：检查网络连接，确保能访问Google服务

4. **"所有比赛预测都失败了"**
   - 解决：检查API配置，尝试 `testGeminiAPI()` 测试连接

### 调试命令

```javascript
// 查看当前配置
checkGeminiConfig()

// 测试API连接
testGeminiAPI()

// 查看控制台日志
console.log(localStorage.getItem('GEMINI_API_KEY'))
```

## 📞 支持

如有问题，请：
1. 打开浏览器开发者工具查看控制台日志
2. 使用 `testGeminiAPI()` 测试API连接
3. 检查网络连接和API密钥配置

---

🎯 **现在就开始使用AI预测功能，体验智能足球分析的强大能力！**

# 环境变量配置指南

本项目已将所有敏感信息（如API密钥）移动到环境变量中，以提高安全性。

## 必需的环境变量

### 1. GEMINI_API_KEY
- **描述**: Google Gemini API 密钥
- **必需**: 是（如果使用AI预测功能）
- **示例**: `GEMINI_API_KEY=AIza9pYAEW7e2Ewk__9TCHAD5X_G1VhCtVw`

### 2. GEMINI_MODEL
- **描述**: Gemini 模型名称
- **必需**: 否（有默认值）
- **默认值**: `gemini-2.0-flash-exp`
- **示例**: `GEMINI_MODEL=gemini-2.0-flash-exp`

## 本地开发配置

### 方法1: 使用 .env 文件
创建 `.env` 文件（已在 .gitignore 中）：
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

### 方法2: 直接设置环境变量
```bash
export GEMINI_API_KEY="your_api_key_here"
export GEMINI_MODEL="gemini-2.0-flash-exp"
```

## Vercel 部署配置

1. 登录 Vercel 控制台
2. 选择你的项目
3. 进入 "Settings" → "Environment Variables"
4. 添加以下环境变量：
   - Name: `GEMINI_API_KEY`, Value: `你的API密钥`
   - Name: `GEMINI_MODEL`, Value: `gemini-2.0-flash-exp`

## 安全注意事项

1. **永远不要**将 API 密钥提交到版本控制系统
2. **永远不要**在代码中硬编码敏感信息
3. 定期轮换 API 密钥
4. 使用最小权限原则配置 API 密钥

## 功能说明

- 如果未设置 `GEMINI_API_KEY`，AI预测功能将不可用，但经典模式和彩票模式仍然可以正常使用
- 经典模式使用本地算法，不依赖任何外部API
- 彩票模式爬取公开数据，不需要API密钥

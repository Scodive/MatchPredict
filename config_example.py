# 配置文件示例
# 请复制此文件为 config_local.py 并填入您的实际配置

# Gemini API配置  
GEMINI_API_KEY = "AIzaSyDy9pYAEW7e2Ewk__9TCHAD5X_G1VhCtVw"
GEMINI_MODEL = "gemini-2.5-flash-preview-05-20"

# Flask配置
DEBUG = True
SECRET_KEY = "your_secret_key_here"

# 中国体育彩票API配置
LOTTERY_API_BASE_URL = "https://webapi.sporttery.cn"
LOTTERY_REQUEST_TIMEOUT = 10
LOTTERY_REQUEST_DELAY = 0.5  # 请求间隔（秒）

# 日志配置
LOG_LEVEL = "INFO"
LOG_FILE = "user_predictions.log"

# 数据文件路径
DATA_PATH = "data/"
FEATURES_FILE_PATTERN = "features_{league_code}2024.csv"

# AI预测配置
AI_PREDICTION_TIMEOUT = 30  # AI预测超时时间（秒）
AI_MAX_RETRIES = 3  # AI预测最大重试次数
AI_CONFIDENCE_THRESHOLD = 0.6  # AI预测置信度阈值

# 缓存配置
CACHE_ENABLED = True
CACHE_TIMEOUT = 3600  # 缓存超时时间（秒）

# 模型配置
SUPPORTED_LEAGUES = {
    "PL": "英超",
    "PD": "西甲",
    "SA": "意甲", 
    "BL1": "德甲",
    "FL1": "法甲",
    "CL": "欧冠",
    "EL": "欧联",
    "CSL": "中超",
    "AFC": "亚冠"
}

# 预测模式配置
PREDICTION_MODES = {
    "classic": {
        "name": "经典模式",
        "description": "基于历史数据的统计分析",
        "enabled": True
    },
    "lottery": {
        "name": "彩票模式", 
        "description": "中国体育彩票实时数据",
        "enabled": True
    },
    "ai": {
        "name": "AI智能模式",
        "description": "大模型智能分析预测",
        "enabled": True
    }
}

# 投注类型配置
BET_TYPES = {
    "hhad": {
        "name": "胜平负",
        "description": "主胜、平局、客胜",
        "enabled": True
    },
    "haad": {
        "name": "让球胜平负",
        "description": "让球主胜、平局、客胜",
        "enabled": True
    },
    "crs": {
        "name": "比分",
        "description": "准确比分预测",
        "enabled": True
    },
    "ttg": {
        "name": "总进球数",
        "description": "比赛总进球数区间",
        "enabled": True
    },
    "hhft": {
        "name": "半全场",
        "description": "半场/全场结果组合",
        "enabled": True
    }
} 
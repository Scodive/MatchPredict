# 配置文件

# API密钥
FOOTBALL_DATA_API_KEY = "0a6f101f0e224b27bcdd066553355dc1"
ODDS_API_KEY = "868202382ac70e56f4f78d182d88a544"

# 数据源配置
FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4"
ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4"

# 比赛数据配置
DEFAULT_LEAGUE = "PD"  # 英超
DEFAULT_SEASON = "2024"

# 模型配置
MODEL_SAVE_PATH = "models/prediction_model.pkl"

# 数据存储路径
DATA_DIR = "data"
MATCHES_DATA_FILE = f"{DATA_DIR}/matches_data_PD2024.csv"
ODDS_DATA_FILE = f"{DATA_DIR}/odds_data_PD2024.csv"
FEATURES_DATA_FILE = f"{DATA_DIR}/features_PD2024.csv"
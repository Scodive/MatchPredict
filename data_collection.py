import os
import requests
import json
import pandas as pd
from datetime import datetime
import time
from config import *

def ensure_data_dir():
    """确保数据目录存在"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def fetch_matches_data(league_id=DEFAULT_LEAGUE, season=DEFAULT_SEASON):
    """从Football-Data.org获取比赛数据"""
    url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{league_id}/matches?season={season}"
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    
    print(f"正在获取{league_id}联赛{season}赛季的比赛数据...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        # 保存原始数据
        ensure_data_dir()
        with open(f"{DATA_DIR}/raw_matches_{league_id}_{season}.json", "w") as f:
            json.dump(data, f)
        print(f"成功获取{len(data['matches'])}场比赛数据")
        return data
    else:
        print(f"获取比赛数据失败: {response.status_code}")
        print(response.text)
        return None

def fetch_odds_data(sport="soccer"):
    """从Odds API获取赔率数据"""
    url = f"{ODDS_API_BASE_URL}/sports/{sport}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "uk,eu,us",
        "markets": "h2h,spreads,totals",
        "oddsFormat": "decimal"
    }
    
    print("正在获取最新赔率数据...")
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        # 保存原始数据
        ensure_data_dir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(f"{DATA_DIR}/raw_odds_{timestamp}.json", "w") as f:
            json.dump(data, f)
        print(f"成功获取{len(data)}场比赛的赔率数据")
        return data
    else:
        print(f"获取赔率数据失败: {response.status_code}")
        print(response.text)
        return None

def fetch_team_data(league_id=DEFAULT_LEAGUE):
    """获取球队详细信息"""
    url = f"{FOOTBALL_DATA_BASE_URL}/competitions/{league_id}/teams"
    headers = {"X-Auth-Token": FOOTBALL_DATA_API_KEY}
    
    print(f"正在获取{league_id}联赛的球队数据...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        # 保存原始数据
        ensure_data_dir()
        with open(f"{DATA_DIR}/raw_teams_{league_id}.json", "w") as f:
            json.dump(data, f)
        print(f"成功获取{len(data['teams'])}支球队数据")
        return data
    else:
        print(f"获取球队数据失败: {response.status_code}")
        print(response.text)
        return None

def collect_all_data():
    """收集所有需要的数据"""
    matches_data = fetch_matches_data()
    odds_data = fetch_odds_data()
    team_data = fetch_team_data()
    
    return {
        "matches": matches_data,
        "odds": odds_data,
        "teams": team_data
    }

if __name__ == "__main__":
    # 测试数据收集功能
    data = collect_all_data()
    print("数据收集完成")
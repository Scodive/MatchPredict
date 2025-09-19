import pandas as pd
import numpy as np
import os
from datetime import datetime
from config import *

def process_match_data(matches_data):
    """处理比赛数据"""
    if not matches_data or 'matches' not in matches_data:
        print("无效的比赛数据")
        return None
        
    processed_data = []
    
    for match in matches_data['matches']:
        match_info = {
            'match_id': match['id'],
            'home_team': match['homeTeam']['name'],
            'away_team': match['awayTeam']['name'],
            'competition': match['competition']['name'],
            'match_date': match['utcDate'],
            'status': match['status']
        }
        
        # 添加比分数据（如果比赛已结束）
        if match['status'] == 'FINISHED':
            match_info['home_score'] = match['score']['fullTime']['homeTeam'] if 'homeTeam' in match['score']['fullTime'] else match['score']['fullTime']['home']
            match_info['away_score'] = match['score']['fullTime']['awayTeam'] if 'awayTeam' in match['score']['fullTime'] else match['score']['fullTime']['away']
            
            # 半场比分
            if 'halfTime' in match['score'] and match['score']['halfTime'] is not None:
                match_info['half_time_home'] = match['score']['halfTime']['homeTeam'] if 'homeTeam' in match['score']['halfTime'] else match['score']['halfTime']['home']
                match_info['half_time_away'] = match['score']['halfTime']['awayTeam'] if 'awayTeam' in match['score']['halfTime'] else match['score']['halfTime']['away']
            else:
                match_info['half_time_home'] = None
                match_info['half_time_away'] = None
            
            # 计算比赛结果（胜平负）
            if match_info['home_score'] > match_info['away_score']:
                match_info['result'] = 'H'  # 主队胜
            elif match_info['home_score'] < match_info['away_score']:
                match_info['result'] = 'A'  # 客队胜
            else:
                match_info['result'] = 'D'  # 平局
                
            # 计算半全场结果
            if 'half_time_home' in match_info and match_info['half_time_home'] is not None:
                if match_info['half_time_home'] > match_info['half_time_away']:
                    half_result = 'H'
                elif match_info['half_time_home'] < match_info['half_time_away']:
                    half_result = 'A'
                else:
                    half_result = 'D'
                    
                match_info['half_full_result'] = f"{half_result}/{match_info['result']}"
        
        processed_data.append(match_info)
    
    df = pd.DataFrame(processed_data)
    
    # 转换日期格式
    df['match_date'] = pd.to_datetime(df['match_date'])
    
    # 保存处理后的数据
    ensure_data_dir()
    df.to_csv(MATCHES_DATA_FILE, index=False)
    print(f"处理后的比赛数据已保存至 {MATCHES_DATA_FILE}")
    
    return df

def process_odds_data(odds_data):
    """处理赔率数据"""
    if not odds_data:
        print("无效的赔率数据")
        return None
        
    processed_data = []
    
    for match in odds_data:
        # 基本比赛信息
        match_info = {
            'match_id': match['id'],
            'home_team': match['home_team'],
            'away_team': match['away_team'],
            'commence_time': match['commence_time'],
            'sport': match['sport_key']
        }
        
        # 处理各个博彩公司的赔率
        for bookmaker in match['bookmakers']:
            bookmaker_name = bookmaker['key']
            
            for market in bookmaker['markets']:
                market_type = market['key']
                
                for outcome in market['outcomes']:
                    outcome_name = outcome['name']
                    price = outcome['price']
                    
                    # 创建赔率记录
                    odds_record = match_info.copy()
                    odds_record['bookmaker'] = bookmaker_name
                    odds_record['market'] = market_type
                    odds_record['outcome'] = outcome_name
                    odds_record['price'] = price
                    
                    processed_data.append(odds_record)
    
    df = pd.DataFrame(processed_data)
    
    # 转换日期格式
    df['commence_time'] = pd.to_datetime(df['commence_time'])
    
    # 保存处理后的数据
    ensure_data_dir()
    df.to_csv(ODDS_DATA_FILE, index=False)
    print(f"处理后的赔率数据已保存至 {ODDS_DATA_FILE}")
    
    return df

def ensure_data_dir():
    """确保数据目录存在"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def load_or_process_data(raw_data=None):
    """加载或处理数据"""
    if raw_data:
        matches_df = process_match_data(raw_data['matches'])
        odds_df = process_odds_data(raw_data['odds'])
    else:
        # 尝试从文件加载
        try:
            matches_df = pd.read_csv(MATCHES_DATA_FILE)
            matches_df['match_date'] = pd.to_datetime(matches_df['match_date'])
            print(f"从{MATCHES_DATA_FILE}加载了比赛数据")
        except:
            print(f"无法加载{MATCHES_DATA_FILE}，请先收集和处理数据")
            matches_df = None
            
        try:
            odds_df = pd.read_csv(ODDS_DATA_FILE)
            odds_df['commence_time'] = pd.to_datetime(odds_df['commence_time'])
            print(f"从{ODDS_DATA_FILE}加载了赔率数据")
        except:
            print(f"无法加载{ODDS_DATA_FILE}，请先收集和处理数据")
            odds_df = None
    
    return {
        "matches": matches_df,
        "odds": odds_df
    }

if __name__ == "__main__":
    # 测试数据处理功能
    from data_collection import collect_all_data
    
    raw_data = collect_all_data()
    processed_data = load_or_process_data(raw_data)
    print("数据处理完成")
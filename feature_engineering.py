import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from config import *

def create_team_features(matches_df, lookback_matches=10):
    """为每支球队创建特征"""
    if matches_df is None or matches_df.empty:
        print("无效的比赛数据")
        return None
    
    # 确保数据按日期排序
    if 'match_date' in matches_df.columns:
        matches_df = matches_df.sort_values('match_date')
    
    # 只使用已完成的比赛
    completed_matches = matches_df[matches_df['status'] == 'FINISHED'].copy()
    
    # 获取所有球队并转换为列表
    all_teams = list(set(completed_matches['home_team'].unique()) | set(completed_matches['away_team'].unique()))
    
    # 创建特征数据框
    features = pd.DataFrame(index=all_teams)
    
    # 计算每支球队的特征
    for team in all_teams:
        # 获取球队的所有比赛
        team_home_matches = completed_matches[completed_matches['home_team'] == team].copy()
        team_away_matches = completed_matches[completed_matches['away_team'] == team].copy()
        
        # 最近的比赛
        recent_home_matches = team_home_matches.tail(lookback_matches)
        recent_away_matches = team_away_matches.tail(lookback_matches)
        
        # 计算主场特征
        if not recent_home_matches.empty:
            features.loc[team, 'home_matches_played'] = len(recent_home_matches)
            features.loc[team, 'home_goals_scored_avg'] = recent_home_matches['home_score'].mean()
            features.loc[team, 'home_goals_conceded_avg'] = recent_home_matches['away_score'].mean()
            features.loc[team, 'home_win_rate'] = (recent_home_matches['result'] == 'H').mean()
            features.loc[team, 'home_draw_rate'] = (recent_home_matches['result'] == 'D').mean()
            features.loc[team, 'home_loss_rate'] = (recent_home_matches['result'] == 'A').mean()
        else:
            features.loc[team, 'home_matches_played'] = 0
            features.loc[team, 'home_goals_scored_avg'] = 0
            features.loc[team, 'home_goals_conceded_avg'] = 0
            features.loc[team, 'home_win_rate'] = 0
            features.loc[team, 'home_draw_rate'] = 0
            features.loc[team, 'home_loss_rate'] = 0
        
        # 计算客场特征
        if not recent_away_matches.empty:
            features.loc[team, 'away_matches_played'] = len(recent_away_matches)
            features.loc[team, 'away_goals_scored_avg'] = recent_away_matches['away_score'].mean()
            features.loc[team, 'away_goals_conceded_avg'] = recent_away_matches['home_score'].mean()
            features.loc[team, 'away_win_rate'] = (recent_away_matches['result'] == 'A').mean()
            features.loc[team, 'away_draw_rate'] = (recent_away_matches['result'] == 'D').mean()
            features.loc[team, 'away_loss_rate'] = (recent_away_matches['result'] == 'H').mean()
        else:
            features.loc[team, 'away_matches_played'] = 0
            features.loc[team, 'away_goals_scored_avg'] = 0
            features.loc[team, 'away_goals_conceded_avg'] = 0
            features.loc[team, 'away_win_rate'] = 0
            features.loc[team, 'away_draw_rate'] = 0
            features.loc[team, 'away_loss_rate'] = 0
        
        # 计算总体特征
        all_team_matches = pd.concat([
            team_home_matches[['match_date', 'home_score', 'away_score', 'result']].rename(
                columns={'home_score': 'team_score', 'away_score': 'opponent_score'}
            ).assign(is_home=True),
            team_away_matches[['match_date', 'home_score', 'away_score', 'result']].rename(
                columns={'away_score': 'team_score', 'home_score': 'opponent_score'}
            ).assign(is_home=False)
        ]).sort_values('match_date')
        
        recent_matches = all_team_matches.tail(lookback_matches)
        
        if not recent_matches.empty:
            # 计算最近的表现
            features.loc[team, 'total_matches_played'] = len(recent_matches)
            features.loc[team, 'total_goals_scored_avg'] = recent_matches['team_score'].mean()
            features.loc[team, 'total_goals_conceded_avg'] = recent_matches['opponent_score'].mean()
            
            # 计算胜率
            home_wins = sum((recent_matches['is_home'] == True) & (recent_matches['result'] == 'H'))
            away_wins = sum((recent_matches['is_home'] == False) & (recent_matches['result'] == 'A'))
            total_wins = home_wins + away_wins
            
            features.loc[team, 'overall_win_rate'] = total_wins / len(recent_matches)
            
            # 计算最近的趋势（最近5场比赛的得分）
            last_5_matches = recent_matches.tail(5)
            if len(last_5_matches) > 0:
                points = 0
                for _, match in last_5_matches.iterrows():
                    if (match['is_home'] and match['result'] == 'H') or (not match['is_home'] and match['result'] == 'A'):
                        points += 3  # 胜
                    elif match['result'] == 'D':
                        points += 1  # 平
                
                features.loc[team, 'recent_form'] = points / (len(last_5_matches) * 3)  # 归一化为0-1
            else:
                features.loc[team, 'recent_form'] = 0
        else:
            features.loc[team, 'total_matches_played'] = 0
            features.loc[team, 'total_goals_scored_avg'] = 0
            features.loc[team, 'total_goals_conceded_avg'] = 0
            features.loc[team, 'overall_win_rate'] = 0
            features.loc[team, 'recent_form'] = 0
    
    # 保存特征数据
    features.to_csv(FEATURES_DATA_FILE)
    print(f"球队特征数据已保存至 {FEATURES_DATA_FILE}")
    
    return features

def prepare_match_features(matches_df, features_df):
    """为每场比赛准备特征"""
    if matches_df is None or features_df is None:
        print("无效的数据")
        return None
    
    match_features = []
    
    for _, match in matches_df.iterrows():
        home_team = match['home_team']
        away_team = match['away_team']
        
        # 检查两队是否都有特征数据
        if home_team not in features_df.index or away_team not in features_df.index:
            continue
        
        # 提取特征
        match_data = {
            'match_id': match['match_id'],
            'home_team': home_team,
            'away_team': away_team,
            'match_date': match['match_date'],
            'status': match['status']
        }
        
        # 添加主队特征
        for col in features_df.columns:
            match_data[f'home_{col}'] = features_df.loc[home_team, col]
        
        # 添加客队特征
        for col in features_df.columns:
            match_data[f'away_{col}'] = features_df.loc[away_team, col]
        
        # 如果比赛已完成，添加结果
        if match['status'] == 'FINISHED':
            match_data['home_score'] = match['home_score']
            match_data['away_score'] = match['away_score']
            match_data['result'] = match['result']
            if 'half_time_home' in match and 'half_time_away' in match:
                match_data['half_time_home'] = match['half_time_home']
                match_data['half_time_away'] = match['half_time_away']
                if 'half_full_result' in match:
                    match_data['half_full_result'] = match['half_full_result']
        
        match_features.append(match_data)
    
    return pd.DataFrame(match_features)

def load_or_create_features(matches_df=None):
    """加载或创建特征"""
    if matches_df is not None:
        # 创建新的特征
        features_df = create_team_features(matches_df)
    else:
        # 尝试从文件加载
        try:
            features_df = pd.read_csv(FEATURES_DATA_FILE, index_col=0)
            print(f"从{FEATURES_DATA_FILE}加载了特征数据")
        except:
            print(f"无法加载{FEATURES_DATA_FILE}，请先创建特征")
            features_df = None
    
    return features_df

if __name__ == "__main__":
    # 测试特征工程功能
    from data_processing import load_or_process_data
    
    processed_data = load_or_process_data()
    features_df = load_or_create_features(processed_data['matches'])
    
    if features_df is not None:
        print("特征工程完成")
        print(f"创建了{len(features_df)}支球队的特征")
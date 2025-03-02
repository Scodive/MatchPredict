from flask import Flask, request, jsonify, render_template, logging
import pandas as pd
import numpy as np
from scipy.stats import poisson
import os
import json
from datetime import datetime
from itertools import product
import logging

app = Flask(__name__)

# 配置日志
logging.basicConfig(
    filename='user_predictions.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

# 联赛名称映射
LEAGUES = {
    "PL": "英超",
    "PD": "西甲",
    "SA": "意甲",
    "BL1": "德甲",
    "FL1": "法甲"
}

# 加载特征数据
def load_features():
    features = {}
    for league_code in LEAGUES.keys():
        file_path = f"data/features_{league_code}2024.csv"
        if os.path.exists(file_path):
            features[league_code] = pd.read_csv(file_path, index_col=0)
            app.logger.info(f"已加载 {LEAGUES[league_code]} 数据")
    return features

# 全局变量
features = load_features()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """获取所有联赛的球队"""
    teams_dict = {}
    
    for league_code, df in features.items():
        teams_dict[league_code] = df.index.tolist()
    
    return jsonify({
        'success': True,
        'teams': teams_dict
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """预测比赛结果"""
    try:
        data = request.json
        matches = data.get('matches', [])
        
        if not matches:
            return jsonify({
                'success': False,
                'message': '未提供比赛数据'
            })
        
        # 记录用户输入
        log_user_prediction(matches)
        
        # 处理每场比赛
        individual_predictions = []
        for match in matches:
            prediction = predict_match(
                match['league_code'],
                match['home_team'],
                match['away_team'],
                match['home_odds'],
                match['draw_odds'],
                match['away_odds']
            )
            individual_predictions.append(prediction)
        
        # 生成所有可能的串关组合
        all_combinations = generate_parlays(individual_predictions)
        
        # 按期望值排序
        all_combinations.sort(key=lambda x: x['expected_value'], reverse=True)
        
        # 最佳串关
        best_parlay = all_combinations[0] if all_combinations else None
        
        return jsonify({
            'success': True,
            'individual_predictions': individual_predictions,
            'best_parlay': best_parlay,
            'all_combinations': all_combinations
        })
        
    except Exception as e:
        app.logger.error(f"预测错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'预测过程中发生错误: {str(e)}'
        })

def predict_match(league_code, home_team, away_team, home_odds, draw_odds, away_odds):
    """预测单场比赛结果"""
    # 获取球队特征
    home_features = get_team_features(home_team, league_code)
    away_features = get_team_features(away_team, league_code)
    
    if home_features is None or away_features is None:
        raise ValueError(f"找不到球队数据: {home_team} 或 {away_team}")
    
    # 计算预期进球数
    home_expected_goals = home_features['home_goals_scored_avg'] * away_features['away_goals_conceded_avg'] / 1.3
    away_expected_goals = away_features['away_goals_scored_avg'] * home_features['home_goals_conceded_avg'] / 1.3
    
    # 使用泊松分布计算比分概率
    max_goals = 10
    score_probs = {}
    for i in range(max_goals + 1):
        for j in range(max_goals + 1):
            score_probs[(i, j)] = poisson.pmf(i, home_expected_goals) * poisson.pmf(j, away_expected_goals)
    
    # 计算结果概率
    home_win_prob = sum(prob for (h, a), prob in score_probs.items() if h > a)
    draw_prob = sum(prob for (h, a), prob in score_probs.items() if h == a)
    away_win_prob = sum(prob for (h, a), prob in score_probs.items() if h < a)
    
    # 计算期望值
    home_ev = (home_win_prob * home_odds) - 1
    draw_ev = (draw_prob * draw_odds) - 1
    away_ev = (away_win_prob * away_odds) - 1
    
    # 确定最佳投注
    all_bets = [
        ('home', home_ev, home_odds, home_win_prob),
        ('draw', draw_ev, draw_odds, draw_prob),
        ('away', away_ev, away_odds, away_win_prob)
    ]
    all_bets.sort(key=lambda x: x[1], reverse=True)
    best_bet, best_ev, _, _ = all_bets[0]
    
    return {
        'home_team': home_team,
        'away_team': away_team,
        'home_win_prob': home_win_prob,
        'draw_prob': draw_prob,
        'away_win_prob': away_win_prob,
        'home_odds': home_odds,
        'draw_odds': draw_odds,
        'away_odds': away_odds,
        'best_bet': best_bet,
        'best_ev': best_ev,
        'all_bets': all_bets
    }

def get_team_features(team_name, league_code=None):
    """获取球队特征"""
    if league_code and league_code in features:
        # 在指定联赛中查找
        if team_name in features[league_code].index:
            return features[league_code].loc[team_name]
    
    # 在所有联赛中查找
    for code, df in features.items():
        if team_name in df.index:
            return df.loc[team_name]
    
    return None

def generate_parlays(predictions):
    """生成所有可能的串关组合"""
    # 为每场比赛创建所有可能的选择
    all_selections = []
    for pred in predictions:
        match_selections = []
        for bet_type, ev, odds, prob in pred['all_bets']:
            selection = {
                'match': f"{pred['home_team']} vs {pred['away_team']}",
                'pick': bet_type,
                'odds': odds,
                'prob': prob,
                'ev': ev
            }
            match_selections.append(selection)
        all_selections.append(match_selections)
    
    # 生成所有可能的组合
    all_combinations = []
    
    # 获取所有可能的选择组合
    for combo in product(*all_selections):
        total_odds = 1.0
        total_prob = 1.0
        
        for selection in combo:
            total_odds *= selection['odds']
            total_prob *= selection['prob']
        
        expected_value = (total_prob * total_odds) - 1
        
        parlay = {
            'selections': combo,
            'total_odds': total_odds,
            'total_prob': total_prob,
            'expected_value': expected_value
        }
        
        all_combinations.append(parlay)
    
    # 按期望值排序
    all_combinations.sort(key=lambda x: x['expected_value'], reverse=True)
    
    return all_combinations

def log_user_prediction(matches):
    """记录用户的预测请求"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    client_ip = request.remote_addr
    
    log_entry = {
        'timestamp': timestamp,
        'ip': client_ip,
        'matches': matches
    }
    
    logging.info(json.dumps(log_entry))

if __name__ == '__main__':
    app.run(debug=True) 
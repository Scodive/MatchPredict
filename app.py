from flask import Flask, request, jsonify, render_template, logging
import pandas as pd
import numpy as np
from scipy.stats import poisson
import os
import json
from datetime import datetime
from itertools import product
import logging

# 导入新模块
from lottery_api import ChinaSportsLotteryAPI
from ai_predictor import AIFootballPredictor, MatchAnalysis

app = Flask(__name__)

# 配置日志
logging.basicConfig(
    filename='user_predictions.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

# 联赛名称映射（扩展版）
LEAGUES = {
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

# 全局变量
features = {}
lottery_api = None
ai_predictor = None

def initialize_services():
    """初始化服务"""
    global lottery_api, ai_predictor
    
    # 初始化中国体育彩票API
    lottery_api = ChinaSportsLotteryAPI()
    
    # 初始化AI预测器（可以在config.py中配置Gemini API Key）
    gemini_key = os.getenv('GEMINI_API_KEY', 'AIzaSyDy9pYAEW7e2Ewk__9TCHAD5X_G1VhCtVw')
    gemini_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
    ai_predictor = AIFootballPredictor(gemini_api_key=gemini_key, model=gemini_model)

# 加载特征数据
def load_features():
    features = {}
    for league_code in LEAGUES.keys():
        file_path = f"data/features_{league_code}2024.csv"
        if os.path.exists(file_path):
            features[league_code] = pd.read_csv(file_path, index_col=0)
            app.logger.info(f"已加载 {LEAGUES[league_code]} 数据")
    return features

# 初始化
initialize_services()
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

@app.route('/api/lottery/matches', methods=['GET'])
def get_lottery_matches():
    """获取中国体育彩票比赛数据"""
    try:
        days_ahead = request.args.get('days', 3, type=int)
        
        if not lottery_api:
            return jsonify({
                'success': False,
                'message': '彩票API未初始化'
            })
        
        matches = lottery_api.get_formatted_matches(days_ahead)
        
        return jsonify({
            'success': True,
            'matches': matches,
            'count': len(matches)
        })
        
    except Exception as e:
        app.logger.error(f"获取彩票比赛数据失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取比赛数据失败: {str(e)}'
        })

@app.route('/api/ai/predict', methods=['POST'])
def ai_predict():
    """AI智能预测比赛结果"""
    try:
        data = request.json
        matches = data.get('matches', [])
        
        if not matches:
            return jsonify({
                'success': False,
                'message': '未提供比赛数据'
            })
        
        if not ai_predictor:
            return jsonify({
                'success': False,
                'message': 'AI预测器未初始化'
            })
        
        # 记录用户输入
        log_user_prediction(matches)
        
        # 使用AI分析比赛
        ai_analyses = []
        for match in matches:
            analysis = ai_predictor.analyze_match(match)
            
            # 转换为可序列化的字典
            analysis_dict = {
                'match_id': analysis.match_id,
                'home_team': analysis.home_team,
                'away_team': analysis.away_team,
                'league_name': analysis.league_name,
                'win_draw_loss': analysis.win_draw_loss,
                'confidence_level': analysis.confidence_level,
                'half_full_time': analysis.half_full_time,
                'total_goals': analysis.total_goals,
                'exact_scores': analysis.exact_scores,
                'analysis_reason': analysis.analysis_reason,
                'recommended_bets': analysis.recommended_bets
            }
            
            # 寻找价值投注
            if 'odds' in match:
                value_bets = ai_predictor.get_value_bets(analysis, match['odds'])
                analysis_dict['value_bets'] = value_bets
            
            ai_analyses.append(analysis_dict)
        
        # 生成组合预测
        combination_predictions = generate_ai_combinations(ai_analyses)
        
        return jsonify({
            'success': True,
            'ai_analyses': ai_analyses,
            'combination_predictions': combination_predictions
        })
        
    except Exception as e:
        app.logger.error(f"AI预测错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'AI预测过程中发生错误: {str(e)}'
        })

@app.route('/api/predict', methods=['POST'])
def predict():
    """原有的预测比赛结果接口（兼容性保持）"""
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
                match.get('league_code', ''),
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

def generate_ai_combinations(ai_analyses):
    """基于AI分析生成组合预测"""
    combinations = []
    
    # 胜平负最佳组合
    best_wdl_combo = []
    total_confidence = 1.0
    
    for analysis in ai_analyses:
        wdl = analysis['win_draw_loss']
        best_outcome = max(wdl, key=wdl.get)
        
        best_wdl_combo.append({
            'match': f"{analysis['home_team']} vs {analysis['away_team']}",
            'prediction': best_outcome,
            'probability': wdl[best_outcome],
            'confidence': analysis['confidence_level']
        })
        
        total_confidence *= analysis['confidence_level']
    
    combinations.append({
        'type': '胜平负最佳组合',
        'selections': best_wdl_combo,
        'total_confidence': total_confidence,
        'description': '基于AI分析的最高概率胜平负组合'
    })
    
    # 半全场推荐组合
    best_hf_combo = []
    for analysis in ai_analyses:
        hf = analysis['half_full_time']
        if hf:
            best_hf_outcome = max(hf, key=hf.get)
            best_hf_combo.append({
                'match': f"{analysis['home_team']} vs {analysis['away_team']}",
                'prediction': best_hf_outcome,
                'probability': hf[best_hf_outcome]
            })
    
    if best_hf_combo:
        combinations.append({
            'type': '半全场推荐组合',
            'selections': best_hf_combo,
            'description': 'AI推荐的半全场投注组合'
        })
    
    # 进球数推荐组合
    best_goals_combo = []
    for analysis in ai_analyses:
        goals = analysis['total_goals']
        if goals:
            best_goals_outcome = max(goals, key=goals.get)
            best_goals_combo.append({
                'match': f"{analysis['home_team']} vs {analysis['away_team']}",
                'prediction': best_goals_outcome,
                'probability': goals[best_goals_outcome]
            })
    
    if best_goals_combo:
        combinations.append({
            'type': '进球数推荐组合',
            'selections': best_goals_combo,
            'description': 'AI推荐的进球数投注组合'
        })
    
    return combinations

def predict_match(league_code, home_team, away_team, home_odds, draw_odds, away_odds):
    """预测单场比赛结果（原有函数保持不变）"""
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
    """生成所有可能的串关组合（原有函数保持不变）"""
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

# 新增API端点

@app.route('/api/lottery/refresh', methods=['POST'])
def refresh_lottery_data():
    """刷新彩票数据"""
    try:
        days_ahead = request.json.get('days', 3)
        matches = lottery_api.get_formatted_matches(days_ahead)
        
        # 保存到文件
        filename = f"data/lottery_matches_{datetime.now().strftime('%Y%m%d')}.json"
        lottery_api.save_matches_to_json(matches, filename)
        
        return jsonify({
            'success': True,
            'message': f'已刷新 {len(matches)} 场比赛数据',
            'matches_count': len(matches)
        })
        
    except Exception as e:
        app.logger.error(f"刷新彩票数据失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'刷新数据失败: {str(e)}'
        })

@app.route('/api/ai/batch-predict', methods=['POST'])
def ai_batch_predict():
    """批量AI预测"""
    try:
        data = request.json
        match_ids = data.get('match_ids', [])
        
        if not match_ids:
            return jsonify({
                'success': False,
                'message': '未提供比赛ID'
            })
        
        # 获取比赛数据
        all_analyses = []
        for match_id in match_ids:
            # 这里需要根据match_id获取比赛详细信息
            # 暂时使用示例数据
            match_data = {
                'match_id': match_id,
                'home_team': '示例主队',
                'away_team': '示例客队',
                'league_name': '示例联赛'
            }
            
            analysis = ai_predictor.analyze_match(match_data)
            all_analyses.append({
                'match_id': analysis.match_id,
                'home_team': analysis.home_team,
                'away_team': analysis.away_team,
                'league_name': analysis.league_name,
                'win_draw_loss': analysis.win_draw_loss,
                'confidence_level': analysis.confidence_level,
                'half_full_time': analysis.half_full_time,
                'total_goals': analysis.total_goals,
                'exact_scores': analysis.exact_scores,
                'analysis_reason': analysis.analysis_reason,
                'recommended_bets': analysis.recommended_bets
            })
        
        return jsonify({
            'success': True,
            'analyses': all_analyses
        })
        
    except Exception as e:
        app.logger.error(f"批量AI预测失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'批量预测失败: {str(e)}'
        })

if __name__ == '__main__':
    app.run(debug=True) 
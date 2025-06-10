from flask import Flask, request, jsonify, render_template
import os
import json
import logging
from datetime import datetime

# 延迟导入，避免在Vercel环境中的问题
try:
    from lottery_api import ChinaSportsLotteryAPI
except ImportError as e:
    print(f"导入彩票API失败: {e}")
    ChinaSportsLotteryAPI = None

try:
    from ai_predictor import AIFootballPredictor
except ImportError as e:
    print(f"导入AI预测器失败: {e}")
    AIFootballPredictor = None

app = Flask(__name__)

# 配置日志
logging.basicConfig(level=logging.INFO)

# 全局变量
lottery_api = None
ai_predictor = None

# 联赛配置（简化版）
LEAGUES = {
    "PL": "英超",
    "PD": "西甲", 
    "SA": "意甲",
    "BL1": "德甲",
    "FL1": "法甲"
}

# 简化的球队数据
TEAMS_DATA = {
    "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC", "Chelsea FC", "Tottenham Hotspur FC", "Newcastle United FC", "Brighton & Hove Albion FC"],
    "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC", "Valencia CF", "Real Betis Balompié", "Real Sociedad de Fútbol", "Athletic Club"],
    "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli", "AS Roma", "SS Lazio", "Atalanta BC", "ACF Fiorentina"],
    "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen", "VfB Stuttgart", "Eintracht Frankfurt", "VfL Wolfsburg", "SC Freiburg"],
    "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais", "OGC Nice", "Stade Rennais FC", "RC Lens", "LOSC Lille"]
}

def initialize_services():
    """初始化服务"""
    global lottery_api, ai_predictor
    
    try:
        # 初始化中国体育彩票API
        if ChinaSportsLotteryAPI:
            lottery_api = ChinaSportsLotteryAPI()
            app.logger.info("彩票API初始化成功")
        else:
            app.logger.warning("彩票API类未加载")
    except Exception as e:
        app.logger.error(f"彩票API初始化失败: {e}")
        lottery_api = None
    
    try:
        # 初始化AI预测器
        if AIFootballPredictor:
            gemini_key = os.getenv('GEMINI_API_KEY', 'AIzaSyDy9pYAEW7e2Ewk__9TCHAD5X_G1VhCtVw')
            gemini_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
            ai_predictor = AIFootballPredictor(gemini_api_key=gemini_key, model=gemini_model)
            app.logger.info("AI预测器初始化成功")
        else:
            app.logger.warning("AI预测器类未加载")
    except Exception as e:
        app.logger.error(f"AI预测器初始化失败: {e}")
        ai_predictor = None

# 初始化
try:
    initialize_services()
except Exception as e:
    app.logger.error(f"服务初始化失败: {e}")

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        app.logger.error(f"渲染主页失败: {e}")
        return f"页面加载错误: {str(e)}", 500

@app.route('/api/teams')
def get_teams():
    """获取球队数据"""
    try:
        # 返回简化的球队数据
        teams = {
            "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC", 
                   "Chelsea FC", "Tottenham Hotspur FC", "Newcastle United FC", "Brighton & Hove Albion FC"],
            "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC", 
                   "Valencia CF", "Real Betis Balompié", "Real Sociedad", "Athletic Bilbao"],
            "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli", 
                   "AS Roma", "SS Lazio", "Atalanta BC", "ACF Fiorentina"],
            "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen", 
                    "VfB Stuttgart", "Eintracht Frankfurt", "Borussia Mönchengladbach", "VfL Wolfsburg"],
            "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais", 
                    "OGC Nice", "Stade Rennais FC", "RC Lens", "RC Strasbourg Alsace"]
        }
        
        return jsonify({
            'success': True,
            'teams': teams,
            'message': '球队数据获取成功'
        })
        
    except Exception as e:
        app.logger.error(f"获取球队数据失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '获取球队数据失败'
        }), 500

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
    """简化版预测接口"""
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
        
        # 简化预测逻辑
        individual_predictions = []
        for match in matches:
            prediction = simple_predict_match(match)
            individual_predictions.append(prediction)
        
        return jsonify({
            'success': True,
            'individual_predictions': individual_predictions,
            'message': '简化预测模式，推荐使用AI智能预测获得更准确结果'
        })
        
    except Exception as e:
        app.logger.error(f"预测错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'预测过程中发生错误: {str(e)}'
        })

def simple_predict_match(match):
    """简化的比赛预测"""
    home_odds = float(match.get('home_odds', 2.0))
    draw_odds = float(match.get('draw_odds', 3.0))
    away_odds = float(match.get('away_odds', 2.5))
    
    # 基于赔率的简单概率计算
    home_prob = 1 / home_odds
    draw_prob = 1 / draw_odds
    away_prob = 1 / away_odds
    
    total_prob = home_prob + draw_prob + away_prob
    
    # 归一化概率
    home_prob /= total_prob
    draw_prob /= total_prob
    away_prob /= total_prob
    
    return {
        'match': f"{match['home_team']} vs {match['away_team']}",
        'home_team': match['home_team'],
        'away_team': match['away_team'],
        'probabilities': {
            'home': round(home_prob, 3),
            'draw': round(draw_prob, 3), 
            'away': round(away_prob, 3)
        },
        'odds': {
            'home': home_odds,
            'draw': draw_odds,
            'away': away_odds
        },
        'recommendation': '主胜' if home_prob > max(draw_prob, away_prob) else ('平局' if draw_prob > away_prob else '客胜')
    }

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
    
    return combinations

def log_user_prediction(matches):
    """记录用户预测请求"""
    try:
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'matches_count': len(matches),
            'matches': matches
        }
        
        # 简单的文件日志
        with open('user_predictions.log', 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
            
    except Exception as e:
        app.logger.error(f"记录用户预测失败: {str(e)}")

@app.route('/api/lottery/refresh', methods=['POST'])
def refresh_lottery_data():
    """刷新彩票数据"""
    try:
        data = request.json
        days = data.get('days', 3)
        
        if not lottery_api:
            return jsonify({
                'success': False,
                'message': '彩票API未初始化'
            })
        
        matches = lottery_api.get_formatted_matches(days)
        
        return jsonify({
            'success': True,
            'matches': matches,
            'count': len(matches)
        })
        
    except Exception as e:
        app.logger.error(f"刷新彩票数据失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'刷新数据失败: {str(e)}'
        })

@app.route('/api/ai/batch-predict', methods=['POST'])
def ai_batch_predict():
    """AI批量预测"""
    try:
        data = request.json
        matches = data.get('matches', [])
        
        if not matches:
            return jsonify({
                'success': False,
                'message': '未提供比赛数据'
            })
        
        # 调用AI预测
        return ai_predict()
        
    except Exception as e:
        app.logger.error(f"AI批量预测错误: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'批量预测失败: {str(e)}'
        })

@app.route('/test')
def test():
    """测试路由"""
    return jsonify({
        'status': 'ok',
        'message': '服务正常运行',
        'lottery_api': lottery_api is not None,
        'ai_predictor': ai_predictor is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health():
    """健康检查"""
    return "OK", 200

if __name__ == '__main__':
    app.run(debug=True) 
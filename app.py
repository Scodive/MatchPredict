from flask import Flask, request, jsonify, render_template
import os
import json
import logging
import requests
from datetime import datetime

# 尝试导入数据库模块
try:
    from scripts.database import prediction_db
    print("✅ 数据库模块导入成功")
except ImportError as e:
    print(f"⚠️ 数据库模块导入失败: {e}")
    prediction_db = None

# 延迟导入，避免在Vercel环境中的问题
try:
    from lottery_api import ChinaSportsLotterySpider
except ImportError as e:
    print(f"导入彩票API失败: {e}")
    ChinaSportsLotterySpider = None

try:
    from ai_predictor import AIFootballPredictor
except ImportError as e:
    print(f"导入AI预测器失败: {e}")
    AIFootballPredictor = None

app = Flask(__name__)

# 配置日志
logging.basicConfig(level=logging.INFO)

# 全局变量
lottery_spider = None
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
    global lottery_spider, ai_predictor
    
    try:
        # 初始化中国体育彩票API
        if ChinaSportsLotterySpider:
            lottery_spider = ChinaSportsLotterySpider()
            app.logger.info("彩票API初始化成功")
        else:
            app.logger.warning("彩票API类未加载")
    except Exception as e:
        app.logger.error(f"彩票API初始化失败: {e}")
        lottery_spider = None
    
    try:
        # 初始化AI预测器
        if AIFootballPredictor:
            gemini_api_key = os.environ.get('GEMINI_API_KEY')
            gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')
            
            if not gemini_api_key:
                app.logger.warning("GEMINI_API_KEY环境变量未设置，AI预测器将不可用")
                ai_predictor = None
            else:
                ai_predictor = AIFootballPredictor(
                    api_key=gemini_api_key,
                    model_name=gemini_model
                )
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
        # 将环境变量传递给前端
        gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
        gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')
        
        return render_template('index.html', 
                             gemini_api_key=gemini_api_key,
                             gemini_model=gemini_model)
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

@app.route('/api/lottery/matches')
def get_lottery_matches():
    """获取中国体育彩票比赛数据"""
    try:
        days = request.args.get('days', 3, type=int)
        days = min(max(days, 1), 7)  # 限制在1-7天之间
        
        app.logger.info(f"开始爬取体彩官网数据，天数: {days}")
        
        # 方法1: 尝试使用爬虫
        try:
            from scripts.china_lottery_spider import ChinaLotterySpider
            lottery_spider = ChinaLotterySpider()
            matches = lottery_spider.get_formatted_matches(days_ahead=days)
            
            app.logger.info(f"✅ 爬虫成功获取 {len(matches)} 场比赛")
            
            return jsonify({
                'success': True,
                'matches': matches,
                'count': len(matches),
                'message': f'数据爬取成功，获取 {len(matches)} 场比赛'
            })
            
        except Exception as spider_error:
            app.logger.warning(f"⚠️ 爬虫失败，尝试直接API调用: {spider_error}")
            
            # 方法2: 直接API调用 (适用于Vercel)
            try:
                api_url = "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry"
                params = {"poolCode": "hhad", "channel": "c"}
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Referer": "https://www.lottery.gov.cn/",
                    "Origin": "https://www.lottery.gov.cn"
                }
                
                response = requests.get(api_url, params=params, headers=headers, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                if data.get('success'):
                    # 简化数据处理
                    matches = []
                    value = data.get('value', {})
                    match_info_list = value.get('matchInfoList', [])
                    
                    for date_info in match_info_list:
                        sub_match_list = date_info.get('subMatchList', [])
                        for match_data in sub_match_list:
                            if match_data.get('hhad'):
                                hhad = match_data['hhad']
                                match_info = {
                                    'match_id': f"lottery_{match_data.get('matchId', '')}",
                                    'home_team': match_data.get('homeTeamAbbName', ''),
                                    'away_team': match_data.get('awayTeamAbbName', ''),
                                    'league_name': match_data.get('leagueAbbName', ''),
                                    'match_time': f"{match_data.get('matchDate', '')} {match_data.get('matchTime', '')}",
                                    'match_date': match_data.get('matchDate', ''),
                                    'status': match_data.get('matchStatus', 'Unknown'),
                                    'source': 'china_lottery_api',
                                    'odds': {
                                        'hhad': {
                                            'h': str(hhad.get('h', '')),
                                            'd': str(hhad.get('d', '')),
                                            'a': str(hhad.get('a', ''))
                                        }
                                    }
                                }
                                matches.append(match_info)
                    
                    app.logger.info(f"✅ 直接API成功获取 {len(matches)} 场比赛")
                    
                    return jsonify({
                        'success': True,
                        'matches': matches,
                        'count': len(matches),
                        'message': f'API调用成功，获取 {len(matches)} 场比赛'
                    })
                else:
                    raise Exception(f"API返回错误: {data.get('errorMessage', '未知错误')}")
                    
            except Exception as api_error:
                app.logger.error(f"❌ 直接API调用也失败: {api_error}")
                
                return jsonify({
                    'success': False,
                    'error': str(api_error),
                    'message': '暂时无法获取体彩数据，请稍后重试'
                }), 503
            
    except Exception as e:
        app.logger.error(f"获取体彩数据失败: {e}")
        
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '系统错误，暂时无法获取数据'
        }), 500

@app.route('/api/save-prediction', methods=['POST'])
def save_prediction():
    """保存预测结果到数据库"""
    try:
        if not prediction_db:
            return jsonify({
                'success': False,
                'message': '数据库未配置'
            }), 500
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据为空'
            }), 400
        
        prediction_mode = data.get('mode', '').lower()
        match_data = data.get('match_data', {})
        prediction_result = data.get('prediction_result', '')
        confidence = data.get('confidence', 0)
        ai_analysis = data.get('ai_analysis', '')
        user_ip = request.remote_addr
        
        success = False
        
        if prediction_mode == 'ai':
            success = prediction_db.save_ai_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip
            )
        elif prediction_mode == 'classic':
            success = prediction_db.save_classic_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                user_ip=user_ip
            )
        elif prediction_mode == 'lottery':
            success = prediction_db.save_lottery_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip
            )
        else:
            return jsonify({
                'success': False,
                'message': '未知的预测模式'
            }), 400
        
        if success:
            return jsonify({
                'success': True,
                'message': '预测结果保存成功'
            })
        else:
            return jsonify({
                'success': False,
                'message': '预测结果保存失败'
            }), 500
            
    except Exception as e:
        app.logger.error(f"保存预测结果失败: {e}")
        return jsonify({
            'success': False,
            'message': f'服务器错误: {str(e)}'
        }), 500

@app.route('/api/prediction-stats', methods=['GET'])
def get_prediction_stats():
    """获取预测统计信息"""
    try:
        if not prediction_db:
            return jsonify({
                'success': False,
                'message': '数据库未配置'
            }), 500
            
        stats = prediction_db.get_prediction_stats()
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        app.logger.error(f"获取统计信息失败: {e}")
        return jsonify({
            'success': False,
            'message': f'获取统计信息失败: {str(e)}'
        }), 500

@app.route('/api/ai/predict', methods=['POST'])
def ai_predict():
    """AI智能预测接口"""
    try:
        data = request.get_json()
        matches = data.get('matches', [])
        
        if not matches:
            return jsonify({
                'success': False,
                'error': '没有提供比赛数据'
            }), 400
        
        app.logger.info(f"收到AI预测请求，比赛数量: {len(matches)}")
        
        # 确保AI预测器可用
        current_predictor = ai_predictor
        if not current_predictor:
            try:
                gemini_api_key = os.environ.get('GEMINI_API_KEY')
                gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')
                
                if not gemini_api_key:
                    return jsonify({
                        'success': False,
                        'error': 'GEMINI_API_KEY环境变量未设置'
                    }), 500
                    
                current_predictor = AIFootballPredictor(
                    api_key=gemini_api_key,
                    model_name=gemini_model
                )
                app.logger.info("临时创建AI预测器")
            except Exception as e:
                app.logger.error(f"创建AI预测器失败: {e}")
                return jsonify({
                    'success': False,
                    'error': 'AI预测器初始化失败'
                }), 500
        
        # 分析比赛
        analyses = current_predictor.analyze_matches(matches)
        
        # 转换为简单格式返回
        results = []
        for analysis in analyses:
            results.append({
                'match_id': analysis.match_id,
                'home_team': analysis.home_team,
                'away_team': analysis.away_team,
                'league_name': analysis.league_name,
                'ai_analysis': analysis.ai_analysis,
                'odds': {
                    'home': analysis.home_odds,
                    'draw': analysis.draw_odds,
                    'away': analysis.away_odds
                }
            })
        
        return jsonify({
            'success': True,
            'predictions': results,
            'count': len(results)
        })
        
    except Exception as e:
        app.logger.error(f"AI预测失败: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
        
        if not lottery_spider:
            return jsonify({
                'success': False,
                'message': '彩票API未初始化'
            })
        
        matches = lottery_spider.get_formatted_matches(days)
        
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
        'lottery_spider': lottery_spider is not None,
        'ai_predictor': ai_predictor is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health')
def health():
    """健康检查"""
    return "OK", 200

@app.route('/data/<filename>')
def serve_data_files(filename):
    """提供数据文件访问"""
    try:
        from flask import send_from_directory
        return send_from_directory('data', filename)
    except Exception as e:
        app.logger.error(f"提供数据文件失败: {e}")
        return jsonify({'error': '文件未找到'}), 404

if __name__ == '__main__':
    app.run(debug=True) 
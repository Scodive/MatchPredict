from flask import Flask, request, jsonify, render_template, session, make_response
import os
import json
import logging
import requests
import hashlib
import psycopg2
from datetime import datetime, timedelta

# 导入数据库模块
try:
    from scripts.database import prediction_db
    print("✅ 数据库模块导入成功")
    if prediction_db:
        print(f"DEBUG: prediction_db 实例已创建。连接参数示例 (host): {prediction_db.connection_params.get('host')}")
    else:
        print("DEBUG: prediction_db 实例为 None，尽管导入成功。")
except Exception as e: # 将 ImportError 更改为 Exception 以捕获更多可能的初始化错误
    print(f"⚠️ 数据库模块导入失败或初始化失败: {e}")
    import traceback
    traceback.print_exc() # 打印完整的堆栈跟踪
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
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production') # 在生产环境中务必设置一个强随机 SECRET_KEY
# Session/Cookie 配置，确保登录态可用
app.config.update(
    SESSION_COOKIE_NAME='mp_session',
    # 'None' 是为了支持跨站点请求（例如前端与后端域名不同），但要求 Secure=True (HTTPS)
    # 如果前端和后端在同一个主域的不同子域（例如 app.example.com 和 api.example.com），
    # 并且 SESSION_COOKIE_DOMAIN 设置为 '.example.com'，则 Cookie 会在子域间共享。
    SESSION_COOKIE_SAMESITE=os.environ.get('SESSION_COOKIE_SAMESITE', 'None'),
    SESSION_COOKIE_SECURE=True, # 必须为 True，因为 SameSite=None
    # 可选：通过环境变量设置 Cookie 域名（例如 .match-predict.vercel.app，注意开头的点）
    # 如果不设置，则默认为当前请求的域名。在跨子域共享时才需要设置。
    SESSION_COOKIE_DOMAIN=os.environ.get('SESSION_COOKIE_DOMAIN'),
    PERMANENT_SESSION_LIFETIME=timedelta(days=7)
)

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

# 用户认证相关辅助函数
def hash_password(password):
    """密码哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

# 移除了 simple_create_user_db 函数，因为 prediction_db.create_user 已经足够健壮。

def get_current_user():
    """获取当前登录用户"""
    if 'user_id' in session:
        return prediction_db.get_user_by_username(session['username']) if prediction_db else None
    return None

def require_login():
    """检查是否需要登录"""
    return get_current_user() is None

@app.after_request
def add_cors_headers(response):
    """为需要的接口添加基础CORS支持，避免OPTIONS 405。"""
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Vary'] = 'Origin'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        app.logger.debug(f"为请求 {request.path} 添加了CORS头部，Origin: {origin}")
    if request.method == 'OPTIONS':
        response.status_code = 204
        app.logger.debug(f"处理OPTIONS请求: {request.path}")
    return response

@app.route('/api/session/debug')
def session_debug():
    """调试用：查看当前会话是否存在。上线可移除。"""
    return jsonify({
        'logged_in': 'user_id' in session,
        'user_id': session.get('user_id'),
        'username': session.get('username')
    })

@app.route('/')
def index():
    try:
        # 将环境变量传递给前端
        gemini_api_key = os.environ.get('GEMINI_API_KEY', '')
        gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite-preview-06-17')
        
        # 获取当前用户信息
        current_user = get_current_user()
        
        return render_template('index.html', 
                             gemini_api_key=gemini_api_key,
                             gemini_model=gemini_model,
                             current_user=current_user)
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
    """获取中国体育彩票比赛数据 - 仅从数据库获取"""
    try:
        days = request.args.get('days', 3, type=int)
        days = min(max(days, 1), 7)  # 限制在1-7天之间
        
        app.logger.info(f"📊 从数据库获取体彩数据 - 天数: {days}")
        
        if not prediction_db:
            app.logger.error("❌ 数据库未初始化")
            return jsonify({
                'success': False,
                'error': '数据库未配置',
                'message': '数据库连接失败，请联系管理员'
            }), 500
        
        try:
            # 仅从数据库获取
            db_matches = prediction_db.get_daily_matches(days_ahead=days)
            
            if db_matches and len(db_matches) > 0:
                app.logger.info(f"✅ 从数据库获取到 {len(db_matches)} 场比赛")
                
                return jsonify({
                    'success': True,
                    'matches': db_matches,
                    'count': len(db_matches),
                    'message': f'从数据库获取 {len(db_matches)} 场比赛',
                    'source': 'database'
                })
            else:
                app.logger.warning("⚠️ 数据库中没有找到比赛数据")
                
                return jsonify({
                    'success': False,
                    'error': '暂无比赛数据',
                    'message': '数据库中暂无比赛数据，请运行同步脚本更新数据：python scripts/sync_daily_matches.py --days 7'
                }), 404
                
        except Exception as db_error:
            app.logger.error(f"❌ 数据库获取失败: {db_error}")
            
            return jsonify({
                'success': False,
                'error': str(db_error),
                'message': '数据库查询失败，请稍后重试'
            }), 500
            
    except Exception as e:
        app.logger.error(f"❌ 获取体彩数据失败: {e}")
        
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
            print("ERROR: prediction_db 未配置，无法保存预测。") # 添加日志
            return jsonify({
                'success': False,
                'message': '数据库未配置'
            }), 500
        
        # 检查用户登录状态
        current_user = get_current_user()
        if not current_user:
            return jsonify({
                'success': False,
                'message': '请先登录再进行预测'
            }), 401
        
        # 检查用户预测权限
        can_predict = prediction_db.can_user_predict(
            current_user['id'], 
            current_user['user_type'], 
            current_user['daily_predictions_used']
        )
        
        if not can_predict:
            return jsonify({
                'success': False,
                'message': '今日免费预测次数已用完，请升级会员'
            }), 403

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
            print("DEBUG: 尝试保存AI预测...") # 添加日志
            success = prediction_db.save_ai_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        elif prediction_mode == 'classic':
            print("DEBUG: 尝试保存经典模式预测...") # 添加日志
            success = prediction_db.save_classic_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        elif prediction_mode == 'lottery':
            print("DEBUG: 尝试保存彩票预测...") # 添加日志
            success = prediction_db.save_lottery_prediction(
                match_data=match_data,
                prediction_result=prediction_result,
                confidence=confidence,
                ai_analysis=ai_analysis,
                user_ip=user_ip,
                user_id=current_user['id'],
                username=current_user['username']
            )
        else:
            return jsonify({
                'success': False,
                'message': '未知的预测模式'
            }), 400
        
        if success:
            # 增加用户预测次数
            prediction_db.increment_user_predictions(current_user['id'])
            # 重新获取用户数据以更新 daily_predictions_used
            updated_user = prediction_db.get_user_by_username(current_user['username'])
            session['user'] = updated_user # 更新会话中的用户数据
            print("DEBUG: 预测保存成功，用户预测次数已更新。") # 添加日志
            return jsonify({
                'success': True,
                'message': '预测结果已保存',
                'user': updated_user
            }), 200
        else:
            print("ERROR: 预测保存失败。") # 添加日志
            return jsonify({
                'success': False,
                'message': '预测结果保存失败'
            }), 500
            
    except Exception as e:
        print(f"ERROR: 保存预测时发生未预期错误: {e}") # 添加日志
        import traceback
        traceback.print_exc()
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

# 用户认证路由
@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    """用户注册"""
    app.logger.info(f"收到注册请求：{request.json}")
    try:
        if not prediction_db:
            app.logger.error("注册失败: 数据库未配置或初始化失败", exc_info=True)
            return jsonify({'success': False, 'message': '注册失败：数据库服务不可用'}), 500
            
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        # 验证输入
        if not username or len(username) < 3:
            app.logger.warning(f"注册失败: 用户名不符合要求 - {username}")
            return jsonify({'success': False, 'message': '用户名长度至少3个字符'}), 400
        if not email or '@' not in email:
            app.logger.warning(f"注册失败: 邮箱格式无效 - {email}")
            return jsonify({'success': False, 'message': '请输入有效的邮箱地址'}), 400
        if not password or len(password) < 6:
            app.logger.warning(f"注册失败: 密码不符合要求 - {password}")
            return jsonify({'success': False, 'message': '密码长度至少6个字符'}), 400
        
        # 哈希密码
        password_hash = hash_password(password)
        
        # 创建用户
        success = prediction_db.create_user(username, email, password_hash)
        
        if success:
            app.logger.info(f"用户注册成功: {username}")
            resp = jsonify({'success': True, 'message': '注册成功，请登录'})
            # 调试用：设置一个临时测试 Cookie，帮助判断浏览器是否接受 SameSite=None; Secure
            try:
                pass # 移除调试Cookie设置
            except Exception as e:
                app.logger.warning(f"设置测试Cookie失败: {e}", exc_info=True)
                # 忽略设置 Cookie 时的任何异常
                pass
            return resp
        else:
            # create_user 内部已处理 UniqueViolation，这里捕获通用失败
            app.logger.warning(f"用户注册失败: 用户名或邮箱已存在或数据库操作失败 - {username}, {email}")
            return jsonify({'success': False, 'message': '注册失败：用户名或邮箱已存在，或数据库写入失败'}), 409
            
    except Exception as e:
        app.logger.error(f"用户注册失败（捕获到异常）: {e}", exc_info=True) # 打印完整堆栈
        return jsonify({'success': False, 'message': '注册失败，请稍后重试'}), 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    """用户登录"""
    app.logger.info(f"收到登录请求: {request.json}")
    try:
        if not prediction_db:
            app.logger.error("登录失败: 数据库未配置或初始化失败", exc_info=True)
            return jsonify({'success': False, 'message': '登录失败：数据库服务不可用'}), 500
            
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            app.logger.warning("登录失败: 缺少用户名或密码")
            return jsonify({'success': False, 'message': '请输入用户名和密码'}), 400
        
        # 哈希密码
        password_hash = hash_password(password)
        
        # 验证用户
        user = prediction_db.authenticate_user(username, password_hash)
        
        if user:
            # 设置session
            session['user_id'] = user['id']
            session['username'] = user['username']
            session.permanent = True
            
            app.logger.info(f"用户登录成功，设置会话: {username}")
            resp = jsonify({
                'success': True,
                'message': '登录成功',
                'user': {
                    'username': user['username'],
                    'user_type': user['user_type'],
                    'daily_predictions_used': user['daily_predictions_used'],
                    'total_predictions': user['total_predictions']
                }
            })
            # 显式设置 Flask session cookie 值，确保 Set-Cookie 在响应头中可见
            try:
                serializer = app.session_interface.get_signing_serializer(app)
                if serializer:
                    session_cookie_val = serializer.dumps(dict(session))
                    resp.set_cookie(app.config.get('SESSION_COOKIE_NAME', 'mp_session'),
                                    session_cookie_val,
                                    samesite=os.environ.get('SESSION_COOKIE_SAMESITE', 'None'),
                                    secure=True,
                                    httponly=True,
                                    domain=app.config.get('SESSION_COOKIE_DOMAIN'))
                # 额外设置一个非 HttpOnly 的测试 Cookie 便于调试（可见于 DevTools -> Cookies）
                pass # 移除调试Cookie设置
            except Exception as e:
                app.logger.warning(f"设置Cookie失败: {e}", exc_info=True)
                pass
            return resp
        else:
            app.logger.warning(f"用户登录失败: 用户名或密码错误 - {username}")
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
            
    except Exception as e:
        app.logger.error(f"用户登录失败（捕获到异常）: {e}", exc_info=True) # 打印完整堆栈
        return jsonify({'success': False, 'message': '登录失败，请稍后重试'}), 500

@app.route('/api/logout', methods=['POST', 'OPTIONS'])
def logout():
    """用户登出"""
    session.clear()
    return jsonify({'success': True, 'message': '已安全退出'})

@app.route('/api/user/info', methods=['GET'])
def get_user_info():
    """获取用户信息"""
    app.logger.info("收到获取用户信息请求")
    try:
        current_user = get_current_user()
        if not current_user:
            app.logger.warning("获取用户信息失败: 用户未登录")
            return jsonify({'success': False, 'message': '未登录'}), 401
        
        # 确保 prediction_db 可用，get_current_user 已经做了初步检查
        if not prediction_db:
            app.logger.error("获取用户信息失败: 数据库未配置或初始化失败", exc_info=True)
            return jsonify({'success': False, 'message': '获取用户信息失败：数据库服务不可用'}), 500

        # 刷新用户数据以获取最新状态，特别是每日预测次数可能已重置
        user_data_from_db = prediction_db.get_user_by_username(current_user['username'])
        if not user_data_from_db:
            app.logger.error(f"获取用户信息失败: 数据库中未找到用户 {current_user['username']}", exc_info=True)
            # 用户可能已被删除，清理session
            session.clear()
            return jsonify({'success': False, 'message': '用户数据异常，请重新登录'}), 401

        app.logger.info(f"成功获取用户 {user_data_from_db['username']} 信息")
        return jsonify({
            'success': True,
            'user': {
                'username': user_data_from_db['username'],
                'email': user_data_from_db['email'],
                'user_type': user_data_from_db['user_type'],
                'daily_predictions_used': user_data_from_db['daily_predictions_used'],
                'total_predictions': user_data_from_db['total_predictions'],
                'membership_expires': user_data_from_db['membership_expires'].isoformat() if user_data_from_db['membership_expires'] else None
            }
        })
        
    except Exception as e:
        app.logger.error(f"获取用户信息失败（捕获到异常）: {e}", exc_info=True)
        return jsonify({'success': False, 'message': '获取用户信息失败'}), 500

@app.route('/api/user/can-predict', methods=['GET'])
def can_user_predict_api():
    """检查用户是否可以预测"""
    app.logger.info("收到检查用户预测权限请求")
    try:
        current_user = get_current_user()
        if not current_user:
            app.logger.warning("检查预测权限失败: 用户未登录")
            return jsonify({'success': False, 'message': '未登录', 'can_predict': False}), 401
        
        if not prediction_db:
            app.logger.error("检查预测权限失败: 数据库未配置或初始化失败", exc_info=True)
            return jsonify({'success': False, 'message': '检查失败：数据库服务不可用'}), 500

        # 刷新用户数据以获取最新状态，特别是每日预测次数可能已重置
        user_data_from_db = prediction_db.get_user_by_username(current_user['username'])
        if not user_data_from_db:
            app.logger.error(f"检查预测权限失败: 数据库中未找到用户 {current_user['username']}", exc_info=True)
            session.clear()
            return jsonify({'success': False, 'message': '用户数据异常，请重新登录', 'can_predict': False}), 401

        can_predict = prediction_db.can_user_predict(
            user_data_from_db['id'], 
            user_data_from_db['user_type'], 
            user_data_from_db['daily_predictions_used']
        )
        
        remaining = 0
        if user_data_from_db['user_type'] == 'free':
            remaining = max(0, 3 - user_data_from_db['daily_predictions_used'])
        
        app.logger.info(f"用户 {user_data_from_db['username']} 预测权限检查结果: can_predict={can_predict}, remaining={remaining}")
        return jsonify({
            'success': True,
            'can_predict': can_predict,
            'user_type': user_data_from_db['user_type'],
            'daily_used': user_data_from_db['daily_predictions_used'],
            'remaining': remaining
        })
        
    except Exception as e:
        app.logger.error(f"检查预测权限失败（捕获到异常）: {e}", exc_info=True)
        return jsonify({'success': False, 'message': '检查失败'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 
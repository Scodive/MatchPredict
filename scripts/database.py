#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库管理模块
用于保存预测结果到PostgreSQL数据库
"""

import psycopg2
import psycopg2.extras
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import json

# 配置日志
logger = logging.getLogger(__name__)

class PredictionDatabase:
    """预测结果数据库管理"""
    
    def __init__(self):
        logger.info("正在初始化数据库连接参数...")
        self.connection_params = {
            "host": os.getenv("DB_HOST", "dbprovider.ap-southeast-1.clawcloudrun.com"),
            "port": int(os.getenv("DB_PORT", "49674")),
            "database": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASS", "sbdx497p"), # 请务必在线上环境中设置此环境变量
            "sslmode": "prefer"
        }
        self.init_tables()
    
    def connect_to_database(self):
        """连接到PostgreSQL数据库"""
        conn = None # 初始化 conn 为 None
        try:
            conn = psycopg2.connect(**self.connection_params)
            logger.info("数据库连接成功")
            return conn
        except Exception as e:
            logger.error(f"数据库连接失败: {e}，参数: {self.connection_params.get('host')}:{self.connection_params.get('port')}/{self.connection_params.get('database')}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            raise Exception(f"数据库连接失败: {e}")
    
    def init_tables(self):
        """初始化数据库表"""
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            # 创建用户表
            create_users_table = """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                user_type VARCHAR(20) DEFAULT 'free',
                membership_expires DATE,
                daily_predictions_used INTEGER DEFAULT 0,
                last_prediction_date DATE DEFAULT CURRENT_DATE,
                total_predictions INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            """
            
            # 创建预测记录表
            create_predictions_table = """
            CREATE TABLE IF NOT EXISTS match_predictions (
                id SERIAL PRIMARY KEY,
                prediction_id VARCHAR(100) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id),
                username VARCHAR(50),
                prediction_mode VARCHAR(20) NOT NULL,
                home_team VARCHAR(100) NOT NULL,
                away_team VARCHAR(100) NOT NULL,
                league_name VARCHAR(100),
                match_time TIMESTAMP,
                home_odds DECIMAL(6,2),
                draw_odds DECIMAL(6,2),
                away_odds DECIMAL(6,2),
                predicted_result VARCHAR(20),
                prediction_confidence DECIMAL(5,2),
                ai_analysis TEXT,
                user_ip VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actual_result VARCHAR(20),
                actual_score VARCHAR(20),
                is_correct BOOLEAN,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            # 创建每日比赛表
            create_daily_matches_table = """
            CREATE TABLE IF NOT EXISTS daily_matches (
                id SERIAL PRIMARY KEY,
                match_id VARCHAR(100) UNIQUE NOT NULL,
                home_team VARCHAR(100) NOT NULL,
                away_team VARCHAR(100) NOT NULL,
                league_name VARCHAR(100),
                match_date DATE NOT NULL,
                match_time TIME,
                match_datetime TIMESTAMP,
                match_num VARCHAR(20),
                match_status VARCHAR(20),
                home_odds DECIMAL(6,2),
                draw_odds DECIMAL(6,2),
                away_odds DECIMAL(6,2),
                goal_line VARCHAR(10),
                data_source VARCHAR(50) DEFAULT 'china_lottery',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            );
            """
            
            cursor.execute(create_users_table)
            cursor.execute(create_predictions_table)
            cursor.execute(create_daily_matches_table)
            
            # 创建索引
            create_index_sql = [
                # 预测表索引
                "CREATE INDEX IF NOT EXISTS idx_predictions_mode ON match_predictions(prediction_mode);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_created ON match_predictions(created_at);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_teams ON match_predictions(home_team, away_team);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_result ON match_predictions(is_correct);",
                
                # 每日比赛表索引
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_date ON daily_matches(match_date);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_teams ON daily_matches(home_team, away_team);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_league ON daily_matches(league_name);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_status ON daily_matches(match_status);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_active ON daily_matches(is_active);",
                "CREATE INDEX IF NOT EXISTS idx_daily_matches_datetime ON daily_matches(match_datetime);"
            ]
            
            for sql in create_index_sql:
                cursor.execute(sql)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("数据库表初始化成功")
            
        except Exception as e:
            logger.error(f"数据库表初始化失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            raise Exception(f"数据库初始化失败: {e}")
    
    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """
        保存预测结果到数据库
        
        Args:
            prediction_data: 预测数据字典
            
        Returns:
            保存是否成功
        """
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            # 准备插入数据
            insert_sql = """
            INSERT INTO match_predictions (
                prediction_id, prediction_mode, home_team, away_team, league_name,
                match_time, home_odds, draw_odds, away_odds, predicted_result,
                prediction_confidence, ai_analysis, user_ip
            ) VALUES (
                %(prediction_id)s, %(prediction_mode)s, %(home_team)s, %(away_team)s, %(league_name)s,
                %(match_time)s, %(home_odds)s, %(draw_odds)s, %(away_odds)s, %(predicted_result)s,
                %(prediction_confidence)s, %(ai_analysis)s, %(user_ip)s
            ) ON CONFLICT (prediction_id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP,
                predicted_result = EXCLUDED.predicted_result,
                prediction_confidence = EXCLUDED.prediction_confidence,
                ai_analysis = EXCLUDED.ai_analysis;
            """
            
            cursor.execute(insert_sql, prediction_data)
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"预测结果保存成功: {prediction_data.get('prediction_id')}")
            return True
            
        except Exception as e:
            logger.error(f"保存预测结果失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.rollback() # 确保事务回滚
                conn.close()
            return False
    
    def save_ai_prediction(self, match_data: Dict[str, Any], prediction_result: str, 
                          confidence: float, ai_analysis: str, user_ip: str = None,
                          user_id: int = None, username: str = None) -> bool:
        """
        保存AI模式预测结果
        
        Args:
            match_data: 比赛数据
            prediction_result: 预测结果 (主胜/平局/客胜)
            confidence: 预测信心指数 (0-10)
            ai_analysis: AI分析内容
            user_ip: 用户IP
            
        Returns:
            保存是否成功
        """
        try:
            # 提取赔率信息
            odds = match_data.get('odds', {})
            
            # 生成预测ID
            prediction_id = f"ai_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # 解析比赛时间
            match_time = None
            if match_data.get('match_time'):
                try:
                    match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M:%S')
                except:
                    try:
                        match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M')
                    except:
                        pass
            
            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'AI',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time,
                'home_odds': float(odds.get('home_odds', 0)) if odds.get('home_odds') else None,
                'draw_odds': float(odds.get('draw_odds', 0)) if odds.get('draw_odds') else None,
                'away_odds': float(odds.get('away_odds', 0)) if odds.get('away_odds') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': ai_analysis,
                'user_ip': user_ip or 'unknown'
            }
            
            return self.save_prediction(prediction_data)
            
        except Exception as e:
            logger.error(f"保存AI预测失败: {e}")
            return False
    
    def save_classic_prediction(self, match_data: Dict[str, Any], prediction_result: str, 
                               confidence: float, user_ip: str = None,
                               user_id: int = None, username: str = None) -> bool:
        """
        保存经典模式预测结果
        
        Args:
            match_data: 比赛数据
            prediction_result: 预测结果
            confidence: 预测信心指数
            user_ip: 用户IP
            
        Returns:
            保存是否成功
        """
        try:
            prediction_id = f"classic_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'Classic',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': None,
                'home_odds': float(match_data.get('home_odds', 0)) if match_data.get('home_odds') else None,
                'draw_odds': float(match_data.get('draw_odds', 0)) if match_data.get('draw_odds') else None,
                'away_odds': float(match_data.get('away_odds', 0)) if match_data.get('away_odds') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': '经典模式预测',
                'user_ip': user_ip or 'unknown'
            }
            
            return self.save_prediction(prediction_data)
            
        except Exception as e:
            logger.error(f"保存经典预测失败: {e}")
            return False
    
    def save_lottery_prediction(self, match_data: Dict[str, Any], prediction_result: str, 
                               confidence: float, ai_analysis: str, user_ip: str = None,
                               user_id: int = None, username: str = None) -> bool:
        """
        保存彩票模式预测结果
        
        Args:
            match_data: 比赛数据
            prediction_result: 预测结果
            confidence: 预测信心指数
            ai_analysis: AI分析内容
            user_ip: 用户IP
            
        Returns:
            保存是否成功
        """
        try:
            # 提取赔率信息
            odds = match_data.get('odds', {})
            hhad_odds = odds.get('hhad', {})
            
            prediction_id = f"lottery_{match_data.get('match_id', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # 解析比赛时间
            match_time = None
            if match_data.get('match_time'):
                try:
                    match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M:%S')
                except:
                    try:
                        match_time = datetime.strptime(match_data['match_time'], '%Y-%m-%d %H:%M')
                    except:
                        pass
            
            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'Lottery',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time,
                'home_odds': float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                'draw_odds': float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                'away_odds': float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': confidence,
                'ai_analysis': ai_analysis,
                'user_ip': user_ip or 'unknown'
            }
            
            return self.save_prediction(prediction_data)
            
        except Exception as e:
            logger.error(f"保存彩票预测失败: {e}")
            return False
    
    def get_prediction_stats(self) -> Dict[str, Any]:
        """
        获取预测统计信息
        
        Returns:
            统计信息字典
        """
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # 总体统计
            stats_sql = """
            SELECT 
                prediction_mode,
                COUNT(*) as total_predictions,
                COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_predictions,
                ROUND(AVG(prediction_confidence), 2) as avg_confidence
            FROM match_predictions 
            GROUP BY prediction_mode
            ORDER BY prediction_mode;
            """
            
            cursor.execute(stats_sql)
            mode_stats = cursor.fetchall()
            
            # 最近预测
            recent_sql = """
            SELECT home_team, away_team, predicted_result, is_correct, created_at
            FROM match_predictions 
            ORDER BY created_at DESC 
            LIMIT 10;
            """
            
            cursor.execute(recent_sql)
            recent_predictions = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {
                'mode_stats': [dict(row) for row in mode_stats],
                'recent_predictions': [dict(row) for row in recent_predictions]
            }
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {'mode_stats': [], 'recent_predictions': []}
    
    def save_daily_matches(self, matches_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        保存每日比赛数据到数据库
        
        Args:
            matches_data: 比赛数据列表
            
        Returns:
            统计信息字典 {'inserted': 插入数量, 'updated': 更新数量, 'skipped': 跳过数量}
        """
        stats = {'inserted': 0, 'updated': 0, 'skipped': 0}
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            for match in matches_data:
                try:
                    # 解析比赛时间
                    match_datetime = None
                    match_date = None
                    match_time = None
                    
                    if match.get('match_time'):
                        try:
                            match_datetime = datetime.strptime(match['match_time'], '%Y-%m-%d %H:%M:%S')
                            match_date = match_datetime.date()
                            match_time = match_datetime.time()
                        except:
                            try:
                                match_datetime = datetime.strptime(match['match_time'], '%Y-%m-%d %H:%M')
                                match_date = match_datetime.date()
                                match_time = match_datetime.time()
                            except:
                                if match.get('match_date'):
                                    match_date = datetime.strptime(match['match_date'], '%Y-%m-%d').date()
                    
                    # 提取赔率
                    odds = match.get('odds', {})
                    hhad_odds = odds.get('hhad', {})
                    
                    # 检查是否已存在
                    check_sql = "SELECT id FROM daily_matches WHERE match_id = %s"
                    cursor.execute(check_sql, (match.get('match_id'),))
                    existing = cursor.fetchone()
                    
                    if existing:
                        # 更新现有记录
                        update_sql = """
                        UPDATE daily_matches SET
                            home_team = %s,
                            away_team = %s,
                            league_name = %s,
                            match_date = %s,
                            match_time = %s,
                            match_datetime = %s,
                            match_num = %s,
                            match_status = %s,
                            home_odds = %s,
                            draw_odds = %s,
                            away_odds = %s,
                            goal_line = %s,
                            data_source = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE match_id = %s
                        """
                        
                        cursor.execute(update_sql, (
                            match.get('home_team', ''),
                            match.get('away_team', ''),
                            match.get('league_name', ''),
                            match_date,
                            match_time,
                            match_datetime,
                            match.get('match_num', ''),
                            match.get('status', ''),
                            float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                            float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                            float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                            odds.get('goal_line', ''),
                            match.get('source', 'china_lottery'),
                            match.get('match_id')
                        ))
                        stats['updated'] += 1
                        
                    else:
                        # 插入新记录
                        insert_sql = """
                        INSERT INTO daily_matches (
                            match_id, home_team, away_team, league_name,
                            match_date, match_time, match_datetime, match_num,
                            match_status, home_odds, draw_odds, away_odds,
                            goal_line, data_source
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """
                        
                        cursor.execute(insert_sql, (
                            match.get('match_id', ''),
                            match.get('home_team', ''),
                            match.get('away_team', ''),
                            match.get('league_name', ''),
                            match_date,
                            match_time,
                            match_datetime,
                            match.get('match_num', ''),
                            match.get('status', ''),
                            float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                            float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                            float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                            odds.get('goal_line', ''),
                            match.get('source', 'china_lottery')
                        ))
                        stats['inserted'] += 1
                        
                except Exception as match_error:
                    logger.warning(f"保存单场比赛失败: {match_error}")
                    stats['skipped'] += 1
                    continue
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"每日比赛数据保存完成 - 新增:{stats['inserted']}, 更新:{stats['updated']}, 跳过:{stats['skipped']}")
            return stats
            
        except Exception as e:
            logger.error(f"保存每日比赛数据失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.rollback()
                conn.close()
            return stats
    
    def get_daily_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """
        从数据库获取每日比赛数据
        
        Args:
            days_ahead: 未来天数
            
        Returns:
            比赛数据列表
        """
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # 计算日期范围
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            
            query_sql = """
            SELECT 
                match_id, home_team, away_team, league_name,
                match_date, match_time, match_datetime, match_num,
                match_status, home_odds, draw_odds, away_odds,
                goal_line, data_source, updated_at
            FROM daily_matches 
            WHERE match_date >= %s AND match_date <= %s 
            AND is_active = TRUE
            ORDER BY match_datetime ASC, match_date ASC, match_time ASC
            """
            
            cursor.execute(query_sql, (today, end_date))
            results = cursor.fetchall()
            
            # 转换为标准格式
            matches = []
            for row in results:
                match_time_str = ''
                if row['match_datetime']:
                    match_time_str = row['match_datetime'].strftime('%Y-%m-%d %H:%M:%S')
                elif row['match_date'] and row['match_time']:
                    match_time_str = f"{row['match_date']} {row['match_time']}"
                elif row['match_date']:
                    match_time_str = str(row['match_date'])
                
                match_data = {
                    'match_id': row['match_id'],
                    'home_team': row['home_team'],
                    'away_team': row['away_team'],
                    'league_name': row['league_name'],
                    'match_time': match_time_str,
                    'match_date': str(row['match_date']) if row['match_date'] else '',
                    'match_num': row['match_num'],
                    'status': row['match_status'],
                    'source': 'database',
                    'odds': {
                        'hhad': {
                            'h': str(row['home_odds']) if row['home_odds'] else '0',
                            'd': str(row['draw_odds']) if row['draw_odds'] else '0',
                            'a': str(row['away_odds']) if row['away_odds'] else '0'
                        },
                        'goal_line': row['goal_line']
                    }
                }
                matches.append(match_data)
            
            cursor.close()
            conn.close()
            
            logger.info(f"从数据库获取 {len(matches)} 场比赛")
            return matches
            
        except Exception as e:
            logger.error(f"从数据库获取比赛数据失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            return []
    
    def cleanup_old_matches(self, days_to_keep: int = 30) -> int:
        """
        清理旧的比赛数据
        
        Args:
            days_to_keep: 保留天数
            
        Returns:
            删除的记录数
        """
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            cutoff_date = datetime.now().date() - timedelta(days=days_to_keep)
            
            delete_sql = """
            DELETE FROM daily_matches 
            WHERE match_date < %s
            """
            
            cursor.execute(delete_sql, (cutoff_date,))
            deleted_count = cursor.rowcount
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"清理了 {deleted_count} 条旧比赛记录")
            return deleted_count
            
        except Exception as e:
            logger.error(f"清理旧比赛数据失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            return 0
    
    # 用户管理方法
    def create_user(self, username: str, email: str, password_hash: str, user_type: str = 'free') -> bool:
        """创建新用户"""
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            insert_sql = """
            INSERT INTO users (username, email, password_hash, user_type)
            VALUES (%s, %s, %s, %s)
            """
            cursor.execute(insert_sql, (username, email, password_hash, user_type))
            conn.commit()
            
            logger.info(f"用户创建成功: {username}")
            return True
            
        except psycopg2.IntegrityError as e:
            logger.warning(f"用户创建失败，用户名或邮箱已存在: {username}, {email}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.rollback() # 确保事务回滚
                conn.close()
            return False
        except Exception as e:
            logger.error(f"创建用户失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.rollback() # 确保事务回滚
                conn.close()
            return False
    
    def authenticate_user(self, username: str, password_hash: str) -> dict:
        """用户认证"""
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            select_sql = """
            SELECT id, username, email, user_type, membership_expires, 
                   daily_predictions_used, last_prediction_date, total_predictions
            FROM users 
            WHERE username = %s AND password_hash = %s AND is_active = TRUE
            """
            cursor.execute(select_sql, (username, password_hash))
            user_data = cursor.fetchone()
            
            if user_data:
                # 更新最后登录时间
                update_sql = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s"
                cursor.execute(update_sql, (user_data[0],))
                conn.commit()
                
                # 检查是否需要重置每日使用次数
                today = datetime.now().date()
                last_prediction_date = user_data[6]
                
                if last_prediction_date != today:
                    reset_sql = """
                    UPDATE users SET daily_predictions_used = 0, last_prediction_date = %s 
                    WHERE id = %s
                    """
                    cursor.execute(reset_sql, (today, user_data[0]))
                    conn.commit()
                    daily_used = 0
                else:
                    daily_used = user_data[5]
                
                logger.info(f"用户认证成功: {username}")
                return {
                    'id': user_data[0],
                    'username': user_data[1],
                    'email': user_data[2],
                    'user_type': user_data[3],
                    'membership_expires': user_data[4],
                    'daily_predictions_used': daily_used,
                    'total_predictions': user_data[7]
                }
            else:
                logger.warning(f"用户认证失败: 用户名或密码错误 - {username}")
                return None
                
        except Exception as e:
            logger.error(f"用户认证失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            return None
    
    def get_user_by_username(self, username: str) -> dict:
        """根据用户名获取用户信息"""
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            select_sql = """
            SELECT id, username, email, user_type, membership_expires, 
                   daily_predictions_used, last_prediction_date, total_predictions
            FROM users 
            WHERE username = %s AND is_active = TRUE
            """
            cursor.execute(select_sql, (username,))
            user_data = cursor.fetchone()
            
            if user_data:
                return {
                    'id': user_data[0],
                    'username': user_data[1],
                    'email': user_data[2],
                    'user_type': user_data[3],
                    'membership_expires': user_data[4],
                    'daily_predictions_used': user_data[5],
                    'total_predictions': user_data[7]
                }
            return None
            
        except Exception as e:
            logger.error(f"获取用户信息失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.close()
            return None
    
    def increment_user_predictions(self, user_id: int) -> bool:
        """增加用户预测次数"""
        conn = None # 初始化 conn 为 None
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            today = datetime.now().date()
            update_sql = """
            UPDATE users SET 
                daily_predictions_used = daily_predictions_used + 1,
                total_predictions = total_predictions + 1,
                last_prediction_date = %s
            WHERE id = %s
            """
            cursor.execute(update_sql, (today, user_id))
            conn.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"更新用户预测次数失败: {e}")
            if conn: # 只有当 conn 已经被赋值才尝试关闭
                conn.rollback()
                conn.close()
            return False
    
    def can_user_predict(self, user_id: int, user_type: str, daily_used: int) -> bool:
        """检查用户是否可以进行预测"""
        if user_type == 'premium':
            return True
        else:
            return daily_used < 3


# 创建全局数据库实例
prediction_db = PredictionDatabase()


def main():
    """测试函数"""
    try:
        db = PredictionDatabase()
        print("✅ 数据库连接和表创建成功")
        
        # 测试保存AI预测
        test_match = {
            'home_team': '测试主队',
            'away_team': '测试客队',
            'league_name': '测试联赛',
            'match_time': '2025-09-20 15:00:00',
            'odds': {
                'home_odds': '2.10',
                'draw_odds': '3.20',
                'away_odds': '2.80'
            }
        }
        
        success = db.save_ai_prediction(
            match_data=test_match,
            prediction_result='主胜',
            confidence=7.5,
            ai_analysis='这是一个测试预测',
            user_ip='127.0.0.1'
        )
        
        if success:
            print("✅ 测试预测保存成功")
        else:
            print("❌ 测试预测保存失败")
        
        # 获取统计信息
        stats = db.get_prediction_stats()
        print(f"📊 统计信息: {stats}")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")


if __name__ == "__main__":
    main()

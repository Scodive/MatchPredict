#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库管理模块
用于保存预测结果到PostgreSQL数据库
"""

import psycopg2
import psycopg2.extras
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
import json

# 配置日志
logger = logging.getLogger(__name__)

class PredictionDatabase:
    """预测结果数据库管理"""
    
    def __init__(self):
        self.connection_params = {
            "host": "dbprovider.ap-southeast-1.clawcloudrun.com",
            "port": 49674,
            "database": "postgres",
            "user": "postgres",
            "password": "sbdx497p",
            "sslmode": "prefer"
        }
        self.init_tables()
    
    def connect_to_database(self):
        """连接到PostgreSQL数据库"""
        try:
            conn = psycopg2.connect(**self.connection_params)
            logger.info("数据库连接成功")
            return conn
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            raise Exception(f"数据库连接失败: {e}")
    
    def init_tables(self):
        """初始化数据库表"""
        try:
            conn = self.connect_to_database()
            cursor = conn.cursor()
            
            # 创建预测记录表
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS match_predictions (
                id SERIAL PRIMARY KEY,
                prediction_id VARCHAR(100) UNIQUE NOT NULL,
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
            
            cursor.execute(create_table_sql)
            
            # 创建索引
            create_index_sql = [
                "CREATE INDEX IF NOT EXISTS idx_predictions_mode ON match_predictions(prediction_mode);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_created ON match_predictions(created_at);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_teams ON match_predictions(home_team, away_team);",
                "CREATE INDEX IF NOT EXISTS idx_predictions_result ON match_predictions(is_correct);"
            ]
            
            for sql in create_index_sql:
                cursor.execute(sql)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("数据库表初始化成功")
            
        except Exception as e:
            logger.error(f"数据库表初始化失败: {e}")
            raise Exception(f"数据库初始化失败: {e}")
    
    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """
        保存预测结果到数据库
        
        Args:
            prediction_data: 预测数据字典
            
        Returns:
            保存是否成功
        """
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
            return False
    
    def save_ai_prediction(self, match_data: Dict[str, Any], prediction_result: str, 
                          confidence: float, ai_analysis: str, user_ip: str = None) -> bool:
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
                               confidence: float, user_ip: str = None) -> bool:
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
                               confidence: float, ai_analysis: str, user_ip: str = None) -> bool:
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

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库管理模块
已重构为使用 Supabase REST API
"""

import logging
import os
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import json

# 配置日志
logger = logging.getLogger(__name__)

class PredictionDatabase:
    """预测结果数据库管理（Supabase REST API 版本）"""
    
    def __init__(self):
        logger.info("正在初始化 Supabase 连接参数...")
        self.url = os.getenv("SUPABASE_URL", "https://tykkdvxmqmyvdxwgtnbv.supabase.co")
        self.key = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5a2tkdnhtcW15dmR4d2d0bmJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU2NDI3MSwiZXhwIjoyMDg5MTQwMjcxfQ.mWOMK7YfJ_K6Lb2QACk2wpmFllVKSBoKW3usLtiHxxg")
        
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        # 为了兼容性，保留此属性
        self.connection_params = {"host": self.url}

    def _get(self, table: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """发送 GET 请求到 Supabase"""
        url = f"{self.url}/rest/v1/{table}"
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Supabase GET 失败 ({table}): {e}")
            return []

    def _post(self, table: str, data: Dict[str, Any], upsert: bool = False) -> bool:
        """发送 POST 请求到 Supabase"""
        url = f"{self.url}/rest/v1/{table}"
        headers = self.headers.copy()
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates"
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Supabase POST 失败 ({table}): {e}")
            return False

    def _patch(self, table: str, data: Dict[str, Any], params: Dict[str, Any]) -> bool:
        """发送 PATCH 请求到 Supabase"""
        url = f"{self.url}/rest/v1/{table}"
        try:
            response = requests.patch(url, headers=self.headers, json=data, params=params)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Supabase PATCH 失败 ({table}): {e}")
            return False

    def save_prediction(self, prediction_data: Dict[str, Any]) -> bool:
        """保存预测结果到数据表 match_predictions"""
        # 将 datetime 转换为字符串
        data = prediction_data.copy()
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
        
        return self._post("match_predictions", data, upsert=True)

    def save_ai_prediction(self, match_data: Dict[str, Any], prediction_result: str, 
                          confidence: float, ai_analysis: str, user_ip: str = None,
                          user_id: int = None, username: str = None) -> bool:
        """保存AI模式预测结果"""
        try:
            odds = match_data.get('odds', {})
            prediction_id = f"ai_{match_data.get('home_team', '')}_{match_data.get('away_team', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            match_time = None
            if match_data.get('match_time'):
                for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                    try:
                        match_time = datetime.strptime(match_data['match_time'], fmt)
                        break
                    except:
                        continue
            
            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'AI',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time.isoformat() if match_time else None,
                'home_odds': float(odds.get('home_odds', 0)) if odds.get('home_odds') else None,
                'draw_odds': float(odds.get('draw_odds', 0)) if odds.get('draw_odds') else None,
                'away_odds': float(odds.get('away_odds', 0)) if odds.get('away_odds') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': float(confidence),
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
        """保存经典模式预测结果"""
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
                'prediction_confidence': float(confidence),
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
        """保存彩票模式预测结果"""
        try:
            odds = match_data.get('odds', {})
            hhad_odds = odds.get('hhad', {})
            prediction_id = f"lottery_{match_data.get('match_id', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            match_time = None
            if match_data.get('match_time'):
                for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                    try:
                        match_time = datetime.strptime(match_data['match_time'], fmt)
                        break
                    except:
                        continue
            
            prediction_data = {
                'prediction_id': prediction_id,
                'prediction_mode': 'Lottery',
                'user_id': user_id,
                'username': username,
                'home_team': match_data.get('home_team', ''),
                'away_team': match_data.get('away_team', ''),
                'league_name': match_data.get('league_name', ''),
                'match_time': match_time.isoformat() if match_time else None,
                'home_odds': float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                'draw_odds': float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                'away_odds': float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                'predicted_result': prediction_result,
                'prediction_confidence': float(confidence),
                'ai_analysis': ai_analysis,
                'user_ip': user_ip or 'unknown'
            }
            return self.save_prediction(prediction_data)
        except Exception as e:
            logger.error(f"保存彩票预测失败: {e}")
            return False

    def get_prediction_stats(self) -> Dict[str, Any]:
        """获取预测统计信息"""
        try:
            predictions = self._get("match_predictions", params={"select": "prediction_mode,is_correct,prediction_confidence"})
            
            mode_stats = {}
            for p in predictions:
                mode = p['prediction_mode']
                if mode not in mode_stats:
                    mode_stats[mode] = {'total_predictions': 0, 'correct_predictions': 0, 'confidence_sum': 0}
                
                mode_stats[mode]['total_predictions'] += 1
                if p.get('is_correct'):
                    mode_stats[mode]['correct_predictions'] += 1
                mode_stats[mode]['confidence_sum'] += float(p.get('prediction_confidence') or 0)
            
            formatted_stats = []
            for mode, s in mode_stats.items():
                formatted_stats.append({
                    'prediction_mode': mode,
                    'total_predictions': s['total_predictions'],
                    'correct_predictions': s['correct_predictions'],
                    'avg_confidence': round(s['confidence_sum'] / s['total_predictions'], 2) if s['total_predictions'] > 0 else 0
                })

            recent = self._get("match_predictions", params={"order": "created_at.desc", "limit": 10})
            
            return {
                'mode_stats': formatted_stats,
                'recent_predictions': recent
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {'mode_stats': [], 'recent_predictions': []}

    def save_daily_matches(self, matches_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """保存每日比赛数据到数据库"""
        stats = {'inserted': 0, 'updated': 0, 'skipped': 0}
        updates = []
        for match in matches_data:
            try:
                match_datetime = None
                if match.get('match_time'):
                    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                        try:
                            match_datetime = datetime.strptime(match['match_time'], fmt)
                            break
                        except:
                            continue
                
                odds = match.get('odds', {})
                hhad_odds = odds.get('hhad', {})
                
                match_row = {
                    'match_id': match.get('match_id'),
                    'home_team': match.get('home_team', ''),
                    'away_team': match.get('away_team', ''),
                    'league_name': match.get('league_name', ''),
                    'match_date': match_datetime.date().isoformat() if match_datetime else None,
                    'match_time': match_datetime.time().isoformat() if match_datetime else None,
                    'match_datetime': match_datetime.isoformat() if match_datetime else None,
                    'match_num': match.get('match_num', ''),
                    'match_status': match.get('status', ''),
                    'home_odds': float(hhad_odds.get('h', 0)) if hhad_odds.get('h') else None,
                    'draw_odds': float(hhad_odds.get('d', 0)) if hhad_odds.get('d') else None,
                    'away_odds': float(hhad_odds.get('a', 0)) if hhad_odds.get('a') else None,
                    'goal_line': odds.get('goal_line', ''),
                    'data_source': match.get('source', 'china_lottery'),
                    'updated_at': datetime.now().isoformat()
                }
                updates.append(match_row)
            except Exception as e:
                logger.warning(f"处理比赛数据失败: {e}")
                stats['skipped'] += 1

        if updates:
            success = self._post("daily_matches", updates, upsert=True)
            if success:
                stats['inserted'] = len(updates)
            else:
                stats['skipped'] += len(updates)
        
        return stats

    def get_daily_matches(self, days_ahead: int = 7) -> List[Dict[str, Any]]:
        """从数据库获取每日比赛数据"""
        try:
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            
            params = {
                "match_date": f"gte.{today.isoformat()},lte.{end_date.isoformat()}",
                "is_active": "eq.true",
                "order": "match_datetime.asc,match_date.asc,match_time.asc"
            }
            results = self._get("daily_matches", params=params)
            
            matches = []
            for row in results:
                match_data = {
                    'match_id': row['match_id'],
                    'home_team': row['home_team'],
                    'away_team': row['away_team'],
                    'league_name': row['league_name'],
                    'match_time': row.get('match_datetime') or f"{row['match_date']} {row['match_time']}",
                    'match_date': row['match_date'],
                    'match_num': row['match_num'],
                    'status': row['match_status'],
                    'source': 'database',
                    'odds': {
                        'hhad': {
                            'h': str(row['home_odds']),
                            'd': str(row['draw_odds']),
                            'a': str(row['away_odds'])
                        },
                        'goal_line': row['goal_line']
                    }
                }
                matches.append(match_data)
            return matches
        except Exception as e:
            logger.error(f"获取每日比赛失败: {e}")
            return []

    def cleanup_old_matches(self, days_to_keep: int = 30) -> int:
        return 0

    def create_user(self, username: str, email: str, password_hash: str, user_type: str = 'free') -> bool:
        """创建新用户"""
        data = {
            "username": username,
            "email": email,
            "password_hash": password_hash,
            "user_type": user_type,
            "created_at": datetime.now().isoformat(),
            "is_active": True
        }
        return self._post("users", data)

    def authenticate_user(self, username: str, password_hash: str) -> dict:
        """用户认证"""
        params = {
            "username": f"eq.{username}",
            "password_hash": f"eq.{password_hash}",
            "is_active": "eq.true",
            "limit": 1
        }
        users = self._get("users", params=params)
        if users:
            user = users[0]
            self._patch("users", {"last_login": datetime.now().isoformat()}, {"id": f"eq.{user['id']}"})
            
            today = datetime.now().date()
            last_date = user.get('last_prediction_date')
            if last_date and last_date < today.isoformat():
                self._patch("users", {"daily_predictions_used": 0, "last_prediction_date": today.isoformat()}, {"id": f"eq.{user['id']}"})
                user['daily_predictions_used'] = 0
            
            return user
        return None

    def get_user_by_username(self, username: str) -> dict:
        """根据用户名获取用户信息"""
        params = {"username": f"eq.{username}", "is_active": "eq.true", "limit": 1}
        users = self._get("users", params=params)
        return users[0] if users else None

    def increment_user_predictions(self, user_id: int) -> bool:
        """增加用户预测次数"""
        params = {"id": f"eq.{user_id}", "limit": 1}
        users = self._get("users", params=params)
        if users:
            user = users[0]
            data = {
                "daily_predictions_used": user['daily_predictions_used'] + 1,
                "total_predictions": (user.get('total_predictions') or 0) + 1,
                "last_prediction_date": datetime.now().date().isoformat()
            }
            return self._patch("users", data, {"id": f"eq.{user_id}"})
        return False

    def can_user_predict(self, user_id: int, user_type: str, daily_used: int) -> bool:
        """检查用户是否可以进行预测"""
        return user_type == 'premium' or daily_used < 3

# 创建全局数据库实例
prediction_db = PredictionDatabase()

if __name__ == "__main__":
    # 基础连通性测试
    print(f"测试 Supabase URL: {prediction_db.url}")
    stats = prediction_db.get_prediction_stats()
    print(f"✅ 统计数据获取成功。近期预测场数: {len(stats['recent_predictions'])}")

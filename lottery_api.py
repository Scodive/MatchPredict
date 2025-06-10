#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
中国体育彩票数据接入模块
支持从中国体育彩票官方API获取比赛数据和赔率
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

class ChinaSportsLotteryAPI:
    """中国体育彩票API接口类"""
    
    def __init__(self):
        self.base_url = "https://webapi.sporttery.cn"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Referer': 'https://www.sporttery.cn/'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def get_match_list(self, days_ahead: int = 7) -> List[Dict]:
        """
        获取未来几天的比赛列表
        
        Args:
            days_ahead: 获取未来几天的比赛，默认7天
            
        Returns:
            比赛列表
        """
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchList.qry"
            
            matches = []
            for i in range(days_ahead):
                date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
                
                params = {
                    'poolCode': 'hhad',  # 胜平负
                    'date': date
                }
                
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                if data.get('success') and data.get('value'):
                    day_matches = data['value'].get('matchList', [])
                    matches.extend(day_matches)
                    
                time.sleep(0.5)  # 避免频繁请求
            
            self.logger.info(f"获取到 {len(matches)} 场比赛")
            return matches
            
        except Exception as e:
            self.logger.error(f"获取比赛列表失败: {e}")
            return []
    
    def get_match_odds(self, match_id: str) -> Dict:
        """
        获取指定比赛的所有玩法赔率
        
        Args:
            match_id: 比赛ID
            
        Returns:
            包含所有玩法赔率的字典
        """
        try:
            odds_data = {}
            
            # 胜平负
            hhad_odds = self._get_hhad_odds(match_id)
            if hhad_odds:
                odds_data['hhad'] = hhad_odds
            
            # 让球胜平负
            haad_odds = self._get_haad_odds(match_id)
            if haad_odds:
                odds_data['haad'] = haad_odds
            
            # 比分
            score_odds = self._get_score_odds(match_id)
            if score_odds:
                odds_data['score'] = score_odds
            
            # 总进球数
            goal_odds = self._get_goal_odds(match_id)
            if goal_odds:
                odds_data['goal'] = goal_odds
            
            # 半全场
            half_full_odds = self._get_half_full_odds(match_id)
            if half_full_odds:
                odds_data['half_full'] = half_full_odds
            
            return odds_data
            
        except Exception as e:
            self.logger.error(f"获取比赛 {match_id} 赔率失败: {e}")
            return {}
    
    def _get_hhad_odds(self, match_id: str) -> Optional[Dict]:
        """获取胜平负赔率"""
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchOdds.qry"
            params = {
                'poolCode': 'hhad',
                'matchId': match_id
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and data.get('value'):
                return data['value']
            
            return None
            
        except Exception as e:
            self.logger.error(f"获取胜平负赔率失败: {e}")
            return None
    
    def _get_haad_odds(self, match_id: str) -> Optional[Dict]:
        """获取让球胜平负赔率"""
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchOdds.qry"
            params = {
                'poolCode': 'haad',
                'matchId': match_id
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and data.get('value'):
                return data['value']
            
            return None
            
        except Exception as e:
            self.logger.error(f"获取让球胜平负赔率失败: {e}")
            return None
    
    def _get_score_odds(self, match_id: str) -> Optional[Dict]:
        """获取比分赔率"""
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchOdds.qry"
            params = {
                'poolCode': 'crs',
                'matchId': match_id
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and data.get('value'):
                return data['value']
            
            return None
            
        except Exception as e:
            self.logger.error(f"获取比分赔率失败: {e}")
            return None
    
    def _get_goal_odds(self, match_id: str) -> Optional[Dict]:
        """获取总进球数赔率"""
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchOdds.qry"
            params = {
                'poolCode': 'ttg',
                'matchId': match_id
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and data.get('value'):
                return data['value']
            
            return None
            
        except Exception as e:
            self.logger.error(f"获取总进球数赔率失败: {e}")
            return None
    
    def _get_half_full_odds(self, match_id: str) -> Optional[Dict]:
        """获取半全场赔率"""
        try:
            url = f"{self.base_url}/gateway/jc/football/getMatchOdds.qry"
            params = {
                'poolCode': 'hhft',
                'matchId': match_id
            }
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success') and data.get('value'):
                return data['value']
            
            return None
            
        except Exception as e:
            self.logger.error(f"获取半全场赔率失败: {e}")
            return None
    
    def get_formatted_matches(self, days_ahead: int = 7) -> List[Dict]:
        """
        获取格式化的比赛数据
        
        Args:
            days_ahead: 获取未来几天的比赛
            
        Returns:
            格式化的比赛数据列表
        """
        raw_matches = self.get_match_list(days_ahead)
        formatted_matches = []
        
        for match in raw_matches:
            try:
                # 获取比赛基本信息
                match_info = {
                    'match_id': match.get('matchId'),
                    'league_name': match.get('leagueName'),
                    'home_team': match.get('homeTeamName'),
                    'away_team': match.get('awayTeamName'),
                    'match_time': match.get('matchTime'),
                    'match_date': match.get('matchDate'),
                    'status': match.get('status')
                }
                
                # 获取赔率数据
                odds_data = self.get_match_odds(match_info['match_id'])
                match_info['odds'] = odds_data
                
                formatted_matches.append(match_info)
                
                time.sleep(0.2)  # 避免请求过于频繁
                
            except Exception as e:
                self.logger.error(f"处理比赛数据失败: {e}")
                continue
        
        return formatted_matches
    
    def save_matches_to_json(self, matches: List[Dict], filename: str = None):
        """
        保存比赛数据到JSON文件
        
        Args:
            matches: 比赛数据列表
            filename: 文件名，默认使用当前时间
        """
        if filename is None:
            filename = f"china_lottery_matches_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(matches, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"比赛数据已保存到 {filename}")
            
        except Exception as e:
            self.logger.error(f"保存数据失败: {e}")

# 使用示例
if __name__ == "__main__":
    api = ChinaSportsLotteryAPI()
    
    # 获取未来7天的比赛
    matches = api.get_formatted_matches(7)
    
    # 保存到文件
    api.save_matches_to_json(matches)
    
    print(f"获取到 {len(matches)} 场比赛数据") 
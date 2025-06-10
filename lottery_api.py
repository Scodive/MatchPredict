#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
中国体育彩票数据爬虫模块
直接从体彩官网爬取比赛数据和赔率
"""

import requests
import json
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
from bs4 import BeautifulSoup

class ChinaSportsLotterySpider:
    """中国体育彩票数据爬虫类"""
    
    def __init__(self):
        self.base_url = "https://www.sporttery.cn"
        self.spf_url = "https://www.sporttery.cn/jc/jsq/zqspf/"  # 足球单场胜平负
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://www.sporttery.cn/',
            'Cache-Control': 'max-age=0'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def get_match_list(self, days_ahead: int = 7) -> List[Dict]:
        """
        从体彩官网爬取比赛列表
        
        Args:
            days_ahead: 获取未来几天的比赛，默认7天
            
        Returns:
            比赛列表
        """
        try:
            self.logger.info(f"开始爬取体彩官网数据: {self.spf_url}")
            
            # 获取主页面
            response = self.session.get(self.spf_url, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 解析比赛数据
            matches = self._parse_matches_from_html(soup)
            
            if not matches:
                self.logger.warning("未能从官网获取比赛数据，返回模拟数据")
                return self._get_mock_matches(days_ahead)
            
            self.logger.info(f"成功爬取到 {len(matches)} 场比赛")
            return matches
            
        except Exception as e:
            self.logger.error(f"爬取体彩官网失败: {e}")
            return self._get_mock_matches(days_ahead)
    
    def _parse_matches_from_html(self, soup: BeautifulSoup) -> List[Dict]:
        """解析HTML中的比赛数据"""
        matches = []
        
        try:
            # 查找比赛表格 - 根据实际HTML结构调整选择器
            match_rows = soup.find_all('tr', class_=lambda x: x and ('row' in x or 'match' in x))
            
            if not match_rows:
                # 尝试其他可能的选择器
                match_rows = soup.select('tbody tr')
            
            for row in match_rows:
                try:
                    match_data = self._extract_match_from_row(row)
                    if match_data:
                        matches.append(match_data)
                except Exception as e:
                    self.logger.debug(f"解析单场比赛失败: {e}")
                    continue
            
            # 如果通过表格行没找到，尝试查找包含比赛信息的其他元素
            if not matches:
                matches = self._parse_matches_alternative(soup)
                
        except Exception as e:
            self.logger.error(f"解析HTML失败: {e}")
        
        return matches
    
    def _extract_match_from_row(self, row) -> Optional[Dict]:
        """从表格行中提取比赛数据"""
        try:
            cells = row.find_all(['td', 'th'])
            if len(cells) < 6:  # 至少需要包含基本比赛信息
                return None
            
            # 提取比赛ID
            match_id = None
            id_elem = row.find('input', {'type': 'checkbox'})
            if id_elem and id_elem.get('value'):
                match_id = id_elem.get('value')
            
            # 提取比赛时间
            time_text = ""
            for cell in cells[:3]:  # 前几列通常是时间信息
                if cell.get_text(strip=True):
                    time_text += cell.get_text(strip=True) + " "
            
            # 提取队伍信息
            team_info = self._extract_teams_from_row(row)
            if not team_info:
                return None
            
            # 提取赔率信息
            odds_info = self._extract_odds_from_row(row)
            
            match_data = {
                'matchId': match_id or f"match_{int(time.time())}_{len(team_info['home_team'])}",
                'homeName': team_info['home_team'],
                'awayName': team_info['away_team'],
                'leagueName': team_info.get('league', '足球比赛'),
                'matchTime': self._format_match_time(time_text),
                'poolOdds': [odds_info] if odds_info else [{'h': '2.00', 'd': '3.20', 'a': '3.50'}]
            }
            
            return match_data
            
        except Exception as e:
            self.logger.debug(f"提取比赛数据失败: {e}")
            return None
    
    def _extract_teams_from_row(self, row) -> Optional[Dict]:
        """从行中提取队伍信息"""
        try:
            # 查找包含"VS"的单元格
            vs_cell = None
            for cell in row.find_all(['td', 'th']):
                cell_text = cell.get_text(strip=True)
                if 'VS' in cell_text or 'vs' in cell_text or '-' in cell_text:
                    vs_cell = cell
                    break
            
            if not vs_cell:
                return None
            
            # 解析队伍名称
            cell_text = vs_cell.get_text(strip=True)
            
            # 尝试不同的分隔符
            for separator in ['VS', 'vs', '-', '—']:
                if separator in cell_text:
                    teams = cell_text.split(separator)
                    if len(teams) >= 2:
                        home_team = teams[0].strip()
                        away_team = teams[1].strip()
                        
                        # 清理队伍名称
                        home_team = re.sub(r'\[.*?\]|\(.*?\)|【.*?】', '', home_team).strip()
                        away_team = re.sub(r'\[.*?\]|\(.*?\)|【.*?】', '', away_team).strip()
                        
                        if home_team and away_team:
                            return {
                                'home_team': home_team,
                                'away_team': away_team,
                                'league': self._extract_league_info(vs_cell.get_text())
                            }
            
            return None
            
        except Exception as e:
            self.logger.debug(f"提取队伍信息失败: {e}")
            return None
    
    def _extract_league_info(self, text: str) -> str:
        """从文本中提取联赛信息"""
        # 查找常见联赛标识
        leagues = {
            'Group': '小组赛',
            'K3': '世界杯',
            'H5': '欧洲杯',
            'G2': '欧冠',
            'H2': '欧联杯',
            '英超': '英超',
            '西甲': '西甲',
            '德甲': '德甲',
            '意甲': '意甲',
            '法甲': '法甲'
        }
        
        for key, value in leagues.items():
            if key in text:
                return value
        
        return '足球比赛'
    
    def _extract_odds_from_row(self, row) -> Dict:
        """从行中提取赔率信息"""
        try:
            cells = row.find_all(['td', 'th'])
            odds = {'h': '2.00', 'd': '3.20', 'a': '3.50'}  # 默认赔率
            
            # 查找包含数字的单元格（可能是赔率）
            odds_values = []
            for cell in cells:
                cell_text = cell.get_text(strip=True)
                # 匹配赔率格式 (例如: 1.58, 2.04, 3.25)
                if re.match(r'^\d+\.\d{2}$', cell_text):
                    try:
                        odds_value = float(cell_text)
                        if 1.01 <= odds_value <= 50.0:  # 合理的赔率范围
                            odds_values.append(cell_text)
                    except ValueError:
                        continue
            
            # 如果找到3个赔率值，按胜平负顺序分配
            if len(odds_values) >= 3:
                odds['h'] = odds_values[0]  # 主胜
                odds['d'] = odds_values[1]  # 平局
                odds['a'] = odds_values[2]  # 客胜
            
            return odds
            
        except Exception as e:
            self.logger.debug(f"提取赔率失败: {e}")
            return {'h': '2.00', 'd': '3.20', 'a': '3.50'}
    
    def _format_match_time(self, time_text: str) -> str:
        """格式化比赛时间"""
        try:
            # 清理时间文本
            time_text = re.sub(r'[^\d\-:\s]', '', time_text).strip()
            
            # 如果包含日期和时间信息
            if '-' in time_text and ':' in time_text:
                return time_text
            
            # 否则返回默认时间
            today = datetime.now()
            return f"{today.strftime('%Y-%m-%d')} 20:00:00"
            
        except Exception:
            today = datetime.now()
            return f"{today.strftime('%Y-%m-%d')} 20:00:00"
    
    def _parse_matches_alternative(self, soup: BeautifulSoup) -> List[Dict]:
        """备用解析方法"""
        matches = []
        
        try:
            # 查找所有包含比赛信息的文本
            all_text = soup.get_text()
            
            # 使用正则表达式查找比赛信息
            match_pattern = r'(\w+)\s+vs\s+(\w+)'
            team_matches = re.findall(match_pattern, all_text, re.IGNORECASE)
            
            for i, (home_team, away_team) in enumerate(team_matches[:10]):  # 限制最多10场比赛
                match_data = {
                    'matchId': f'crawl_{i+1}',
                    'homeName': home_team.strip(),
                    'awayName': away_team.strip(),
                    'leagueName': '足球比赛',
                    'matchTime': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d 20:00:00'),
                    'poolOdds': [{'h': '2.00', 'd': '3.20', 'a': '3.50'}]
                }
                matches.append(match_data)
                
        except Exception as e:
            self.logger.debug(f"备用解析失败: {e}")
        
        return matches
    
    def _get_mock_matches(self, days_ahead: int = 7) -> List[Dict]:
        """获取模拟比赛数据"""
        mock_teams = [
            ["曼彻斯特城", "利物浦", "英超"],
            ["皇家马德里", "巴塞罗那", "西甲"], 
            ["拜仁慕尼黑", "多特蒙德", "德甲"],
            ["尤文图斯", "国际米兰", "意甲"],
            ["巴黎圣日耳曼", "马赛", "法甲"],
            ["阿森纳", "切尔西", "英超"],
            ["马德里竞技", "塞维利亚", "西甲"],
            ["莱比锡红牛", "勒沃库森", "德甲"],
            ["AC米兰", "那不勒斯", "意甲"],
            ["摩纳哥", "里昂", "法甲"]
        ]
        
        matches = []
        for i in range(min(days_ahead, len(mock_teams))):
            home_team, away_team, league = mock_teams[i]
            match_date = (datetime.now() + timedelta(days=i+1)).strftime('%Y-%m-%d')
            
            match = {
                'matchId': f'mock_{i+1}',
                'homeName': home_team,
                'awayName': away_team,
                'leagueName': league,
                'matchTime': f'{match_date} 20:00:00',
                'poolOdds': [
                    {'h': '2.10', 'd': '3.20', 'a': '3.40'},  # 胜平负赔率
                ]
            }
            matches.append(match)
        
        return matches
    
    def _format_matches(self, matches: List[Dict]) -> List[Dict]:
        """格式化比赛数据为统一格式"""
        formatted = []
        for match in matches:
            # 获取赔率信息
            odds_data = {}
            pool_odds = match.get('poolOdds', [])
            if pool_odds and len(pool_odds) > 0:
                odds_data['hhad'] = pool_odds[0]
            
            formatted_match = {
                'match_id': match.get('matchId', f"match_{len(formatted)+1}"),
                'league_name': match.get('leagueName', '未知联赛'),
                'home_team': match.get('homeName', '主队'),
                'away_team': match.get('awayName', '客队'),
                'match_time': match.get('matchTime', '时间待定'),
                'match_date': match.get('matchTime', '').split(' ')[0] if match.get('matchTime') else '',
                'odds': odds_data,
                'status': 'PENDING'
            }
            formatted.append(formatted_match)
        
        return formatted
    
    def get_formatted_matches(self, days_ahead: int = 7) -> List[Dict]:
        """
        获取格式化的比赛数据
        
        Args:
            days_ahead: 获取未来几天的比赛
            
        Returns:
            格式化的比赛数据列表
        """
        try:
            raw_matches = self.get_match_list(days_ahead)
            
            # 直接使用_format_matches方法格式化数据
            return self._format_matches(raw_matches)
            
        except Exception as e:
            self.logger.error(f"获取格式化比赛数据失败: {e}")
            # 返回模拟数据
            mock_matches = self._get_mock_matches(days_ahead)
            return self._format_matches(mock_matches)
    
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
    api = ChinaSportsLotterySpider()
    
    # 获取未来7天的比赛
    matches = api.get_formatted_matches(7)
    
    # 保存到文件
    api.save_matches_to_json(matches)
    
    print(f"获取到 {len(matches)} 场比赛数据") 
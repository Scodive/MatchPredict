#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于大模型的足球比赛智能分析预测模块
集成多种AI模型进行比赛预测
"""

import json
import logging
import time
import random
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import requests

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SimpleMatchAnalysis:
    """简化的比赛分析结果"""
    match_id: str
    home_team: str
    away_team: str
    league_name: str
    ai_analysis: str  # 直接的AI文本分析
    home_odds: float
    draw_odds: float  
    away_odds: float

class AIFootballPredictor:
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash-exp"):
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
        
    def analyze_matches(self, matches: List[Dict[str, Any]]) -> List[SimpleMatchAnalysis]:
        """分析比赛列表，为每场比赛生成独立的AI分析"""
        analyses = []
        
        for match in matches:
            try:
                analysis = self._analyze_single_match(match)
                if analysis:
                    analyses.append(analysis)
            except Exception as e:
                logger.error(f"分析比赛失败 {match.get('home_team', '')} vs {match.get('away_team', '')}: {e}")
                # 创建错误分析
                analyses.append(self._create_error_analysis(match, str(e)))
                
        return analyses
    
    def _analyze_single_match(self, match: Dict[str, Any]) -> Optional[SimpleMatchAnalysis]:
        """分析单场比赛"""
        # 提取比赛信息
        home_team = match.get('home_team', '')
        away_team = match.get('away_team', '')
        league_name = match.get('league_name', '未知联赛')
        
        # 提取赔率
        odds = match.get('odds', {})
        hhad_odds = odds.get('hhad', {})
        home_odds = float(hhad_odds.get('h', 2.0))
        draw_odds = float(hhad_odds.get('d', 3.2))
        away_odds = float(hhad_odds.get('a', 2.8))
        
        # 生成详细的prompt
        prompt = f"""请详细分析这场足球比赛并给出完整预测：

比赛：{home_team} vs {away_team}
联赛：{league_name}
赔率：主胜 {home_odds} | 平局 {draw_odds} | 客胜 {away_odds}

请按以下格式提供详细预测：

**一、比赛分析**
（考虑两队实力、近期状态、历史对战、主客场优势等因素）

**二、胜平负预测**
推荐结果：[主胜/平局/客胜]
推荐理由：
信心指数：[1-10]

**三、比分预测**
最可能比分：
其他可能比分：

**四、半场胜平负预测**
半场结果：[主胜/平局/客胜]
全场结果：[主胜/平局/客胜]
半全场组合：

**五、进球数预测**
总进球数：[0-1球/2-3球/4球以上]
主队进球：
客队进球：

**六、其他分析**
- 大小球分析
- 亚盘分析
- 风险提示

请用中文回答，保持专业分析水准。"""

        # 调用AI模型
        ai_response = self._call_ai_model(prompt)
        
        if ai_response:
            return SimpleMatchAnalysis(
                match_id=match.get('match_id', f"match_{int(time.time())}"),
                home_team=home_team,
                away_team=away_team,
                league_name=league_name,
                ai_analysis=ai_response,
                home_odds=home_odds,
                draw_odds=draw_odds,
                away_odds=away_odds
            )
        
        return None
    
    def _create_error_analysis(self, match: Dict[str, Any], error_msg: str) -> SimpleMatchAnalysis:
        """创建错误情况下的分析"""
        return SimpleMatchAnalysis(
            match_id=match.get('match_id', f"error_{int(time.time())}"),
            home_team=match.get('home_team', '未知'),
            away_team=match.get('away_team', '未知'),
            league_name=match.get('league_name', '未知联赛'),
            ai_analysis=f"AI分析暂时无法获取，请稍后重试。\n\n错误信息：{error_msg}",
            home_odds=2.0,
            draw_odds=3.2,
            away_odds=2.8
        )
    
    def _call_ai_model(self, prompt: str) -> Optional[str]:
        """调用Gemini AI模型"""
        url = f"{self.base_url}/{self.model_name}:generateContent"
        
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1000
            }
        }
        
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                logger.info(f"调用Gemini API (尝试 {attempt + 1}/{max_retries})")
                
                response = requests.post(
                    url, 
                    headers=headers, 
                    json=payload, 
                    timeout=30
                )
                
                logger.info(f"API响应状态码: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if 'candidates' in data and len(data['candidates']) > 0:
                        content = data['candidates'][0]['content']['parts'][0]['text']
                        logger.info("成功获取AI分析")
                        return content.strip()
                    else:
                        logger.warning("API响应中没有找到有效内容")
                        return None
                
                elif response.status_code == 429:
                    # 速率限制
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"API速率限制，等待 {delay:.2f} 秒后重试")
                    time.sleep(delay)
                    continue
                    
                else:
                    logger.error(f"API请求失败: {response.status_code} - {response.text}")
                    if attempt == max_retries - 1:
                        return None
                    
            except requests.exceptions.Timeout:
                logger.warning(f"请求超时 (尝试 {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (attempt + 1))
                    continue
                else:
                    return None
                    
            except Exception as e:
                logger.error(f"调用AI模型时发生错误: {e}")
                if attempt < max_retries - 1:
                    time.sleep(base_delay * (attempt + 1))
                    continue
                else:
                    return None
        
        return None

# 使用示例
if __name__ == "__main__":
    # 初始化预测器
    import os
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("请设置GEMINI_API_KEY环境变量")
        exit(1)
    predictor = AIFootballPredictor(api_key)
    
    # 示例比赛数据
    sample_match = {
        'match_id': '12345',
        'home_team': '曼城',
        'away_team': '利物浦',
        'league_name': '英超',
        'odds': {
            'hhad': {'h': '2.10', 'd': '3.50', 'a': '2.80'}
        }
    }
    
    # 分析比赛
    analysis = predictor.analyze_matches([sample_match])
    
    for analysis in analysis:
        print(f"比赛: {analysis.home_team} vs {analysis.away_team}")
        print(f"AI分析: {analysis.ai_analysis}")
        print(f"赔率: 主胜 {analysis.home_odds}, 平局 {analysis.draw_odds}, 客胜 {analysis.away_odds}") 
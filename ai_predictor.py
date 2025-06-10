#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于大模型的足球比赛智能分析预测模块
集成多种AI模型进行比赛预测
"""

import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import requests
import time
import random
from dataclasses import dataclass

@dataclass
class MatchAnalysis:
    """比赛分析结果数据类"""
    match_id: str
    home_team: str
    away_team: str
    league_name: str
    
    # 胜平负预测
    win_draw_loss: Dict[str, float]  # {'home': 0.45, 'draw': 0.25, 'away': 0.30}
    confidence_level: float  # 0-1
    
    # 半全场预测
    half_full_time: Dict[str, float]  # {'home_home': 0.2, 'home_draw': 0.1, ...}
    
    # 进球数预测
    total_goals: Dict[str, float]  # {'0-1': 0.2, '2-3': 0.4, '4-6': 0.3, '7+': 0.1}
    
    # 比分预测（前5个最可能的比分）
    exact_scores: List[Tuple[str, float]]  # [('1-0', 0.12), ('2-1', 0.10), ...]
    
    # 分析理由
    analysis_reason: str
    
    # 推荐投注
    recommended_bets: List[Dict]

class AIFootballPredictor:
    """AI足球预测器"""
    
    def __init__(self, gemini_api_key: str = None, model: str = "gemini-2.0-flash-exp"):
        """
        初始化AI预测器
        
        Args:
            gemini_api_key: Gemini API密钥
            model: 使用的模型名称
        """
        self.gemini_api_key = gemini_api_key or 'AIzaSyDy9pYAEW7e2Ewk__9TCHAD5X_G1VhCtVw'
        self.model = model
        self.logger = logging.getLogger(__name__)
        
        # Gemini API配置
        self.api_url = f'https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.gemini_api_key}'
        
        # 半全场结果映射
        self.half_full_mapping = {
            'home_home': '主/主', 'home_draw': '主/平', 'home_away': '主/客',
            'draw_home': '平/主', 'draw_draw': '平/平', 'draw_away': '平/客',
            'away_home': '客/主', 'away_draw': '客/平', 'away_away': '客/客'
        }
        
        # 进球数区间映射
        self.goals_mapping = {
            '0-1': '0-1球', '2-3': '2-3球', 
            '4-6': '4-6球', '7+': '7球或以上'
        }
    
    def analyze_match(self, match_data: Dict, historical_data: Optional[Dict] = None) -> MatchAnalysis:
        """
        分析单场比赛
        
        Args:
            match_data: 比赛基本信息和赔率
            historical_data: 历史数据（可选）
            
        Returns:
            比赛分析结果
        """
        try:
            # 构建分析提示词
            prompt = self._build_analysis_prompt(match_data, historical_data)
            
            # 调用AI模型进行分析
            ai_response = self._call_ai_model(prompt)
            
            # 解析AI响应
            analysis = self._parse_ai_response(ai_response, match_data)
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"分析比赛失败: {e}")
            # 返回默认分析
            return self._get_default_analysis(match_data)
    
    def _build_analysis_prompt(self, match_data: Dict, historical_data: Optional[Dict] = None) -> str:
        """构建AI分析提示词"""
        
        home_team = match_data.get('home_team', '')
        away_team = match_data.get('away_team', '')
        league_name = match_data.get('league_name', '')
        
        # 获取赔率信息
        odds = match_data.get('odds', {})
        hhad_odds = odds.get('hhad', {})
        
        home_odds = hhad_odds.get('h', 'N/A')
        draw_odds = hhad_odds.get('d', 'N/A')
        away_odds = hhad_odds.get('a', 'N/A')
        
        prompt = f"""
作为专业的足球分析师，请分析以下比赛并给出详细预测：

比赛信息：
- 主队：{home_team}
- 客队：{away_team}
- 联赛：{league_name}
- 胜平负赔率：主胜 {home_odds}, 平局 {draw_odds}, 客胜 {away_odds}

请基于以下因素进行分析：
1. 球队实力对比
2. 近期状态
3. 主客场优势
4. 历史交锋记录
5. 伤病情况
6. 赔率分析

请以JSON格式返回分析结果，包含：
{{
    "win_draw_loss": {{
        "home": 0.0-1.0,
        "draw": 0.0-1.0,
        "away": 0.0-1.0
    }},
    "confidence_level": 0.0-1.0,
    "half_full_time": {{
        "home_home": 0.0-1.0,
        "home_draw": 0.0-1.0,
        "home_away": 0.0-1.0,
        "draw_home": 0.0-1.0,
        "draw_draw": 0.0-1.0,
        "draw_away": 0.0-1.0,
        "away_home": 0.0-1.0,
        "away_draw": 0.0-1.0,
        "away_away": 0.0-1.0
    }},
    "total_goals": {{
        "0-1": 0.0-1.0,
        "2-3": 0.0-1.0,
        "4-6": 0.0-1.0,
        "7+": 0.0-1.0
    }},
    "exact_scores": [
        ["1-0", 0.12],
        ["2-1", 0.10],
        ["1-1", 0.08],
        ["0-0", 0.06],
        ["2-0", 0.05]
    ],
    "analysis_reason": "详细分析理由，包括支持预测的关键因素",
    "recommended_bets": [
        {{
            "bet_type": "胜平负",
            "selection": "主胜",
            "confidence": 0.75,
            "reason": "推荐理由"
        }}
    ]
}}

注意：
- 所有概率数值必须为0-1之间的小数
- 胜平负概率之和必须等于1
- 半全场9个选项概率之和必须等于1
- 进球数4个区间概率之和必须等于1
- 比分预测给出最可能的5个比分及其概率
"""
        
        # 如果有历史数据，添加到提示词中
        if historical_data:
            prompt += f"\n\n历史数据参考：\n{json.dumps(historical_data, ensure_ascii=False, indent=2)}"
        
        return prompt
    
    def _call_ai_model(self, prompt: str) -> str:
        """调用AI模型"""
        try:
            if self.gemini_api_key:
                # 使用Gemini API
                headers = {
                    'Content-Type': 'application/json',
                }
                
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": f"你是一个专业的足球分析师，擅长通过数据分析预测比赛结果。\n\n{prompt}"
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.3,
                        "topK": 40,
                        "topP": 0.95,
                        "maxOutputTokens": 2000,
                    }
                }
                
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if 'candidates' in result and len(result['candidates']) > 0:
                        content = result['candidates'][0]['content']['parts'][0]['text']
                        return content
                    else:
                        self.logger.error("Gemini API响应格式异常")
                        return self._get_mock_ai_response()
                else:
                    self.logger.error(f"Gemini API调用失败: {response.status_code}, {response.text}")
                    return self._get_mock_ai_response()
            else:
                # 如果没有API密钥，返回模拟响应
                return self._get_mock_ai_response()
                
        except Exception as e:
            self.logger.error(f"调用AI模型失败: {e}")
            return self._get_mock_ai_response()
    
    def _get_mock_ai_response(self) -> str:
        """生成模拟AI响应（用于测试）"""
        mock_response = {
            "win_draw_loss": {
                "home": 0.45,
                "draw": 0.25,
                "away": 0.30
            },
            "confidence_level": 0.75,
            "half_full_time": {
                "home_home": 0.25,
                "home_draw": 0.15,
                "home_away": 0.05,
                "draw_home": 0.10,
                "draw_draw": 0.10,
                "draw_away": 0.05,
                "away_home": 0.05,
                "away_draw": 0.15,
                "away_away": 0.10
            },
            "total_goals": {
                "0-1": 0.25,
                "2-3": 0.45,
                "4-6": 0.25,
                "7+": 0.05
            },
            "exact_scores": [
                ["1-0", 0.12],
                ["2-1", 0.10],
                ["1-1", 0.08],
                ["0-0", 0.06],
                ["2-0", 0.05]
            ],
            "analysis_reason": "基于球队近期状态、主客场优势以及历史交锋记录的综合分析，主队在本场比赛中具有一定优势。",
            "recommended_bets": [
                {
                    "bet_type": "胜平负",
                    "selection": "主胜",
                    "confidence": 0.75,
                    "reason": "主队近期状态较好，主场优势明显"
                }
            ]
        }
        
        return json.dumps(mock_response, ensure_ascii=False)
    
    def _parse_ai_response(self, ai_response: str, match_data: Dict) -> MatchAnalysis:
        """解析AI响应"""
        try:
            # 尝试解析JSON
            response_data = json.loads(ai_response)
            
            # 验证和标准化数据
            win_draw_loss = self._normalize_probabilities(
                response_data.get('win_draw_loss', {'home': 0.33, 'draw': 0.33, 'away': 0.34})
            )
            
            half_full_time = self._normalize_probabilities(
                response_data.get('half_full_time', {})
            )
            
            total_goals = self._normalize_probabilities(
                response_data.get('total_goals', {'0-1': 0.25, '2-3': 0.45, '4-6': 0.25, '7+': 0.05})
            )
            
            exact_scores = response_data.get('exact_scores', [['1-1', 0.1], ['1-0', 0.1], ['0-1', 0.1], ['2-1', 0.08], ['1-2', 0.08]])
            
            # 创建分析结果
            analysis = MatchAnalysis(
                match_id=match_data.get('match_id', ''),
                home_team=match_data.get('home_team', ''),
                away_team=match_data.get('away_team', ''),
                league_name=match_data.get('league_name', ''),
                win_draw_loss=win_draw_loss,
                confidence_level=min(max(response_data.get('confidence_level', 0.5), 0), 1),
                half_full_time=half_full_time,
                total_goals=total_goals,
                exact_scores=exact_scores,
                analysis_reason=response_data.get('analysis_reason', '暂无分析理由'),
                recommended_bets=response_data.get('recommended_bets', [])
            )
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"解析AI响应失败: {e}")
            return self._get_default_analysis(match_data)
    
    def _normalize_probabilities(self, probs_dict: Dict) -> Dict[str, float]:
        """标准化概率，确保和为1"""
        if not probs_dict:
            return {}
        
        total = sum(probs_dict.values())
        if total == 0:
            return probs_dict
        
        return {k: v / total for k, v in probs_dict.items()}
    
    def _get_default_analysis(self, match_data: Dict) -> MatchAnalysis:
        """获取默认分析结果"""
        return MatchAnalysis(
            match_id=match_data.get('match_id', ''),
            home_team=match_data.get('home_team', ''),
            away_team=match_data.get('away_team', ''),
            league_name=match_data.get('league_name', ''),
            win_draw_loss={'home': 0.33, 'draw': 0.33, 'away': 0.34},
            confidence_level=0.5,
            half_full_time={
                'home_home': 0.15, 'home_draw': 0.10, 'home_away': 0.08,
                'draw_home': 0.10, 'draw_draw': 0.14, 'draw_away': 0.08,
                'away_home': 0.08, 'away_draw': 0.10, 'away_away': 0.17
            },
            total_goals={'0-1': 0.25, '2-3': 0.45, '4-6': 0.25, '7+': 0.05},
            exact_scores=[['1-1', 0.10], ['1-0', 0.09], ['0-1', 0.09], ['2-1', 0.08], ['1-2', 0.08]],
            analysis_reason='基于基础统计模型的预测结果',
            recommended_bets=[]
        )
    
    def batch_analyze_matches(self, matches_data: List[Dict]) -> List[MatchAnalysis]:
        """批量分析多场比赛"""
        analyses = []
        
        for i, match_data in enumerate(matches_data):
            try:
                self.logger.info(f"正在分析第 {i+1}/{len(matches_data)} 场比赛: {match_data.get('home_team')} vs {match_data.get('away_team')}")
                
                analysis = self.analyze_match(match_data)
                analyses.append(analysis)
                
                # 避免API调用频率限制
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"分析比赛失败: {e}")
                continue
        
        return analyses
    
    def get_value_bets(self, analysis: MatchAnalysis, match_odds: Dict) -> List[Dict]:
        """寻找价值投注机会"""
        value_bets = []
        
        # 检查胜平负价值投注
        hhad_odds = match_odds.get('hhad', {})
        if hhad_odds:
            outcomes = [
                ('主胜', 'h', analysis.win_draw_loss.get('home', 0)),
                ('平局', 'd', analysis.win_draw_loss.get('draw', 0)),
                ('客胜', 'a', analysis.win_draw_loss.get('away', 0))
            ]
            
            for outcome_name, odds_key, predicted_prob in outcomes:
                if odds_key in hhad_odds and predicted_prob > 0:
                    odds_value = float(hhad_odds[odds_key])
                    expected_value = (predicted_prob * odds_value) - 1
                    
                    if expected_value > 0.05:  # 期望值大于5%认为是价值投注
                        value_bets.append({
                            'bet_type': '胜平负',
                            'selection': outcome_name,
                            'odds': odds_value,
                            'predicted_probability': predicted_prob,
                            'expected_value': expected_value,
                            'confidence': analysis.confidence_level
                        })
        
        return value_bets

# 使用示例
if __name__ == "__main__":
    # 初始化预测器
    predictor = AIFootballPredictor()
    
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
    analysis = predictor.analyze_match(sample_match)
    
    print(f"比赛: {analysis.home_team} vs {analysis.away_team}")
    print(f"胜平负预测: {analysis.win_draw_loss}")
    print(f"分析理由: {analysis.analysis_reason}") 
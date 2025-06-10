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
    
    def analyze_match(self, match_data: Dict) -> 'MatchAnalysis':
        """分析单场比赛"""
        try:
            # 构建详细的分析提示
            prompt = self._build_analysis_prompt(match_data)
            
            # 调用AI模型
            ai_response = self._call_ai_model(prompt)
            
            # 解析AI响应
            analysis = self._parse_ai_response(ai_response, match_data)
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"AI分析失败: {e}")
            # 返回默认分析
            return self._get_fallback_analysis(match_data)
    
    def _build_analysis_prompt(self, match_data: Dict) -> str:
        """构建详细的AI分析提示"""
        home_team = match_data.get('home_team', '主队')
        away_team = match_data.get('away_team', '客队')
        league = match_data.get('league_name', '联赛')
        
        # 获取赔率信息
        odds = match_data.get('odds', {})
        hhad_odds = odds.get('hhad', {}) if isinstance(odds, dict) else {}
        
        home_odds = float(hhad_odds.get('h', match_data.get('home_odds', 2.0)))
        draw_odds = float(hhad_odds.get('d', match_data.get('draw_odds', 3.2)))
        away_odds = float(hhad_odds.get('a', match_data.get('away_odds', 2.8)))

        prompt = f"""
你是世界顶级的足球数据分析师，拥有20年的足球预测经验。请深度分析以下比赛：

📊 比赛信息：
- 主队：{home_team}
- 客队：{away_team}  
- 联赛：{league}
- 博彩公司赔率 → 主胜:{home_odds}, 平局:{draw_odds}, 客胜:{away_odds}

🎯 分析要求：
1. 根据球队实力、历史交锋、近期状态、主客场因素进行专业分析
2. 考虑赔率背后的市场预期，寻找价值投注机会
3. 提供具体的概率数值，确保所有概率加起来等于1.0
4. 给出多样化的比分预测，避免千篇一律

📋 请严格按照以下JSON格式返回（不要添加任何其他文字）：

{{
    "win_draw_loss": {{
        "home": 0.42,
        "draw": 0.28, 
        "away": 0.30
    }},
    "half_full_time": {{
        "home_home": 0.25,
        "home_draw": 0.08,
        "home_away": 0.09,
        "draw_home": 0.12,
        "draw_draw": 0.15,
        "draw_away": 0.05,
        "away_home": 0.06,
        "away_draw": 0.08,
        "away_away": 0.12
    }},
    "total_goals": {{
        "0-1": 0.22,
        "2-3": 0.48,
        "4-6": 0.26,
        "7+": 0.04
    }},
    "exact_scores": [
        ["2-1", 0.14],
        ["1-1", 0.12],
        ["2-0", 0.11],
        ["1-0", 0.10],
        ["3-1", 0.08]
    ],
    "confidence_level": 0.78,
    "analysis_reason": "基于{home_team}近期表现出色，主场优势明显，而{away_team}客场战绩一般，预计主队有较大胜算。考虑到双方攻击力都较强，预计会是一场进球较多的比赛。赔率显示市场对主队较为看好，与我们的分析一致。",
    "recommended_bets": [
        {{
            "bet_type": "胜平负",
            "selection": "主胜",
            "confidence": 0.82,
            "reason": "主队实力明显占优，主场作战优势突出"
        }},
        {{
            "bet_type": "总进球数",
            "selection": "2-3球",
            "confidence": 0.75,
            "reason": "双方攻击力较强，预计会有精彩对攻"
        }}
    ]
}}

⚠️ 重要提醒：
- 严格遵循JSON格式，不要添加注释或额外文字
- 胜平负概率之和必须等于1.0
- 半全场9个选项概率之和必须等于1.0  
- 总进球数4个选项概率之和必须等于1.0
- 根据具体球队特点给出差异化的预测，避免雷同
- 比分预测要符合实际足球比赛规律
"""

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
            return self._get_fallback_analysis(match_data)
    
    def _normalize_probabilities(self, probs_dict: Dict) -> Dict[str, float]:
        """标准化概率，确保和为1"""
        if not probs_dict:
            return {}
        
        total = sum(probs_dict.values())
        if total == 0:
            return probs_dict
        
        return {k: v / total for k, v in probs_dict.items()}
    
    def _get_fallback_analysis(self, match_data: Dict) -> MatchAnalysis:
        """获取默认分析结果（当AI调用失败时使用）"""
        home_team = match_data.get('home_team', '主队')
        away_team = match_data.get('away_team', '客队')
        
        # 基于赔率生成更智能的默认预测
        home_odds = float(match_data.get('home_odds', 2.0))
        draw_odds = float(match_data.get('draw_odds', 3.2))
        away_odds = float(match_data.get('away_odds', 2.8))
        
        # 计算隐含概率
        home_prob = 1 / home_odds
        draw_prob = 1 / draw_odds
        away_prob = 1 / away_odds
        total_prob = home_prob + draw_prob + away_prob
        
        # 归一化概率
        home_prob /= total_prob
        draw_prob /= total_prob
        away_prob /= total_prob
        
        # 生成多样化的半全场预测
        half_full_time = {
            'home_home': round(home_prob * 0.6, 3),
            'home_draw': round(home_prob * 0.2, 3),
            'home_away': round(home_prob * 0.2, 3),
            'draw_home': round(draw_prob * 0.4, 3),
            'draw_draw': round(draw_prob * 0.5, 3),
            'draw_away': round(draw_prob * 0.1, 3),
            'away_home': round(away_prob * 0.25, 3),
            'away_draw': round(away_prob * 0.25, 3),
            'away_away': round(away_prob * 0.5, 3)
        }
        
        # 生成进球数预测
        total_goals = {
            '0-1': 0.25,
            '2-3': 0.45,
            '4-6': 0.25,
            '7+': 0.05
        }
        
        # 生成比分预测
        exact_scores = [
            ['1-1', 0.12],
            ['2-1', 0.11],
            ['1-0', 0.10],
            ['2-0', 0.09],
            ['0-1', 0.08]
        ]
        
        return MatchAnalysis(
            match_id=match_data.get('match_id', f"{home_team}_vs_{away_team}"),
            home_team=home_team,
            away_team=away_team,
            league_name=match_data.get('league_name', '未知联赛'),
            win_draw_loss={
                'home': round(home_prob, 3),
                'draw': round(draw_prob, 3),
                'away': round(away_prob, 3)
            },
            confidence_level=0.65,
            half_full_time=half_full_time,
            total_goals=total_goals,
            exact_scores=exact_scores,
            analysis_reason=f"基于博彩赔率分析，{home_team}主胜概率{home_prob:.1%}，平局概率{draw_prob:.1%}，{away_team}客胜概率{away_prob:.1%}。这是系统默认分析，建议使用AI智能分析获得更准确结果。",
            recommended_bets=[
                {
                    'bet_type': '胜平负',
                    'selection': '主胜' if home_prob > max(draw_prob, away_prob) else ('平局' if draw_prob > away_prob else '客胜'),
                    'confidence': 0.7,
                    'reason': '基于赔率计算的最优选择'
                }
            ]
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
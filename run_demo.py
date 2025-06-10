#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
足球预测系统演示脚本
用于测试中国体育彩票数据接入和AI预测功能
"""

import asyncio
import json
from datetime import datetime
from lottery_api import ChinaSportsLotteryAPI
from ai_predictor import AIFootballPredictor

def test_lottery_api():
    """测试中国体育彩票API"""
    print("=" * 50)
    print("测试中国体育彩票数据接入")
    print("=" * 50)
    
    api = ChinaSportsLotteryAPI()
    
    try:
        # 获取未来3天的比赛
        print("正在获取未来3天的比赛数据...")
        matches = api.get_formatted_matches(3)
        
        print(f"成功获取 {len(matches)} 场比赛")
        
        # 显示前5场比赛的信息
        for i, match in enumerate(matches[:5]):
            print(f"\n比赛 {i+1}:")
            print(f"  联赛: {match.get('league_name', 'N/A')}")
            print(f"  主队: {match.get('home_team', 'N/A')}")
            print(f"  客队: {match.get('away_team', 'N/A')}")
            print(f"  时间: {match.get('match_date', 'N/A')} {match.get('match_time', 'N/A')}")
            
            # 显示赔率
            odds = match.get('odds', {})
            hhad = odds.get('hhad', {})
            if hhad:
                print(f"  胜平负: {hhad.get('h', 'N/A')} / {hhad.get('d', 'N/A')} / {hhad.get('a', 'N/A')}")
        
        # 保存数据
        filename = f"demo_lottery_matches_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        api.save_matches_to_json(matches, filename)
        print(f"\n数据已保存到: {filename}")
        
        return matches[:3]  # 返回前3场用于AI分析
        
    except Exception as e:
        print(f"获取彩票数据失败: {e}")
        return []

def test_ai_predictor(sample_matches=None):
    """测试AI预测功能"""
    print("\n" + "=" * 50)
    print("测试AI智能预测功能")
    print("=" * 50)
    
    predictor = AIFootballPredictor()
    
    # 如果没有提供样本比赛，使用默认数据
    if not sample_matches:
        sample_matches = [
            {
                'match_id': 'demo_001',
                'home_team': '曼城',
                'away_team': '利物浦',
                'league_name': '英超',
                'odds': {
                    'hhad': {'h': '2.10', 'd': '3.50', 'a': '2.80'}
                }
            },
            {
                'match_id': 'demo_002',
                'home_team': '皇家马德里',
                'away_team': '巴塞罗那',
                'league_name': '西甲',
                'odds': {
                    'hhad': {'h': '2.50', 'd': '3.20', 'a': '2.40'}
                }
            }
        ]
    
    print(f"正在分析 {len(sample_matches)} 场比赛...")
    
    try:
        # 分析每场比赛
        analyses = []
        for i, match in enumerate(sample_matches):
            print(f"\n分析比赛 {i+1}: {match.get('home_team', 'N/A')} vs {match.get('away_team', 'N/A')}")
            
            analysis = predictor.analyze_match(match)
            analyses.append(analysis)
            
            # 显示分析结果
            print(f"  胜平负预测:")
            wdl = analysis.win_draw_loss
            print(f"    主胜: {wdl['home']:.1%}")
            print(f"    平局: {wdl['draw']:.1%}")
            print(f"    客胜: {wdl['away']:.1%}")
            print(f"  置信度: {analysis.confidence_level:.1%}")
            
            # 显示半全场预测（前3个）
            if analysis.half_full_time:
                hf_sorted = sorted(analysis.half_full_time.items(), key=lambda x: x[1], reverse=True)[:3]
                print(f"  半全场预测(前3):")
                for outcome, prob in hf_sorted:
                    print(f"    {predictor.half_full_mapping.get(outcome, outcome)}: {prob:.1%}")
            
            # 显示进球数预测
            if analysis.total_goals:
                print(f"  进球数预测:")
                for goals_range, prob in analysis.total_goals.items():
                    print(f"    {predictor.goals_mapping.get(goals_range, goals_range)}: {prob:.1%}")
            
            # 显示比分预测（前3个）
            if analysis.exact_scores:
                print(f"  比分预测(前3):")
                for score, prob in analysis.exact_scores[:3]:
                    print(f"    {score}: {prob:.1%}")
            
            print(f"  分析理由: {analysis.analysis_reason[:100]}...")
        
        # 保存分析结果
        results_data = []
        for analysis in analyses:
            result = {
                'match_id': analysis.match_id,
                'home_team': analysis.home_team,
                'away_team': analysis.away_team,
                'league_name': analysis.league_name,
                'win_draw_loss': analysis.win_draw_loss,
                'confidence_level': analysis.confidence_level,
                'half_full_time': analysis.half_full_time,
                'total_goals': analysis.total_goals,
                'exact_scores': analysis.exact_scores,
                'analysis_reason': analysis.analysis_reason
            }
            results_data.append(result)
        
        filename = f"demo_ai_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, ensure_ascii=False, indent=2)
        
        print(f"\nAI分析结果已保存到: {filename}")
        
    except Exception as e:
        print(f"AI预测失败: {e}")

def main():
    """主函数"""
    print("足球预测系统 v2.0 演示")
    print("支持中国体育彩票数据和AI智能分析")
    print("=" * 50)
    
    # 测试彩票API
    lottery_matches = test_lottery_api()
    
    # 测试AI预测
    test_ai_predictor(lottery_matches)
    
    print("\n" + "=" * 50)
    print("演示完成！")
    print("=" * 50)
    print("\n使用说明:")
    print("1. 运行 'python app.py' 启动Web界面")
    print("2. 访问 http://localhost:5000 使用完整功能")
    print("3. 已配置 Gemini API Key，AI功能已启用")
    print("4. 在彩票模式下可获取实时比赛数据")
    print("5. 在AI模式下可进行智能分析预测")

if __name__ == "__main__":
    main() 
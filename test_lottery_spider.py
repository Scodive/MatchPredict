#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试中国体育彩票爬虫
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scripts.china_lottery_spider import ChinaLotterySpider

def test_spider():
    """测试爬虫功能"""
    print("🕷️ 开始测试中国体育彩票爬虫...")
    
    spider = ChinaLotterySpider()
    
    try:
        print("📡 正在获取彩票数据...")
        matches = spider.get_formatted_matches(days_ahead=3)
        
        print(f"✅ 成功获取 {len(matches)} 场比赛")
        print("\n📊 比赛详情:")
        print("-" * 80)
        
        for i, match in enumerate(matches[:10], 1):  # 只显示前10场
            print(f"{i:2d}. {match['home_team']} vs {match['away_team']}")
            print(f"    联赛: {match['league_name']}")
            print(f"    时间: {match['match_time']}")
            odds = match['odds']['hhad']
            print(f"    赔率: 主胜 {odds['h']} | 平局 {odds['d']} | 客胜 {odds['a']}")
            print(f"    来源: {match['source']}")
            print()
            
        print("-" * 80)
        print(f"📈 数据统计:")
        
        # 统计来源
        sources = {}
        for match in matches:
            source = match.get('source', 'unknown')
            sources[source] = sources.get(source, 0) + 1
            
        for source, count in sources.items():
            status = "✅ 真实数据" if source == "china_lottery" else "⚠️ 其他来源"
            print(f"  - {source}: {count} 场比赛 ({status})")
            
        # 检查数据质量
        valid_matches = 0
        for match in matches:
            if (match.get('home_team') and 
                match.get('away_team') and 
                match.get('odds', {}).get('hhad', {}).get('h')):
                valid_matches += 1
        
        if len(matches) > 0:
            print(f"  - 有效比赛: {valid_matches}/{len(matches)} ({valid_matches/len(matches)*100:.1f}%)")
        else:
            print(f"  - 有效比赛: 0/0 (0.0%)")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_spider()
    sys.exit(0 if success else 1)

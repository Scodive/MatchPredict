#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试体彩爬虫脚本
"""

from lottery_api import ChinaSportsLotterySpider

def test_spider():
    """测试爬虫功能"""
    print("开始测试体彩爬虫...")
    
    spider = ChinaSportsLotterySpider()
    
    try:
        # 测试获取比赛数据
        matches = spider.get_match_list(3)
        print(f"成功获取 {len(matches)} 场比赛")
        
        # 显示前几场比赛
        for i, match in enumerate(matches[:3]):
            print(f"\n比赛 {i+1}:")
            print(f"  ID: {match.get('matchId')}")
            print(f"  主队: {match.get('homeName')}")
            print(f"  客队: {match.get('awayName')}")
            print(f"  联赛: {match.get('leagueName')}")
            print(f"  时间: {match.get('matchTime')}")
            
            odds = match.get('poolOdds', [])
            if odds:
                print(f"  赔率: 主胜{odds[0].get('h')} 平局{odds[0].get('d')} 客胜{odds[0].get('a')}")
        
        # 测试格式化数据
        formatted = spider.get_formatted_matches(3)
        print(f"\n格式化后有 {len(formatted)} 场比赛")
        
        if formatted:
            print("\n格式化示例:")
            match = formatted[0]
            print(f"  比赛ID: {match.get('match_id')}")
            print(f"  联赛: {match.get('league_name')}")
            print(f"  对阵: {match.get('home_team')} vs {match.get('away_team')}")
            print(f"  时间: {match.get('match_time')}")
            print(f"  状态: {match.get('status')}")
            
            odds = match.get('odds', {})
            hhad = odds.get('hhad', {})
            if hhad:
                print(f"  赔率: 主胜{hhad.get('h')} 平局{hhad.get('d')} 客胜{hhad.get('a')}")
        
        print("\n✅ 爬虫测试完成！")
        
    except Exception as e:
        print(f"❌ 爬虫测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_spider() 
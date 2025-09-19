#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每日比赛数据同步脚本
自动从体彩官网获取最新比赛数据并保存到数据库
"""

import sys
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import argparse

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.database import prediction_db
from scripts.china_lottery_spider import ChinaLotterySpider

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/sco/Desktop/MatchPredict/sync_matches.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class MatchSyncManager:
    """比赛数据同步管理器"""
    
    def __init__(self):
        self.spider = ChinaLotterySpider()
        self.db = prediction_db
    
    def sync_matches(self, days_ahead: int = 7, force_update: bool = False) -> Dict[str, int]:
        """
        同步比赛数据
        
        Args:
            days_ahead: 同步未来天数
            force_update: 是否强制更新
            
        Returns:
            同步统计信息
        """
        logger.info(f"🔄 开始同步未来 {days_ahead} 天的比赛数据...")
        
        try:
            # 从API获取最新数据
            logger.info("📡 正在从体彩官网获取数据...")
            matches_data = self.spider.get_formatted_matches(days_ahead=days_ahead)
            
            if not matches_data:
                logger.warning("⚠️ 未获取到任何比赛数据")
                return {'inserted': 0, 'updated': 0, 'skipped': 0}
            
            logger.info(f"✅ 成功获取 {len(matches_data)} 场比赛数据")
            
            # 保存到数据库
            logger.info("💾 正在保存到数据库...")
            stats = self.db.save_daily_matches(matches_data)
            
            logger.info(f"📊 同步完成 - 新增: {stats['inserted']}, 更新: {stats['updated']}, 跳过: {stats['skipped']}")
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ 同步失败: {e}")
            return {'inserted': 0, 'updated': 0, 'skipped': 0, 'error': str(e)}
    
    def cleanup_old_data(self, days_to_keep: int = 30) -> int:
        """
        清理旧数据
        
        Args:
            days_to_keep: 保留天数
            
        Returns:
            删除的记录数
        """
        logger.info(f"🧹 开始清理 {days_to_keep} 天前的旧数据...")
        
        try:
            deleted_count = self.db.cleanup_old_matches(days_to_keep)
            logger.info(f"✅ 清理完成，删除了 {deleted_count} 条记录")
            return deleted_count
            
        except Exception as e:
            logger.error(f"❌ 清理失败: {e}")
            return 0
    
    def get_database_stats(self) -> Dict[str, int]:
        """
        获取数据库统计信息
        
        Returns:
            统计信息字典
        """
        try:
            matches = self.db.get_daily_matches(days_ahead=30)
            
            # 按日期统计
            date_stats = {}
            league_stats = {}
            
            for match in matches:
                match_date = match.get('match_date', '')
                league = match.get('league_name', '未知')
                
                date_stats[match_date] = date_stats.get(match_date, 0) + 1
                league_stats[league] = league_stats.get(league, 0) + 1
            
            return {
                'total_matches': len(matches),
                'dates_count': len(date_stats),
                'leagues_count': len(league_stats),
                'date_stats': date_stats,
                'league_stats': league_stats
            }
            
        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {}
    
    def test_connection(self) -> bool:
        """
        测试数据库连接
        
        Returns:
            连接是否成功
        """
        try:
            conn = self.db.connect_to_database()
            conn.close()
            logger.info("✅ 数据库连接测试成功")
            return True
        except Exception as e:
            logger.error(f"❌ 数据库连接测试失败: {e}")
            return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='每日比赛数据同步脚本')
    parser.add_argument('--days', type=int, default=7, help='同步未来天数 (默认: 7)')
    parser.add_argument('--cleanup', type=int, help='清理多少天前的旧数据')
    parser.add_argument('--stats', action='store_true', help='显示数据库统计信息')
    parser.add_argument('--test', action='store_true', help='测试数据库连接')
    parser.add_argument('--force', action='store_true', help='强制更新所有数据')
    
    args = parser.parse_args()
    
    # 创建同步管理器
    sync_manager = MatchSyncManager()
    
    print("=" * 60)
    print("🏈 每日比赛数据同步脚本")
    print("=" * 60)
    
    # 测试连接
    if args.test:
        print("🔍 测试数据库连接...")
        if sync_manager.test_connection():
            print("✅ 数据库连接正常")
        else:
            print("❌ 数据库连接失败")
            return 1
    
    # 显示统计信息
    if args.stats:
        print("📊 获取数据库统计信息...")
        stats = sync_manager.get_database_stats()
        if stats:
            print(f"📈 总比赛数: {stats.get('total_matches', 0)}")
            print(f"📅 覆盖日期: {stats.get('dates_count', 0)} 天")
            print(f"🏆 联赛数量: {stats.get('leagues_count', 0)}")
            
            print("\n📅 按日期分布:")
            for date, count in sorted(stats.get('date_stats', {}).items()):
                print(f"  {date}: {count} 场")
            
            print("\n🏆 按联赛分布:")
            for league, count in sorted(stats.get('league_stats', {}).items(), key=lambda x: x[1], reverse=True):
                print(f"  {league}: {count} 场")
        else:
            print("❌ 无法获取统计信息")
    
    # 清理旧数据
    if args.cleanup:
        print(f"🧹 清理 {args.cleanup} 天前的旧数据...")
        deleted = sync_manager.cleanup_old_data(args.cleanup)
        print(f"✅ 清理完成，删除了 {deleted} 条记录")
    
    # 同步数据
    if not args.test and not args.stats and not args.cleanup:
        print(f"🔄 开始同步未来 {args.days} 天的比赛数据...")
        stats = sync_manager.sync_matches(days_ahead=args.days, force_update=args.force)
        
        if 'error' in stats:
            print(f"❌ 同步失败: {stats['error']}")
            return 1
        else:
            print("✅ 同步完成!")
            print(f"  📥 新增: {stats['inserted']} 场")
            print(f"  🔄 更新: {stats['updated']} 场")
            print(f"  ⏭️ 跳过: {stats['skipped']} 场")
    
    print("=" * 60)
    print("🎉 脚本执行完成")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ 用户中断执行")
        sys.exit(1)
    except Exception as e:
        logger.error(f"脚本执行失败: {e}")
        sys.exit(1)

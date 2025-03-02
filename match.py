import pandas as pd
import numpy as np
from scipy.stats import poisson
import argparse

def predict_match(home_team, away_team, home_odds, draw_odds, away_odds):
    """
    预测两支球队之间的比赛结果
    
    参数:
        home_team: 主队名称
        away_team: 客队名称
        home_odds: 主胜赔率
        draw_odds: 平局赔率
        away_odds: 客胜赔率
    """
    try:
        # 加载特征数据
        features_df = pd.read_csv('data/features.csv', index_col=0)
        
        # 检查球队是否存在于数据中
        if home_team not in features_df.index:
            print(f"错误: 找不到球队 '{home_team}' 的数据")
            return
        
        if away_team not in features_df.index:
            print(f"错误: 找不到球队 '{away_team}' 的数据")
            return
        
        # 获取两队的特征
        home_features = features_df.loc[home_team]
        away_features = features_df.loc[away_team]
        
        print(f"\n{home_team} vs {away_team} 比赛预测")
        print("=" * 50)
        
        print(f"\n{home_team} 特征:")
        print(home_features)
        print(f"\n{away_team} 特征:")
        print(away_features)
        
        # 计算胜平负概率
        home_advantage = 0.1  # 主场优势
        
        home_win_prob = (home_features['home_win_rate'] * 0.4 + 
                         home_features['overall_win_rate'] * 0.3 + 
                         home_features['recent_form'] * 0.3 + 
                         home_advantage)
        
        away_win_prob = (away_features['away_win_rate'] * 0.4 + 
                         away_features['overall_win_rate'] * 0.3 + 
                         away_features['recent_form'] * 0.3)
        
        draw_prob = 1 - home_win_prob - away_win_prob
        if draw_prob < 0:
            total = home_win_prob + away_win_prob
            home_win_prob = home_win_prob / total * 0.9
            away_win_prob = away_win_prob / total * 0.9
            draw_prob = 0.1
        
        # 归一化概率
        total_prob = home_win_prob + draw_prob + away_win_prob
        home_win_prob /= total_prob
        draw_prob /= total_prob
        away_win_prob /= total_prob
        
        print("\n胜平负预测:")
        print(f"主胜({home_team}赢): {home_win_prob:.2f} ({home_win_prob*100:.1f}%)")
        print(f"平局: {draw_prob:.2f} ({draw_prob*100:.1f}%)")
        print(f"客胜({away_team}赢): {away_win_prob:.2f} ({away_win_prob*100:.1f}%)")
        
        # 预测比分
        home_goals_mean = home_features['home_goals_scored_avg']
        away_goals_mean = away_features['away_goals_scored_avg']
        
        # 计算比分概率
        score_probs = {}
        total_prob = 0
        
        for h in range(6):
            for a in range(6):
                h_prob = poisson.pmf(h, home_goals_mean)
                a_prob = poisson.pmf(a, away_goals_mean)
                score_prob = h_prob * a_prob
                score_probs[f"{h}-{a}"] = score_prob
                total_prob += score_prob
        
        # 归一化概率
        for score in score_probs:
            score_probs[score] /= total_prob
        
        # 排序比分概率
        sorted_scores = sorted(score_probs.items(), key=lambda x: x[1], reverse=True)
        
        print("\n最可能的比分:")
        for score, prob in sorted_scores[:5]:
            print(f"{score}: {prob:.4f} ({prob*100:.1f}%)")
        
        # 预测半场进球
        ht_home_goals_mean = home_goals_mean * 0.45
        ht_away_goals_mean = away_goals_mean * 0.45
        
        # 计算半场比分概率
        ht_score_probs = {}
        ht_total_prob = 0
        
        for h in range(4):
            for a in range(4):
                h_prob = poisson.pmf(h, ht_home_goals_mean)
                a_prob = poisson.pmf(a, ht_away_goals_mean)
                score_prob = h_prob * a_prob
                ht_score_probs[f"{h}-{a}"] = score_prob
                ht_total_prob += score_prob
        
        # 归一化概率
        for score in ht_score_probs:
            ht_score_probs[score] /= ht_total_prob
        
        # 排序半场比分概率
        sorted_ht_scores = sorted(ht_score_probs.items(), key=lambda x: x[1], reverse=True)
        
        print("\n最可能的半场比分:")
        for score, prob in sorted_ht_scores[:5]:
            print(f"{score}: {prob:.4f} ({prob*100:.1f}%)")
        
        # 计算半全场组合概率
        ht_ft_probs = {}
        
        for ht_score, ht_prob in ht_score_probs.items():
            ht_home, ht_away = map(int, ht_score.split('-'))
            ht_result = 'H' if ht_home > ht_away else ('D' if ht_home == ht_away else 'A')
            
            for ft_score, ft_prob in score_probs.items():
                ft_home, ft_away = map(int, ft_score.split('-'))
                ft_result = 'H' if ft_home > ft_away else ('D' if ft_home == ft_away else 'A')
                
                combo = f"{ht_result}/{ft_result}"
                if combo not in ht_ft_probs:
                    ht_ft_probs[combo] = 0
                ht_ft_probs[combo] += ht_prob * ft_prob
        
        # 排序半全场组合概率
        sorted_ht_ft = sorted(ht_ft_probs.items(), key=lambda x: x[1], reverse=True)
        
        print("\n最可能的半全场组合:")
        for combo, prob in sorted_ht_ft[:5]:
            print(f"{combo}: {prob:.4f} ({prob*100:.1f}%)")
        
        # 分析赔率
        odds = {
            'H': home_odds,  # 主胜赔率
            'D': draw_odds,  # 平局赔率
            'A': away_odds   # 客胜赔率
        }
        
        # 计算期望值
        result_probs = {'H': home_win_prob, 'D': draw_prob, 'A': away_win_prob}
        ev_home = result_probs['H'] * odds['H'] - (1 - result_probs['H'])
        ev_draw = result_probs['D'] * odds['D'] - (1 - result_probs['D'])
        ev_away = result_probs['A'] * odds['A'] - (1 - result_probs['A'])
        
        print("\n赔率分析:")
        print(f"主胜赔率: {odds['H']}, 期望值: {ev_home:.4f}")
        print(f"平局赔率: {odds['D']}, 期望值: {ev_draw:.4f}")
        print(f"客胜赔率: {odds['A']}, 期望值: {ev_away:.4f}")
        
        # 找出最佳投注选项
        best_bet = max(
            ("主胜", ev_home, odds['H']),
            ("平局", ev_draw, odds['D']),
            ("客胜", ev_away, odds['A']),
            key=lambda x: x[1]
        )
        
        if best_bet[1] > 0:
            print(f"\n最佳投注建议: {best_bet[0]}, 赔率: {best_bet[2]}, 期望值: {best_bet[1]:.4f}")
        else:
            print("\n没有找到有价值的投注选项")
            
    except Exception as e:
        print(f"发生错误: {e}")

def list_teams():
    """列出所有可用的球队"""
    try:
        features_df = pd.read_csv('data/features.csv', index_col=0)
        print("\n可用的球队列表:")
        for team in features_df.index:
            print(f"- {team}")
    except Exception as e:
        print(f"无法加载球队列表: {e}")

def main():
    parser = argparse.ArgumentParser(description='足球比赛预测工具')
    parser.add_argument('--home', type=str, help='主队名称')
    parser.add_argument('--away', type=str, help='客队名称')
    parser.add_argument('--home_odds', type=float, help='主胜赔率')
    parser.add_argument('--draw_odds', type=float, help='平局赔率')
    parser.add_argument('--away_odds', type=float, help='客胜赔率')
    parser.add_argument('--list_teams', action='store_true', help='列出所有可用的球队')
    
    args = parser.parse_args()
    
    if args.list_teams:
        list_teams()
        return
    
    if not args.home or not args.away:
        # 如果没有提供命令行参数，使用交互式输入
        print("足球比赛预测工具")
        print("=" * 50)
        
        # 列出可用的球队
        list_teams()
        
        home_team = input("\n请输入主队名称: ")
        away_team = input("请输入客队名称: ")
        
        try:
            home_odds = float(input("请输入主胜赔率: "))
            draw_odds = float(input("请输入平局赔率: "))
            away_odds = float(input("请输入客胜赔率: "))
        except ValueError:
            print("赔率必须是数字！使用默认赔率 2.0, 3.0, 4.0")
            home_odds, draw_odds, away_odds = 2.0, 3.0, 4.0
    else:
        home_team = args.home
        away_team = args.away
        home_odds = args.home_odds if args.home_odds else 2.0
        draw_odds = args.draw_odds if args.draw_odds else 3.0
        away_odds = args.away_odds if args.away_odds else 4.0
    
    predict_match(home_team, away_team, home_odds, draw_odds, away_odds)

if __name__ == "__main__":
    main()


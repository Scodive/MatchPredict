import pandas as pd
import numpy as np
from scipy.stats import poisson
import argparse
import os
import json
from itertools import product

class ParlayPredictor:
    """足球比赛串关预测器"""
    
    def __init__(self):
        """初始化预测器"""
        self.leagues = {
            "PL": "英超",
            "PD": "西甲",
            "SA": "意甲",
            "BL1": "德甲",
            "FL1": "法甲"
        }
        
        # 加载所有可用的特征数据
        self.features = {}
        for league_code in self.leagues.keys():
            file_path = f"data/features_{league_code}2024.csv"
            if os.path.exists(file_path):
                self.features[league_code] = pd.read_csv(file_path, index_col=0)
                print(f"已加载 {self.leagues[league_code]} 数据")
        
        if not self.features:
            print("错误: 未找到任何联赛数据文件")
    
    def get_team_features(self, team_name, league_code=None):
        """获取球队特征"""
        if league_code and league_code in self.features:
            # 在指定联赛中查找
            if team_name in self.features[league_code].index:
                return self.features[league_code].loc[team_name]
        
        # 在所有联赛中查找
        for code, df in self.features.items():
            if team_name in df.index:
                return df.loc[team_name]
        
        print(f"警告: 找不到球队 '{team_name}' 的数据")
        return None
    
    def predict_match(self, home_team, away_team, home_odds, draw_odds, away_odds, league_code=None):
        """预测单场比赛结果"""
        home_features = self.get_team_features(home_team, league_code)
        away_features = self.get_team_features(away_team, league_code)
        
        if home_features is None or away_features is None:
            return None
        
        # 计算预期进球数
        home_expected_goals = (home_features['home_goals_scored_avg'] * 0.7 + 
                              away_features['away_goals_conceded_avg'] * 0.3) * 1.1  # 主场优势
        
        away_expected_goals = (away_features['away_goals_scored_avg'] * 0.7 + 
                              home_features['home_goals_conceded_avg'] * 0.3) * 0.9  # 客场劣势
        
        # 使用泊松分布计算比分概率
        max_goals = 5
        score_probs = {}
        for i in range(max_goals + 1):
            for j in range(max_goals + 1):
                score_probs[(i, j)] = (poisson.pmf(i, home_expected_goals) * 
                                      poisson.pmf(j, away_expected_goals))
        
        # 计算胜平负概率
        home_win_prob = sum(prob for (i, j), prob in score_probs.items() if i > j)
        draw_prob = sum(prob for (i, j), prob in score_probs.items() if i == j)
        away_win_prob = sum(prob for (i, j), prob in score_probs.items() if i < j)
        
        # 计算期望值
        result_probs = {'H': home_win_prob, 'D': draw_prob, 'A': away_win_prob}
        ev_home = result_probs['H'] * home_odds - 1
        ev_draw = result_probs['D'] * draw_odds - 1
        ev_away = result_probs['A'] * away_odds - 1
        
        # 找出最佳投注选项
        best_bet = max(
            ("H", ev_home, home_odds, home_win_prob),
            ("D", ev_draw, draw_odds, draw_prob),
            ("A", ev_away, away_odds, away_win_prob),
            key=lambda x: x[1]
        )
        
        # 所有可能的投注选项（按期望值排序）
        all_bets = [
            ("H", ev_home, home_odds, home_win_prob),
            ("D", ev_draw, draw_odds, draw_prob),
            ("A", ev_away, away_odds, away_win_prob)
        ]
        all_bets.sort(key=lambda x: x[1], reverse=True)
        
        return {
            'home_team': home_team,
            'away_team': away_team,
            'home_win_prob': home_win_prob,
            'draw_prob': draw_prob,
            'away_win_prob': away_win_prob,
            'home_odds': home_odds,
            'draw_odds': draw_odds,
            'away_odds': away_odds,
            'best_bet': best_bet[0],
            'best_ev': best_bet[1],
            'best_odds': best_bet[2],
            'best_prob': best_bet[3],
            'all_bets': all_bets  # 所有投注选项
        }
    
    def predict_parlay(self, matches):
        """预测多场比赛的串关"""
        predictions = []
        all_combinations = []
        
        # 预测每场比赛
        for match in matches:
            home_team = match['home_team']
            away_team = match['away_team']
            home_odds = match['home_odds']
            draw_odds = match['draw_odds']
            away_odds = match['away_odds']
            league_code = match.get('league_code')
            
            pred = self.predict_match(home_team, away_team, home_odds, draw_odds, away_odds, league_code)
            if pred:
                predictions.append(pred)
        
        if not predictions:
            return None
        
        # 创建最佳串关组合
        best_parlay = {
            'selections': [],
            'total_odds': 1.0,
            'total_prob': 1.0,
            'expected_value': 0.0
        }
        
        for pred in predictions:
            best_bet = pred['best_bet']
            best_odds = pred['best_odds']
            best_prob = pred['best_prob']
            
            best_parlay['selections'].append({
                'match': f"{pred['home_team']} vs {pred['away_team']}",
                'pick': best_bet,
                'odds': best_odds,
                'prob': best_prob
            })
            
            best_parlay['total_odds'] *= best_odds
            best_parlay['total_prob'] *= best_prob
        
        best_parlay['expected_value'] = best_parlay['total_odds'] * best_parlay['total_prob'] - 1
        
        # 计算所有可能的组合
        all_bets = [pred['all_bets'] for pred in predictions]
        for combo in product(*all_bets):
            parlay = {
                'selections': [],
                'total_odds': 1.0,
                'total_prob': 1.0
            }
            
            for i, (bet_type, ev, odds, prob) in enumerate(combo):
                pred = predictions[i]
                parlay['selections'].append({
                    'match': f"{pred['home_team']} vs {pred['away_team']}",
                    'pick': bet_type,
                    'odds': odds,
                    'prob': prob
                })
                
                parlay['total_odds'] *= odds
                parlay['total_prob'] *= prob
            
            parlay['expected_value'] = parlay['total_odds'] * parlay['total_prob'] - 1
            all_combinations.append(parlay)
        
        # 按期望值排序
        all_combinations.sort(key=lambda x: x['expected_value'], reverse=True)
        
        return {
            'individual_predictions': predictions,
            'best_parlay': best_parlay,
            'all_combinations': all_combinations[:10]  # 只返回前10个最佳组合
        }

def format_result(result_type):
    """格式化结果类型"""
    if result_type == 'H':
        return '主胜'
    elif result_type == 'D':
        return '平局'
    elif result_type == 'A':
        return '客胜'
    return result_type

def main():
    parser = argparse.ArgumentParser(description='足球比赛串关预测工具')
    parser.add_argument('--matches', type=str, help='比赛信息JSON文件')
    args = parser.parse_args()
    
    predictor = ParlayPredictor()
    
    if args.matches and os.path.exists(args.matches):
        with open(args.matches, 'r', encoding='utf-8') as f:
            matches = json.load(f)
    else:
        # 交互式输入
        matches = []
        print("\n足球比赛串关预测工具")
        print("=" * 50)
        
        num_matches = int(input("请输入要预测的比赛数量: "))
        
        for i in range(num_matches):
            print(f"\n比赛 #{i+1}")
            league = input("联赛代码 (PL=英超, PD=西甲, SA=意甲, 留空自动识别): ")
            home_team = input("主队名称: ")
            away_team = input("客队名称: ")
            
            try:
                home_odds = float(input("主胜赔率: "))
                draw_odds = float(input("平局赔率: "))
                away_odds = float(input("客胜赔率: "))
            except ValueError:
                print("赔率必须是数字！")
                continue
            
            match = {
                'home_team': home_team,
                'away_team': away_team,
                'home_odds': home_odds,
                'draw_odds': draw_odds,
                'away_odds': away_odds
            }
            
            if league:
                match['league_code'] = league
                
            matches.append(match)
    
    # 预测串关
    result = predictor.predict_parlay(matches)
    
    if not result:
        print("无法预测串关，请检查输入的球队名称是否正确")
        return
    
    # 打印单场预测结果
    print("\n单场比赛预测结果:")
    print("=" * 50)
    
    for i, pred in enumerate(result['individual_predictions']):
        print(f"\n比赛 #{i+1}: {pred['home_team']} vs {pred['away_team']}")
        print(f"主胜概率: {pred['home_win_prob']:.2f} ({pred['home_win_prob']*100:.1f}%), 赔率: {pred['home_odds']}")
        print(f"平局概率: {pred['draw_prob']:.2f} ({pred['draw_prob']*100:.1f}%), 赔率: {pred['draw_odds']}")
        print(f"客胜概率: {pred['away_win_prob']:.2f} ({pred['away_win_prob']*100:.1f}%), 赔率: {pred['away_odds']}")
        
        # 显示所有投注选项的期望值
        print("所有投注选项 (按期望值排序):")
        for bet_type, ev, odds, prob in pred['all_bets']:
            result_name = format_result(bet_type)
            print(f"  {result_name}: 期望值={ev:.4f}, 赔率={odds}, 概率={prob:.2f}")
        
        print(f"最佳投注: {format_result(pred['best_bet'])}, 期望值: {pred['best_ev']:.4f}")
    
    # 打印最佳串关
    print("\n最佳串关组合:")
    print("=" * 50)
    best = result['best_parlay']
    print(f"总赔率: {best['total_odds']:.2f}")
    print(f"中奖概率: {best['total_prob']:.4f} ({best['total_prob']*100:.2f}%)")
    print(f"期望值: {best['expected_value']:.4f}")
    
    print("\n选择:")
    for i, sel in enumerate(best['selections']):
        print(f"{i+1}. {sel['match']}: {format_result(sel['pick'])} (赔率: {sel['odds']}, 概率: {sel['prob']:.2f})")
    
    # 打印其他高价值串关
    print("\n其他高价值串关组合:")
    print("=" * 50)
    
    for i, combo in enumerate(result['all_combinations'][:5]):
        if i == 0:  # 跳过最佳组合，因为已经打印过了
            continue
            
        print(f"\n组合 #{i}:")
        print(f"总赔率: {combo['total_odds']:.2f}")
        print(f"中奖概率: {combo['total_prob']:.4f} ({combo['total_prob']*100:.2f}%)")
        print(f"期望值: {combo['expected_value']:.4f}")
        
        print("选择:")
        for j, sel in enumerate(combo['selections']):
            print(f"{j+1}. {sel['match']}: {format_result(sel['pick'])} (赔率: {sel['odds']}, 概率: {sel['prob']:.2f})")

if __name__ == "__main__":
    main() 
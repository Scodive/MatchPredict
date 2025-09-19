import pandas as pd
import json
import os

# 联赛代码
leagues = ["PL", "PD", "SA", "BL1", "FL1"]

for league in leagues:
    csv_file = f"data/features_{league}2024.csv"
    json_file = f"data/features_{league}2024.json"
    
    if os.path.exists(csv_file):
        # 读取CSV文件
        df = pd.read_csv(csv_file, index_col=0)
        
        # 转换为JSON格式
        data = {}
        for team in df.index:
            data[team] = df.loc[team].to_dict()
        
        # 保存为JSON文件
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"已转换 {csv_file} 到 {json_file}")
    else:
        print(f"文件不存在: {csv_file}") 
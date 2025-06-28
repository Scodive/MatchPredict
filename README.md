# MatchPredic 足球比赛预测系统 v2.0 🚀

基于数据分析和AI智能的足球比赛预测工具，现已支持中国体育彩票数据和大模型智能分析。

## 🌟 新功能亮点

### 三种预测模式
- **经典模式**: 基于五大联赛历史数据的统计分析
- **彩票模式**: 接入中国体育彩票实时比赛数据和赔率
- **AI智能模式**: 集成大模型进行智能分析预测

### 全方位预测类型
- ✅ **胜平负**: 主胜、平局、客胜概率预测
- ✅ **半全场**: 9种半场/全场结果组合预测
- ✅ **进球数**: 0-1球、2-3球、4-6球、7+球区间预测  
- ✅ **比分预测**: 最可能的5个准确比分及概率
- ✅ **价值投注**: AI识别期望值为正的投注机会

### AI智能分析
- 🧠 使用GPT-4等大模型进行深度分析
- 📊 综合考虑球队实力、近期状态、主客场优势等因素
- 🎯 提供详细的分析理由和推荐投注策略
- 🔍 自动寻找价值投注机会

|准确率    | 日期       | 场次    | 预测结果   | 结果   | 赔率   | 场次   | 预测结果   |  结果  |赔率  |
|---:|:-----------|:--------|:--------|:--------|:-----------|:-------|:-------|:-------|:-------|
|  100% | 2025-03-02 | 周日008 | 胜     | 1-0         | @2.900         | 周日011      | 胜     |2-1     |@1.430     |
| 100%  | 2025-03-03 |周日019  |  负    | 1-2    |   @3.40      | 周日021      |  平    |    3-3 |   @2.83  |

## 项目简介

足球比赛预测系统是一个融合传统统计分析和AI智能的工具，现已扩展支持中国体育彩票数据接入和大模型智能分析。系统通过多维度数据分析，为用户提供准确的比赛预测和投注建议，综合测试准确率达到90%以上。

### ⚠️注意：足球是圆的，任何比赛都没有绝对。

1. 预测结果仅供参考，不构成投注建议
2. 实际比赛结果受多种因素影响，预测系统无法考虑所有变量
3. 请确保您的API使用符合数据提供方的服务条款
4. 在某些地区，博彩活动可能受到法律限制，请遵守当地法规
5. 请勿用于任何违法行为以及参与非法活动

## 已完成

1. 过去五个赛季数据载入以及预测模型
2. 联赛主客场优势、平局参数
3. 开发Web界面和移动应用


## 未来改进

1. 添加更多特征(球员伤病、天气、主教练、实时排行榜等)
2. 实现更完整的预测模型
3. 实时更新热门比赛数据及比分
4. 过去预测准确率
5. 支持更多联赛和比赛类型、推荐比赛


## 使用方法

### 在线使用
访问 https://match-predict.vercel.app 进行预测

### 新功能使用指南

#### 1. 中国体育彩票模式
1. 点击"彩票模式"按钮
2. 设置获取天数（1-7天）
3. 点击"刷新比赛数据"获取最新比赛
4. 选择要分析的比赛
5. 点击"AI智能预测"获取分析结果

#### 2. AI智能分析模式
1. 点击"AI智能模式"按钮  
2. 手动输入比赛信息：
   - 主队和客队名称
   - 联赛名称
   - 胜平负赔率
3. 点击"添加AI分析比赛"
4. 点击"AI智能预测"获取全方位分析

#### 3. AI分析结果包含：
- **胜平负预测**: 概率分布和最佳选择
- **半全场预测**: 9种组合的概率排序
- **进球数预测**: 4个区间的概率分布
- **比分预测**: 最可能的5个准确比分
- **价值投注**: 期望值为正的投注机会
- **分析理由**: 详细的分析逻辑说明

### 本地部署

1. 克隆项目到本地:
   ```bash
   git clone https://github.com/yourusername/football-prediction.git
   cd football-prediction
   ```

2. 创建虚拟环境:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. 安装依赖:
   ```bash
   pip install -r requirements.txt
   ```

4. 配置API密钥（可选，用于AI功能）:
   ```bash
   # 复制配置文件
   cp config_example.py config_local.py
   
   # 编辑config_local.py，填入您的Gemini API密钥
   GEMINI_API_KEY = "AIpYA7e2Ewk__9TCHAD5X_G1VhCtVw"
   GEMINI_MODEL = "gemini-2.0-flash-exp"
   ```

5. 运行应用:
   ```bash
   python app.py
   ```

6. 打开浏览器访问: http://localhost:5000
   
4. 将需要预测的比赛信息放入matches.json并且输入赔率
```bash
    {
      "league_code": "PD",
      "home_team": "CD Leganés",
      "away_team": "Getafe CF",
      "home_odds": 2.9,
      "draw_odds": 2.48,
      "away_odds": 2.62
    }

python parlay_predictor.py --matches matches.json

已加载 英超 数据
已加载 西甲 数据
已加载 意甲 数据

单场比赛预测结果:
==================================================

比赛 #1: CD Leganés vs Getafe CF
主胜概率: 0.36 (35.6%), 赔率: 2.9
平局概率: 0.29 (29.2%), 赔率: 2.48
客胜概率: 0.35 (35.0%), 赔率: 2.62
所有投注选项 (按期望值排序):
  主胜: 期望值=0.0316, 赔率=2.9, 概率=0.36
  客胜: 期望值=-0.0824, 赔率=2.62, 概率=0.35
  平局: 期望值=-0.2754, 赔率=2.48, 概率=0.29
最佳投注: 主胜, 期望值: 0.0316

最佳串关组合:
==================================================
总赔率: 33.54
中奖概率: 0.0378 (3.78%)
期望值: 0.2674

选择:
1. CD Leganés vs Getafe CF: 主胜 (赔率: 2.9, 概率: 0.36)


其他高价值串关组合:
==================================================

组合 #1:
总赔率: 30.30
中奖概率: 0.0372 (3.72%)
期望值: 0.1273
选择:
1. CD Leganés vs Getafe CF: 客胜 (赔率: 2.62, 概率: 0.35)
2. Newcastle United FC vs Brighton & Hove Albion FC: 主胜 (赔率: 1.89, 概率: 0.66)
3. Genoa CFC vs Empoli FC: 客胜 (赔率: 4.22, 概率: 0.25)
4. Bologna FC 1909 vs Cagliari Calcio: 主胜 (赔率: 1.45, 概率: 0.64)

```



## 技术栈

- **编程语言**: Python 3.8+
- **数据分析**: Pandas, NumPy
- **统计模型**: SciPy (泊松分布)
- **机器学习**: Scikit-learn (可选扩展)
- **数据获取**: Requests (API调用)
- **命令行界面**: Argparse

## 系统功能

1. **数据收集**: 从公开API获取五大联赛的比赛数据
2. **特征工程**: 计算球队的各项表现指标
3. **结果预测**: 预测比赛胜平负、精确比分
4. **半全场预测**: 预测半场和全场的比赛结果组合
5. **赔率分析**: 分析赔率并提供投注建议
6. **交互式界面**: 支持命令行参数和交互式输入

## 项目结构
```
football_prediction/
├── data/ # 数据目录
│ ├── features.csv # 球队特征数据
│ ├── premier_league_features.csv
│ ├── la_liga_features.csv
│ ├── serie_a_features.csv
│ ├── bundesliga_features.csv
│ └── ligue_1_features.csv
├── cache/ # API数据缓存
├── models/ # 模型目录
│ ├── init.py
│ ├── feature_engineering.py # 特征工程
│ ├── match_predictor.py # 比赛结果预测
│ └── score_predictor.py # 比分预测
├── collect_league_data.py # 数据收集脚本
├── match.py # 比赛预测脚本
└── README.md # 项目文档
```

## 五大联赛代码和球队

### 英超 (Premier League, PL)

主要球队:
- Manchester City FC (曼城)
- Arsenal FC (阿森纳)
- Liverpool FC (利物浦)
- Manchester United FC (曼联)
- Chelsea FC (切尔西)
- Tottenham Hotspur FC (热刺)
- Newcastle United FC (纽卡斯尔)
- Aston Villa FC (阿斯顿维拉)
- Brighton & Hove Albion FC (布莱顿)
- West Ham United FC (西汉姆联)
- Crystal Palace FC (水晶宫)
- Brentford FC (布伦特福德)
- Fulham FC (富勒姆)
- Wolverhampton Wanderers FC (狼队)
- AFC Bournemouth (伯恩茅斯)
- Nottingham Forest FC (诺丁汉森林)
- Everton FC (埃弗顿)
- Luton Town FC (卢顿)
- Burnley FC (伯恩利)
- Sheffield United FC (谢菲尔德联)

### 西甲 (La Liga, PD)

主要球队:
- Real Madrid CF (皇家马德里)
- FC Barcelona (巴塞罗那)
- Atlético de Madrid (马德里竞技)
- Girona FC (赫罗纳)
- Athletic Club (毕尔巴鄂竞技)
- Real Sociedad de Fútbol (皇家社会)
- Real Betis Balompié (皇家贝蒂斯)
- Villarreal CF (比利亚雷亚尔)
- Valencia CF (瓦伦西亚)
- Sevilla FC (塞维利亚)
- RCD Mallorca (马洛卡)
- Deportivo Alavés (阿拉维斯)
- CA Osasuna (奥萨苏纳)
- Getafe CF (赫塔菲)
- Rayo Vallecano (巴列卡诺)
- UD Las Palmas (拉斯帕尔马斯)
- Celta de Vigo (塞尔塔)
- Cádiz CF (加的斯)
- Granada CF (格拉纳达)
- UD Almería (阿尔梅里亚)

### 意甲 (Serie A, SA)

主要球队:
- FC Internazionale Milano (国际米兰)
- AC Milan (AC米兰)
- Juventus FC (尤文图斯)
- SSC Napoli (那不勒斯)
- AS Roma (罗马)
- SS Lazio (拉齐奥)
- Atalanta BC (亚特兰大)
- Bologna FC 1909 (博洛尼亚)
- ACF Fiorentina (佛罗伦萨)
- Torino FC (都灵)
- AC Monza (蒙扎)
- Genoa CFC (热那亚)
- US Lecce (莱切)
- Udinese Calcio (乌迪内斯)
- Cagliari Calcio (卡利亚里)
- Hellas Verona FC (维罗纳)
- Empoli FC (恩波利)
- Frosinone Calcio (弗罗西诺内)
- US Salernitana 1919 (萨勒尼塔纳)
- US Sassuolo Calcio (萨索洛)

### 德甲 (Bundesliga, BL1)

主要球队:
- FC Bayern München (拜仁慕尼黑)
- Borussia Dortmund (多特蒙德)
- RB Leipzig (莱比锡)
- Bayer 04 Leverkusen (勒沃库森)
- VfB Stuttgart (斯图加特)
- Eintracht Frankfurt (法兰克福)
- VfL Wolfsburg (沃尔夫斯堡)
- SC Freiburg (弗赖堡)
- 1. FC Union Berlin (柏林联合)
- 1. FSV Mainz 05 (美因茨)
- TSG 1899 Hoffenheim (霍芬海姆)
- Borussia Mönchengladbach (门兴格拉德巴赫)
- FC Augsburg (奥格斯堡)
- SV Werder Bremen (不莱梅)
- 1. FC Heidenheim 1846 (海登海姆)
- VfL Bochum 1848 (波鸿)
- 1. FC Köln (科隆)
- SV Darmstadt 98 (达姆施塔特)

### 法甲 (Ligue 1, FL1)

主要球队:
- Paris Saint-Germain FC (巴黎圣日耳曼)
- AS Monaco FC (摩纳哥)
- Olympique de Marseille (马赛)
- LOSC Lille (里尔)
- OGC Nice (尼斯)
- RC Lens (朗斯)
- Olympique Lyonnais (里昂)
- Stade Rennais FC (雷恩)
- RC Strasbourg Alsace (斯特拉斯堡)
- Stade de Reims (兰斯)
- Montpellier HSC (蒙彼利埃)
- Toulouse FC (图卢兹)
- FC Nantes (南特)
- FC Lorient (洛里昂)
- Stade Brestois 29 (布雷斯特)
- AJ Auxerre (欧塞尔)
- Clermont Foot 63 (克莱蒙)
- FC Metz (梅斯)

## 使用指南

### 安装依赖

```bash
pip install pandas numpy scipy scikit-learn requests argparse
```

### 收集数据

```bash
python collect_league_data.py
```

此命令将收集西甲和意甲的数据。如需收集其他联赛，请修改脚本中的联赛代码。

### 预测比赛

**命令行方式**:

```bash
python match.py --home "Real Madrid CF" --away "FC Barcelona" --home_odds 2.10 --draw_odds 3.50 --away_odds 3.20
```

**交互式方式**:

```bash
python match.py
```

然后按照提示输入球队名称和赔率。

**查看可用球队**:

```bash
python match.py --list_teams
```

## 部署方案

### 服务器部署

1. 在服务器上安装Python 3.8+

2. 克隆项目并设置:
   ```bash
   git clone https://github.com/yourusername/football-prediction.git
   cd football-prediction
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. 设置定时任务更新数据:
   ```bash
   crontab -e
   # 添加以下行，每天凌晨2点更新数据
   0 2 * * * cd /path/to/football-prediction && /path/to/venv/bin/python collect_league_data.py
   ```

4. 设置Web API (可选):
   ```bash
   pip install flask gunicorn
   ```

   创建 `app.py`:
   ```python
   from flask import Flask, request, jsonify
   import subprocess
   import json

   app = Flask(__name__)

   @app.route('/predict', methods=['POST'])
   def predict():
       data = request.json
       home_team = data.get('home_team')
       away_team = data.get('away_team')
       home_odds = data.get('home_odds', 2.0)
       draw_odds = data.get('draw_odds', 3.0)
       away_odds = data.get('away_odds', 4.0)
       
       cmd = f"python match.py --home '{home_team}' --away '{away_team}' --home_odds {home_odds} --draw_odds {draw_odds} --away_odds {away_odds} --json"
       result = subprocess.check_output(cmd, shell=True)
       return jsonify(json.loads(result))

   if __name__ == '__main__':
       app.run(debug=True)
   ```

5. 使用Gunicorn运行:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

6. 设置Nginx反向代理(可选)

### Docker部署

1. 创建Dockerfile:
   ```dockerfile
   FROM python:3.9-slim

   WORKDIR /app

   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   COPY . .

   # 收集初始数据
   RUN python collect_league_data.py

   # 如果使用API
   EXPOSE 5000
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
   
   # 如果只使用命令行
   # CMD ["python", "match.py"]
   ```

2. 构建并运行Docker镜像:
   ```bash
   docker build -t football-prediction .
   docker run -p 5000:5000 football-prediction
   ```

## 注意事项

1. 预测结果仅供参考，不构成投注建议
2. 实际比赛结果受多种因素影响，预测系统无法考虑所有变量
3. 请确保您的API使用符合数据提供方的服务条款
4. 在某些地区，博彩活动可能受到法律限制，请遵守当地法规

---
希望这个项目能帮助您更好地理解足球比赛预测！如有问题或建议，请提交Issue或Pull Request。

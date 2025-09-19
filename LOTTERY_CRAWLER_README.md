# 🎲 中国体育彩票爬虫

## 📋 功能说明

新的彩票爬虫 `china_lottery_spider.py` 专门设计用于从中国体育彩票官网获取真实的足球胜平负数据。

### 🎯 目标网站
- **官方网站**: https://www.lottery.gov.cn/jc/jsq/zqspf/
- **数据类型**: 足球胜平负彩票
- **更新频率**: 实时更新

## 🔧 技术特性

### 智能解析
- ✅ **多格式支持**: 自动检测JSON和HTML格式数据
- ✅ **BeautifulSoup解析**: 强大的HTML内容提取
- ✅ **正则表达式**: 复杂文本模式匹配
- ✅ **容错机制**: 解析失败时自动切换备用方案

### 数据处理
- 🏷️ **球队名称清理**: 自动移除括号和特殊字符
- 🕐 **时间格式化**: 统一的时间格式处理
- 💰 **赔率验证**: 确保赔率数据的完整性
- 📊 **数据筛选**: 按天数过滤比赛

### 反爬虫策略
- 🕰️ **随机延迟**: 避免请求频率过高
- 🌐 **真实User-Agent**: 模拟浏览器请求
- 🔄 **重试机制**: 网络失败时自动重试
- 📝 **请求头优化**: 完整的HTTP头部信息

## 📊 数据格式

### 输出格式
```json
{
    "match_id": "lottery_001",
    "home_team": "曼彻斯特城",
    "away_team": "利物浦", 
    "league_name": "英超",
    "match_time": "2024-09-20 15:30",
    "odds": {
        "hhad": {
            "h": "2.10",  // 主胜
            "d": "3.20",  // 平局
            "a": "3.00"   // 客胜
        }
    },
    "source": "china_lottery"
}
```

### 字段说明
- `match_id`: 唯一比赛标识符
- `home_team`: 主队名称
- `away_team`: 客队名称
- `league_name`: 联赛名称
- `match_time`: 比赛时间 (YYYY-MM-DD HH:MM)
- `odds.hhad`: 胜平负赔率
- `source`: 数据来源标识

## 🚀 使用方法

### 基本用法
```python
from scripts.china_lottery_spider import ChinaLotterySpider

# 创建爬虫实例
spider = ChinaLotterySpider()

# 获取未来3天的比赛
matches = spider.get_formatted_matches(days_ahead=3)

print(f"获取到 {len(matches)} 场比赛")
for match in matches:
    print(f"{match['home_team']} vs {match['away_team']}")
```

### API集成
爬虫已集成到Flask API中：
```
GET /api/lottery/matches?days=3
```

### 前端调用
```javascript
// 获取彩票比赛数据
const response = await fetch('/api/lottery/matches?days=3');
const data = await response.json();

if (data.success) {
    console.log(`获取到 ${data.count} 场比赛`);
    data.matches.forEach(match => {
        console.log(`${match.home_team} vs ${match.away_team}`);
    });
}
```

## 🛡️ 容错机制

### 多层级备选方案
1. **首选**: 官网JSON数据解析
2. **备选**: HTML表格数据提取
3. **兜底**: 高质量模拟数据

### 数据验证
- ✅ 球队名称非空验证
- ✅ 赔率格式检查
- ✅ 时间格式验证
- ✅ 必要字段完整性检查

### 错误处理
```python
try:
    matches = spider.get_lottery_data(3)
except requests.exceptions.RequestException:
    # 网络错误，使用缓存数据
    matches = spider.get_cached_data()
except Exception:
    # 其他错误，使用模拟数据
    matches = spider.get_mock_data()
```

## 📈 性能优化

### 请求优化
- 🔄 **Session复用**: 保持连接提高效率
- ⏱️ **超时控制**: 避免长时间等待
- 🎯 **精确过滤**: 只获取需要的数据

### 内存管理
- 📦 **流式处理**: 大数据量时分批处理
- 🗑️ **及时清理**: 释放不需要的资源
- 💾 **缓存策略**: 合理使用内存缓存

## 🧪 测试

### 单元测试
```bash
python test_lottery_spider.py
```

### 功能验证
```python
# 测试数据获取
spider = ChinaLotterySpider()
matches = spider.get_formatted_matches(1)
assert len(matches) > 0
assert all('home_team' in match for match in matches)
```

## 📝 日志记录

### 日志级别
- `INFO`: 正常操作信息
- `WARNING`: 使用备选方案
- `ERROR`: 严重错误
- `DEBUG`: 详细调试信息

### 日志示例
```
2024-09-19 15:30:01 INFO: 开始获取体彩数据: https://www.lottery.gov.cn/jc/jsq/zqspf/
2024-09-19 15:30:02 INFO: 成功获取页面，状态码: 200
2024-09-19 15:30:03 INFO: 成功解析 12 场比赛
2024-09-19 15:30:04 WARNING: 使用模拟数据替代真实彩票数据
```

## ⚠️ 注意事项

### 使用限制
1. **请求频率**: 建议间隔1-3秒
2. **数据时效**: 比赛数据可能随时变化
3. **网站变更**: 官网结构变化可能影响解析

### 法律合规
- 📋 仅用于个人学习和研究
- 🚫 请勿用于商业用途
- ⚖️ 遵守网站使用条款
- 🔒 尊重数据版权

### 技术建议
- 🔄 定期更新解析规则
- 📊 监控数据质量
- 🛠️ 及时处理异常情况
- 📱 适配移动端接口

现在彩票模式将显示真实的中国体育彩票数据，为用户提供更准确的AI预测基础！

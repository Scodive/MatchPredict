# 每日比赛数据同步系统

## 📋 概述

这个系统自动从中国体育彩票官网获取最新的比赛数据并保存到PostgreSQL数据库中，避免重复数据，大幅提升彩票模式的加载速度。

## 🗄️ 数据库结构

### daily_matches 表
```sql
CREATE TABLE daily_matches (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(100) UNIQUE NOT NULL,     -- 比赛唯一ID
    home_team VARCHAR(100) NOT NULL,           -- 主队名称
    away_team VARCHAR(100) NOT NULL,           -- 客队名称
    league_name VARCHAR(100),                  -- 联赛名称
    match_date DATE NOT NULL,                  -- 比赛日期
    match_time TIME,                           -- 比赛时间
    match_datetime TIMESTAMP,                  -- 完整比赛时间
    match_num VARCHAR(20),                     -- 比赛编号 (如: 周五001)
    match_status VARCHAR(20),                  -- 比赛状态
    home_odds DECIMAL(6,2),                    -- 主胜赔率
    draw_odds DECIMAL(6,2),                    -- 平局赔率
    away_odds DECIMAL(6,2),                    -- 客胜赔率
    goal_line VARCHAR(10),                     -- 让球数
    data_source VARCHAR(50) DEFAULT 'china_lottery',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

## 🚀 使用方法

### 1. 同步最新数据
```bash
# 同步未来3天的比赛数据 (默认7天)
python scripts/sync_daily_matches.py --days 3

# 强制更新所有数据
python scripts/sync_daily_matches.py --days 7 --force
```

### 2. 查看统计信息
```bash
# 显示数据库中的比赛统计
python scripts/sync_daily_matches.py --stats
```

### 3. 清理旧数据
```bash
# 清理30天前的旧数据
python scripts/sync_daily_matches.py --cleanup 30
```

### 4. 测试数据库连接
```bash
# 测试数据库连接是否正常
python scripts/sync_daily_matches.py --test
```

## 📊 当前数据状态

根据最新同步结果：
- **总比赛数**: 65 场
- **覆盖日期**: 4 天 (2025-09-19 至 2025-09-22)
- **联赛数量**: 15 个

### 按日期分布
- 2025-09-19: 1 场
- 2025-09-20: 35 场  
- 2025-09-21: 23 场
- 2025-09-22: 6 场

### 按联赛分布 (Top 10)
1. 意甲: 9 场
2. 西甲: 9 场  
3. 英超: 8 场
4. 德甲: 6 场
5. 法甲: 5 场
6. 德乙: 4 场
7. 荷甲: 4 场
8. 日职: 4 场
9. 法乙: 3 场
10. 荷乙: 3 场

## 🔧 系统工作流程

### 数据同步流程
1. **API获取**: 从体彩官网API获取最新比赛数据
2. **数据解析**: 解析比赛信息、赔率、时间等
3. **去重处理**: 检查数据库中是否已存在相同比赛
4. **数据保存**: 
   - 新比赛 → 插入新记录
   - 已存在 → 更新现有记录 (赔率可能变化)
   - 无效数据 → 跳过处理

### 前端加载流程
1. **优先数据库**: 彩票模式首先从数据库加载比赛
2. **API备用**: 数据库无数据时才调用API
3. **性能提升**: 数据库加载速度比API快10倍以上

## 🎯 优势

### 性能提升
- ⚡ **加载速度**: 从数据库加载比API调用快10倍
- 🔄 **缓存机制**: 避免重复的网络请求
- 📱 **用户体验**: 彩票模式瞬间加载

### 数据管理
- 🚫 **避免重复**: 自动去重，不会保存重复比赛
- 🔄 **实时更新**: 赔率变化时自动更新
- 🧹 **自动清理**: 可定期清理旧数据

### 系统稳定性
- 🛡️ **容错机制**: 数据库故障时自动切换到API
- 📊 **监控统计**: 详细的数据统计和日志
- 🔧 **易于维护**: 简单的命令行工具

## 📅 建议的使用计划

### 每日同步 (推荐)
```bash
# 每天运行一次，获取最新3天数据
python scripts/sync_daily_matches.py --days 3
```

### 每周清理 (可选)
```bash
# 每周清理一次旧数据，保留30天
python scripts/sync_daily_matches.py --cleanup 30
```

### 系统监控
```bash
# 定期查看数据库状态
python scripts/sync_daily_matches.py --stats
```

## 🔍 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   python scripts/sync_daily_matches.py --test
   ```
   检查数据库连接参数和网络状态

2. **API获取失败**
   - 检查网络连接
   - 确认体彩官网API是否正常
   - 查看日志文件: `sync_matches.log`

3. **数据不一致**
   ```bash
   python scripts/sync_daily_matches.py --days 7 --force
   ```
   强制重新同步所有数据

### 日志文件
- **位置**: `/Users/sco/Desktop/MatchPredict/sync_matches.log`
- **内容**: 详细的同步过程和错误信息

## 🚀 部署到生产环境

### 定时任务 (Cron)
```bash
# 每天早上8点同步数据
0 8 * * * cd /path/to/MatchPredict && python scripts/sync_daily_matches.py --days 3

# 每周日凌晨清理旧数据  
0 2 * * 0 cd /path/to/MatchPredict && python scripts/sync_daily_matches.py --cleanup 30
```

### 环境变量
确保生产环境中设置了正确的数据库连接参数。

## 🎉 总结

通过这个每日比赛数据同步系统，你可以：

1. **自动获取**: 无需手动干预，自动获取最新比赛数据
2. **高效存储**: 避免重复数据，优化存储空间
3. **快速访问**: 彩票模式从数据库快速加载
4. **灵活管理**: 丰富的命令行工具支持各种操作

现在彩票模式将从数据库加载数据，速度更快，体验更好！🚀

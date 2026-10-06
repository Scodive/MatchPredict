# 本次仓库整理

2026-10-06：仅整理公开仓库文件与重写文档，不改变原运行代码。

## 移动范围

- 根目录八份旧开发文档（含 `CHANGELOG.md`）移入 `docs/legacy/`，原文保持不变。
- 空 `backup.sql` 移入 `docs/legacy/`，未执行 SQL。
- `.DS_Store`、Python 字节码缓存、旧运行日志移入忽略的 `archive/local/`，内容可恢复，不作为新版展示内容发布。
- 原 README 副本保留在 `archive/local/README.before-20261006.md`。
- 根目录运行代码、`scripts/`、`static/`、`templates/`、`js/`、`logos/`、`data/` 不调整引用路径、不合并重复代码。

`archive/local/` 仅是本地恢复副本，不纳入公开 Git 提交。原已被追踪的日志和字节码需要在后续提交中记录移除，`.gitignore` 本身不会删除 Git 历史。此次不清理 Git 历史。

## 新文档与素材

- 新 README：优先引导线上体验，区分网站与基础示例。
- 文档索引、运行检查、统计快照与此整理说明。
- 三张线上真实截图，存放在 `docs/images/`。
- `.gitignore` 追加本地产物、凭证和环境目录忽略项；既有规则保留。

## 恢复

需要恢复旧目录时，可按文档名称从 `docs/legacy/` 移回根目录；缓存与日志的原路径保存在 `archive/local/` 下。不要用全仓库硬重置恢复，以免覆盖整理前已有的本地改动。

本次不提交、不推送、不部署，也不更改另一个私有项目的文件。

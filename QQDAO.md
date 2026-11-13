# QQ岛（ai.qqdao.com）定制说明

`qqdao` 分支 = 上游 [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) 的发布版本 + 本站前端定制。
只改前端，后端始终使用官方镜像 `weishaw/sub2api:<版本>`。

## 定制内容

| 提交 | 内容 |
|---|---|
| style | `frontend/src/qqdao-theme.css` 主题样式 |
| feat | 模型价格页改版、侧栏导航、公开的 `/guide` 使用教程（`views/user/GuideView.vue`） |
| fix(ccswitch) | 导入 CC Switch 时选用分组实际提供的模型（`utils/ccswitchImport.ts`、`views/user/KeysView.vue`） |
| feat(seo) | 公开页预渲染与 SEO 元信息（`scripts/qqdao-seo.ts`、`src/qqdaoSeo.ts`、路由 `meta.documentTitle`） |

## 线上架构

- 后端：容器 `sub2api`，镜像标签写在服务器 `/data/sub2api/docker-compose.yml`，必须与实际运行的版本一致。
- 前端：这个分支单独打包成静态文件，放在 `/data/sub2api/caddy_config/qqdao-ui/<发布号>/`。
  Caddy 通过 `@qqdaoPages` 把页面路由指向当前发布号，`/api`、`/v1` 等请求仍交给后端。
- 后台版本号下拉里的「一键升级」和「回滚」已在本分支关闭（`components/common/QqdaoUpgradeHint.vue`），
  改为提示用脚本升级。它们只会替换后端程序，会让前后端版本和 compose 标签不一致。

## 升级到上游新版本

```sh
git fetch https://github.com/Wei-Shaw/sub2api.git --tags
git switch qqdao
git merge <新版本 tag 或提交>        # 解决冲突，重点是 KeysView.vue、ccswitchImport.ts、router、AppSidebar
cd frontend
pnpm install
npx vue-tsc --noEmit
npx vitest run src/utils/__tests__/ccswitchImport src/views/user/__tests__
npx vite build --base=/qqdao-ui/<发布号>/ --outDir /tmp/qqdao-ui-<发布号> --emptyOutDir
node scripts/qqdao-seo.ts /tmp/qqdao-ui-<发布号>    # 必须执行：生成 seo/*.html、robots.txt、sitemap.xml、favicon.svg
```

`qqdao-seo.ts` 会从线上公开接口读取首页内容（后台「首页内容」设置）、站点 Logo 和模型清单。
这些数据变化后，需要重新构建一个发布号，预渲染内容才会更新。SEO 标题和描述统一在 `src/qqdaoSeo.ts` 中修改。

发布（服务器脚本 `deploy/qqdao-upgrade.sh`，安装在 `/data/sub2api/qqdao-upgrade.sh`）：

1. 把构建产物上传到服务器 `/data/sub2api/caddy_config/qqdao-ui/<发布号>/`，不要覆盖旧目录。
2. 先演练：`/data/sub2api/qqdao-upgrade.sh <后端版本> <发布号> --dry-run`，确认 Caddyfile 的改动符合预期。
3. 正式执行：`/data/sub2api/qqdao-upgrade.sh <后端版本> <发布号>`。脚本依次完成：
   - 拉取官方镜像；
   - 保存 Caddyfile 和 compose 到 `qqdao-theme/upgrade/<时间>/`；
   - 新增 `handle_path` 并把 `@qqdaoSeoFiles`、`@qqdaoPages` 指向新发布号；
   - 修改 compose 标签并重建后端，等待 healthy 并核对运行版本；
   - 检查 `/`、`/guide`、`/model-plaza`、`/keys` 和接口。
   任何一步失败都会自动恢复原来的 Caddyfile 和 compose。
4. 只改了前端时：`qqdao-upgrade.sh frontend <发布号>`，后端不会重启。
5. 回滚：`qqdao-upgrade.sh rollback`，恢复到最近一次执行前的状态；查看现状：`qqdao-upgrade.sh status`。
6. `--db-backup` 会在升级前 `pg_dump` 数据库。新版本可能升级数据库结构，回退后端前需要确认兼容。磁盘剩余空间小于数据库大小时，脚本会拒绝执行备份。
7. 上游如果新增了前端页面路由，要同步加进 Caddyfile 的 `@qqdaoPages` 白名单。

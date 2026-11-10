# QQ岛（ai.qqdao.com）定制说明

`qqdao` 分支 = 上游 [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) 的发布版本 + 本站前端定制。
只改前端，后端始终使用官方镜像 `weishaw/sub2api:<版本>`。

## 定制内容

| 提交 | 内容 |
|---|---|
| style | `frontend/src/qqdao-theme.css` 主题样式 |
| feat | 模型价格页改版、侧栏导航、公开的 `/guide` 使用教程（`views/user/GuideView.vue`） |
| fix(ccswitch) | 导入 CC Switch 时选用分组实际提供的模型（`utils/ccswitchImport.ts`、`views/user/KeysView.vue`） |

## 线上架构

- 后端：容器 `sub2api`，镜像标签写在服务器 `/data/sub2api/docker-compose.yml`，必须与实际运行的版本一致。
- 前端：这个分支单独打包成静态文件，放在 `/data/sub2api/caddy_config/qqdao-ui/<发布号>/`。
  Caddy 通过 `@qqdaoPages` 把页面路由指向当前发布号，`/api`、`/v1` 等请求仍交给后端。
- 后台的「一键升级」只会替换后端程序，不会更新这里的前端，也不会修改 compose 的镜像标签。
  **不要直接点一键升级**，请按下面的流程升级。

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
```

发布：

1. 把构建产物上传到服务器的新发布号目录，不要覆盖旧目录。
2. 备份 Caddyfile，新增该发布号的 `handle_path`，并把 `@qqdaoPages` 的 root 指向新发布号；旧发布号的路由保留。
   写入时用 `cat 新文件 > Caddyfile`，保持 inode 不变，否则容器看不到改动。
3. `caddy validate` 后执行 `caddy reload`。
4. 后端：把 compose 的镜像标签改成新版本，然后 `docker compose up -d sub2api`。
5. 上游如果新增了前端页面路由，要同步加进 Caddyfile 的 `@qqdaoPages` 白名单。

回滚：用备份的 Caddyfile 覆盖并 reload；后端改回原来的镜像标签后重建容器。

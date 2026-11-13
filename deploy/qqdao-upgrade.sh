#!/usr/bin/env bash
# QQ岛（ai.qqdao.com）升级脚本：前端（Caddy 发布号）与后端（官方镜像）一起切换，失败自动回退。
#
# 用法（在服务器上执行）：
#   qqdao-upgrade.sh <后端版本> <前端发布号> [--db-backup] [--dry-run]
#       例：qqdao-upgrade.sh 0.2.22 r20261120a --db-backup
#   qqdao-upgrade.sh frontend <前端发布号> [--dry-run]   只切换前端，不动后端
#   qqdao-upgrade.sh rollback                           恢复到最近一次升级前的 Caddyfile 与 compose
#   qqdao-upgrade.sh status                             查看当前前端发布号与后端版本
#
# 前提：新前端已上传到 /data/sub2api/caddy_config/qqdao-ui/<前端发布号>/（含 seo/ 预渲染文件），
#       构建流程见 qqdao 分支的 QQDAO.md。
set -euo pipefail

BASE=/data/sub2api
UI_DIR=$BASE/caddy_config/qqdao-ui
CADDYFILE=$BASE/Caddyfile
COMPOSE=$BASE/docker-compose.yml
STATE_ROOT=$BASE/qqdao-theme/upgrade
SITE=ai.qqdao.com
IMAGE=weishaw/sub2api

DRY_RUN=0
DB_BACKUP=0
ARGS=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --db-backup) DB_BACKUP=1 ;;
    *) ARGS+=("$a") ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
mkdir -p "$STATE_ROOT"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
die() { log "错误：$*"; exit 1; }
run() { if [ "$DRY_RUN" = 1 ]; then log "(dry-run) $*"; else "$@"; fi; }

caddy() { docker exec sub2api-caddy caddy "$@" --config /etc/caddy/Caddyfile --adapter caddyfile; }

current_release() {
  # @qqdaoPages 等处的 root（不在 handle_path 内）指向当前发布号
  python3 - "$CADDYFILE" <<'PY'
import re, sys
lines = open(sys.argv[1]).read().split("\n")
for i, l in enumerate(lines):
    m = re.match(r"\s*root \* /config/qqdao-ui/(\S+)$", l)
    if m and not lines[i - 1].strip().startswith("handle_path /qqdao-ui/"):
        print(m.group(1)); break
PY
}

current_image() { sed -n "s#^\s*image: \($IMAGE:[^ ]*\)\s*\$#\1#p" "$COMPOSE" | head -1; }

running_version() { docker exec sub2api /app/sub2api --version 2>&1 | grep -o 'Sub2API [0-9][0-9.]*' | head -1 | cut -d' ' -f2; }

status() {
  echo "前端发布号：$(current_release)"
  echo "compose 镜像：$(current_image)"
  echo "运行中后端：$(running_version)"
  echo "容器状态：$(docker inspect -f '{{.State.Health.Status}}' sub2api 2>/dev/null || echo 未知)"
}

save_state() {
  STATE=$STATE_ROOT/$(date +%Y%m%d%H%M%S)
  run mkdir -p "$STATE"
  run cp "$CADDYFILE" "$STATE/Caddyfile"
  run cp "$COMPOSE" "$STATE/docker-compose.yml"
  if [ "$DRY_RUN" = 0 ]; then
    { echo "release=$(current_release)"; echo "image=$(current_image)"; echo "running=$(running_version)"; } > "$STATE/info"
    ln -sfn "$STATE" "$STATE_ROOT/last"
  fi
  log "已保存升级前状态：$STATE"
}

switch_frontend() {
  local new=$1 old
  old=$(current_release)
  [ -n "$old" ] || die "Caddyfile 中找不到当前前端发布号"
  [ -f "$UI_DIR/$new/index.html" ] && [ -f "$UI_DIR/$new/seo/home.html" ] || die "$UI_DIR/$new 缺少 index.html 或 seo/ 预渲染文件"
  if [ "$old" = "$new" ]; then log "前端已经是 $new，跳过"; return; fi
  log "前端：$old → $new"
  python3 - "$CADDYFILE" "$old" "$new" > /tmp/Caddyfile.qqdao-new <<'PY'
import sys
path, old, new = sys.argv[1:]
s = open(path).read()
if f"handle_path /qqdao-ui/{new}/*" not in s:
    first = f"        handle_path /qqdao-ui/{old}/* {{"
    if s.count(first) != 1:
        sys.exit("找不到当前发布号的 handle_path 块")
    blk = (f"        handle_path /qqdao-ui/{new}/* {{\n"
           f"            root * /config/qqdao-ui/{new}\n"
           '            header Cache-Control "public, max-age=31536000, immutable"\n'
           "            header X-Content-Type-Options nosniff\n"
           "            file_server\n"
           "        }\n\n")
    s = s.replace(first, blk + first, 1)
out = []
for l in s.split("\n"):
    if l.strip() == f"root * /config/qqdao-ui/{old}" and not out[-1].strip().startswith(f"handle_path /qqdao-ui/{old}"):
        l = l.replace(old, new)
    out.append(l)
sys.stdout.write("\n".join(out))
PY
  if [ "$DRY_RUN" = 1 ]; then
    diff "$CADDYFILE" /tmp/Caddyfile.qqdao-new || true
    return
  fi
  cat /tmp/Caddyfile.qqdao-new > "$CADDYFILE"   # 保持 inode，容器内挂载才能看到
  caddy validate >/dev/null 2>&1 || { restore_state; die "Caddyfile 校验失败，已回退"; }
  caddy reload >/dev/null 2>&1 || { restore_state; die "Caddy reload 失败，已回退"; }
}

switch_backend() {
  local ver=$1 cur
  cur=$(current_image)
  log "后端：$cur → $IMAGE:$ver"
  if [ "$DB_BACKUP" = 1 ]; then
    local need avail
    need=$(docker exec sub2api-postgres psql -U sub2api -d sub2api -tAc "select pg_database_size('sub2api')/1024")
    avail=$(df -Pk "$STATE_ROOT" | awk 'NR==2{print $4}')
    [ "$avail" -gt "$need" ] || die "磁盘剩余 ${avail}KB 少于数据库大小 ${need}KB，无法备份；清理磁盘或去掉 --db-backup"
    log "备份数据库到 $STATE/db.dump ..."
    if [ "$DRY_RUN" = 0 ]; then
      docker exec sub2api-postgres pg_dump -U sub2api -Fc sub2api > "$STATE/db.dump" || die "数据库备份失败"
    fi
  else
    log "未备份数据库（新版本可能升级数据库结构，回退后端前请确认兼容）"
  fi
  run sed -i "s#image: $IMAGE:[^ ]*#image: $IMAGE:$ver#" "$COMPOSE"
  if [ "$DRY_RUN" = 1 ]; then return; fi
  (cd "$BASE" && docker compose config -q) || { restore_state; die "compose 配置无效，已回退"; }
  (cd "$BASE" && docker compose up -d sub2api) || { restore_state; die "重建后端失败，已回退"; }
  log "等待后端健康检查..."
  for _ in $(seq 1 60); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' sub2api 2>/dev/null)" = healthy ] && break
    sleep 3
  done
  [ "$(docker inspect -f '{{.State.Health.Status}}' sub2api)" = healthy ] || { restore_state; die "后端 3 分钟内未变为 healthy，已回退"; }
  [ "$(running_version)" = "$ver" ] || { restore_state; die "运行中后端版本 $(running_version) 与目标 $ver 不一致，已回退"; }
}

verify_site() {
  local rel=$1 code body
  for p in / /guide /model-plaza /keys /api/v1/settings/public; do
    code=$(curl -s -o /tmp/qqdao-check -w '%{http_code}' --max-time 15 --resolve "$SITE:443:127.0.0.1" "https://$SITE$p")
    [ "$code" = 200 ] || return 1
    case "$p" in /api/*) ;; *) grep -q "/qqdao-ui/$rel/" /tmp/qqdao-check || return 1 ;; esac
  done
}

restore_state() {
  local dir=${1:-${STATE:-}}
  [ -n "$dir" ] && [ -d "$dir" ] || die "没有可恢复的状态目录"
  log "恢复 $dir 中的 Caddyfile 与 compose"
  cat "$dir/Caddyfile" > "$CADDYFILE"
  caddy reload >/dev/null 2>&1 || log "警告：Caddy reload 失败，请手动检查"
  if ! cmp -s "$dir/docker-compose.yml" "$COMPOSE"; then
    cat "$dir/docker-compose.yml" > "$COMPOSE"
    (cd "$BASE" && docker compose up -d sub2api) || log "警告：后端重建失败，请手动检查"
  fi
  [ -f "$dir/db.dump" ] && log "数据库备份在 $dir/db.dump（如需恢复请手动 pg_restore）"
  return 0
}

case "${1:-}" in
  status) status ;;
  rollback)
    [ -L "$STATE_ROOT/last" ] || die "没有升级记录"
    restore_state "$(readlink -f "$STATE_ROOT/last")"
    status ;;
  frontend)
    rel=${2:-}; [ -n "$rel" ] || die "缺少前端发布号"
    save_state
    switch_frontend "$rel"
    [ "$DRY_RUN" = 1 ] || { verify_site "$rel" || { restore_state; die "站点检查失败，已回退"; }; }
    log "完成"; status ;;
  [0-9]*)
    ver=$1; rel=${2:-}
    [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "版本号格式应为 0.2.22"
    [ -n "$rel" ] || die "缺少前端发布号；后端和前端必须一起升级"
    log "拉取镜像 $IMAGE:$ver ..."
    docker pull -q "$IMAGE:$ver" >/dev/null || die "镜像不存在或拉取失败"
    save_state
    switch_frontend "$rel"
    switch_backend "$ver"
    [ "$DRY_RUN" = 1 ] || { verify_site "$rel" || { restore_state; die "站点检查失败，已回退"; }; }
    log "完成"; status ;;
  *)
    sed -n '2,13p' "$0"; exit 1 ;;
esac

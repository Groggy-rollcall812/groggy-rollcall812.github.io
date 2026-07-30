#!/usr/bin/env bash
# 一键部署到 GitHub Pages
#
# 用法：
#   ./deploy.sh              提交信息用默认的时间戳
#   ./deploy.sh "加了番茄钟"   自定义提交信息
#
# 凭证存在 macOS 钥匙串里，不用输密码。

set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-更新 $(date '+%Y-%m-%d %H:%M')}"

if [ -z "$(git status --porcelain)" ]; then
  echo "没有改动，不用部署"
  exit 0
fi

echo "本次改动："
git status --short
echo

git add -A
git commit -q -m "$MSG"
git push -q origin main

echo "已推送：$MSG"
echo "等一两分钟生效 → https://winnicoco99.github.io/"

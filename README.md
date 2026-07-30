# 我的工作台

个人小工具集合，纯静态页面，部署在 GitHub Pages。

线上地址：https://winnicoco99.github.io/

## 目录结构

```
index.html          工作台首页，读 tools.js 渲染卡片
tools.js            工具清单 —— 加新工具只改这个文件
manifest.json       PWA 配置，让「添加到主屏幕」后没有地址栏
sw.js               Service Worker，断网也能打开
make_icons.py       生成图标，改配色后重新跑
icons/              图标（由脚本生成）
tools/
  notes/            随手记
```

## 加一个新工具

1. 建目录和页面：`tools/新工具名/index.html`
2. 在 `tools.js` 里加一条：

```js
{
  path: 'tools/新工具名/',
  name: '显示的名字',
  desc: '一句话说明',
  icon: '🔧',
  tag: ''
}
```

3. 提交：

```bash
git add -A
git commit -m "add 新工具"
git push
```

一分钟内线上生效。

## 本地预览

```bash
python3 -m http.server 8000
```

然后打开 http://localhost:8000

注意：直接双击 html 文件用 `file://` 打开的话，Service Worker 不会生效，得走 http。

## 手机上添加到主屏幕

- iPhone Safari：打开链接 → 分享按钮 → 添加到主屏幕
- Android Chrome：打开链接 → 右上角菜单 → 添加到主屏幕

加完之后从桌面图标点进来，没有浏览器地址栏，跟原生 app 观感一致。

## 说明

- 所有数据存在浏览器 localStorage，只在这台设备上，不上传任何服务器
- 换设备数据不会跟着走
- 仓库是公开的，别往里放任何私密内容

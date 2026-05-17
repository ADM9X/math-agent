# 数学小探险 (Math Adventure)

一个纯前端的智能数学辅导系统，面向小学生，基于 DeepSeek LLM 构建。

## 功能特点

- 🎯 **几何模块** - 2D/3D 图形探索，支持拖拽顶点、实时显示角度和边长
- 🔢 **分数模块** - 圆形/矩形分数切分，分子/分母识别
- 🔄 **变换模块** - 平移/旋转/镜像，网格辅助理解
- 📏 **线段模块** - 线段拖拽长度、比例显示

## 技术栈

- 纯原生 JavaScript，零框架依赖
- Canvas 2D 渲染
- DeepSeek API (OpenAI 兼容接口)
- 支持鼠标和触控操作

## 快速开始

```bash
# 本地运行
cd math-agent
python3 -m http.server 8080

# 打开浏览器访问
# http://localhost:8080
```

## 配置 API Key

1. 复制 `js/config.js` 为 `js/config.local.js`
2. 在 `js/config.local.js` 中填入你的 DeepSeek API Key
3. 在 `index.html` 中引入（仅本地开发）

```html
<script src="js/config.local.js"></script>
```

## 部署

已配置 Vercel/Netlify 适配，直接推送 GitHub 即可自动部署。

## License

MIT
// ===== Canvas 通用引擎 =====
const canvasEngine = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,

    // 当前激活的渲染回调（由模块注册）
    renderFn: null,

    // 交互事件回调
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null,
    onDoubleClick: null,

    // 动画循环
    animFrameId: null,

    // 初始化
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.resize();
        this.bindEvents();
        this.startLoop();

        window.addEventListener('resize', () => this.resize());
    },

    // 自适应尺寸
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    // 获取逻辑坐标（相对于canvas左上角）
    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    },

    // 事件绑定
    bindEvents() {
        this.canvas.addEventListener('pointerdown', (e) => {
            const pos = this.getPos(e);
            if (this.onPointerDown) this.onPointerDown(pos, e);
        });

        this.canvas.addEventListener('pointermove', (e) => {
            const pos = this.getPos(e);
            if (this.onPointerMove) this.onPointerMove(pos, e);
        });

        this.canvas.addEventListener('pointerup', (e) => {
            const pos = this.getPos(e);
            if (this.onPointerUp) this.onPointerUp(pos, e);
        });

        this.canvas.addEventListener('pointerleave', (e) => {
            const pos = this.getPos(e);
            if (this.onPointerUp) this.onPointerUp(pos, e);
        });

        this.canvas.addEventListener('dblclick', (e) => {
            const pos = this.getPos(e);
            if (this.onDoubleClick) this.onDoubleClick(pos, e);
        });

        // 防止移动端双击缩放
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) e.preventDefault();
        }, { passive: false });
    },

    // 渲染循环
    startLoop() {
        const loop = () => {
            this.clear();
            if (this.renderFn) this.renderFn(this.ctx, this.width, this.height);
            this.animFrameId = requestAnimationFrame(loop);
        };
        loop();
    },

    stopLoop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    },

    // 清空画布
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    },

    // 设置渲染回调
    setRender(fn) {
        this.renderFn = fn;
    },

    // 设置交互回调
    setInteractions({ onDown, onMove, onUp, onDblClick }) {
        this.onPointerDown = onDown || null;
        this.onPointerMove = onMove || null;
        this.onPointerUp = onUp || null;
        this.onDoubleClick = onDblClick || null;
    },

    // ----- 绘图辅助方法 -----

    // 绘制圆点（顶点手柄）
    drawHandle(ctx, x, y, radius = 8, color = '#4F46E5') {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // 绘制虚线
    drawDashedLine(ctx, x1, y1, x2, y2, color = '#94A3B8', dashLen = 6) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([dashLen, dashLen]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    },

    // 绘制箭头
    drawArrow(ctx, x1, y1, x2, y2, color = '#4F46E5') {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 10;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headLen * Math.cos(angle - Math.PI / 6),
            y2 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x2 - headLen * Math.cos(angle + Math.PI / 6),
            y2 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    },

    // 绘制角度弧线
    drawAngleArc(ctx, cx, cy, radius, startAngle, endAngle, color = '#F59E0B') {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // 绘制带文字的标签
    drawLabel(ctx, x, y, text, fontSize = 13, color = '#1E293B', bg = 'rgba(255,255,255,0.85)') {
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        const m = ctx.measureText(text);
        const pw = m.width + 8;
        const ph = fontSize + 6;

        ctx.fillStyle = bg;
        ctx.fillRect(x - pw / 2, y - ph / 2, pw, ph);

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    },

    // 检测点击是否在圆形区域内
    hitTestCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    },

    // 检测点击是否在线段上
    hitTestLine(px, py, x1, y1, x2, y2, threshold = 8) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return this.hitTestCircle(px, py, x1, y1, threshold);
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const nx = x1 + t * dx;
        const ny = y1 + t * dy;
        return this.hitTestCircle(px, py, nx, ny, threshold);
    },

    // 计算两点距离
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // 计算三角形角度（顶点在p，两边分别到a和b）
    calcAngle(px, py, ax, ay, bx, by) {
        const v1x = ax - px, v1y = ay - py;
        const v2x = bx - px, v2y = by - py;
        const dot = v1x * v2x + v1y * v2y;
        const cross = v1x * v2y - v1y * v2x;
        return Math.atan2(Math.abs(cross), dot);
    },
};

const canvasPlaceholder = document.getElementById('canvasPlaceholder');

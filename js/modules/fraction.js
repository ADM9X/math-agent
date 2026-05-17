// ===== 模块二：分数认识 =====
const fractionModule = {
    engine: null,

    // 图形参数
    shape: 'circle',       // 'circle' | 'rect'
    dualMode: false,

    // 左图 / 单图
    left: { denominator: 4, numerator: 2, centerX: 0, centerY: 0, radius: 0 },
    // 右图（双图模式）
    right: { denominator: 8, numerator: 4, centerX: 0, centerY: 0, radius: 0 },

    init(engine) {
        this.engine = engine;
        this._toolbarHandler = (e) => this.handleToolbar(e.detail.action);
        this.updateLayout(engine.width, engine.height);

        engine.setRender((ctx, w, h) => {
            this.updateLayout(w, h);
            this.render(ctx, w, h);
        });
        engine.setInteractions({
            onDown: (pos) => this.onDown(pos),
            onMove: () => {},
            onUp: () => {},
        });
        engine.canvas.style.cursor = 'default';

        document.addEventListener('toolbarAction', this._toolbarHandler);
    },

    destroy() {
        this.engine.setRender(null);
        this.engine.setInteractions({});
        document.removeEventListener('toolbarAction', this._toolbarHandler);
    },

    updateLayout(w, h) {
        if (this.dualMode) {
            const half = w / 2;
            const r = Math.min(half * 0.6, h * 0.3);
            this.left.centerX = half / 2;
            this.left.centerY = h / 2;
            this.left.radius = r;
            this.right.centerX = half + half / 2;
            this.right.centerY = h / 2;
            this.right.radius = r;
        } else {
            const r = Math.min(w, h) * 0.3;
            this.left.centerX = w / 2;
            this.left.centerY = h / 2;
            this.left.radius = r;
        }
    },

    getState() {
        const s = {
            mode: this.dualMode ? 'dual' : 'single',
            left: {
                shape: this.shape,
                denominator: this.left.denominator,
                numerator: this.left.numerator,
                value: parseFloat((this.left.numerator / this.left.denominator).toFixed(3)),
            },
            operation: this._lastOp || null,
        };
        if (this.dualMode) {
            s.right = {
                shape: this.shape,
                denominator: this.right.denominator,
                numerator: this.right.numerator,
                value: parseFloat((this.right.numerator / this.right.denominator).toFixed(3)),
            };
        }
        return s;
    },

    getHelp() {
        return `<p><b>点击扇形/长方形块</b>：填色或取消填色，表示分子</p>
            <p><b>分母滑块</b>：拖动画布下方的滑块调整分母（2-12）</p>
            <p><b>底部工具栏</b>：切换圆形/长方形、开启双图比较模式</p>
            <p>在双图模式下，可以分别操作左右两个图形来比较分数大小。</p>`;
    },

    _lastOp: null,

    reportOperation(desc) {
        this._lastOp = desc;
        updateContext(desc, this.getState());
    },

    // ---- 交互 ----
    onDown(pos) {
        const { left, right, dualMode, shape } = this;

        // 检查是否点击了左侧图形
        let target = dualMode ? null : left;
        let clickedIdx = -1;
        let clickedSide = 'left';

        // 左侧
        clickedIdx = this.hitTestSection(pos, left, shape);
        if (clickedIdx >= 0) {
            target = left;
            clickedSide = 'left';
        }

        // 右侧（双图模式）
        if (dualMode && clickedIdx < 0) {
            clickedIdx = this.hitTestSection(pos, right, shape);
            if (clickedIdx >= 0) {
                target = right;
                clickedSide = 'right';
            }
        }

        if (clickedIdx >= 0 && target) {
            // 切换填色
            if (target.filled && target.filled.has(clickedIdx)) {
                target.filled.delete(clickedIdx);
                target.numerator = Math.max(0, target.numerator - 1);
            } else {
                if (!target.filled) target.filled = new Set();
                target.filled.add(clickedIdx);
                target.numerator = target.filled.size;
            }
            const label = dualMode ? `（${clickedSide === 'left' ? '左图' : '右图'}）` : '';
            this.reportOperation(`切换了${label}第${clickedIdx + 1}份填色`);
        }

        // 检查分母滑块区域
        if (dualMode) {
            this.checkSliderClick(pos, left, '左图');
            this.checkSliderClick(pos, right, '右图');
        } else {
            this.checkSliderClick(pos, left, '');
        }
    },

    hitTestSection(pos, cfg, shape) {
        const cx = cfg.centerX, cy = cfg.centerY, r = cfg.radius;
        const n = cfg.denominator;

        if (shape === 'circle') {
            const dx = pos.x - cx, dy = pos.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > r) return -1;
            // 计算点击在第几份（从正上方顺时针）
            let angle = Math.atan2(dx, -dy); // 0° = 顶部
            if (angle < 0) angle += Math.PI * 2;
            const idx = Math.floor(angle / (Math.PI * 2 / n));
            return idx;
        } else {
            // 长方形：水平等分
            const left = cx - r;
            const right = cx + r;
            const top = cy - r * 0.65;
            const bottom = cy + r * 0.65;
            if (pos.x < left || pos.x > right || pos.y < top || pos.y > bottom) return -1;
            const sectionW = (right - left) / n;
            const idx = Math.floor((pos.x - left) / sectionW);
            return idx >= 0 && idx < n ? idx : -1;
        }
    },

    checkSliderClick(pos, cfg, label) {
        if (!cfg._sliderRect) return;
        const sr = cfg._sliderRect;
        if (pos.x >= sr.x && pos.x <= sr.x + sr.w && pos.y >= sr.y && pos.y <= sr.y + sr.h) {
            // 根据点击位置计算分母
            const relX = pos.x - sr.x;
            const step = sr.w / 11; // 2-12 = 11 steps
            const newDen = Math.max(2, Math.min(12, Math.round(relX / step) + 2));
            if (newDen !== cfg.denominator) {
                cfg.denominator = newDen;
                cfg.numerator = Math.min(cfg.numerator, cfg.denominator);
                cfg.filled = new Set();
                for (let i = 0; i < cfg.numerator; i++) cfg.filled.add(i);
                this.reportOperation(`调整${label}分母为${newDen}`);
            }
        }
    },

    handleToolbar(action) {
        switch (action) {
            case 'shapeCircle':
                this.shape = 'circle';
                document.querySelector('[data-action=shapeCircle]')?.classList.add('active');
                document.querySelector('[data-action=shapeRect]')?.classList.remove('active');
                this.reportOperation('切换为圆形');
                break;
            case 'shapeRect':
                this.shape = 'rect';
                document.querySelector('[data-action=shapeRect]')?.classList.add('active');
                document.querySelector('[data-action=shapeCircle]')?.classList.remove('active');
                this.reportOperation('切换为长方形');
                break;
            case 'dualMode':
                this.dualMode = !this.dualMode;
                document.querySelector('[data-action=dualMode]')?.classList.toggle('active', this.dualMode);
                if (this.dualMode) {
                    // 同步右图初始值
                    this.right.denominator = this.left.denominator === 4 ? 8 : 4;
                    this.right.numerator = Math.floor(this.right.denominator / 2);
                    this.right.filled = new Set();
                    for (let i = 0; i < this.right.numerator; i++) this.right.filled.add(i);
                }
                this.updateLayout(this.engine.width, this.engine.height);
                this.reportOperation(this.dualMode ? '开启双图比较' : '关闭双图比较');
                break;
        }
    },

    // ---- 渲染 ----
    render(ctx, w, h) {
        // 左侧（或单图）
        this.drawShape(ctx, this.left, this.shape, 0);
        this.drawSlider(ctx, this.left, (this.left.centerY + this.left.radius * 1.05 + 14));

        // 右侧（双图模式）
        if (this.dualMode) {
            this.drawShape(ctx, this.right, this.shape, 0);
            this.drawSlider(ctx, this.right, (this.right.centerY + this.right.radius * 1.05 + 14));

            // 中间分隔线
            ctx.beginPath();
            ctx.moveTo(w / 2, h * 0.15);
            ctx.lineTo(w / 2, h * 0.85);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 顶部居中信息面板
        this.drawInfoPanel(ctx, w);
    },

    // 顶部居中分数信息面板
    drawInfoPanel(ctx, w) {
        const left = this.left;
        const lVal = (left.numerator / left.denominator).toFixed(2);
        let text = `${left.numerator}/${left.denominator} = ${lVal}`;

        if (this.dualMode) {
            const right = this.right;
            const rVal = (right.numerator / right.denominator).toFixed(2);
            const cmp = left.numerator / left.denominator === right.numerator / right.denominator ? '＝'
                : left.numerator / left.denominator > right.numerator / right.denominator ? '＞' : '＜';
            text = `${left.numerator}/${left.denominator}  ${cmp}  ${right.numerator}/${right.denominator}`;
        }

        // 测量文本宽度
        ctx.font = 'bold 15px -apple-system, sans-serif';
        const tw = ctx.measureText(text).width;
        const pw = Math.min(tw + 40, w - 20);
        const ph = 32;
        const px = (w - pw) / 2;
        const py = 10;

        // 背景
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 8);
        ctx.fill();
        ctx.stroke();

        // 文字
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.fillStyle = '#4F46E5';
        ctx.fillText(text, w / 2, py + ph / 2);
    },

    drawShape(ctx, cfg, shape, angle) {
        const { centerX: cx, centerY: cy, radius: r, denominator: n } = cfg;
        if (!cfg.filled) {
            cfg.filled = new Set();
            for (let i = 0; i < cfg.numerator; i++) cfg.filled.add(i);
        }

        if (shape === 'circle') {
            this.drawCircle(ctx, cx, cy, r, n, cfg.filled, angle);
        } else {
            this.drawRect(ctx, cx, cy, r, n, cfg.filled);
        }

    },

    drawCircle(ctx, cx, cy, r, n, filled, angleOffset = 0) {
        const sliceAngle = (Math.PI * 2) / n;

        for (let i = 0; i < n; i++) {
            const startAngle = angleOffset + i * sliceAngle - Math.PI / 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);

            if (filled.has(i)) {
                // 渐变色区分相邻扇形
                const colors = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#6366F1', '#4F46E5'];
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
            }

            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // 外圈
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    drawRect(ctx, cx, cy, r, n, filled) {
        const w = r * 2;
        const h = r * 1.3;
        const left = cx - r;
        const top = cy - h / 2;
        const sectionW = w / n;

        for (let i = 0; i < n; i++) {
            const x = left + i * sectionW;

            if (filled.has(i)) {
                const colors = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#6366F1', '#4F46E5'];
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(x, top, sectionW, h);
            }

            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, top, sectionW, h);
        }

        // 外框
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, w, h);
    },

    drawSlider(ctx, cfg, topY) {
        const { centerX: cx, denominator: n } = cfg;
        const sw = cfg.radius * 1.2;
        const left = cx - sw / 2;
        const h = 16;

        // 滑轨
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(left, topY, sw, h, 8);
        ctx.fill();

        // 填充部分
        const ratio = (n - 2) / 10; // 2→0, 12→1
        ctx.fillStyle = '#4F46E5';
        ctx.beginPath();
        ctx.roundRect(left, topY, sw * ratio, h, 8);
        ctx.fill();

        // 滑块圆点
        const thumbX = left + sw * ratio;
        ctx.beginPath();
        ctx.arc(thumbX, topY + h / 2, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#4F46E5';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 存储滑块区域用于点击检测
        cfg._sliderRect = { x: left - 10, y: topY - 5, w: sw + 20, h: h + 20 };
    },
};

registerModule('fraction', {
    init: (engine) => fractionModule.init(engine),
    destroy: () => fractionModule.destroy(),
    getState: () => fractionModule.getState(),
    getHelp: () => fractionModule.getHelp(),
});

// ===== 模块四：线段图 =====
const segmentModule = {
    engine: null,

    // 线段数据
    segments: [],
    snapMode: true,

    // 拖拽状态
    dragging: null,   // { segIdx, handle: 'left'|'right'|'body', startX, startLength, ... }

    // 常数
    minLength: 30,
    barHeight: 24,
    barGap: 48,
    defaultLength: 120,

    init(engine) {
        this.engine = engine;
        this._toolbarHandler = (e) => this.handleToolbar(e.detail.action);

        // 默认：甲乙两段
        const cx = engine.width / 2;
        const cy = engine.height / 2;
        this.segments = [
            { id: 'A', label: '甲', x: cx - 200, y: cy - 30, length: 300, color: '#4F46E5' },
            { id: 'B', label: '乙', x: cx - 200, y: cy + 30, length: 100, color: '#F59E0B' },
        ];

        engine.setRender((ctx, w, h) => this.render(ctx, w, h));
        engine.setInteractions({
            onDown: (pos) => this.onDown(pos),
            onMove: (pos) => this.onMove(pos),
            onUp: (pos) => this.onUp(pos),
        });

        document.addEventListener('toolbarAction', this._toolbarHandler);
    },

    destroy() {
        this.engine.setRender(null);
        this.engine.setInteractions({});
        document.removeEventListener('toolbarAction', this._toolbarHandler);
    },

    getState() {
        const segs = this.segments.map(s => ({
            id: s.id,
            label: s.label,
            length: Math.round(s.length / 10) * 10, // 量化到10
        }));

        let ratio = null;
        if (segs.length === 2) {
            const r = segs[0].length / segs[1].length;
            if (r === Math.round(r)) {
                ratio = `${Math.round(r)}:1`;
            } else if (r < 1 && Math.round(1 / r) === 1 / r) {
                ratio = `1:${Math.round(1 / r)}`;
            } else {
                ratio = `${segs[0].length}:${segs[1].length}`;
            }
        }

        return {
            segments: segs,
            ratio,
            totalLength: segs.reduce((sum, s) => sum + s.length, 0),
            operation: this._lastOp || null,
        };
    },

    _lastOp: null,

    reportOperation(desc) {
        this._lastOp = desc;
        updateContext(desc, this.getState());
    },

    getHelp() {
        return `<p><b>拖拽线段两端</b>：调整线段的长度</p>
            <p><b>拖拽线段中间</b>：移动线段位置</p>
            <p><b>添加线段</b>：点击底部工具栏"+ 线段"</p>
            <p><b>对齐模式</b>：开启后拖动自动对齐到整数比例</p>
            <p>下方的比例关系会自动更新，帮你理解数量关系。</p>`;
    },

    // ---- 交互 ----
    onDown(pos) {
        for (let i = 0; i < this.segments.length; i++) {
            const s = this.segments[i];
            const leftX = s.x;
            const rightX = s.x + s.length;
            const midY = s.y;

            // 右端点
            if (this.engine.hitTestCircle(pos.x, pos.y, rightX, midY, 12)) {
                this.dragging = { segIdx: i, handle: 'right', startX: pos.x, startLength: s.length };
                this.engine.canvas.style.cursor = 'ew-resize';
                return;
            }
            // 左端点
            if (this.engine.hitTestCircle(pos.x, pos.y, leftX, midY, 12)) {
                this.dragging = { segIdx: i, handle: 'left', startX: pos.x, startLength: s.length, startX_pos: s.x };
                this.engine.canvas.style.cursor = 'ew-resize';
                return;
            }
            // 线段主体
            if (pos.x >= leftX && pos.x <= rightX &&
                pos.y >= s.y - this.barHeight / 2 && pos.y <= s.y + this.barHeight / 2) {
                this.dragging = { segIdx: i, handle: 'body', startX: pos.x, startY: pos.y, startX_pos: s.x, startY_pos: s.y };
                this.engine.canvas.style.cursor = 'grabbing';
                return;
            }
        }
    },

    onMove(pos) {
        if (!this.dragging) {
            // 悬停检测
            let cursor = 'default';
            for (const s of this.segments) {
                const leftX = s.x, rightX = s.x + s.length;
                if (this.engine.hitTestCircle(pos.x, pos.y, leftX, s.y, 12) ||
                    this.engine.hitTestCircle(pos.x, pos.y, rightX, s.y, 12)) {
                    cursor = 'ew-resize';
                    break;
                }
                if (pos.x >= leftX && pos.x <= rightX &&
                    pos.y >= s.y - this.barHeight / 2 && pos.y <= s.y + this.barHeight / 2) {
                    cursor = 'grab';
                    break;
                }
            }
            this.engine.canvas.style.cursor = cursor;
            return;
        }

        const d = this.dragging;
        const s = this.segments[d.segIdx];

        if (d.handle === 'right') {
            const dx = pos.x - d.startX;
            let newLen = Math.max(this.minLength, d.startLength + dx);
            if (this.snapMode) newLen = Math.round(newLen / 10) * 10;
            s.length = newLen;
        } else if (d.handle === 'left') {
            const dx = pos.x - d.startX;
            let newX = d.startX_pos + dx;
            const rightX = s.x + s.length;
            if (this.snapMode) newX = Math.round(newX / 10) * 10;
            const newLen = rightX - newX;
            if (newLen >= this.minLength) {
                s.x = newX;
                s.length = newLen;
            }
        } else if (d.handle === 'body') {
            const dx = pos.x - d.startX;
            const dy = pos.y - d.startY;
            s.x = d.startX_pos + dx;
            s.y = d.startY_pos + dy;
        }
    },

    onUp() {
        if (this.dragging) {
            const s = this.segments[this.dragging.segIdx];
            this.reportOperation(`调整了${s.label}段长度`);
        }
        this.dragging = null;
        this.engine.canvas.style.cursor = 'default';
    },

    handleToolbar(action) {
        switch (action) {
            case 'addSegment':
                const last = this.segments[this.segments.length - 1];
                const newY = last ? last.y + this.barGap : this.engine.height / 2;
                const label = String.fromCharCode(65 + this.segments.length); // A, B, C...
                const colors = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];
                this.segments.push({
                    id: label,
                    label,
                    x: this.engine.width / 2 - this.defaultLength / 2,
                    y: newY,
                    length: this.defaultLength,
                    color: colors[this.segments.length % colors.length],
                });
                this.reportOperation(`添加了${label}段`);
                break;
            case 'snapMode':
                this.snapMode = !this.snapMode;
                document.querySelector('[data-action=snapMode]')?.classList.toggle('active', this.snapMode);
                break;
        }
    },

    // ---- 渲染 ----
    render(ctx, w, h) {
        const barH = this.barHeight;
        const radius = barH / 2;

        this.segments.forEach((s, i) => {
            const leftX = s.x;
            const rightX = s.x + s.length;
            const y = s.y;

            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.beginPath();
            ctx.roundRect(leftX + 3, y - barH / 2 + 3, s.length, barH, radius);
            ctx.fill();

            // 线段主体
            const grad = ctx.createLinearGradient(leftX, 0, rightX, 0);
            grad.addColorStop(0, s.color);
            grad.addColorStop(1, this.lighten(s.color, 0.3));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(leftX, y - barH / 2, s.length, barH, radius);
            ctx.fill();

            // 边框
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 端点圆点
            this.engine.drawHandle(ctx, leftX, y, 9, s.color);
            this.engine.drawHandle(ctx, rightX, y, 9, s.color);

            // 标签
            this.engine.drawLabel(ctx, leftX - 20, y, s.label, 14, s.color);

            // 长度标签（上方）
            const lenVal = Math.round(s.length / 10) * 10; // 量化
            this.engine.drawLabel(ctx, (leftX + rightX) / 2, y - barH / 2 - 12, `${lenVal}`, 11, '#64748B');
        });

        // 比例关系显示
        if (this.segments.length === 2) {
            const a = this.segments[0];
            const b = this.segments[1];
            const ratio = (a.length / b.length).toFixed(2);
            const ratioText = ratio === '1.00' ? '甲 = 乙'
                : ratio === Math.round(parseFloat(ratio)) + '.00' ? `甲是乙的 ${Math.round(parseFloat(ratio))} 倍`
                : ratio === (1 / Math.round(1 / parseFloat(ratio))).toFixed(2) ? `乙是甲的 ${Math.round(1 / parseFloat(ratio))} 倍`
                : `甲:乙 = ${Math.round(a.length / 10)}:${Math.round(b.length / 10)}`;

            ctx.fillStyle = '#4F46E5';
            ctx.font = 'bold 14px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ratioText, w / 2, 28);
        }

        // 总长
        if (this.segments.length > 1) {
            const total = this.segments.reduce((sum, s) => sum + s.length, 0);
            ctx.fillStyle = '#64748B';
            ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`总长: ${Math.round(total / 10) * 10}`, w / 2, h - 20);
        }
    },

    lighten(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + 60);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + 60);
        const b = Math.min(255, (num & 0x0000FF) + 60);
        return `rgba(${r},${g},${b},0.4)`;
    },
};

registerModule('segment', {
    init: (engine) => segmentModule.init(engine),
    destroy: () => segmentModule.destroy(),
    getState: () => segmentModule.getState(),
    getHelp: () => segmentModule.getHelp(),
});

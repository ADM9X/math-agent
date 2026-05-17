// ===== 模块一：几何图形探索（2D + 3D） =====
const geometryModule = {
    engine: null,

    // 分类与形状
    category: '2d',      // '2d' | '3d'
    shapeType: 'triangle', // 2d: triangle|quadrilateral|rectangle|parallelogram  3d: cube|cuboid|cylinder|sphere

    // 2D 顶点
    vertices: [],
    draggedIdx: -1,

    // 3D 旋转
    rotationX: -0.4,
    rotationY: 0.6,
    drag3D: false,
    drag3DStart: null,
    drag3DRotX: 0,
    drag3DRotY: 0,

    // 按钮区域（用于点击检测）
    _buttons: [],

    init(engine) {
        this.engine = engine;
        this.initVertices();
        engine.setRender((ctx, w, h) => this.render(ctx, w, h));
        engine.setInteractions({
            onDown: (pos) => this.onDown(pos),
            onMove: (pos) => this.onMove(pos),
            onUp: (pos) => this.onUp(pos),
        });
        engine.canvas.style.cursor = 'default';
    },

    destroy() {
        this.engine.setRender(null);
        this.engine.setInteractions({});
    },

    // 根据形状初始化顶点
    initVertices() {
        const cx = this.engine ? this.engine.width / 2 : 500;
        const cy = this.engine ? this.engine.height * 0.55 : 350;
        const r = this.engine ? Math.min(this.engine.width, this.engine.height) * 0.22 : 180;

        const shapes2D = {
            triangle: [
                { x: cx, y: cy - r },
                { x: cx - r * 0.85, y: cy + r * 0.55 },
                { x: cx + r * 0.85, y: cy + r * 0.55 },
            ],
            quadrilateral: [
                { x: cx - r * 0.8, y: cy - r * 0.5 },
                { x: cx + r * 0.6, y: cy - r * 0.7 },
                { x: cx + r * 0.9, y: cy + r * 0.4 },
                { x: cx - r * 0.7, y: cy + r * 0.6 },
            ],
            rectangle: [
                { x: cx - r * 1.2, y: cy - r * 0.6 },
                { x: cx + r * 1.2, y: cy - r * 0.6 },
                { x: cx + r * 1.2, y: cy + r * 0.6 },
                { x: cx - r * 1.2, y: cy + r * 0.6 },
            ],
            parallelogram: [
                { x: cx - r * 0.5, y: cy - r * 0.6 },
                { x: cx + r * 1.2, y: cy - r * 0.6 },
                { x: cx + r * 0.5, y: cy + r * 0.6 },
                { x: cx - r * 1.2, y: cy + r * 0.6 },
            ],
        };
        this.vertices = (shapes2D[this.shapeType] || shapes2D.triangle).map(v => ({ ...v }));
    },

    getState() {
        if (this.category === '2d') {
            const n = this.vertices.length;
            const angles = [], sides = [];
            for (let i = 0; i < n; i++) {
                const prev = this.vertices[(i - 1 + n) % n], curr = this.vertices[i], next = this.vertices[(i + 1) % n];
                const ang = this.engine.calcAngle(curr.x, curr.y, prev.x, prev.y, next.x, next.y);
                angles.push(Math.round(ang * 180 / Math.PI));
                sides.push(Math.round(this.engine.distance(curr.x, curr.y, next.x, next.y) / 10) / 10);
            }
            return { category: '2d', shape: this.shapeType, vertices: this.vertices.map(v => [Math.round(v.x), Math.round(v.y)]), angles, sides };
        }
        return { category: '3d', shape: this.shapeType, rotationX: Math.round(this.rotationX * 100) / 100, rotationY: Math.round(this.rotationY * 100) / 100 };
    },

    getHelp() {
        return `<p><b>平面图形</b>：拖拽顶点改变形状；<b>立体图形</b>：拖拽旋转观察不同角度</p>
            <p>顶部面板显示当前图形的分类和形状信息</p>`;
    },

    // ---- 交互 ----
    onDown(pos) {
        // 先检测按钮点击
        for (const btn of this._buttons) {
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                btn.action();
                this.reportOperation(btn.label);
                return;
            }
        }

        if (this.category === '2d') {
            for (let i = 0; i < this.vertices.length; i++) {
                if (this.engine.hitTestCircle(pos.x, pos.y, this.vertices[i].x, this.vertices[i].y, 14)) {
                    this.draggedIdx = i;
                    this.engine.canvas.style.cursor = 'grabbing';
                    return;
                }
            }
        } else {
            this.drag3D = true;
            this.drag3DStart = { x: pos.x, y: pos.y };
            this.drag3DRotX = this.rotationX;
            this.drag3DRotY = this.rotationY;
            this.engine.canvas.style.cursor = 'grabbing';
        }
    },

    onMove(pos) {
        if (this.category === '2d' && this.draggedIdx >= 0) {
            this.vertices[this.draggedIdx].x = pos.x;
            this.vertices[this.draggedIdx].y = pos.y;
            if (this.shapeType === 'rectangle') this.enforceRectangle();
            if (this.shapeType === 'parallelogram') this.enforceParallelogram();
            return;
        }
        if (this.drag3D) {
            const dx = pos.x - this.drag3DStart.x;
            const dy = pos.y - this.drag3DStart.y;
            this.rotationY = this.drag3DRotY + dx * 0.01;
            this.rotationX = this.drag3DRotX + dy * 0.01;
            this.rotationX = Math.max(-1.2, Math.min(1.2, this.rotationX));
            return;
        }
        // 悬停光标
        let hovering = false;
        for (const btn of this._buttons) {
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                hovering = true; break;
            }
        }
        if (!hovering && this.category === '2d') {
            for (const v of this.vertices) {
                if (this.engine.hitTestCircle(pos.x, pos.y, v.x, v.y, 14)) { hovering = true; break; }
            }
        }
        this.engine.canvas.style.cursor = hovering ? 'pointer' : (this.drag3D ? 'grabbing' : 'default');
    },

    onUp() {
        if (this.draggedIdx >= 0) { this.reportOperation('拖拽了顶点'); }
        if (this.drag3D) { this.reportOperation('旋转了立体图形'); }
        this.draggedIdx = -1;
        this.drag3D = false;
        this.engine.canvas.style.cursor = 'default';
    },

    // 长方形约束：保持直角
    enforceRectangle() {
        const v = this.vertices;
        if (v.length !== 4) return;
        const cx = (v[0].x + v[2].x) / 2, cy = (v[0].y + v[2].y) / 2;
        v[1].x = cx + (cx - v[0].x); v[1].y = v[0].y;
        v[3].x = v[0].x; v[3].y = cy + (cy - v[0].y);
        v[2].x = v[1].x; v[2].y = v[3].y;
    },

    // 平行四边形约束：对边平行等长
    enforceParallelogram() {
        const v = this.vertices;
        if (v.length !== 4) return;
        const dx = v[1].x - v[0].x, dy = v[1].y - v[0].y;
        v[3].x = v[2].x - dx; v[3].y = v[2].y - dy;
    },

    switchShape(type) {
        this.shapeType = type;
        this.initVertices();
    },

    reportOperation(desc) {
        updateContext(desc, this.getState());
    },

    // ============ 渲染 ============
    render(ctx, w, h) {
        this._buttons = [];

        if (this.category === '2d') {
            this.render2D(ctx, w, h);
        } else {
            this.render3D(ctx, w, h);
        }

        this.drawCategoryTabs(ctx);
        this.drawShapeSelector(ctx, w);
        this.drawInfoPanel(ctx, w);
    },

    // ---- 分类切换按钮 ----
    drawCategoryTabs(ctx) {
        const tabs = [
            { label: '平面图形', value: '2d', x: 12, y: 12, w: 70, h: 28 },
            { label: '立体图形', value: '3d', x: 86, y: 12, w: 70, h: 28 },
        ];
        tabs.forEach(t => {
            const active = this.category === t.value;
            ctx.fillStyle = active ? '#4F46E5' : '#F1F5F9';
            ctx.strokeStyle = active ? '#4F46E5' : '#CBD5E1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(t.x, t.y, t.w, t.h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = active ? 'white' : '#64748B';
            ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2);

            this._buttons.push({ ...t, action: () => { this.category = t.value; this.initVertices(); } });
        });
    },

    // ---- 形状选择按钮（顶部居中） ----
    drawShapeSelector(ctx, w) {
        const shapes2D = ['三角形', '四边形', '长方形', '平行四边形'];
        const shapes3D = ['正方体', '长方体', '圆柱', '圆锥', '球体'];
        const keys2D = ['triangle', 'quadrilateral', 'rectangle', 'parallelogram'];
        const keys3D = ['cube', 'cuboid', 'cylinder', 'cone', 'sphere'];
        const labels = this.category === '2d' ? shapes2D : shapes3D;
        const keys = this.category === '2d' ? keys2D : keys3D;

        const btnW = 72, btnH = 26, gap = 4;
        const totalW = labels.length * btnW + (labels.length - 1) * gap;
        const startX = (w - totalW) / 2;
        const y = 12;

        labels.forEach((label, i) => {
            const x = startX + i * (btnW + gap);
            const active = this.shapeType === keys[i];
            ctx.fillStyle = active ? '#EEF2FF' : '#FFFFFF';
            ctx.strokeStyle = active ? '#818CF8' : '#E2E8F0';
            ctx.lineWidth = active ? 1.5 : 1;
            ctx.beginPath();
            ctx.roundRect(x, y, btnW, btnH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = active ? '#4F46E5' : '#64748B';
            ctx.font = (active ? 'bold ' : '') + '12px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + btnW / 2, y + btnH / 2);

            this._buttons.push({
                x, y, w: btnW, h: btnH,
                label: label,
                action: () => { this.switchShape(keys[i]); },
            });
        });
    },

    // ---- 信息面板 ----
    drawInfoPanel(ctx, w) {
        const v = this.vertices;
        const n = v.length;

        const nameMap = {
            triangle: '三角形', quadrilateral: '四边形', rectangle: '长方形', parallelogram: '平行四边形',
            cube: '正方体', cuboid: '长方体', cylinder: '圆柱', cone: '圆锥', sphere: '球体',
        };
        const shapeName = nameMap[this.shapeType] || this.shapeType;

        let lines = [{ text: shapeName, color: '#4F46E5', bold: true, size: 14 }];

        if (this.category === '3d') {
            lines.push({ text: '拖拽画面可从不同角度观察立体图形', color: '#64748B', bold: false, size: 11 });
        }

        // 测量宽度
        let maxW = 0;
        lines.forEach(l => {
            ctx.font = `${l.bold ? 'bold ' : ''}${l.size}px -apple-system, sans-serif`;
            maxW = Math.max(maxW, ctx.measureText(l.text).width);
        });

        const pw = Math.min(maxW + 36, w - 20);
        const ph = 8 + lines.length * 18 + 6;
        const px = (w - pw) / 2;
        const py = 46;

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 8);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((line, i) => {
            ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px -apple-system, sans-serif`;
            ctx.fillStyle = line.color;
            ctx.fillText(line.text, w / 2, py + 12 + i * 18);
        });
    },

    // ============ 2D 渲染 ============
    render2D(ctx, w, h) {
        const v = this.vertices;
        if (v.length < 3) return;

        // 多边形
        ctx.beginPath();
        ctx.moveTo(v[0].x, v[0].y);
        for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
        ctx.fill();
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 顶点
        v.forEach((p, i) => {
            this.engine.drawHandle(ctx, p.x, p.y, 10, i === this.draggedIdx ? '#EF4444' : '#4F46E5');
        });

        // 角度弧线 + 角度标签
        const n = v.length;
        const pad = 30;
        for (let i = 0; i < n; i++) {
            const prev = v[(i - 1 + n) % n], curr = v[i], next = v[(i + 1) % n];
            const sa = Math.atan2(prev.y - curr.y, prev.x - curr.x);
            const ea = Math.atan2(next.y - curr.y, next.x - curr.x);
            this.engine.drawAngleArc(ctx, curr.x, curr.y, 20, sa, ea, '#F59E0B');

            const deg = Math.round(this.engine.calcAngle(curr.x, curr.y, prev.x, prev.y, next.x, next.y) * 180 / Math.PI);
            const midA = (sa + ea) / 2;
            // 修正：确保弧线方向正确
            let mx = curr.x + 36 * Math.cos(midA);
            let my = curr.y + 36 * Math.sin(midA);
            mx = Math.max(pad, Math.min(w - pad, mx));
            my = Math.max(pad, Math.min(h - pad, my));
            this.engine.drawLabel(ctx, mx, my, deg + '°', 11, '#D97706');
        }

        // 边长标签
        for (let i = 0; i < n; i++) {
            const a = v[i], b = v[(i + 1) % n];
            const d = this.engine.distance(a.x, a.y, b.x, b.y);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const nx = -(b.y - a.y) / d * 18;
            const ny = (b.x - a.x) / d * 18;
            let lx = mx + nx, ly = my + ny;
            lx = Math.max(pad, Math.min(w - pad, lx));
            ly = Math.max(pad, Math.min(h - pad, ly));
            this.engine.drawLabel(ctx, lx, ly, (d / 10).toFixed(1) + 'cm', 11, '#64748B');
        }

        // 内角和（仅三角形）
        if (n === 3) {
            let sum = 0;
            for (let i = 0; i < 3; i++) {
                const prev = v[(i - 1 + 3) % 3], curr = v[i], next = v[(i + 1) % 3];
                sum += this.engine.calcAngle(curr.x, curr.y, prev.x, prev.y, next.x, next.y);
            }
            sum = Math.round(sum * 180 / Math.PI);
            const topY = Math.min(v[0].y, v[1].y, v[2].y);
            this.engine.drawLabel(ctx, w / 2, Math.max(60, topY - 22), `内角和: ${sum}°`, 12, '#4F46E5');
        }
    },

    // ============ 3D 渲染 ============
    render3D(ctx, w, h) {
        const cx = w / 2, cy = h * 0.58;
        const s = Math.min(w, h) * 0.25;

        switch (this.shapeType) {
            case 'cube': this.drawCube(ctx, cx, cy, s); break;
            case 'cuboid': this.drawCuboid(ctx, cx, cy, s); break;
            case 'cylinder': this.drawCylinder(ctx, cx, cy, s); break;
            case 'cone': this.drawCone(ctx, cx, cy, s); break;
            case 'sphere': this.drawSphere(ctx, cx, cy, s); break;
        }
    },

    // 3D → 2D 投影
    project3D(x, y, z) {
        const cosY = Math.cos(this.rotationY), sinY = Math.sin(this.rotationY);
        const cosX = Math.cos(this.rotationX), sinX = Math.sin(this.rotationX);

        // 绕Y轴旋转
        let rx = x * cosY - z * sinY;
        let rz = x * sinY + z * cosY;
        // 绕X轴旋转
        let ry = y * cosX - rz * sinX;
        let rz2 = y * sinX + rz * cosX;

        return { x: rx, y: ry };
    },

    drawEdge(ctx, cx, cy, p1, p2, color, lineWidth) {
        ctx.beginPath();
        ctx.moveTo(cx + p1.x, cy - p1.y);
        ctx.lineTo(cx + p2.x, cy - p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 1.5;
        ctx.stroke();
    },

    // 正方体
    drawCube(ctx, cx, cy, s) {
        const h = s;
        const corners = [
            [-h/2, -h/2, -h/2], [ h/2, -h/2, -h/2], [ h/2, -h/2,  h/2], [-h/2, -h/2,  h/2],
            [-h/2,  h/2, -h/2], [ h/2,  h/2, -h/2], [ h/2,  h/2,  h/2], [-h/2,  h/2,  h/2],
        ];
        const pts = corners.map(c => this.project3D(c[0], c[1], c[2]));

        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        edges.forEach(([a, b]) => this.drawEdge(ctx, cx, cy, pts[a], pts[b], '#4F46E5', 1.8));

        // 顶点
        pts.forEach(p => this.engine.drawHandle(ctx, cx + p.x, cy - p.y, 3, '#4F46E5'));
    },

    // 长方体
    drawCuboid(ctx, cx, cy, s) {
        const hw = s * 0.8, hd = s * 0.4, hh = s * 0.5;
        const corners = [
            [-hw, -hh, -hd], [ hw, -hh, -hd], [ hw, -hh,  hd], [-hw, -hh,  hd],
            [-hw,  hh, -hd], [ hw,  hh, -hd], [ hw,  hh,  hd], [-hw,  hh,  hd],
        ];
        const pts = corners.map(c => this.project3D(c[0], c[1], c[2]));
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        edges.forEach(([a, b]) => this.drawEdge(ctx, cx, cy, pts[a], pts[b], '#059669', 1.8));
        pts.forEach(p => this.engine.drawHandle(ctx, cx + p.x, cy - p.y, 3, '#059669'));
    },

    // 圆柱
    drawCylinder(ctx, cx, cy, s) {
        const r = s * 0.35, h = s * 0.55;
        const segments = 40;

        // 上底面
        const topPts = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const p = this.project3D(Math.cos(a) * r, h, Math.sin(a) * r);
            topPts.push(p);
        }

        // 下底面
        const botPts = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const p = this.project3D(Math.cos(a) * r, -h, Math.sin(a) * r);
            botPts.push(p);
        }

        // 绘制底面
        ctx.beginPath();
        ctx.moveTo(cx + botPts[0].x, cy - botPts[0].y);
        for (let i = 1; i < botPts.length; i++) ctx.lineTo(cx + botPts[i].x, cy - botPts[i].y);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 绘制顶面
        ctx.beginPath();
        ctx.moveTo(cx + topPts[0].x, cy - topPts[0].y);
        for (let i = 1; i < topPts.length; i++) ctx.lineTo(cx + topPts[i].x, cy - topPts[i].y);
        ctx.stroke();

        // 两侧母线
        const leftTop = topPts[Math.floor(segments * 0.25)];
        const leftBot = botPts[Math.floor(segments * 0.25)];
        const rightTop = topPts[Math.floor(segments * 0.75)];
        const rightBot = botPts[Math.floor(segments * 0.75)];
        this.drawEdge(ctx, cx, cy, leftTop, leftBot, '#D97706', 1.5);
        this.drawEdge(ctx, cx, cy, rightTop, rightBot, '#D97706', 1.5);
    },

    // 圆锥
    drawCone(ctx, cx, cy, s) {
        const r = s * 0.4, h = s * 0.55;
        const segments = 48;

        // 底面椭圆
        const basePts = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const p = this.project3D(Math.cos(a) * r, -h, Math.sin(a) * r);
            basePts.push(p);
        }
        ctx.beginPath();
        ctx.moveTo(cx + basePts[0].x, cy - basePts[0].y);
        for (let i = 1; i < basePts.length; i++) {
            ctx.lineTo(cx + basePts[i].x, cy - basePts[i].y);
        }
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 顶点
        const apex = this.project3D(0, h, 0);
        const ax = cx + apex.x, ay = cy - apex.y;

        // 两侧母线
        const leftP = basePts[Math.floor(segments * 0.25)];
        const rightP = basePts[Math.floor(segments * 0.75)];
        this.drawEdge(ctx, cx, cy, apex, leftP, '#DC2626', 1.8);
        this.drawEdge(ctx, cx, cy, apex, rightP, '#DC2626', 1.8);

        // 顶点
        this.engine.drawHandle(ctx, ax, ay, 5, '#DC2626');

        // 底面中心到顶点的虚线（辅助理解高度）
        const baseCenter = this.project3D(0, -h, 0);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + baseCenter.x, cy - baseCenter.y);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    },

    // 球体（优化版：更清晰的经纬线，带外轮廓）
    drawSphere(ctx, cx, cy, s) {
        const r = s * 0.42;
        const segments = 48;
        const lonCount = 8;
        const latCount = 7;

        // 纬线（水平圈）—— 先画，作为底层
        for (let li = 1; li < latCount; li++) {
            const angle = -Math.PI / 2 + (li / latCount) * Math.PI;
            const cr = Math.cos(angle) * r;
            const cyLocal = Math.sin(angle) * r;
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const a = (i / segments) * Math.PI * 2;
                const p = this.project3D(Math.cos(a) * cr, cyLocal, Math.sin(a) * cr);
                if (i === 0) ctx.moveTo(cx + p.x, cy - p.y);
                else ctx.lineTo(cx + p.x, cy - p.y);
            }
            ctx.strokeStyle = '#8B5CF6';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // 经线（垂直圈）
        for (let li = 0; li < lonCount; li++) {
            const angle = (li / lonCount) * Math.PI;
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const lat = -Math.PI / 2 + (i / segments) * Math.PI;
                const x = Math.cos(lat) * Math.sin(angle) * r;
                const y = Math.sin(lat) * r;
                const z = Math.cos(lat) * Math.cos(angle) * r;
                const p = this.project3D(x, y, z);
                if (i === 0) ctx.moveTo(cx + p.x, cy - p.y);
                else ctx.lineTo(cx + p.x, cy - p.y);
            }
            ctx.strokeStyle = '#8B5CF6';
            ctx.lineWidth = (angle === 0 || Math.abs(angle - Math.PI / 2) < 0.01) ? 1.5 : 0.8;
            ctx.stroke();
        }

        // 外轮廓椭圆（增强立体感）
        const outlinePts = [];
        const outlineN = 72;
        for (let i = 0; i <= outlineN; i++) {
            const a = (i / outlineN) * Math.PI * 2;
            const p = this.project3D(Math.cos(a) * r, 0, Math.sin(a) * r);
            outlinePts.push(p);
        }
        ctx.beginPath();
        ctx.moveTo(cx + outlinePts[0].x, cy - outlinePts[0].y);
        for (let i = 1; i < outlinePts.length; i++) {
            ctx.lineTo(cx + outlinePts[i].x, cy - outlinePts[i].y);
        }
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth = 1.8;
        ctx.stroke();
    },
};

registerModule('geometry', {
    init: (engine) => geometryModule.init(engine),
    destroy: () => geometryModule.destroy(),
    getState: () => geometryModule.getState(),
    getHelp: () => geometryModule.getHelp(),
});

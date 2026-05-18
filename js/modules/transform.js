// ===== 模块三：平移与旋转（2D + 3D） =====
const transformModule = {
    engine: null,

    // 分类与形状
    category: '2d',      // '2d' | '3d'
    shapeType: 'triangle', // 2d: triangle|quadrilateral|rectangle|parallelogram  3d: cube|cuboid|cylinder|cone|sphere

    // 模式
    mode: 'translate',  // 'translate' | 'rotate' | 'reflect'
    showGrid: true,

    // 图形数据
    shape: null,        // 2D 局部顶点坐标
    position: { x: 0, y: 0 },
    rotation: 0,
    originalPos: { x: 0, y: 0 },
    originalRot: 0,

    // 3D 视角旋转
    rotationX: -0.4,
    rotationY: 0.6,
    drag3D: false,
    drag3DStart: null,
    drag3DRotX: 0,
    drag3DRotY: 0,

    // 拖拽状态
    dragging: false,
    dragType: null,     // 'translate' | 'rotate' | 'rotateShape'
    dragStart: { x: 0, y: 0 },
    dragStartPos: { x: 0, y: 0 },
    dragStartRot: 0,

    // UI
    _buttons: [],

    // 对称轴
    reflectAxis: null,

    init(engine) {
        this.engine = engine;
        this._toolbarHandler = (e) => this.handleToolbar(e.detail.action);

        this.position = { x: engine.width / 2, y: engine.height / 2 };
        this.originalPos = { ...this.position };
        this.rotation = 0;
        this.originalRot = 0;
        this.reflectAxis = {
            x1: engine.width / 2, y1: 0,
            x2: engine.width / 2, y2: engine.height,
        };
        this.initShape();

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

    // 初始化形状顶点
    initShape() {
        const cx = 0, cy = 0;
        const r = Math.min(this.engine.width, this.engine.height) * 0.2;

        const shapes2D = {
            triangle: [
                { x: 0, y: -r },
                { x: -r * 0.75, y: r * 0.55 },
                { x: r * 0.75, y: r * 0.55 },
            ],
            quadrilateral: [
                { x: -r * 0.8, y: -r * 0.5 },
                { x: r * 0.6, y: -r * 0.7 },
                { x: r * 0.9, y: r * 0.4 },
                { x: -r * 0.7, y: r * 0.6 },
            ],
            rectangle: [
                { x: -r * 1.2, y: -r * 0.6 },
                { x: r * 1.2, y: -r * 0.6 },
                { x: r * 1.2, y: r * 0.6 },
                { x: -r * 1.2, y: r * 0.6 },
            ],
            parallelogram: [
                { x: -r * 0.5, y: -r * 0.6 },
                { x: r * 1.2, y: -r * 0.6 },
                { x: r * 0.5, y: r * 0.6 },
                { x: -r * 1.2, y: r * 0.6 },
            ],
        };

        if (this.category === '2d') {
            this.shape = (shapes2D[this.shapeType] || shapes2D.triangle).map(v => ({ ...v }));
        } else {
            this.shape = null;
        }

        this.position = { x: this.engine.width / 2, y: this.engine.height / 2 };
        this.originalPos = { ...this.position };
        this.rotation = 0;
        this.originalRot = 0;
        this.rotationX = -0.4;
        this.rotationY = 0.6;
    },

    // 获取世界坐标顶点（仅 2D）
    getWorldVertices() {
        if (this.category === '3d' || !this.shape) return [];
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        return this.shape.map(p => ({
            x: this.position.x + p.x * cos - p.y * sin,
            y: this.position.y + p.x * sin + p.y * cos,
        }));
    },

    // 3D 包围圆半径（用于点击检测）
    getBoundingRadius() {
        const s = Math.min(this.engine.width, this.engine.height) * 0.2;
        if (this.category === '2d' && this.shape) {
            let maxR = 0;
            for (const p of this.shape) {
                maxR = Math.max(maxR, Math.sqrt(p.x * p.x + p.y * p.y));
            }
            return maxR;
        }
        return s * 0.7;
    },

    getState() {
        const dx = this.position.x - this.originalPos.x;
        const dy = this.position.y - this.originalPos.y;
        const nameMap = {
            triangle: '三角形', quadrilateral: '四边形', rectangle: '长方形', parallelogram: '平行四边形',
            cube: '正方体', cuboid: '长方体', cylinder: '圆柱', cone: '圆锥', sphere: '球体',
        };
        return {
            category: this.category,
            shape: nameMap[this.shapeType] || this.shapeType,
            mode: this.mode,
            position: { x: Math.round(this.position.x), y: Math.round(this.position.y) },
            originalPosition: { x: Math.round(this.originalPos.x), y: Math.round(this.originalPos.y) },
            translation: { dx: Math.round(dx), dy: Math.round(dy) },
            rotationAngle: Math.round(this.rotation * 180 / Math.PI),
            showGrid: this.showGrid,
            operation: this._lastOp || null,
        };
    },

    _lastOp: null,

    reportOperation(desc) {
        this._lastOp = desc;
        updateContext(desc, this.getState());
    },

    getHelp() {
        return `<p><b>平面图形</b>：选择三角形/四边形/长方形/平行四边形，拖拽进行平移、旋转或对称操作</p>
            <p><b>立体图形</b>：选择正方体/长方体/圆柱/圆锥/球体，拖拽图形操作，拖拽空白处旋转视角</p>
            <p><b>平移模式</b>：拖拽图形整体移动，观察形状和大小是否变化</p>
            <p><b>旋转模式</b>：拖拽图形边角的旋转手柄来旋转图形</p>
            <p><b>对称模式</b>：图形沿垂直轴镜像显示</p>
            <p><b>网格开关</b>：底部工具栏可显示/隐藏网格辅助线</p>`;
    },

    // ============ 3D 投影 ============
    project3D(x, y, z) {
        const cosY = Math.cos(this.rotationY), sinY = Math.sin(this.rotationY);
        const cosX = Math.cos(this.rotationX), sinX = Math.sin(this.rotationX);
        let rx = x * cosY - z * sinY;
        let rz = x * sinY + z * cosY;
        let ry = y * cosX - rz * sinX;
        // 应用 2D 屏幕旋转（旋转手柄控制）
        const cosR = Math.cos(this.rotation), sinR = Math.sin(this.rotation);
        return { x: rx * cosR - ry * sinR, y: rx * sinR + ry * cosR };
    },

    drawEdge(ctx, cx, cy, p1, p2, color, lineWidth) {
        ctx.beginPath();
        ctx.moveTo(cx + p1.x, cy - p1.y);
        ctx.lineTo(cx + p2.x, cy - p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 1.5;
        ctx.stroke();
    },

    // ============ 3D 形状绘制 ============
    drawCube(ctx, cx, cy, s, color, alpha) {
        const h = s;
        const corners = [
            [-h/2,-h/2,-h/2],[ h/2,-h/2,-h/2],[ h/2,-h/2, h/2],[-h/2,-h/2, h/2],
            [-h/2, h/2,-h/2],[ h/2, h/2,-h/2],[ h/2, h/2, h/2],[-h/2, h/2, h/2],
        ];
        const pts = corners.map(c => this.project3D(c[0], c[1], c[2]));
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        edges.forEach(([a, b]) => this.drawEdge(ctx, cx, cy, pts[a], pts[b], color, 1.8));
        if (alpha < 1) return;
        pts.forEach(p => this.engine.drawHandle(ctx, cx + p.x, cy - p.y, 3, color));
    },

    drawCuboid(ctx, cx, cy, s, color, alpha) {
        const hw = s * 0.8, hd = s * 0.4, hh = s * 0.5;
        const corners = [
            [-hw,-hh,-hd],[ hw,-hh,-hd],[ hw,-hh, hd],[-hw,-hh, hd],
            [-hw, hh,-hd],[ hw, hh,-hd],[ hw, hh, hd],[-hw, hh, hd],
        ];
        const pts = corners.map(c => this.project3D(c[0], c[1], c[2]));
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        edges.forEach(([a, b]) => this.drawEdge(ctx, cx, cy, pts[a], pts[b], color, 1.8));
        if (alpha < 1) return;
        pts.forEach(p => this.engine.drawHandle(ctx, cx + p.x, cy - p.y, 3, color));
    },

    drawCylinder(ctx, cx, cy, s, color, alpha) {
        const r = s * 0.35, h = s * 0.55;
        const segments = 40;
        const topPts = [], botPts = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            topPts.push(this.project3D(Math.cos(a) * r, h, Math.sin(a) * r));
            botPts.push(this.project3D(Math.cos(a) * r, -h, Math.sin(a) * r));
        }
        ctx.beginPath();
        ctx.moveTo(cx + botPts[0].x, cy - botPts[0].y);
        for (let i = 1; i < botPts.length; i++) ctx.lineTo(cx + botPts[i].x, cy - botPts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + topPts[0].x, cy - topPts[0].y);
        for (let i = 1; i < topPts.length; i++) ctx.lineTo(cx + topPts[i].x, cy - topPts[i].y);
        ctx.stroke();
        const li = Math.floor(segments * 0.25), ri = Math.floor(segments * 0.75);
        this.drawEdge(ctx, cx, cy, topPts[li], botPts[li], color, 1.5);
        this.drawEdge(ctx, cx, cy, topPts[ri], botPts[ri], color, 1.5);
    },

    drawCone(ctx, cx, cy, s, color, alpha) {
        const r = s * 0.4, h = s * 0.55;
        const segments = 48;
        const basePts = [];
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            basePts.push(this.project3D(Math.cos(a) * r, -h, Math.sin(a) * r));
        }
        ctx.beginPath();
        ctx.moveTo(cx + basePts[0].x, cy - basePts[0].y);
        for (let i = 1; i < basePts.length; i++) ctx.lineTo(cx + basePts[i].x, cy - basePts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        const apex = this.project3D(0, h, 0);
        const lp = basePts[Math.floor(segments * 0.25)];
        const rp = basePts[Math.floor(segments * 0.75)];
        this.drawEdge(ctx, cx, cy, apex, lp, color, 1.8);
        this.drawEdge(ctx, cx, cy, apex, rp, color, 1.8);
        if (alpha < 1) return;
        this.engine.drawHandle(ctx, cx + apex.x, cy - apex.y, 5, color);
        const bc = this.project3D(0, -h, 0);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + bc.x, cy - bc.y);
        ctx.lineTo(cx + apex.x, cy - apex.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
    },

    drawSphere(ctx, cx, cy, s, color, alpha) {
        const r = s * 0.42;
        const segments = 48, lonCount = 8, latCount = 7;
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
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
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
            ctx.strokeStyle = color;
            ctx.lineWidth = (angle === 0 || Math.abs(angle - Math.PI / 2) < 0.01) ? 1.5 : 0.8;
            ctx.stroke();
        }
        const outlinePts = [];
        for (let i = 0; i <= 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            outlinePts.push(this.project3D(Math.cos(a) * r, 0, Math.sin(a) * r));
        }
        ctx.beginPath();
        ctx.moveTo(cx + outlinePts[0].x, cy - outlinePts[0].y);
        for (let i = 1; i < outlinePts.length; i++) ctx.lineTo(cx + outlinePts[i].x, cy - outlinePts[i].y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
    },

    draw3DShape(ctx, cx, cy, s, color, alpha) {
        const methods = {
            cube: 'drawCube', cuboid: 'drawCuboid', cylinder: 'drawCylinder',
            cone: 'drawCone', sphere: 'drawSphere',
        };
        const method = methods[this.shapeType];
        if (method && this[method]) {
            this[method](ctx, cx, cy, s, color, alpha != null ? alpha : 1);
        }
    },

    // ============ 交互 ============
    onDown(pos) {
        // 检测按钮
        for (const btn of this._buttons) {
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                btn.action();
                this.reportOperation(btn.label);
                return;
            }
        }

        // 3D 背景拖拽 → 旋转视角
        if (this.category === '3d' && !this.hitTest3D(pos)) {
            this.drag3D = true;
            this.drag3DStart = { x: pos.x, y: pos.y };
            this.drag3DRotX = this.rotationX;
            this.drag3DRotY = this.rotationY;
            this.engine.canvas.style.cursor = 'grabbing';
            return;
        }

        const hitShape = this.category === '2d' ? this.hitTestShape(pos, this.getWorldVertices()) : this.hitTest3D(pos);

        if (this.mode === 'rotate') {
            const handleR = 28;
            const handleAngle = this.rotation + Math.PI / 4;
            const hx = this.position.x + handleR * Math.cos(handleAngle);
            const hy = this.position.y + handleR * Math.sin(handleAngle);
            if (this.engine.hitTestCircle(pos.x, pos.y, hx, hy, 12)) {
                this.dragging = true;
                this.dragType = 'rotate';
                this.dragStart = { x: pos.x, y: pos.y };
                this.dragStartRot = this.rotation;
                this.engine.canvas.style.cursor = 'grabbing';
                return;
            }
        }

        if (hitShape) {
            this.dragging = true;
            this.dragType = this.mode === 'rotate' ? 'rotateShape' : 'translate';
            this.dragStart = { x: pos.x, y: pos.y };
            this.dragStartPos = { ...this.position };
            this.dragStartRot = this.rotation;
            this.engine.canvas.style.cursor = 'grabbing';
        }
    },

    onMove(pos) {
        if (!this.dragging && !this.drag3D) {
            let hovering = false;
            for (const btn of this._buttons) {
                if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                    hovering = true; break;
                }
            }
            if (!hovering) {
                if (this.category === '2d') {
                    hovering = this.hitTestShape(pos, this.getWorldVertices());
                } else {
                    hovering = this.hitTest3D(pos);
                }
            }
            if (!hovering && this.mode === 'rotate') {
                hovering = this.hitRotateHandle(pos);
            }
            this.engine.canvas.style.cursor = hovering ? 'grab' : (this.drag3D ? 'grabbing' : 'default');
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

        if (this.dragType === 'translate') {
            this.position.x = this.dragStartPos.x + (pos.x - this.dragStart.x);
            this.position.y = this.dragStartPos.y + (pos.y - this.dragStart.y);
        } else if (this.dragType === 'rotate' || this.dragType === 'rotateShape') {
            const cx = this.position.x, cy = this.position.y;
            const startAngle = Math.atan2(this.dragStart.y - cy, this.dragStart.x - cx);
            const curAngle = Math.atan2(pos.y - cy, pos.x - cx);
            this.rotation = this.dragStartRot + (curAngle - startAngle);
        }
    },

    onUp(pos) {
        if (this.dragging) {
            const modeLabel = this.mode === 'translate' ? '平移' : '旋转';
            this.reportOperation(`进行了${modeLabel}操作`);
        }
        if (this.drag3D) {
            this.reportOperation('旋转了立体视角');
        }
        if (this.dragging || this.drag3D) {
            this.dragging = false;
            this.dragType = null;
            this.drag3D = false;
            this.engine.canvas.style.cursor = 'default';
        }
    },

    hitTestShape(pos, vertices) {
        const n = vertices.length;
        let signedArea = 0;
        for (let i = 0; i < n; i++) {
            const a = vertices[i], b = vertices[(i + 1) % n];
            signedArea += a.x * b.y - b.x * a.y;
        }
        const clockwise = signedArea > 0;
        for (let i = 0; i < n; i++) {
            const a = vertices[i];
            const b = vertices[(i + 1) % n];
            const cross = (b.x - a.x) * (pos.y - a.y) - (b.y - a.y) * (pos.x - a.x);
            if (clockwise ? cross < 0 : cross > 0) return false;
        }
        return true;
    },

    hitTest3D(pos) {
        const r = this.getBoundingRadius();
        return this.engine.hitTestCircle(pos.x, pos.y, this.position.x, this.position.y, r);
    },

    hitRotateHandle(pos) {
        const handleR = 28;
        const handleAngle = this.rotation + Math.PI / 4;
        const hx = this.position.x + handleR * Math.cos(handleAngle);
        const hy = this.position.y + handleR * Math.sin(handleAngle);
        return this.engine.hitTestCircle(pos.x, pos.y, hx, hy, 12);
    },

    // ============ 工具栏 ============
    handleToolbar(action) {
        document.querySelectorAll('.tool-btn[data-action^=mode]').forEach(b => b.classList.remove('active'));

        switch (action) {
            case 'modeTranslate':
                this.mode = 'translate';
                document.querySelector('[data-action=modeTranslate]')?.classList.add('active');
                break;
            case 'modeRotate':
                this.mode = 'rotate';
                document.querySelector('[data-action=modeRotate]')?.classList.add('active');
                break;
            case 'modeReflect':
                this.mode = 'reflect';
                document.querySelector('[data-action=modeReflect]')?.classList.add('active');
                break;
            case 'showGrid':
                this.showGrid = !this.showGrid;
                document.querySelector('[data-action=showGrid]')?.classList.toggle('active', this.showGrid);
                break;
        }
    },

    // ============ 渲染入口 ============
    render(ctx, w, h) {
        this._buttons = [];

        if (this.showGrid) this.drawGrid(ctx, w, h);

        if (this.category === '2d') {
            this.render2D(ctx, w, h);
        } else {
            this.render3D(ctx, w, h);
        }

        this.drawCategoryTabs(ctx);
        this.drawShapeSelector(ctx, w);
        this.drawModeLabel(ctx, w);
    },

    // ============ 2D 渲染 ============
    render2D(ctx, w, h) {
        const v = this.getWorldVertices();
        if (v.length < 3) return;

        // 对称模式
        if (this.mode === 'reflect') {
            this.drawReflectAxis(ctx, w, h);
            const mirrored = v.map(p => ({ x: 2 * (w / 2) - p.x, y: p.y }));
            this.drawShape(ctx, mirrored, 'rgba(79, 70, 229, 0.12)', '#94A3B8', true);
        }

        // 原始位置虚线
        if (this.mode !== 'reflect') {
            const origVerts = this.shape.map(p => ({
                x: this.originalPos.x + p.x,
                y: this.originalPos.y + p.y,
            }));
            this.drawShape(ctx, origVerts, 'transparent', '#94A3B8', true);
        }

        // 当前图形
        this.drawShape(ctx, v, 'rgba(79, 70, 229, 0.15)', '#4F46E5', false);

        // 形心
        this.engine.drawHandle(ctx, this.position.x, this.position.y, 6, '#EF4444');

        // 旋转手柄
        if (this.mode === 'rotate') {
            const handleR = 28;
            const handleAngle = this.rotation + Math.PI / 4;
            const hx = this.position.x + handleR * Math.cos(handleAngle);
            const hy = this.position.y + handleR * Math.sin(handleAngle);
            this.engine.drawDashedLine(ctx, this.position.x, this.position.y, hx, hy, '#F59E0B');
            this.engine.drawHandle(ctx, hx, hy, 10, '#F59E0B');
        }

        // 平移位移箭头和标签
        this.drawTranslationInfo(ctx, w);
    },

    // ============ 3D 渲染 ============
    render3D(ctx, w, h) {
        const cx = this.position.x;
        const cy = this.position.y;
        const s = Math.min(w, h) * 0.2;

        const shapeColor = this.mode === 'reflect' ? '#4F46E5' : '#4F46E5';
        const shapeColors = {
            cube: '#4F46E5', cuboid: '#059669', cylinder: '#D97706',
            cone: '#DC2626', sphere: '#8B5CF6',
        };
        const color = shapeColors[this.shapeType] || '#4F46E5';

        // 对称模式
        if (this.mode === 'reflect') {
            this.drawReflectAxis(ctx, w, h);
            const refCx = 2 * (w / 2) - cx;
            ctx.globalAlpha = 0.35;
            this.draw3DShape(ctx, refCx, cy, s, '#94A3B8', 0.5);
            ctx.globalAlpha = 1;
        }

        // 原始位置虚线（3D 用半透明表示）
        if (this.mode !== 'reflect') {
            const dx = this.position.x - this.originalPos.x;
            const dy = this.position.y - this.originalPos.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3 || this.rotation !== this.originalRot) {
                ctx.globalAlpha = 0.25;
                this.draw3DShape(ctx, this.originalPos.x, this.originalPos.y, s, '#94A3B8', 0.4);
                ctx.globalAlpha = 1;
            }
        }

        // 当前 3D 图形
        this.draw3DShape(ctx, cx, cy, s, color, 1);

        // 形心
        this.engine.drawHandle(ctx, cx, cy, 6, '#EF4444');

        // 旋转手柄（旋转模式）
        if (this.mode === 'rotate') {
            const handleR = 32;
            const handleAngle = this.rotation + Math.PI / 4;
            const hx = cx + handleR * Math.cos(handleAngle);
            const hy = cy + handleR * Math.sin(handleAngle);
            this.engine.drawDashedLine(ctx, cx, cy, hx, hy, '#F59E0B');
            this.engine.drawHandle(ctx, hx, hy, 10, '#F59E0B');
        }

        // 平移信息
        this.drawTranslationInfo(ctx, w);
    },

    drawTranslationInfo(ctx, w) {
        if (this.mode !== 'translate') return;
        const dx = this.position.x - this.originalPos.x;
        const dy = this.position.y - this.originalPos.y;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;

        this.engine.drawArrow(ctx, this.originalPos.x, this.originalPos.y,
            this.position.x, this.position.y, '#EF4444');
        const mx = (this.originalPos.x + this.position.x) / 2;
        const my = (this.originalPos.y + this.position.y) / 2;
        const gs = this.getGridSize();
        const gridDx = Math.round(dx / gs) || 0;
        const gridDy = Math.round(-dy / gs) || 0;
        const labelX = Math.min(w - 40, Math.max(10, mx + 20));
        const labelY = Math.max(10, my - 10);
        this.engine.drawLabel(ctx, labelX, labelY, `(→${gridDx}, ↑${gridDy})`, 12, '#EF4444');
    },

    // ============ 分类切换按钮 ============
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
            this._buttons.push({
                ...t,
                label: t.label,
                action: () => { this.category = t.value; this.initShape(); },
            });
        });
    },

    // ============ 形状选择器 ============
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
                label,
                action: () => { this.shapeType = keys[i]; this.initShape(); },
            });
        });
    },

    // ============ 模式标签 ============
    drawModeLabel(ctx, w) {
        // 3D 提示
        if (this.category === '3d') {
            ctx.fillStyle = '#94A3B8';
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('拖拽空白处旋转视角', w / 2, 56);
        }
    },

    // ============ 辅助绘制 ============
    drawShape(ctx, vertices, fill, stroke, dashed) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
        ctx.closePath();

        if (dashed) ctx.setLineDash([6, 4]);

        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        ctx.strokeStyle = stroke;
        ctx.lineWidth = dashed ? 1.5 : 2.5;
        ctx.stroke();

        if (dashed) ctx.setLineDash([]);

        const color = dashed ? '#94A3B8' : '#4F46E5';
        vertices.forEach(p => this.engine.drawHandle(ctx, p.x, p.y, 7, color));
    },

    drawGrid(ctx, w, h) {
        const gs = this.getGridSize();
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 1;
        for (let x = gs; x < w; x += gs) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = gs; y < h; y += gs) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    },

    drawReflectAxis(ctx, w, h) {
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        this.engine.drawLabel(ctx, w / 2, 20, '对称轴', 12, '#EF4444');
    },

    getGridSize() {
        return Math.min(this.engine.width, this.engine.height) / 20;
    },
};

registerModule('transform', {
    init: (engine) => transformModule.init(engine),
    destroy: () => transformModule.destroy(),
    getState: () => transformModule.getState(),
    getHelp: () => transformModule.getHelp(),
});

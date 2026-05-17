// ===== 工具栏 UI =====

// 各模块专用工具栏配置
const moduleToolbars = {
    geometry: [],
    fraction: [
        { id: 'shapeCircle', label: '圆形', title: '切换为圆形', active: true },
        { id: 'shapeRect', label: '长方形', title: '切换为长方形' },
        { id: 'dualMode', label: '双图比较', title: '开启左右对比模式' },
    ],
    transform: [
        { id: 'modeTranslate', label: '平移', title: '平移模式', active: true },
        { id: 'modeRotate', label: '旋转', title: '旋转模式' },
        { id: 'modeReflect', label: '对称', title: '轴对称模式' },
        { id: 'showGrid', label: '网格', title: '显示/隐藏网格' },
    ],
    segment: [
        { id: 'addSegment', label: '+ 线段', title: '添加一条线段' },
        { id: 'snapMode', label: '对齐', title: '开启/关闭长度对齐' },
    ],
};

function updateModuleToolbar(moduleName) {
    const container = document.getElementById('moduleToolbar');
    const btnDefs = moduleToolbars[moduleName] || [];

    container.innerHTML = '';
    btnDefs.forEach(def => {
        const btn = document.createElement('button');
        btn.className = 'tool-btn' + (def.active ? ' active' : '');
        btn.textContent = def.label;
        btn.title = def.title;
        btn.dataset.action = def.id;
        btn.addEventListener('click', () => {
            // 通过自定义事件传递给当前模块
            const event = new CustomEvent('toolbarAction', { detail: { action: def.id } });
            document.dispatchEvent(event);
        });
        container.appendChild(btn);
    });
}

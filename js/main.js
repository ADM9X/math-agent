// ===== 全局状态管理 =====
const AppState = {
    currentModule: null,
    modules: {},

    // 当前模块操作上下文（传给LLM）
    context: {
        module: null,
        operation: null,
        state: {},
        timestamp: 0,
    },

    // 操作空闲计时器
    idleTimer: null,
    autoTriggerEnabled: true,
};

// ===== 模块注册表 =====
const ModuleRegistry = {
    geometry: {
        name: '几何图形',
        initFn: null,
        destroyFn: null,
        getStateFn: null,
        getHelpFn: null,
    },
    fraction: {
        name: '分数认识',
        initFn: null,
        destroyFn: null,
        getStateFn: null,
        getHelpFn: null,
    },
    transform: {
        name: '平移旋转',
        initFn: null,
        destroyFn: null,
        getStateFn: null,
        getHelpFn: null,
    },
    segment: {
        name: '线段图',
        initFn: null,
        destroyFn: null,
        getStateFn: null,
        getHelpFn: null,
    },
};

// ===== 模块注册函数 =====
function registerModule(name, { init, destroy, getState, getHelp }) {
    if (ModuleRegistry[name]) {
        ModuleRegistry[name].initFn = init;
        ModuleRegistry[name].destroyFn = destroy;
        ModuleRegistry[name].getStateFn = getState;
        ModuleRegistry[name].getHelpFn = getHelp;
    }
}

// ===== 模块切换 =====
function switchModule(moduleName) {
    if (AppState.currentModule) {
        const old = ModuleRegistry[AppState.currentModule];
        if (old && old.destroyFn) old.destroyFn();
    }

    AppState.currentModule = moduleName;
    AppState.context.module = moduleName;
    AppState.context.state = {};
    AppState.context.operation = null;

    const meta = ModuleRegistry[moduleName];
    if (meta && meta.initFn) {
        meta.initFn(canvasEngine);
        canvasPlaceholder.classList.add('hidden');
    }

    // 更新工具栏
    updateModuleToolbar(moduleName);
    // 更新帮助内容
    if (meta && meta.getHelpFn) {
        document.getElementById('helpContent').innerHTML = meta.getHelpFn();
    }

    // 发送模块切换消息
    addSystemMessage(`已切换到【${meta.name}】模块，开始探索吧！`);
}

// ===== 操作上下文更新（供各模块调用） =====
function updateContext(operation, state) {
    AppState.context.operation = operation;
    AppState.context.state = state;
    AppState.context.timestamp = Date.now();

    // 重置空闲计时器
    resetIdleTimer();
}

// ===== 空闲检测（自动触发LLM） =====
function resetIdleTimer() {
    if (AppState.idleTimer) clearTimeout(AppState.idleTimer);
    if (!AppState.autoTriggerEnabled || !CONFIG.apiKey) return;

    AppState.idleTimer = setTimeout(() => {
        const ctx = AppState.context;
        if (ctx.operation) {
            llmClient.autoTrigger(ctx.module, ctx.operation, ctx.state);
        }
    }, CONFIG.idleThreshold);
}

// ===== 初始化 =====
function init() {
    canvasEngine.init('mainCanvas');
    llmClient.init();
    chatUI.init();
    initModuleTabs();

    // 默认启动几何图形模块
    switchModule('geometry');
}

// ===== 模块标签切换 =====
function initModuleTabs() {
    document.querySelectorAll('.module-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.module-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchModule(tab.dataset.module);
        });
    });
}

// ===== 底部工具栏按钮 =====
document.getElementById('resetBtn').addEventListener('click', () => {
    switchModule(AppState.currentModule);
});

document.getElementById('helpBtn').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('show');
});

document.getElementById('closeHelp').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('show');
});

document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('show');
    }
});

// 启动
document.addEventListener('DOMContentLoaded', init);

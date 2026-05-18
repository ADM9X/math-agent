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

// ===== LLM 配置弹窗 =====
function initLlmConfig() {
    const modal = document.getElementById('llmConfigModal');
    const openBtn = document.getElementById('openLlmConfig');
    const saveBtn = document.getElementById('llmConfigSave');
    const cancelBtn = document.getElementById('llmConfigCancel');
    const inputs = {
        apiEndpoint: document.getElementById('cfgEndpoint'),
        apiKey: document.getElementById('cfgApiKey'),
        model: document.getElementById('cfgModel'),
    };

    if (!modal || !openBtn) {
        console.error('LLM config elements not found:', { modal, openBtn });
        return;
    }

    // 打开弹窗
    openBtn.addEventListener('click', () => {
        const current = getCurrentLLMConfig();
        inputs.apiEndpoint.value = current.apiEndpoint;
        inputs.apiKey.value = current.apiKey;
        inputs.model.value = current.model;
        modal.classList.add('show');
    });

    // 关闭弹窗
    const closeModal = () => modal.classList.remove('show');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // 保存配置
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const config = {
                apiEndpoint: inputs.apiEndpoint.value.trim() || 'https://api.deepseek.com/v1/chat/completions',
                apiKey: inputs.apiKey.value.trim(),
                model: inputs.model.value.trim() || 'deepseek-v4-flash',
            };
            saveLLMConfig(config);
            llmClient.init();
            closeModal();
            addSystemMessage('LLM 配置已更新');
        });
    }
}

// ===== 初始化 =====
function init() {
    canvasEngine.init('mainCanvas');
    llmClient.init();
    chatUI.init();
    initModuleTabs();
    initLlmConfig();

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

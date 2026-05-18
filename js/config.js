// ===== 运行时配置（支持 localStorage 动态修改）=====
function getRuntimeConfig() {
    try {
        const stored = localStorage.getItem('llm_config');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                apiKey: parsed.apiKey || 'YOUR_API_KEY_HERE',
                apiEndpoint: parsed.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions',
                model: parsed.model || 'deepseek-v4-flash',
            };
        }
    } catch (e) { /* ignore */ }
    return null;
}

const RUNTIME_CONFIG = getRuntimeConfig();

// DeepSeek API 配置（OpenAI 兼容接口）
const CONFIG = {
    // DeepSeek API Key（优先读取 localStorage）
    apiKey: RUNTIME_CONFIG ? RUNTIME_CONFIG.apiKey : 'YOUR_API_KEY_HERE',

    // DeepSeek API 端点（OpenAI 兼容路径）
    apiEndpoint: RUNTIME_CONFIG ? RUNTIME_CONFIG.apiEndpoint : 'https://api.deepseek.com/v1/chat/completions',

    // 模型名称
    model: RUNTIME_CONFIG ? RUNTIME_CONFIG.model : 'deepseek-v4-flash',

    // 最大对话轮数
    maxHistoryTurns: 10,

    // LLM 主动触发冷却时间（ms）
    autoTriggerCooldown: 10000,

    // 操作后空闲检测时间（ms）——超过此时间无新操作则触发LLM
    idleThreshold: 8000,
};

// 保存配置到 localStorage
function saveLLMConfig(config) {
    localStorage.setItem('llm_config', JSON.stringify(config));
    Object.assign(CONFIG, config);
}

// 获取当前配置（用于 UI 显示）
function getCurrentLLMConfig() {
    return {
        apiKey: CONFIG.apiKey === 'YOUR_API_KEY_HERE' ? '' : CONFIG.apiKey,
        apiEndpoint: CONFIG.apiEndpoint,
        model: CONFIG.model,
    };
}

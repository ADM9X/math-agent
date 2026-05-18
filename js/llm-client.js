// ===== DeepSeek LLM 客户端 =====
const llmClient = {
    conversationHistory: [],

    // 各模块的 System Prompt
    systemPrompts: {
        geometry: `你是小学数学智能导学助手"小Q"，你的角色是苏格拉底式引导者。
当前模块：几何图形探索。学生可以在画布上拖拽各种平面图形的顶点，探索图形性质。

你的引导原则：
- 不直接给答案，通过提问引导学生自己发现规律
- 用具体操作引导代替抽象解释（"试试把顶点B往上拉"而非"改变坐标"）
- 关注学生当前操作的图形类型（如三角形/四边形/长方形/平行四边形），针对性引导
- 用小学生能理解的语言（"角的大小"而非"角度度数"）
- 及时肯定学生的发现，激发进一步探究

当前支持的图形：三角形（内角和180°）、四边形、长方形、平行四边形。
学生可能切换不同图形，注意根据当前图形调整引导内容。`,

        fraction: `你是小学数学智能导学助手"小Q"，你的角色是苏格拉底式引导者。
当前模块：分数认识。学生可以在画布上切分图形、填色来探索分数。

你的引导原则：
- 不直接给答案，通过提问引导学生自己发现
- 关注：分数的份数含义、等值分数（如1/2=2/4）、分数大小比较
- 识别典型错误：整数负迁移（以为分母大分数就大）
- 用"份数""涂色部分"等具体语言代替抽象术语
- 引导学生用操作验证自己的想法`,

        transform: `你是小学数学智能导学助手"小Q"，你的角色是苏格拉底式引导者。
当前模块：平移与旋转。学生可以在画布上拖拽图形进行平移、旋转、对称操作。

你的引导原则：
- 不直接给答案，通过提问引导学生自己发现
- 关注：平移（位置变形状不变）、旋转（绕中心点转）、对称（镜像关系）
- 引导学生比较变换前后"什么变了、什么没变"
- 鼓励学生先预测再操作验证`,

        segment: `你是小学数学智能导学助手"小Q"，你的角色是苏格拉底式引导者。
当前模块：线段图。学生可以通过拖拽线段来理解数量关系。

你的引导原则：
- 不直接给答案，通过提问引导学生自己发现
- 关注：和差关系、倍数关系、用线段图翻译应用题
- 引导"画图→分析→列式"的解题思维
- 鼓励学生用线段图来检验自己的算式是否正确`,
    },

    // 辅助 Prompt：将操作状态转为自然语言
    contextPrompts: {
        geometry: (state) => {
            if (!state || !state.vertices) return '';
            const a = state.angles || [];
            const s = state.sides || [];
            const shapeNames = {
                triangle: '三角形',
                quadrilateral: '四边形',
                rectangle: '长方形',
                parallelogram: '平行四边形',
            };
            const shapeName = shapeNames[state.shape] || state.shape || '三角形';
            let text = `当前图形：${shapeName}。`;
            if (a.length === 3) text += `三个角分别为 ${a[0]}°、${a[1]}°、${a[2]}°（和${a[0]+a[1]+a[2]}°）。`;
            if (s.length >= 2) text += `边长分别为 ${s.slice(0, 4).join('cm、')}cm。`;
            if (state.isIsosceles) text += '这是等腰三角形。';
            if (state.isRight) text += '这是直角三角形。';
            if (state.operation) text += ` 学生刚才${state.operation}。`;
            return text;
        },
        fraction: (state) => {
            if (!state) return '';
            let text = '';
            if (state.mode === 'single' && state.left) {
                const l = state.left;
                text = `当前图形：${l.shape === 'circle' ? '圆形' : '长方形'}被分成${l.denominator}份，涂色了${l.numerator}份，表示 ${l.numerator}/${l.denominator}。`;
            } else if (state.mode === 'dual' && state.left && state.right) {
                text = `左边：${state.left.numerator}/${state.left.denominator}；右边：${state.right.numerator}/${state.right.denominator}。`;
            }
            if (state.operation) text += ` 学生刚才${state.operation}。`;
            return text;
        },
        transform: (state) => {
            if (!state) return '';
            let text = `当前模式：${state.mode === 'translate' ? '平移' : state.mode === 'rotate' ? '旋转' : '对称'}。`;
            if (state.operation) text += ` 学生刚才${state.operation}。`;
            return text;
        },
        segment: (state) => {
            if (!state || !state.segments) return '';
            let text = '当前线段图：';
            const parts = state.segments.map(s => `${s.label}长度=${Math.round(s.length)}`);
            text += parts.join('，') + '。';
            if (state.ratio) text += ` 比例关系：${state.ratio}。`;
            if (state.operation) text += ` 学生刚才${state.operation}。`;
            return text;
        },
    },

    init() {
        this.conversationHistory = [];
    },

    // 构建消息列表
    buildMessages(module, contextText, userMessage) {
        const systemPrompt = this.systemPrompts[module] || this.systemPrompts.geometry;

        const messages = [
            { role: 'system', content: systemPrompt },
        ];

        // 添加上下文信息
        if (contextText) {
            messages.push({
                role: 'system',
                content: `[当前画布状态] ${contextText}\n请根据这个状态，如果学生没有明确提问，则主动给出一个简短的引导性问题（1-2句话）。如果学生有提问，则针对问题回答。`,
            });
        }

        // 添加历史（最近几轮）
        const recent = this.conversationHistory.slice(-CONFIG.maxHistoryTurns * 2);
        messages.push(...recent);

        // 添加用户消息
        if (userMessage && userMessage.trim()) {
            messages.push({ role: 'user', content: userMessage });
            this.conversationHistory.push({ role: 'user', content: userMessage });
        } else if (!contextText) {
            // 没有上下文也没有用户消息
            messages.push({ role: 'user', content: '你好' });
        }

        return messages;
    },

    // 主动触发（由操作空闲检测触发）
    async autoTrigger(module, operation, state) {
        const ctxFn = this.contextPrompts[module];
        const contextText = ctxFn ? ctxFn(state) : '';

        const messages = [
            { role: 'system', content: this.systemPrompts[module] },
            {
                role: 'system',
                content: `[当前画布状态] ${contextText}\n学生没有直接提问，请根据当前状态，给出1-2句简短的引导性提问，激发学生思考或操作探索。`,
            },
        ];

        const response = await this.call(messages);
        if (response) {
            addAssistantMessage(response);
        }
    },

    // 被动触发（学生主动提问）
    async ask(module, state, userMessage) {
        const ctxFn = this.contextPrompts[module];
        const contextText = ctxFn ? ctxFn(state) : '';

        const messages = this.buildMessages(module, contextText, userMessage);
        return await this.call(messages);
    },

    // 调用 DeepSeek API
    async call(messages) {
        if (!CONFIG.apiKey) {
            return this.mockResponse();
        }

        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKey}`,
                },
                body: JSON.stringify({
                    model: CONFIG.model,
                    messages: messages,
                    max_tokens: 300,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('LLM API error:', response.status, err);
                return `（API 错误：${response.status}，请检查 API Key 是否正确配置）`;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            if (content) {
                this.conversationHistory.push({ role: 'assistant', content });
            }

            return content;
        } catch (e) {
            console.error('LLM call failed:', e);
            return `（网络错误：${e.message}。请检查网络连接或 API 配置。）`;
        }
    },

    // 无API Key时的模拟响应（开发测试用）
    mockResponse() {
        const responses = {
            geometry: [
                '拖拽一下三角形的顶点，看看三个角的度数有什么变化？',
                '试试能不能拖出一个三个角都一样大的三角形？',
                '观察一下，把顶点往上拉后，哪条边变长了？哪个角变大了？',
                '你能拖出一个有一个角是直角的三角形吗？另外两个角加起来是多少度？',
            ],
            fraction: [
                '试试把圆切成4份，然后涂上2份，看看涂色部分占了整个圆的多少？',
                '切8份涂4份，和切4份涂2份，涂的部分一样大吗？动手试试！',
                '比较一下1/3和1/4，你觉得哪个更大？先在图上操作验证一下。',
            ],
            transform: [
                '把图形平移到右边，看看它的形状和大小变了吗？',
                '旋转90度后，图形的样子和原来一样吗？哪些变了哪些没变？',
                '试试把三角形先向上移3格，再向右移5格。如果反过来呢？结果一样吗？',
            ],
            segment: [
                '拖拽线段的端点，试试让甲的长度刚好是乙的3倍。',
                '如果你知道甲是乙的2倍，甲+乙=15，你能用线段图表示出来吗？',
                '看看你画的线段图，甲乙一共几份？每份有多长？',
            ],
        };

        const pool = responses[AppState.currentModule] || responses.geometry;
        return pool[Math.floor(Math.random() * pool.length)];
    },
};

// 快捷函数
function addAssistantMessage(text) {
    if (typeof chatUI !== 'undefined' && chatUI.addMessage) {
        chatUI.addMessage('assistant', text);
    }
}

function addSystemMessage(text) {
    if (typeof chatUI !== 'undefined' && chatUI.addMessage) {
        chatUI.addMessage('system', text);
    }
}

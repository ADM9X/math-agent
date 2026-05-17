// ===== 对话面板 UI =====
const chatUI = {
    container: null,
    input: null,
    sendBtn: null,

    init() {
        this.container = document.getElementById('chatMessages');
        this.input = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');

        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSend();
            }
        });
    },

    async handleSend() {
        const text = this.input.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        this.input.value = '';
        this.setSending(true);

        const module = AppState.currentModule;
        const state = AppState.context.state;

        // 显示等待中
        const typingEl = this.addTyping();

        try {
            const response = await llmClient.ask(module, state, text);
            this.removeTyping(typingEl);
            if (response) {
                this.addMessage('assistant', response);
            }
        } catch (e) {
            this.removeTyping(typingEl);
            this.addMessage('system', '消息发送失败，请重试。');
        }

        this.setSending(false);
    },

    addMessage(role, text) {
        const el = document.createElement('div');
        el.className = `message ${role}`;
        el.textContent = text;
        this.container.appendChild(el);
        this.scrollToBottom();
        return el;
    },

    addTyping() {
        const el = document.createElement('div');
        el.className = 'message typing';
        el.textContent = '小Q正在思考……';
        this.container.appendChild(el);
        this.scrollToBottom();
        return el;
    },

    removeTyping(el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    },

    setSending(disabled) {
        this.sendBtn.disabled = disabled;
        this.input.disabled = disabled;
    },

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    },

    clear() {
        this.container.innerHTML = '';
    },
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.getElementById('close-modal');
    const authForm = document.getElementById('auth-form');
    const toggleLink = document.getElementById('toggle-link');
    const modalTitle = document.getElementById('modal-title');
    const toggleText = document.getElementById('toggle-text');
    const userDisplay = document.getElementById('user-display');
    const usernameSpan = document.getElementById('username-span');
    const logoutIcon = document.getElementById('logout-icon');
    const historyList = document.getElementById('history-list');

    // State
    let isLoginMode = true;
    let currentUser = null;

    // Check Auth Status on Load
    checkAuthStatus();

    // Event Listeners
    authBtn.addEventListener('click', () => {
        authModal.classList.add('active');
        resetAuthForm();
    });

    closeModal.addEventListener('click', () => {
        authModal.classList.remove('active');
    });

    toggleLink.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        updateModalUI();
    });

    authForm.addEventListener('submit', handleAuthSubmit);
    logoutIcon.addEventListener('click', handleLogout);

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Functions
    function updateModalUI() {
        if (isLoginMode) {
            modalTitle.textContent = 'Hasi Saioa';
            toggleText.textContent = 'Ez daukazu konturik?';
            toggleLink.textContent = 'Erregistratu';
        } else {
            modalTitle.textContent = 'Erregistratu';
            toggleText.textContent = 'Badaukazu konturik?';
            toggleLink.textContent = 'Hasi Saioa';
        }
    }

    function resetAuthForm() {
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        isLoginMode = true;
        updateModalUI();
    }

    async function checkAuthStatus() {
        try {
            const res = await fetch('auth.php?action=check');
            const data = await res.json();
            if (data.logged_in) {
                currentUser = data.username;
                updateUserUI(true);
                loadHistory();
            } else {
                updateUserUI(false);
            }
        } catch (error) {
            console.error('Error checking auth:', error);
        }
    }

    function updateUserUI(loggedIn) {
        if (loggedIn) {
            authBtn.style.display = 'none';
            userDisplay.style.display = 'flex';
            usernameSpan.textContent = currentUser;
        } else {
            authBtn.style.display = 'inline-block';
            userDisplay.style.display = 'none';
            historyList.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center; font-size: 0.8rem;">Hasi saioa historia ikusteko</div>';
        }
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const action = isLoginMode ? 'login' : 'register';

        try {
            const res = await fetch(`auth.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                if (isLoginMode) {
                    authModal.classList.remove('active');
                    currentUser = data.username;
                    updateUserUI(true);
                    loadHistory();
                } else {
                    alert('Erregistro zuzena. Mesedez, hasi saioa.');
                    isLoginMode = true;
                    updateModalUI();
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Autentikazio errorea');
        }
    }

    async function handleLogout() {
        try {
            const res = await fetch('auth.php?action=logout', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                currentUser = null;
                updateUserUI(false);
                // Optional: Clear chat
                // chatContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async function loadHistory() {
        try {
            const res = await fetch('history.php');
            const data = await res.json();
            if (data.success) {
                renderHistory(data.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    function renderHistory(history) {
        historyList.innerHTML = '';
        history.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = chat.prompt;
            item.title = chat.prompt;
            item.onclick = () => {
                // Simplified: Just showing the prompt/response in the chat flow again?
                // Or maybe just scroll to it if we had full history loaded in main chat.
                // For now, let's just append it to the view essentially restoring context for the user visually
                appendMessage(chat.prompt, 'user');
                appendMessage(chat.response, 'ai');
            };
            historyList.appendChild(item);
        });
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        appendMessage(text, 'user');

        // Show typing indicator
        const typingId = showTypingIndicator();

        try {
            const res = await fetch('chat.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            const responseText = await res.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('JSON Parse Error:', e, 'Response:', responseText);
                throw new Error('Zerbitzariaren erantzun baliogabea: ' + responseText.substring(0, 100));
            }

            removeTypingIndicator(typingId);

            if (data.success) {
                appendMessage(data.response, 'ai');
                if (currentUser) loadHistory(); // Refresh history
            } else {
                appendMessage('Errorea: ' + data.message, 'ai');
            }
        } catch (error) {
            removeTypingIndicator(typingId);
            appendMessage('Konexio errorea: ' + error.message, 'ai');
            console.error('Chat error:', error);
        }
    }

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        if (sender === 'user') {
            avatar.textContent = 'E'; // E for Erabiltzailea (User)
        }

        const content = document.createElement('div');
        content.className = 'message-content';

        if (sender === 'ai' && typeof marked !== 'undefined') {
            // Parse Markdown for AI messages
            content.innerHTML = marked.parse(text);

            // Highlight code blocks
            content.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            // Simple text for user or fallback
            content.style.whiteSpace = 'pre-wrap';
            content.textContent = text;
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai';
        msgDiv.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
});

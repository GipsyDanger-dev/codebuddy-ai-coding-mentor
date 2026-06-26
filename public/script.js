/* ============================================
   CodeBuddy — AI Coding Mentor
   Frontend: Vanilla JS → Backend /api/chat
   ============================================ */

// ---- DOM Elements ----
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat');
const statusEl = document.getElementById('status');
const msgCountEl = document.getElementById('msg-count');
const charCountEl = document.getElementById('char-count');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const personaList = document.getElementById('persona-list');
const serverStatusEl = document.getElementById('server-status');

// Range inputs
const temperatureInput = document.getElementById('temperature');
const topKInput = document.getElementById('top-k');
const topPInput = document.getElementById('top-p');
const tempVal = document.getElementById('temp-val');
const topkVal = document.getElementById('topk-val');
const toppVal = document.getElementById('topp-val');

// ---- State ----
const API_BASE = '';  // Same origin
let messageCount = 0;
let isLoading = false;
let sessionId = generateSessionId();
let selectedPersona = 'default';
let serverConnected = false;

// ---- Generate Session ID ----
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ---- Initialize ----
async function init() {
  // Load settings
  loadSettings();

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    charCountEl.textContent = input.value.length;
    sendBtn.disabled = !input.value.trim() || isLoading;
  });

  // Form submit
  form.addEventListener('handleSubmit', handleSubmit);
  form.addEventListener('submit', handleSubmit);

  // Quick topics
  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.topic;
      input.dispatchEvent(new Event('input'));
      handleSubmit(new Event('submit'));
    });
  });

  // Clear chat
  clearChatBtn.addEventListener('click', clearChat);

  // Mobile menu
  menuToggle.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);

  // Enter to send (Shift+Enter for new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) handleSubmit(new Event('submit'));
    }
  });

  // Range inputs
  temperatureInput.addEventListener('input', () => {
    tempVal.textContent = temperatureInput.value;
    saveSettings();
  });

  topKInput.addEventListener('input', () => {
    topkVal.textContent = topKInput.value;
    saveSettings();
  });

  topPInput.addEventListener('input', () => {
    toppVal.textContent = topPInput.value;
    saveSettings();
  });

  // Load personas
  await loadPersonas();

  // Check server health
  await checkServerHealth();

  // Focus input
  input.focus();
}

// ---- Load Personas from Backend ----
async function loadPersonas() {
  try {
    const response = await fetch(`${API_BASE}/api/personas`);
    const data = await response.json();

    personaList.innerHTML = '';
    data.personas.forEach(persona => {
      const btn = document.createElement('button');
      btn.className = `persona-btn ${persona.id === selectedPersona ? 'active' : ''}`;
      btn.dataset.persona = persona.id;
      btn.innerHTML = `
        <span class="persona-emoji">${persona.emoji}</span>
        <div class="persona-info">
          <div class="persona-name">${persona.name}</div>
          <div class="persona-desc">${persona.description}</div>
        </div>
      `;
      btn.addEventListener('click', () => selectPersona(persona.id));
      personaList.appendChild(btn);
    });
  } catch (error) {
    console.error('Failed to load personas:', error);
    personaList.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">Gagal memuat persona</p>';
  }
}

// ---- Select Persona ----
function selectPersona(personaId) {
  selectedPersona = personaId;

  // Update UI
  document.querySelectorAll('.persona-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.persona === personaId);
  });

  saveSettings();
}

// ---- Check Server Health ----
async function checkServerHealth() {
  const dot = serverStatusEl.querySelector('.status-dot');
  const text = serverStatusEl.querySelector('span:last-child');

  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();

    if (data.status === 'ok') {
      serverConnected = true;
      dot.className = 'status-dot connected';
      text.textContent = `Server terhubung — Model: ${data.model}`;
    }
  } catch (error) {
    serverConnected = false;
    dot.className = 'status-dot error';
    text.textContent = 'Server tidak terhubung. Pastikan backend berjalan.';
  }
}

// ---- Settings ----
function saveSettings() {
  const settings = {
    persona: selectedPersona,
    temperature: temperatureInput.value,
    topK: topKInput.value,
    topP: topPInput.value
  };
  localStorage.setItem('codebuddy_settings', JSON.stringify(settings));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('codebuddy_settings'));
    if (saved) {
      selectedPersona = saved.persona || 'default';
      if (saved.temperature) temperatureInput.value = saved.temperature;
      if (saved.topK) topKInput.value = saved.topK;
      if (saved.topP) topPInput.value = saved.topP;

      tempVal.textContent = temperatureInput.value;
      topkVal.textContent = topKInput.value;
      toppVal.textContent = topPInput.value;
    }
  } catch (e) {
    // Use defaults
  }
}

// ---- Mobile Sidebar ----
function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

// ---- Handle Submit ----
async function handleSubmit(e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage || isLoading) return;

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  charCountEl.textContent = '0';
  sendBtn.disabled = true;

  // Remove welcome screen
  const welcome = chatBox.querySelector('.welcome');
  if (welcome) welcome.remove();

  // Show user message
  appendMessage('user', userMessage);
  messageCount++;
  updateMsgCount();

  // Show typing indicator
  showTyping();
  setLoading(true);

  try {
    // Kirim request ke backend
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        sessionId: sessionId,
        persona: selectedPersona,
        settings: {
          temperature: parseFloat(temperatureInput.value),
          topK: parseInt(topKInput.value),
          topP: parseFloat(topPInput.value)
        }
      })
    });

    const data = await response.json();

    hideTyping();

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    // Tampilkan respons dari Gemini
    appendMessage('bot', data.reply);
    messageCount++;
    updateMsgCount();

    // Log token usage (development info)
    if (data.usage) {
      console.log(`Token usage — Prompt: ${data.usage.promptTokens}, Completion: ${data.usage.completionTokens}, Total: ${data.usage.totalTokens}`);
    }

  } catch (error) {
    hideTyping();
    console.error('Chat Error:', error);
    showError(error.message || 'Terjadi kesalahan. Coba lagi nanti.');
  } finally {
    setLoading(false);
  }
}

// ---- Append Message ----
function appendMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender);

  const avatar = document.createElement('div');
  avatar.classList.add('message-avatar');
  avatar.textContent = sender === 'user' ? '🧑' : '👨‍💻';

  const content = document.createElement('div');
  content.classList.add('message-content');

  if (sender === 'bot') {
    content.innerHTML = formatMarkdown(text);
  } else {
    content.textContent = text;
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(content);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---- Format Markdown ----
function formatMarkdown(text) {
  let html = text;

  // Escape HTML first to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks with language
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'code';
    const codeId = 'code_' + Math.random().toString(36).substr(2, 8);
    return `<pre><div class="code-header"><span class="code-lang">${language}</span><button class="copy-btn" data-code-id="${codeId}" onclick="copyCode(this)">📋 Copy</button></div><code id="${codeId}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraphs
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

// ---- Copy Code ----
function copyCode(btn) {
  const codeId = btn.dataset.codeId;
  const codeEl = document.getElementById(codeId);
  if (!codeEl) return;

  const code = codeEl.textContent;

  navigator.clipboard.writeText(code).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋 Copy';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.classList.add('copied');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋 Copy';
    }, 2000);
  });
}

// Make copyCode globally available
window.copyCode = copyCode;

// ---- Show Error ----
function showError(text) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', 'bot');

  const avatar = document.createElement('div');
  avatar.classList.add('message-avatar');
  avatar.textContent = '⚠️';

  const content = document.createElement('div');
  content.classList.add('message-content');
  content.innerHTML = `<span style="color: var(--orange)">${text}</span>`;

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(content);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---- Typing Indicator ----
function showTyping() {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typing';

  typing.innerHTML = `
    <div class="message-avatar" style="background-color: var(--green-dim);">👨‍💻</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;

  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

// ---- Loading State ----
function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state || !input.value.trim();

  if (state) {
    statusEl.textContent = 'Lagi mikir... 🤔';
    sendBtn.innerHTML = '<span class="send-icon">⏳</span>';
  } else {
    statusEl.textContent = 'Siap membantu kamu ngoding! 🚀';
    sendBtn.innerHTML = '<span class="send-icon">➤</span>';
  }
}

// ---- Clear Chat ----
async function clearChat() {
  if (messageCount === 0) return;

  if (!confirm('Yakin mau hapus semua chat?')) return;

  // Clear on backend
  try {
    await fetch(`${API_BASE}/api/chat/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
  } catch (e) {
    // Ignore error, still clear frontend
  }

  // Clear frontend
  messageCount = 0;
  sessionId = generateSessionId();
  updateMsgCount();

  chatBox.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">👨‍💻</div>
      <h2>Halo! Gue CodeBuddy 👋</h2>
      <p>AI Coding Mentor siap bantu kamu belajar ngoding. Tanya apa aja — dari konsep dasar sampai advanced!</p>
      <div class="welcome-features">
        <div class="feature">
          <span>💡</span>
          <span>Jelaskan konsep programming</span>
        </div>
        <div class="feature">
          <span>🧑‍💻</span>
          <span>Bantuin nulis & review kode</span>
        </div>
        <div class="feature">
          <span>🐛</span>
          <span>Debugging & cari solusi error</span>
        </div>
        <div class="feature">
          <span>📚</span>
          <span>Kasih contoh kode lengkap</span>
        </div>
      </div>
      <div class="server-status" id="server-status">
        <span class="status-dot ${serverConnected ? 'connected' : ''}"></span>
        <span>${serverConnected ? 'Server terhubung' : 'Mengecek koneksi...'}</span>
      </div>
    </div>
  `;
}

// ---- Update Message Count ----
function updateMsgCount() {
  msgCountEl.textContent = `${messageCount} pesan`;
}

// ---- Run ----
init();

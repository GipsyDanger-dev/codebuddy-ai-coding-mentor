/* ============================================
   CodeBuddy — AI Coding Mentor
   Script: Gemini API Integration + Chat Logic
   ============================================ */

// ---- DOM Elements ----
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const apiKeyInput = document.getElementById('api-key');
const toggleKeyBtn = document.getElementById('toggle-key');
const clearChatBtn = document.getElementById('clear-chat');
const languageSelect = document.getElementById('language');
const difficultySelect = document.getElementById('difficulty');
const statusEl = document.getElementById('status');
const msgCountEl = document.getElementById('msg-count');
const charCountEl = document.getElementById('char-count');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');

// ---- State ----
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
let conversationHistory = [];
let messageCount = 0;
let isLoading = false;

// ---- System Prompt ----
function getSystemPrompt() {
  const language = languageSelect.value;
  const difficulty = difficultySelect.value;

  const langInstruction = language === 'any'
    ? 'Gunakan bahasa pemrograman yang paling sesuai dengan konteks pertanyaan.'
    : `Gunakan bahasa pemrograman ${language} untuk semua contoh kode.`;

  const difficultyMap = {
    pemula: 'Jelaskan seolah-olah ke orang yang baru mulai belajar coding. Gunakan analogi sederhana, hindari jargon teknis yang rumit, dan jelaskan setiap langkah secara detail.',
    menengah: 'Jelaskan dengan tingkat menengah. Boleh gunakan terminologi teknis tapi tetap jelaskan konsep yang mungkin belum diketahui.',
    lanjutan: 'Jelaskan secara mendalam dan teknis. Boleh langsung ke intinya, gunakan best practices, dan sebutkan edge cases.'
  };

  return `Kamu adalah CodeBuddy, seorang AI Coding Mentor yang santai, friendly, dan sangat membantu. Kamu berbicara dalam bahasa Indonesia gaul/casual tapi tetap informatif.

Kepribadianmu:
- Sabar dan suportif, terutama ke pemula
- Suka pakai emoji untuk bikin suasana lebih fun 😄
- Kalau ada yang error, tenang dan bantu step-by-step
- Sering kasih tips dan best practices di luar yang ditanya
- Boleh bercanda ringan tapi tetap profesional dalam ngasih solusi
- Selalu semangat kalau ada yang mau belajar coding!

Aturan teknis:
- SELALU format kode dalam markdown code blocks dengan bahasa yang tepat (contoh: \`\`\`javascript)
- ${langInstruction}
- ${difficultyMap[difficulty]}
- Kalau kasih contoh kode, pastikan LENGKAP dan BISA JALAN, bukan potongan yang bikin bingung
- Kalau ada error, JELASIN kenapa error-nya terjadi, bukan cuma kasih fix-nya
- Sisipkan penjelasan singkat di antara kode-kode yang kompleks
- Kalau pertanyaan di luar topik coding, arahkan balik ke topik coding dengan cara yang sopan

Format respons:
- Gunakan heading (###) untuk section yang berbeda
- Gunakan **bold** untuk konsep penting
- Gunakan \`inline code\` untuk nama variabel, fungsi, atau command
- Gunakan code blocks untuk kode yang lebih dari 1 baris
- Akhiri dengan tips atau saran tambahan kalau relevan`;
}

// ---- LocalStorage ----
function saveApiKey(key) {
  localStorage.setItem('codebuddy_api_key', key);
}

function loadApiKey() {
  return localStorage.getItem('codebuddy_api_key') || '';
}

function saveSettings() {
  localStorage.setItem('codebuddy_language', languageSelect.value);
  localStorage.setItem('codebuddy_difficulty', difficultySelect.value);
}

function loadSettings() {
  const lang = localStorage.getItem('codebuddy_language');
  const diff = localStorage.getItem('codebuddy_difficulty');
  if (lang) languageSelect.value = lang;
  if (diff) difficultySelect.value = diff;
}

// ---- Initialize ----
function init() {
  // Load saved data
  apiKeyInput.value = loadApiKey();
  loadSettings();

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    charCountEl.textContent = input.value.length;
    sendBtn.disabled = !input.value.trim() || isLoading;
  });

  // Toggle API key visibility
  toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // Save API key on change
  apiKeyInput.addEventListener('change', () => saveApiKey(apiKeyInput.value.trim()));

  // Save settings on change
  languageSelect.addEventListener('change', saveSettings);
  difficultySelect.addEventListener('change', saveSettings);

  // Form submit
  form.addEventListener('submit', handleSubmit);

  // Quick topics
  document.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.topic;
      input.dispatchEvent(new Event('input'));
      form.dispatchEvent(new Event('submit'));
    });
  });

  // Clear chat
  clearChatBtn.addEventListener('click', clearChat);

  // Mobile menu
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    toggleOverlay();
  });

  // Enter to send (Shift+Enter for new line)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) form.dispatchEvent(new Event('submit'));
    }
  });

  // Focus input
  input.focus();
}

// ---- Overlay for mobile ----
function toggleOverlay() {
  let overlay = document.querySelector('.overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
  overlay.classList.toggle('active', sidebar.classList.contains('open'));
}

// ---- Handle Submit ----
async function handleSubmit(e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage || isLoading) return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showError('Masukkan API Key Gemini dulu ya! 👆 Ambil di sidebar sebelah kiri.');
    apiKeyInput.focus();
    return;
  }

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
    const response = await callGeminiAPI(apiKey, userMessage);
    hideTyping();
    appendMessage('bot', response);
    messageCount++;
    updateMsgCount();
  } catch (error) {
    hideTyping();
    console.error('API Error:', error);

    let errorMsg = 'Aduh, ada error nih! 😅 ';
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('400')) {
      errorMsg += 'API Key-nya kayaknya salah. Cek lagi ya!';
    } else if (error.message.includes('429')) {
      errorMsg += 'Terlalu banyak request. Tunggu sebentar terus coba lagi ya!';
    } else if (error.message.includes('403')) {
      errorMsg += 'API Key-nya ditolak. Pastikan udah aktif ya!';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMsg += 'Koneksi internet bermasalah. Cek koneksi kamu ya!';
    } else {
      errorMsg += `Error: ${error.message}`;
    }

    showError(errorMsg);
  } finally {
    setLoading(false);
  }
}

// ---- Call Gemini API ----
async function callGeminiAPI(apiKey, userMessage) {
  // Add to conversation history
  conversationHistory.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const requestBody = {
    system_instruction: {
      parts: [{ text: getSystemPrompt() }]
    },
    contents: conversationHistory,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
      candidateCount: 1
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
    throw new Error('Respons dari Gemini kosong atau tidak valid.');
  }

  const botResponse = data.candidates[0].content.parts[0].text;

  // Add bot response to history
  conversationHistory.push({
    role: 'model',
    parts: [{ text: botResponse }]
  });

  // Keep history manageable (last 20 exchanges)
  if (conversationHistory.length > 40) {
    conversationHistory = conversationHistory.slice(-40);
  }

  return botResponse;
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
    // Add copy buttons to code blocks
    addCopyButtons(content);
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

  // Code blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'code';
    const escapedCode = escapeHtml(code.trim());
    return `<pre><div class="code-header"><span class="code-lang">${language}</span><button class="copy-btn" onclick="copyCode(this)">📋 Copy</button></div><code>${escapedCode}</code></pre>`;
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
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Copy Code ----
function addCopyButtons(container) {
  // Buttons are already added via onclick in formatMarkdown
}

function copyCode(btn) {
  const pre = btn.closest('pre');
  const code = pre.querySelector('code').textContent;

  navigator.clipboard.writeText(code).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋 Copy';
    }, 2000);
  }).catch(() => {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = code;
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
function clearChat() {
  if (conversationHistory.length === 0) return;

  if (confirm('Yakin mau hapus semua chat?')) {
    conversationHistory = [];
    messageCount = 0;
    chatBox.innerHTML = '';
    updateMsgCount();

    // Restore welcome screen
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
      </div>
    `;
  }
}

// ---- Update Message Count ----
function updateMsgCount() {
  msgCountEl.textContent = `${messageCount} pesan`;
}

// ---- Run ----
init();

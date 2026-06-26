/* ============================================
   CodeBuddy — AI Coding Mentor
   Frontend: Vanilla JS → POST /api/chat
   API Spec:
     Request:  { conversation: [{ role, text }] }
     Response: { result: "<gemini_response>" }
   ============================================ */

// ---- DOM Elements ----
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// ---- Conversation History ----
// Array of { role: "user"|"model", text: "..." }
// Dikirim ke backend setiap kali user mengirim pesan
const conversation = [];

// ---- Event Listener ----
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Tampilkan pesan user di chat box
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Tambahkan user message ke conversation history
  conversation.push({ role: 'user', text: userMessage });

  // 3. Tampilkan "Thinking..." sementara
  const thinkingEl = appendMessage('bot', '🤔 Thinking...');

  // 4. Kirim request ke backend
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();

    // 5. Ganti "Thinking..." dengan respons AI
    if (response.ok && data.result) {
      // Tambahkan model response ke conversation history
      conversation.push({ role: 'model', text: data.result });

      // Update DOM dengan respons dari Gemini
      thinkingEl.querySelector('.message-content').innerHTML = formatMarkdown(data.result);
    } else {
      // Tidak ada result yang diterima
      thinkingEl.querySelector('.message-content').innerHTML =
        '<span style="color: var(--orange)">⚠️ Sorry, no response received.</span>';
    }
  } catch (error) {
    console.error('Chat Error:', error);

    // 6. Error handling — gagal menghubungi server
    thinkingEl.querySelector('.message-content').innerHTML =
      '<span style="color: var(--red)">❌ Failed to get response from server.</span>';
  }
});

// ---- Append Message ke Chat Box ----
function appendMessage(sender, text) {
  // Hapus welcome screen jika ada
  const welcome = chatBox.querySelector('.welcome');
  if (welcome) welcome.remove();

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

  return msgDiv; // Return element agar bisa di-update (untuk Thinking...)
}

// ---- Format Markdown ----
function formatMarkdown(text) {
  let html = text;

  // Escape HTML untuk mencegah XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks dengan bahasa
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

  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    btn.classList.add('copied');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.textContent = '📋 Copy';
    }, 2000);
  }).catch(() => {
    // Fallback untuk browser lama
    const textarea = document.createElement('textarea');
    textarea.value = codeEl.textContent;
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

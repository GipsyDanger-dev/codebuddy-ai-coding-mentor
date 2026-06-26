/* ============================================
   CodeBuddy — AI Coding Mentor
   Frontend: Vanilla JS → POST /api/chat
   ============================================ */

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const statusEl = document.getElementById('status');
const msgCountEl = document.getElementById('msg-count');
const charCountEl = document.getElementById('char-count');
const serverStatusEl = document.getElementById('server-status');

// ---- Conversation History ----
const conversation = [];
let messageCount = 0;

// ---- Health Check ----
async function checkServer() {
  const dot = serverStatusEl.querySelector('.status-dot');
  const text = serverStatusEl.querySelector('span:last-child');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.status === 'ok') {
      dot.classList.add('connected');
      text.textContent = `Server terhubung — Model: ${data.model}`;
    }
  } catch {
    dot.classList.add('error');
    text.textContent = 'Server tidak terhubung. Pastikan backend berjalan.';
  }
}

// ---- Init ----
checkServer();

// Enable/disable tombol Send berdasarkan input
input.addEventListener('input', () => {
  sendBtn.disabled = !input.value.trim();
  charCountEl.textContent = input.value.length;
});

// ---- Form Submit ----
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Tampilkan pesan user di chat box
  appendMessage('user', userMessage);
  input.value = '';
  sendBtn.disabled = true;
  charCountEl.textContent = '0';
  messageCount++;
  msgCountEl.textContent = `${messageCount} pesan`;

  // 2. Tambahkan ke conversation history
  conversation.push({ role: 'user', text: userMessage });

  // 3. Tampilkan "Thinking..." sementara
  const thinkingEl = appendMessage('bot', '🤔 Thinking...');
  statusEl.textContent = 'Lagi mikir... 🤔';

  // 4. Kirim ke backend Gemini API
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();

    // 5. Ganti "Thinking..." dengan respons AI dari Gemini
    if (response.ok && data.result) {
      conversation.push({ role: 'model', text: data.result });
      thinkingEl.querySelector('.message-content').textContent = data.result;
      messageCount++;
      msgCountEl.textContent = `${messageCount} pesan`;
    } else {
      thinkingEl.querySelector('.message-content').textContent =
        'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Chat Error:', error);

    // 6. Error handling
    thinkingEl.querySelector('.message-content').textContent =
      'Failed to get response from server.';
  } finally {
    statusEl.textContent = 'Siap membantu kamu ngoding! 🚀';
  }
});

// ---- Tambahkan pesan ke chat box ----
function appendMessage(sender, text) {
  // Hapus welcome screen jika ada
  const welcome = chatBox.querySelector('.welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  const content = document.createElement('div');
  content.classList.add('message-content');
  content.textContent = text;

  msg.appendChild(content);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  return msg; // Return element agar bisa di-update (untuk Thinking...)
}

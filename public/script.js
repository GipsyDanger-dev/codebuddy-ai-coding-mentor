const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-chat');
const serverStatusEl = document.getElementById('server-status');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const conversation = [];

// Health check
async function checkServer() {
  const dot = serverStatusEl.querySelector('.status-dot');
  const text = serverStatusEl.querySelector('span:last-child');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.status === 'ok') {
      dot.classList.add('connected');
      text.textContent = 'Server terhubung';
    }
  } catch {
    dot.classList.add('error');
    text.textContent = 'Server tidak terhubung';
  }
}

checkServer();

// Input
input.addEventListener('input', () => {
  sendBtn.disabled = !input.value.trim();
});

// Quick topics & chips
function bindTopicButtons() {
  document.querySelectorAll('.topic-btn, .chip').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.topic;
      sendBtn.disabled = false;
      form.dispatchEvent(new Event('submit'));
    });
  });
}

bindTopicButtons();

// Clear chat
clearBtn.addEventListener('click', () => {
  conversation.length = 0;
  chatBox.innerHTML = `
    <div class="welcome">
      <div class="welcome-mark">&lt;/&gt;</div>
      <h2>Mau ngoding apa hari ini?</h2>
      <p>Tanya apa aja soal programming. CodeBuddy siap bantu.</p>
      <div class="welcome-chips">
        <button class="chip" data-topic="Jelaskan konsep async/await di JavaScript">Async/Await</button>
        <button class="chip" data-topic="Buatkan contoh CRUD sederhana menggunakan React">React CRUD</button>
        <button class="chip" data-topic="Tips debugging yang efektif untuk pemula">Debugging</button>
        <button class="chip" data-topic="Jelaskan SOLID Principle dengan contoh kode">SOLID</button>
      </div>
    </div>
  `;
  bindTopicButtons();
});

// Mobile menu
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
});

// Submit
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';
  sendBtn.disabled = true;

  conversation.push({ role: 'user', text: userMessage });

  const thinkingEl = appendThinking();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();

    thinkingEl.remove();

    if (response.ok && data.result) {
      conversation.push({ role: 'model', text: data.result });
      appendMessage('bot', data.result);
    } else {
      appendMessage('bot', 'Maaf, tidak ada respons dari server.');
    }
  } catch (error) {
    console.error('Chat Error:', error);
    thinkingEl.remove();
    appendMessage('bot', 'Gagal terhubung ke server.');
  }
});

// Format text
function formatText(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Append message
function appendMessage(sender, text) {
  const welcome = chatBox.querySelector('.welcome');
  if (welcome) welcome.remove();

  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  const avatar = document.createElement('div');
  avatar.classList.add('message-avatar');
  avatar.textContent = sender === 'user' ? 'U' : '</>';

  const body = document.createElement('div');
  body.classList.add('message-body');

  const senderLabel = document.createElement('div');
  senderLabel.classList.add('message-sender');
  senderLabel.textContent = sender === 'user' ? 'Anda' : 'CodeBuddy';

  const content = document.createElement('div');
  content.classList.add('message-content');
  content.innerHTML = formatText(text);

  body.appendChild(senderLabel);
  body.appendChild(content);
  msg.appendChild(avatar);
  msg.appendChild(body);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  return msg;
}

// Append thinking indicator
function appendThinking() {
  const welcome = chatBox.querySelector('.welcome');
  if (welcome) welcome.remove();

  const el = document.createElement('div');
  el.classList.add('thinking-indicator');

  el.innerHTML = `
    <div class="thinking-avatar">&lt;/&gt;</div>
    <div class="thinking-dots">
      <span></span><span></span><span></span>
    </div>
  `;

  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;

  return el;
}

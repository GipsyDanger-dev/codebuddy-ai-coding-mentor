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

// ---- Health Check ----
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

// ---- Input ----
input.addEventListener('input', () => {
  sendBtn.disabled = !input.value.trim();
});

// ---- Quick Topics ----
document.querySelectorAll('.topic-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.topic;
    sendBtn.disabled = false;
    form.dispatchEvent(new Event('submit'));
  });
});

// ---- Clear Chat ----
clearBtn.addEventListener('click', () => {
  conversation.length = 0;
  chatBox.innerHTML = `
    <div class="welcome">
      <h2>CodeBuddy</h2>
      <p>AI Coding Mentor. Tanya apa aja soal programming.</p>
    </div>
  `;
});

// ---- Mobile Menu ----
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
});

// ---- Submit ----
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';
  sendBtn.disabled = true;

  conversation.push({ role: 'user', text: userMessage });

  const thinkingEl = appendMessage('bot', 'Thinking...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();

    if (response.ok && data.result) {
      conversation.push({ role: 'model', text: data.result });
      thinkingEl.querySelector('.message-content').textContent = data.result;
    } else {
      thinkingEl.querySelector('.message-content').textContent =
        'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Chat Error:', error);
    thinkingEl.querySelector('.message-content').textContent =
      'Failed to get response from server.';
  }
});

// ---- Append Message ----
function appendMessage(sender, text) {
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

  return msg;
}

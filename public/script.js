/* ============================================
   CodeBuddy — AI Coding Mentor
   Frontend: Vanilla JS → POST /api/chat
   ============================================ */

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// ---- Conversation History ----
// Array of { role, text } — dikirim ke backend setiap kali user mengirim pesan
const conversation = [];

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Tampilkan pesan user di chat box
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Tambahkan ke conversation history
  conversation.push({ role: 'user', text: userMessage });

  // 3. Tampilkan "Thinking..." sementara
  const thinkingEl = appendMessage('bot', '🤔 Thinking...');

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
    } else {
      thinkingEl.querySelector('.message-content').textContent =
        'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Chat Error:', error);

    // 6. Error handling
    thinkingEl.querySelector('.message-content').textContent =
      'Failed to get response from server.';
  }
});

// ---- Tambahkan pesan ke chat box ----
function appendMessage(sender, text) {
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

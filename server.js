/* ============================================
   CodeBuddy — AI Coding Mentor
   Backend: Node.js + Express + Gemini SDK
   ============================================ */

require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Gemini AI Setup ----
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model & konfigurasi parameter Gemini
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: {
    parts: [{
      text: `Kamu adalah CodeBuddy, seorang AI Coding Mentor yang sabar, friendly, dan sangat membantu.

Kepribadianmu:
- Kamu berbicara dalam bahasa Indonesia yang santai dan gaul, tapi tetap informatif
- Suka pakai emoji untuk bikin suasana lebih fun 😄
- Kalau ada yang error, tenang dan bantu step-by-step
- Sering kasih tips dan best practices di luar yang ditanya
- Boleh bercanda ringan tapi tetap profesional dalam ngasih solusi
- Selalu semangat kalau ada yang mau belajar coding!

Aturan teknis:
- SELALU format kode dalam markdown code blocks dengan bahasa yang tepat
- Kasih contoh kode yang LENGKAP dan BISA JALAN, bukan potongan
- Kalau ada error, JELASIN kenapa error-nya terjadi
- Sisipkan penjelasan singkat di antara kode kompleks
- Kalau pertanyaan di luar topik coding, arahkan balik ke coding dengan sopan

Format respons:
- Gunakan heading untuk section berbeda
- Gunakan **bold** untuk konsep penting
- Gunakan \`inline code\` untuk nama variabel/fungsi/command
- Akhiri dengan tips atau saran tambahan kalau relevan`
    }]
  }
});

// Konfigurasi generation parameters
const generationConfig = {
  temperature: 0.7,     // Keseimbangan antara kreatif dan akurat
  topP: 0.9,            // Nucleus sampling
  topK: 40,             // Top-K token selection
  maxOutputTokens: 8192 // Maksimal output
};

// ---- Conversation Memory (per session) ----
// Menyimpan history percakapan per client menggunakan sessionId
const conversations = new Map();

// Cleanup conversations setiap 30 menit
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of conversations) {
    if (now - data.lastActive > 30 * 60 * 1000) {
      conversations.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

// ---- System Instruction per Persona ----
// Bisa diubah dari frontend via request
const personas = {
  default: null, // Menggunakan system instruction dari model
  senior: 'Kamu adalah senior developer berpengalaman 15 tahun. Jawab dengan analitis, sebutkan edge cases, dan berikan best practices industri.',
  teacher: 'Kamu adalah guru programming yang sangat sabar. Jelaskan step-by-step, gunakan analogi sehari-hari, dan selalu tanya apakah murid sudah paham.',
  peer: 'Kamu adalah teman coding yang selevel. Diskusi santai, saling sharing, dan belajar bareng. Gunakan bahasa gaul Indonesia.',
  interviewer: 'Kamu adalah technical interviewer. Tanya balik untuk menguji pemahaman, berikan soal latihan, dan kasih feedback konstruktif.'
};

// ---- Routes ----

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: 'gemini-2.0-flash',
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint — POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, persona, settings } = req.body;

    // Validasi input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Pesan tidak boleh kosong!',
        code: 'EMPTY_MESSAGE'
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: 'Pesan terlalu panjang! Maksimal 5000 karakter.',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Dapatkan atau buat conversation history
    const sid = sessionId || 'default';
    if (!conversations.has(sid)) {
      conversations.set(sid, {
        history: [],
        lastActive: Date.now()
      });
    }

    const conversation = conversations.get(sid);
    conversation.lastActive = Date.now();

    // Tambahkan user message ke history
    conversation.history.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    // Batasi history ke 20 pertukaran (40 pesan)
    if (conversation.history.length > 40) {
      conversation.history = conversation.history.slice(-40);
    }

    // Tentukan persona dan config
    const selectedPersona = persona && personas[persona]
      ? personas[persona]
      : null;

    const customConfig = {
      ...generationConfig,
      ...(settings?.temperature !== undefined && { temperature: settings.temperature }),
      ...(settings?.topK !== undefined && { topK: settings.topK }),
      ...(settings?.topP !== undefined && { topP: settings.topP })
    };

    // Siapkan model dengan atau tanpa persona override
    let chatModel = model;
    if (selectedPersona) {
      chatModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: {
          parts: [{
            text: selectedPersona
          }]
        }
      });
    }

    // Mulai chat session dengan history
    const chat = chatModel.startChat({
      generationConfig: customConfig,
      history: conversation.history.slice(0, -1) // Kirim semua kecuali pesan terakhir
    });

    // Kirim pesan ke Gemini
    const result = await chat.sendMessage(message.trim());
    const response = result.response;
    const botReply = response.text();

    // Tambahkan bot response ke history
    conversation.history.push({
      role: 'model',
      parts: [{ text: botReply }]
    });

    // Kirim respons ke frontend
    res.json({
      reply: botReply,
      sessionId: sid,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    });

  } catch (error) {
    console.error('Gemini API Error:', error);

    // Handle berbagai jenis error
    if (error.message?.includes('API_KEY_INVALID') || error.status === 400) {
      return res.status(400).json({
        error: 'API Key tidak valid. Periksa kembali API Key kamu.',
        code: 'INVALID_API_KEY'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Terlalu banyak request. Tunggu beberapa saat dan coba lagi.',
        code: 'RATE_LIMIT'
      });
    }

    if (error.status === 403) {
      return res.status(403).json({
        error: 'Akses ditolak. Pastikan API Key memiliki izin yang benar.',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({
      error: 'Terjadi kesalahan pada server. Coba lagi nanti.',
      code: 'SERVER_ERROR',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clear conversation — POST /api/chat/clear
app.post('/api/chat/clear', (req, res) => {
  const { sessionId } = req.body;
  const sid = sessionId || 'default';

  if (conversations.has(sid)) {
    conversations.delete(sid);
  }

  res.json({ status: 'cleared', sessionId: sid });
});

// Get available personas — GET /api/personas
app.get('/api/personas', (req, res) => {
  res.json({
    personas: [
      { id: 'default', name: 'CodeBuddy Default', emoji: '👨‍💻', description: 'Mentor coding santai & friendly' },
      { id: 'senior', name: 'Senior Dev', emoji: '🧑‍💼', description: 'Developer berpengalaman, fokus best practices' },
      { id: 'teacher', name: 'Guru Programming', emoji: '👨‍🏫', description: 'Penjelasan step-by-step dengan analogi' },
      { id: 'peer', name: 'Teman Coding', emoji: '🤝', description: 'Diskusi santai, belajar bareng' },
      { id: 'interviewer', name: 'Tech Interviewer', emoji: '🎯', description: 'Tanya balik & kasih soal latihan' }
    ]
  });
});

// Catch-all: serve index.html untuk SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🚀 CodeBuddy server berjalan di http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🤖 Model: Gemini 2.0 Flash\n`);
});

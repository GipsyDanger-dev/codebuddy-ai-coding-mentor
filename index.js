/* ============================================
   CodeBuddy — AI Coding Mentor
   Backend: Node.js + Express + Gemini 2.5 Flash
   Menggunakan ES Modules (import/export)
   ============================================ */

// ---- Import Modules ----
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

// ---- Setup __dirname untuk ES Modules ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Inisialisasi Express App ----
const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());                          // Izinkan request lintas origin
app.use(express.json());                  // Parsing JSON request body
app.use(express.static(path.join(__dirname, 'public'))); // Sajikan file statis

// ---- Inisialisasi Gemini AI Client ----
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Variabel global untuk model Gemini — mudah diganti di satu tempat
const GEMINI_MODEL = 'gemini-2.5-flash';

// ---- System Instruction (Persona Default CodeBuddy) ----
const DEFAULT_SYSTEM_INSTRUCTION = `Kamu adalah CodeBuddy, seorang AI Coding Mentor yang sabar, friendly, dan sangat membantu.

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
- Akhiri dengan tips atau saran tambahan kalau relevan`;

// ---- System Instruction per Persona ----
const PERSONAS = {
  default: DEFAULT_SYSTEM_INSTRUCTION,
  senior: 'Kamu adalah senior developer berpengalaman 15 tahun. Jawab dengan analitis, sebutkan edge cases, dan berikan best practices industri. Gunakan bahasa Indonesia.',
  teacher: 'Kamu adalah guru programming yang sangat sabar. Jelaskan step-by-step, gunakan analogi sehari-hari, dan selalu tanya apakah murid sudah paham. Gunakan bahasa Indonesia.',
  peer: 'Kamu adalah teman coding yang selevel. Diskusi santai, saling sharing, dan belajar bareng. Gunakan bahasa gaul Indonesia.',
  interviewer: 'Kamu adalah technical interviewer. Tanya balik untuk menguji pemahaman, berikan soal latihan, dan kasih feedback konstruktif. Gunakan bahasa Indonesia.'
};

// ---- Routes ----

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: GEMINI_MODEL,
    timestamp: new Date().toISOString()
  });
});

/**
 * Chat endpoint — Menerima input teks dan mengembalikan respons AI
 * POST /api/chat
 *
 * Body request:
 * {
 *   messages: [
 *     { role: "user", content: "Halo" },
 *     { role: "model", content: "Halo juga!" },
 *     { role: "user", content: "Jelaskan async/await" }
 *   ],
 *   persona: "default",
 *   settings: { temperature: 0.7, topK: 40, topP: 0.9 }
 * }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, persona, settings } = req.body;

    // Validasi: messages harus berupa array
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'messages harus berupa array dan tidak boleh kosong.',
        code: 'INVALID_MESSAGES'
      });
    }

    // Validasi: setiap pesan harus punya role dan content
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          error: 'Setiap pesan harus memiliki role dan content.',
          code: 'INVALID_MESSAGE_FORMAT'
        });
      }
    }

    // Tentukan system instruction berdasarkan persona
    const selectedPersona = persona && PERSONAS[persona]
      ? PERSONAS[persona]
      : PERSONAS.default;

    // Konfigurasi generation parameters
    const generationConfig = {
      temperature: settings?.temperature ?? 0.7,
      topK: settings?.topK ?? 40,
      topP: settings?.topP ?? 0.9,
      maxOutputTokens: 8192
    };

    // Inisialisasi model dengan system instruction
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: {
        parts: [{ text: selectedPersona }]
      }
    });

    // Format messages ke format Gemini (role: user/model, parts)
    // Pisahkan pesan terakhir sebagai input, sisanya sebagai history
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;

    // Mulai chat session dengan history
    const chat = model.startChat({
      generationConfig,
      history
    });

    // Kirim pesan terakhir ke Gemini menggunakan generateContent()
    const result = await chat.sendMessage(lastMessage);
    const response = result.response;
    const reply = response.text();

    // Kirim respons ke frontend
    res.json({
      reply,
      model: GEMINI_MODEL,
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
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Get available personas
 * GET /api/personas
 */
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

// Catch-all: serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🚀 CodeBuddy server berjalan di http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🤖 Model: ${GEMINI_MODEL}\n`);
});

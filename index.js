import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Kamu adalah CodeBuddy, AI Coding Mentor. Jawab dalam bahasa Indonesia yang santai.

Aturan:
- Jelaskan konsep programming dengan bahasa yang mudah dipahami
- Berikan contoh kode yang lengkap dan bisa dijalankan
- Bantu debugging dan jelaskan kenapa error terjadi
- Kasih tips dan best practices
- Format kode dalam markdown code blocks`;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: GEMINI_MODEL });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'conversation harus berupa array.' });
    }

    for (const msg of conversation) {
      if (!msg.role || !msg.text) {
        return res.status(400).json({ error: 'Setiap pesan harus memiliki role dan text.' });
      }
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
    });

    const history = conversation.slice(0, -1).map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const lastMessage = conversation[conversation.length - 1].text;

    const chat = model.startChat({
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.9, maxOutputTokens: 8192 },
      history
    });

    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();

    res.json({ result: reply });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

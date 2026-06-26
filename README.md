# 👨‍💻 CodeBuddy — AI Coding Mentor

Chatbot berbasis AI yang berperan sebagai **Coding Mentor** pribadi. Menggunakan arsitektur **client-server** dengan backend **Node.js + Express** dan **Google Gemini 2.5 Flash API** untuk menghasilkan respons yang cerdas dan relevan.

## ✨ Fitur Utama

- 🤖 **AI-Powered Chat** — Respons dinamis dari Gemini 2.5 Flash, bukan hardcode
- 🏗️ **Arsitektur Client-Server** — Logika AI di backend, lebih aman dan scalable
- 💬 **Multi-Turn Conversation** — Mengirim array `messages` (riwayat percakapan) ke backend
- 🎭 **Multi-Persona** — Pilih gaya mentor: Default, Senior Dev, Guru, Teman Coding, Interviewer
- ⚙️ **Konfigurasi Parameter AI** — Atur Temperature, Top-K, Top-P secara real-time
- 🎨 **Code Syntax Highlighting** — Format kode rapi dengan tombol copy
- 🎯 **Quick Topics** — Topik coding populer dalam satu klik
- 📱 **Responsive Design** — Tampilan optimal di desktop dan mobile
- 🌙 **Dark Theme** — UI modern, developer-friendly
- 📦 **ES Modules** — Menggunakan syntax `import/export` modern

## 🏛️ Arsitektur Sistem

```
┌─────────────────┐         POST /api/chat         ┌─────────────────────┐
│                 │  ─────────────────────────────►  │                     │
│    Frontend     │         { messages: [            │   Backend           │
│  (Vanilla JS)   │           { role, content },     │  (Node.js+Express)  │
│                 │           { role, content },     │                     │
│  index.html     │         ],                      │  index.js           │
│  style.css      │           persona, settings }   │                     │
│  script.js      │                                 │  ┌───────────────┐  │
│                 │  ◄─────────────────────────────  │  │  Gemini SDK   │  │
│                 │         { reply, usage }         │  │ generateContent│ │
└─────────────────┘                                 │  └───────┬───────┘  │
                                                     │          │          │
                                                     └──────────┼──────────┘
                                                                │
                                                                ▼
                                                     ┌─────────────────────┐
                                                     │   Google Gemini     │
                                                     │   2.5 Flash API     │
                                                     └─────────────────────┘
```

### Alur Data (Multi-Turn Conversation)

1. **User** mengirim pesan melalui form chat di browser
2. **Frontend** menambahkan pesan ke `conversationHistory` array
3. **Frontend** mengirim **SELURUH** `messages` array ke `POST /api/chat`
4. **Backend** menerima array `messages`, memvalidasi format (`role` + `content`)
5. **Backend** memisahkan **history** (pesan sebelumnya) dan **pesan terakhir**
6. **Backend** memanggil `generateContent()` dari **Gemini SDK** dengan:
   - System instruction (persona yang dipilih)
   - Conversation history (multi-turn context)
   - Parameter AI (temperature, top_k, top_p)
7. **Gemini AI** menghasilkan respons yang relevan berdasarkan konteks percakapan
8. **Backend** mengirim respons kembali ke frontend
9. **Frontend** menambahkan respons ke history dan menampilkan di chat

## 🛠️ Teknologi

| Teknologi | Kegunaan |
|-----------|----------|
| **Node.js** | Runtime server (ES Modules) |
| **Express** | Web framework & API routing |
| **CORS** | Middleware untuk request lintas origin |
| **@google/generative-ai** | Gemini SDK resmi dari Google |
| **dotenv** | Manajemen environment variables |
| **HTML5** | Struktur halaman frontend |
| **CSS3** | Styling & responsive design |
| **Vanilla JavaScript** | Logika frontend & fetch API |

## 📂 Struktur Proyek

```
starter/
├── index.js            # Backend: Express + Gemini 2.5 Flash + CORS
├── package.json        # Dependencies & scripts (type: "module")
├── .env                # API key (tidak di-commit ke Git)
├── .gitignore          # Ignored files
├── README.md           # Dokumentasi
└── public/             # Frontend files (served by Express)
    ├── index.html      # Halaman utama chat UI
    ├── style.css       # Styling (dark theme)
    └── script.js       # Fetch ke /api/chat (messages array)
```

## 🚀 Cara Menjalankan

### 1. Clone Repository

```bash
git clone https://github.com/GipsyDanger-dev/codebuddy-ai-coding-mentor.git
cd codebuddy-ai-coding-mentor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup API Key

Buka file `.env` dan masukkan API Key Gemini:

```env
GEMINI_API_KEY=your-api-key-here
PORT=3000
```

> 💡 Dapatkan API Key gratis di [Google AI Studio](https://aistudio.google.com/apikey)

### 4. Jalankan Server

```bash
npm start
```

Atau untuk development dengan auto-restart:

```bash
npm run dev
```

### 5. Buka di Browser

```
http://localhost:3000
```

## ⚙️ Konfigurasi Gemini

Parameter AI dapat diubah secara real-time melalui sidebar:

| Parameter | Fungsi | Range | Default |
|-----------|--------|-------|---------|
| **Temperature** | Mengontrol kreativitas. Nilai tinggi = lebih kreatif | 0.0 – 2.0 | 0.7 |
| **Top-K** | Membatasi token yang dipertimbangkan | 1 – 40 | 40 |
| **Top-P** | Nucleus sampling untuk keacakan | 0.0 – 1.0 | 0.9 |

### Tips Pengaturan

- **Kreatif** (temperature: 0.9, top-p: 0.95) — Cocok untuk brainstorming ide
- **Seimbang** (temperature: 0.7, top-p: 0.9) — Default, cocok untuk umum
- **Presisi** (temperature: 0.2, top-p: 0.8) — Cocok untuk jawaban faktual

## 🎭 Persona

Chatbot memiliki 5 persona yang bisa dipilih:

| Persona | Gaya | Cocok Untuk |
|---------|------|-------------|
| 👨‍💻 **CodeBuddy Default** | Santai & friendly | Belajar sehari-hari |
| 🧑‍💼 **Senior Dev** | Analitis, best practices | Kode production-ready |
| 👨‍🏫 **Guru Programming** | Sabar, step-by-step | Pemula total |
| 🤝 **Teman Coding** | Diskusi santai | Kolaborasi & diskusi |
| 🎯 **Tech Interviewer** | Tanya balik, kasih soal | Persiapan interview |

## 📡 API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/api/chat` | Kirim pesan (messages array) & terima respons AI |
| `GET` | `/api/personas` | Daftar persona yang tersedia |
| `GET` | `/api/health` | Health check server |

### Contoh Request — POST /api/chat

```javascript
{
  "messages": [
    { "role": "user", "content": "Halo, perkenalkan dirimu" },
    { "role": "model", "content": "Halo! Gue CodeBuddy..." },
    { "role": "user", "content": "Jelaskan async/await di JavaScript" }
  ],
  "persona": "default",
  "settings": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.9
  }
}
```

### Contoh Response

```javascript
{
  "reply": "Oke, gue jelasin async/await ya! ...",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 800,
    "totalTokens": 950
  }
}
```

## 🎨 Use Case

**Coding Mentor** — Chatbot yang membantu:
- Menjelaskan konsep programming dengan bahasa yang mudah dipahami
- Memberikan contoh kode lengkap dan bisa langsung dijalankan
- Membantu debugging dan mencari solusi error
- Memberikan tips dan best practices dalam coding

## 📝 Catatan

- Menggunakan **ES Modules** (`"type": "module"` di package.json, syntax `import/export`)
- API Key disimpan di **server-side** (`.env`), tidak pernah dikirim ke browser
- Conversation history dikirim sebagai **messages array** ke backend (multi-turn)
- Backend menggunakan **CORS** middleware untuk mengizinkan request lintas origin
- Menggunakan model **Gemini 2.5 Flash** yang cepat dan efisien

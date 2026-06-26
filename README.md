# 👨‍💻 CodeBuddy — AI Coding Mentor

Chatbot berbasis AI yang berperan sebagai **Coding Mentor** pribadi. Dibangun dengan **Gemini 2.0 Flash API**, CodeBuddy membantu kamu belajar programming dengan gaya yang santai, friendly, dan mudah dipahami.

## ✨ Fitur Utama

- 🤖 **AI-Powered Chat** — Terhubung langsung ke Gemini 2.0 Flash API
- 💡 **System Prompt Khusus** — Persona Coding Mentor yang sabar dan supportif
- 💬 **Conversation Memory** — Mengingat percakapan sebelumnya dalam sesi yang sama
- 🎨 **Code Syntax Highlighting** — Format kode yang rapi dengan tombol copy
- ⚙️ **Pengaturan Fleksibel** — Pilih bahasa pemrograman dan level penjelasan
- 🎯 **Quick Topics** — Topik-topik coding populer dalam satu klik
- 📱 **Responsive Design** — Tampilan optimal di desktop dan mobile
- 🔑 **API Key Management** — Simpan API key di localStorage, tidak perlu input ulang
- 🌙 **Dark Theme** — Nyaman di mata untuk sesi coding yang lama

## 🚀 Cara Penggunaan

### 1. Dapatkan API Key
Kunjungi [Google AI Studio](https://aistudio.google.com/apikey) untuk mendapatkan API Key Gemini secara gratis.

### 2. Buka Aplikasi
Buka file `index.html` di browser.

### 3. Masukkan API Key
Tempel API Key di kolom yang tersedia di sidebar kiri.

### 4. Mulai Chat!
Ketik pertanyaan seputar programming dan CodeBuddy akan membantu kamu.

## 🛠️ Teknologi

| Teknologi | Kegunaan |
|-----------|----------|
| HTML5 | Struktur halaman |
| CSS3 | Styling & responsive design |
| JavaScript (Vanilla) | Logika aplikasi & API integration |
| Gemini 2.0 Flash API | AI language model |

## 📂 Struktur Proyek

```
starter/
├── index.html      # Halaman utama
├── style.css       # Styling (dark theme)
├── script.js       # Logika & API integration
└── README.md       # Dokumentasi
```

## 🎨 Use Case

**Coding Mentor** — Chatbot yang membantu:
- Menjelaskan konsep programming dengan bahasa yang mudah dipahami
- Memberikan contoh kode lengkap dan bisa langsung dijalankan
- Membantu debugging dan mencari solusi error
- Memberikan tips dan best practices dalam coding

## ⚙️ Parameter Kreatif

| Parameter | Deskripsi |
|-----------|-----------|
| Gaya bahasa | Santai & Friendly (menggunakan emoji, bahasa gaul) |
| Domain | Programming & Software Development |
| Level penjelasan | Pemula / Menengah / Lanjutan (bisa dipilih) |
| Bahasa kode | JavaScript, Python, Java, TypeScript, Go, Rust (bisa dipilih) |
| Memory | Percakapan tersimpan dalam sesi (conversation history) |

## 📝 Catatan

- API Key disimpan di **localStorage** browser (tidak dikirim ke server manapun)
- Percakapan akan hilang saat halaman di-refresh
- Respons AI menggunakan Gemini 2.0 Flash dengan parameter:
  - Temperature: 0.7
  - Top-P: 0.9
  - Top-K: 40
  - Max Output Tokens: 8192

## 📄 Lisensi

Proyek ini dibuat untuk keperluan tugas akhir.

# Nova AI — apna ChatGPT jaisa AI app

Ek ChatGPT jaisa AI assistant: **Android app**, web app, chat server aur **apna khud ka AI model**
(train karne aur chalane ka poora system). Kisi bahar ki AI company par nirbhar nahi.

```
Nova-ai-/
  app/          Expo SDK 57 app (Android, iOS, Web)
  server/       Node.js chat server (app aur model ke beech)
  model/        Apna AI model: train.py (sikhana) + serve.py (chalana)
  TRAINING.md   Model banane ki poori guide
```

```
 Phone app  ──►  server/ (Node, :8787)  ──►  model/serve.py (aapka model, :8000)
```

## Features

- 💬 ChatGPT jaisa design — gol header buttons, pill wala input box, side menu (drawer) me chats
  aur search, settings page jisme avatar, cards aur "Search settings"
- 🌗 Light / Dark / System theme aur accent color (Purple, Blue, Green, Orange, Black)
- 🗣️ **Voice mode** — kaala "Voice" button dabaiye, boliye; sawal apne aap jaata hai aur jawab
  bolkar sunaya jaata hai (mic icon sirf text likhwata hai)
- 📋 Har jawab ke neeche copy aur speaker button; jawab word-by-word, **Stop** button
- 📷 **Photo bhejkar sawal** — camera ya gallery se (photo samajhne ke liye vision model chahiye)
- 🎨 **Photo editor** — ghumana, palatna (mirror/ulta), crop (1:1, 4:5, 16:9), chhota karna,
  undo, gallery me save, aur edit ki hui photo par AI se sawal
- 🎤 **Bolkar sawal** — Hindi/Hinglish ya English me boliye, text apne aap likh jaata hai
- 🔊 **Jawab suniye** — har jawab ke neeche speaker button
- 🗂️ Kai chats, phone me save; Settings me server URL, token, custom instructions, voice bhasha
- 🧠 **Apna model** — open-source model ko apne data par train karke chalayein (TRAINING.md)

## Jaldi shuru karein

Node.js 22+ chahiye.

**1. Server**

```bash
cd server
cp .env.example .env
npm start                  # http://localhost:8787 — default demo model
```

**2. App (development)**

```bash
cd app
npm install
npx expo start             # w = browser me kholo
```

> Voice wala feature **Expo Go me nahi chalta** (uske liye native module chahiye) — APK ya
> web me chalta hai. Baaki sab Expo Go me bhi chalta hai.

**3. Apna AI model** — [TRAINING.md](TRAINING.md) dekhiye. Short me:

```bash
cd model && pip install -r requirements.txt
python train.py                       # GPU ya Google Colab par
python serve.py --adapter out/nova-lora
# server/.env me:  PROVIDER=nova
```

## Android APK banana

**Tareeka A — apne computer par** (Android SDK + Java 17/21 chahiye):

```bash
cd app
npm install
npm run build:apk
# APK: app/android/app/build/outputs/apk/release/app-release.apk
```

**Tareeka B — Expo ke cloud par (EAS)**, computer par Android SDK nahi chahiye:

```bash
cd app
npx eas-cli login
npx eas-cli build -p android --profile preview      # APK ka download link milega
```

> Abhi release APK Android ke **debug key** se sign hota hai — doston me baantne aur test ke
> liye theek hai. **Play Store** par daalne se pehle apni release key banayein (EAS ye apne aap
> kar deta hai).

### Phone ko server se jodna

Phone `localhost` tak nahi pahunch sakta. App ki **Settings → Server URL** me:

- Same WiFi par: computer ka IP, jaise `http://192.168.1.5:8787`
- Internet par: jahan server deploy kiya ho (Render, Railway, VPS…) — tab `.env` me
  `API_TOKEN` zaroor set karein aur wahi token app ki Settings me daalein.

## Internet wala server (Vercel)

Chat server Vercel par chal raha hai: **https://nova-ai-server.vercel.app** (project
`nova-ai-server`). App isi ko default use karta hai, isliye phone par kuch set nahi karna.

- Abhi `PROVIDER=mock` hai, yani demo jawab aate hain. Vercel par GPU nahi hota, isliye AI
  model wahan nahi chal sakta.
- Apna model kahin aur chalaiye (Colab ya GPU server, dekhiye TRAINING.md), phir Vercel
  dashboard → Project → Settings → Environment Variables me `PROVIDER=nova` aur
  `NOVA_MODEL_URL=https://<model-ka-link>/v1` daal kar redeploy kijiye. App me kuch nahi badalna.
- Model judte hi `API_TOKEN` bhi set kijiye, taaki koi aur aapka server free me na chala sake.
- `server/api/*.js` aur `server/vercel.json` Vercel ke liye hain; local par `npm start` pehle
  jaisa chalta hai. `SAVE_CHATS` Vercel par kaam nahi karta (wahan files save nahi hoti).

## Server settings (`server/.env`)

| Setting | Kaam |
|---|---|
| `PROVIDER=mock` | Demo (koi model nahi) |
| `PROVIDER=nova` | **Aapka apna model** (`model/serve.py`), `NOVA_MODEL_URL` par |
| `PROVIDER=openai` | Koi bhi OpenAI-compatible API (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `MODEL`) |
| `API_TOKEN` | App se token maangna (internet par zaroori) |
| `SAVE_CHATS=1` | Chats ko training data ke roop me save karna |
| `SYSTEM_PROMPT` | AI ka default andaaz |

### Server API

- `GET /api/health` → `{ ok, provider, model }`
- `POST /api/chat` body `{ messages: [{ role, content, images? }], systemPrompt? }`
  - `images`: user message ke saath max 4 photos, base64 data URL ke roop me
  - Jawab Server-Sent Events me: `{"type":"delta","text":"..."}`, phir `{"type":"done"}`
    (ya `{"type":"error","message":"..."}`)

## Tests

```bash
cd server && npm test          # server tests
cd app && npm run typecheck    # app TypeScript check
```

## Abhi kya baaki hai

- Login / account system (baad me)
- Photo par AI se editing (jaise background hatana) — iske liye image-generation model chahiye
- `train.py` abhi sirf text sikhata hai; vision model bina training ke chalta hai

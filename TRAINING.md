# Apna AI model banana — Nova Model

Nova AI kisi bahar ki company (OpenAI wagairah) par nirbhar nahi hai. `model/` folder me
aapka **khud ka model system** hai:

| File | Kaam |
|---|---|
| `model/train.py` | Open-source model ko aapke data par sikhata hai (LoRA fine-tuning) |
| `model/serve.py` | **Nova Model Server** — aapka apna "Ollama". Model ko API ke roop me chalata hai |
| `model/data/nova_identity.jsonl` | Shuruaati data: model ko sikhata hai ki woh "Nova AI" hai |

## Pehle ek sachchi baat

ChatGPT jaisa model **zero se** banana (pre-training) hazaaron GPU aur crore rupaye ka kaam hai.
Duniya ki lagbhag har nayi AI company bhi yahi karti hai: ek **open-source base model**
(Qwen, Llama, Gemma) leti hai aur use **apne data par fine-tune** karke apna model banati hai.
Nova bhi yahi karta hai. Training ke baad model aapka hai — aapke server par chalta hai,
aapke data se seekhta hai, aur kisi ko paisa nahi dena padta.

## Kya chahiye

- Python 3.10+
- Training ke liye **NVIDIA GPU** (8 GB+ VRAM). Ghar par GPU nahi hai to **Google Colab**
  (free T4 GPU) ya Kaggle use karein.
- Chhota model (0.5B) CPU par bhi train ho jaata hai, bas dheere — sirf test ke liye.

```bash
cd model
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 1: Data taiyaar karein

Har line ek chat, is format me:

```json
{"messages": [{"role": "user", "content": "Tum kaun ho?"}, {"role": "assistant", "content": "Main Nova AI hoon..."}]}
```

Data ke teen source:

1. `model/data/nova_identity.jsonl` — pehle se 30 examples (pehchaan, andaaz, suraksha).
2. **Asli chats** — server ki `.env` me `SAVE_CHATS=1` karein. Chats
   `server/data/conversations.jsonl` me isi format me jamaa hoti hain.
   (Users ko batayein aur unki permission lein.)
3. **Khud likhe examples** — jis tarah ke jawab aap chahte hain, waise 200–2000 examples.

**Sabse zaroori:** model utna hi achha banega jitna data achha hoga. Galat ya bekaar jawab
training se pehle hata dein.

## Step 2: Train karein

```bash
# Pehchaan wale data par (GPU par ~5 minute)
python train.py

# Apne saare data par, bada model, aur ek mila hua (merged) model bhi
python train.py --base Qwen/Qwen2.5-3B-Instruct \
  --data data/nova_identity.jsonl ../server/data/conversations.jsonl \
  --epochs 2 --merge
```

| Option | Matlab |
|---|---|
| `--base` | Kaunsa open-source model (default `Qwen/Qwen2.5-1.5B-Instruct`, Hindi ke liye achha) |
| `--data` | Ek ya zyada JSONL files |
| `--epochs` | Data ko kitni baar padhe (2–3 theek hai; zyada se model ratta maarne lagta hai) |
| `--out` | Kahan save ho (default `out/nova-lora`) |
| `--merge` | `out/nova-lora-merged` me poora model bhi bana de (vLLM / llama.cpp ke liye) |
| `--max-steps 20` | Bas jaldi se test karne ke liye |

Model **sirf assistant ke jawabon** se seekhta hai, user ke sawal ratta nahi karta.

### Google Colab par

1. colab.research.google.com → New notebook → Runtime → Change runtime type → **T4 GPU**
2. Cells:
   ```bash
   !git clone https://github.com/mangalkumar71643-creator/Nova-ai-.git
   %cd Nova-ai-/model
   !pip install -r requirements.txt
   !python train.py --epochs 3
   !zip -r nova-lora.zip out/nova-lora
   ```
3. `nova-lora.zip` download karke apne server par `model/out/` me unzip karein.

## Step 3: Apna model chalayein (Nova Model Server)

```bash
python serve.py --model Qwen/Qwen2.5-1.5B-Instruct --adapter out/nova-lora
# ya merged model:  python serve.py --model out/nova-lora-merged
```

Yeh `http://localhost:8000/v1` par OpenAI jaisi API chalata hai. Jawab word-by-word stream
hote hain. GPU ho to GPU, Mac par MPS, warna CPU apne aap chunta hai.

## Step 4: App se jodein

`server/.env`:

```
PROVIDER=nova
NOVA_MODEL_URL=http://localhost:8000/v1
```

Server restart karein. App ab **aapke model** se baat karega. App me kuch nahi badalna.

## Photo samajhne wala model

Photo ke sawal ke liye **vision model** chahiye. `serve.py` use apne aap pehchaan leta hai:

```bash
python serve.py --model Qwen/Qwen2.5-VL-3B-Instruct     # GPU par
python serve.py --model HuggingFaceTB/SmolVLM-256M-Instruct   # bahut chhota, CPU par bhi
```

Text model ko photo bhejne par saaf error aata hai: "Yeh model photo nahi dekh sakta".
`train.py` abhi sirf text sikhata hai; vision model ko bina training ke use karein.

## Kaunsa base model chunein

| Model | Size | Kab |
|---|---|---|
| `Qwen/Qwen2.5-0.5B-Instruct` | 0.5B | Test, CPU |
| `Qwen/Qwen2.5-1.5B-Instruct` | 1.5B | **Shuruaat ke liye best** (T4 GPU) |
| `Qwen/Qwen2.5-3B-Instruct` | 3B | Behtar jawab, 16 GB GPU |
| `Qwen/Qwen2.5-7B-Instruct` | 7B | Kaafi achha, 24 GB+ GPU |
| `Qwen/Qwen2.5-VL-3B-Instruct` | 3B | Photo + text |

Har model ka license Hugging Face page par padh lein (commercial use ke liye).

## Production ke liye

`serve.py` seekhne aur shuruaat ke liye bana hai — ek waqt me ek jawab deta hai. Bahut saare
users ke liye `--merge` wala model **vLLM** se chalayein (wahi API, kai guna tez):

```bash
vllm serve out/nova-lora-merged --served-model-name nova --port 8000
```

"""Nova Model Server — apna khud ka "Ollama".

Kisi bhi Hugging Face model (ya train.py se bana aapka fine-tuned model) ko
OpenAI-compatible API ke roop me chalata hai, taaki Nova AI server use
PROVIDER=nova se seedha use kar sake.

    python serve.py --model Qwen/Qwen2.5-1.5B-Instruct                 # text
    python serve.py --model Qwen/Qwen2.5-1.5B-Instruct --adapter out/nova-lora
    python serve.py --model Qwen/Qwen2.5-VL-3B-Instruct                # photo bhi samjhe

Endpoints: GET /v1/models, POST /v1/chat/completions (stream ya non-stream).
"""

import argparse
import base64
import binascii
import io
import json
import threading
import time
import uuid

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image
from transformers import (
    AutoModelForCausalLM,
    AutoModelForImageTextToText,
    AutoProcessor,
    AutoTokenizer,
    StoppingCriteria,
    StoppingCriteriaList,
    TextIteratorStreamer,
)

MAX_NEW_TOKENS = 1024


class StopOnEvent(StoppingCriteria):
    """Stops generation when the client goes away, so the next request isn't blocked."""

    def __init__(self, event: threading.Event):
        self.event = event

    def __call__(self, input_ids, scores, **kwargs):
        return self.event.is_set()


class NovaModel:
    def __init__(self, path: str, adapter: str | None, name: str):
        self.name = name
        if torch.cuda.is_available():
            self.device, dtype = "cuda", torch.bfloat16
        elif torch.backends.mps.is_available():
            self.device, dtype = "mps", torch.float16
        else:
            self.device, dtype = "cpu", torch.float32

        processor = AutoProcessor.from_pretrained(path)
        # Vision-language models come with an image processor; plain LLMs don't.
        self.vision = getattr(processor, "image_processor", None) is not None
        if self.vision:
            self.processor = processor
            self.tokenizer = processor.tokenizer
            self.model = AutoModelForImageTextToText.from_pretrained(path, dtype=dtype)
        else:
            self.processor = self.tokenizer = AutoTokenizer.from_pretrained(path)
            self.model = AutoModelForCausalLM.from_pretrained(path, dtype=dtype)

        if adapter:
            from peft import PeftModel

            self.model = PeftModel.from_pretrained(self.model, adapter)
        self.model.to(self.device).eval()
        # One generation at a time: a single GPU/CPU can't do more efficiently anyway.
        self.lock = threading.Lock()

    def build_inputs(self, messages: list[dict]):
        chat, images = [], []
        for message in messages:
            content = message.get("content") or ""
            if isinstance(content, str):
                parts = [{"type": "text", "text": content}]
            else:
                parts = []
                for part in content:
                    if part.get("type") == "text":
                        parts.append({"type": "text", "text": part.get("text", "")})
                    elif part.get("type") == "image_url":
                        images.append(decode_image(part.get("image_url", {}).get("url", "")))
                        parts.append({"type": "image"})
            if not self.vision:
                # Text models expect plain string content in their chat template.
                if any(p["type"] == "image" for p in parts):
                    raise HTTPException(400, "Yeh model photo nahi dekh sakta. Vision model chalaiye (jaise Qwen2.5-VL).")
                chat.append({"role": message["role"], "content": "\n".join(p["text"] for p in parts)})
            else:
                chat.append({"role": message["role"], "content": parts})

        prompt = self.processor.apply_chat_template(chat, add_generation_prompt=True, tokenize=False)
        if self.vision:
            inputs = self.processor(text=prompt, images=images or None, return_tensors="pt")
        else:
            inputs = self.tokenizer(prompt, return_tensors="pt", add_special_tokens=False)
        return inputs.to(self.device)

    def stream(self, messages: list[dict], temperature: float, top_p: float, max_tokens: int):
        inputs = self.build_inputs(messages)
        stop = threading.Event()
        streamer = TextIteratorStreamer(self.tokenizer, skip_prompt=True, skip_special_tokens=True)
        sampling = {"do_sample": True, "temperature": temperature, "top_p": top_p} if temperature > 0 else {"do_sample": False}
        kwargs = dict(
            **inputs,
            **sampling,
            max_new_tokens=max_tokens,
            streamer=streamer,
            stopping_criteria=StoppingCriteriaList([StopOnEvent(stop)]),
        )

        with self.lock:
            thread = threading.Thread(target=self.model.generate, kwargs=kwargs, daemon=True)
            thread.start()
            try:
                for text in streamer:
                    if text:
                        yield text
            finally:
                stop.set()
                thread.join()


def decode_image(url: str) -> Image.Image:
    # Only inline photos: fetching arbitrary URLs from the server would be a security hole.
    if not url.startswith("data:image/") or ";base64," not in url:
        raise HTTPException(400, "Images must be base64 data URLs")
    try:
        data = base64.b64decode(url.split(";base64,", 1)[1], validate=True)
        return Image.open(io.BytesIO(data)).convert("RGB")
    except (binascii.Error, OSError) as err:
        raise HTTPException(400, f"Invalid image: {err}") from err


def create_app(nova: NovaModel) -> FastAPI:
    app = FastAPI(title="Nova Model Server")

    @app.get("/v1/models")
    def models():
        return {"object": "list", "data": [{"id": nova.name, "object": "model", "owned_by": "nova-ai"}]}

    @app.post("/v1/chat/completions")
    def chat(body: dict):
        messages = body.get("messages")
        if not isinstance(messages, list) or not messages:
            raise HTTPException(400, '"messages" must be a non-empty list')
        temperature = float(body.get("temperature", 0.7))
        top_p = float(body.get("top_p", 0.9))
        max_tokens = min(int(body.get("max_tokens") or MAX_NEW_TOKENS), 4096)
        completion_id = f"chatcmpl-{uuid.uuid4().hex}"
        created = int(time.time())
        # Build inputs before streaming starts, so bad requests still get a clean 400.
        nova.build_inputs(messages)
        pieces = nova.stream(messages, temperature, top_p, max_tokens)

        def chunk(delta: dict, finish_reason=None):
            payload = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": nova.name,
                "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
            }
            return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

        if body.get("stream"):

            def events():
                yield chunk({"role": "assistant"})
                for text in pieces:
                    yield chunk({"content": text})
                yield chunk({}, "stop")
                yield "data: [DONE]\n\n"

            return StreamingResponse(events(), media_type="text/event-stream")

        text = "".join(pieces)
        return JSONResponse(
            {
                "id": completion_id,
                "object": "chat.completion",
                "created": created,
                "model": nova.name,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
            }
        )

    return app


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", default="Qwen/Qwen2.5-1.5B-Instruct", help="Hugging Face id ya local folder")
    parser.add_argument("--adapter", help="train.py se bana LoRA folder (optional)")
    parser.add_argument("--name", default="nova", help="API me dikhne wala model naam")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    print(f"Loading {args.model} ...")
    nova = NovaModel(args.model, args.adapter, args.name)
    print(f"Ready on {nova.device} (photos: {'haan' if nova.vision else 'nahi'})")
    uvicorn.run(create_app(nova), host=args.host, port=args.port)


if __name__ == "__main__":
    main()

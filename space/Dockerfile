# Nova AI model server for a free Hugging Face Space (CPU, no GPU, no card).
#
# While the Space builds, this downloads your private Nova model with the
# HF_TOKEN secret, compresses it to GGUF Q4_K_M (~1 GB) and bakes it into the
# image. When the Space runs, llama.cpp serves it with an OpenAI-compatible API
# on port 7860, so a wake-up from sleep only needs to load the model again.

# Step 1: download + compress (runs only while building).
FROM ghcr.io/ggml-org/llama.cpp:full-b12030 AS convert

# Change these if you train a new model or want a different size/quality.
ARG MODEL_REPO=Mangalkumar6494/nova-1.5b
ARG QUANT=Q4_K_M

# train.py saves with transformers v5, which writes extra_special_tokens as a
# list; the converter (transformers v4) wants it as additional_special_tokens.
RUN --mount=type=secret,id=HF_TOKEN,mode=0444,required=false \
    export HF_TOKEN="$(cat /run/secrets/HF_TOKEN 2>/dev/null)" \
    && python3 -c "from huggingface_hub import snapshot_download; snapshot_download('${MODEL_REPO}', local_dir='/model', allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model', '*.jinja'])" \
    && python3 -c "import json; p = '/model/tokenizer_config.json'; c = json.load(open(p)); isinstance(c.get('extra_special_tokens'), list) and c.update(additional_special_tokens=c.pop('extra_special_tokens')); json.dump(c, open(p, 'w'))" \
    && python3 /app/convert_hf_to_gguf.py /model --outtype f16 --outfile /nova-f16.gguf \
    && /app/llama-quantize /nova-f16.gguf /nova.gguf "${QUANT}" \
    && rm -rf /model /nova-f16.gguf

# Step 2: small image that only serves the model.
FROM ghcr.io/ggml-org/llama.cpp:server-b12030

COPY --from=convert /nova.gguf /models/nova.gguf

# Free Spaces have 2 CPU cores. One request at a time keeps each answer fast.
CMD ["--model", "/models/nova.gguf", "--alias", "nova", "--host", "0.0.0.0", "--port", "7860", \
     "--ctx-size", "4096", "--parallel", "1", "--threads", "2", "--jinja"]

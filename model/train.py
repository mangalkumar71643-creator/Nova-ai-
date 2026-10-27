"""Nova ko apne data par sikhayein (LoRA fine-tuning).

Ek open-source chat model lekar use aapki chats/examples par train karta hai.
Data JSONL me ho, har line ek chat:

    {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

Yahi format Nova AI server SAVE_CHATS=1 par data/conversations.jsonl me likhta hai.

    python train.py                                         # identity data par
    python train.py --data data/nova_identity.jsonl ../server/data/conversations.jsonl
    python train.py --base Qwen/Qwen2.5-3B-Instruct --epochs 2 --merge

Model sirf assistant ke jawabon se seekhta hai (user ke sawal yaad nahi karta).
"""

import argparse
import json
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments

DEFAULT_SYSTEM = (
    "You are Nova AI, a helpful, friendly assistant. "
    "Reply in the same language the user writes in (Hindi, Hinglish or English)."
)


def load_chats(paths: list[str], system_prompt: str) -> list[list[dict]]:
    chats = []
    for path in paths:
        for line_no, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            messages = json.loads(line)["messages"]
            text_only = []
            for m in messages:
                content = m["content"]
                if not isinstance(content, str):
                    # Saved chats may include photos; this script trains on the text part only.
                    content = "\n".join(p["text"] for p in content if p.get("type") == "text")
                text_only.append({"role": m["role"], "content": content})
            if not any(m["role"] == "assistant" for m in text_only):
                print(f"skip {path}:{line_no} (no assistant reply)")
                continue
            if text_only[0]["role"] != "system":
                text_only.insert(0, {"role": "system", "content": system_prompt})
            chats.append(text_only)
    return chats


def encode(tokenizer, messages: list[dict], max_len: int):
    """Tokenizes a chat; labels are -100 everywhere except the assistant replies."""

    def length(msgs, generation_prompt=False):
        text = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=generation_prompt)
        return len(tokenizer(text, add_special_tokens=False)["input_ids"])

    full_text = tokenizer.apply_chat_template(messages, tokenize=False)
    input_ids = tokenizer(full_text, add_special_tokens=False)["input_ids"]
    labels = [-100] * len(input_ids)
    for i, message in enumerate(messages):
        if message["role"] != "assistant":
            continue
        start = length(messages[:i], generation_prompt=True)
        end = length(messages[: i + 1])
        labels[start:end] = input_ids[start:end]

    input_ids, labels = input_ids[:max_len], labels[:max_len]
    if all(label == -100 for label in labels):
        return None
    return {"input_ids": input_ids, "labels": labels}


def collate(pad_id: int):
    def fn(batch):
        width = max(len(item["input_ids"]) for item in batch)
        pad = lambda seq, value: seq + [value] * (width - len(seq))
        return {
            "input_ids": torch.tensor([pad(b["input_ids"], pad_id) for b in batch]),
            "labels": torch.tensor([pad(b["labels"], -100) for b in batch]),
            "attention_mask": torch.tensor([pad([1] * len(b["input_ids"]), 0) for b in batch]),
        }

    return fn


def main():
    here = Path(__file__).parent
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="Qwen/Qwen2.5-1.5B-Instruct", help="base model (Hugging Face id)")
    parser.add_argument("--data", nargs="+", default=[str(here / "data" / "nova_identity.jsonl")])
    parser.add_argument("--out", default=str(here / "out" / "nova-lora"))
    parser.add_argument("--system", default=DEFAULT_SYSTEM, help="system prompt for chats that have none")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--max-steps", type=int, default=-1, help="quick test ke liye steps limit")
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--batch", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--max-len", type=int, default=2048)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--merge", action="store_true", help="LoRA ko base me milakar poora model bhi save karo")
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.base)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    chats = load_chats(args.data, args.system)
    dataset = [example for chat in chats if (example := encode(tokenizer, chat, args.max_len))]
    print(f"{len(dataset)} chats ready for training")
    if not dataset:
        raise SystemExit("Koi training data nahi mila.")

    use_bf16 = torch.cuda.is_available() and torch.cuda.is_bf16_supported()
    model = AutoModelForCausalLM.from_pretrained(args.base, dtype=torch.bfloat16 if use_bf16 else torch.float32)
    model = get_peft_model(
        model,
        LoraConfig(
            r=args.lora_r,
            lora_alpha=args.lora_r * 2,
            lora_dropout=0.05,
            target_modules="all-linear",
            task_type="CAUSAL_LM",
        ),
    )
    model.print_trainable_parameters()

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=args.out,
            per_device_train_batch_size=args.batch,
            gradient_accumulation_steps=args.grad_accum,
            num_train_epochs=args.epochs,
            max_steps=args.max_steps,
            learning_rate=args.lr,
            lr_scheduler_type="cosine",
            warmup_steps=0.05,  # a float below 1 means a ratio of all steps
            logging_steps=1,
            save_strategy="no",
            report_to=[],
            bf16=use_bf16,
            remove_unused_columns=False,
        ),
        train_dataset=dataset,
        data_collator=collate(tokenizer.pad_token_id),
    )
    trainer.train()

    model.save_pretrained(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"LoRA adapter saved to {args.out}")

    if args.merge:
        merged_dir = f"{args.out}-merged"
        model.merge_and_unload().save_pretrained(merged_dir)
        tokenizer.save_pretrained(merged_dir)
        print(f"Merged model saved to {merged_dir} (vLLM / llama.cpp ke liye)")


if __name__ == "__main__":
    main()

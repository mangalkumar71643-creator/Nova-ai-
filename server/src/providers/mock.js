// Demo model so the whole app works before you have a real/trained model.
// It does not understand anything; it only proves streaming end to end.

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('aborted'));
    });
  });

// Message content is a string, or an array of text/image parts when photos are attached.
function textOf(content) {
  return typeof content === 'string' ? content : content.find((p) => p.type === 'text')?.text ?? '';
}

function buildReply(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const question = textOf(lastUser?.content ?? '').trim();
  const photos = Array.isArray(lastUser?.content)
    ? lastUser.content.filter((p) => p.type === 'image_url').length
    : 0;
  const turns = messages.filter((m) => m.role === 'user').length;

  return [
    `Namaste! Main **Nova AI** hoon — abhi demo mode me chal raha hoon.`,
    '',
    `Aapne likha: "${question.length > 200 ? `${question.slice(0, 200)}…` : question}"`,
    '',
    ...(photos
      ? [`Aapne ${photos} photo bheji hai. Photo samajhne ke liye vision model chahiye (jaise Qwen2.5-VL) — TRAINING.md dekhiye.`, '']
      : []),
    `Is chat me yeh aapka message number ${turns} hai. Asli jawab ke liye apna model chalaiye ` +
      '(`model/serve.py`) aur server ki `.env` file me yeh likhiye:',
    '',
    '```bash',
    'PROVIDER=nova',
    'NOVA_MODEL_URL=http://localhost:8000/v1',
    '```',
  ].join('\n');
}

export async function* streamMock({ messages, signal }) {
  const reply = buildReply(messages);
  // Split on whitespace but keep it, so markdown/newlines survive.
  for (const piece of reply.match(/\S+\s*|\s+/g) ?? []) {
    await sleep(25, signal);
    yield piece;
  }
}

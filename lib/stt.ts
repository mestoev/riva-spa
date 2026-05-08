// Speech-to-text via Groq's Whisper-large-v3 endpoint.
// OpenAI-compatible API → POST /audio/transcriptions with multipart form data.
const GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export type TranscriptionResult = {
  text: string;
  durationSec?: number;
};

/**
 * Transcribe an audio Buffer (typically OGG/Opus from Telegram voice messages).
 * Returns null if API key is missing or request fails — caller should
 * fall back to telling the user "не смогли распознать аудио".
 */
export async function transcribeAudio(
  audio: ArrayBuffer | Uint8Array,
  options: { language?: string; mime?: string; filename?: string } = {},
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[stt] GROQ_API_KEY not set");
    return null;
  }

  // Cast: ArrayBuffer / Uint8Array satisfy BlobPart at runtime; modern TS DOM
  // typings are picky about Uint8Array<ArrayBufferLike> vs <ArrayBuffer>.
  const blob = new Blob([audio as BlobPart], { type: options.mime ?? "audio/ogg" });
  const fd = new FormData();
  fd.append("file", blob, options.filename ?? "voice.ogg");
  fd.append("model", "whisper-large-v3");
  if (options.language) fd.append("language", options.language);
  fd.append("response_format", "json");

  try {
    const res = await fetch(GROQ_STT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[stt] Groq ${res.status}: ${errBody.slice(0, 500)}`);
      return null;
    }
    const json = (await res.json()) as { text?: string; duration?: number };
    if (!json.text) return null;
    return { text: json.text.trim(), durationSec: json.duration };
  } catch (err) {
    console.error("[stt] request failed:", err);
    return null;
  }
}

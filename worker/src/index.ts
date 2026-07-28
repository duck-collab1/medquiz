import Anthropic from "@anthropic-ai/sdk";
import { Auth, type EmulatorEnv, type KeyStorer } from "firebase-auth-cloudflare-workers";

export interface Env extends EmulatorEnv {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  ANTHROPIC_API_KEY: string;
}

const SYSTEM_PROMPT = `Bạn là trợ lý AI hỗ trợ ôn thi bác sĩ nội trú tại Việt Nam, tập trung vào các môn Nội, Ngoại, Sản, Nhi.
Trả lời bằng tiếng Việt, ngắn gọn, chính xác, có cấu trúc rõ ràng bằng Markdown chuẩn:
tiêu đề dùng "#"/"##", liệt kê dùng "-", chữ quan trọng dùng **in đậm**.
Khi cần so sánh nhiều mục (ví dụ phân biệt các bệnh, thuốc, tiêu chuẩn chẩn đoán), hãy trình bày bằng bảng Markdown (dùng | để phân cột), không liệt kê rời rạc bằng dấu gạch ngang.
Khi không chắc chắn về một thông tin y khoa, hãy nói rõ điều đó và khuyên người dùng đối chiếu sách giáo khoa/phác đồ chính thống thay vì suy đoán.
Đây là công cụ hỗ trợ học tập, không thay thế tư vấn hoặc quyết định y khoa chuyên môn.`;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

// In-memory cache for Google's public JWKs used to verify Firebase ID tokens.
// Scoped to the Worker isolate — avoids requiring a Cloudflare KV namespace.
class MemoryKeyStore implements KeyStorer {
  private cached: unknown = null;
  private expiresAt = 0;

  async get<T = unknown>(): Promise<T | null> {
    if (Date.now() > this.expiresAt) return null;
    return this.cached as T | null;
  }

  async put(value: string, expirationTtl: number): Promise<void> {
    this.cached = JSON.parse(value);
    this.expiresAt = Date.now() + expirationTtl * 1000;
  }
}

const keyStore = new MemoryKeyStore();

function corsHeaders(origin: string | null, allowedOrigins: string[]): HeadersInit {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// Lọc bỏ các phần tử hỏng/rỗng thay vì từ chối cả mảng — 1 tin nhắn cũ lỗi định dạng
// (ví dụ sót lại từ dữ liệu lịch sử) không nên làm hỏng cả request hiện tại.
function sanitizeMessages(value: unknown): ChatMessageInput[] | null {
  if (!Array.isArray(value)) return null;

  const cleaned = value
    .filter(
      (m): m is ChatMessageInput =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_MESSAGE_LENGTH ? m.content.slice(0, MAX_MESSAGE_LENGTH) : m.content,
    }))
    .slice(-MAX_MESSAGES);

  return cleaned.length > 0 ? cleaned : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Chỉ hỗ trợ phương thức POST." }, 405, headers);
    }

    const authorization = request.headers.get("Authorization");
    const idToken = authorization?.replace(/^Bearer\s+/i, "");
    if (!idToken) {
      return jsonResponse({ error: "Thiếu token xác thực." }, 401, headers);
    }

    try {
      const auth = Auth.getOrInitialize(env.FIREBASE_PROJECT_ID, keyStore);
      await auth.verifyIdToken(idToken);
    } catch {
      return jsonResponse({ error: "Token xác thực không hợp lệ." }, 401, headers);
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse({ error: "Body request không phải JSON hợp lệ." }, 400, headers);
    }

    const rawMessages = (requestBody as { messages?: unknown } | null)?.messages;
    const messages = sanitizeMessages(rawMessages);
    if (!messages) {
      return jsonResponse(
        { error: "Trường 'messages' không hợp lệ (rỗng, quá dài, hoặc sai định dạng)." },
        400,
        headers,
      );
    }

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let stream: ReturnType<typeof anthropic.messages.stream>;
    try {
      stream = anthropic.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
    } catch (err) {
      console.error("Anthropic API error:", err);
      return jsonResponse({ error: "Không gọi được AI, thử lại sau." }, 502, headers);
    }

    const encoder = new TextEncoder();
    const responseBody = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          console.error("Anthropic stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseBody, {
      status: 200,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};

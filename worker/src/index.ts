import Anthropic from "@anthropic-ai/sdk";
import { Auth, type EmulatorEnv, type KeyStorer } from "firebase-auth-cloudflare-workers";
import { sendDailyReminder } from "./push";
import { getDayPlan, COMPLETED_TOPICS } from "../../src/config/studySchedule";
import { getTodayQuote } from "../../src/data/quotes";

export interface Env extends EmulatorEnv {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  ANTHROPIC_API_KEY: string;
  // JSON service account (Project settings > Service accounts > Generate new private key),
  // set bằng: npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
}

// Cron của Cloudflare Workers chạy theo UTC, không có khái niệm "giờ địa
// phương" - cộng 7h trước khi đưa vào getDayPlan()/getTodayQuote() (vốn viết
// cho frontend, dùng getFullYear/getMonth/getDate kiểu local) để ra đúng
// ngày theo lịch Việt Nam thay vì lịch UTC.
function vnNow(): Date {
  return new Date(Date.now() + 7 * 3600 * 1000);
}

function scheduleBody(): string {
  const plan = getDayPlan(vnNow());
  if (!plan) return "Đã hết lộ trình ôn tập, chúc bạn thi tốt!";
  if (plan.kind === "recall") {
    const title = plan.block ? plan.block.title : COMPLETED_TOPICS.join(", ");
    return `🎤 Reactive Recall - trình bày lại & tự chất vấn: ${title}`;
  }
  if (plan.kind === "review") {
    return `📝 Ôn tập lại cả tuần + luyện đề: ${plan.block.title}`;
  }
  const base = plan.base.map((i) => i.label).join(", ");
  const clinical = plan.clinical.map((i) => i.label).join(", ");
  return `📖 ${plan.block.title}. Chiều: ${base}. Tối: ${clinical}.`;
}

function afternoonBody(): string {
  const plan = getDayPlan(vnNow());
  if (!plan) return "Đã hết lộ trình ôn tập, chúc bạn thi tốt!";
  if (plan.kind === "weekday") return plan.base.map((i) => i.label).join(", ");
  if (plan.kind === "review") return `Ôn tập lại cả tuần + luyện đề: ${plan.block.title}`;
  const title = plan.block ? plan.block.title : COMPLETED_TOPICS.join(", ");
  return `Reactive Recall: ${title}`;
}

function eveningBody(): string {
  const plan = getDayPlan(vnNow());
  if (!plan) return "Đã hết lộ trình ôn tập, chúc bạn thi tốt!";
  if (plan.kind === "weekday") return plan.clinical.map((i) => i.label).join(", ");
  if (plan.kind === "review") return "Chữa đề, tổng kết % đúng, note chủ đề cần ôn lại sớm.";
  return "Tổng kết buổi Reactive Recall: bài nào vững, bài nào cần ôn lại.";
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

// Anthropic API bắt buộc messages phải xen kẽ user/assistant và bắt đầu bằng
// user - nếu 2 tin nhắn liên tiếp cùng role (vd. lịch sử cũ bị lưu trùng do 1
// bug gửi trùng đã xảy ra trước đây) thì toàn bộ request bị từ chối, và vì
// lịch sử trùng đó nằm luôn trong Firestore nên MỌI câu hỏi sau đó trong
// đoạn chat sẽ lỗi vĩnh viễn cho tới khi được dọn - gộp các tin liên tiếp
// cùng role lại thay vì để nguyên, để tự phục hồi được từ dữ liệu cũ hỏng.
function mergeConsecutiveSameRole(messages: ChatMessageInput[]): ChatMessageInput[] {
  const merged: ChatMessageInput[] = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

function trimToStartWithUser(messages: ChatMessageInput[]): ChatMessageInput[] {
  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  return firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);
}

// Lọc bỏ các phần tử hỏng/rỗng thay vì từ chối cả mảng — 1 tin nhắn cũ lỗi định dạng
// (ví dụ sót lại từ dữ liệu lịch sử) không nên làm hỏng cả request hiện tại.
function sanitizeMessages(value: unknown): ChatMessageInput[] | null {
  if (!Array.isArray(value)) return null;

  const filtered = value
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
    }));

  const cleaned = trimToStartWithUser(mergeConsecutiveSameRole(filtered).slice(-MAX_MESSAGES));

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
        let sentAny = false;
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              sentAny = true;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          console.error("Anthropic stream error:", err);
          // Lỗi giữa chừng (vd. rate limit) trước đó bị nuốt im lặng, phía
          // client chỉ thấy stream rỗng và báo "Không nhận được phản hồi từ
          // AI" - không rõ lý do. Gửi kèm 1 dòng lỗi để người dùng biết cần
          // thử lại, thay vì im lặng đóng kết nối.
          if (!sentAny) {
            controller.enqueue(
              encoder.encode("⚠️ AI đang quá tải hoặc gặp lỗi tạm thời, vui lòng thử lại sau vài giây."),
            );
          }
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

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return;

    let title: string;
    let body: string;
    switch (event.cron) {
      case "0 23 * * *": // 6:00 sáng giờ VN - lịch học hôm nay
        title = "📖 Lịch học hôm nay";
        body = scheduleBody();
        break;
      case "0 5 * * *": // 12:00 trưa giờ VN - quote truyền động lực
        title = "💬 Câu quote hôm nay";
        body = getTodayQuote(vnNow());
        break;
      case "0 7 * * *": // 14:00 chiều giờ VN - nhắc giờ học buổi chiều
        title = "⏰ Đến giờ học buổi chiều";
        body = afternoonBody();
        break;
      case "0 12 * * *": // 19:00 tối giờ VN - nhắc giờ học buổi tối
        title = "⏰ Đến giờ học buổi tối";
        body = eveningBody();
        break;
      default:
        return;
    }

    ctx.waitUntil(
      sendDailyReminder(env.FIREBASE_SERVICE_ACCOUNT_JSON, title, body).then(
        (result) => console.log(`Reminder sent (${event.cron}):`, result),
        (err) => console.error(`Reminder failed (${event.cron}):`, err),
      ),
    );
  },
};

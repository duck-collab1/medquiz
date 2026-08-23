import Anthropic from "@anthropic-ai/sdk";
import { Auth, type EmulatorEnv, type KeyStorer } from "firebase-auth-cloudflare-workers";
import { sendDailyReminder } from "./push";

export interface Env extends EmulatorEnv {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  ANTHROPIC_API_KEY: string;
  // JSON service account (Project settings > Service accounts > Generate new private key),
  // set bằng: npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
}

// Giữ đồng bộ thủ công với thứ tự WEEK_BLOCKS trong src/config/studySchedule.ts
// (Worker chạy tách biệt khỏi frontend nên không import chung được).
const WEEK_BLOCK_TITLES = [
  "Nội - Huyết học",
  "Nội - Cơ xương khớp",
  "Nội - Thần kinh + Nội tiết",
  "Nội - Thận - Tiết niệu",
  "Nội - Tim mạch",
  "Nội - Nhiễm + Ung bướu tổng quát",
  "Nội - Cấp cứu tổng hợp",
  "Ngoại - Chấn thương",
  "Ngoại - Cấp cứu chấn thương tổng hợp",
  "Ngoại - Tiêu hóa",
  "Ngoại - Tiết niệu + U bướu",
  "Ngoại - Mạch máu + Chu phẫu",
  "Nhi - Sơ sinh + Tiếp cận trẻ bệnh",
  "Nhi - Hô hấp + Tim + Thần kinh cấp cứu",
  "Nhi - Tiêu hóa + Huyết học + Cấp cứu",
  "Nhi - Nội tiết + Thận + Dự phòng",
  "Sản - Sinh lý thai nghén cơ bản",
  "Sản - Bệnh lý sản khoa + Hậu sản",
  "Sản - Bệnh lý thai kỳ + Sơ sinh",
  "Sản - Phụ khoa + KHHGĐ",
];
const COMPLETED_TOPICS_LABEL = "Tiêu hóa (Nội), Hô hấp (Nội)";
const START_MONDAY = Date.UTC(2026, 7, 24);
const EXAM_DATE = Date.UTC(2027, 7, 11);

// Giữ đồng bộ thủ công với MOTIVATIONAL_QUOTES trong src/data/quotes.ts.
const QUOTES = [
  "Không có con đường tắt nào dẫn đến nơi đáng để đi.",
  "Hôm nay cố thêm 1%, một năm sau bạn sẽ khác đi rất nhiều.",
  "Bác sĩ giỏi không phải người biết hết, mà là người không ngừng học.",
  "Mỗi câu sai hôm nay là một câu bạn sẽ không sai trong phòng thi.",
  "Kiến thức y khoa không thương ai học nhiều hay ít, chỉ thương người kiên trì.",
  "Đừng học để qua kỳ thi, hãy học để không sai khi cầm mạng sống người khác.",
  "Chậm mà chắc còn hơn nhanh mà quên.",
  "Ôn tập là một cuộc chạy marathon, không phải chạy nước rút.",
  "Ngày hôm nay bạn bỏ cuộc là ngày người khác vượt qua bạn.",
  "Kỷ luật bản thân hôm nay, tự do lựa chọn ngày mai.",
  "Không ai giỏi ngay từ đầu, chỉ có người chịu lặp lại đủ nhiều.",
  "Một giờ tập trung hơn cả một ngày học đối phó.",
  "Trí nhớ được rèn bằng sự lặp lại, không phải bằng may mắn.",
  "Bạn không cần hoàn hảo, bạn chỉ cần tiến bộ mỗi ngày.",
  "Nội trú không chọn người thông minh nhất, mà chọn người bền bỉ nhất.",
  "Hãy học như thể ngày mai có bệnh nhân cần đến kiến thức đó.",
  "Cơ thể mệt có thể nghỉ, nhưng đừng để ý chí nghỉ theo.",
  "Sai ở đây, đúng ở phòng thi - đó là lý do ta luyện đề.",
  "Ôn lại một lần nữa, nhớ lâu hơn một chút.",
  "Người xuất sắc không tránh khó, họ chỉ quen với khó hơn người khác.",
  "Ngày hôm nay là bản nháp của phiên bản bác sĩ tương lai của bạn.",
  "Từng chương bạn hoàn thành là một viên gạch cho sự nghiệp sau này.",
  "Không có kỳ thi nào đánh bại được sự chuẩn bị kỹ càng.",
  "Cứ tiến từng bước nhỏ, đích đến sẽ tự đến gần bạn.",
  "Sự tự tin trong phòng thi bắt đầu từ những đêm cặm cụi hôm nay.",
  "Đừng so sánh chương 1 của bạn với chương 20 của người khác.",
  "Học chắc một chương hơn là học lướt mười chương.",
  "Bạn đang xây nền móng cho những năm hành nghề sau này.",
  "Cố gắng không phản bội ai, chỉ là đến muộn với vài người.",
  "Ngủ đủ, ăn đủ, học đều - đó cũng là một dạng kỷ luật y khoa.",
];

function todayTopicLine(): string {
  const now = Date.now();
  const diffDays = Math.floor((now - START_MONDAY) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const dayOfWeek = ((diffDays % 7) + 7) % 7; // 0 = Thứ 2 ... 6 = Chủ nhật
  const cycleIndex = ((weekIndex % WEEK_BLOCK_TITLES.length) + WEEK_BLOCK_TITLES.length) % WEEK_BLOCK_TITLES.length;
  const title = WEEK_BLOCK_TITLES[cycleIndex];

  if (dayOfWeek === 6) {
    if (weekIndex <= 0) return `🎤 Ôn lại: ${COMPLETED_TOPICS_LABEL}`;
    const prevIndex = ((weekIndex - 1) % WEEK_BLOCK_TITLES.length + WEEK_BLOCK_TITLES.length) % WEEK_BLOCK_TITLES.length;
    return `🎤 Ôn lại: ${WEEK_BLOCK_TITLES[prevIndex]}`;
  }
  if (dayOfWeek === 5) return `📝 Ôn tập: ${title}`;
  return `📖 ${title}`;
}

function todayReminderBody(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];
  const daysLeft = Math.round((EXAM_DATE - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  const countdown = daysLeft >= 0 ? `⏳ còn ${daysLeft} ngày đến 11/8/2027` : "🏁 đã tới ngày thi, chúc bạn làm bài thật tốt";
  return `${todayTopicLine()} · ${countdown} · "${quote}"`;
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

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return;
    ctx.waitUntil(
      sendDailyReminder(env.FIREBASE_SERVICE_ACCOUNT_JSON, "🔔 Đến giờ ôn thi rồi!", todayReminderBody()).then(
        (result) => console.log("Daily reminder sent:", result),
        (err) => console.error("Daily reminder failed:", err),
      ),
    );
  },
};

# Ôn thi nội trú — App trắc nghiệm y học

Web app đăng ký/đăng nhập, dashboard theo môn (Nội, Ngoại, Sản, Nhi — dễ thêm môn mới), mỗi môn có **Ghi chú** và **Trắc nghiệm**.

## 1. Cài đặt

```bash
npm install
```

## 2. Tạo project Firebase (bắt buộc — app cần Firebase để chạy)

1. Vào [Firebase Console](https://console.firebase.google.com/) → **Add project** → đặt tên tuỳ ý.
2. Vào **Build → Authentication → Get started** → tab **Sign-in method** → bật **Email/Password**.
3. Vào **Build → Firestore Database → Create database** → chọn chế độ **Production mode**, chọn region gần bạn.
4. Vào **Project settings** (biểu tượng bánh răng) → tab **General** → mục "Your apps" → bấm biểu tượng Web (`</>`) → đặt tên app → copy đoạn `firebaseConfig`.
5. Tạo file `.env` ở thư mục gốc (copy từ `.env.example`) và điền các giá trị từ `firebaseConfig`:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. Vào **Project settings → Service accounts** → bấm **Generate new private key** → tải file JSON về, lưu ở đâu đó ngoài thư mục project (hoặc trong project nhưng đã có trong `.gitignore` sẵn nếu đặt tên chứa `serviceAccountKey`). File này dùng để chạy script import câu hỏi (không dùng trong trình duyệt).

7. **Bắt buộc**: Deploy security rules bằng Firebase CLI (nếu bỏ qua bước này, Firestore sẽ chặn toàn bộ đọc/ghi — Trắc nghiệm và Chat AI đều sẽ báo lỗi "Missing or insufficient permissions"). Project đã có sẵn `firebase.json` và `.firebaserc` nên chỉ cần 2 lệnh:

   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules
   ```

   Lệnh `login` sẽ mở trình duyệt để bạn đăng nhập bằng tài khoản Google sở hữu project Firebase.

## 3. Nạp câu hỏi vào Firestore

Câu hỏi được soạn trong các file CSV ở `data/questions/`. Mỗi môn có thể có **nhiều file** — khuyến khích chia mỗi bài/chuyên đề thành 1 file riêng (vd `noi-tiet-basedow.csv`, `ho-hap-copd.csv`) để dễ tìm và sửa; script import tự động đọc **mọi** file `.csv` trong thư mục này bất kể tên, miễn cột `subject` trong file đúng (`noi`/`ngoai`/`san`/`nhi`). Ví dụ hiện có: môn Nội đã được chia theo 16 bài (5 bài Nội tiết + 11 bài Hô hấp) dựa theo danh mục nội dung thi và sách Bệnh học Nội khoa (ĐH Y Hà Nội).

Đặt đường dẫn tới file service account JSON (bước 6 ở trên) vào biến môi trường, ví dụ thêm vào `.env`:

```
FIREBASE_SERVICE_ACCOUNT_PATH=C:/duong-dan/toi/serviceAccountKey.json
```

Sau đó chạy:

```bash
npm run import:questions
```

Script sẽ upsert từng câu theo `id` — chạy lại nhiều lần không tạo trùng lặp, chỉ cập nhật.

### Định dạng file CSV

```
id,subject,chapter,group,case_stem,question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
```

- `id`: mã duy nhất, tự đặt (vd `noi-copd-006`). Dùng để cập nhật câu hỏi khi sửa lại và import lại.
- `subject`: `noi` / `ngoai` / `san` / `nhi`.
- `group`: tên **chương** (vd "Nội tiết", "Hô hấp"). Nếu môn có ít nhất 1 câu được gán `group`, app tự hiện màn chọn chương → chọn bài thay vì vào thẳng 1 quiz gộp. Để trống nếu môn/bộ câu hỏi chưa cần phân chương (app sẽ dùng giao diện phẳng như cũ).
- `chapter`: tên **bài** trong chương đó (vd "Basedow", "Đái tháo đường") — hiển thị dạng badge trong lúc làm bài, đồng thời là tên thẻ để chọn bài khi đã có `group`.
- `case_stem`: tuỳ chọn — đề bài lâm sàng (bệnh án) dùng chung cho một cụm câu hỏi ca bệnh. Nhiều dòng có thể dùng chung 1 `case_stem` giống hệt nhau; app hiển thị nó tách riêng phía trên câu hỏi, hỗ trợ Markdown (in đậm, bảng). Để trống với câu hỏi thường.
- `option_e`: tuỳ chọn, để trống nếu câu chỉ có 4 đáp án A-D.
- `correct_answer`: một trong `a/b/c/d/e`. **Để trống nếu chưa biết đáp án** — câu đó sẽ được đánh dấu "cần bổ sung đáp án" và tự động bị loại khỏi phần luyện tập trắc nghiệm cho đến khi được điền.
- Nếu nội dung có dấu phẩy, bọc trong dấu ngoặc kép `"..."`.

### Cách thêm câu hỏi mới

1. Mở file CSV của bài tương ứng (hoặc tạo file mới cho bài mới), thêm dòng mới ở cuối — hoặc gửi câu hỏi/tài liệu cho Claude để thêm và điền đáp án giúp.
2. Chạy lại `npm run import:questions`.

### Câu hỏi thiếu đáp án

Nếu có câu để trống `correct_answer`, gửi kèm sách/tài liệu tham khảo cho Claude — Claude sẽ tra cứu và điền trực tiếp vào cột `correct_answer` (và `explanation` nếu cần) trong file CSV, sau đó chạy lại script import.

### Nhập hàng loạt từ file JSON (note/mcqSingle/mcqCase theo bài)

Nếu có file JSON theo định dạng `{chapterId, chapterName, chapterOrder, lessons: [{id, title, order, note?, mcqSingle?, mcqCase?}]}` (ví dụ do AI ngoài soạn sẵn theo từng bài), dùng:

```bash
node scripts/convert-lessons.mjs <file1.json> <file2.json> ...
```

Script tự gộp các file cùng chương/bài, ghi ra CSV trong `data/questions/` và `.md` trong `data/notes/`, đồng thời **tự phát hiện bài đã có sẵn dữ liệu** để không ghi đè (tạo file/id đánh số `-2` thay vì trùng). Kiểm tra lại output rồi chạy `npm run import:questions` như bình thường.

### Nhập hàng loạt từ file PDF trắc nghiệm (định dạng "Câu hỏi | Đáp án & Giải thích")

Nếu có PDF trắc nghiệm theo mẫu 2 cột (dòng đầu file là nhãn bài kiểu `1a. Suy tim.`, mỗi câu có `1. <câu hỏi>`, `A./B./C./D.`, `Đáp án: X`, rồi giải thích), dùng:

```bash
node scripts/convert-pdf-mcq.mjs <chapterId> "<Tên chương>" "<thư mục chứa PDF>"
```

Ví dụ: `node scripts/convert-pdf-mcq.mjs tim-mach "Tim mạch" "E:/tài liệu học tập/mcq/tim mạch"`.

Script đọc từng PDF (giữ nguyên dấu tiếng Việt), tách câu hỏi theo tên bài lấy trực tiếp từ dòng đầu file, và cũng tự phát hiện bài đã tồn tại để không ghi đè như script JSON ở trên. Một số PDF xuất từ OneNote bị lỗi thứ tự dòng ngay tại chỗ ngắt trang (cột "Đáp án & Giải thích" bị chèn trước/giữa cột "Câu hỏi" của trang sau) — script phát hiện và **tự bỏ qua** những câu này (in ra số câu bị bỏ) thay vì đoán sai nội dung; các câu này cần được bổ sung thủ công từ file PDF gốc nếu muốn đầy đủ 100%.

### Nhập hàng loạt từ file PDF "Case lâm sàng" (định dạng "Tình huống & Câu hỏi | Đáp án & Giải thích")

Nếu PDF theo mẫu 1 đề bài (bệnh án) dùng chung cho nhiều câu hỏi con — dòng đầu file là nhãn bài, sau đó là đề bài, `Câu hỏi:`, các câu `1. ... A./B./C./D.`, rồi 1 dòng `Đáp án: 1. A; 2. B; ...` gộp chung và `Giải thích:` cho từng câu — dùng:

```bash
node scripts/convert-pdf-case.mjs <chapterId> "<Tên chương>" "<thư mục chứa PDF case>"
```

Mỗi câu hỏi con được lưu thành 1 dòng CSV riêng, dùng chung giá trị cột `case_stem` (đề bài) — khớp với cách app hiển thị case lâm sàng ở tab riêng. Cũng tự phát hiện bài đã tồn tại và tự bỏ qua các case/câu bị lỗi thứ tự do ngắt trang PDF (bao gồm cả trường hợp đề bài lẫn lộn với phần giải thích) thay vì lưu nội dung sai.

## 4. Ghi chú (Notes)

Ghi chú cấp môn (môn chưa phân chương) lưu trong `data/notes/<mon>/*.md` (vd `data/notes/noi/tim-mach.md`). Ghi chú theo bài (môn đã phân chương) lưu trong `data/notes/<mon>/<chương-slug>/<bài-slug>.md` (vd `data/notes/noi/tieu-hoa/ap-xe-gan.md`) — slug phải khớp với `slugify()` của tên chương/bài trong CSV câu hỏi để app ghép đúng ghi chú vào đúng bài. Chỉ cần thêm file `.md` đúng vị trí — ghi chú tự xuất hiện trong app, không cần chạy script import. Dòng đầu tiên nên là `# Tiêu đề` để hiển thị đẹp trong danh sách.

## 5. Chạy app

```bash
npm run dev
```

Mở địa chỉ hiển thị trong terminal (thường là `http://localhost:5173`), đăng ký tài khoản mới để bắt đầu.

## 6. Thêm môn học mới

Sửa file `src/config/subjects.ts`, thêm 1 entry mới (`id`, `name`, `description`, `icon`), rồi tạo thêm file CSV (`data/questions/<id>.csv`) và thư mục ghi chú (`data/notes/<id>/`) tương ứng.

## 7. AI hỏi đáp (widget chat)

App có widget chat nổi (góc dưới phải) cho phép hỏi đáp AI (Claude, model Sonnet 5), lưu lịch sử theo từng tài khoản. Vì API key của Claude không được để lộ ở trình duyệt, phần này cần một backend nhỏ để giữ key — dùng **Cloudflare Workers** (miễn phí, không cần thẻ thanh toán) thay vì Firebase Cloud Functions (gói miễn phí của Firebase không cho gọi mạng ra ngoài).

### 7.1 Cài đặt Worker

```bash
cd worker
npm install
```

### 7.2 Lấy Anthropic API key

Vào [console.anthropic.com](https://console.anthropic.com/) → tạo API key mới (cần tài khoản Anthropic, có thể cần nạp credit tuỳ chính sách hiện tại).

### 7.3 Cấu hình `worker/wrangler.toml`

Mở `worker/wrangler.toml`, sửa 2 giá trị:

```toml
[vars]
FIREBASE_PROJECT_ID = "..."   # Project ID Firebase của bạn (giống VITE_FIREBASE_PROJECT_ID trong .env)
ALLOWED_ORIGINS = "http://localhost:5173,https://ten-app-cua-ban.web.app"   # domain của app, cách nhau bằng dấu phẩy
```

### 7.4 Đăng nhập Cloudflare và deploy

```bash
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # dán API key lấy ở bước 7.2 khi được hỏi
npx wrangler deploy
```

Sau khi deploy, terminal sẽ in ra URL dạng `https://medquiz-ai-worker.<ten-cua-ban>.workers.dev`. Copy URL này vào `.env` ở thư mục gốc:

```
VITE_CHAT_WORKER_URL=https://medquiz-ai-worker.<ten-cua-ban>.workers.dev
```

Khởi động lại `npm run dev` để app nhận cấu hình mới.

### 7.5 Test cục bộ (tuỳ chọn, trước khi deploy thật)

```bash
cd worker
npm run dev
```

Lệnh này chạy Worker trên máy (thường ở `http://localhost:8787`), có thể tạm trỏ `VITE_CHAT_WORKER_URL` vào đó để test mà không cần deploy.

### Giới hạn chi phí

Worker giới hạn tối đa 20 tin nhắn/lần gọi và 4000 ký tự/tin nhắn để tránh bị lạm dụng gây tốn chi phí API. Client cũng chỉ gửi kèm 10 tin nhắn gần nhất làm ngữ cảnh hội thoại.

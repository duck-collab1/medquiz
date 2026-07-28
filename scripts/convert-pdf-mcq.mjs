// Chuyển các file PDF trắc nghiệm (định dạng "Câu hỏi | Đáp án & Giải thích",
// dòng đầu file là nhãn bài kiểu "1a. Suy tim.") thành CSV trong data/questions/,
// đúng schema mà app + scripts/import-questions.mjs đang dùng.
//
// Cách chạy:
//   node scripts/convert-pdf-mcq.mjs <chapterId> "<Tên chương>" <thư mục chứa PDF>
// Ví dụ:
//   node scripts/convert-pdf-mcq.mjs tim-mach "Tim mạch" "E:/tài liệu học tập/mcq/tim mạch"
//
// Tự phát hiện (group, chapter) đã tồn tại trong data/questions để KHÔNG ghi đè
// (sẽ tạo file/id đánh số batch mới), giống scripts/convert-lessons.mjs.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { PDFParse } from "pdf-parse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const QUESTIONS_DIR = join(REPO, "data", "questions");

const ANSWER_LETTERS = ["a", "b", "c", "d", "e"];
const CSV_HEADER = [
  "id",
  "subject",
  "chapter",
  "group",
  "case_stem",
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "correct_answer",
  "explanation",
];

const [chapterId, chapterName, dirArg] = process.argv.slice(2);
if (!chapterId || !chapterName || !dirArg) {
  console.error(
    'Dùng: node scripts/convert-pdf-mcq.mjs <chapterId> "<Tên chương>" <thư mục chứa PDF>',
  );
  process.exit(1);
}

const pdfDir = resolve(dirArg);
const pdfFiles = readdirSync(pdfDir).filter((f) => extname(f).toLowerCase() === ".pdf");
if (pdfFiles.length === 0) {
  console.error("Không tìm thấy file PDF nào trong", pdfDir);
  process.exit(1);
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadExistingLessons() {
  const existing = new Set();
  if (!existsSync(QUESTIONS_DIR)) return existing;
  for (const file of readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".csv"))) {
    const rows = parse(readFileSync(join(QUESTIONS_DIR, file), "utf8"), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const r of rows) existing.add(`${r.group}::${r.chapter}`);
  }
  return existing;
}

const existingLessons = loadExistingLessons();

const LETTER_ORDER = "abcdefghijklmnopqrstuvwxyz";

function parsePdfText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let i = 0;
  while (i < lines.length && lines[i] === "") i++;
  const labelLine = lines[i++] || "";
  const labelMatch = labelLine.match(/^(\d+[a-z])\.\s*(.+?)\.?\s*$/i);
  const lessonCode = labelMatch ? labelMatch[1].toLowerCase() : null;
  const lessonTitle = labelMatch ? labelMatch[2].trim() : labelLine.trim();

  // Bỏ qua dòng tiêu đề bảng "Câu hỏi   Đáp án & Giải thích" nếu có ngay sau đó.
  if (i < lines.length && /câu\s*hỏi/i.test(lines[i]) && /đáp\s*án/i.test(lines[i])) {
    i++;
  }

  const questions = [];
  const discarded = []; // số câu bị bỏ do lỗi thứ tự "Đáp án" ở chỗ ngắt trang PDF
  let cur = null; // { num, questionLines, options: {A:[],B:[],...}, curOptionLetter, answer, explanationLines, phase }
  let expectedNum = 1;
  let resyncing = false;

  function finalizeCurrent() {
    if (!cur) return;
    const questionText = cur.questionLines.join(" ").replace(/\s+/g, " ").trim();
    const options = {};
    for (const letter of Object.keys(cur.options)) {
      options[letter] = cur.options[letter].join(" ").replace(/\s+/g, " ").trim();
    }
    const explanation = cur.explanationLines.join(" ").replace(/\s+/g, " ").trim();
    questions.push({
      num: cur.num,
      question: questionText,
      options,
      correctLetter: cur.answer,
      explanation,
    });
  }

  // Rác chèn giữa nội dung do PDF xuất từ OneNote khi câu hỏi nằm ngay chỗ
  // ngắt trang: dòng ngày giờ + "OneNote", link onedrive, và "-- n of m --".
  const JUNK_RE = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4},.*OneNote$/i,
    /^https?:\/\/(onedrive|1drv)\.live\.com/i,
    /^--\s*\d+\s*of\s*\d+\s*--$/,
  ];

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === "" || JUNK_RE.some((re) => re.test(line))) continue;

    const qMatch = line.match(/^(?:Câu\s+)?(\d{1,3})\.\s+(\S.*)$/i);
    const optMatch = line.match(/^([A-E])\.\s*(.*)$/);
    const ansMatch = line.match(/^Đáp\s*án\s*:?\s*([A-E])\b/i);

    // Đang ở chế độ "đồng bộ lại": câu trước đó bị bỏ do lỗi thứ tự PDF, ta bỏ
    // qua mọi dòng cho tới khi gặp đúng câu hỏi tiếp theo (theo số thứ tự).
    if (resyncing) {
      if (qMatch && Number(qMatch[1]) === expectedNum) {
        resyncing = false;
        expectedNum++;
        cur = {
          num: Number(qMatch[1]),
          questionLines: [qMatch[2]],
          options: {},
          curOptionLetter: null,
          answer: null,
          explanationLines: [],
          phase: "question",
        };
      }
      continue;
    }

    if (
      qMatch &&
      (!cur || cur.phase === "explanation" || cur.phase === "answer") &&
      Number(qMatch[1]) === expectedNum
    ) {
      finalizeCurrent();
      expectedNum++;
      cur = {
        num: Number(qMatch[1]),
        questionLines: [qMatch[2]],
        options: {},
        curOptionLetter: null,
        answer: null,
        explanationLines: [],
        phase: "question",
      };
      continue;
    }

    if (!cur) continue; // rác trước câu hỏi đầu tiên (không nên xảy ra)

    if (optMatch && cur.phase !== "explanation" && cur.phase !== "answer") {
      cur.phase = "options";
      cur.curOptionLetter = optMatch[1];
      cur.options[optMatch[1]] = [optMatch[2]];
      continue;
    }

    if (ansMatch) {
      if (!cur.options.D) {
        // "Đáp án:" xuất hiện TRƯỚC khi đã thu đủ 4 lựa chọn A-D — dấu hiệu câu
        // hỏi này rơi đúng chỗ ngắt trang PDF (cột "Đáp án & Giải thích" bị xuất
        // trước/xen giữa cột "Câu hỏi" của trang sau). Không thể xác định chắc
        // chắn ranh giới giữa lựa chọn cuối và phần giải thích trong trường hợp
        // này, nên BỎ câu này (cần bổ sung thủ công) thay vì đoán sai, rồi qua
        // chế độ đồng bộ lại để không làm hỏng các câu tiếp theo.
        discarded.push(cur.num);
        cur = null;
        resyncing = true;
        continue;
      }
      cur.answer = ansMatch[1].toLowerCase();
      cur.phase = "answer";
      continue;
    }

    if (cur.phase === "question") {
      cur.questionLines.push(line);
    } else if (cur.phase === "options") {
      if (cur.curOptionLetter) cur.options[cur.curOptionLetter].push(line);
    } else {
      cur.phase = "explanation";
      cur.explanationLines.push(line);
    }
  }
  if (!resyncing) finalizeCurrent();

  return { lessonCode, lessonTitle, questions, discarded };
}

function toRow({ id, subject, chapter, group, question, options, correctLetter, explanation }) {
  return {
    id,
    subject,
    chapter,
    group,
    case_stem: "",
    question,
    option_a: options.A || "",
    option_b: options.B || "",
    option_c: options.C || "",
    option_d: options.D || "",
    option_e: options.E || "",
    correct_answer: correctLetter || "",
    explanation: explanation || "",
  };
}

let totalQuestions = 0;
let totalDiscarded = 0;
const summary = [];

for (const file of pdfFiles.sort()) {
  const filePath = join(pdfDir, file);
  const data = readFileSync(filePath);
  const parser = new PDFParse({ data });
  // eslint-disable-next-line no-await-in-loop
  const result = await parser.getText();
  // eslint-disable-next-line no-await-in-loop
  await parser.destroy();

  const { lessonCode, lessonTitle, questions, discarded } = parsePdfText(result.text);
  if (!lessonTitle || questions.length === 0) {
    console.warn(`CẢNH BÁO: không parse được câu hỏi nào từ "${file}" — kiểm tra thủ công.`);
    continue;
  }

  const badQuestions = questions.filter(
    (q) => !q.question || !q.correctLetter || Object.keys(q.options).length < 4,
  );
  const goodQuestions = questions.filter((q) => !badQuestions.includes(q));
  if (badQuestions.length > 0) {
    console.warn(
      `BỎ QUA: ${file} có ${badQuestions.length}/${questions.length} câu parse lỗi (thiếu đáp án/lựa chọn) — câu số: ${badQuestions.map((q) => q.num).join(", ")}. Cần bổ sung thủ công.`,
    );
  }
  if (discarded.length > 0) {
    console.warn(
      `BỎ QUA: ${file} có ${discarded.length} câu rơi đúng chỗ ngắt trang PDF (không tách được lựa chọn/giải thích) — câu số: ${discarded.join(", ")}. Cần bổ sung thủ công.`,
    );
  }

  const lessonId = slugify(lessonTitle);
  const lessonKey = `${chapterName}::${lessonTitle}`;
  const alreadyExists = existingLessons.has(lessonKey);
  const idPrefix = alreadyExists ? `noi-${lessonId}-n2` : `noi-${lessonId}`;
  const csvFileName = alreadyExists
    ? `${chapterId}-${lessonId}-2.csv`
    : `${chapterId}-${lessonId}.csv`;

  const rows = goodQuestions.map((q, idx) =>
    toRow({
      id: `${idPrefix}-mcq-${String(idx + 1).padStart(3, "0")}`,
      subject: "noi",
      chapter: lessonTitle,
      group: chapterName,
      question: q.question,
      options: q.options,
      correctLetter: q.correctLetter,
      explanation: q.explanation,
    }),
  );

  if (existsSync(join(QUESTIONS_DIR, csvFileName))) {
    console.warn(`CẢNH BÁO: ${csvFileName} đã tồn tại và sẽ bị ghi đè.`);
  }
  writeFileSync(
    join(QUESTIONS_DIR, csvFileName),
    stringify(rows, { header: true, columns: CSV_HEADER }),
    "utf8",
  );

  totalQuestions += rows.length;
  totalDiscarded += discarded.length + badQuestions.length;
  const orderLetter = lessonCode ? lessonCode.replace(/^\d+/, "") : "?";
  const order = orderLetter !== "?" ? LETTER_ORDER.indexOf(orderLetter) + 1 : "?";
  summary.push(
    `${file} -> [${lessonCode || "?"}] "${lessonTitle}" (order=${order}): ${rows.length} câu, bỏ qua=${discarded.length + badQuestions.length} -> ${csvFileName}`,
  );
}

console.log(summary.join("\n"));
console.log("\n=== TOTALS ===");
console.log("Files processed:", pdfFiles.length);
console.log("Skipped (page-break parse artifact):", totalDiscarded);
console.log("Total questions:", totalQuestions);
console.log("\nKiểm tra lại output rồi chạy `npm run import:questions`.");

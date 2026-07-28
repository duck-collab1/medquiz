// Chuyển PDF "case lâm sàng" (định dạng 2 cột "Tình huống & Câu hỏi | Đáp án &
// Giải thích": 1 đề bài (bệnh án) dùng chung, theo sau là "Câu hỏi:" + nhiều câu
// hỏi con A-D, rồi 1 dòng "Đáp án: 1. A; 2. B; ..." gộp chung, rồi "Giải thích:"
// + giải thích từng câu) thành CSV trong data/questions/ với cột case_stem.
//
// Cách chạy:
//   node scripts/convert-pdf-case.mjs <chapterId> "<Tên chương>" <thư mục chứa PDF>
// Ví dụ:
//   node scripts/convert-pdf-case.mjs tim-mach "Tim mạch" "E:/tài liệu học tập/Case lâm sàng/Tim mạch"

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
    'Dùng: node scripts/convert-pdf-case.mjs <chapterId> "<Tên chương>" <thư mục chứa PDF>',
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

// Rác chèn giữa nội dung do PDF xuất từ OneNote ở chỗ ngắt trang.
const JUNK_RE = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4},.*OneNote$/i,
  /^https?:\/\/(onedrive|1drv)\.live\.com/i,
  /^--\s*\d+\s*of\s*\d+\s*--$/,
];

function parsePdfText(text) {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  const lines = rawLines.filter((l) => l !== "" && !JUNK_RE.some((re) => re.test(l)));

  let i = 0;
  const labelLine = lines[i++] || "";
  const labelMatch = labelLine.match(/^(\d+[a-z])\.\s*(.+?)\.?\s*$/i);
  const lessonCode = labelMatch ? labelMatch[1].toLowerCase() : null;
  const lessonTitle = labelMatch ? labelMatch[2].trim() : labelLine.trim();

  if (i < lines.length && /tình\s*huống|câu\s*hỏi/i.test(lines[i]) && /đáp\s*án/i.test(lines[i])) {
    i++;
  }

  const cases = [];
  const discardedCaseCount = { n: 0 };

  function tryParseCase(startIdx) {
    let idx = startIdx;
    const stemLines = [];
    while (idx < lines.length && !/^câu\s*hỏi\s*:?\s*$/i.test(lines[idx])) {
      stemLines.push(lines[idx]);
      idx++;
    }
    if (idx >= lines.length) return null; // hết file, không còn case nào nữa
    idx++; // bỏ qua dòng "Câu hỏi:"

    const stem = stemLines.join(" ").replace(/\s+/g, " ").trim();
    if (!stem) return { fail: true, nextIdx: idx };

    // Thu thập các câu hỏi con 1..K cho tới khi gặp dòng "Đáp án:"
    const subQuestions = []; // { num, questionLines, options: {A:[],...}, curLetter }
    let cur = null;
    let expectedQNum = 1;
    let sawAnswerLine = false;
    let answerBlobLines = [];

    while (idx < lines.length) {
      const line = lines[idx];
      const ansMatch = line.match(/^-?\s*Đáp\s*án\s*:?\s*(.*)$/i);
      if (ansMatch && !sawAnswerLine) {
        sawAnswerLine = true;
        if (ansMatch[1]) answerBlobLines.push(ansMatch[1]);
        idx++;
        continue;
      }
      if (sawAnswerLine) {
        if (/^-?\s*giải\s*thích\s*:?\s*$/i.test(line)) {
          idx++;
          break;
        }
        answerBlobLines.push(line);
        idx++;
        continue;
      }

      const qMatch = line.match(/^(\d{1,2})\.\s+(\S.*)$/);
      const optMatch = line.match(/^([A-E])\.\s*(.*)$/);

      if (qMatch && Number(qMatch[1]) === expectedQNum) {
        if (cur) subQuestions.push(cur);
        cur = { num: Number(qMatch[1]), questionLines: [qMatch[2]], options: {}, curLetter: null };
        expectedQNum++;
        idx++;
        continue;
      }
      if (!cur) return { fail: true, nextIdx: idx }; // rác trước câu hỏi con đầu tiên

      if (optMatch) {
        cur.curLetter = optMatch[1];
        cur.options[optMatch[1]] = [optMatch[2]];
        idx++;
        continue;
      }

      if (cur.curLetter) {
        cur.options[cur.curLetter].push(line);
      } else {
        cur.questionLines.push(line);
      }
      idx++;
    }
    if (cur) subQuestions.push(cur);
    if (!sawAnswerLine || subQuestions.length === 0) return { fail: true, nextIdx: idx };

    const answerBlob = answerBlobLines.join(" ");
    const answerMap = new Map();
    for (const m of answerBlob.matchAll(/(\d{1,2})\.\s*([A-E])\b/gi)) {
      answerMap.set(Number(m[1]), m[2].toLowerCase());
    }
    const K = answerMap.size;
    if (K === 0 || K !== subQuestions.length) {
      return { fail: true, nextIdx: idx };
    }

    // Thu thập đúng K giải thích đánh số 1..K, phần còn lại là đề bài của case tiếp theo.
    const explanations = new Map();
    let explNum = null;
    while (idx < lines.length && explanations.size < K) {
      const line = lines[idx];
      const eMatch = line.match(/^(?:Câu\s+)?(\d{1,2})[.:]\s+(\S.*)$/i);
      if (eMatch && Number(eMatch[1]) === explanations.size + 1) {
        explNum = Number(eMatch[1]);
        explanations.set(explNum, [eMatch[2]]);
        idx++;
        continue;
      }
      if (explNum && explanations.has(explNum)) {
        explanations.get(explNum).push(line);
        idx++;
        continue;
      }
      // Dòng không khớp định dạng giải thích tiếp theo — dữ liệu bất thường.
      return { fail: true, nextIdx: idx };
    }
    if (explanations.size !== K) return { fail: true, nextIdx: idx };

    const questions = subQuestions.map((q) => {
      const options = {};
      for (const letter of Object.keys(q.options)) {
        options[letter] = q.options[letter].join(" ").replace(/\s+/g, " ").trim();
      }
      return {
        num: q.num,
        question: q.questionLines.join(" ").replace(/\s+/g, " ").trim(),
        options,
        correctLetter: answerMap.get(q.num) || null,
        explanation: (explanations.get(q.num) || []).join(" ").replace(/\s+/g, " ").trim(),
      };
    });

    return { fail: false, nextIdx: idx, stem, questions };
  }

  while (i < lines.length) {
    const result = tryParseCase(i);
    if (!result) break; // hết case
    if (result.fail) {
      discardedCaseCount.n++;
      // Đồng bộ lại: tìm dòng "Câu hỏi:" tiếp theo để bỏ qua case lỗi và tiếp tục.
      let j = result.nextIdx;
      while (j < lines.length && !/^câu\s*hỏi\s*:?\s*$/i.test(lines[j])) j++;
      if (j >= lines.length) break;
      // Lùi lại để tìm điểm bắt đầu đề bài của case kế tiếp: quét ngược tối đa
      // vài chục dòng không thực tế ở đây — đơn giản là bắt đầu case mới ngay
      // tại dòng sau "Câu hỏi:" bị bỏ dở, chấp nhận có thể mất luôn phần đề bài
      // của case đó (đã được tính là bị loại).
      i = j + 1;
      continue;
    }
    // Đề bài (case_stem) lẽ ra không bao giờ chứa các mốc "Đáp án:"/"Giải
    // thích:" — nếu có nghĩa là nội dung của case này đã bị trộn lẫn với
    // phần giải thích do lỗi ngắt trang PDF. Loại bỏ toàn bộ case này thay vì
    // dùng đề bài sai.
    if (/đáp\s*án\s*:|giải\s*thích\s*:/i.test(result.stem)) {
      discardedCaseCount.n++;
    } else {
      cases.push({ stem: result.stem, questions: result.questions });
    }
    i = result.nextIdx;
  }

  return { lessonCode, lessonTitle, cases, discardedCaseCount: discardedCaseCount.n };
}

function toRow({ id, subject, chapter, group, caseStem, question, options, correctLetter, explanation }) {
  return {
    id,
    subject,
    chapter,
    group,
    case_stem: caseStem || "",
    question,
    option_a: options.A || options.a || "",
    option_b: options.B || options.b || "",
    option_c: options.C || options.c || "",
    option_d: options.D || options.d || "",
    option_e: options.E || options.e || "",
    correct_answer: correctLetter || "",
    explanation: explanation || "",
  };
}

let totalQuestions = 0;
let totalDiscardedCases = 0;
let totalShortExplanations = 0;
const summary = [];

for (const file of pdfFiles.sort()) {
  const filePath = join(pdfDir, file);
  const data = readFileSync(filePath);
  const parser = new PDFParse({ data });
  // eslint-disable-next-line no-await-in-loop
  const result = await parser.getText();
  // eslint-disable-next-line no-await-in-loop
  await parser.destroy();

  const { lessonCode, lessonTitle, cases, discardedCaseCount } = parsePdfText(result.text);
  if (!lessonTitle || cases.length === 0) {
    console.warn(`CẢNH BÁO: không parse được case nào từ "${file}" — kiểm tra thủ công.`);
    continue;
  }

  const lessonId = slugify(lessonTitle);
  const lessonKey = `${chapterName}::${lessonTitle}`;
  const alreadyExists = existingLessons.has(lessonKey);
  const idPrefix = alreadyExists ? `noi-${lessonId}-casen2` : `noi-${lessonId}-case`;
  const csvFileName = alreadyExists
    ? `${chapterId}-${lessonId}-case-2.csv`
    : `${chapterId}-${lessonId}-case.csv`;

  // Ngưỡng tối thiểu cho giải thích — câu cuối của 1 case đôi khi bị PDF cắt
  // ngắn đúng chỗ ngắt trang (chỉ còn vài chữ), loại các câu này thay vì
  // dùng giải thích cụt.
  const MIN_EXPLANATION_LENGTH = 40;
  let shortExplanationCount = 0;
  const rows = [];
  cases.forEach((c, ci) => {
    c.questions.forEach((q) => {
      const optionValues = ["A", "B", "C", "D"].map((k) => q.options[k]);
      const hasAllOptions = optionValues.every((v) => v && v.trim() !== "");
      if (q.explanation.length < MIN_EXPLANATION_LENGTH || !hasAllOptions || !q.correctLetter) {
        shortExplanationCount++;
        return;
      }
      rows.push(
        toRow({
          id: `${idPrefix}-${ci + 1}-${q.num}`,
          subject: "noi",
          chapter: lessonTitle,
          group: chapterName,
          caseStem: c.stem,
          question: q.question,
          options: q.options,
          correctLetter: q.correctLetter,
          explanation: q.explanation,
        }),
      );
    });
  });
  if (shortExplanationCount > 0) {
    console.warn(
      `BỎ QUA: ${file} có ${shortExplanationCount} câu bị cắt cụt giải thích (lỗi ngắt trang PDF).`,
    );
  }

  if (existsSync(join(QUESTIONS_DIR, csvFileName))) {
    console.warn(`CẢNH BÁO: ${csvFileName} đã tồn tại và sẽ bị ghi đè.`);
  }
  writeFileSync(
    join(QUESTIONS_DIR, csvFileName),
    stringify(rows, { header: true, columns: CSV_HEADER }),
    "utf8",
  );

  if (discardedCaseCount > 0) {
    console.warn(
      `BỎ QUA: ${file} có ${discardedCaseCount} case lâm sàng không parse được sạch (lỗi thứ tự do ngắt trang PDF). Cần bổ sung thủ công.`,
    );
  }

  totalQuestions += rows.length;
  totalDiscardedCases += discardedCaseCount;
  totalShortExplanations += shortExplanationCount;
  const orderLetter = lessonCode ? lessonCode.replace(/^\d+/, "") : "?";
  const order = orderLetter !== "?" ? LETTER_ORDER.indexOf(orderLetter) + 1 : "?";
  summary.push(
    `${file} -> [${lessonCode || "?"}] "${lessonTitle}" (order=${order}): ${cases.length} case, ${rows.length} câu, case bỏ qua=${discardedCaseCount}, câu cụt=${shortExplanationCount} -> ${csvFileName}`,
  );
}

console.log(summary.join("\n"));
console.log("\n=== TOTALS ===");
console.log("Files processed:", pdfFiles.length);
console.log("Total sub-questions:", totalQuestions);
console.log("Discarded cases (page-break artifact):", totalDiscardedCases);
console.log("Truncated explanations skipped:", totalShortExplanations);
console.log("\nKiểm tra lại output rồi chạy `npm run import:questions`.");

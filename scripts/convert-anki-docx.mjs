// Chuyển các file "Anki_<Môn>_khoa_MCQ_co_dap_an.docx" (câu hỏi + đáp án xuất từ
// Anki, không có tiêu đề chương) thành CSV theo schema data/questions/, phân loại
// từng câu vào đúng chủ đề trong đề án ôn thi nội trú 2026 ĐHYHN bằng keyword
// match trên nội dung câu hỏi.
//
// Cách chạy: node scripts/convert-anki-docx.mjs <file.docx> <group: Nội|Ngoại|Sản> <slug: noi|ngoai|san>

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { stringify } from "csv-stringify/sync";
import {
  TOPICS_NGOAI,
  TOPICS_NOI,
  TOPICS_SAN,
  OTHER_CHAPTER,
} from "./noi-tru-topics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

const [, , docxPath, group, slug] = process.argv;
if (!docxPath || !group || !slug) {
  console.error(
    "Dùng: node scripts/convert-anki-docx.mjs <file.docx> <group: Nội|Ngoại|Sản> <slug>",
  );
  process.exit(1);
}

const TOPICS_BY_GROUP = { Nội: TOPICS_NOI, Ngoại: TOPICS_NGOAI, Sản: TOPICS_SAN };
const topics = TOPICS_BY_GROUP[group];
if (!topics) {
  console.error("Group không hợp lệ:", group, "- phải là Nội, Ngoại hoặc Sản");
  process.exit(1);
}

// Đồng nghĩa/tên gọi khác thường gặp cho các chủ đề dễ bị gọi tên khác trong câu hỏi.
const SYNONYMS = {
  "Lơ xê mi cấp": ["bạch cầu cấp", "leukemia"],
  Basedow: ["cường giáp", "graves"],
  "Bệnh phổi tắc nghẽn mãn tính": ["copd"],
  "Hội chứng mạch vành cấp": ["nhồi máu cơ tim", "nmct"],
  "Đột quỵ não": ["tai biến mạch máu não", "tbmmn", "nhồi máu não", "xuất huyết não"],
  "Chấn thương sọ não": ["ctsn"],
  "Vàng da ở trẻ sơ sinh": ["hội chứng vàng da"],
};

// Các cụm từ quá chung chung (xuất hiện trong hầu hết mọi câu hỏi lâm sàng) - nếu
// tách chương thành một mảnh chỉ gồm các từ này thì bỏ, không dùng làm từ khoá.
const STOPWORD_FRAGMENTS = new Set([
  "chẩn đoán",
  "biến chứng",
  "điều trị",
  "nguyên nhân",
  "triệu chứng",
  "quản lý",
  "chăm sóc",
  "đánh giá",
  "xử trí",
  "dự phòng",
  "phòng bệnh",
  "phân loại",
  "cơ chế",
  "tiếp cận",
  "khối u",
  "bệnh lý",
  "một số",
  "các phương pháp",
]);

function keywordsFor(topic) {
  const base = topic
    .replace(/\([^)]*\)/g, " ")
    .split(/[,/:]| và /i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !STOPWORD_FRAGMENTS.has(s.toLowerCase()));
  const extra = SYNONYMS[topic] || [];
  return [...new Set([topic, ...base, ...extra])].filter((k) => k.length >= 3);
}

const TOPIC_KEYWORDS = topics.map((t) => ({ topic: t, keywords: keywordsFor(t) }));

function classify(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const { topic, keywords } of TOPIC_KEYWORDS) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best || OTHER_CHAPTER;
}

const ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F"];

function parseQuestionBlocks(paragraphs, startIdx) {
  // Trả về { questions: [...], nextIdx } - đọc liên tiếp các khối "Câu N. ... / A. .. / Đáp án: X - .." bắt đầu từ startIdx.
  const questions = [];
  let i = startIdx;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    const qMatch = p.match(/^Câu\s+(\d+)\.\s*([\s\S]+)$/);
    if (!qMatch) break;
    const question = qMatch[2].trim();
    i++;
    const options = {};
    while (i < paragraphs.length) {
      const optMatch = paragraphs[i].match(/^([A-F])\.\s*([\s\S]+)$/);
      if (!optMatch) break;
      options[optMatch[1].toLowerCase()] = optMatch[2].trim();
      i++;
    }
    let correct = "";
    if (i < paragraphs.length) {
      const ansMatch = paragraphs[i].match(/^Đáp án:\s*([A-F])\b/);
      if (ansMatch) {
        correct = ansMatch[1].toLowerCase();
        i++;
      }
    }
    questions.push({ question, options, correct });
  }
  return { questions, nextIdx: i };
}

async function main() {
  const { value: text } = await mammoth.extractRawText({ path: docxPath });
  const paragraphs = text
    .split(/\r?\n\s*\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const partIIdx = paragraphs.findIndex((p) => /^PHẦN I\./.test(p));
  const partIIIdx = paragraphs.findIndex((p) => /^PHẦN II\./.test(p));

  const rows = [];
  let seq = 1;

  // PHẦN I. MCQ đơn
  {
    let i = partIIdx + 1;
    const end = partIIIdx === -1 ? paragraphs.length : partIIIdx;
    while (i < end) {
      if (/^Câu\s+\d+\./.test(paragraphs[i])) {
        const { questions, nextIdx } = parseQuestionBlocks(paragraphs, i);
        for (const q of questions) {
          const combined = [q.question, ...Object.values(q.options)].join(" ");
          rows.push({
            id: `test-moi-${slug}-${String(seq).padStart(5, "0")}`,
            chapter: classify(combined),
            case_stem: "",
            question: q.question,
            options: q.options,
            correct: q.correct,
          });
          seq++;
        }
        i = nextIdx > i ? nextIdx : i + 1;
      } else {
        i++;
      }
    }
  }

  // PHẦN II. Case lâm sàng
  if (partIIIdx !== -1) {
    let i = partIIIdx + 1;
    while (i < paragraphs.length) {
      const caseMatch = paragraphs[i].match(/^Case lâm sàng\s+\d+/);
      if (caseMatch) {
        i++;
        let stem = "";
        if (i < paragraphs.length && /^Tình huống:/.test(paragraphs[i])) {
          stem = paragraphs[i].replace(/^Tình huống:\s*\(TH\):\s*/, "").trim();
          i++;
        }
        const { questions, nextIdx } = parseQuestionBlocks(paragraphs, i);
        const chapter = classify(
          [stem, ...questions.map((q) => q.question)].join(" "),
        );
        for (const q of questions) {
          rows.push({
            id: `test-moi-${slug}-${String(seq).padStart(5, "0")}`,
            chapter,
            case_stem: stem,
            question: q.question,
            options: q.options,
            correct: q.correct,
          });
          seq++;
        }
        i = nextIdx > i ? nextIdx : i + 1;
      } else {
        i++;
      }
    }
  }

  const HEADER = [
    "id", "subject", "chapter", "group", "case_stem", "image", "question",
    "option_a", "option_b", "option_c", "option_d", "option_e", "option_f",
    "correct_answer", "explanation",
  ];
  const out = rows.map((r) => ({
    id: r.id,
    subject: "test-moi",
    chapter: r.chapter,
    group,
    case_stem: r.case_stem,
    image: "",
    question: r.question,
    option_a: r.options.a || "",
    option_b: r.options.b || "",
    option_c: r.options.c || "",
    option_d: r.options.d || "",
    option_e: r.options.e || "",
    option_f: r.options.f || "",
    correct_answer: r.correct,
    explanation: "",
  }));

  const outPath = join(REPO, "data", "questions", `test-moi-${slug}.csv`);
  writeFileSync(outPath, stringify(out, { header: true, columns: HEADER }), "utf8");
  console.log(`Đã ghi ${out.length} câu vào ${outPath}`);

  const chapterCounts = {};
  for (const r of out) chapterCounts[r.chapter] = (chapterCounts[r.chapter] || 0) + 1;
  console.log("Phân bố theo chương:");
  for (const [ch, count] of Object.entries(chapterCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${ch}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

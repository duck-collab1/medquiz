import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";

const SRC_ROOT = "E:/tài liệu học tập/ngoại khoa/mcq";

const GROUP_LABELS = {
  "tiêu hóa": "Tiêu hóa",
  "thần kinh": "Thần kinh",
  "thận tiết niệu": "Thận tiết niệu",
  "tim mạch lồng ngực": "Tim mạch lồng ngực",
  "chấn thương chỉnh hình": "Chấn thương chỉnh hình",
  nhi: "Nhi",
};

function cleanChapterName(fileName) {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/\s*mcq\s*$/i, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\p{L}/u, (c) => c.toUpperCase());
}

function stripNoise(text) {
  return text
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*(AM|PM)\s*\t?OneNote[\s\S]*?-- \d+ of \d+ --\n?/g, "")
    .replace(/\r/g, "");
}

function parseQuestions(rawText, group, chapter) {
  const text = stripNoise(rawText);
  const markerRe = /^(\d{1,3})\.\s/gm;
  const markers = [];
  let mm;
  while ((mm = markerRe.exec(text)) !== null) {
    markers.push({ num: mm[1], start: mm.index + mm[0].length });
  }

  const questions = [];
  const problems = [];

  for (let bi = 0; bi < markers.length; bi++) {
    const num = markers[bi].num;
    const start = markers[bi].start;
    const end = bi + 1 < markers.length ? markers[bi + 1].start - (markers[bi + 1].num.length + 2) : text.length;
    const body = text.slice(start, end);

    const ansMatch = body.match(/Đáp án:\s*([A-Fa-f])\.?/);
    if (!ansMatch) {
      problems.push(`[${chapter}] Câu ${num}: không tìm thấy 'Đáp án:'`);
      continue;
    }
    const correctAnswer = ansMatch[1].toLowerCase();
    const beforeAns = body.slice(0, ansMatch.index);
    const afterAns = body.slice(ansMatch.index + ansMatch[0].length);

    const optRe = /(?:^|\n)([A-F])\.\s+/g;
    const optPositions = [];
    let om;
    while ((om = optRe.exec(beforeAns)) !== null) {
      optPositions.push({ letter: om[1], start: om.index + om[0].length });
    }
    if (optPositions.length < 2) {
      problems.push(`[${chapter}] Câu ${num}: không tìm thấy đủ lựa chọn (${optPositions.length})`);
      continue;
    }

    const stem = beforeAns.slice(0, optPositions[0].start - (optPositions[0].letter.length + 2)).replace(/\s+/g, " ").trim();
    const options = {};
    for (let i = 0; i < optPositions.length; i++) {
      const start = optPositions[i].start;
      const end = i + 1 < optPositions.length ? optPositions[i + 1].start - (optPositions[i + 1].letter.length + 2) : beforeAns.length;
      const optText = beforeAns.slice(start, end).replace(/\s+/g, " ").trim();
      options[optPositions[i].letter.toLowerCase()] = optText;
    }

    const explanation = afterAns
      .replace(/\(Nguồn:[^)]*\)\.?/g, "")
      .replace(/Nguồn:\s*[^.\n]*\.?/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!stem || Object.values(options).some((v) => !v)) {
      problems.push(`[${chapter}] Câu ${num}: thiếu nội dung câu hỏi hoặc lựa chọn rỗng`);
      continue;
    }
    if (!options[correctAnswer]) {
      problems.push(`[${chapter}] Câu ${num}: đáp án đúng '${correctAnswer.toUpperCase()}' không khớp lựa chọn nào (lỗi ngắt trang)`);
      continue;
    }

    questions.push({
      group,
      chapter,
      question: stem,
      options,
      correctAnswer,
      explanation,
    });
  }

  return { questions, problems };
}

async function extractPdfText(filePath) {
  const buf = readFileSync(filePath);
  const parser = new PDFParse({ data: buf });
  const res = await parser.getText();
  return res.text;
}

function csvField(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const allQuestions = [];
  const allProblems = [];

  for (const folder of Object.keys(GROUP_LABELS)) {
    const dir = join(SRC_ROOT, folder);
    let files;
    try {
      files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"));
    } catch {
      continue;
    }
    const group = GROUP_LABELS[folder];
    for (const file of files) {
      const chapter = cleanChapterName(file);
      const filePath = join(dir, file);
      try {
        const text = await extractPdfText(filePath);
        const { questions, problems } = parseQuestions(text, group, chapter);
        allQuestions.push(...questions);
        allProblems.push(...problems);
        console.log(`${group} / ${chapter}: ${questions.length} câu (${problems.length} lỗi)`);
      } catch (err) {
        console.error(`LỖI đọc file ${filePath}:`, err.message);
      }
    }
  }

  console.log(`\nTổng: ${allQuestions.length} câu hỏi, ${allProblems.length} vấn đề.`);
  if (allProblems.length > 0) {
    writeFileSync("scratch-ngoai-mcq-problems.txt", allProblems.join("\n"), "utf-8");
    console.log("Đã ghi danh sách vấn đề vào scratch-ngoai-mcq-problems.txt");
  }

  const header = "id,subject,chapter,group,case_stem,image,question,option_a,option_b,option_c,option_d,option_e,option_f,correct_answer,explanation";
  const lines = [header];
  let seq = 6;
  for (const q of allQuestions) {
    const id = `ngoai-${String(seq).padStart(5, "0")}`;
    seq++;
    lines.push(
      [
        id,
        "ngoai",
        q.chapter,
        q.group,
        "",
        "",
        q.question,
        q.options.a || "",
        q.options.b || "",
        q.options.c || "",
        q.options.d || "",
        q.options.e || "",
        q.options.f || "",
        q.correctAnswer,
        q.explanation,
      ]
        .map(csvField)
        .join(","),
    );
  }
  writeFileSync("data/questions/ngoai-mcq-import.csv", lines.join("\n"), "utf-8");
  console.log(`Đã ghi ${allQuestions.length} câu vào data/questions/ngoai-mcq-import.csv`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

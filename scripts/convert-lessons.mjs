// Chuyển các file JSON (note / mcqSingle / mcqCase theo chương-bài, định dạng do
// AI ngoài xuất ra) thành CSV trong data/questions/ và file .md trong data/notes/,
// đúng schema mà app + scripts/import-questions.mjs đang dùng.
//
// Dùng lại được cho các đợt gửi file tiếp theo: tự phát hiện (group, chapter) đã
// tồn tại trong data/questions để KHÔNG ghi đè — sẽ tạo file "-2.csv" (hoặc "-3",...)
// và id có hậu tố "-n2" (hoặc "-n3",...) thay vì trùng id với dữ liệu cũ.
//
// Cách chạy: node scripts/convert-lessons.mjs <file1.json> <file2.json> ...
// (đường dẫn tuyệt đối hoặc tương đối đều được)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const QUESTIONS_DIR = join(REPO, "data", "questions");
const NOTES_DIR = join(REPO, "data", "notes");

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

const sourceFiles = process.argv.slice(2);
if (sourceFiles.length === 0) {
  console.error("Dùng: node scripts/convert-lessons.mjs <file1.json> <file2.json> ...");
  process.exit(1);
}

// Tập hợp các cặp (group, chapter) đã có sẵn trong data/questions, để phát hiện
// bài đã tồn tại và tránh ghi đè / trùng id.
function loadExistingLessonBatches() {
  const existing = new Set(); // `${group}::${chapter}`
  if (!existsSync(QUESTIONS_DIR)) return existing;
  for (const file of readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith(".csv"))) {
    const rows = parse(readFileSync(join(QUESTIONS_DIR, file), "utf8"), {
      columns: true,
      skip_empty_lines: true,
    });
    for (const r of rows) {
      existing.add(`${r.group}::${r.chapter}`);
    }
  }
  return existing;
}

const existingLessons = loadExistingLessonBatches();

// key: `${chapterId}::${lessonId}` -> merged lesson
const lessons = new Map();

for (const rawPath of sourceFiles) {
  const filePath = resolve(rawPath);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  for (const lesson of data.lessons) {
    const key = `${data.chapterId}::${lesson.id}`;
    if (!lessons.has(key)) {
      lessons.set(key, {
        chapterId: data.chapterId,
        chapterName: data.chapterName,
        lessonId: lesson.id,
        title: lesson.title,
        order: lesson.order,
        note: undefined,
        mcqSingle: [],
        mcqCase: [],
      });
    }
    const merged = lessons.get(key);
    if (lesson.note) merged.note = lesson.note;
    if (lesson.mcqSingle) merged.mcqSingle.push(...lesson.mcqSingle);
    if (lesson.mcqCase) merged.mcqCase.push(...lesson.mcqCase);
  }
}

function toRow({ id, subject, chapter, group, caseStem, question, options, correctIndex, explanation }) {
  return {
    id,
    subject,
    chapter,
    group,
    case_stem: caseStem || "",
    question,
    option_a: options[0] || "",
    option_b: options[1] || "",
    option_c: options[2] || "",
    option_d: options[3] || "",
    option_e: options[4] || "",
    correct_answer: ANSWER_LETTERS[correctIndex] || "",
    explanation: explanation || "",
  };
}

let totalMcqRows = 0;
let totalCaseRows = 0;
let totalNotes = 0;
const summary = [];

for (const lesson of [...lessons.values()].sort((a, b) =>
  a.chapterId === b.chapterId ? a.order - b.order : a.chapterId.localeCompare(b.chapterId),
)) {
  const { chapterId, chapterName, lessonId, title } = lesson;
  const subject = "noi";

  const lessonKey = `${chapterName}::${title}`;
  const alreadyExists = existingLessons.has(lessonKey);
  const idPrefix = alreadyExists ? `noi-${lessonId}-n2` : `noi-${lessonId}`;
  const csvFileName = alreadyExists ? `${chapterId}-${lessonId}-2.csv` : `${chapterId}-${lessonId}.csv`;

  const rows = [];
  lesson.mcqSingle.forEach((q, i) => {
    rows.push(
      toRow({
        id: `${idPrefix}-mcq-${String(i + 1).padStart(3, "0")}`,
        subject,
        chapter: title,
        group: chapterName,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      }),
    );
  });
  totalMcqRows += lesson.mcqSingle.length;

  lesson.mcqCase.forEach((c, ci) => {
    c.questions.forEach((q, qi) => {
      rows.push(
        toRow({
          id: `${idPrefix}-case-${ci + 1}-${qi + 1}`,
          subject,
          chapter: title,
          group: chapterName,
          caseStem: c.stem,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }),
      );
    });
  });
  const caseSubQ = lesson.mcqCase.reduce((s, c) => s + c.questions.length, 0);
  totalCaseRows += caseSubQ;

  if (rows.length > 0) {
    if (existsSync(join(QUESTIONS_DIR, csvFileName))) {
      console.warn(`CẢNH BÁO: ${csvFileName} đã tồn tại và sẽ bị ghi đè — kiểm tra lại thủ công nếu cần.`);
    }
    const csv = stringify(rows, { header: true, columns: CSV_HEADER });
    writeFileSync(join(QUESTIONS_DIR, csvFileName), csv, "utf8");
  }

  if (lesson.note) {
    const noteDir = join(NOTES_DIR, "noi", chapterId);
    mkdirSync(noteDir, { recursive: true });
    const notePath = join(noteDir, `${lessonId}.md`);
    const finalPath = existsSync(notePath) ? join(noteDir, `${lessonId}-2.md`) : notePath;
    writeFileSync(finalPath, lesson.note, "utf8");
    totalNotes++;
  }

  summary.push(
    `${chapterId}/${lessonId} (${title})${alreadyExists ? " [bài đã có sẵn -> file/id mới]" : ""}: mcq=${lesson.mcqSingle.length} case_sub_q=${caseSubQ} note=${lesson.note ? "yes" : "no"} -> ${rows.length > 0 ? csvFileName : "(no csv)"}`,
  );
}

console.log(summary.join("\n"));
console.log("\n=== TOTALS ===");
console.log("mcqSingle rows:", totalMcqRows);
console.log("mcqCase sub-question rows:", totalCaseRows);
console.log("Total question rows:", totalMcqRows + totalCaseRows);
console.log("Notes written:", totalNotes);
console.log(
  "\nSau khi kiểm tra output, chạy `npm run import:questions` để đẩy câu hỏi mới lên Firestore.",
);

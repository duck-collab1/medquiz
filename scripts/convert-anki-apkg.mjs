// Chuyển file .apkg (Anki deck có sẵn cấu trúc Chương::Bài) thành CSV theo
// schema data/questions/. Dùng cho môn Nhi trong mục "Test mới".
//
// Cách chạy: node scripts/convert-anki-apkg.mjs <file.apkg> <group: Nhi> <slug: nhi>

import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import initSqlJs from "sql.js";
import { stringify } from "csv-stringify/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const SEP = String.fromCharCode(31);

const [, , apkgPath, group, slug] = process.argv;
if (!apkgPath || !group || !slug) {
  console.error("Dùng: node scripts/convert-anki-apkg.mjs <file.apkg> <group> <slug>");
  process.exit(1);
}

const OTHER_CHAPTER = "Khác / Chưa phân loại";

function chapterFromDeckName(name) {
  const parts = name.split("::");
  const leaf = parts[parts.length - 1];
  const cleaned = leaf.replace(/^(Chương|Bài)\s*[\dA-Za-z]*_/u, "").trim();
  return cleaned || OTHER_CHAPTER;
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), "apkg-"));
  const zip = new AdmZip(apkgPath);
  const entryName = zip.getEntries().some((e) => e.entryName === "collection.anki21")
    ? "collection.anki21"
    : "collection.anki2";
  zip.extractEntryTo(entryName, tmp, false, true);

  const SQL = await initSqlJs();
  const fs = await import("node:fs");
  const buf = fs.readFileSync(join(tmp, entryName));
  const db = new SQL.Database(buf);

  const col = db.exec("SELECT decks FROM col")[0];
  const decks = JSON.parse(col.values[0][0]);
  const deckNameById = {};
  for (const d of Object.values(decks)) deckNameById[d.id] = d.name;

  // note id -> deck id (lấy deck của card đầu tiên thuộc note đó)
  const cardRows = db.exec("SELECT nid, did FROM cards")[0]?.values || [];
  const deckByNote = {};
  for (const [nid, did] of cardRows) {
    if (!(nid in deckByNote)) deckByNote[nid] = did;
  }

  const noteRows = db.exec("SELECT id, mid, flds FROM notes")[0]?.values || [];

  const rows = [];
  let seq = 1;

  for (const [nid, mid, fldsRaw] of noteRows) {
    const f = fldsRaw.split(SEP);
    const deckName = deckNameById[deckByNote[nid]] || "";
    const chapter = chapterFromDeckName(deckName);

    if (f.length <= 20) {
      // Model "MCQ đơn": CardUID,Ghi chú,Question,ChoiceA-E,CorrectAnswer,ExplanationA-E,HLState,QuestionNumber,QuestionType
      const [, , question, a, b, c, d, e, correct, expA, expB, expC, expD, expE] = f;
      if (!question || !question.trim()) continue;
      const options = { a, b, c, d, e };
      const explanations = { a: expA, b: expB, c: expC, d: expD, e: expE };
      const correctLetter = (correct || "").trim().toLowerCase();
      rows.push({
        id: `test-moi-${slug}-${String(seq).padStart(5, "0")}`,
        chapter,
        case_stem: "",
        question: question.trim(),
        options,
        correct: correctLetter,
        explanation: explanations[correctLetter] || "",
      });
      seq++;
    } else {
      // Model "MCQ case tình huống": CardUID,CaseNumber,QuestionType,PassageText, rồi 10 khối Qn (12 field/khối)
      const stem = (f[3] || "").trim();
      for (let n = 0; n < 10; n++) {
        const base = 4 + n * 12;
        const question = f[base];
        if (!question || !question.trim()) continue;
        const [a, b, c, d, e] = [f[base + 1], f[base + 2], f[base + 3], f[base + 4], f[base + 5]];
        const correct = (f[base + 6] || "").trim().toLowerCase();
        const explanations = {
          a: f[base + 7], b: f[base + 8], c: f[base + 9], d: f[base + 10], e: f[base + 11],
        };
        rows.push({
          id: `test-moi-${slug}-${String(seq).padStart(5, "0")}`,
          chapter,
          case_stem: stem,
          question: question.trim(),
          options: { a, b, c, d, e },
          correct,
          explanation: explanations[correct] || "",
        });
        seq++;
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
    option_f: "",
    correct_answer: r.correct,
    explanation: r.explanation || "",
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

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data", "questions");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  console.error(
    "Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT_PATH (đường dẫn tới file service account JSON tải từ Firebase Console).",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const ANSWER_KEYS = ["a", "b", "c", "d", "e", "f"];

function toQuestionDoc(row) {
  const correctAnswer = (row.correct_answer || "").trim().toLowerCase();
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter || "",
    group: row.group || "",
    ...(row.case_stem ? { caseStem: row.case_stem } : {}),
    ...(row.image ? { image: row.image } : {}),
    question: row.question,
    options: {
      a: row.option_a || "",
      b: row.option_b || "",
      c: row.option_c || "",
      d: row.option_d || "",
      e: row.option_e || "",
      f: row.option_f || "",
    },
    correctAnswer: ANSWER_KEYS.includes(correctAnswer) ? correctAnswer : "",
    explanation: row.explanation || "",
    needsReview: !ANSWER_KEYS.includes(correctAnswer),
  };
}

async function importFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let batch = db.batch();
  let count = 0;

  for (const row of rows) {
    if (!row.id) {
      console.warn(`Bỏ qua dòng thiếu 'id' trong ${filePath}`);
      continue;
    }
    const docData = toQuestionDoc(row);
    const ref = db.collection("questions").doc(row.id);
    batch.set(ref, docData, { merge: true });
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`Đã import ${count} câu hỏi từ ${filePath}`);
}

async function main() {
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".csv"));
  if (files.length === 0) {
    console.log("Không tìm thấy file CSV nào trong data/questions.");
    return;
  }
  for (const file of files) {
    await importFile(join(dataDir, file));
  }
  console.log("Hoàn tất import.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

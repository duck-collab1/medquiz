import type { SubjectId } from "../types";

export interface ScheduleItem {
  label: string;
  subjectId?: SubjectId;
}

export interface WeekBlock {
  title: string;
  clinicalSubjectId: SubjectId;
  // "Cơ sở" (Giải phẫu/Hóa sinh/Vi sinh/Mô phôi/GPB chưa có trong app nên
  // không gắn subjectId; riêng Sinh lý có nội dung trong app nên gắn "sinh-ly").
  baseTopics: ScheduleItem[];
  clinicalTopics: string[];
}

// Lộ trình dựa theo Danh mục chính thức thi tuyển sinh BSNT Y khoa - ĐH Y Hà
// Nội 2025 (QĐ 3486/QĐ-ĐHYHN), chia theo hệ cơ quan mỗi tuần và ghép Cơ sở +
// Lâm sàng như lịch thật người dùng đã áp dụng. Bỏ qua Hô hấp và Tiêu hóa
// (Nội) vì đã học xong; các tuần còn lại nối tiếp theo đúng thứ tự đề cương
// gốc, sau đó lặp lại vòng 2 để ôn lại nhiều lần trước khi thi (8/2027).
export const WEEK_BLOCKS: WeekBlock[] = [
  {
    title: "Nội - Huyết học",
    clinicalSubjectId: "noi",
    baseTopics: [
      { label: "Sinh lý hồng cầu", subjectId: "sinh-ly" },
      { label: "Cơ chế bệnh sinh của xuất huyết", subjectId: "sinh-ly" },
      { label: "Chuyển hóa sắt và hemoglobin, bilirubin" },
    ],
    clinicalTopics: ["Thiếu máu", "Hemophilia", "U lympho", "Lơ xê mi cấp", "Xuất huyết", "Truyền máu lâm sàng"],
  },
  {
    title: "Nội - Cơ xương khớp",
    clinicalSubjectId: "noi",
    baseTopics: [{ label: "Xương khớp chi trên, chi dưới" }, { label: "Cơ chi trên, chi dưới" }],
    clinicalTopics: [
      "Thoái hóa khớp",
      "Viêm cột sống dính khớp",
      "Lupus ban đỏ hệ thống",
      "Bệnh gút",
      "Viêm khớp dạng thấp",
      "Loãng xương nguyên phát",
    ],
  },
  {
    title: "Nội - Thần kinh + Nội tiết",
    clinicalSubjectId: "noi",
    baseTopics: [
      { label: "Giải phẫu hệ thần kinh" },
      { label: "Sinh lý hệ thần kinh", subjectId: "sinh-ly" },
      { label: "Chức năng một số tuyến", subjectId: "sinh-ly" },
      { label: "Sinh lý trục dưới đồi tuyến yên, tuyến sinh dục, các biến đổi sinh lý bà mẹ thời kỳ mang thai", subjectId: "sinh-ly" },
    ],
    clinicalTopics: [
      "Động kinh",
      "Đau đầu do tăng áp lực nội sọ",
      "Đột quỵ não",
      "Basedow",
      "Suy giáp",
      "Suy tuyến thượng thận",
      "Đái tháo đường",
      "Rối loạn Lipid máu",
      "Bướu nhân tuyến giáp",
      "Hội chứng Cushing nội sinh",
    ],
  },
  {
    title: "Nội - Thận - Tiết niệu",
    clinicalSubjectId: "noi",
    baseTopics: [
      { label: "Giải phẫu hệ tiết niệu" },
      { label: "Điều hoà cân bằng nước và điện giải", subjectId: "sinh-ly" },
      { label: "Rối loạn chuyển hóa" },
      { label: "Mô bệnh học cầu thận trong hội chứng thận hư" },
    ],
    clinicalTopics: [
      "Đái máu",
      "Hội chứng thận hư ở người trưởng thành",
      "Tổn thương thận cấp",
      "Bệnh thận mạn tính",
      "Nhiễm khuẩn đường tiết niệu",
      "Rối loạn nước điện giải (natri, kali)",
      "Toan chuyển hóa",
    ],
  },
  {
    title: "Nội - Tim mạch",
    clinicalSubjectId: "noi",
    baseTopics: [{ label: "Giải phẫu hệ tim mạch" }, { label: "Sinh lý hệ tim mạch", subjectId: "sinh-ly" }],
    clinicalTopics: [
      "Tăng huyết áp",
      "Hội chứng mạch vành cấp",
      "Hội chứng mạch vành mạn",
      "Hẹp van động mạch chủ",
      "Một số rối loạn nhịp tim thường gặp",
      "Suy tim mạn tính",
    ],
  },
  {
    title: "Nội - Nhiễm + Ung bướu tổng quát",
    clinicalSubjectId: "noi",
    baseTopics: [{ label: "Đại cương Vi sinh vật" }, { label: "Thuốc kháng sinh" }],
    clinicalTopics: ["Các phương pháp chẩn đoán bệnh ung thư", "HIV/AIDS", "Cúm", "Sarcopenia"],
  },
  {
    title: "Nội - Cấp cứu tổng hợp",
    clinicalSubjectId: "noi",
    baseTopics: [{ label: "Thuốc glucocoticoid" }, { label: "Thuốc opioid" }, { label: "Thuốc an thần" }, { label: "Thuốc giống giao cảm" }],
    clinicalTopics: [
      "Cấp cứu ngừng tuần hoàn cơ bản",
      "Sốc phản vệ",
      "Chẩn đoán và xử trí một số ngộ độc cấp thường gặp",
      "Nhiễm khuẩn huyết, sốc nhiễm khuẩn",
      "Sốt xuất huyết Dengue",
      "Dị vật đường thở",
      "Viêm não, màng não",
    ],
  },
  {
    title: "Ngoại - Chấn thương",
    clinicalSubjectId: "ngoai",
    baseTopics: [{ label: "Ôn lại Giải phẫu hệ thần kinh" }, { label: "Giải phẫu lồng ngực" }, { label: "Giải phẫu ổ bụng" }],
    clinicalTopics: [
      "Chấn thương sọ não",
      "Chấn thương cột sống",
      "Gãy thân xương đùi",
      "Trật khớp vai",
      "Gãy trên lồi cầu xương cánh tay trẻ em",
      "Gãy cổ xương đùi",
      "Gãy hở hai xương cẳng chân",
      "Vết thương bàn tay",
      "Vết thương và chấn thương bụng",
      "Chấn thương – vết thương ngực",
      "Chấn thương hệ tiết niệu: Chấn thương thận",
    ],
  },
  {
    title: "Ngoại - Cấp cứu chấn thương tổng hợp",
    clinicalSubjectId: "ngoai",
    baseTopics: [{ label: "Thuốc hạ sốt, giảm đau, chống viêm non steroid" }],
    clinicalTopics: [
      "Quy tắc cấp cứu thì đầu chấn thương",
      "Cấp cứu chấn thương thần kinh, chấn thương ngực, chấn thương bụng, chấn thương chi",
      "Hội chứng thiếu máu cấp tính chi: chấn thương, vết thương, tắc mạch",
    ],
  },
  {
    title: "Ngoại - Tiêu hóa",
    clinicalSubjectId: "ngoai",
    baseTopics: [{ label: "Ôn lại Giải phẫu hệ tiêu hóa" }, { label: "Ôn lại Sinh lý hệ tiêu hóa", subjectId: "sinh-ly" }],
    clinicalTopics: [
      "Biến chứng của loét dạ dày – tá tràng",
      "Viêm ruột thừa, Viêm phúc mạc và các ổ áp xe trong ổ bụng",
      "Tắc ruột",
      "Sỏi đường mật chính",
      "Lồng ruột cấp tính ở trẻ còn bú",
      "Chảy máu đường tiêu hóa trên",
      "Giãn đại tràng bẩm sinh",
      "Dị tật hậu môn trực tràng",
      "Tắc ruột sơ sinh",
    ],
  },
  {
    title: "Ngoại - Tiết niệu + U bướu",
    clinicalSubjectId: "ngoai",
    baseTopics: [{ label: "Ôn lại Giải phẫu hệ tiết niệu" }],
    clinicalTopics: [
      "Hội chứng chèn ép khoang",
      "Sỏi thận",
      "U tủy",
      "Ung thư thận",
      "Tăng sản lành tính tiền liệt tuyến",
      "Ung thư trực tràng",
      "Ung thư gan nguyên phát",
    ],
  },
  {
    title: "Ngoại - Mạch máu + Chu phẫu",
    clinicalSubjectId: "ngoai",
    baseTopics: [{ label: "Mạch chi trên" }, { label: "Mạch chi dưới" }],
    clinicalTopics: [
      "Ung thư thực quản",
      "Bệnh động mạch chủ thường gặp",
      "Bệnh thiếu máu mạn tính chi dưới",
      "Đánh giá, chuẩn bị bệnh nhân trước phẫu thuật",
      "Sinh lý đau và các nguyên tắc điều trị đau",
    ],
  },
  {
    title: "Nhi - Sơ sinh + Tiếp cận trẻ bệnh",
    clinicalSubjectId: "nhi",
    baseTopics: [
      { label: "Sự thụ tinh và sự phát triển của phôi từ giai đoạn thụ tinh đến giai đoạn phôi nang" },
      { label: "Mô thần kinh và hệ thần kinh" },
    ],
    clinicalTopics: [
      "Đặc điểm và cách chăm sóc trẻ sơ sinh đủ tháng",
      "Đặc điểm và cách chăm sóc trẻ sơ sinh thiếu tháng",
      "Vàng da ở trẻ sơ sinh",
      "Tăng trưởng thể chất ở trẻ em",
      "Tiếp cận trẻ bệnh",
      "Tiếp cận trẻ bệnh nặng",
    ],
  },
  {
    title: "Nhi - Hô hấp + Tim + Thần kinh cấp cứu",
    clinicalSubjectId: "nhi",
    baseTopics: [{ label: "Ôn lại Giải phẫu hệ hô hấp" }, { label: "Ôn lại Giải phẫu hệ tim mạch" }],
    clinicalTopics: [
      "Các bệnh lý tim bẩm sinh thường gặp ở trẻ em",
      "Bệnh viêm phế quản phổi ở trẻ em",
      "Bệnh viêm tiểu phế quản ở trẻ em",
      "Hen phế quản ở trẻ em",
      "Suy hô hấp cấp ở trẻ em",
      "Sốt",
      "Viêm não ở trẻ em",
      "Viêm màng não nhiễm khuẩn",
    ],
  },
  {
    title: "Nhi - Tiêu hóa + Huyết học + Cấp cứu",
    clinicalSubjectId: "nhi",
    baseTopics: [{ label: "Ôn lại Sinh lý hệ tiêu hóa", subjectId: "sinh-ly" }, { label: "Ôn lại Sinh lý hồng cầu", subjectId: "sinh-ly" }],
    clinicalTopics: [
      "Bệnh tiêu chảy cấp ở trẻ em",
      "Bệnh tiêu chảy kéo dài ở trẻ em",
      "Hội chứng nôn trớ ở trẻ em",
      "Bệnh suy dinh dưỡng ở trẻ em",
      "Shock ở trẻ em",
      "Co giật ở trẻ em",
      "Chảy máu trong sọ ở trẻ em",
      "Bệnh thiếu máu dinh dưỡng ở trẻ em",
      "Bệnh thiếu máu huyết tán ở trẻ em",
      "Hội chứng xuất huyết ở trẻ em",
    ],
  },
  {
    title: "Nhi - Nội tiết + Thận + Dự phòng",
    clinicalSubjectId: "nhi",
    baseTopics: [{ label: "Ôn lại Mô bệnh học cầu thận trong hội chứng thận hư" }, { label: "Ôn lại Chức năng một số tuyến", subjectId: "sinh-ly" }],
    clinicalTopics: [
      "Suy giáp trạng ở trẻ em",
      "Tăng sản thượng thận bẩm sinh thể thiếu enzyme 21-hydroxylase",
      "Bệnh viêm cầu thận cấp ở trẻ em",
      "Hội chứng thận hư ở trẻ em",
      "Nhiễm trùng đường tiểu ở trẻ em",
      "Tiêm chủng ở trẻ em",
    ],
  },
  {
    title: "Sản - Sinh lý thai nghén cơ bản",
    clinicalSubjectId: "san",
    baseTopics: [
      { label: "Giải phẫu hệ sinh dục" },
      { label: "Sinh lý trục dưới đồi tuyến yên, tuyến sinh dục, các biến đổi sinh lý bà mẹ thời kỳ mang thai", subjectId: "sinh-ly" },
    ],
    clinicalTopics: [
      "Chu kỳ kinh nguyệt và các bất thường chu kỳ kinh nguyệt",
      "Tính chất thai nhi đủ tháng",
      "Sự tiết sữa và nuôi con bằng sữa mẹ",
      "Chuyển dạ",
      "Chẩn đoán và quản lý thai nghén",
      "Sảy thai và thai chết lưu",
      "Chửa trứng",
      "Suy thai mãn tính và suy thai cấp tính trong chuyển dạ",
    ],
  },
  {
    title: "Sản - Bệnh lý sản khoa + Hậu sản",
    clinicalSubjectId: "san",
    baseTopics: [{ label: "Phôi thai học hệ sinh dục" }],
    clinicalTopics: [
      "Chửa ngoài tử cung",
      "Rau tiền đạo",
      "Đẻ khó",
      "Sinh non và dự phòng sinh non",
      "Rau bong non",
      "Hậu sản thường",
      "Nhiễm khuẩn hậu sản",
      "Chảy máu sau đẻ",
      "Vỡ tử cung",
    ],
  },
  {
    title: "Sản - Bệnh lý thai kỳ + Sơ sinh",
    clinicalSubjectId: "san",
    baseTopics: [{ label: "Ôn lại Sinh lý trục dưới đồi - biến đổi sinh lý bà mẹ mang thai", subjectId: "sinh-ly" }],
    clinicalTopics: [
      "Nhiễm khuẩn sinh dục và các bệnh lây truyền qua đường tình dục (STD)",
      "Tăng huyết áp trong thai kỳ",
      "Chăm sóc sơ sinh thiết yếu",
    ],
  },
  {
    title: "Sản - Phụ khoa + KHHGĐ",
    clinicalSubjectId: "san",
    baseTopics: [{ label: "Cơ sở di truyền tế bào" }, { label: "Bất thường bẩm sinh" }],
    clinicalTopics: [
      "Các khối u lành tính phụ khoa",
      "Ung thư buồng trứng",
      "Ung thư niêm mạc tử cung",
      "Ung thư cổ tử cung",
      "Ung thư vú",
      "Khối u nguyên bào nuôi",
      "Vô sinh nữ",
      "Các phương pháp đình chỉ thai nghén dưới 12 tuần",
      "Các biện pháp tránh thai",
      "Một số bệnh lý nam khoa",
    ],
  },
];

// Đã học xong (không lặp lại ở vòng 1, chỉ nhắc trong buổi ôn Chủ nhật đầu tiên).
export const COMPLETED_TOPICS = ["Tiêu hóa (Nội)", "Hô hấp (Nội)"];

// Thứ 2 gần nhất kể từ ngày sửa lịch - tuần đầu tiên của lộ trình chi tiết mới.
const START_MONDAY = new Date(2026, 7, 24);
export const EXAM_DATE = new Date(2027, 7, 11);
const END_DATE = EXAM_DATE;

/** Số ngày còn lại đến kỳ thi (âm nếu đã qua ngày thi). */
export function getDaysUntilExam(from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((EXAM_DATE.getTime() - today.getTime()) / 86400000);
}

function splitRoundRobin(items: string[], buckets: number): string[][] {
  const result: string[][] = Array.from({ length: buckets }, () => []);
  items.forEach((item, i) => result[i % buckets].push(item));
  return result;
}

export type DayPlan =
  | { kind: "weekday"; block: WeekBlock; base: ScheduleItem[]; clinical: ScheduleItem[] }
  | { kind: "review"; block: WeekBlock }
  | { kind: "recall"; block: WeekBlock | null };

/** Kế hoạch học của 1 ngày cụ thể, hoặc null nếu đã qua mốc ôn thi (31/8/2027). */
export function getDayPlan(date: Date): DayPlan | null {
  if (date > END_DATE) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((d.getTime() - START_MONDAY.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const dayOfWeek = ((diffDays % 7) + 7) % 7; // 0 = Thứ 2 ... 6 = Chủ nhật
  const cycleIndex = ((weekIndex % WEEK_BLOCKS.length) + WEEK_BLOCKS.length) % WEEK_BLOCKS.length;
  const block = WEEK_BLOCKS[cycleIndex];

  if (dayOfWeek === 6) {
    if (weekIndex <= 0) return { kind: "recall", block: null };
    const prevIndex = ((weekIndex - 1) % WEEK_BLOCKS.length + WEEK_BLOCKS.length) % WEEK_BLOCKS.length;
    return { kind: "recall", block: WEEK_BLOCKS[prevIndex] };
  }
  if (dayOfWeek === 5) {
    return { kind: "review", block };
  }

  const baseByDay = splitRoundRobin(
    block.baseTopics.map((t) => t.label),
    5,
  );
  const clinicalByDay = splitRoundRobin(block.clinicalTopics, 5);

  const baseLabels = baseByDay[dayOfWeek];
  const clinicalLabels = clinicalByDay[dayOfWeek];

  const base: ScheduleItem[] = baseLabels.map((label) => {
    const match = block.baseTopics.find((t) => t.label === label);
    return { label, subjectId: match?.subjectId };
  });
  const clinical: ScheduleItem[] = clinicalLabels.map((label) => ({ label, subjectId: block.clinicalSubjectId }));

  return { kind: "weekday", block, base, clinical };
}

export function getUpcomingPlan(days: number, from = new Date()): { date: Date; plan: DayPlan }[] {
  const result: { date: Date; plan: DayPlan }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const plan = getDayPlan(date);
    if (!plan) break;
    result.push({ date, plan });
  }
  return result;
}

export interface LabRefItem {
  name: string;
  value: string;
  note?: string;
}

export interface LabRefCategory {
  category: string;
  items: LabRefItem[];
}

export const LAB_REFERENCE: LabRefCategory[] = [
  {
    category: "Huyết học",
    items: [
      { name: "Hồng cầu (nam)", value: "4,2 - 5,8 T/L" },
      { name: "Hồng cầu (nữ)", value: "3,8 - 5,2 T/L" },
      { name: "Hemoglobin (Hb) - nam", value: "13 - 17 g/dL (130-170 g/L)" },
      { name: "Hemoglobin (Hb) - nữ", value: "12 - 15 g/dL (120-150 g/L)" },
      { name: "Hematocrit (Hct) - nam", value: "40 - 50%" },
      { name: "Hematocrit (Hct) - nữ", value: "36 - 44%" },
      { name: "Bạch cầu (BC)", value: "4 - 10 G/L" },
      { name: "Bạch cầu trung tính", value: "60 - 66%" },
      { name: "Bạch cầu lympho", value: "20 - 25%" },
      { name: "Tiểu cầu (TC)", value: "150 - 400 G/L" },
      { name: "Máu lắng (VS) giờ 1", value: "< 10mm (nam), < 15mm (nữ)" },
      { name: "Reticulocyte (hồng cầu lưới)", value: "0,5 - 1,5%" },
    ],
  },
  {
    category: "Đông máu",
    items: [
      { name: "PT (Prothrombin Time)", value: "11 - 13 giây" },
      { name: "Tỷ lệ Prothrombin", value: "70 - 140%" },
      { name: "INR", value: "0,8 - 1,2" },
      { name: "APTT", value: "25 - 35 giây" },
      { name: "Fibrinogen", value: "2 - 4 g/L", note: "RLĐM nặng khi < 1 g/L" },
      { name: "D-Dimer", value: "< 0,5 mg/L (FEU)" },
    ],
  },
  {
    category: "Sinh hóa gan mật",
    items: [
      { name: "AST (GOT)", value: "< 37-40 U/L" },
      { name: "ALT (GPT)", value: "< 40-41 U/L" },
      { name: "GGT", value: "8 - 61 U/L (nam cao hơn nữ)" },
      { name: "Phosphatase kiềm (ALP)", value: "35 - 105 U/L" },
      { name: "Bilirubin toàn phần", value: "< 17 µmol/L (~1 mg/dL)" },
      { name: "Bilirubin trực tiếp", value: "< 4,3 µmol/L" },
      { name: "Albumin máu", value: "35 - 50 g/L" },
      { name: "Protein toàn phần", value: "60 - 80 g/L" },
      { name: "NH3 máu (amoniac)", value: "11 - 35 µmol/L" },
      { name: "AFP", value: "< 10 ng/mL", note: ">400 ng/mL gợi ý HCC" },
      { name: "CEA", value: "< 5 ng/mL" },
      { name: "CA 19-9", value: "< 37 U/mL" },
    ],
  },
  {
    category: "Tụy",
    items: [
      { name: "Amylase máu", value: "28 - 100 U/L", note: "Tăng ≥3 lần có giá trị chẩn đoán VTC" },
      { name: "Lipase máu", value: "13 - 60 U/L", note: "Đặc hiệu hơn Amylase, tăng muộn (8-18h), kéo dài hơn (8-14 ngày)" },
    ],
  },
  {
    category: "Thận - Điện giải",
    items: [
      { name: "Ure máu", value: "2,5 - 7,5 mmol/L" },
      { name: "Creatinin máu (nam)", value: "62 - 106 µmol/L" },
      { name: "Creatinin máu (nữ)", value: "44 - 88 µmol/L" },
      { name: "GFR (mức lọc cầu thận)", value: "≥ 90 mL/phút/1,73m²" },
      { name: "Natri (Na⁺)", value: "135 - 145 mmol/L" },
      { name: "Kali (K⁺)", value: "3,5 - 5,0 mmol/L" },
      { name: "Clo (Cl⁻)", value: "98 - 106 mmol/L" },
      { name: "Calci toàn phần", value: "2,2 - 2,6 mmol/L" },
      { name: "Calci ion hóa", value: "1,15 - 1,29 mmol/L" },
      { name: "Phospho máu", value: "0,8 - 1,45 mmol/L" },
      { name: "Magie máu", value: "0,7 - 1,0 mmol/L" },
    ],
  },
  {
    category: "Khí máu động mạch",
    items: [
      { name: "pH", value: "7,35 - 7,45" },
      { name: "PaCO₂", value: "35 - 45 mmHg" },
      { name: "PaO₂", value: "80 - 100 mmHg" },
      { name: "HCO₃⁻", value: "22 - 26 mmol/L" },
      { name: "SaO₂", value: "95 - 100%" },
      { name: "Base excess (BE)", value: "-2 đến +2 mmol/L" },
      { name: "Lactat máu", value: "0,5 - 2,2 mmol/L" },
    ],
  },
  {
    category: "Đường huyết & mỡ máu",
    items: [
      { name: "Glucose máu đói", value: "3,9 - 5,6 mmol/L (70-100 mg/dL)" },
      { name: "HbA1c", value: "< 5,7% (bình thường); ≥ 6,5% chẩn đoán ĐTĐ" },
      { name: "Cholesterol toàn phần", value: "< 5,2 mmol/L" },
      { name: "LDL-C", value: "< 3,4 mmol/L (tối ưu < 2,6)" },
      { name: "HDL-C", value: "> 1,0 mmol/L (nam), > 1,3 (nữ)" },
      { name: "Triglycerid", value: "< 1,7 mmol/L", note: ">10 mmol/L (~1000mg/dL) là nguyên nhân gây VTC" },
    ],
  },
  {
    category: "Viêm & vi sinh",
    items: [
      { name: "CRP", value: "< 5 mg/L (VTC nặng: >150 mg/L tại 48-72h)" },
      { name: "Procalcitonin (PCT)", value: "< 0,05 ng/mL", note: "Đặc hiệu nhiễm khuẩn hơn CRP" },
    ],
  },
  {
    category: "Tim mạch",
    items: [
      { name: "Troponin T/I (hs)", value: "Tùy kit — tăng gợi ý hoại tử cơ tim (NMCT)" },
      { name: "NT-proBNP", value: "< 125 pg/mL (gợi ý suy tim nếu tăng cao)" },
      { name: "CK-MB", value: "< 25 U/L" },
    ],
  },
  {
    category: "Nội tiết tuyến giáp",
    items: [
      { name: "TSH", value: "0,4 - 4,0 mIU/L" },
      { name: "FT4", value: "10 - 25 pmol/L" },
      { name: "FT3", value: "3,5 - 6,5 pmol/L" },
    ],
  },
  {
    category: "Dấu ấn viêm gan virus",
    items: [
      { name: "HBsAg dương ≥ 6 tháng", value: "→ Viêm gan B mạn" },
      { name: "Anti-HBc IgM (+)", value: "→ Nhiễm HBV cấp" },
      { name: "HBV-DNA (HBeAg+)", value: "> 20.000 IU/mL → có chỉ định điều trị" },
      { name: "HBV-DNA (HBeAg-)", value: "> 2.000 IU/mL → có chỉ định điều trị" },
      { name: "Anti-HCV (+) + HCV-RNA (+)", value: "> 6 tháng → Viêm gan C mạn" },
    ],
  },
];

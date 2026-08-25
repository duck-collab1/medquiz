import type { SubjectId } from "../types";

export interface LectureVideo {
  id: string;
  title: string;
  /** Mã 11 ký tự trong link YouTube, vd. link .../watch?v=XXXXXXXXXXX -> "XXXXXXXXXXX". */
  youtubeId: string;
  /** Gắn theo môn để nhóm hiển thị - bỏ trống thì video rơi vào nhóm "Khác". */
  subject?: SubjectId;
  description?: string;
}

/** Danh sách video bài giảng - thêm video mới bằng cách thêm 1 object vào mảng dưới đây. */
export const LECTURE_VIDEOS: LectureVideo[] = [
  { id: "lecture-IA28bS000p4", title: "Buổi 1", youtubeId: "IA28bS000p4", subject: "noi" },
  { id: "lecture-_Orp4X92Mss", title: "Buổi 2", youtubeId: "_Orp4X92Mss", subject: "noi" },
  { id: "lecture-qRWk7kg2EQg", title: "Buổi 3", youtubeId: "qRWk7kg2EQg", subject: "noi" },
  { id: "lecture-KpSBRqOjp3M", title: "Buổi 4", youtubeId: "KpSBRqOjp3M", subject: "noi" },
  { id: "lecture-cTOsiGC0qK4", title: "Buổi 5", youtubeId: "cTOsiGC0qK4", subject: "noi" },
  { id: "lecture-Parjg38SrNU", title: "Buổi 6", youtubeId: "Parjg38SrNU", subject: "noi" },
  { id: "lecture-LcSnXx-Yeic", title: "Buổi 7", youtubeId: "LcSnXx-Yeic", subject: "noi" },
  { id: "lecture-VsHtUtD9lNs", title: "Buổi 8", youtubeId: "VsHtUtD9lNs", subject: "noi" },
  { id: "lecture-E_MPtxdan9M", title: "Buổi 9", youtubeId: "E_MPtxdan9M", subject: "noi" },
  { id: "lecture-x0mFSQOEU_g", title: "Buổi 10", youtubeId: "x0mFSQOEU_g", subject: "noi" },
  { id: "lecture-J4NVpExp24U", title: "Buổi 11", youtubeId: "J4NVpExp24U", subject: "noi" },
  { id: "lecture-6B1dhatcZSE", title: "Buổi 12", youtubeId: "6B1dhatcZSE", subject: "noi" },
  { id: "lecture-8rR9_gTaqmU", title: "Buổi 13", youtubeId: "8rR9_gTaqmU", subject: "noi" },
  { id: "lecture-bmL6RX85Pes", title: "Buổi 14", youtubeId: "bmL6RX85Pes", subject: "noi" },
  { id: "lecture-q1VoGS37IY4", title: "Buổi 15", youtubeId: "q1VoGS37IY4", subject: "noi" },
  { id: "lecture-Ppdh0dUAwrc", title: "Buổi 16", youtubeId: "Ppdh0dUAwrc", subject: "noi" },
  { id: "lecture-UkJSo2WCJXk", title: "Buổi 17", youtubeId: "UkJSo2WCJXk", subject: "noi" },
  { id: "lecture-Zw9Hf_i3GfI", title: "Buổi 18", youtubeId: "Zw9Hf_i3GfI", subject: "noi" },
  { id: "lecture-Wdbos8xGlIc", title: "Buổi 19", youtubeId: "Wdbos8xGlIc", subject: "noi" },
  { id: "lecture-rGPEar9UqVA", title: "Buổi 20", youtubeId: "rGPEar9UqVA", subject: "noi" },
  { id: "lecture-lsf2zinqJqs", title: "Buổi 21", youtubeId: "lsf2zinqJqs", subject: "noi" },
  { id: "lecture-98zEe9UKZ98", title: "Buổi 22", youtubeId: "98zEe9UKZ98", subject: "noi" },
  { id: "lecture-rJRGhXQe-7k", title: "Buổi 23", youtubeId: "rJRGhXQe-7k", subject: "noi" },
  { id: "lecture-VfQINo3CKXI", title: "Buổi 24", youtubeId: "VfQINo3CKXI", subject: "noi" },
  { id: "lecture-5J6KkSmrmm8", title: "Buổi 25 P1", youtubeId: "5J6KkSmrmm8", subject: "noi" },
  { id: "lecture-PUaw1_zo72s", title: "Buổi 25 P2", youtubeId: "PUaw1_zo72s", subject: "noi" },
  { id: "lecture-nhi-5tnvfdZHC98", title: "Buổi 2: vpqp", youtubeId: "5tnvfdZHC98", subject: "nhi" },
  { id: "lecture-nhi-e8kd6py8Qeo", title: "Chua test 1", youtubeId: "e8kd6py8Qeo", subject: "nhi" },
  { id: "lecture-nhi-6PiIDvlvlzs", title: "B1. ho hap- nkhhct", youtubeId: "6PiIDvlvlzs", subject: "nhi" },
  { id: "lecture-nhi-Yi6lrnXvkZw", title: "Hen pq- chua test 2", youtubeId: "Yi6lrnXvkZw", subject: "nhi" },
  { id: "lecture-nhi-j9FeG02DxJY", title: "Vtpq", youtubeId: "j9FeG02DxJY", subject: "nhi" },
  { id: "lecture-nhi-AQoqcrO6Ya0", title: "Buoi3/ p3 + chua test 3", youtubeId: "AQoqcrO6Ya0", subject: "nhi" },
  { id: "lecture-nhi-XZk2T02VQhM", title: "Buoi 3/ p2", youtubeId: "XZk2T02VQhM", subject: "nhi" },
  { id: "lecture-nhi-2pZHMOSPFL8", title: "Buoi 3/p1 suy ho hap cap", youtubeId: "2pZHMOSPFL8", subject: "nhi" },
  { id: "lecture-nhi-asFHetX3UCw", title: "Buổi 4: tim bs", youtubeId: "asFHetX3UCw", subject: "nhi" },
  { id: "lecture-nhi-fT_zzjd1TvQ", title: "Tbs 2- chữa test 4", youtubeId: "fT_zzjd1TvQ", subject: "nhi" },
  { id: "lecture-nhi-_5RhtzO9Q_w", title: "Huyet hoc p2- chua test 5", youtubeId: "_5RhtzO9Q_w", subject: "nhi" },
  { id: "lecture-nhi--yIUpEKolp8", title: "Hc xuat huyet 2", youtubeId: "-yIUpEKolp8", subject: "nhi" },
  { id: "lecture-nhi-t67EsWGRD5I", title: "Buổi 6: hoi chung xuat huyet 1", youtubeId: "t67EsWGRD5I", subject: "nhi" },
  { id: "lecture-nhi-VzmDXQKuUXs", title: "Buổi 7: xuat huyet nao", youtubeId: "VzmDXQKuUXs", subject: "nhi" },
  { id: "lecture-nhi-HiLMloKqKBs", title: "Hcxh 3- chua test 6", youtubeId: "HiLMloKqKBs", subject: "nhi" },
  { id: "lecture-nhi-mhrr0WxdEog", title: "Co giat - test 7", youtubeId: "mhrr0WxdEog", subject: "nhi" },
  { id: "lecture-nhi-e5OZHKpXcIM", title: "Hoi chung than hu", youtubeId: "e5OZHKpXcIM", subject: "nhi" },
  { id: "lecture-nhi-OsQFE-i3Bdw", title: "Buổi 8: viem cau than cap", youtubeId: "OsQFE-i3Bdw", subject: "nhi" },
  { id: "lecture-nhi-t5sqfgdz5pQ", title: "Buổi 10: hội chứng nôn trớ", youtubeId: "t5sqfgdz5pQ", subject: "nhi" },
  { id: "lecture-nhi-IRrMz5bD25s", title: "Buổi 9: nhiễm trùng tiết niệu", youtubeId: "IRrMz5bD25s", subject: "nhi" },
  { id: "lecture-nhi-z5Q3NQEhvO0", title: "Tieu chay keo dai (buoi 10)", youtubeId: "z5Q3NQEhvO0", subject: "nhi" },
  { id: "lecture-nhi-OP_Yku2D6JA", title: "Tieu chay cap- keo dai (buoi 10)", youtubeId: "OP_Yku2D6JA", subject: "nhi" },
  { id: "lecture-nhi-nZOMkcEpUbk", title: "Buổi 11: so sinh", youtubeId: "nZOMkcEpUbk", subject: "nhi" },
  { id: "lecture-nhi-VXq7M895l98", title: "Buổi 12: Sốc + Nội Tiết", youtubeId: "VXq7M895l98", subject: "nhi" },
  { id: "lecture-nhi-c-rG_2PAF8I", title: "Ss 2- chữa test 11", youtubeId: "c-rG_2PAF8I", subject: "nhi" },
  { id: "lecture-nhi-bX7tVlgc-Fo", title: "Buổi 14: sốt+ viêm màng não mủ", youtubeId: "bX7tVlgc-Fo", subject: "nhi" },
  { id: "lecture-nhi-xvMjDwc52Bs", title: "Chữa test 14", youtubeId: "xvMjDwc52Bs", subject: "nhi" },
  { id: "lecture-nhi-PNNWhLt943M", title: "Buổi 15- p1", youtubeId: "PNNWhLt943M", subject: "nhi" },
  { id: "lecture-nhi-zgcicW4m_ek", title: "Chữa test 15+ test cuối khoá", youtubeId: "zgcicW4m_ek", subject: "nhi" },
];

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
  { id: "lecture-IA28bS000p4", title: "Buổi 1", youtubeId: "IA28bS000p4" },
  { id: "lecture-_Orp4X92Mss", title: "Buổi 2", youtubeId: "_Orp4X92Mss" },
  { id: "lecture-qRWk7kg2EQg", title: "Buổi 3", youtubeId: "qRWk7kg2EQg" },
  { id: "lecture-KpSBRqOjp3M", title: "Buổi 4", youtubeId: "KpSBRqOjp3M" },
  { id: "lecture-cTOsiGC0qK4", title: "Buổi 5", youtubeId: "cTOsiGC0qK4" },
  { id: "lecture-Parjg38SrNU", title: "Buổi 6", youtubeId: "Parjg38SrNU" },
  { id: "lecture-LcSnXx-Yeic", title: "Buổi 7", youtubeId: "LcSnXx-Yeic" },
  { id: "lecture-VsHtUtD9lNs", title: "Buổi 8", youtubeId: "VsHtUtD9lNs" },
  { id: "lecture-E_MPtxdan9M", title: "Buổi 9", youtubeId: "E_MPtxdan9M" },
  { id: "lecture-x0mFSQOEU_g", title: "Buổi 10", youtubeId: "x0mFSQOEU_g" },
  { id: "lecture-J4NVpExp24U", title: "Buổi 11", youtubeId: "J4NVpExp24U" },
  { id: "lecture-6B1dhatcZSE", title: "Buổi 12", youtubeId: "6B1dhatcZSE" },
  { id: "lecture-8rR9_gTaqmU", title: "Buổi 13", youtubeId: "8rR9_gTaqmU" },
  { id: "lecture-bmL6RX85Pes", title: "Buổi 14", youtubeId: "bmL6RX85Pes" },
  { id: "lecture-q1VoGS37IY4", title: "Buổi 15", youtubeId: "q1VoGS37IY4" },
  { id: "lecture-Ppdh0dUAwrc", title: "Buổi 16", youtubeId: "Ppdh0dUAwrc" },
  { id: "lecture-UkJSo2WCJXk", title: "Buổi 17", youtubeId: "UkJSo2WCJXk" },
  { id: "lecture-Zw9Hf_i3GfI", title: "Buổi 18", youtubeId: "Zw9Hf_i3GfI" },
  { id: "lecture-Wdbos8xGlIc", title: "Buổi 19", youtubeId: "Wdbos8xGlIc" },
  { id: "lecture-rGPEar9UqVA", title: "Buổi 20", youtubeId: "rGPEar9UqVA" },
  { id: "lecture-lsf2zinqJqs", title: "Buổi 21", youtubeId: "lsf2zinqJqs" },
  { id: "lecture-98zEe9UKZ98", title: "Buổi 22", youtubeId: "98zEe9UKZ98" },
  { id: "lecture-rJRGhXQe-7k", title: "Buổi 23", youtubeId: "rJRGhXQe-7k" },
  { id: "lecture-VfQINo3CKXI", title: "Buổi 24", youtubeId: "VfQINo3CKXI" },
  { id: "lecture-5J6KkSmrmm8", title: "Buổi 25 P1", youtubeId: "5J6KkSmrmm8" },
  { id: "lecture-PUaw1_zo72s", title: "Buổi 25 P2", youtubeId: "PUaw1_zo72s" },
];

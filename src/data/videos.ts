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
export const LECTURE_VIDEOS: LectureVideo[] = [];

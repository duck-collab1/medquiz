import type { IconName } from "./icons";

/** Icon cho từng chương (group) trong môn Nội. Chương không có trong danh sách sẽ dùng icon mặc định "book". */
export const GROUP_ICONS: Record<string, IconName> = {
  "Nội tiết": "flame",
  "Hô hấp": "wind",
  "Tiêu hoá": "utensils",
  "Tim mạch": "heart-pulse",
  "Thận tiết niệu": "droplets",
  "Cơ xương khớp": "bone",
  "Hồi sức cấp cứu": "siren",
  "Huyết học": "droplet",
};

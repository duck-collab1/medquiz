export const MOTIVATIONAL_QUOTES: string[] = [
  "Không có con đường tắt nào dẫn đến nơi đáng để đi.",
  "Hôm nay cố thêm 1%, một năm sau bạn sẽ khác đi rất nhiều.",
  "Bác sĩ giỏi không phải người biết hết, mà là người không ngừng học.",
  "Mỗi câu sai hôm nay là một câu bạn sẽ không sai trong phòng thi.",
  "Kiến thức y khoa không thương ai học nhiều hay ít, chỉ thương người kiên trì.",
  "Đừng học để qua kỳ thi, hãy học để không sai khi cầm mạng sống người khác.",
  "Chậm mà chắc còn hơn nhanh mà quên.",
  "Ôn tập là một cuộc chạy marathon, không phải chạy nước rút.",
  "Ngày hôm nay bạn bỏ cuộc là ngày người khác vượt qua bạn.",
  "Kỷ luật bản thân hôm nay, tự do lựa chọn ngày mai.",
  "Không ai giỏi ngay từ đầu, chỉ có người chịu lặp lại đủ nhiều.",
  "Một giờ tập trung hơn cả một ngày học đối phó.",
  "Trí nhớ được rèn bằng sự lặp lại, không phải bằng may mắn.",
  "Bạn không cần hoàn hảo, bạn chỉ cần tiến bộ mỗi ngày.",
  "Nội trú không chọn người thông minh nhất, mà chọn người bền bỉ nhất.",
  "Hãy học như thể ngày mai có bệnh nhân cần đến kiến thức đó.",
  "Cơ thể mệt có thể nghỉ, nhưng đừng để ý chí nghỉ theo.",
  "Sai ở đây, đúng ở phòng thi - đó là lý do ta luyện đề.",
  "Ôn lại một lần nữa, nhớ lâu hơn một chút.",
  "Người xuất sắc không tránh khó, họ chỉ quen với khó hơn người khác.",
  "Ngày hôm nay là bản nháp của phiên bản bác sĩ tương lai của bạn.",
  "Từng chương bạn hoàn thành là một viên gạch cho sự nghiệp sau này.",
  "Không có kỳ thi nào đánh bại được sự chuẩn bị kỹ càng.",
  "Cứ tiến từng bước nhỏ, đích đến sẽ tự đến gần bạn.",
  "Sự tự tin trong phòng thi bắt đầu từ những đêm cặm cụi hôm nay.",
  "Đừng so sánh chương 1 của bạn với chương 20 của người khác.",
  "Học chắc một chương hơn là học lướt mười chương.",
  "Bạn đang xây nền móng cho những năm hành nghề sau này.",
  "Cố gắng không phản bội ai, chỉ là đến muộn với vài người.",
  "Ngủ đủ, ăn đủ, học đều - đó cũng là một dạng kỷ luật y khoa.",
];

/** Chọn quote theo ngày trong năm để mỗi ngày hiển thị một câu cố định. */
export function getTodayQuote(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

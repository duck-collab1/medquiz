export function FirebaseSetupNotice() {
  return (
    <div className="auth-page">
      <div className="auth-form">
        <h1>Chưa cấu hình Firebase</h1>
        <p>
          App cần kết nối Firebase (Authentication + Firestore) để chạy. Hãy
          làm theo mục <strong>"2. Tạo project Firebase"</strong> trong{" "}
          <code>README.md</code>: tạo project, bật Email/Password
          Authentication, tạo Firestore, rồi điền các biến{" "}
          <code>VITE_FIREBASE_...</code> vào file <code>.env</code> ở thư mục
          gốc.
        </p>
        <p>Sau khi điền xong, khởi động lại server (`npm run dev`).</p>
      </div>
    </div>
  );
}

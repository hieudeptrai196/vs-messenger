# Hướng dẫn Kiểm thử Extension Mini Tab

## 1. Yêu cầu tiên quyết

- Đã cài đặt **VS Code**.
- Đã cài đặt **Node.js** (khuyến nghị phiên bản 16 trở lên).
- Đã cài đặt các thư viện phụ thuộc:
  ```bash
  npm install
  ```

## 2. Chạy ở Chế độ Debug

Để chạy extension và kiểm thử trên máy cục bộ:

1. Mở dự án này bằng VS Code.
2. Nhấn phím `F5` hoặc truy cập sidebar **Run and Debug** và nhấn nút play màu xanh lá.
   - Thao tác này sẽ mở một cửa sổ mới là **Extension Development Host**.
3. Trong cửa sổ mới:
   - Bạn sẽ thấy biểu tượng **Mini Tab** (hình quả địa cầu 🌍) ở thanh Activity Bar bên trái.
   - Nhấn vào đó để mở Side Panel.
   - Hoặc, mở **Command Palette** (`Cmd+Shift+P` trên Mac, `Ctrl+Shift+P` trên Windows) và gõ lệnh `/Star Mini Tab` (hoặc tìm lệnh `Star Mini Tab`).

## 3. Kiểm thử Tính năng

- **Khởi động**: Kiểm tra xem trang tìm kiếm Google có hiển thị trong giao diện Mini Tab không.
- **Điều hướng**:
  - Nhập một đường dẫn (ví dụ: `https://example.com`) vào thanh địa chỉ và nhấn **Go**.
  - Nhấn vào các đường dẫn nhanh **Facebook** hoặc **Gmail** (Lưu ý: Một số trang lớn như Facebook/Gmail có thể chặn việc nhúng vào iframe do chính sách bảo mật `X-Frame-Options`. Nếu thấy trang trắng hoặc báo lỗi kết nối, đây là hành vi bình thường của trình duyệt dựa trên iframe đơn giản).
  - Sử dụng nút **Home** để quay về Google.

## 4. Khắc phục sự cố

- Nếu thay đổi code không cập nhật, thử tải lại cửa sổ (`Cmd+R` trong cửa sổ Extension Development Host) hoặc khởi động lại phiên debug.
- Kiểm tra **Debug Console** trong cửa sổ VS Code chính để xem log lỗi nếu có.

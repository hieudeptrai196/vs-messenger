# Tài liệu Chi tiết Dự án VS Messenger (Mini Tab)

## 1. Tổng quan

Dự án **VS Messenger** (tên mã trong code là `mini tab` hoặc `vs-messenger`) là một **Visual Studio Code Extension** cho phép nhúng một trình duyệt web (được tối ưu cho Messenger/Facebook) ngay vào bên trong thanh Sidebar của VS Code.

Mục tiêu chính là giúp lập trình viên có thể chat, giữ kết nối mà không cần rời khỏi môi trường code, không cần chuyển đổi cửa sổ (Alt+Tab).

## 2. Công nghệ sử dụng (Tech Stack)

Dự án sử dụng các công nghệ lõi sau:

- **VS Code Extension API**: Nền tảng chính để tích hợp vào giao diện VS Code (Views, Webview, Commands).
- **TypeScript**: Ngôn ngữ lập trình chính cho toàn bộ logic extension.
- **Puppeteer**: Thư viện điều khiển Chrome/Chromium headless (chạy ngầm). Đây là "trái tim" của ứng dụng, chịu trách nhiệm tải trang web và thực thi các thao tác.
- **WebSocket (`ws`)**: Giao thức giao tiếp thời gian thực giữa **Extension Host** (Node.js process chạy Puppeteer) và **Webview** (Giao diện HTML hiển thị cho người dùng).
- **HTML/CSS/JS (Webview)**: Giao diện hiển thị luồng hình ảnh và bắt sự kiện người dùng.

## 3. Kiến trúc và Cách xử lý (Logic Flow)

Hệ thống hoạt động theo mô hình **Remote Rendering** (Render từ xa):

### A. Phía Extension Host (Backend)

1.  **Khởi tạo (`activate`)**:

    - Khi extension được kích hoạt, nó khởi tạo một **WebSocket Server** trên một cổng ngẫu nhiên.
    - Đăng ký `WebviewViewProvider` để tạo giao diện trong Sidebar.

2.  **Quản lý Browser (Puppeteer)**:

    - Khởi chạy trình duyệt Chrome ở chế độ **Headless** (không giao diện).
    - Sử dụng thư mục `~/.gemini/vsmessenger-profile` để lưu cache, cookie, giúp **giữ trạng thái đăng nhập** giữa các lần khởi động lại.
    - Thiết lập User-Agent giả lập và Viewport kích thước nhỏ (mobile/tablet) để giao diện Messenger gọn gàng.

3.  **Streaming (Screencast)**:

    - Sử dụng Chrome DevTools Protocol (CDP) `Page.startScreencast` để chụp liên tục các frame hình ảnh từ browser ẩn.
    - Gửi dữ liệu ảnh (base64) qua WebSocket xuống Webview.

4.  **Xử lý Input**:
    - Lắng nghe các lệnh từ Webview (click, scroll, keypress, type) qua WebSocket.
    - Dùng Puppeteer API (`page.mouse`, `page.keyboard`, `page.evaluate`) để tái tạo lại hành động đó trên browser thật.

### B. Phía Webview (Frontend)

1.  **Hiển thị**:

    - Là một trang HTML đơn giản chứa thẻ `<img>`.
    - Nhận dữ liệu hình ảnh từ WebSocket và cập nhật `src` của thẻ `<img>` liên tục, tạo cảm giác như một video stream mượt mà.

2.  **Bắt sự kiện (Input Trap)**:
    - Sử dụng một thẻ `<input>` trong suốt (`input-trap`) phủ lên toàn màn hình để bắt các sự kiện bàn phím.
    - Lắng nghe `mousedown`, `wheel` trên hình ảnh để toạ độ hoá vị trí chuột.
    - Gửi các sự kiện này ngược lại Server qua WebSocket.

### C. Các tính năng đặc biệt

- **Hỗ trợ gõ tiếng Việt (IME)**: Xử lý các sự kiện `compositionstart`, `compositionend` để hỗ trợ các bộ gõ như Telex/VNI mà không bị lỗi duplicate ký tự.
- **Auto Login**: Có logic hỗ trợ điền tự động user/pass vào các selector của Facebook (`#email`, `#pass`) giúp đăng nhập nhanh.
- **Responsive**: Tự động scale toạ độ chuột dựa trên kích thước thật của ảnh và kích thước hiển thị trong Webview.

## 4. Cấu trúc thư mục

- `src/extension.ts`: File nguồn chính chứa toàn bộ logic (Server, Puppeteer controller, Webview provider).
- `package.json`: Khai báo extension, dependencies (puppeteer, ws).
- `out/`: Code sau khi biên dịch (JS).

## 5. Hướng dẫn phát triển (Dev)

1.  Cài đặt dependencies: `npm install`
2.  Biên dịch và chạy debug: Nhấn **F5** trong VS Code.
3.  Đóng gói: `vsce package` (Yêu cầu cài `vsce` global).

---

_Tài liệu này dùng cho mục đích tham khảo nội bộ development team._

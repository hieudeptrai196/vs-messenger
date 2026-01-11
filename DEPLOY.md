# Hướng Dẫn Deploy & Cài Đặt (Deployment Guide)

Tài liệu này hướng dẫn cách đóng gói và xuất bản extension **VS Messenger**.

## 1. Chuẩn bị (Prerequisites)

Đảm bảo bạn đã cài đặt:

- [Node.js](https://nodejs.org/) (version 16 trở lên).
- **vsce** (Công cụ đóng gói extension của VS Code):
  ```bash
  npm install -g @vscode/vsce
  ```

## 2. Đóng gói Extension (Packaging)

Để tạo ra file cài đặt `.vsix` (có thể gửi cho người khác cài thủ công):

1. Mở terminal tại thư mục gốc của dự án.
2. Chạy lệnh:
   ```bash
   vsce package
   ```
3. Extension sẽ được biên dịch và đóng gói thành một file có định dạng `vs-messenger-x.x.x.vsix`.

## 3. Cài đặt thủ công (Install Locally)

Để cài đặt file `.vsix` vào VS Code:

1. Mở Visual Studio Code.
2. Nhấn tổ hợp `Ctrl+Shift+X` (hoặc `Cmd+Shift+X` trên Mac) để mở tab Extensions.
3. Nhấn vào biểu tượng dấu ba chấm `...` ở góc trên bên phải của tab Extensions.
4. Chọn **Install from VSIX...**
5. Tìm và chọn file `.vsix` bạn vừa tạo.

## 4. Xuất bản lên Marketplace (Publishing)

Để đưa extension lên [Visual Studio Marketplace](https://marketplace.visualstudio.com/) cho cộng đồng sử dụng:

1. Tạo một tài khoản Publisher tại [management.azure.com](https://aka.ms/vscode-create-publisher).
2. Cập nhật `package.json` của dự án:
   - Sửa trường `"publisher": "user"` thành ID publisher của bạn (ví dụ: `"publisher": "hieunguyen"`).
   - Kiểm tra lại phiên bản (`version`).
3. Đăng nhập vào công cụ vsce:
   ```bash
   vsce login <publisher-id-của-bạn>
   ```
4. Thực hiện lệnh publish:
   ```bash
   vsce publish
   ```

---

# Deployment Guide (English)

## 1. Prerequisites

- [Node.js](https://nodejs.org/) (v16+).
- **vsce**:
  ```bash
  npm install -g @vscode/vsce
  ```

## 2. Packaging (.vsix)

To create an installable `.vsix` file:

1. Open terminal in the project root.
2. Run:
   ```bash
   vsce package
   ```
3. A file named `vs-messenger-x.x.x.vsix` will be created.

## 3. Install from VSIX

1. Open VS Code Extensions view (`Cmd+Shift+X`).
2. Click the `...` menu -> **Install from VSIX...**
3. Select the generated file.

## 4. Publish to Marketplace

1. Create a publisher ID at [marketplace.visualstudio.com](https://marketplace.visualstudio.com/).
2. Update `package.json`:
   - Change `"publisher"` to your actual publisher ID.
3. Login via CLI:
   ```bash
   vsce login <your-publisher-id>
   ```
4. Publish:
   ```bash
   vsce publish
   ```

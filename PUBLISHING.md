# Hướng dẫn Xuất bản Extension lên VS Code Marketplace

## 1. Cài đặt `vsce`

`vsce` là công cụ dòng lệnh để đóng gói và xuất bản extension cho VS Code.

```bash
npm install -g @vscode/vsce
```

## 2. Lấy Personal Access Token (PAT)

1. Truy cập [Azure DevOps](https://dev.azure.com/) và đăng nhập (hoặc tạo tổ chức mới).
2. Vào **User Settings** (biểu tượng ở góc trên bên phải) -> **Personal Access Tokens**.
3. Tạo token mới:
   - **Name**: "VS Code Marketplace" (hoặc tên tùy ý).
   - **Organization**: Chọn "All accessible organizations".
   - **Scopes**: Chọn **Marketplace** -> Tích vào **Acquire** và **Manage**.
4. **Copy token** ngay lập tức (bạn sẽ không thể xem lại nó sau bước này).

## 3. Tạo Publisher

1. Truy cập [VS Code Marketplace Management](https://marketplace.visualstudio.com/manage).
2. Tạo một publisher ID mới nếu chưa có (ví dụ: `ten-cua-ban`).
3. Cập nhật file `package.json` trong code:
   ```json
   "publisher": "ten-cua-ban"
   ```

## 4. Đóng gói (Packaging)

Để kiểm tra việc build không cần xuất bản ngay, bạn có thể đóng gói thành file cài đặt:

```bash
vsce package
```

Lệnh này tạo ra file `.vsix`, file này có thể cài đặt thủ công (`Extensions: Install from VSIX...`).

## 5. Xuất bản (Publishing)

1. Đăng nhập vào vsce bằng publisher ID của bạn:

   ```bash
   vsce login <publisher-id>
   ```

   (Dán mã PAT (đã copy ở bước 2) khi được hỏi).

2. Xuất bản extension:

   ```bash
   vsce publish
   ```

   Hoặc để tự động tăng phiên bản (patch version):

   ```bash
   vsce publish patch
   ```

## 6. Xác minh

Sau vài phút, extension của bạn sẽ xuất hiện trên [VS Code Marketplace](https://marketplace.visualstudio.com/vscode).

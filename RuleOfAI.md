AI CODING RULES & INSTRUCTIONS
1. QUY TẮC VÀNG VỀ GIT (GIT RESTRICTIONS)
TUYỆT ĐỐI KHÔNG TỰ ĐỘNG THỰC HIỆN CÁC LỆNH GIT Khi chưa được cho phép
AI không được tự ý chạy bất kỳ lệnh Git nào dưới mọi hình thức, bao gồm nhưng không giới hạn: git add, git commit, git push, git checkout, git branch, git merge, git rebase, git reset, git stash.
AI không được tạo, sửa, hoặc xóa các branch Git local hoặc remote.
AI không được tự động tạo Pull Request (PR) hay Merge Request (MR).
QUYỀN HẠN CỦA AI ĐỐI VỚI GIT:
có thể chạy bất kỳ lệnh nào với git nhưng phải hỏi người dùng trước khi chạy bất kỳ lệnh nào
khi chạy thì phải có note tại sao lại phải chạy lệnh git đó.
2. QUY TRÌNH VIẾT CODE & PHÁT TRIỂN (CODING WORKFLOW)
Hiểu rõ context trước khi code:
Luôn đọc và phân tích cấu trúc dự án hiện tại trước khi tạo mới hoặc chỉnh sửa file.
Ưu tiên tái sử dụng các hàm, utility, component và pattern đã có sẵn trong codebase.
Xác nhận trước khi thực hiện thay đổi lớn:
Với các công việc refactor diện rộng, cài đặt thư viện mới, hoặc thay đổi cấu trúc cơ sở dữ liệu/API, AI phải giải thích giải pháp và chờ người dùng xác nhận trước khi sửa file.
Tối thiểu hóa ảnh hưởng side-effect:
Chỉ chỉnh sửa đúng các file/hàm liên quan trực tiếp đến yêu cầu. Không tự ý chỉnh sửa các phần code không được yêu cầu hoặc "tiện tay" dọn dẹp code xung quanh khi chưa có chỉ thị.
3. TIÊU CHUẨN CHẤT LƯỢNG CODE (CODE QUALITY & CLEAN CODE)
Tuân thủ Coding Style hiện tại:
Giữ nguyên style code của dự án (naming convention, linter config, formatting rules, TypeScript/JavaScript types, Python type hints...).
Xử lý lỗi & Edge Cases:
Luôn viết code có xử lý ngoại lệ (try-catch, error handling, edge cases) đầy đủ và an toàn.
Không để lại các đoạn code stub, TODO dở dang hoặc comment giải thích sơ sài.
Viết Unit Test đi kèm:
Đề xuất hoặc bổ sung test case (Unit Test / Integration Test) tương ứng cho các tính năng mới hoặc hàm vừa sửa đổi.
4. AN NINH & BẢO MẬT (SECURITY & ENVIRONMENT)
Không hardcode thông tin nhạy cảm:

Không đưa API key, password, token, secret key hoặc đường dẫn môi trường nội bộ vào mã nguồn. Luôn đưa chúng vào file .env hoặc file cấu hình ẩn.

Kiểm tra file cấu hình Git:

Đảm bảo các file chứa secret key hoặc dữ liệu tạm không bị đưa ra khỏi các quy tắc trong .gitignore.

5. ĐỊNH DẠNG PHẢN HỒI DÀNH CHO AI (RESPONSE FORMAT)
Trình bày giải pháp ngắn gọn, đi thẳng vào vấn đề.

Khi hoàn thành chỉnh sửa code, AI cần tóm tắt nhanh:

Danh sách các file đã thay đổi.

Tóm tắt nội dung tính năng/lỗi đã xử lý.

Gợi ý lệnh test (nếu có) và gợi ý lệnh Git / Commit Message (dạng text thuần để người dùng tham khảo).
# 🎯 KỊCH BẢN THUYẾT TRÌNH VÀ SLIDE BẢO VỆ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC

> **Đề tài:** Nghiên cứu phương pháp phân đoạn ngữ nghĩa và tái tạo không gian 3D tự động từ bản vẽ mặt bằng 2D dựa trên mô hình thị giác đa phương thức kết hợp giải thuật hình học tính toán  
> **Thời lượng báo cáo:** 12 - 15 phút  
> **Cấu trúc:** 15 Slides chuẩn học thuật kèm Lời thoại (Speaking Script) chi tiết cho từng slide.

---

## 🖥️ SLIDE 1: TIÊU ĐỀ BÁO CÁO (TITLE SLIDE)
* **Nội dung hiển thị:**
  * Bộ Giáo dục và Đào tạo — [Tên Trường Đại học của bạn]
  * **BÁO CÁO NGHIÊN CỨU KHOA HỌC SINH VIÊN 2026**
  * Tên đề tài: *Nghiên cứu phương pháp phân đoạn ngữ nghĩa và tái tạo không gian 3D tự động từ bản vẽ mặt bằng 2D dựa trên mô hình thị giác đa phương thức kết hợp giải thuật hình học tính toán*
  * Sinh viên thực hiện: Nguyễn Hiệu Thuận
  * Giáo viên hướng dẫn: [Họ và tên GVHD]
* 🎙️ **Lời thoại (1 phút):**
  > *"Kính thưa quý thầy cô trong Hội đồng khoa học cùng toàn thể các bạn sinh viên. Em tên là Nguyễn Hiệu Thuận. Hôm nay, em xin phép được đại diện nhóm nghiên cứu trình bày báo cáo đề tài: 'Nghiên cứu phương pháp phân đoạn ngữ nghĩa và tái tạo không gian 3D tự động từ bản vẽ mặt bằng 2D dựa trên mô hình thị giác đa phương thức kết hợp giải thuật hình học tính toán'. Rất mong nhận được sự lắng nghe và đóng góp ý kiến quý báu từ quý thầy cô."*

---

## 🖥️ SLIDE 2: ĐẶT VẤN ĐỀ & BỐI CẢNH THỰC TIỄN (PROBLEM STATEMENT)
* **Hình ảnh minh họa:** 
  * Bên trái: Ảnh bản vẽ 2D giấy kẻ ô/vẽ tay mờ nhạt $\to$ Kèm chú thích: *"Người dùng thông thường mất phương hướng, không hình dung được không gian"*.
  * Bên phải: Người dựng 3D thủ công trên 3ds Max/AutoCAD $\to$ Kèm chú thích: *"Mất từ 4–8 giờ làm việc, chi phí cao, không thể cá nhân hóa tức thì"*.
* 🎙️ **Lời thoại (1.5 phút):**
  > *"Thưa thầy cô, trong lĩnh vực thiết kế kiến trúc và thương mại bất động sản số, bản vẽ mặt bằng 2D là ngôn ngữ giao tiếp tiêu chuẩn. Tuy nhiên, hơn 80% khách hàng không thể hình dung chính xác không gian sống qua các nét vẽ 2D phẳng. Hiện nay, để chuyển từ bản vẽ 2D sang mô hình 3D, quy trình hoàn toàn phụ thuộc vào việc họa viên đồ họa phải vẽ lại thủ công trên AutoCAD, SketchUp hay 3ds Max, tiêu tốn từ 4 đến 8 tiếng cho mỗi căn nhà. Nhu cầu đặt ra là: Liệu ta có thể tự động hóa toàn bộ quy trình này để người dùng chỉ cần chụp ảnh bản vẽ là có ngay mô hình 3D tương tác trên Web trong vài giây?"*

---

## 🖥️ SLIDE 3: KHOẢNG TRỐNG NGHIÊN CỨU (RESEARCH GAP)
* **Hình ảnh minh họa:** Bảng so sánh hạn chế của 2 trường phái cũ:
  * *Xử lý ảnh cổ điển (Canny/Hough)*: Đứt gãy khi có chữ viết đè lên tường.
  * *Học sâu chuyên biệt (DeepFloorplan)*: Cần GPU máy chủ đắt tiền, chạy chậm trên Web, thất bại trước bản vẽ tay tại Việt Nam.
  * *Multimodal AI (Gemini/GPT-4o)*: Hiểu ngữ nghĩa thông minh nhưng tọa độ bị lệch vài pixel, tường bị nghiêng, hở góc.
* 🎙️ **Lời thoại (1.5 phút):**
  > *"Khi tiếp cận bài toán tự động hóa, các giải pháp truyền thống đứng trước nhiều rào cản: Phương pháp xử lý ảnh cổ điển rất dễ vỡ nét khi có chữ số kích thước đè lên tường; trong khi các mạng nơ-ron học sâu như DeepFloorplan lại đòi hỏi card đồ họa GPU đắt tiền, không thể chạy trực tiếp trên trình duyệt web của khách hàng. Gần đây, các mô hình Vision-Language Model như Gemini hay GPT-4o cho thấy khả năng hiểu ngữ nghĩa tuyệt vời, nhưng điểm yếu cốt tử là tọa độ pixel thô của AI hay bị rung lắc, khiến tường bị nghiêng 1–2 độ và góc phòng bị hở. Đây chính là khoảng trống nghiên cứu mà đề tài của em tập trung giải quyết."*

---

## 🖥️ SLIDE 4: MỤC TIÊU & ĐÓNG GÓP KHOA HỌC
* **Nội dung hiển thị:**
  1. Đề xuất quy trình kết hợp hai chặng (**Hybrid Two-Stage Pipeline**) giữa Multimodal AI và Hình học tính toán.
  2. Phát triển bộ thuật toán **nắn thẳng trực giao (Orthogonal Snapping)** và **hút góc (Corner Topological Snapping)** triệt tiêu sai số hình học.
  3. Đề xuất kỹ thuật **sinh tường phân đoạn (Segmented Wall Extrusion)** đạt chuẩn 100% manifold mesh, không dùng phép cắt Boolean CSG nặng nề.
  4. Đánh giá kiểm chuẩn trên bộ dữ liệu 10 mẫu thực tế và tích hợp hoàn chỉnh vào nền tảng PickMe3D.
* 🎙️ **Lời thoại (1 phút):**
  > *"Để lấp đầy khoảng trống đó, đề tài của em mang lại 3 đóng góp khoa học chính: Thứ nhất, đề xuất kiến trúc lai hai chặng kết hợp ưu thế hiểu ngữ nghĩa của AI và độ chính xác của hình học giải tích. Thứ hai, phát triển giải thuật nắn góc và hàn gắn đỉnh tường tự động để phòng luôn kín khít. Thứ ba, sáng tạo thuật toán Segmented Wall Extrusion giúp dựng tường và khoét lỗ cửa tức thì mà không cần dùng phép cắt Boolean nặng nề của máy tính."*

---

## 🖥️ SLIDE 5: KIẾN TRÚC TỔNG THỂ HỆ THỐNG (SYSTEM ARCHITECTURE)
* **Hình ảnh minh họa:** Sơ đồ luồng dữ liệu 3 tầng (Xem sơ đồ Mermaid trong Báo cáo: Ảnh 2D $\to$ Tầng AI Vision $\to$ Tầng Hình học tính toán $\to$ Tầng Render 3D WebGL).
* 🎙️ **Lời thoại (1.5 phút):**
  > *"Đây là kiến trúc tổng thể của hệ thống: Dữ liệu ảnh đầu vào được đưa qua bộ căn chỉnh tỷ lệ để xác định tỉ lệ pixel trên mét thực tế. Sau đó, mô hình Multimodal Vision đóng vai trò như một kiến trúc sư ảo, phân tích và trích xuất dữ liệu ra hệ tọa độ chuẩn hóa từ 0.0 đến 1.0. Tọa độ thô này lập tức được đưa vào tầng Hình học tính toán để nắn thẳng góc, hàn gắn nút giao và gộp các bức tường thẳng hàng. Cuối cùng, tầng dựng hình WebGL bằng Three.js sẽ tự động extrude tường, khoét cửa, trát sàn vật liệu PBR và tải vào không gian 3D."*

---

## 🖥️ SLIDE 6: TRÍCH XUẤT NGỮ NGHĨA BẰNG VLM & CHUẨN HÓA KHÔNG GIAN
* **Nội dung hiển thị:**
  * Hệ tọa độ chuẩn hóa $[nx, nz] \in [0.0, 1.0]$.
  * Thiết kế Prompt BIM chuyên sâu: Phân tách rõ ràng mảng `walls`, `openings`, `rooms`, `metadata`.
  * Khả năng hiểu ngôn ngữ tiếng Việt bản địa: "Phòng Khách", "Phòng Ngủ Master", "Bếp & Ăn", "Ban công".
* 🎙️ **Lời thoại (1 phút):**
  > *"Điểm cốt lõi ở tầng AI là việc nhóm đã thiết kế một prompt chuyên sâu định dạng BIM. Thay vì để AI trả về văn bản tự do, hệ thống ép AI ánh xạ toàn bộ không gian vào hệ tọa độ chuẩn hóa từ 0 đến 1, độc lập với độ phân giải của bức ảnh chụp. Đồng thời, mô hình tự động phân loại phòng khách, phòng ngủ, bếp và xác định đúng chiều cao bậu cửa sổ, độ dày tường bao 22cm và tường ngăn 11cm."*

---

## 🖥️ SLIDE 7: TẦNG HÌNH HỌC TÍNH TOÁN (DETERMINISTIC GEOMETRY)
* **Hình ảnh minh họa:** Hình vẽ trực quan:
  * Bên trái: Nét tường AI bị xiên $2^\circ \to$ Thuật toán nắn về thẳng đứng $90^\circ$.
  * Bên phải: Hai đầu tường cách nhau $8\text{cm} \to$ Thuật toán hút chập làm một đỉnh tại trọng tâm.
* 🎙️ **Lời thoại (1.5 phút):**
  > *"Đây là trái tim thuật toán của đề tài: Thuật toán Orthogonal Snapping sẽ tính góc dốc của từng đoạn tường. Nếu góc lệch trong ngưỡng $\pm 5^\circ$ so với trục tọa độ, thuật toán sẽ tự động gán thẳng hàng tuyệt đối. Tiếp theo, thuật toán Corner Snapping sẽ quét các đầu mút tường trong bán kính sai số $\epsilon < 0.15\text{m}$ để chập làm một nút giao duy nhất. Nhờ đó, bài toán hở góc phòng hay tường bị nghiêng hoàn toàn được giải quyết triệt để bằng các phép toán giải tích cực nhẹ."*

---

## 🖥️ SLIDE 8: THUẬT TOÁN DỰNG TƯỜNG PHÂN ĐOẠN (SEGMENTED WALL EXTRUSION)
* **Hình ảnh minh họa:** Sơ đồ 4 khối hộp: Trụ trái (Left Pillar) + Bậu cửa (Sill) + Lanh-tô (Lintel) + Trụ phải (Right Pillar) ghép thành bức tường có cửa sổ.
* 🎙️ **Lời thoại (1 phút):**
  > *"Để khoét lỗ cửa trên tường, các phần mềm 3D truyền thống thường dùng phép trừ khối Boolean CSG. Tuy nhiên, phép toán này cực kỳ nặng và thường xuyên làm rách lưới đa giác khi chạy trên trình duyệt web. Nhóm đã đề xuất giải thuật 'Segmented Wall Extrusion': chia bức tường có cửa sổ thành 4 khối hộp cơ bản ghép lại gồm: hai trụ hai bên, khối bậu cửa bên dưới và khối lanh-tô bên trên. Cách tiếp cận này giúp mô hình đạt chuẩn 100% Manifold Mesh, không bao giờ bị lỗi đồ họa và thời gian sinh lưới chỉ mất vài mili-giây."*

---

## 🖥️ SLIDE 9: THIẾT LẬP THỰC NGHIỆM TRÊN 10 MẪU BENCHMARK
* **Hình ảnh minh họa:** Ảnh thu nhỏ của 10 mẫu kiểm chuẩn thực tế:
  * Biệt thự hiện đại, chung cư 2 phòng ngủ, penthouse.
  * **Đặc biệt:** Nhà phố dạng ống Việt Nam (`BM-03`), nhà cấp 4 chữ L nông thôn (`BM-06`), bản vẽ vẽ tay bằng bút mực (`BM-08`), ảnh chụp nghiêng $15^\circ$ (`BM-09`).
* 🎙️ **Lời thoại (1 phút):**
  > *"Để kiểm chứng tính khoa học, nhóm đã xây dựng một bộ kiểm chuẩn độc lập gồm 10 mẫu mặt bằng kiến trúc điển hình với 62 bức tường, 26 ô cửa và 30 phòng chức năng. Đáng chú ý, tập dữ liệu không chỉ có các bản vẽ máy tính chuẩn của phương Tây, mà còn bao gồm các dạng nhà đặc trưng của Việt Nam như nhà ống dài 18m, nhà chữ L nông thôn, và cả bản vẽ phác thảo tay bằng bút bi trên giấy học sinh."*

---

## 🖥️ SLIDE 10: BẢNG KẾT QUẢ ĐỊNH LƯỢNG (QUANTITATIVE RESULTS)
* **Nội dung hiển thị:** Bảng số liệu khoa học đo đạc từ hệ thống:
  * Độ chính xác phân đoạn trung bình (**mIoU**): **92.46%**
  * Sai số khoảng cách góc tường (**CED**): **5.19 cm**
  * Tỷ lệ toàn vẹn lưới đa giác: **100.0%**
  * Thời gian tái tạo 3D: **13.60 ms**
* 🎙️ **Lời thoại (1.5 phút):**
  > *"Kính thưa Hội đồng, đây là bảng số liệu thực nghiệm đo đạc thực tế: Độ chính xác phân đoạn phòng trung bình đạt 92.46%. Sai số khoảng cách góc tường trung bình chỉ 5.19 cm – một con số nằm hoàn toàn trong dung sai cho phép của ngành xây dựng dân dụng. Đặc biệt, tỷ lệ toàn vẹn lưới đa giác đạt tuyệt đối 100%, không xuất hiện bất kỳ lỗi đảo mặt hay hở đỉnh nào. Thời gian xử lý tái tạo hình học trung bình chỉ mất 13.6 mili-giây, hoàn toàn đáp ứng kết xuất thời gian thực trên trình duyệt."*

---

## 🖥️ SLIDE 11: SO SÁNH ĐỐI CHUẨN VỚI CÁC PHƯƠNG PHÁP QUỐC TẾ
* **Hình ảnh minh họa:** Bảng so sánh phương pháp đề tài với *Canny + Hough* và *DeepFloorplan (CNN)*.
  * mIoU cao hơn phương pháp cổ điển +34.16%.
  * Tốc độ sinh 3D nhanh hơn DeepFloorplan hơn 180 lần.
  * Chạy trực tiếp trên Web Client không cần GPU server.
* 🎙️ **Lời thoại (1 phút):**
  > *"So sánh với các phương pháp hiện có trên thế giới: So với phương pháp cổ điển Canny/Hough, giải pháp của nhóm vượt trội hơn 34% về độ chính xác mIoU và không bị lỗi khi bản vẽ có chữ đè. So với các mô hình học sâu chuyên biệt như DeepFloorplan, giải pháp của nhóm có tốc độ dựng hình nhanh hơn 180 lần và đặc biệt là người dùng bình thường có thể sử dụng trực tiếp trên máy tính xách tay hay điện thoại mà không cần máy chủ GPU đắt đỏ."*

---

## 🖥️ SLIDE 12: VIDEO / DEMO TRỰC TIẾP TRÊN PICKME3D
* **Nội dung hiển thị:** Video hoặc chuyển màn hình demo trực tiếp nền tảng PickMe3D:
  * Tải lên 1 ảnh bản vẽ 2D $\to$ AI quét trong 3 giây $\to$ Mô hình 3D hiện ra có sàn gỗ, tường sơn, cửa sổ trong suốt.
  * Bật chế độ First-Person Walkthrough: Dùng phím W-A-S-D đi dạo bên trong căn nhà.
* 🎙️ **Lời thoại (2 phút):**
  > *"Sau đây, em xin phép demo trực tiếp hệ thống đã được triển khai trên nền tảng PickMe3D: Em tải lên ảnh một bản vẽ mặt bằng nhà phố. Hệ thống tiến hành phân tích ngữ nghĩa, nắn chỉnh vector và dựng thành mô hình 3D. Như thầy cô có thể quan sát, các ô cửa sổ đều có kính trong suốt, sàn phòng khách lát đá, sàn phòng ngủ lát gỗ tự động. Người dùng có thể nhấn phím W-A-S-D để trực tiếp đi bộ tham quan bên trong ngôi nhà hoặc xuất file .GLB để mở trên Blender hay SketchUp."*

---

## 🖥️ SLIDE 13: ĐÁNH GIÁ ƯU ĐIỂM & HẠN CHẾ
* **Nội dung hiển thị:**
  * **Ưu điểm:** Độ chính xác cao, chịu được ảnh vẽ tay, tốc độ dựng cực nhanh (13.6ms), không cần cài đặt phần mềm.
  * **Hạn chế:** Hiện tại ưu tiên nắn thẳng theo hệ trực giao $90^\circ$; các công trình có tường uốn lượn cong hoặc góc chéo tự do có thể bị nắn sai lệch nhẹ bán kính.
* 🎙️ **Lời thoại (1 phút):**
  > *"Nhìn nhận một cách khách quan, ưu điểm lớn nhất của đề tài là tính ứng dụng thực tiễn cao và khả năng chịu lỗi trước các bản vẽ thực tế. Tuy nhiên, đề tài vẫn còn hạn chế: do ưu tiên hệ trực giao Manhattan $90^\circ$, đối với các công trình có tường cong lượn sóng hoặc vát góc tự do, thuật toán nắn góc có thể làm biến dạng nhẹ bán kính đường cong ban đầu."*

---

## 🖥️ SLIDE 14: KẾT LUẬN & HƯỚNG PHÁT TRIỂN
* **Nội dung hiển thị:**
  * Khẳng định hoàn thành 100% mục tiêu nghiên cứu.
  * Hướng phát triển: Tự động ghép nối công trình đa tầng (Multi-story), Tích hợp thực tế ảo tăng cường WebAR trên camera điện thoại, Xuất chuẩn BIM IFC công nghiệp.
* 🎙️ **Lời thoại (1 phút):**
  > *"Tóm lại, đề tài đã chứng minh thành công tính khả thi và hiệu quả của hướng tiếp cận lai giữa Multimodal AI và Hình học tính toán. Trong thời gian tới, nhóm dự kiến phát triển mở rộng lên công trình nhà nhiều tầng, tích hợp camera thực tế tăng cường WebAR và hỗ trợ xuất chuẩn dữ liệu BIM IFC để kết nối trực tiếp vào phần mềm Revit trong xây dựng."*

---

## 🖥️ SLIDE 15: LỜI CẢM ƠN & PHIÊN HỎI ĐÁP (Q&A)
* **Nội dung hiển thị:**
  * **XIN CHÂN THÀNH CẢM ƠN QUÝ THẦY CÔ VÀ HỘI ĐỒNG!**
  * Email liên hệ: [Email của bạn]
  * Mã nguồn dự án: GitHub PickMe3DPlatform
* 🎙️ **Lời thoại (30 giây):**
  > *"Bài báo cáo của em đến đây là kết thúc. Em xin chân thành cảm ơn quý thầy cô trong Hội đồng đã chú ý lắng nghe. Em rất mong nhận được những câu hỏi và góp ý từ thầy cô để hoàn thiện đề tài hơn nữa. Em xin trân trọng cảm ơn!"*

---

# 💡 BỘ CÂU HỎI VÀ TRẢ LỜI PHẢN BIỆN DỰ KIẾN TỪ HỘI ĐỒNG

| STT | Câu hỏi của Giám khảo | Hướng trả lời chuẩn khoa học |
|:---:|:---|:---|
| 1 | *Tại sao em không train lại mô hình YOLO hoặc Mask R-CNN mà lại dùng Multimodal VLM (Gemini)?* | **Trả lời:** "Dạ thưa thầy/cô, việc train lại một mạng CNN như Mask R-CNN đòi hỏi tập dữ liệu hàng chục nghìn ảnh có mask pixel chuẩn và tốn kém GPU hàng trăm triệu đồng, nhưng khi gặp bản vẽ vẽ tay bằng bút bi ở Việt Nam thì mô hình rất dễ bị overfit. Trong khi đó, Multimodal VLM đã được tiền huấn luyện trên dữ liệu khổng lồ toàn cầu, có khả năng hiểu ngữ nghĩa và suy luận ngữ cảnh vượt trội (như đọc hiểu chữ tiếng Việt 'P.Khách', 'Bếp'). Nghiên cứu của em tập trung vào việc: làm sao chế ngự được sai số pixel của VLM bằng toán học hình học để ứng dụng thực tế ngay trên Web mà không tốn chi phí train nặng nề." |
| 2 | *Sai số CED 5.19 cm có ý nghĩa thế nào trong thi công xây dựng?* | **Trả lời:** "Dạ thưa thầy/cô, trong thiết kế sơ phác (Architectural Concept Design), dung sai cho phép thông thường là $\pm 5\text{cm} - 10\text{cm}$ (do lớp vữa trát và độ dày gạch xây tường). Do đó, mức sai số trung bình 5.19 cm chứng minh mô hình hoàn toàn đủ độ tin cậy để tạo không gian 3D trực quan, đo đạc ước lượng diện tích và bố trí nội thất sơ bộ trước khi xuất sang bản vẽ kỹ thuật chi tiết." |
| 3 | *Thuật toán Segmented Wall Extrusion có ưu thế gì so với Three-CSG (Boolean)?* | **Trả lời:** "Dạ, thư viện Three-CSG thực hiện phép tính giao cắt không gian giữa hai tập hợp đa giác (Polygon Mesh Subtraction). Quá trình này đòi hỏi giải thuật tính toán phức tạp, dễ tạo ra các cạnh có 3 mặt chung (Non-manifold edges) hoặc các tam giác có diện tích xấp xỉ 0 (Degenerate triangles), gây lỗi nhấp nháy ánh sáng (Z-fighting) khi render. Thuật toán của em chia tường thành 4 khối hộp hình học cơ bản lồng khớp vào nhau, đảm bảo 100% các đỉnh và mặt đều tuân theo chuẩn Euler, không phát sinh bất kỳ tam giác lỗi nào và chạy nhanh gấp hàng chục lần." |


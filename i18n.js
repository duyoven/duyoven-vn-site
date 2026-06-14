/* Pantina — website i18n. Swaps page text by matching the Vietnamese source string.
   No markup changes needed: it walks text nodes once, remembers the original VI,
   and replaces with the chosen language. Persists choice in localStorage. */
(function () {
  var I18N = {
    en: {
      "Cơ chế tách khói": "Smoke separation",
      "Nguyên lý ↗": "How it works ↗",
      "Demo 3D": "3D Demo",
      "Bài viết ↗": "Article ↗",
      "Tính năng": "Features",
      "Thông số": "Specs",
      "ĐẶT HÀNG": "ORDER",
      "LÒ NƯỚNG THAN TÁCH KHÓI": "SMOKE-SEPARATING CHARCOAL GRILL",
      "Nướng than đúng vị.": "True charcoal flavour.",
      "Tách khói khỏi mẻ nướng.": "Without the smoke.",
      "Pantina tách mỡ khỏi than bằng vỉ tách dầu riêng — khói khét bị chặn từ gốc, hết ám mùi. Quạt gió cưỡng bức nhóm than trong vài phút, nướng được 4 kg thịt mỗi mẻ.": "Pantina keeps dripping fat off the charcoal with a dedicated grease tray — acrid smoke is stopped at the source, no more lingering smell. A forced-air blower lights the coals in minutes, and you can grill up to 4 kg of meat per batch.",
      "ĐẶT HÀNG NGAY": "ORDER NOW",
      "Xem lò 3D ↗": "View in 3D ↗",
      "THỊT MỖI MẺ NƯỚNG": "MEAT PER BATCH",
      "Tách khói": "Smoke split",
      "MỠ KHÔNG CHẠM THAN": "FAT NEVER TOUCHES COALS",
      "5 phút": "5 min",
      "BÉN THAN VỚI QUẠT GIÓ": "TO LIGHT COALS WITH BLOWER",
      "THÂN SẮT · SƠN CHỊU NHIỆT MỸ · VỈ INOX": "STEEL BODY · US HEAT-RESISTANT COATING · INOX GRATES",
      "Tách khói tận gốc": "Smoke stopped at the source",
      "Vỉ tách dầu inox nằm giữa vỉ nướng và than hứng toàn bộ mỡ chảy xuống. Mỡ không chạm than — không bốc khói khét, quần áo và nhà cửa không ám mùi.": "A stainless grease tray sits between the cooking grate and the coals, catching every drop of fat. Fat never reaches the charcoal — no acrid smoke, no smell clinging to clothes or home.",
      "Không cần quạt tay": "No hand fanning",
      "Quạt sò cấp gió cưỡng bức vào buồng than, có núm chỉnh tốc độ. Cắm nguồn DC 12V hoặc sạc dự phòng qua cáp Type-C — nướng giữa đồng vẫn chạy.": "A blower forces air into the charcoal chamber, with a speed dial. Run it off DC 12V or a power bank via Type-C — it works in the middle of nowhere.",
      "Gập gọn mang đi": "Folds up to travel",
      "Ống khói tháo rời, 4 chân gập sát đáy, vỉ tháo không cần dụng cụ. Từ sân nhà ra bãi dã ngoại chỉ một thùng xe.": "The chimney lifts off, all four legs fold flat, and the grates come out without tools. From your backyard to a picnic spot in one car trip.",
      "XEM TRỰC TIẾP — KHÔNG NÓI SUÔNG": "SEE IT LIVE — NOT JUST WORDS",
      "Lò nhà bạn vs Pantina — cùng mẻ thịt, khác hẳn số phận": "Your grill vs Pantina — same meat, very different fate",
      "Dõi theo từng giọt mỡ vàng rơi xuống: bên trái nó chạm than và bốc khói đen ám ngược lên thịt — bên Pantina nó trượt qua máng chữ V xuống khay hứng, sạch tuyệt đối.": "Follow each golden drop of fat: on the left it hits the coals and billows black smoke back onto the meat — on the Pantina side it slides down the V-channel into the tray, perfectly clean.",
      "LÒ NHÀ BẠN BÂY GIỜ": "YOUR GRILL TODAY",
      "Mỡ rơi vào than — khói đen ám lên thịt & người nướng": "Fat hits the coals — black smoke coats the meat & the cook",
      "PANTINA — VỈ THAN CHỮ V": "PANTINA — V-SHAPED CHARCOAL TRAY",
      "Mỡ xuống khay hứng · khói ra ống khói · thịt sạch vị": "Fat to the tray · smoke up the chimney · clean-tasting meat",
      "Giọt vàng = mỡ · cuộn xám đen = khói ám vào thịt — phía Pantina không hề có": "Gold drops = fat · grey-black wisps = smoke tainting the meat — none of it on the Pantina side",
      "Tự tay chỉnh quạt gió xem than rực ↗": "Adjust the blower and watch the coals glow ↗",
      "CƠ CHẾ TÁCH KHÓI": "SMOKE SEPARATION",
      "Khói khét sinh ra khi mỡ rơi vào than. Pantina chặn đúng chỗ đó.": "Acrid smoke is born when fat hits the coals. Pantina blocks it right there.",
      "Ba lớp vỉ xếp chồng: thịt nằm trên vỉ nướng, mỡ chảy xuống vỉ tách dầu ở giữa, than cháy sạch ở lớp dưới cùng. Phần khói than ít ỏi còn lại được ống khói hút thẳng lên cao — người đứng nướng không bị tạt khói vào mặt.": "Three stacked layers: meat on the cooking grate, fat dripping onto the grease tray in the middle, charcoal burning clean at the bottom. What little charcoal smoke remains is drawn straight up the chimney — so it never blows into the cook's face.",
      "Xem demo cơ chế trong phòng 3D ↗": "See the mechanism in the 3D room ↗",
      "Vỉ nướng inox — 2 tấm, 4 kg thịt": "Inox cooking grates — 2 plates, 4 kg of meat",
      "Thịt nướng chín bằng nhiệt than tỏa đều từ dưới lên.": "Meat cooks on even charcoal heat rising from below.",
      "Vỉ tách dầu — trái tim của lò": "Grease tray — the heart of the grill",
      "Tấm inox hứng toàn bộ mỡ nhỏ giọt. Mỡ không bao giờ chạm than → chặn khói khét từ gốc.": "A stainless plate catches every drop of fat. Fat never touches the coals → acrid smoke stopped at the source.",
      "Vỉ than — cháy sạch, tro rơi xuống khay": "Charcoal tray — clean burn, ash falls to the drawer",
      "Khay tro nằm bên trái lò, dưới ống khói — kéo ra đổ trong vài giây.": "The ash drawer sits on the left, under the chimney — pull it out and empty in seconds.",
      "PHÒNG DEMO TRỰC TUYẾN": "ONLINE DEMO ROOM",
      "Xoay, tháo lắp, nhóm lửa — ngay tại đây": "Rotate, dismantle, light it up — right here",
      "Mô hình dựng 1:1 từ file 3D gốc. Kéo để xoay, bật lửa, kéo quạt gió, tháo từng lớp vỉ — như đang đứng cạnh lò thật.": "A 1:1 model built from the original 3D file. Drag to rotate, light the fire, slide the blower, pull out each grate layer — like standing next to the real grill.",
      "Mở toàn màn hình ↗": "Open full screen ↗",
      "TÍNH NĂNG": "FEATURES",
      "Mỗi chi tiết đều có việc của nó": "Every part earns its place",
      "Cửa kính — vừa nướng vừa sưởi": "Glass door — grill and hearth in one",
      "Nhìn xuyên kính thấy than hồng rực như lò sưởi — ấm cúng cho bàn tiệc ngoài trời; mở ra gắp thêm than không cần nhấc vỉ.": "Through the glass the coals glow like a fireplace — cozy for an outdoor table; open it to add charcoal without lifting the grates.",
      "Đồng hồ nhiệt độ": "Temperature gauge",
      "Que đo cắm trong buồng nướng, đọc nhiệt thật trên mặt đồng hồ ở nắp.": "A probe in the cooking chamber reads the real temperature on the dial atop the lid.",
      "Tay gạt ống khói": "Chimney damper",
      "Mở cho lửa cháy mạnh, đóng bớt để giữ nhiệt khi nướng chậm.": "Open for a strong fire, close it down to hold heat for slow cooking.",
      "Nắp đậy hun khói": "Smoking lid",
      "Đậy nắp chuyển sang chế độ hun khói giữ nhiệt, lật mở khi nướng trực tiếp.": "Close the lid for heat-retaining smoking mode, flip it open to grill directly.",
      "Quạt sò + núm chỉnh": "Blower + speed dial",
      "Gió cưỡng bức nhóm than nhanh, chỉnh độ mạnh theo từng món.": "Forced air lights the coals fast; dial the strength to suit each dish.",
      "Nguồn DC 12V / Type-C": "DC 12V / Type-C power",
      "Chạy bằng sạc dự phòng — nướng dã ngoại không cần ổ điện.": "Runs off a power bank — picnic grilling with no outlet needed.",
      "Tháo lắp không dụng cụ": "Tool-free assembly",
      "Vỉ nướng → vỉ tách dầu → vỉ than nhấc ra theo thứ tự, rửa với nước rửa chén.": "Cooking grate → grease tray → charcoal tray lift out in order, wash with dish soap.",
      "Đen huyền toàn thân": "All-over jet black",
      "Sơn chịu nhiệt Mỹ đen huyền bóng nhẹ — bền ngoài trời, càng dùng càng sâu màu.": "US heat-resistant coating in soft-gloss jet black — weatherproof outdoors, deepening in colour with use.",
      "THÔNG SỐ KỸ THUẬT": "TECHNICAL SPECS",
      "Vừa ban công,": "Fits a balcony,",
      "đủ cho bàn tiệc": "feeds a feast",
      "Thân lò sắt sơn tĩnh điện chịu nhiệt chuẩn Mỹ, toàn bộ vỉ và chi tiết tiếp xúc thực phẩm bằng inox.": "Steel body with US-standard heat-resistant powder coating; all grates and food-contact parts are stainless steel.",
      "Đen huyền — sơn chịu nhiệt Mỹ": "Jet black — US heat-resistant coating",
      "Kích thước (cả ống khói)": "Dimensions (with chimney)",
      "Mặt vỉ nướng (2 vỉ inox)": "Cooking surface (2 inox grates)",
      "Sức chứa thịt tối đa": "Max meat capacity",
      "4 kg / mẻ": "4 kg / batch",
      "Lượng than khuyên dùng": "Recommended charcoal",
      "Nguồn quạt gió": "Blower power",
      "Vật liệu thân lò": "Body material",
      "Sắt, sơn chịu nhiệt Mỹ": "Steel, US heat-resistant coating",
      "Vỉ & chi tiết tiếp xúc thực phẩm": "Grates & food-contact parts",
      "Inox": "Stainless steel",
      "Vận chuyển": "Transport",
      "Ống khói tháo rời · chân gập": "Removable chimney · folding legs",
      "ĐẶT HÀNG · GIAO TOÀN QUỐC": "ORDER · NATIONWIDE DELIVERY",
      "Mẻ nướng cuối tuần này,": "This weekend's grill,",
      "không còn ai phải né khói": "no one dodging the smoke",
      "Nhắn tin hoặc gọi trực tiếp cho Duy's Oven để nhận báo giá, xem lò thật và đặt giao tận nơi.": "Message or call Duy's Oven for a quote, to see the grill in person, and arrange delivery to your door.",
      "GỌI 0901 691 717": "CALL 0901 691 717",
      "Nhắn Zalo": "Message on Zalo",
      "Bảo hành thân lò 12 tháng · Hướng dẫn nhóm lò & vệ sinh kèm máy": "12-month body warranty · Lighting & cleaning guide included",
      "PANTINA — LÒ NƯỚNG THAN TÁCH KHÓI": "PANTINA — SMOKE-SEPARATING CHARCOAL GRILL",
      "Phòng demo 3D ↗": "3D demo room ↗"
    },
    zh: {
      "Cơ chế tách khói": "分烟原理",
      "Nguyên lý ↗": "工作原理 ↗",
      "Demo 3D": "3D 演示",
      "Bài viết ↗": "文章 ↗",
      "Tính năng": "功能",
      "Thông số": "规格",
      "ĐẶT HÀNG": "立即订购",
      "LÒ NƯỚNG THAN TÁCH KHÓI": "分烟炭火烤炉",
      "Nướng than đúng vị.": "正宗炭烤风味。",
      "Tách khói khỏi mẻ nướng.": "却没有油烟。",
      "Pantina tách mỡ khỏi than bằng vỉ tách dầu riêng — khói khét bị chặn từ gốc, hết ám mùi. Quạt gió cưỡng bức nhóm than trong vài phút, nướng được 4 kg thịt mỗi mẻ.": "Pantina 用独立的隔油盘把油脂挡在炭火之外——刺鼻油烟从源头被切断，不再满身烟味。强制送风风机几分钟点燃炭火，每次可烤 4 公斤肉。",
      "ĐẶT HÀNG NGAY": "立即订购",
      "Xem lò 3D ↗": "查看 3D 烤炉 ↗",
      "THỊT MỖI MẺ NƯỚNG": "每次烤肉量",
      "Tách khói": "分烟",
      "MỠ KHÔNG CHẠM THAN": "油脂不接触炭火",
      "5 phút": "5 分钟",
      "BÉN THAN VỚI QUẠT GIÓ": "送风点燃炭火",
      "THÂN SẮT · SƠN CHỊU NHIỆT MỸ · VỈ INOX": "钢制炉身 · 美国耐高温涂层 · 不锈钢烤网",
      "Tách khói tận gốc": "从源头分离油烟",
      "Vỉ tách dầu inox nằm giữa vỉ nướng và than hứng toàn bộ mỡ chảy xuống. Mỡ không chạm than — không bốc khói khét, quần áo và nhà cửa không ám mùi.": "不锈钢隔油盘位于烤网与炭火之间，接住每一滴油脂。油脂不接触炭火——没有刺鼻油烟，衣物和家里都不沾烟味。",
      "Không cần quạt tay": "无需手动扇风",
      "Quạt sò cấp gió cưỡng bức vào buồng than, có núm chỉnh tốc độ. Cắm nguồn DC 12V hoặc sạc dự phòng qua cáp Type-C — nướng giữa đồng vẫn chạy.": "涡轮风机向炭仓强制送风，带调速旋钮。可用 DC 12V 或移动电源经 Type-C 供电——在野外也照样运行。",
      "Gập gọn mang đi": "折叠便携",
      "Ống khói tháo rời, 4 chân gập sát đáy, vỉ tháo không cần dụng cụ. Từ sân nhà ra bãi dã ngoại chỉ một thùng xe.": "烟囱可拆，四条腿折叠贴底，烤网免工具拆卸。从自家院子到野餐地，一趟车就搞定。",
      "XEM TRỰC TIẾP — KHÔNG NÓI SUÔNG": "现场演示 · 绝非空谈",
      "Lò nhà bạn vs Pantina — cùng mẻ thịt, khác hẳn số phận": "你的烤炉 vs Pantina——同样的肉，截然不同的结局",
      "Dõi theo từng giọt mỡ vàng rơi xuống: bên trái nó chạm than và bốc khói đen ám ngược lên thịt — bên Pantina nó trượt qua máng chữ V xuống khay hứng, sạch tuyệt đối.": "盯住每一滴金黄油脂：左边它落到炭上腾起黑烟、反扑到肉上——Pantina 这边它顺着 V 形槽滑入接油盘，干净彻底。",
      "LÒ NHÀ BẠN BÂY GIỜ": "你现在的烤炉",
      "Mỡ rơi vào than — khói đen ám lên thịt & người nướng": "油脂落入炭火——黑烟熏到肉和烤肉的人",
      "PANTINA — VỈ THAN CHỮ V": "PANTINA — V 形炭盘",
      "Mỡ xuống khay hứng · khói ra ống khói · thịt sạch vị": "油脂入接盘 · 烟走烟囱 · 肉味纯净",
      "Giọt vàng = mỡ · cuộn xám đen = khói ám vào thịt — phía Pantina không hề có": "金色 = 油脂 · 灰黑色 = 熏肉的油烟——Pantina 这边完全没有",
      "Tự tay chỉnh quạt gió xem than rực ↗": "亲手调风机，看炭火通红 ↗",
      "CƠ CHẾ TÁCH KHÓI": "分烟原理",
      "Khói khét sinh ra khi mỡ rơi vào than. Pantina chặn đúng chỗ đó.": "刺鼻油烟来自油脂落入炭火。Pantina 正是在这一步把它挡住。",
      "Ba lớp vỉ xếp chồng: thịt nằm trên vỉ nướng, mỡ chảy xuống vỉ tách dầu ở giữa, than cháy sạch ở lớp dưới cùng. Phần khói than ít ỏi còn lại được ống khói hút thẳng lên cao — người đứng nướng không bị tạt khói vào mặt.": "三层叠放：肉在烤网上，油脂滴落到中间的隔油盘，炭火在最底层洁净燃烧。剩下的少量炭烟被烟囱直接抽向高处——不会扑到烤肉人脸上。",
      "Xem demo cơ chế trong phòng 3D ↗": "在 3D 演示室查看原理 ↗",
      "Vỉ nướng inox — 2 tấm, 4 kg thịt": "不锈钢烤网——2 片，4 公斤肉",
      "Thịt nướng chín bằng nhiệt than tỏa đều từ dưới lên.": "肉靠自下而上均匀的炭火热量烤熟。",
      "Vỉ tách dầu — trái tim của lò": "隔油盘——烤炉的核心",
      "Tấm inox hứng toàn bộ mỡ nhỏ giọt. Mỡ không bao giờ chạm than → chặn khói khét từ gốc.": "不锈钢板接住所有滴落油脂。油脂绝不接触炭火 → 从源头切断刺鼻油烟。",
      "Vỉ than — cháy sạch, tro rơi xuống khay": "炭盘——洁净燃烧，灰烬落入抽屉",
      "Khay tro nằm bên trái lò, dưới ống khói — kéo ra đổ trong vài giây.": "灰盒位于炉子左侧、烟囱下方——抽出几秒倒掉。",
      "PHÒNG DEMO TRỰC TUYẾN": "在线演示室",
      "Xoay, tháo lắp, nhóm lửa — ngay tại đây": "旋转、拆装、点火——就在这里",
      "Mô hình dựng 1:1 từ file 3D gốc. Kéo để xoay, bật lửa, kéo quạt gió, tháo từng lớp vỉ — như đang đứng cạnh lò thật.": "按原始 3D 文件 1:1 还原。拖动旋转、点火、调风机、逐层抽出烤网——如同站在真炉旁。",
      "Mở toàn màn hình ↗": "全屏打开 ↗",
      "TÍNH NĂNG": "功能",
      "Mỗi chi tiết đều có việc của nó": "每个细节都各司其职",
      "Cửa kính — vừa nướng vừa sưởi": "玻璃门——边烤边取暖",
      "Nhìn xuyên kính thấy than hồng rực như lò sưởi — ấm cúng cho bàn tiệc ngoài trời; mở ra gắp thêm than không cần nhấc vỉ.": "透过玻璃看炭火通红如壁炉——为户外餐桌增添暖意；打开即可添炭，无需抬起烤网。",
      "Đồng hồ nhiệt độ": "温度表",
      "Que đo cắm trong buồng nướng, đọc nhiệt thật trên mặt đồng hồ ở nắp.": "探针插入烤膛，盖顶表盘读取真实温度。",
      "Tay gạt ống khói": "烟囱风门",
      "Mở cho lửa cháy mạnh, đóng bớt để giữ nhiệt khi nướng chậm.": "开大火力旺，关小则保温慢烤。",
      "Nắp đậy hun khói": "熏烤盖",
      "Đậy nắp chuyển sang chế độ hun khói giữ nhiệt, lật mở khi nướng trực tiếp.": "盖上转入保温熏烤模式，掀开则直接明火烤。",
      "Quạt sò + núm chỉnh": "涡轮风机 + 调速旋钮",
      "Gió cưỡng bức nhóm than nhanh, chỉnh độ mạnh theo từng món.": "强制送风快速点炭，按菜式调节风力。",
      "Nguồn DC 12V / Type-C": "DC 12V / Type-C 供电",
      "Chạy bằng sạc dự phòng — nướng dã ngoại không cần ổ điện.": "可用移动电源——野餐烧烤无需插座。",
      "Tháo lắp không dụng cụ": "免工具拆装",
      "Vỉ nướng → vỉ tách dầu → vỉ than nhấc ra theo thứ tự, rửa với nước rửa chén.": "烤网 → 隔油盘 → 炭盘按序取出，用洗洁精清洗。",
      "Đen huyền toàn thân": "通体玄黑",
      "Sơn chịu nhiệt Mỹ đen huyền bóng nhẹ — bền ngoài trời, càng dùng càng sâu màu.": "美国耐高温涂层，玄黑微光——户外耐用，越用色泽越深。",
      "THÔNG SỐ KỸ THUẬT": "技术规格",
      "Vừa ban công,": "阳台放得下，",
      "đủ cho bàn tiệc": "宴席够得用",
      "Thân lò sắt sơn tĩnh điện chịu nhiệt chuẩn Mỹ, toàn bộ vỉ và chi tiết tiếp xúc thực phẩm bằng inox.": "钢制炉身采用美标耐高温静电喷涂，所有烤网及接触食物的部件均为不锈钢。",
      "Đen huyền — sơn chịu nhiệt Mỹ": "玄黑 — 美国耐高温涂层",
      "Kích thước (cả ống khói)": "尺寸（含烟囱）",
      "Mặt vỉ nướng (2 vỉ inox)": "烤面（2 片不锈钢网）",
      "Sức chứa thịt tối đa": "最大装肉量",
      "4 kg / mẻ": "4 公斤/次",
      "Lượng than khuyên dùng": "建议用炭量",
      "Nguồn quạt gió": "风机电源",
      "Vật liệu thân lò": "炉身材质",
      "Sắt, sơn chịu nhiệt Mỹ": "钢，美国耐高温涂层",
      "Vỉ & chi tiết tiếp xúc thực phẩm": "烤网及接触食物部件",
      "Inox": "不锈钢",
      "Vận chuyển": "便携",
      "Ống khói tháo rời · chân gập": "可拆烟囱 · 折叠腿",
      "ĐẶT HÀNG · GIAO TOÀN QUỐC": "订购 · 全国配送",
      "Mẻ nướng cuối tuần này,": "这个周末的烧烤，",
      "không còn ai phải né khói": "再没人要躲油烟",
      "Nhắn tin hoặc gọi trực tiếp cho Duy's Oven để nhận báo giá, xem lò thật và đặt giao tận nơi.": "发信息或致电 Duy's Oven 获取报价、看实物并安排送货上门。",
      "GỌI 0901 691 717": "致电 0901 691 717",
      "Nhắn Zalo": "Zalo 留言",
      "Bảo hành thân lò 12 tháng · Hướng dẫn nhóm lò & vệ sinh kèm máy": "炉身保修 12 个月 · 随机附点炉与清洁指南",
      "PANTINA — LÒ NƯỚNG THAN TÁCH KHÓI": "PANTINA — 分烟炭火烤炉",
      "Phòng demo 3D ↗": "3D 演示室 ↗"
    },
    ko: {
      "Cơ chế tách khói": "연기 분리 원리",
      "Nguyên lý ↗": "작동 원리 ↗",
      "Demo 3D": "3D 데모",
      "Bài viết ↗": "글 ↗",
      "Tính năng": "기능",
      "Thông số": "사양",
      "ĐẶT HÀNG": "주문하기",
      "LÒ NƯỚNG THAN TÁCH KHÓI": "연기 분리 숯불 그릴",
      "Nướng than đúng vị.": "진짜 숯불 풍미.",
      "Tách khói khỏi mẻ nướng.": "연기는 없이.",
      "Pantina tách mỡ khỏi than bằng vỉ tách dầu riêng — khói khét bị chặn từ gốc, hết ám mùi. Quạt gió cưỡng bức nhóm than trong vài phút, nướng được 4 kg thịt mỗi mẻ.": "Pantina는 전용 기름받이로 기름을 숯에서 분리해 매캐한 연기를 근본부터 차단합니다. 냄새 밸 일이 없죠. 송풍 팬이 몇 분 만에 숯에 불을 붙이고, 한 번에 고기 4 kg까지 구울 수 있습니다.",
      "ĐẶT HÀNG NGAY": "지금 주문하기",
      "Xem lò 3D ↗": "3D로 보기 ↗",
      "THỊT MỖI MẺ NƯỚNG": "1회 굽는 고기",
      "Tách khói": "연기 분리",
      "MỠ KHÔNG CHẠM THAN": "기름이 숯에 닿지 않음",
      "5 phút": "5 분",
      "BÉN THAN VỚI QUẠT GIÓ": "송풍으로 숯 점화",
      "THÂN SẮT · SƠN CHỊU NHIỆT MỸ · VỈ INOX": "강철 본체 · 미국산 내열 도장 · 스테인리스 그릴",
      "Tách khói tận gốc": "근본부터 연기 차단",
      "Vỉ tách dầu inox nằm giữa vỉ nướng và than hứng toàn bộ mỡ chảy xuống. Mỡ không chạm than — không bốc khói khét, quần áo và nhà cửa không ám mùi.": "스테인리스 기름받이가 석쇠와 숯 사이에서 떨어지는 기름을 모두 받아냅니다. 기름이 숯에 닿지 않아 매캐한 연기가 없고 옷과 집에 냄새가 배지 않습니다.",
      "Không cần quạt tay": "부채질이 필요 없음",
      "Quạt sò cấp gió cưỡng bức vào buồng than, có núm chỉnh tốc độ. Cắm nguồn DC 12V hoặc sạc dự phòng qua cáp Type-C — nướng giữa đồng vẫn chạy.": "송풍 팬이 숯 챔버로 강제 송풍하며 속도 조절 노브가 있습니다. DC 12V나 보조배터리를 Type-C로 연결해 사용 — 야외 한복판에서도 작동합니다.",
      "Gập gọn mang đi": "접어서 휴대",
      "Ống khói tháo rời, 4 chân gập sát đáy, vỉ tháo không cần dụng cụ. Từ sân nhà ra bãi dã ngoại chỉ một thùng xe.": "굴뚝은 분리되고 네 다리는 바닥에 납작하게 접히며 그릴은 공구 없이 빠집니다. 집 마당에서 피크닉 장소까지 차 한 번이면 됩니다.",
      "XEM TRỰC TIẾP — KHÔNG NÓI SUÔNG": "직접 확인 — 말뿐이 아닙니다",
      "Lò nhà bạn vs Pantina — cùng mẻ thịt, khác hẳn số phận": "당신의 그릴 vs Pantina — 같은 고기, 전혀 다른 결말",
      "Dõi theo từng giọt mỡ vàng rơi xuống: bên trái nó chạm than và bốc khói đen ám ngược lên thịt — bên Pantina nó trượt qua máng chữ V xuống khay hứng, sạch tuyệt đối.": "황금빛 기름 한 방울을 따라가 보세요. 왼쪽은 숯에 닿아 검은 연기가 고기로 되돌아옵니다 — Pantina 쪽은 V자 홈을 타고 받침대로 흘러내려 완벽하게 깨끗합니다.",
      "LÒ NHÀ BẠN BÂY GIỜ": "지금 당신의 그릴",
      "Mỡ rơi vào than — khói đen ám lên thịt & người nướng": "기름이 숯에 떨어져 — 검은 연기가 고기와 굽는 사람을 뒤덮음",
      "PANTINA — VỈ THAN CHỮ V": "PANTINA — V자 숯 트레이",
      "Mỡ xuống khay hứng · khói ra ống khói · thịt sạch vị": "기름은 받침대로 · 연기는 굴뚝으로 · 깨끗한 고기 맛",
      "Giọt vàng = mỡ · cuộn xám đen = khói ám vào thịt — phía Pantina không hề có": "금빛 방울 = 기름 · 회흑색 연기 = 고기를 오염시키는 연기 — Pantina 쪽엔 전혀 없음",
      "Tự tay chỉnh quạt gió xem than rực ↗": "직접 송풍을 조절해 숯불이 달아오르는 걸 보세요 ↗",
      "CƠ CHẾ TÁCH KHÓI": "연기 분리 원리",
      "Khói khét sinh ra khi mỡ rơi vào than. Pantina chặn đúng chỗ đó.": "매캐한 연기는 기름이 숯에 떨어질 때 생깁니다. Pantina는 바로 그 지점을 막습니다.",
      "Ba lớp vỉ xếp chồng: thịt nằm trên vỉ nướng, mỡ chảy xuống vỉ tách dầu ở giữa, than cháy sạch ở lớp dưới cùng. Phần khói than ít ỏi còn lại được ống khói hút thẳng lên cao — người đứng nướng không bị tạt khói vào mặt.": "세 겹으로 쌓인 구조: 고기는 석쇠 위, 기름은 중간의 기름받이로, 숯은 맨 아래에서 깨끗하게 탑니다. 남은 약간의 숯 연기는 굴뚝으로 곧장 빠져나가 굽는 사람 얼굴로 날아오지 않습니다.",
      "Xem demo cơ chế trong phòng 3D ↗": "3D 룸에서 작동을 확인하세요 ↗",
      "Vỉ nướng inox — 2 tấm, 4 kg thịt": "스테인리스 석쇠 — 2장, 고기 4 kg",
      "Thịt nướng chín bằng nhiệt than tỏa đều từ dưới lên.": "아래에서 고르게 올라오는 숯불 열로 고기가 익습니다.",
      "Vỉ tách dầu — trái tim của lò": "기름받이 — 그릴의 심장",
      "Tấm inox hứng toàn bộ mỡ nhỏ giọt. Mỡ không bao giờ chạm than → chặn khói khét từ gốc.": "스테인리스 판이 떨어지는 기름을 전부 받아냅니다. 기름이 숯에 닿지 않아 → 매캐한 연기를 근본부터 차단합니다.",
      "Vỉ than — cháy sạch, tro rơi xuống khay": "숯 트레이 — 깨끗하게 연소, 재는 서랍으로",
      "Khay tro nằm bên trái lò, dưới ống khói — kéo ra đổ trong vài giây.": "재 서랍은 굴뚝 아래 왼쪽에 있어 — 빼서 몇 초면 비웁니다.",
      "PHÒNG DEMO TRỰC TUYẾN": "온라인 데모 룸",
      "Xoay, tháo lắp, nhóm lửa — ngay tại đây": "돌리고, 분해하고, 불을 붙여보세요 — 바로 여기서",
      "Mô hình dựng 1:1 từ file 3D gốc. Kéo để xoay, bật lửa, kéo quạt gió, tháo từng lớp vỉ — như đang đứng cạnh lò thật.": "원본 3D 파일로 만든 1:1 모델. 끌어서 돌리고, 불을 켜고, 송풍을 조절하고, 그릴을 층층이 빼보세요 — 실제 그릴 옆에 선 것처럼.",
      "Mở toàn màn hình ↗": "전체 화면으로 열기 ↗",
      "TÍNH NĂNG": "기능",
      "Mỗi chi tiết đều có việc của nó": "모든 부품에 제 역할이 있습니다",
      "Cửa kính — vừa nướng vừa sưởi": "유리문 — 굽기와 난방을 한 번에",
      "Nhìn xuyên kính thấy than hồng rực như lò sưởi — ấm cúng cho bàn tiệc ngoài trời; mở ra gắp thêm than không cần nhấc vỉ.": "유리 너머로 숯이 벽난로처럼 빨갛게 빛납니다 — 야외 식탁을 따뜻하게; 열면 석쇠를 들지 않고 숯을 더 넣을 수 있습니다.",
      "Đồng hồ nhiệt độ": "온도계",
      "Que đo cắm trong buồng nướng, đọc nhiệt thật trên mặt đồng hồ ở nắp.": "조리실에 꽂힌 탐침이 뚜껑 위 다이얼에 실제 온도를 표시합니다.",
      "Tay gạt ống khói": "굴뚝 댐퍼",
      "Mở cho lửa cháy mạnh, đóng bớt để giữ nhiệt khi nướng chậm.": "열면 불이 세지고, 닫으면 열을 가둬 천천히 익힙니다.",
      "Nắp đậy hun khói": "훈연 뚜껑",
      "Đậy nắp chuyển sang chế độ hun khói giữ nhiệt, lật mở khi nướng trực tiếp.": "뚜껑을 덮으면 보온 훈연 모드, 열면 직화 구이로 전환됩니다.",
      "Quạt sò + núm chỉnh": "송풍 팬 + 속도 노브",
      "Gió cưỡng bức nhóm than nhanh, chỉnh độ mạnh theo từng món.": "강제 송풍으로 숯을 빠르게 피우고, 요리에 맞춰 세기를 조절합니다.",
      "Nguồn DC 12V / Type-C": "DC 12V / Type-C 전원",
      "Chạy bằng sạc dự phòng — nướng dã ngoại không cần ổ điện.": "보조배터리로 작동 — 콘센트 없이 피크닉 구이.",
      "Tháo lắp không dụng cụ": "공구 없이 분해·조립",
      "Vỉ nướng → vỉ tách dầu → vỉ than nhấc ra theo thứ tự, rửa với nước rửa chén.": "석쇠 → 기름받이 → 숯 트레이 순서로 빼내 주방세제로 세척합니다.",
      "Đen huyền toàn thân": "전체 칠흑 블랙",
      "Sơn chịu nhiệt Mỹ đen huyền bóng nhẹ — bền ngoài trời, càng dùng càng sâu màu.": "미국산 내열 도장의 은은한 광택 칠흑색 — 야외에서도 튼튼하고, 쓸수록 색이 깊어집니다.",
      "THÔNG SỐ KỸ THUẬT": "기술 사양",
      "Vừa ban công,": "발코니에 딱,",
      "đủ cho bàn tiệc": "잔칫상엔 충분",
      "Thân lò sắt sơn tĩnh điện chịu nhiệt chuẩn Mỹ, toàn bộ vỉ và chi tiết tiếp xúc thực phẩm bằng inox.": "미국 표준 내열 분체도장을 입힌 강철 본체, 모든 그릴과 식품 접촉 부품은 스테인리스입니다.",
      "Đen huyền — sơn chịu nhiệt Mỹ": "칠흑 블랙 — 미국산 내열 도장",
      "Kích thước (cả ống khói)": "크기 (굴뚝 포함)",
      "Mặt vỉ nướng (2 vỉ inox)": "조리면 (스테인리스 그릴 2장)",
      "Sức chứa thịt tối đa": "최대 고기 용량",
      "4 kg / mẻ": "4 kg / 회",
      "Lượng than khuyên dùng": "권장 숯 양",
      "Nguồn quạt gió": "송풍 팬 전원",
      "Vật liệu thân lò": "본체 소재",
      "Sắt, sơn chịu nhiệt Mỹ": "강철, 미국산 내열 도장",
      "Vỉ & chi tiết tiếp xúc thực phẩm": "그릴 및 식품 접촉 부품",
      "Inox": "스테인리스",
      "Vận chuyển": "운반",
      "Ống khói tháo rời · chân gập": "분리형 굴뚝 · 접이식 다리",
      "ĐẶT HÀNG · GIAO TOÀN QUỐC": "주문 · 전국 배송",
      "Mẻ nướng cuối tuần này,": "이번 주말 바비큐,",
      "không còn ai phải né khói": "이제 아무도 연기를 피하지 않아도",
      "Nhắn tin hoặc gọi trực tiếp cho Duy's Oven để nhận báo giá, xem lò thật và đặt giao tận nơi.": "Duy's Oven에 메시지나 전화로 견적 문의, 실물 확인, 집까지 배송 예약을 하세요.",
      "GỌI 0901 691 717": "전화 0901 691 717",
      "Nhắn Zalo": "Zalo 메시지",
      "Bảo hành thân lò 12 tháng · Hướng dẫn nhóm lò & vệ sinh kèm máy": "본체 12개월 보증 · 점화 및 청소 가이드 동봉",
      "PANTINA — LÒ NƯỚNG THAN TÁCH KHÓI": "PANTINA — 연기 분리 숯불 그릴",
      "Phòng demo 3D ↗": "3D 데모 룸 ↗"
    },
    de: {
      "Cơ chế tách khói": "Rauchtrennung",
      "Nguyên lý ↗": "Funktionsweise ↗",
      "Demo 3D": "3D-Demo",
      "Bài viết ↗": "Artikel ↗",
      "Tính năng": "Funktionen",
      "Thông số": "Technische Daten",
      "ĐẶT HÀNG": "BESTELLEN",
      "LÒ NƯỚNG THAN TÁCH KHÓI": "RAUCHTRENNENDER HOLZKOHLEGRILL",
      "Nướng than đúng vị.": "Echter Holzkohlegeschmack.",
      "Tách khói khỏi mẻ nướng.": "Ganz ohne Qualm.",
      "Pantina tách mỡ khỏi than bằng vỉ tách dầu riêng — khói khét bị chặn từ gốc, hết ám mùi. Quạt gió cưỡng bức nhóm than trong vài phút, nướng được 4 kg thịt mỗi mẻ.": "Pantina hält tropfendes Fett mit einer eigenen Fettauffangschale von der Glut fern — beißender Qualm wird an der Quelle gestoppt, kein hartnäckiger Geruch mehr. Ein Gebläse entfacht die Kohlen in Minuten, und du grillst bis zu 4 kg Fleisch pro Durchgang.",
      "ĐẶT HÀNG NGAY": "JETZT BESTELLEN",
      "Xem lò 3D ↗": "In 3D ansehen ↗",
      "THỊT MỖI MẺ NƯỚNG": "FLEISCH PRO DURCHGANG",
      "Tách khói": "Rauchtrennung",
      "MỠ KHÔNG CHẠM THAN": "FETT BERÜHRT DIE GLUT NIE",
      "5 phút": "5 Min.",
      "BÉN THAN VỚI QUẠT GIÓ": "KOHLE MIT GEBLÄSE ENTFACHT",
      "THÂN SẮT · SƠN CHỊU NHIỆT MỸ · VỈ INOX": "STAHLKORPUS · US-HITZEBESTÄNDIGE BESCHICHTUNG · EDELSTAHLROSTE",
      "Tách khói tận gốc": "Rauch an der Quelle gestoppt",
      "Vỉ tách dầu inox nằm giữa vỉ nướng và than hứng toàn bộ mỡ chảy xuống. Mỡ không chạm than — không bốc khói khét, quần áo và nhà cửa không ám mùi.": "Eine Edelstahl-Fettschale sitzt zwischen Grillrost und Glut und fängt jeden Tropfen Fett auf. Fett erreicht die Kohle nie — kein beißender Qualm, kein Geruch in Kleidung oder Wohnung.",
      "Không cần quạt tay": "Kein Fächeln nötig",
      "Quạt sò cấp gió cưỡng bức vào buồng than, có núm chỉnh tốc độ. Cắm nguồn DC 12V hoặc sạc dự phòng qua cáp Type-C — nướng giữa đồng vẫn chạy.": "Ein Gebläse drückt Luft in die Kohlekammer, mit Drehregler. Betrieb über DC 12V oder Powerbank per Type-C — läuft auch mitten im Nirgendwo.",
      "Gập gọn mang đi": "Zusammenklappbar",
      "Ống khói tháo rời, 4 chân gập sát đáy, vỉ tháo không cần dụng cụ. Từ sân nhà ra bãi dã ngoại chỉ một thùng xe.": "Der Kamin lässt sich abnehmen, alle vier Beine klappen flach, die Roste kommen werkzeuglos heraus. Vom Garten zum Picknickplatz in einer Autofahrt.",
      "XEM TRỰC TIẾP — KHÔNG NÓI SUÔNG": "LIVE SEHEN — KEINE LEEREN WORTE",
      "Lò nhà bạn vs Pantina — cùng mẻ thịt, khác hẳn số phận": "Dein Grill vs. Pantina — gleiches Fleisch, ganz anderes Schicksal",
      "Dõi theo từng giọt mỡ vàng rơi xuống: bên trái nó chạm than và bốc khói đen ám ngược lên thịt — bên Pantina nó trượt qua máng chữ V xuống khay hứng, sạch tuyệt đối.": "Verfolge jeden goldenen Fetttropfen: links trifft er die Glut und wirft schwarzen Qualm zurück aufs Fleisch — auf der Pantina-Seite gleitet er durch die V-Rinne in die Schale, makellos sauber.",
      "LÒ NHÀ BẠN BÂY GIỜ": "DEIN GRILL HEUTE",
      "Mỡ rơi vào than — khói đen ám lên thịt & người nướng": "Fett trifft die Glut — schwarzer Qualm umhüllt Fleisch & Koch",
      "PANTINA — VỈ THAN CHỮ V": "PANTINA — V-FÖRMIGE KOHLESCHALE",
      "Mỡ xuống khay hứng · khói ra ống khói · thịt sạch vị": "Fett in die Schale · Rauch durch den Kamin · reiner Fleischgeschmack",
      "Giọt vàng = mỡ · cuộn xám đen = khói ám vào thịt — phía Pantina không hề có": "Goldtropfen = Fett · grauschwarze Schwaden = Rauch, der das Fleisch verdirbt — auf der Pantina-Seite nichts davon",
      "Tự tay chỉnh quạt gió xem than rực ↗": "Gebläse selbst regeln und die Glut aufglühen sehen ↗",
      "CƠ CHẾ TÁCH KHÓI": "RAUCHTRENNUNG",
      "Khói khét sinh ra khi mỡ rơi vào than. Pantina chặn đúng chỗ đó.": "Beißender Qualm entsteht, wenn Fett auf die Glut trifft. Pantina blockiert ihn genau dort.",
      "Ba lớp vỉ xếp chồng: thịt nằm trên vỉ nướng, mỡ chảy xuống vỉ tách dầu ở giữa, than cháy sạch ở lớp dưới cùng. Phần khói than ít ỏi còn lại được ống khói hút thẳng lên cao — người đứng nướng không bị tạt khói vào mặt.": "Drei gestapelte Schichten: Fleisch auf dem Rost, Fett tropft auf die Fettschale in der Mitte, Holzkohle brennt unten sauber. Der wenige verbleibende Kohlerauch zieht direkt durch den Kamin nach oben — er weht dem Koch nie ins Gesicht.",
      "Xem demo cơ chế trong phòng 3D ↗": "Den Mechanismus im 3D-Raum ansehen ↗",
      "Vỉ nướng inox — 2 tấm, 4 kg thịt": "Edelstahlroste — 2 Platten, 4 kg Fleisch",
      "Thịt nướng chín bằng nhiệt than tỏa đều từ dưới lên.": "Das Fleisch gart über gleichmäßige Gluthitze von unten.",
      "Vỉ tách dầu — trái tim của lò": "Fettschale — das Herz des Grills",
      "Tấm inox hứng toàn bộ mỡ nhỏ giọt. Mỡ không bao giờ chạm than → chặn khói khét từ gốc.": "Eine Edelstahlplatte fängt jeden Fetttropfen auf. Fett berührt die Glut nie → beißender Qualm an der Quelle gestoppt.",
      "Vỉ than — cháy sạch, tro rơi xuống khay": "Kohleschale — sauberer Abbrand, Asche fällt in die Lade",
      "Khay tro nằm bên trái lò, dưới ống khói — kéo ra đổ trong vài giây.": "Die Aschelade sitzt links unter dem Kamin — herausziehen und in Sekunden leeren.",
      "PHÒNG DEMO TRỰC TUYẾN": "ONLINE-DEMORAUM",
      "Xoay, tháo lắp, nhóm lửa — ngay tại đây": "Drehen, zerlegen, anzünden — direkt hier",
      "Mô hình dựng 1:1 từ file 3D gốc. Kéo để xoay, bật lửa, kéo quạt gió, tháo từng lớp vỉ — như đang đứng cạnh lò thật.": "Ein 1:1-Modell aus der originalen 3D-Datei. Ziehen zum Drehen, Feuer entfachen, Gebläse schieben, jede Rostschicht herausziehen — als stündest du am echten Grill.",
      "Mở toàn màn hình ↗": "Vollbild öffnen ↗",
      "TÍNH NĂNG": "FUNKTIONEN",
      "Mỗi chi tiết đều có việc của nó": "Jedes Teil hat seine Aufgabe",
      "Cửa kính — vừa nướng vừa sưởi": "Glastür — Grill und Wärmequelle zugleich",
      "Nhìn xuyên kính thấy than hồng rực như lò sưởi — ấm cúng cho bàn tiệc ngoài trời; mở ra gắp thêm than không cần nhấc vỉ.": "Durch das Glas glüht die Kohle wie ein Kamin — gemütlich für die Tafel im Freien; öffnen, um Kohle nachzulegen, ohne die Roste anzuheben.",
      "Đồng hồ nhiệt độ": "Temperaturanzeige",
      "Que đo cắm trong buồng nướng, đọc nhiệt thật trên mặt đồng hồ ở nắp.": "Ein Fühler in der Garkammer zeigt die echte Temperatur auf dem Zifferblatt am Deckel.",
      "Tay gạt ống khói": "Kaminklappe",
      "Mở cho lửa cháy mạnh, đóng bớt để giữ nhiệt khi nướng chậm.": "Öffnen für ein starkes Feuer, schließen, um die Hitze beim langsamen Garen zu halten.",
      "Nắp đậy hun khói": "Räucherdeckel",
      "Đậy nắp chuyển sang chế độ hun khói giữ nhiệt, lật mở khi nướng trực tiếp.": "Deckel zu für wärmespeicherndes Räuchern, auf zum direkten Grillen.",
      "Quạt sò + núm chỉnh": "Gebläse + Drehregler",
      "Gió cưỡng bức nhóm than nhanh, chỉnh độ mạnh theo từng món.": "Druckluft entfacht die Kohle schnell; Stärke je nach Gericht einstellen.",
      "Nguồn DC 12V / Type-C": "Stromversorgung DC 12V / Type-C",
      "Chạy bằng sạc dự phòng — nướng dã ngoại không cần ổ điện.": "Läuft mit Powerbank — Picknickgrillen ohne Steckdose.",
      "Tháo lắp không dụng cụ": "Werkzeugfreie Montage",
      "Vỉ nướng → vỉ tách dầu → vỉ than nhấc ra theo thứ tự, rửa với nước rửa chén.": "Rost → Fettschale → Kohleschale der Reihe nach herausnehmen, mit Spülmittel reinigen.",
      "Đen huyền toàn thân": "Durchgehend tiefschwarz",
      "Sơn chịu nhiệt Mỹ đen huyền bóng nhẹ — bền ngoài trời, càng dùng càng sâu màu.": "US-hitzebeständige Beschichtung in seidenmattem Tiefschwarz — wetterfest, wird mit der Zeit farbtiefer.",
      "THÔNG SỐ KỸ THUẬT": "TECHNISCHE DATEN",
      "Vừa ban công,": "Passt auf den Balkon,",
      "đủ cho bàn tiệc": "reicht fürs Festmahl",
      "Thân lò sắt sơn tĩnh điện chịu nhiệt chuẩn Mỹ, toàn bộ vỉ và chi tiết tiếp xúc thực phẩm bằng inox.": "Stahlkorpus mit hitzebeständiger Pulverbeschichtung nach US-Standard; alle Roste und Lebensmittelkontaktteile aus Edelstahl.",
      "Đen huyền — sơn chịu nhiệt Mỹ": "Tiefschwarz — US-hitzebeständige Beschichtung",
      "Kích thước (cả ống khói)": "Maße (mit Kamin)",
      "Mặt vỉ nướng (2 vỉ inox)": "Grillfläche (2 Edelstahlroste)",
      "Sức chứa thịt tối đa": "Max. Fleischkapazität",
      "4 kg / mẻ": "4 kg / Durchgang",
      "Lượng than khuyên dùng": "Empfohlene Kohlemenge",
      "Nguồn quạt gió": "Gebläse-Stromversorgung",
      "Vật liệu thân lò": "Korpusmaterial",
      "Sắt, sơn chịu nhiệt Mỹ": "Stahl, US-hitzebeständige Beschichtung",
      "Vỉ & chi tiết tiếp xúc thực phẩm": "Roste & Lebensmittelkontaktteile",
      "Inox": "Edelstahl",
      "Vận chuyển": "Transport",
      "Ống khói tháo rời · chân gập": "Abnehmbarer Kamin · klappbare Beine",
      "ĐẶT HÀNG · GIAO TOÀN QUỐC": "BESTELLEN · LANDESWEITER VERSAND",
      "Mẻ nướng cuối tuần này,": "Der Grillabend am Wochenende,",
      "không còn ai phải né khói": "niemand weicht mehr dem Qualm aus",
      "Nhắn tin hoặc gọi trực tiếp cho Duy's Oven để nhận báo giá, xem lò thật và đặt giao tận nơi.": "Schreib oder ruf Duy's Oven an für ein Angebot, eine Besichtigung und Lieferung bis vor die Tür.",
      "GỌI 0901 691 717": "ANRUF 0901 691 717",
      "Nhắn Zalo": "Auf Zalo schreiben",
      "Bảo hành thân lò 12 tháng · Hướng dẫn nhóm lò & vệ sinh kèm máy": "12 Monate Garantie auf den Korpus · Anzünd- & Reinigungsanleitung inklusive",
      "PANTINA — LÒ NƯỚNG THAN TÁCH KHÓI": "PANTINA — RAUCHTRENNENDER HOLZKOHLEGRILL",
      "Phòng demo 3D ↗": "3D-Demoraum ↗"
    },
    th: {
      "Cơ chế tách khói": "กลไกแยกควัน",
      "Nguyên lý ↗": "หลักการ ↗",
      "Demo 3D": "เดโม 3D",
      "Bài viết ↗": "บทความ ↗",
      "Tính năng": "คุณสมบัติ",
      "Thông số": "ข้อมูลจำเพาะ",
      "ĐẶT HÀNG": "สั่งซื้อ",
      "LÒ NƯỚNG THAN TÁCH KHÓI": "เตาย่างถ่านแยกควัน",
      "Nướng than đúng vị.": "รสชาติถ่านแท้ ๆ",
      "Tách khói khỏi mẻ nướng.": "แต่ไร้ควันกวนใจ",
      "Pantina tách mỡ khỏi than bằng vỉ tách dầu riêng — khói khét bị chặn từ gốc, hết ám mùi. Quạt gió cưỡng bức nhóm than trong vài phút, nướng được 4 kg thịt mỗi mẻ.": "Pantina แยกไขมันออกจากถ่านด้วยถาดรองไขมันโดยเฉพาะ ตัดควันฉุนตั้งแต่ต้นทาง ไม่ติดกลิ่นอีกต่อไป พัดลมเป่าลมช่วยติดไฟถ่านในไม่กี่นาที ย่างเนื้อได้สูงสุด 4 กก. ต่อครั้ง",
      "ĐẶT HÀNG NGAY": "สั่งซื้อเลย",
      "Xem lò 3D ↗": "ดูเตาแบบ 3D ↗",
      "THỊT MỖI MẺ NƯỚNG": "เนื้อต่อการย่างหนึ่งครั้ง",
      "Tách khói": "แยกควัน",
      "MỠ KHÔNG CHẠM THAN": "ไขมันไม่แตะถ่าน",
      "5 phút": "5 นาที",
      "BÉN THAN VỚI QUẠT GIÓ": "ติดไฟถ่านด้วยพัดลม",
      "THÂN SẮT · SƠN CHỊU NHIỆT MỸ · VỈ INOX": "ตัวเตาเหล็ก · สีทนความร้อนสหรัฐฯ · ตะแกรงสแตนเลส",
      "Tách khói tận gốc": "แยกควันตั้งแต่ต้นทาง",
      "Vỉ tách dầu inox nằm giữa vỉ nướng và than hứng toàn bộ mỡ chảy xuống. Mỡ không chạm than — không bốc khói khét, quần áo và nhà cửa không ám mùi.": "ถาดรองไขมันสแตนเลสอยู่ระหว่างตะแกรงย่างกับถ่าน คอยรองรับไขมันทุกหยด ไขมันไม่แตะถ่าน จึงไม่มีควันฉุน เสื้อผ้าและบ้านไม่ติดกลิ่น",
      "Không cần quạt tay": "ไม่ต้องพัดเอง",
      "Quạt sò cấp gió cưỡng bức vào buồng than, có núm chỉnh tốc độ. Cắm nguồn DC 12V hoặc sạc dự phòng qua cáp Type-C — nướng giữa đồng vẫn chạy.": "พัดลมโบลเวอร์เป่าลมเข้าห้องถ่านโดยตรง พร้อมปุ่มปรับความแรง ใช้ไฟ DC 12V หรือพาวเวอร์แบงก์ผ่านสาย Type-C ย่างกลางทุ่งก็ยังได้",
      "Gập gọn mang đi": "พับเก็บพกพาง่าย",
      "Ống khói tháo rời, 4 chân gập sát đáy, vỉ tháo không cần dụng cụ. Từ sân nhà ra bãi dã ngoại chỉ một thùng xe.": "ปล่องควันถอดได้ ขาทั้งสี่พับแนบฐาน ตะแกรงถอดโดยไม่ต้องใช้เครื่องมือ จากสนามหลังบ้านไปจุดปิกนิกในรถเที่ยวเดียว",
      "XEM TRỰC TIẾP — KHÔNG NÓI SUÔNG": "ดูจริง ไม่ใช่แค่คำพูด",
      "Lò nhà bạn vs Pantina — cùng mẻ thịt, khác hẳn số phận": "เตาของคุณ vs Pantina — เนื้อชุดเดียวกัน แต่ผลลัพธ์ต่างกันลิบ",
      "Dõi theo từng giọt mỡ vàng rơi xuống: bên trái nó chạm than và bốc khói đen ám ngược lên thịt — bên Pantina nó trượt qua máng chữ V xuống khay hứng, sạch tuyệt đối.": "ตามดูไขมันสีทองทีละหยด ฝั่งซ้ายมันตกลงบนถ่านแล้วพ่นควันดำย้อนขึ้นเนื้อ ส่วนฝั่ง Pantina มันไหลตามรางตัว V ลงถาดรอง สะอาดหมดจด",
      "LÒ NHÀ BẠN BÂY GIỜ": "เตาของคุณตอนนี้",
      "Mỡ rơi vào than — khói đen ám lên thịt & người nướng": "ไขมันตกใส่ถ่าน ควันดำรมเนื้อและคนย่าง",
      "PANTINA — VỈ THAN CHỮ V": "PANTINA — ถาดถ่านรูปตัว V",
      "Mỡ xuống khay hứng · khói ra ống khói · thịt sạch vị": "ไขมันลงถาด · ควันออกปล่อง · เนื้อรสสะอาด",
      "Giọt vàng = mỡ · cuộn xám đen = khói ám vào thịt — phía Pantina không hề có": "หยดสีทอง = ไขมัน · ควันเทาดำ = ควันที่รมเนื้อ — ฝั่ง Pantina ไม่มีเลย",
      "Tự tay chỉnh quạt gió xem than rực ↗": "ลองปรับพัดลมเอง แล้วดูถ่านลุกแดง ↗",
      "CƠ CHẾ TÁCH KHÓI": "กลไกแยกควัน",
      "Khói khét sinh ra khi mỡ rơi vào than. Pantina chặn đúng chỗ đó.": "ควันฉุนเกิดตอนไขมันตกใส่ถ่าน Pantina สกัดมันตรงจุดนั้นพอดี",
      "Ba lớp vỉ xếp chồng: thịt nằm trên vỉ nướng, mỡ chảy xuống vỉ tách dầu ở giữa, than cháy sạch ở lớp dưới cùng. Phần khói than ít ỏi còn lại được ống khói hút thẳng lên cao — người đứng nướng không bị tạt khói vào mặt.": "ซ้อนกันสามชั้น: เนื้ออยู่บนตะแกรง ไขมันหยดลงถาดรองตรงกลาง ถ่านเผาไหม้สะอาดที่ชั้นล่างสุด ควันถ่านเล็กน้อยที่เหลือถูกปล่องดูดตรงขึ้นด้านบน จึงไม่ปลิวเข้าหน้าคนย่าง",
      "Xem demo cơ chế trong phòng 3D ↗": "ดูกลไกในห้อง 3D ↗",
      "Vỉ nướng inox — 2 tấm, 4 kg thịt": "ตะแกรงย่างสแตนเลส — 2 แผ่น เนื้อ 4 กก.",
      "Thịt nướng chín bằng nhiệt than tỏa đều từ dưới lên.": "เนื้อสุกด้วยความร้อนถ่านที่กระจายสม่ำเสมอจากด้านล่าง",
      "Vỉ tách dầu — trái tim của lò": "ถาดรองไขมัน — หัวใจของเตา",
      "Tấm inox hứng toàn bộ mỡ nhỏ giọt. Mỡ không bao giờ chạm than → chặn khói khét từ gốc.": "แผ่นสแตนเลสรองรับไขมันทุกหยด ไขมันไม่แตะถ่าน → ตัดควันฉุนตั้งแต่ต้นทาง",
      "Vỉ than — cháy sạch, tro rơi xuống khay": "ถาดถ่าน — เผาไหม้สะอาด เถ้าร่วงลงลิ้นชัก",
      "Khay tro nằm bên trái lò, dưới ống khói — kéo ra đổ trong vài giây.": "ลิ้นชักเถ้าอยู่ด้านซ้ายของเตา ใต้ปล่องควัน ดึงออกเทได้ในไม่กี่วินาที",
      "PHÒNG DEMO TRỰC TUYẾN": "ห้องเดโมออนไลน์",
      "Xoay, tháo lắp, nhóm lửa — ngay tại đây": "หมุน ถอดประกอบ จุดไฟ — ได้ตรงนี้เลย",
      "Mô hình dựng 1:1 từ file 3D gốc. Kéo để xoay, bật lửa, kéo quạt gió, tháo từng lớp vỉ — như đang đứng cạnh lò thật.": "โมเดล 1:1 จากไฟล์ 3D ต้นฉบับ ลากเพื่อหมุน จุดไฟ เลื่อนพัดลม ดึงตะแกรงออกทีละชั้น เหมือนยืนอยู่ข้างเตาจริง",
      "Mở toàn màn hình ↗": "เปิดเต็มจอ ↗",
      "TÍNH NĂNG": "คุณสมบัติ",
      "Mỗi chi tiết đều có việc của nó": "ทุกชิ้นส่วนมีหน้าที่ของมัน",
      "Cửa kính — vừa nướng vừa sưởi": "ประตูกระจก — ย่างและให้ความอบอุ่นในตัว",
      "Nhìn xuyên kính thấy than hồng rực như lò sưởi — ấm cúng cho bàn tiệc ngoài trời; mở ra gắp thêm than không cần nhấc vỉ.": "มองผ่านกระจกเห็นถ่านแดงเรืองเหมือนเตาผิง อบอุ่นสำหรับโต๊ะกลางแจ้ง เปิดเติมถ่านได้โดยไม่ต้องยกตะแกรง",
      "Đồng hồ nhiệt độ": "เกจวัดอุณหภูมิ",
      "Que đo cắm trong buồng nướng, đọc nhiệt thật trên mặt đồng hồ ở nắp.": "ก้านวัดในห้องย่างอ่านอุณหภูมิจริงบนหน้าปัดที่ฝา",
      "Tay gạt ống khói": "คันโยกปล่องควัน",
      "Mở cho lửa cháy mạnh, đóng bớt để giữ nhiệt khi nướng chậm.": "เปิดให้ไฟแรง ปิดเพื่อเก็บความร้อนเวลาย่างช้า",
      "Nắp đậy hun khói": "ฝาสำหรับรมควัน",
      "Đậy nắp chuyển sang chế độ hun khói giữ nhiệt, lật mở khi nướng trực tiếp.": "ปิดฝาเข้าสู่โหมดรมควันเก็บความร้อน เปิดขึ้นเพื่อย่างโดยตรง",
      "Quạt sò + núm chỉnh": "พัดลมโบลเวอร์ + ปุ่มปรับ",
      "Gió cưỡng bức nhóm than nhanh, chỉnh độ mạnh theo từng món.": "ลมเป่าช่วยติดถ่านไว ปรับความแรงตามแต่ละเมนู",
      "Nguồn DC 12V / Type-C": "ไฟ DC 12V / Type-C",
      "Chạy bằng sạc dự phòng — nướng dã ngoại không cần ổ điện.": "ใช้พาวเวอร์แบงก์ได้ ย่างปิกนิกโดยไม่ต้องมีปลั๊ก",
      "Tháo lắp không dụng cụ": "ถอดประกอบไม่ใช้เครื่องมือ",
      "Vỉ nướng → vỉ tách dầu → vỉ than nhấc ra theo thứ tự, rửa với nước rửa chén.": "ตะแกรงย่าง → ถาดรองไขมัน → ถาดถ่าน ยกออกตามลำดับ ล้างด้วยน้ำยาล้างจาน",
      "Đen huyền toàn thân": "สีดำสนิททั้งตัว",
      "Sơn chịu nhiệt Mỹ đen huyền bóng nhẹ — bền ngoài trời, càng dùng càng sâu màu.": "สีทนความร้อนสหรัฐฯ ดำสนิทเงางามนวล ทนแดดทนฝน ยิ่งใช้สียิ่งเข้ม",
      "THÔNG SỐ KỸ THUẬT": "ข้อมูลจำเพาะทางเทคนิค",
      "Vừa ban công,": "วางบนระเบียงได้",
      "đủ cho bàn tiệc": "พอสำหรับงานเลี้ยง",
      "Thân lò sắt sơn tĩnh điện chịu nhiệt chuẩn Mỹ, toàn bộ vỉ và chi tiết tiếp xúc thực phẩm bằng inox.": "ตัวเตาเหล็กเคลือบสีพ่นทนความร้อนมาตรฐานสหรัฐฯ ตะแกรงและชิ้นส่วนที่สัมผัสอาหารทั้งหมดเป็นสแตนเลส",
      "Đen huyền — sơn chịu nhiệt Mỹ": "ดำสนิท — สีทนความร้อนสหรัฐฯ",
      "Kích thước (cả ống khói)": "ขนาด (รวมปล่องควัน)",
      "Mặt vỉ nướng (2 vỉ inox)": "พื้นที่ย่าง (ตะแกรงสแตนเลส 2 แผ่น)",
      "Sức chứa thịt tối đa": "ความจุเนื้อสูงสุด",
      "4 kg / mẻ": "4 กก. / ครั้ง",
      "Lượng than khuyên dùng": "ปริมาณถ่านแนะนำ",
      "Nguồn quạt gió": "แหล่งจ่ายไฟพัดลม",
      "Vật liệu thân lò": "วัสดุตัวเตา",
      "Sắt, sơn chịu nhiệt Mỹ": "เหล็ก เคลือบสีทนความร้อนสหรัฐฯ",
      "Vỉ & chi tiết tiếp xúc thực phẩm": "ตะแกรงและชิ้นส่วนสัมผัสอาหาร",
      "Inox": "สแตนเลส",
      "Vận chuyển": "การขนย้าย",
      "Ống khói tháo rời · chân gập": "ปล่องถอดได้ · ขาพับได้",
      "ĐẶT HÀNG · GIAO TOÀN QUỐC": "สั่งซื้อ · จัดส่งทั่วประเทศ",
      "Mẻ nướng cuối tuần này,": "บาร์บีคิวสุดสัปดาห์นี้",
      "không còn ai phải né khói": "ไม่มีใครต้องหลบควันอีกต่อไป",
      "Nhắn tin hoặc gọi trực tiếp cho Duy's Oven để nhận báo giá, xem lò thật và đặt giao tận nơi.": "ทักหรือโทรหา Duy's Oven เพื่อขอราคา ดูเตาจริง และนัดส่งถึงบ้าน",
      "GỌI 0901 691 717": "โทร 0901 691 717",
      "Nhắn Zalo": "แชต Zalo",
      "Bảo hành thân lò 12 tháng · Hướng dẫn nhóm lò & vệ sinh kèm máy": "รับประกันตัวเตา 12 เดือน · แถมคู่มือจุดเตาและทำความสะอาด",
      "PANTINA — LÒ NƯỚNG THAN TÁCH KHÓI": "PANTINA — เตาย่างถ่านแยกควัน",
      "Phòng demo 3D ↗": "ห้องเดโม 3D ↗"
    }
  };

  // Merge any extra dictionaries (e.g. the 3D viewer strings) contributed by other files.
  try {
    var EX = window.PANTINA_I18N_EXTRA;
    if (EX) for (var _x in EX) { I18N[_x] = I18N[_x] || {}; for (var _y in EX[_x]) I18N[_x][_y] = EX[_x][_y]; }
  } catch (e) {}

  // Union of all Vietnamese source keys.
  var KEYS = {};
  for (var _l in I18N) for (var _k in I18N[_l]) KEYS[_k] = 1;

  var lang = 'vi';
  try { lang = localStorage.getItem('pantina_lang') || 'vi'; } catch (e) {}

  // The DC runtime can re-render the template, replacing DOM nodes. So we don't cache a
  // fixed node list or bind the listener to one select node. Instead we track each text node
  // the first time we see it as Vietnamese (storing its key), translate it, and watch for
  // new nodes via a MutationObserver — surviving any number of re-renders.
  var seen = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  var tracked = [];

  function applyOne(o) {
    var tr = (lang === 'vi' || !I18N[lang] || I18N[lang][o.key] == null) ? null : I18N[lang][o.key];
    var want = tr == null ? o.vi : o.vi.split(o.key).join(tr);
    if (o.node.nodeValue !== want) o.node.nodeValue = want;
  }
  function scan(root) {
    if (!root || root.nodeType === 3) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (seen && seen.has(n)) continue;
      var t = n.nodeValue.trim();
      if (t && KEYS[t]) {
        var o = { node: n, key: t, vi: n.nodeValue };
        if (seen) seen.add(n);
        tracked.push(o);
        applyOne(o);
      }
    }
  }
  function applyAll() {
    for (var i = tracked.length - 1; i >= 0; i--) {
      if (!tracked[i].node.isConnected) { tracked.splice(i, 1); continue; }
      applyOne(tracked[i]);
    }
    scan(document.body); // pick up anything freshly rendered
  }
  function setLang(L) {
    lang = L;
    try { document.documentElement.lang = L; localStorage.setItem('pantina_lang', L); } catch (e) {}
    applyAll();
    var sel = document.getElementById('pa-lang');
    if (sel && sel.value !== L) sel.value = L;
    if (window.__paUpdatePicker) window.__paUpdatePicker(L);
  }

  // ---- Flag dropdown (replaces the native <select> visually) ----
  var FLAGS = {
    vi: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#da251d"/><path d="M15 4.2l1.74 5.36h5.64l-4.56 3.31 1.74 5.36L15 14.92l-4.56 3.31 1.74-5.36-4.56-3.31h5.64z" fill="#ff0"/></svg>',
    en: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#012169"/><path d="M0 0l30 20M30 0L0 20" stroke="#fff" stroke-width="3"/><path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="5"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3"/></svg>',
    zh: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#de2910"/><path d="M6 4l1.18 3.63h3.82l-3.09 2.24 1.18 3.63L6 11.26l-3.09 2.24 1.18-3.63L1 7.63h3.82z" fill="#ffde00"/></svg>',
    ko: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="4.6" fill="#cd2e3a"/><path d="M10.4 10a4.6 4.6 0 0 1 9.2 0 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 0-4.6 0z" fill="#0047a0"/></svg>',
    de: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#dd0000"/><rect y="13.34" width="30" height="6.66" fill="#ffce00"/></svg>',
    th: '<svg viewBox="0 0 30 20" width="20" height="14"><rect width="30" height="20" fill="#a51931"/><rect y="3.33" width="30" height="13.34" fill="#f4f5f8"/><rect y="6.67" width="30" height="6.66" fill="#2d2a4a"/></svg>'
  };
  var NAMES = { vi: 'Tiếng Việt', en: 'English', zh: '中文', ko: '한국어', de: 'Deutsch', th: 'ไทย' };
  var ORDER = ['vi', 'en', 'zh', 'ko', 'de', 'th'];
  function flagSpan(L) {
    return '<span style="display:inline-flex; width:20px; height:14px; border-radius:2px; overflow:hidden; box-shadow:0 0 0 1px rgba(0,0,0,0.08); flex:none;">' + (FLAGS[L] || '') + '</span>';
  }
  function buildPicker() {
    var sel = document.getElementById('pa-lang');
    if (!sel || document.getElementById('pa-lang-ui')) return;
    sel.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.id = 'pa-lang-ui';
    wrap.style.cssText = "position:relative; font-family:'Be Vietnam Pro',sans-serif; flex:none;";
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'display:flex; align-items:center; gap:8px; background:#fbf9f6; border:1px solid rgba(30,25,20,0.25); border-radius:999px; padding:7px 12px; cursor:pointer; font:inherit; font-size:12.5px; color:#221f1c; line-height:1;';
    var menu = document.createElement('div');
    menu.style.cssText = 'position:absolute; top:calc(100% + 6px); right:0; background:#fff; border:1px solid rgba(30,25,20,0.15); border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,0.14); padding:6px; display:none; z-index:200; min-width:158px;';
    ORDER.forEach(function (L) {
      var item = document.createElement('button');
      item.type = 'button';
      item.style.cssText = 'display:flex; align-items:center; gap:10px; width:100%; background:transparent; border:none; border-radius:8px; padding:9px 10px; cursor:pointer; font:inherit; font-size:13px; color:#221f1c; text-align:left;';
      item.innerHTML = flagSpan(L) + '<span>' + NAMES[L] + '</span>';
      item.addEventListener('mouseenter', function () { item.style.background = 'rgba(244,102,31,0.1)'; });
      item.addEventListener('mouseleave', function () { item.style.background = 'transparent'; });
      item.addEventListener('click', function (e) { e.stopPropagation(); menu.style.display = 'none'; setLang(L); });
      menu.appendChild(item);
    });
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.style.display = (menu.style.display === 'none') ? 'block' : 'none'; });
    document.addEventListener('click', function () { menu.style.display = 'none'; });
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    window.__paUpdatePicker = function (L) {
      btn.innerHTML = flagSpan(L) + '<span>' + (NAMES[L] || L) + '</span><span style="color:#9a948c; font-size:10px;">\u25BE</span>';
    };
    window.__paUpdatePicker(lang);
  }

  // Event delegation: works no matter how many times the select is re-created.
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.id === 'pa-lang') setLang(t.value);
  });

  var observing = false;
  function startObserver() {
    if (observing || !window.MutationObserver) return;
    observing = true;
    // Heavy pages (the 3D viewer) re-render the panel a few times a second and run a 60fps
    // render loop. Re-translating on every mutation — or on a fixed fast interval — competes
    // with that loop and causes visible stutter. So we THROTTLE: at most one re-translate pass
    // per 800ms, and only when DOM actually changed. isConnected (used in applyAll) keeps the
    // pass cheap. A brief (<800ms) flash of a freshly re-rendered Vietnamese label is fine.
    var timer = null, lastRun = 0;
    function run() { timer = null; lastRun = Date.now(); buildPicker(); applyAll(); }
    var mo = new MutationObserver(function () {
      if (timer) return;
      var wait = Math.max(0, 800 - (Date.now() - lastRun));
      timer = setTimeout(run, wait);
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function ready() {
    if (!document.body) { setTimeout(ready, 60); return; }
    scan(document.body);
    var sel = document.getElementById('pa-lang');
    if (sel) sel.value = lang;
    buildPicker();
    startObserver();
    // Catch late template renders without a perpetual timer: a few staggered passes, then the
    // throttled observer takes over. No steady-state interval, so nothing competes with the
    // 3D render loop once the page settles.
    setTimeout(function () { buildPicker(); applyAll(); }, 350);
    setTimeout(function () { buildPicker(); applyAll(); }, 1200);
    setTimeout(function () { buildPicker(); applyAll(); }, 2600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

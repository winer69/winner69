// Light page translation for WINNER 69: Thai stays the source language in the code; when another
// language is picked, visible Thai texts that are in the dictionary below are swapped on screen
// (and swapped back for Thai). Texts that are not listed (long help texts, texts inside games,
// banner pictures) simply stay Thai - add a line here to translate more.
//
// Columns: [English, Khmer, Lao, Indonesian, Vietnamese]; Chinese comes from ZH below
export const LANGUAGES = [
  { code: "th", flag: "🇹🇭", label: "ไทย", name: "Thailand" },
  { code: "en", flag: "🇬🇧", label: "English", name: "English" },
  { code: "km", flag: "🇰🇭", label: "ខ្មែរ", name: "Cambodia" },
  { code: "lo", flag: "🇱🇦", label: "ລາວ", name: "Laos" },
  { code: "id", flag: "🇮🇩", label: "Indonesia", name: "Indonesia" },
  { code: "vi", flag: "🇻🇳", label: "Tiếng Việt", name: "Vietnam" },
  { code: "zh", flag: "🇨🇳", label: "中文", name: "China" },
];
const COL = { en: 0, km: 1, lo: 2, id: 3, vi: 4, zh: 5 };
const STORE = "winner69_lang";

const T = {
  // bottom bar / top bar
  "หน้าหลัก": ["Home", "ទំព័រដើម", "ໜ້າຫຼັກ", "Beranda", "Trang chủ"],
  "แชท": ["Chat", "ជជែក", "ແຊັດ", "Obrolan", "Trò chuyện"],
  "ไอเทมบูสต์": ["Boost", "បូស្ត៍", "ບູສ", "Boost", "Tăng tốc"],
  "หวย": ["Lottery", "ឆ្នោត", "ຫວຍ", "Lotre", "Xổ số"],
  "โปรไฟล์": ["Profile", "ប្រវត្តិរូប", "ໂປຣໄຟລ໌", "Profil", "Hồ sơ"],
  "กลับหน้าหลัก": ["Back", "ត្រឡប់ក្រោយ", "ກັບໜ້າຫຼັກ", "Kembali", "Quay lại"],
  "แอดมิน": ["Admin", "អ្នកគ្រប់គ្រង", "ແອດມິນ", "Admin", "Quản trị"],
  "หน้าแอดมิน": ["Admin panel", "ផ្ទាំងគ្រប់គ្រង", "ໜ້າແອດມິນ", "Panel admin", "Trang quản trị"],
  "ฝาก / ถอน": ["Deposit / Withdraw", "ដាក់ / ដក", "ຝາກ / ຖອນ", "Setor / Tarik", "Nạp / Rút"],
  "ปิดเสียง": ["Mute", "បិទសំឡេង", "ປິດສຽງ", "Bisukan", "Tắt tiếng"],
  "เปิดเสียง": ["Sound on", "បើកសំឡេង", "ເປີດສຽງ", "Nyalakan suara", "Bật tiếng"],
  "ออกจากระบบ": ["Log out", "ចាកចេញ", "ອອກຈາກລະບົບ", "Keluar", "Đăng xuất"],
  "การแจ้งเตือน": ["Notifications", "ការជូនដំណឹង", "ການແຈ້ງເຕືອນ", "Notifikasi", "Thông báo"],
  "การตั้งค่า": ["Settings", "ការកំណត់", "ການຕັ້ງຄ່າ", "Pengaturan", "Cài đặt"],
  "กระดานคะแนน": ["Leaderboard", "តារាងពិន្ទុ", "ກະດານຄະແນນ", "Papan peringkat", "Bảng xếp hạng"],
  "คำขอถอนของฉัน": ["My withdrawals", "ការដកប្រាក់របស់ខ្ញុំ", "ຄຳຂໍຖອນຂອງຂ້ອຍ", "Penarikan saya", "Lệnh rút của tôi"],
  "ยังไม่มีรายการ": ["Nothing yet", "មិនទាន់មាន", "ຍັງບໍ່ມີລາຍການ", "Belum ada", "Chưa có"],
  "เลือกเซิร์ฟเวอร์ประเทศ": ["Choose country", "ជ្រើសប្រទេស", "ເລືອກປະເທດ", "Pilih negara", "Chọn quốc gia"],
  "สมาชิก": ["Member", "សមាជិក", "ສະມາຊິກ", "Anggota", "Thành viên"],
  // lobby
  "ทั้งหมด": ["All", "ទាំងអស់", "ທັງໝົດ", "Semua", "Tất cả"],
  "ออนไลน์": ["Online", "អនឡាញ", "ອອນລາຍ", "Online", "Trực tuyến"],
  "เกมต้นฉบับ": ["Originals", "ហ្គេមដើម", "ເກມຕົ້ນສະບັບ", "Original", "Độc quyền"],
  "สล็อต": ["Slots", "ស្លុត", "ສະລັອດ", "Slot", "Slot"],
  "ไพ่": ["Cards", "បៀ", "ໄພ່", "Kartu", "Bài"],
  "วงล้อ": ["Wheel", "កង់វិល", "ວົງລໍ້", "Roda", "Vòng quay"],
  "ยอดนิยม": ["Popular", "ពេញនិយម", "ຍອດນິຍົມ", "Populer", "Phổ biến"],
  "เกมใหม่": ["New games", "ហ្គេមថ្មី", "ເກມໃໝ່", "Game baru", "Game mới"],
  "เกมยอดนิยม": ["Popular games", "ហ្គេមពេញនិយម", "ເກມຍອດນິຍົມ", "Game populer", "Game phổ biến"],
  "เกมทั้งหมด": ["All games", "ហ្គេមទាំងអស់", "ເກມທັງໝົດ", "Semua game", "Tất cả game"],
  "ค้นหาเกม...": ["Search games...", "ស្វែងរកហ្គេម...", "ຄົ້ນຫາເກມ...", "Cari game...", "Tìm game..."],
  "ไม่พบเกมที่ค้นหา": ["No games found", "រកមិនឃើញហ្គេម", "ບໍ່ພົບເກມ", "Game tidak ditemukan", "Không tìm thấy game"],
  "ล้างคำค้น": ["Clear", "សម្អាត", "ລ້າງ", "Hapus", "Xóa"],
  "ยอดเงินคงเหลือ": ["Balance", "សមតុល្យ", "ຍອດເງິນຄົງເຫຼືອ", "Saldo", "Số dư"],
  "ฝากเงิน": ["Deposit", "ដាក់ប្រាក់", "ຝາກເງິນ", "Setor", "Nạp tiền"],
  "ถอนเงิน": ["Withdraw", "ដកប្រាក់", "ຖອນເງິນ", "Tarik", "Rút tiền"],
  "ถอน": ["Withdraw", "ដក", "ຖອນ", "Tarik", "Rút"],
  "ชนะ": ["Win", "ឈ្នះ", "ຊະນະ", "Menang", "Thắng"],
  "ถอนสำเร็จ": ["Withdrawn", "ដកបានជោគជ័យ", "ຖອນສຳເລັດ", "Berhasil ditarik", "Rút thành công"],
  "ทัวร์นาเมนต์ประจำวัน": ["Daily tournament", "ការប្រកួតប្រចាំថ្ងៃ", "ທົວນາເມັນປະຈຳວັນ", "Turnamen harian", "Giải đấu hằng ngày"],
  "เข้าร่วม": ["Join", "ចូលរួម", "ເຂົ້າຮ່ວມ", "Ikut", "Tham gia"],
  // game names
  "ผสมสิบ ออนไลน์": ["Phom Sip Online", "Phom Sip អនឡាញ", "ຜະສົມສິບ ອອນລາຍ", "Phom Sip Online", "Phom Sip Trực tuyến"],
  "ดัมมี่ ออนไลน์": ["Dummy Online", "Dummy អនឡាញ", "ດຳມີ່ ອອນລາຍ", "Dummy Online", "Dummy Trực tuyến"],
  "ป๊อกเด้ง ออนไลน์": ["Pok Deng Online", "Pok Deng អនឡាញ", "ປ໊ອກເດ້ງ ອອນລາຍ", "Pok Deng Online", "Pok Deng Trực tuyến"],
  "Texas Hold'em ออนไลน์": ["Texas Hold'em Online", "Texas Hold'em អនឡាញ", "Texas Hold'em ອອນລາຍ", "Texas Hold'em Online", "Texas Hold'em Trực tuyến"],
  "ยิงปลา Ocean Royale": ["Fishing Ocean Royale", "បាញ់ត្រី Ocean Royale", "ຍິງປາ Ocean Royale", "Tembak Ikan Ocean Royale", "Bắn cá Ocean Royale"],
  "มังกรทองนำโชค": ["Lucky Golden Dragon", "នាគមាសសំណាង", "ມັງກອນທອງນຳໂຊກ", "Naga Emas Hoki", "Rồng Vàng May Mắn"],
  "หวยไทย · หวยลาว": ["Thai · Lao Lottery", "ឆ្នោតថៃ · ឡាវ", "ຫວຍໄທ · ຫວຍລາວ", "Lotre Thai · Laos", "Xổ số Thái · Lào"],
  "777 คลาสสิก": ["777 Classic", "777 បុរាណ", "777 ຄລາສສິກ", "777 Klasik", "777 Cổ điển"],
  "น้ำเต้าปูปลา": ["Hoo Hey How", "ខ្លាឃ្លោក", "ນ້ຳເຕົ້າປູປາ", "Hoo Hey How", "Bầu Cua Cá"],
  "ขุมทรัพย์ราชันย์": ["King's Treasure", "កំណប់ស្តេច", "ຂຸມຊັບລາຊັນ", "Harta Sang Raja", "Kho Báu Nhà Vua"],
  "WINNER69 ฟุตบอลลีก": ["WINNER69 Football League", "WINNER69 លីគបាល់ទាត់", "WINNER69 ລີກບານເຕະ", "WINNER69 Liga Sepak Bola", "WINNER69 Giải Bóng Đá"],
  "ป่ามรกต": ["Emerald Jungle", "ព្រៃមរកត", "ປ່າມໍລະກົດ", "Hutan Zamrud", "Rừng Ngọc Lục Bảo"],
  // login
  "เข้าสู่ระบบ": ["Log in", "ចូលគណនី", "ເຂົ້າສູ່ລະບົບ", "Masuk", "Đăng nhập"],
  "สมัครสมาชิก": ["Sign up", "ចុះឈ្មោះ", "ສະໝັກສະມາຊິກ", "Daftar", "Đăng ký"],
  "สมัครสมาชิกใหม่": ["Create account", "បង្កើតគណនីថ្មី", "ສະໝັກສະມາຊິກໃໝ່", "Buat akun", "Tạo tài khoản"],
  "สมัครสมาชิกเพื่อเริ่มเล่น": ["Sign up to play", "ចុះឈ្មោះដើម្បីលេង", "ສະໝັກເພື່ອເລີ່ມຫຼິ້ນ", "Daftar untuk bermain", "Đăng ký để chơi"],
  "เบอร์โทรศัพท์": ["Phone number", "លេខទូរស័ព្ទ", "ເບີໂທລະສັບ", "Nomor telepon", "Số điện thoại"],
  "รหัสผ่าน": ["Password", "ពាក្យសម្ងាត់", "ລະຫັດຜ່ານ", "Kata sandi", "Mật khẩu"],
  "ชื่อผู้ใช้": ["Username", "ឈ្មោះអ្នកប្រើ", "ຊື່ຜູ້ໃຊ້", "Nama pengguna", "Tên đăng nhập"],
  "เข้าสู่ระบบแอดมิน": ["Admin login", "ចូលជាអ្នកគ្រប់គ្រង", "ເຂົ້າສູ່ລະບົບແອດມິນ", "Masuk admin", "Đăng nhập quản trị"],
  // profile
  "แก้ไขโปรไฟล์": ["Edit profile", "កែប្រវត្តិរូប", "ແກ້ໄຂໂປຣໄຟລ໌", "Edit profil", "Sửa hồ sơ"],
  "เปลี่ยนชื่อ / รูปโปรไฟล์": ["Change name / photo", "ប្តូរឈ្មោះ / រូបថត", "ປ່ຽນຊື່ / ຮູບໂປຣໄຟລ໌", "Ganti nama / foto", "Đổi tên / ảnh"],
  "ปิด": ["Close", "បិទ", "ປິດ", "Tutup", "Đóng"],
  "เลือกรูปโปรไฟล์": ["Choose a photo", "ជ្រើសរូបថត", "ເລືອກຮູບໂປຣໄຟລ໌", "Pilih foto", "Chọn ảnh đại diện"],
  "ชื่อที่แสดง (2–16 ตัวอักษร)": ["Display name (2–16 characters)", "ឈ្មោះបង្ហាញ (2–16 តួអក្សរ)", "ຊື່ທີ່ສະແດງ (2–16 ຕົວອັກສອນ)", "Nama tampilan (2–16 karakter)", "Tên hiển thị (2–16 ký tự)"],
  "สมาชิก WINNER 69": ["WINNER 69 member", "សមាជិក WINNER 69", "ສະມາຊິກ WINNER 69", "Anggota WINNER 69", "Thành viên WINNER 69"],
  "กรอกโค้ดโบนัส": ["Enter bonus code", "បញ្ចូលកូដបូណូស", "ໃສ່ໂຄດໂບນັດ", "Masukkan kode bonus", "Nhập mã thưởng"],
  "แลกโค้ด": ["Redeem", "ប្តូរកូដ", "ແລກໂຄດ", "Tukar", "Đổi mã"],
  "สถิติการเล่น (เซสชันนี้)": ["Stats (this session)", "ស្ថិតិ (វគ្គនេះ)", "ສະຖິຕິການຫຼິ້ນ (ເຊດຊັນນີ້)", "Statistik (sesi ini)", "Thống kê (phiên này)"],
  "จำนวนรอบที่เล่น": ["Rounds played", "ចំនួនជុំបានលេង", "ຈຳນວນຮອບທີ່ຫຼິ້ນ", "Ronde dimainkan", "Số ván đã chơi"],
  "ยอดเดิมพันรวม": ["Total bets", "ការភ្នាល់សរុប", "ຍອດເດີມພັນລວມ", "Total taruhan", "Tổng cược"],
  "ยอดชนะรวม": ["Total wins", "ឈ្នះសរុប", "ຍອດຊະນະລວມ", "Total menang", "Tổng thắng"],
  "ชนะครั้งใหญ่ที่สุด": ["Biggest win", "ឈ្នះធំបំផុត", "ຊະນະໃຫຍ່ທີ່ສຸດ", "Kemenangan terbesar", "Thắng lớn nhất"],
  "ประวัติการเล่นล่าสุด": ["Recent games", "ប្រវត្តិថ្មីៗ", "ປະຫວັດການຫຼິ້ນຫຼ້າສຸດ", "Riwayat terbaru", "Lịch sử gần đây"],
  "ยังไม่มีประวัติการเล่นในเซสชันนี้": ["No games played yet", "មិនទាន់មានប្រវត្តិលេង", "ຍັງບໍ່ມີປະຫວັດການຫຼິ້ນ", "Belum ada permainan", "Chưa có lượt chơi nào"],
  "เปลี่ยนรหัสผ่าน": ["Change password", "ប្តូរពាក្យសម្ងាត់", "ປ່ຽນລະຫັດຜ່ານ", "Ganti kata sandi", "Đổi mật khẩu"],
  "รหัสผ่านใหม่": ["New password", "ពាក្យសម្ងាត់ថ្មី", "ລະຫັດຜ່ານໃໝ່", "Kata sandi baru", "Mật khẩu mới"],
  "บันทึก": ["Save", "រក្សាទុក", "ບັນທຶກ", "Simpan", "Lưu"],
  // chat
  "แชทติดต่อแอดมิน": ["Chat with admin", "ជជែកជាមួយអ្នកគ្រប់គ្រង", "ແຊັດຫາແອດມິນ", "Chat dengan admin", "Chat với quản trị"],
  "พิมพ์ข้อความ...": ["Type a message...", "វាយសារ...", "ພິມຂໍ້ຄວາມ...", "Ketik pesan...", "Nhập tin nhắn..."],
  "ส่ง": ["Send", "ផ្ញើ", "ສົ່ງ", "Kirim", "Gửi"],
  "แนบรูป": ["Photo", "រូបថត", "ແນບຮູບ", "Foto", "Ảnh"],
  // wallet
  "ฝากเครดิต": ["Deposit", "ដាក់ប្រាក់", "ຝາກເຄຣດິດ", "Setor", "Nạp tiền"],
  "ถอนเครดิต": ["Withdraw", "ដកប្រាក់", "ຖອນເຄຣດິດ", "Tarik", "Rút tiền"],
  "คูปอง": ["Coupon", "គូប៉ុង", "ຄູປອງ", "Kupon", "Phiếu"],
  "แลกคูปอง": ["Redeem coupon", "ប្តូរគូប៉ុង", "ແລກຄູປອງ", "Tukar kupon", "Đổi phiếu"],
  "ยืนยัน": ["Confirm", "បញ្ជាក់", "ຢືນຢັນ", "Konfirmasi", "Xác nhận"],
  "สลิปการโอน": ["Transfer slip", "បង្កាន់ដៃផ្ទេរ", "ສະລິບການໂອນ", "Bukti transfer", "Biên lai chuyển khoản"],
  "เลือกรูปสลิป": ["Choose slip photo", "ជ្រើសរូបបង្កាន់ដៃ", "ເລືອກຮູບສະລິບ", "Pilih foto bukti", "Chọn ảnh biên lai"],
  "ส่งสลิปเพื่อตรวจสอบ": ["Send slip for review", "ផ្ញើបង្កាន់ដៃដើម្បីពិនិត្យ", "ສົ່ງສະລິບເພື່ອກວດສອບ", "Kirim bukti", "Gửi biên lai để kiểm tra"],
  "จำนวนเครดิตที่ต้องการถอน": ["Amount to withdraw", "ចំនួនដែលចង់ដក", "ຈຳນວນທີ່ຕ້ອງການຖອນ", "Jumlah penarikan", "Số tiền muốn rút"],
  "ทำรายการอีกครั้ง": ["New request", "ធ្វើប្រតិបត្តិការម្តងទៀត", "ເຮັດລາຍການອີກຄັ້ງ", "Transaksi baru", "Giao dịch mới"],
  "เครดิตไม่เพียงพอ": ["Not enough credit", "ឥណទានមិនគ្រប់", "ເຄຣດິດບໍ່ພໍ", "Saldo tidak cukup", "Không đủ tín dụng"],
  "เครดิตไม่พอ": ["Not enough credit", "ឥណទានមិនគ្រប់", "ເຄຣດິດບໍ່ພໍ", "Saldo tidak cukup", "Không đủ tín dụng"],
  "รอตรวจสอบ": ["Pending", "កំពុងរង់ចាំ", "ລໍຖ້າກວດສອບ", "Menunggu", "Đang chờ"],
  "อนุมัติแล้ว": ["Approved", "បានអនុម័ត", "ອະນຸມັດແລ້ວ", "Disetujui", "Đã duyệt"],
  "ปฏิเสธ": ["Rejected", "បានបដិសេធ", "ປະຕິເສດ", "Ditolak", "Bị từ chối"],
  // shop / boost
  "ใช้": ["Use", "ប្រើ", "ໃຊ້", "Pakai", "Dùng"],
  "ซื้อ": ["Buy", "ទិញ", "ຊື້", "Beli", "Mua"],
  "ถัดไป": ["Next", "បន្ទាប់", "ຖັດໄປ", "Berikutnya", "Tiếp"],
  "ก่อนหน้า": ["Previous", "មុន", "ກ່ອນໜ້າ", "Sebelumnya", "Trước"],
  "เล่นได้": ["Play", "លេង", "ຫຼິ້ນໄດ້", "Main", "Chơi"],
  "อันดับ": ["Rank", "ចំណាត់ថ្នាក់", "ອັນດັບ", "Peringkat", "Hạng"],
  "เกม": ["games", "ហ្គេម", "ເກມ", "game", "game"],
  "สมัครสมาชิกฟรี แล้วรอแอดมินเติมเครดิตเสมือนให้จึงจะเริ่มเล่นได้ หรือเข้าสู่ระบบถ้ามีบัญชีอยู่แล้ว": [
    "Sign up for free, then wait for the admin to add credit before you play - or log in if you already have an account.",
    "ចុះឈ្មោះដោយឥតគិតថ្លៃ ហើយរង់ចាំអ្នកគ្រប់គ្រងបញ្ចូលឥណទាន ទើបអាចលេងបាន ឬចូលគណនីប្រសិនបើមានរួចហើយ។",
    "ສະໝັກສະມາຊິກຟຣີ ແລ້ວລໍຖ້າແອດມິນເຕີມເຄຣດິດໃຫ້ຈຶ່ງເລີ່ມຫຼິ້ນໄດ້ ຫຼື ເຂົ້າສູ່ລະບົບຖ້າມີບັນຊີແລ້ວ",
    "Daftar gratis, lalu tunggu admin mengisi saldo sebelum bermain - atau masuk jika sudah punya akun.",
    "Đăng ký miễn phí, sau đó chờ quản trị viên nạp tín dụng để bắt đầu chơi - hoặc đăng nhập nếu đã có tài khoản."],
  "เล่นเลย": ["Play now", "លេងឥឡូវ", "ຫຼິ້ນເລີຍ", "Main sekarang", "Chơi ngay"],
};
// Simplified Chinese (column 5), kept apart so the table above stays readable
const ZH = { "หน้าหลัก": "首页", "แชท": "聊天", "ไอเทมบูสต์": "加速道具", "หวย": "彩票", "โปรไฟล์": "个人资料", "กลับหน้าหลัก": "返回", "แอดมิน": "管理员", "หน้าแอดมิน": "管理后台", "ฝาก / ถอน": "充值 / 提现", "ปิดเสียง": "静音", "เปิดเสียง": "开启声音", "ออกจากระบบ": "退出登录", "การแจ้งเตือน": "通知", "การตั้งค่า": "设置", "กระดานคะแนน": "排行榜", "คำขอถอนของฉัน": "我的提现", "ยังไม่มีรายการ": "暂无记录", "เลือกเซิร์ฟเวอร์ประเทศ": "选择国家", "สมาชิก": "会员", "ทั้งหมด": "全部", "ออนไลน์": "在线", "เกมต้นฉบับ": "原创游戏", "สล็อต": "老虎机", "ไพ่": "纸牌", "วงล้อ": "转盘", "ยอดนิยม": "热门", "เกมใหม่": "新游戏", "เกมยอดนิยม": "热门游戏", "เกมทั้งหมด": "全部游戏", "ค้นหาเกม...": "搜索游戏...", "ไม่พบเกมที่ค้นหา": "未找到游戏", "ล้างคำค้น": "清除", "ยอดเงินคงเหลือ": "余额", "ฝากเงิน": "充值", "ถอนเงิน": "提现", "ถอน": "提现", "ชนะ": "赢得", "ถอนสำเร็จ": "提现成功", "ทัวร์นาเมนต์ประจำวัน": "每日锦标赛", "เข้าร่วม": "参加", "ผสมสิบ ออนไลน์": "凑十 在线", "ดัมมี่ ออนไลน์": "Dummy 在线", "ป๊อกเด้ง ออนไลน์": "博登 在线", "Texas Hold'em ออนไลน์": "德州扑克 在线", "ยิงปลา Ocean Royale": "捕鱼 Ocean Royale", "มังกรทองนำโชค": "金龙送福", "หวยไทย · หวยลาว": "泰国 · 老挝彩票", "777 คลาสสิก": "经典 777", "น้ำเต้าปูปลา": "鱼虾蟹", "ขุมทรัพย์ราชันย์": "王者宝藏", "ป่ามรกต": "翡翠丛林", "WINNER69 ฟุตบอลลีก": "WINNER69 足球联赛", "เข้าสู่ระบบ": "登录", "สมัครสมาชิก": "注册", "สมัครสมาชิกใหม่": "创建账户", "สมัครสมาชิกเพื่อเริ่มเล่น": "注册后开始游戏", "เบอร์โทรศัพท์": "手机号码", "รหัสผ่าน": "密码", "ชื่อผู้ใช้": "用户名", "เข้าสู่ระบบแอดมิน": "管理员登录", "แก้ไขโปรไฟล์": "编辑资料", "เปลี่ยนชื่อ / รูปโปรไฟล์": "修改昵称 / 头像", "ปิด": "关闭", "เลือกรูปโปรไฟล์": "选择头像", "ชื่อที่แสดง (2–16 ตัวอักษร)": "昵称（2–16 个字符）", "สมาชิก WINNER 69": "WINNER 69 会员", "กรอกโค้ดโบนัส": "输入奖励码", "แลกโค้ด": "兑换", "สถิติการเล่น (เซสชันนี้)": "游戏统计（本次）", "จำนวนรอบที่เล่น": "游戏局数", "ยอดเดิมพันรวม": "总投注", "ยอดชนะรวม": "总赢得", "ชนะครั้งใหญ่ที่สุด": "最大赢额", "ประวัติการเล่นล่าสุด": "最近记录", "ยังไม่มีประวัติการเล่นในเซสชันนี้": "暂无游戏记录", "เปลี่ยนรหัสผ่าน": "修改密码", "รหัสผ่านใหม่": "新密码", "บันทึก": "保存", "แชทติดต่อแอดมิน": "联系管理员", "พิมพ์ข้อความ...": "输入消息...", "ส่ง": "发送", "แนบรูป": "图片", "ฝากเครดิต": "充值", "ถอนเครดิต": "提现", "คูปอง": "优惠券", "แลกคูปอง": "兑换优惠券", "ยืนยัน": "确认", "สลิปการโอน": "转账凭证", "เลือกรูปสลิป": "选择凭证图片", "ส่งสลิปเพื่อตรวจสอบ": "提交凭证审核", "จำนวนเครดิตที่ต้องการถอน": "提现金额", "ทำรายการอีกครั้ง": "再次办理", "เครดิตไม่เพียงพอ": "余额不足", "เครดิตไม่พอ": "余额不足", "รอตรวจสอบ": "待审核", "อนุมัติแล้ว": "已批准", "ปฏิเสธ": "已拒绝", "ใช้": "使用", "ซื้อ": "购买", "ถัดไป": "下一步", "ก่อนหน้า": "上一步", "เล่นได้": "可玩", "อันดับ": "排名", "เกม": "款游戏", "สมัครสมาชิกฟรี แล้วรอแอดมินเติมเครดิตเสมือนให้จึงจะเริ่มเล่นได้ หรือเข้าสู่ระบบถ้ามีบัญชีอยู่แล้ว": "免费注册，等待管理员充值后即可开始游戏；已有账户请直接登录。", "เล่นเลย": "立即游戏" };
for (const k of Object.keys(ZH)) if (T[k]) T[k][5] = ZH[k];
const PATTERNS = [
  [/^(\d[\d,]*) เกม$/, (m) => [`${m[1]} games`, `${m[1]} ហ្គេម`, `${m[1]} ເກມ`, `${m[1]} game`, `${m[1]} game`, `${m[1]} 款游戏`]],
  [/^อันดับ (\d+)$/, (m) => [`Rank ${m[1]}`, `ចំណាត់ថ្នាក់ ${m[1]}`, `ອັນດັບ ${m[1]}`, `Peringkat ${m[1]}`, `Hạng ${m[1]}`, `第 ${m[1]} 名`]],
  [/^ผลการค้นหา "(.*)"$/, (m) => [`Results for "${m[1]}"`, `លទ្ធផលសម្រាប់ "${m[1]}"`, `ຜົນການຄົ້ນຫາ "${m[1]}"`, `Hasil untuk "${m[1]}"`, `Kết quả cho "${m[1]}"`, `"${m[1]}" 的搜索结果`]],
  [/^ไอดี (\S+) · สมาชิก WINNER 69$/, (m) => [`ID ${m[1]} · WINNER 69 member`, `ID ${m[1]} · សមាជិក WINNER 69`, `ໄອດີ ${m[1]} · ສະມາຊິກ WINNER 69`, `ID ${m[1]} · Anggota WINNER 69`, `ID ${m[1]} · Thành viên WINNER 69`, `ID ${m[1]} · WINNER 69 会员`]],
  [/^บันทึก \(หัก (\d+) B\)$/, (m) => [`Save (−${m[1]} B)`, `រក្សាទុក (−${m[1]} B)`, `ບັນທຶກ (−${m[1]} B)`, `Simpan (−${m[1]} B)`, `Lưu (−${m[1]} B)`, `保存（−${m[1]} B）`]],
];
const THAI = /[฀-๿]/;
const EDGE = /^([^฀-๿A-Za-z0-9"]*)([\s\S]*?)([^฀-๿A-Za-z0-9")]*)$/;

let lang = "th";
const listeners = new Set();
const orig = new WeakMap();   // text node -> its Thai text (as React last wrote it)
const shown = new WeakMap();  // text node -> what we put there
let observer = null;

function lookup(s) {
  const col = COL[lang];
  if (col === undefined) return null;
  if (T[s]) return T[s][col];
  for (const [re, f] of PATTERNS) { const m = re.exec(s); if (m) return f(m)[col]; }
  return null;
}
/** translate one string (keeps emoji / spaces / symbols around the words) */
export function tr(s) {
  if (lang === "th" || !s || !THAI.test(s)) return s;
  const full = lookup(s.trim());
  if (full) return s.replace(s.trim(), full);
  const m = EDGE.exec(s);
  if (m && m[2]) { const core = lookup(m[2]); if (core) return m[1] + core + m[3]; }
  return s;
}
function skip(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const tag = e.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || e.isContentEditable || (e.hasAttribute && e.hasAttribute("data-no-i18n"))) return true;
  }
  return false;
}
function fixText(node) {
  const cur = node.nodeValue;
  if (shown.get(node) !== cur) orig.set(node, cur);
  const o = orig.get(node);
  if (!o || !THAI.test(o)) return;
  if (node.parentElement && skip(node.parentElement)) return;
  const val = tr(o);
  shown.set(node, val);
  if (val !== cur) node.nodeValue = val;
}
function fixAttrs(el) {
  for (const a of ["placeholder", "title"]) {
    if (!el.hasAttribute(a)) continue;
    const key = "data-i18n-" + a;
    const cur = el.getAttribute(a);
    if (el.getAttribute(key + "-shown") !== cur) el.setAttribute(key, cur);
    const o = el.getAttribute(key);
    if (!THAI.test(o || "")) continue;
    const val = tr(o);
    el.setAttribute(key + "-shown", val);
    if (val !== cur) el.setAttribute(a, val);
  }
}
function walk(root) {
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1) return;
  fixAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.nodeType === 3) fixText(n); else fixAttrs(n); }
}
function ensureObserver() {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === "characterData") fixText(r.target);
      else if (r.type === "attributes") fixAttrs(r.target);
      else r.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title"] });
}

export function getLang() { return lang; }
export function setLang(code) {
  const next = LANGUAGES.some((l) => l.code === code) ? code : "th";
  lang = next;
  try { localStorage.setItem(STORE, next); } catch (e) { /* private mode */ }
  if (typeof document === "undefined" || !document.body) return;
  document.documentElement.lang = next;
  ensureObserver(); // stays on also for Thai, so texts switched earlier come back as Thai
  walk(document.body);
  listeners.forEach((f) => f(next));
}
export function onLang(f) { listeners.add(f); return () => listeners.delete(f); }
export function initI18n() {
  if (typeof window === "undefined") return;
  let saved = "th";
  try { saved = localStorage.getItem(STORE) || "th"; } catch (e) { /* ignore */ }
  const go = () => setLang(saved);
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
}

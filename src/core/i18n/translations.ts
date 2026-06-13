import type { Locale } from "./locale-store";

/**
 * Translation dictionaries. Keys are dotted paths resolved by `t()`.
 * Vietnamese is the default/source language; English mirrors every key.
 */
type Dict = Record<string, string>;

const vi: Dict = {
  // Navbar
  "nav.searchPlaceholder": "Tìm công cụ & trò chơi…",
  "nav.favorites": "Hiện mục yêu thích",
  "nav.toLight": "Chuyển sang giao diện sáng",
  "nav.toDark": "Chuyển sang giao diện tối",
  "nav.language": "Ngôn ngữ",

  // Home
  "home.title": "Bộ công cụ của Quy",
  "home.subtitle": "Công cụ & trò chơi nhỏ — dành cho mình và người thân.",

  // Dashboard
  "dashboard.recentlyUsed": "Dùng gần đây",
  "dashboard.favorites": "Yêu thích",
  "dashboard.noFavoritesTitle": "Chưa có mục yêu thích",
  "dashboard.noFavoritesMsg": "Chạm vào ngôi sao trên bất kỳ công cụ nào để ghim vào đây.",
  "dashboard.nothingFoundTitle": "Không tìm thấy",
  "dashboard.nothingFoundMsg": "Không có công cụ nào khớp với “{query}”.",

  // Categories
  "category.Games": "Trò chơi",
  "category.Utilities": "Tiện ích",
  "category.Productivity": "Năng suất",
  "category.Generators": "Trình tạo",

  // Plugin card
  "card.addFav": "Thêm vào yêu thích",
  "card.removeFav": "Bỏ khỏi yêu thích",

  // Plugin host
  "host.notFoundTitle": "Không tìm thấy plugin",
  "host.notFoundMsg": "“{id}” chưa được đăng ký.",
  "host.back": "Về trang chủ",

  // Offline page
  "offline.title": "Bạn đang ngoại tuyến",
  "offline.msg":
    "Trang này chưa được lưu vào bộ nhớ đệm. Những công cụ bạn đã mở vẫn dùng được khi không có mạng.",
  "offline.back": "Về trang chủ",

  // PWA install prompt
  "pwa.title": "Cài đặt Quy's Toolkit",
  "pwa.subtitle": "Dùng như một ứng dụng trên máy.",
  "pwa.install": "Cài đặt",
  "pwa.dismiss": "Bỏ qua",

  // Auth
  "auth.signIn": "Đăng nhập",
  "auth.signUp": "Đăng ký",
  "auth.signOut": "Đăng xuất",
  "auth.account": "Tài khoản",
  "auth.welcomeTitle": "Chào mừng đến Quy's Toolkit",
  "auth.optionalNote": "Đăng nhập là tuỳ chọn — bạn vẫn dùng được mọi thứ mà không cần tài khoản.",
  "auth.continueGoogle": "Tiếp tục với Google",
  "auth.or": "hoặc",
  "auth.name": "Tên",
  "auth.namePlaceholder": "Tên của bạn",
  "auth.email": "Email",
  "auth.password": "Mật khẩu",
  "auth.confirmPassword": "Xác nhận mật khẩu",
  "auth.showPassword": "Hiện mật khẩu",
  "auth.hidePassword": "Ẩn mật khẩu",
  "auth.noAccount": "Chưa có tài khoản?",
  "auth.haveAccount": "Đã có tài khoản?",
  "auth.createAccount": "Tạo tài khoản",
  "auth.skip": "Bỏ qua, dùng không cần đăng nhập",
  "auth.processing": "Đang xử lý…",
  "auth.welcomeBack": "Chào mừng trở lại!",
  "auth.accountCreated": "Đã tạo tài khoản!",
  "auth.signedOut": "Đã đăng xuất.",
  "auth.demoGoogleNote": "Đăng nhập Google ở bản này là demo cục bộ.",
  "auth.err.nameRequired": "Vui lòng nhập tên.",
  "auth.err.emailInvalid": "Email không hợp lệ.",
  "auth.err.passwordMin": "Mật khẩu tối thiểu 6 ký tự.",
  "auth.err.passwordMismatch": "Mật khẩu không khớp.",
  "auth.err.emailInUse": "Email này đã được đăng ký.",
  "auth.err.invalidCredentials": "Email hoặc mật khẩu không đúng.",
  "auth.err.generic": "Có lỗi xảy ra, vui lòng thử lại.",

  // Plugin metadata
  "plugins.tic-tac-toe.name": "Tic Tac Toe Vô Hạn",
  "plugins.tic-tac-toe.description": "Cờ ca-rô 3×3 với các dấu tự biến mất sau vài giây.",
  "plugins.wheel-spinner.name": "Vòng Quay May Mắn",
  "plugins.wheel-spinner.description":
    "Quay vòng quay chứa các tên để chọn ngẫu nhiên người thắng.",

  // Tic Tac Toe (Infinity)
  "ttt.subtitle": "Mỗi dấu sẽ tự biến mất sau {s} giây",
  "ttt.turn": "Lượt",
  "ttt.draws": "Hòa",
  "ttt.playerXTurn": "Lượt của người chơi X",
  "ttt.playerOTurn": "Lượt của người chơi O",
  "ttt.playerXWins": "Người chơi X thắng! 🎉",
  "ttt.playerOWins": "Người chơi O thắng! 🎉",
  "ttt.disappearTime": "Thời gian biến mất",
  "ttt.restart": "Chơi lại",
  "ttt.resetScores": "Đặt lại điểm",
  "ttt.playAgain": "Chơi tiếp",
  "ttt.niceGame": "Ván hay đấy!",
  "ttt.cellLabel": "Ô {n}",
  "ttt.howToTitle": "Cách chơi",
  "ttt.howToBody":
    "Lần lượt đặt dấu. Mỗi dấu biến mất sau bộ đếm — hãy tạo 3 dấu thẳng hàng trước khi chúng biến mất!",

  // Wheel Spinner
  "wheel.entriesCount": "Mục ({n})",
  "wheel.shuffle": "Trộn",
  "wheel.clear": "Xóa hết",
  "wheel.addPlaceholder": "Thêm một tên (hoặc dán danh sách)…",
  "wheel.enterName": "Nhập một tên",
  "wheel.entryName": "Tên mục",
  "wheel.weight": "Trọng số",
  "wheel.decreaseWeight": "Giảm trọng số",
  "wheel.increaseWeight": "Tăng trọng số",
  "wheel.removeEntry": "Xóa {label}",
  "wheel.addEntry": "Thêm mục",
  "wheel.noEntries": "Chưa có mục nào — hãy thêm vài tên ở trên.",
  "wheel.saveThisWheel": "Lưu vòng quay này",
  "wheel.savePreset": "Lưu mẫu",
  "wheel.savedWheels": "Vòng quay đã lưu",
  "wheel.deletePreset": "Xóa {name}",
  "wheel.import": "Nhập",
  "wheel.export": "Xuất",
  "wheel.removeWinnerAfter": "Xóa người thắng sau khi quay",
  "wheel.soundEffects": "Hiệu ứng âm thanh",
  "wheel.spin": "Quay",
  "wheel.spinning": "Đang quay…",
  "wheel.spinAria": "Quay vòng quay",
  "wheel.wheelAria": "Vòng quay",
  "wheel.addTwo": "Thêm ít nhất hai mục để quay.",
  "wheel.theWinnerIs": "Người thắng là",
  "wheel.spinAgain": "Quay lại",
  "wheel.saved": "Đã lưu “{name}”",
  "wheel.imported": "Đã nhập vòng quay",
  "wheel.invalidFile": "Tệp vòng quay không hợp lệ",
  "wheel.defaultName": "Vòng quay của tôi",
  "wheel.close": "Đóng",

  // Plugin metadata (new tools)
  "plugins.calculator.name": "Máy Tính",
  "plugins.calculator.description": "Máy tính gọn gàng, đúng thứ tự ưu tiên và có lịch sử.",
  "plugins.timer.name": "Hẹn Giờ & Bấm Giờ",
  "plugins.timer.description": "Đếm ngược có chuông báo và đồng hồ bấm giờ ghi vòng.",
  "plugins.bill-split.name": "Chia Hóa Đơn",
  "plugins.bill-split.description":
    "Chia tiền kèm tiền boa theo số người — biết mỗi người trả bao nhiêu.",
  "plugins.qr-generator.name": "Tạo Mã QR",
  "plugins.qr-generator.description": "Biến văn bản, liên kết hay WiFi thành mã QR và tải về.",
  "plugins.password-generator.name": "Tạo Mật Khẩu",
  "plugins.password-generator.description":
    "Tạo mật khẩu mạnh ngẫu nhiên — hoàn toàn trên máy bạn.",
  "plugins.memory.name": "Lật Thẻ Tìm Cặp",
  "plugins.memory.description": "Lật thẻ tìm cặp giống nhau — phá kỷ lục của bạn.",
  "plugins.2048.name": "2048",
  "plugins.2048.description": "Trượt ô, gộp số giống nhau, chạm mốc 2048.",

  // Calculator
  "calc.history": "Lịch sử",
  "calc.clear": "Xóa",
  "calc.noHistory": "Chưa có phép tính nào.",

  // Timer & Stopwatch
  "timer.tabTimer": "Hẹn giờ",
  "timer.tabStopwatch": "Bấm giờ",
  "timer.start": "Bắt đầu",
  "timer.pause": "Tạm dừng",
  "timer.resume": "Tiếp tục",
  "timer.reset": "Đặt lại",
  "timer.lap": "Vòng",
  "timer.minutes": "Phút",
  "timer.seconds": "Giây",

  // Bill splitter
  "bill.amount": "Số tiền hóa đơn",
  "bill.tip": "Tiền boa",
  "bill.people": "Số người",
  "bill.roundUp": "Làm tròn lên (nghìn)",
  "bill.perPerson": "Mỗi người trả",
  "bill.tipAmount": "Tiền boa",
  "bill.total": "Tổng cộng",

  // QR generator
  "qr.label": "Nội dung",
  "qr.placeholder": "Nhập văn bản, liên kết…",
  "qr.download": "Tải PNG",
  "qr.empty": "Nhập nội dung để tạo mã QR.",

  // Password generator
  "pw.length": "Độ dài",
  "pw.upper": "Chữ HOA",
  "pw.lower": "Chữ thường",
  "pw.numbers": "Chữ số",
  "pw.symbols": "Ký hiệu",
  "pw.generate": "Tạo mới",
  "pw.copy": "Sao chép",
  "pw.copied": "Đã sao chép mật khẩu",
  "pw.weak": "Yếu",
  "pw.fair": "Trung bình",
  "pw.strong": "Mạnh",
  "pw.veryStrong": "Rất mạnh",

  // Memory
  "mem.easy": "Dễ",
  "mem.hard": "Khó",
  "mem.new": "Ván mới",
  "mem.moves": "Lượt",
  "mem.best": "Kỷ lục",
  "mem.hidden": "Thẻ úp",
  "mem.won": "Hoàn thành trong {moves} lượt!",

  // 2048
  "g2048.score": "Điểm",
  "g2048.best": "Kỷ lục",
  "g2048.new": "Ván mới",
  "g2048.won": "Bạn đạt 2048!",
  "g2048.continue": "Chơi tiếp",
  "g2048.over": "Hết nước đi!",
  "g2048.howto": "Dùng phím mũi tên hoặc vuốt để trượt ô.",

  // Plugin metadata (batch 2)
  "plugins.coin-dice.name": "Đồng Xu & Xúc Xắc",
  "plugins.coin-dice.description": "Tung đồng xu hoặc gieo xúc xắc để quyết định nhanh.",
  "plugins.random-picker.name": "Chọn Ngẫu Nhiên",
  "plugins.random-picker.description": "Bốc số ngẫu nhiên trong khoảng, hoặc chọn từ danh sách.",
  "plugins.color-palette.name": "Bảng Màu",
  "plugins.color-palette.description": "Tạo bảng màu, khoá màu ưng ý và sao chép mã hex.",
  "plugins.todo.name": "Việc Cần Làm",
  "plugins.todo.description": "Danh sách việc cần làm, lưu ngay trên máy.",
  "plugins.notes.name": "Ghi Chú",
  "plugins.notes.description": "Ghi chú nhanh, lưu cục bộ trên thiết bị.",
  "plugins.unit-converter.name": "Chuyển Đổi Đơn Vị",
  "plugins.unit-converter.description": "Đổi độ dài, cân nặng, nhiệt độ và tiền tệ.",
  "plugins.flappy-bird.name": "Chim Vỗ Cánh",
  "plugins.flappy-bird.description": "Vỗ cánh né ống — ăn điểm và phá kỷ lục.",
  "plugins.tower.name": "Xây Tháp",
  "plugins.tower.description": "Thả khối thật thẳng để xây tháp cao nhất.",

  // Coin & Dice
  "cd.tabCoin": "Đồng xu",
  "cd.tabDice": "Xúc xắc",
  "cd.flip": "Tung",
  "cd.roll": "Gieo",
  "cd.heads": "Ngửa",
  "cd.tails": "Sấp",
  "cd.diceCount": "viên",
  "cd.total": "Tổng",

  // Random picker
  "rp.tabNumber": "Bốc số",
  "rp.tabList": "Danh sách",
  "rp.min": "Nhỏ nhất",
  "rp.max": "Lớn nhất",
  "rp.draw": "Bốc số",
  "rp.result": "Kết quả",
  "rp.itemsPlaceholder": "Mỗi dòng một mục…",
  "rp.pick": "Chọn",

  // Color palette
  "cp.generate": "Tạo bảng màu",
  "cp.copied": "Đã sao chép {hex}",
  "cp.lock": "Khoá màu",
  "cp.hint": "Nhấn phím cách để tạo lại; bấm vào mã để sao chép.",

  // To-do
  "todo.placeholder": "Thêm việc cần làm…",
  "todo.add": "Thêm",
  "todo.remaining": "Còn lại {n}",
  "todo.clearDone": "Xoá việc đã xong",
  "todo.empty": "Chưa có việc nào.",

  // Notes
  "notes.new": "Ghi chú mới",
  "notes.title": "Tiêu đề",
  "notes.body": "Nội dung…",
  "notes.empty": "Chọn hoặc tạo một ghi chú.",
  "notes.untitled": "(Không tiêu đề)",
  "notes.delete": "Xoá",
  "notes.noNotes": "Chưa có ghi chú.",

  // Unit converter
  "uc.length": "Độ dài",
  "uc.weight": "Cân nặng",
  "uc.temperature": "Nhiệt độ",
  "uc.currency": "Tiền tệ",
  "uc.from": "Từ",
  "uc.to": "Sang",
  "uc.swap": "Đảo chiều",
  "uc.currencyOffline": "Cần kết nối Internet để tải tỉ giá (sau đó sẽ dùng được offline).",

  // Flappy Bird
  "fb.score": "Điểm",
  "fb.best": "Kỷ lục",
  "fb.tapToStart": "Chạm hoặc nhấn Space để bắt đầu",
  "fb.over": "Thua rồi!",
  "fb.newBest": "Kỷ lục mới!",
  "fb.restart": "Chơi lại",
  "fb.howto": "Chạm màn hình / nhấn Space hoặc ↑ để vỗ cánh.",

  // Tower Stack
  "tw.easy": "Dễ",
  "tw.medium": "Trung bình",
  "tw.hard": "Khó",
  "tw.score": "Điểm",
  "tw.best": "Kỷ lục",
  "tw.tapToStart": "Chạm hoặc nhấn Space để thả khối",
  "tw.over": "Hụt rồi!",
  "tw.newBest": "Kỷ lục mới!",
  "tw.restart": "Chơi lại",
  "tw.howto": "Nhấn Space hoặc chạm để thả khối — xếp càng thẳng càng tốt.",
};

const en: Dict = {
  "nav.searchPlaceholder": "Search tools & games…",
  "nav.favorites": "Show favorites",
  "nav.toLight": "Switch to light mode",
  "nav.toDark": "Switch to dark mode",
  "nav.language": "Language",

  "home.title": "Quy's Toolkit",
  "home.subtitle": "Handy tools & mini-games — for me and my family.",

  "dashboard.recentlyUsed": "Recently used",
  "dashboard.favorites": "Favorites",
  "dashboard.noFavoritesTitle": "No favorites yet",
  "dashboard.noFavoritesMsg": "Tap the star on any tool to pin it here.",
  "dashboard.nothingFoundTitle": "Nothing found",
  "dashboard.nothingFoundMsg": "No tools match “{query}”.",

  "category.Games": "Games",
  "category.Utilities": "Utilities",
  "category.Productivity": "Productivity",
  "category.Generators": "Generators",

  "card.addFav": "Add to favorites",
  "card.removeFav": "Remove from favorites",

  "host.notFoundTitle": "Plugin not found",
  "host.notFoundMsg": "“{id}” isn’t registered.",
  "host.back": "Back to dashboard",

  "offline.title": "You're offline",
  "offline.msg":
    "This page hasn’t been cached yet. Tools you’ve already opened still work without a connection.",
  "offline.back": "Back to dashboard",

  "pwa.title": "Install Quy's Toolkit",
  "pwa.subtitle": "Use it like an app on your device.",
  "pwa.install": "Install",
  "pwa.dismiss": "Dismiss",

  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.signOut": "Sign out",
  "auth.account": "Account",
  "auth.welcomeTitle": "Welcome to Quy's Toolkit",
  "auth.optionalNote": "Signing in is optional — you can use everything without an account.",
  "auth.continueGoogle": "Continue with Google",
  "auth.or": "or",
  "auth.name": "Name",
  "auth.namePlaceholder": "Your name",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm password",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",
  "auth.createAccount": "Create account",
  "auth.skip": "Skip, use without an account",
  "auth.processing": "Please wait…",
  "auth.welcomeBack": "Welcome back!",
  "auth.accountCreated": "Account created!",
  "auth.signedOut": "Signed out.",
  "auth.demoGoogleNote": "Google sign-in is a local demo in this build.",
  "auth.err.nameRequired": "Please enter your name.",
  "auth.err.emailInvalid": "Invalid email address.",
  "auth.err.passwordMin": "Password must be at least 6 characters.",
  "auth.err.passwordMismatch": "Passwords do not match.",
  "auth.err.emailInUse": "This email is already registered.",
  "auth.err.invalidCredentials": "Incorrect email or password.",
  "auth.err.generic": "Something went wrong, please try again.",

  "plugins.tic-tac-toe.name": "Tic Tac Toe Infinity",
  "plugins.tic-tac-toe.description":
    "3×3 noughts & crosses where marks vanish after a few seconds.",
  "plugins.wheel-spinner.name": "Wheel Spinner",
  "plugins.wheel-spinner.description": "Spin a wheel of names to pick a random winner.",

  "ttt.subtitle": "Each mark disappears after {s} seconds",
  "ttt.turn": "Turn",
  "ttt.draws": "Draws",
  "ttt.playerXTurn": "Player X's turn",
  "ttt.playerOTurn": "Player O's turn",
  "ttt.playerXWins": "Player X wins! 🎉",
  "ttt.playerOWins": "Player O wins! 🎉",
  "ttt.disappearTime": "Disappear time",
  "ttt.restart": "Restart",
  "ttt.resetScores": "Reset scores",
  "ttt.playAgain": "Play again",
  "ttt.niceGame": "Nice game!",
  "ttt.cellLabel": "Cell {n}",
  "ttt.howToTitle": "How to play",
  "ttt.howToBody":
    "Take turns placing marks. Each mark disappears when its timer runs out — line up 3 before they vanish!",

  "wheel.entriesCount": "Entries ({n})",
  "wheel.shuffle": "Shuffle",
  "wheel.clear": "Clear",
  "wheel.addPlaceholder": "Add a name (or paste a list)…",
  "wheel.enterName": "Enter a name",
  "wheel.entryName": "Entry name",
  "wheel.weight": "Weight",
  "wheel.decreaseWeight": "Decrease weight",
  "wheel.increaseWeight": "Increase weight",
  "wheel.removeEntry": "Remove {label}",
  "wheel.addEntry": "Add entry",
  "wheel.noEntries": "No entries yet — add a few names above.",
  "wheel.saveThisWheel": "Save this wheel",
  "wheel.savePreset": "Save preset",
  "wheel.savedWheels": "Saved wheels",
  "wheel.deletePreset": "Delete {name}",
  "wheel.import": "Import",
  "wheel.export": "Export",
  "wheel.removeWinnerAfter": "Remove winner after spin",
  "wheel.soundEffects": "Sound effects",
  "wheel.spin": "Spin",
  "wheel.spinning": "Spinning…",
  "wheel.spinAria": "Spin the wheel",
  "wheel.wheelAria": "Prize wheel",
  "wheel.addTwo": "Add at least two entries to spin.",
  "wheel.theWinnerIs": "The winner is",
  "wheel.spinAgain": "Spin again",
  "wheel.saved": "Saved “{name}”",
  "wheel.imported": "Wheel imported",
  "wheel.invalidFile": "Invalid wheel file",
  "wheel.defaultName": "My Wheel",
  "wheel.close": "Close",

  // Plugin metadata (new tools)
  "plugins.calculator.name": "Calculator",
  "plugins.calculator.description": "A clean calculator with order of operations and history.",
  "plugins.timer.name": "Timer & Stopwatch",
  "plugins.timer.description": "Countdown timer with alarm and a lap stopwatch.",
  "plugins.bill-split.name": "Bill Splitter",
  "plugins.bill-split.description": "Split a bill with tip across people — see what each owes.",
  "plugins.qr-generator.name": "QR Generator",
  "plugins.qr-generator.description": "Turn any text, link or WiFi into a QR code and download it.",
  "plugins.password-generator.name": "Password Generator",
  "plugins.password-generator.description":
    "Create strong random passwords — fully on your device.",
  "plugins.memory.name": "Memory Match",
  "plugins.memory.description": "Flip cards to find matching pairs — beat your best score.",
  "plugins.2048.name": "2048",
  "plugins.2048.description": "Slide tiles, merge matching numbers, and reach 2048.",

  // Calculator
  "calc.history": "History",
  "calc.clear": "Clear",
  "calc.noHistory": "No calculations yet.",

  // Timer & Stopwatch
  "timer.tabTimer": "Timer",
  "timer.tabStopwatch": "Stopwatch",
  "timer.start": "Start",
  "timer.pause": "Pause",
  "timer.resume": "Resume",
  "timer.reset": "Reset",
  "timer.lap": "Lap",
  "timer.minutes": "Minutes",
  "timer.seconds": "Seconds",

  // Bill splitter
  "bill.amount": "Bill amount",
  "bill.tip": "Tip",
  "bill.people": "People",
  "bill.roundUp": "Round up (thousands)",
  "bill.perPerson": "Each person pays",
  "bill.tipAmount": "Tip",
  "bill.total": "Total",

  // QR generator
  "qr.label": "Content",
  "qr.placeholder": "Enter text, a link…",
  "qr.download": "Download PNG",
  "qr.empty": "Enter content to make a QR code.",

  // Password generator
  "pw.length": "Length",
  "pw.upper": "Uppercase",
  "pw.lower": "Lowercase",
  "pw.numbers": "Numbers",
  "pw.symbols": "Symbols",
  "pw.generate": "Generate",
  "pw.copy": "Copy",
  "pw.copied": "Password copied",
  "pw.weak": "Weak",
  "pw.fair": "Fair",
  "pw.strong": "Strong",
  "pw.veryStrong": "Very strong",

  // Memory
  "mem.easy": "Easy",
  "mem.hard": "Hard",
  "mem.new": "New game",
  "mem.moves": "Moves",
  "mem.best": "Best",
  "mem.hidden": "Hidden card",
  "mem.won": "Done in {moves} moves!",

  // 2048
  "g2048.score": "Score",
  "g2048.best": "Best",
  "g2048.new": "New game",
  "g2048.won": "You reached 2048!",
  "g2048.continue": "Keep going",
  "g2048.over": "Game over!",
  "g2048.howto": "Use arrow keys or swipe to slide tiles.",

  // Plugin metadata (batch 2)
  "plugins.coin-dice.name": "Coin & Dice",
  "plugins.coin-dice.description": "Flip a coin or roll dice to make a quick decision.",
  "plugins.random-picker.name": "Random Picker",
  "plugins.random-picker.description": "Draw a random number in a range, or pick from a list.",
  "plugins.color-palette.name": "Color Palette",
  "plugins.color-palette.description":
    "Generate color palettes, lock favourites and copy hex codes.",
  "plugins.todo.name": "To-do List",
  "plugins.todo.description": "A simple checklist that saves on your device.",
  "plugins.notes.name": "Notes",
  "plugins.notes.description": "Quick notes, saved locally on your device.",
  "plugins.unit-converter.name": "Unit Converter",
  "plugins.unit-converter.description": "Convert length, weight, temperature and currency.",
  "plugins.flappy-bird.name": "Flappy Bird",
  "plugins.flappy-bird.description": "Flap through the pipes — score points and beat your best.",
  "plugins.tower.name": "Tower Stack",
  "plugins.tower.description": "Drop blocks dead-straight to build the tallest tower.",

  // Coin & Dice
  "cd.tabCoin": "Coin",
  "cd.tabDice": "Dice",
  "cd.flip": "Flip",
  "cd.roll": "Roll",
  "cd.heads": "Heads",
  "cd.tails": "Tails",
  "cd.diceCount": "dice",
  "cd.total": "Total",

  // Random picker
  "rp.tabNumber": "Number",
  "rp.tabList": "List",
  "rp.min": "Min",
  "rp.max": "Max",
  "rp.draw": "Draw",
  "rp.result": "Result",
  "rp.itemsPlaceholder": "One item per line…",
  "rp.pick": "Pick",

  // Color palette
  "cp.generate": "Generate",
  "cp.copied": "Copied {hex}",
  "cp.lock": "Lock colour",
  "cp.hint": "Press Space to regenerate; click a code to copy.",

  // To-do
  "todo.placeholder": "Add a task…",
  "todo.add": "Add",
  "todo.remaining": "{n} left",
  "todo.clearDone": "Clear done",
  "todo.empty": "No tasks yet.",

  // Notes
  "notes.new": "New note",
  "notes.title": "Title",
  "notes.body": "Write something…",
  "notes.empty": "Select or create a note.",
  "notes.untitled": "(Untitled)",
  "notes.delete": "Delete",
  "notes.noNotes": "No notes yet.",

  // Unit converter
  "uc.length": "Length",
  "uc.weight": "Weight",
  "uc.temperature": "Temp",
  "uc.currency": "Currency",
  "uc.from": "From",
  "uc.to": "To",
  "uc.swap": "Swap",
  "uc.currencyOffline": "Connect to the internet once to load rates (then it works offline).",

  // Flappy Bird
  "fb.score": "Score",
  "fb.best": "Best",
  "fb.tapToStart": "Tap or press Space to start",
  "fb.over": "Game over!",
  "fb.newBest": "New best!",
  "fb.restart": "Play again",
  "fb.howto": "Tap the screen / press Space or ↑ to flap.",

  // Tower Stack
  "tw.easy": "Easy",
  "tw.medium": "Medium",
  "tw.hard": "Hard",
  "tw.score": "Score",
  "tw.best": "Best",
  "tw.tapToStart": "Tap or press Space to drop a block",
  "tw.over": "Missed!",
  "tw.newBest": "New best!",
  "tw.restart": "Play again",
  "tw.howto": "Press Space or tap to drop the block — line it up as straight as you can.",
};

export const dictionaries: Record<Locale, Dict> = { vi, en };

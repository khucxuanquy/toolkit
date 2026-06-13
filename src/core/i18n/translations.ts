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
};

export const dictionaries: Record<Locale, Dict> = { vi, en };

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = ym_video_core::run() {
        eprintln!("桌面应用启动失败：{error}");
        std::process::exit(1);
    }
}

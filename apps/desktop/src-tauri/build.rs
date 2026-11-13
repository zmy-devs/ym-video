fn main() {
    // 共用图标位于原生工程外，变化时重新生成程序资源和窗口图标。
    println!("cargo:rerun-if-changed=../../../assets/icon.png");
    println!("cargo:rerun-if-changed=../build/generated/icon.ico");

    tauri_build::build();

    // Rust 测试程序与 Tauri 主程序使用相同的 Windows 通用控件版本。
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-tests=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'"
        );
    }
}

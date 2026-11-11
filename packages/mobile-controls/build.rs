fn main() {
    tauri_plugin::Builder::new(&[
        "set_status_bar_style",
        "set_brightness",
        "get_brightness",
        "reset_brightness",
        "set_landscape",
        "set_immersive",
        "set_keep_screen_on",
    ])
    .android_path("android")
    .build();
}

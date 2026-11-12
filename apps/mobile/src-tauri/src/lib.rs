use tauri_plugin_opener::OpenerExt;
use ym_video_native_core::{invoke_handler, manage_network};

mod update;

// Mobile Tauri owns Android plugins and delegates API/session behavior to the shared core.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(target_os = "android")]
    let builder = builder
        .plugin(tauri_plugin_mobile_controls::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_android_installer::init());

    let network_handler = invoke_handler();
    let update_handler = update::invoke_handler();
    let builder = builder
        .invoke_handler(move |invoke| {
            if invoke.message.command() == "android_update_manifest" {
                update_handler(invoke)
            } else {
                network_handler(invoke)
            }
        })
        .setup(|app| {
            manage_network(app)?;
            let handle = app.handle().clone();
            tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                .on_navigation(is_mobile_url)
                .on_new_window(move |url, _| {
                    if ["https", "mailto"].contains(&url.scheme()) {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        });
    builder
        .run(tauri::generate_context!())
        .expect("无法启动移动端 Tauri 应用");
}

fn is_mobile_url(url: &tauri::Url) -> bool {
    url.origin().ascii_serialization() == "http://tauri.localhost"
        || (cfg!(debug_assertions)
            && url.port() == Some(3002)
            && (url.host_str() == Some("localhost")
                || url.host_str() == Some("127.0.0.1")
                || option_env!("TAURI_DEV_HOST") == url.host_str()))
}

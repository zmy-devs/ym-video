use tauri::Manager;
#[cfg(windows)]
use tauri_plugin_opener::OpenerExt;
use ym_video_native_core::{invoke_handler, manage_network};

// Keep desktop window behavior in the Windows shell.
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let builder = tauri::Builder::default().invoke_handler(invoke_handler());

    #[cfg(windows)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let result = window
                    .unminimize()
                    .and_then(|()| window.show())
                    .and_then(|()| window.set_focus());
                if let Err(error) = result {
                    eprintln!("无法唤起窗口：{error}");
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build());

    let builder = builder.setup(|app| {
        manage_network(app)?;
        let handle = app.handle().clone();
        let navigation_handle = handle.clone();
        tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
            .icon(tauri::include_image!("../../../assets/icon.png"))?
            .on_navigation(move |url| {
                if is_app_url(url) {
                    return true;
                }
                open_external(&navigation_handle, url);
                false
            })
            .on_new_window(move |url, _| {
                if is_app_url(&url) {
                    if let Some(window) = handle.get_webview_window("main")
                        && let Err(error) = window.navigate(url)
                    {
                        eprintln!("无法打开页面：{error}");
                    }
                } else {
                    open_external(&handle, &url);
                }
                tauri::webview::NewWindowResponse::Deny
            })
            .build()?;
        Ok(())
    });

    builder.run(tauri::generate_context!())?;
    Ok(())
}

// Desktop navigation permits the packaged origin and the local Vite server only.
fn is_app_url(url: &tauri::Url) -> bool {
    url.origin().ascii_serialization() == "http://tauri.localhost"
        || (cfg!(debug_assertions)
            && url.port() == Some(3000)
            && (url.host_str() == Some("localhost")
                || option_env!("TAURI_DEV_HOST") == url.host_str()))
}

// Open only external web links through the operating system.
fn open_external(app: &tauri::AppHandle, url: &tauri::Url) {
    if ["https", "mailto"].contains(&url.scheme())
        && let Err(error) = app.opener().open_url(url.as_str(), None::<&str>)
    {
        eprintln!("无法打开链接：{error}");
    }
}

mod error;
mod network;
mod session;

use error::AppError;
use network::{ApiRequest, ApiResponse, Network};
use std::sync::Arc;
use tauri::{Manager, State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;

// 应用页面和开发服务共用一致的来源约束。
fn is_app_url(url: &tauri::Url) -> bool {
    let origin = url.origin().ascii_serialization();
    origin == "http://tauri.localhost"
        || (cfg!(debug_assertions) && origin == "http://localhost:3000")
}

// 外部链接由系统默认应用打开。
fn open_external(app: &tauri::AppHandle, url: &tauri::Url) {
    if ["https", "mailto"].contains(&url.scheme())
        && let Err(error) = app.opener().open_url(url.as_str(), None::<&str>)
    {
        eprintln!("无法打开链接：{error}");
    }
}

// 每次原生请求均核实窗口和当前来源。
fn trusted(window: &WebviewWindow) -> Result<(), AppError> {
    let url = window
        .url()
        .map_err(|_| AppError::new("无法确定页面来源"))?;
    if window.label() != "main" || !is_app_url(&url) {
        return Err(AppError::new("不允许此页面使用本地能力"));
    }
    Ok(())
}

#[tauri::command]
async fn request_api(
    window: WebviewWindow,
    state: State<'_, Network>,
    id: String,
    request: ApiRequest,
) -> Result<ApiResponse, AppError> {
    trusted(&window)?;
    state.run(id, state.request_api(request)).await
}

#[tauri::command]
async fn request_resource(
    window: WebviewWindow,
    state: State<'_, Network>,
    id: String,
    url: String,
) -> Result<serde_json::Value, AppError> {
    trusted(&window)?;
    state.run(id, state.request_resource(&url)).await
}

#[tauri::command]
fn cancel_request(
    window: WebviewWindow,
    state: State<'_, Network>,
    id: String,
) -> Result<(), AppError> {
    trusted(&window)?;
    state.cancel(id)
}

pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            request_api,
            request_resource,
            cancel_request
        ])
        .setup(|app| {
            let directory = app.path().app_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            app.manage(Network::new(Arc::new(session::SessionStore::open(
                directory.join("session.bin"),
            )))?);
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
        })
        .run(tauri::generate_context!())?;
    Ok(())
}

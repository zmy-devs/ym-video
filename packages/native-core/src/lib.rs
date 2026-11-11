mod commands;
pub mod error;
pub mod network;
pub mod session;

use std::sync::Arc;
use tauri::{App, Manager, Runtime, WebviewWindow};

pub use commands::invoke_handler;
pub use error::AppError;
pub use network::{ApiRequest, ApiResponse, Network};
pub use session::SessionStore;

// Both application shells initialize the same network and protected cookie store.
pub fn manage_network<R: Runtime>(app: &mut App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let directory = app.path().app_data_dir()?;
    std::fs::create_dir_all(&directory)?;
    app.manage(Network::new(Arc::new(SessionStore::open(
        directory.join("session.bin"),
    )?))?);
    Ok(())
}

// Check that a native request comes from the owning window and its local app page.
pub fn trusted<R: Runtime>(window: &WebviewWindow<R>, dev_port: u16) -> Result<(), AppError> {
    let url = window
        .url()
        .map_err(|_| AppError::new("无法确定页面来源"))?;
    let origin = url.origin().ascii_serialization();
    let is_dev_origin = cfg!(debug_assertions)
        && url.port() == Some(dev_port)
        && (url.host_str() == Some("localhost")
            || url.host_str() == Some("127.0.0.1")
            || option_env!("TAURI_DEV_HOST") == url.host_str());
    if window.label() != "main" || (origin != "http://tauri.localhost" && !is_dev_origin) {
        return Err(AppError::new("不允许此页面使用本地能力"));
    }
    Ok(())
}

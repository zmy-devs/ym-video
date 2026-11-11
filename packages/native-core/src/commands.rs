use crate::{ApiRequest, ApiResponse, AppError, Network, trusted};
use tauri::{Runtime, State, WebviewWindow, ipc::Invoke};

const DEV_PORT: u16 = if cfg!(target_os = "android") {
    3002
} else {
    3000
};

#[tauri::command]
async fn request_api<R: Runtime>(
    window: WebviewWindow<R>,
    state: State<'_, Network>,
    id: String,
    request: ApiRequest,
) -> Result<ApiResponse, AppError> {
    trusted(&window, DEV_PORT)?;
    state.run(id, state.request_api(request)).await
}

#[tauri::command]
async fn request_resource<R: Runtime>(
    window: WebviewWindow<R>,
    state: State<'_, Network>,
    id: String,
    url: String,
) -> Result<serde_json::Value, AppError> {
    trusted(&window, DEV_PORT)?;
    state.run(id, state.request_resource(&url)).await
}

#[tauri::command]
fn cancel_request<R: Runtime>(
    window: WebviewWindow<R>,
    state: State<'_, Network>,
    id: String,
) -> Result<(), AppError> {
    trusted(&window, DEV_PORT)?;
    state.cancel(id)
}

pub fn invoke_handler<R: Runtime>() -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![request_api, request_resource, cancel_request]
}

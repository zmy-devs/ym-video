use std::time::Duration;
use tauri::{ipc::Invoke, Runtime, WebviewWindow};
use ym_video_native_core::{trusted, AppError};

// 固定更新入口允许跟随 Gitee 附件重定向，独立于目录源请求。
#[tauri::command]
async fn android_update_manifest<R: Runtime>(
    window: WebviewWindow<R>,
) -> Result<serde_json::Value, AppError> {
    trusted(&window, 3002)?;
    let endpoint =
        "https://gitee.com/zmy-devs/ym-video/releases/download/latest-android/android.json";
    #[cfg(debug_assertions)]
    let endpoint = if option_env!("YM_VIDEO_ANDROID_LOCAL_UPDATE") == Some("1") {
        "http://127.0.0.1:18789/android.json"
    } else {
        endpoint
    };
    let response = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()?
        .get(endpoint)
        .send()
        .await?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::new("Android 更新清单尚未发布，请稍后再试"));
    }
    if !response.status().is_success() {
        return Err(AppError::new(format!(
            "更新服务请求失败（HTTP {}）",
            response.status().as_u16()
        )));
    }
    Ok(response.json().await?)
}

// 将移动端更新命令与共享网络命令路由组合。
pub fn invoke_handler<R: Runtime>() -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![android_update_manifest]
}

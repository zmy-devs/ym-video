use serde::Serialize;
use tauri::{
    plugin::{Builder, PluginApi, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime, WebviewWindow,
};

const IDENTIFIER: &str = "com.ymvideo.mobilecontrols";

struct MobileControls<R: Runtime>(PluginHandle<R>);

fn trusted<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let url = window.url().map_err(|_| "无法确定页面来源")?;
    let origin = url.origin().ascii_serialization();
    let dev_port = if cfg!(target_os = "android") {
        3002
    } else {
        3000
    };
    let is_dev_origin = cfg!(debug_assertions)
        && url.port() == Some(dev_port)
        && (url.host_str() == Some("localhost") || option_env!("TAURI_DEV_HOST") == url.host_str());
    if window.label() != "main" || (origin != "http://tauri.localhost" && !is_dev_origin) {
        return Err("不允许此页面使用本地能力".to_owned());
    }
    Ok(())
}

impl<R: Runtime> MobileControls<R> {
    fn run<T: Serialize>(&self, command: &str, value: T) -> Result<(), String> {
        self.0
            .run_mobile_plugin(command, value)
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
async fn set_status_bar_style<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
    dark: bool,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .run("setStatusBarStyle", dark)
}

#[tauri::command]
async fn set_brightness<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
    brightness: f32,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .run("setBrightness", brightness)
}

#[tauri::command]
async fn get_brightness<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
) -> Result<f32, String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .0
        .run_mobile_plugin("getBrightness", ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn reset_brightness<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>().run("resetBrightness", ())
}

#[tauri::command]
async fn set_landscape<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .run("setLandscape", enabled)
}

#[tauri::command]
async fn set_immersive<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .run("setImmersive", enabled)
}

#[tauri::command]
async fn set_keep_screen_on<R: Runtime>(
    window: WebviewWindow<R>,
    app: AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    trusted(&window)?;
    app.state::<MobileControls<R>>()
        .run("setKeepScreenOn", enabled)
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-controls")
        .invoke_handler(tauri::generate_handler![
            set_status_bar_style,
            set_brightness,
            get_brightness,
            reset_brightness,
            set_landscape,
            set_immersive,
            set_keep_screen_on
        ])
        .setup(|app, api| {
            let controls = init_android(app, api)?;
            app.manage(MobileControls(controls));
            Ok(())
        })
        .build()
}

fn init_android<R: Runtime, C: serde::de::DeserializeOwned>(
    _app: &tauri::AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<PluginHandle<R>, Box<dyn std::error::Error>> {
    api.register_android_plugin(IDENTIFIER, "MobileControlsPlugin")
        .map_err(Into::into)
}

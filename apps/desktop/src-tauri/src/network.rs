use crate::{error::AppError, session::SessionStore};
use reqwest::{
    Client, Method, Url,
    header::{ACCEPT, CONTENT_TYPE, ORIGIN},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio_util::sync::CancellationToken;

// 业务 API 的地址由应用决定，页面只能提交站内接口路径。
pub const WEB_ORIGIN: &str = "https://ym-video.zhangmingyang.dpdns.org";

pub struct Network {
    api: Client,
    resource: Client,
    session: Arc<SessionStore>,
    base: Url,
    requests: Arc<Mutex<HashMap<String, CancellationToken>>>,
}

// JSON 业务请求完整保留状态码，页面按原有错误处理逻辑消费响应。
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiRequest {
    pub path: String,
    pub method: String,
    pub body: Option<String>,
    pub content_type: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
    pub content_type: String,
}

impl Network {
    pub fn new(session: Arc<SessionStore>) -> Result<Self, AppError> {
        let base = if cfg!(debug_assertions) {
            "http://localhost:8787"
        } else {
            WEB_ORIGIN
        };
        Ok(Self {
            api: Client::builder()
                .cookie_provider(Arc::clone(&session))
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(10))
                .build()?,
            resource: Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .timeout(Duration::from_secs(10))
                .build()?,
            session,
            base: Url::parse(base).map_err(|_| AppError::new("API 地址无效"))?,
            requests: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn cancel(&self, id: String) -> Result<(), AppError> {
        self.requests
            .lock()
            .map_err(|_| AppError::new("请求状态不可用"))?
            .entry(id.clone())
            .or_default()
            .cancel();
        // 取消可能先于请求注册或晚于回包，清理超过请求超时的取消标记。
        let requests = Arc::clone(&self.requests);
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_secs(11)).await;
            if let Ok(mut requests) = requests.lock()
                && requests
                    .get(&id)
                    .is_some_and(CancellationToken::is_cancelled)
            {
                requests.remove(&id);
            }
        });
        Ok(())
    }

    pub async fn run<T>(
        &self,
        id: String,
        operation: impl std::future::Future<Output = Result<T, AppError>>,
    ) -> Result<T, AppError> {
        let token = self
            .requests
            .lock()
            .map_err(|_| AppError::new("请求状态不可用"))?
            .entry(id.clone())
            .or_default()
            .clone();
        let result = tokio::select! {
            () = token.cancelled() => Err(AppError::new("请求已取消")),
            result = operation => result,
        };
        self.requests
            .lock()
            .map_err(|_| AppError::new("请求状态不可用"))?
            .remove(&id);
        result
    }

    pub async fn request_api(&self, input: ApiRequest) -> Result<ApiResponse, AppError> {
        let url = api_url(&self.base, &input.path)?;
        let method = Method::from_bytes(input.method.as_bytes())
            .map_err(|_| AppError::new("请求方法无效"))?;
        if ![Method::GET, Method::POST, Method::PATCH, Method::DELETE].contains(&method) {
            return Err(AppError::new("请求方法无效"));
        }
        let mut request = self
            .api
            .request(method, url)
            .header(ORIGIN, self.base.origin().ascii_serialization())
            .header(ACCEPT, "application/json");
        if let Some(body) = input.body {
            request = request
                .header(
                    CONTENT_TYPE,
                    input
                        .content_type
                        .unwrap_or_else(|| "application/json".into()),
                )
                .body(body);
        }
        let response = request.send().await?;
        self.session.save()?;
        let status = response.status().as_u16();
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("application/json")
            .to_owned();
        let body = response.text().await?;
        Ok(ApiResponse {
            status,
            body,
            content_type,
        })
    }

    pub async fn request_resource(&self, address: &str) -> Result<serde_json::Value, AppError> {
        let url = resource_url(address)?;
        let response = self
            .resource
            .get(url)
            .header(ACCEPT, "application/json")
            .send()
            .await?;
        if response.status().is_redirection() {
            return Err(AppError::new("资源接口发生未经允许的重定向"));
        }
        if !response.status().is_success() {
            return Err(AppError::new(format!(
                "接口请求失败（{}）",
                response.status().as_u16()
            )));
        }
        Ok(response.json().await?)
    }
}

fn api_url(base: &Url, path: &str) -> Result<Url, AppError> {
    if !path.starts_with("/api/") || path.contains(['\\', '#']) {
        return Err(AppError::new("API 路径无效"));
    }
    let url = base.join(path).map_err(|_| AppError::new("API 路径无效"))?;
    if url.origin() != base.origin() || !url.path().starts_with("/api/") {
        return Err(AppError::new("API 路径无效"));
    }
    Ok(url)
}

fn resource_url(address: &str) -> Result<Url, AppError> {
    let url =
        Url::parse(address).map_err(|_| AppError::new("请输入有效的 HTTP 或 HTTPS 接口地址"))?;
    if address.len() > 8192
        || !["http", "https"].contains(&url.scheme())
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(AppError::new("请输入有效的 HTTP 或 HTTPS 接口地址"));
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_paths_stay_inside_the_configured_origin() {
        let base = Url::parse(WEB_ORIGIN).expect("base");
        for path in [
            "https://example.com/api/a",
            "//example.com/api/a",
            "/api/../../outside",
            "/api/../outside",
            "/api/\\outside",
            "/outside",
        ] {
            assert!(api_url(&base, path).is_err(), "{path}");
        }
        assert_eq!(
            api_url(&base, "/api/v1/history?a=1")
                .expect("valid")
                .query(),
            Some("a=1")
        );
    }

    #[test]
    fn resource_addresses_require_http_without_credentials() {
        for address in [
            "file:///secret",
            "ftp://example.com",
            "https://user:secret@example.com",
            "invalid",
        ] {
            assert!(resource_url(address).is_err());
        }
        assert!(resource_url("http://localhost:8080/api.php?a=1").is_ok());
    }
}

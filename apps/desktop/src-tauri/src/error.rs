use serde::Serialize;

// 原生错误只向页面提供可展示的说明。
#[derive(Debug, thiserror::Error, Serialize)]
#[error("{message}")]
pub struct AppError {
    pub message: String,
}

impl AppError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl From<reqwest::Error> for AppError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            Self::new("请求超时，请稍后重试")
        } else if error.is_decode() {
            Self::new("接口未返回有效的 JSON 数据")
        } else {
            Self::new("无法访问接口，请检查网络后重试")
        }
    }
}

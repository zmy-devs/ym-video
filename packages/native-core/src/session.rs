use crate::error::AppError;
use reqwest_cookie_store::{CookieStore, CookieStoreMutex};
use std::{io::Cursor, path::PathBuf};

#[cfg(not(target_os = "android"))]
use std::fs;
#[cfg(target_os = "android")]
use std::sync::OnceLock;

#[cfg(target_os = "android")]
static ANDROID_STORE: OnceLock<Result<(), String>> = OnceLock::new();

// Cookie 由平台安全存储保护，API 和资源源分别使用独立客户端。
pub struct SessionStore {
    pub cookies: CookieStoreMutex,
    #[cfg(not(target_os = "android"))]
    path: PathBuf,
}

impl SessionStore {
    #[cfg(not(target_os = "android"))]
    pub fn open(path: PathBuf) -> Result<Self, AppError> {
        let cookies = match fs::read(&path) {
            Ok(bytes) => unprotect(&bytes).and_then(|data| {
                cookie_store::serde::json::load(Cursor::new(data))
                    .map_err(|_| AppError::new("会话存储损坏，请重新登录"))
            }),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                Ok(CookieStore::default())
            }
            Err(_) => Err(AppError::new("无法读取会话存储，请重新登录")),
        };
        let cookies = cookies.unwrap_or_else(|error| {
            eprintln!("{error}");
            CookieStore::default()
        });
        Ok(Self {
            cookies: CookieStoreMutex::new(cookies),
            path,
        })
    }

    #[cfg(target_os = "android")]
    pub fn open(_path: PathBuf) -> Result<Self, AppError> {
        initialize_android_store()?;
        let cookies = read_android().unwrap_or_else(|error| {
            eprintln!("{error}");
            CookieStore::default()
        });

        Ok(Self {
            cookies: CookieStoreMutex::new(cookies),
        })
    }

    #[cfg(not(target_os = "android"))]
    pub fn save(&self) -> Result<(), AppError> {
        // 持锁完成快照与原子替换，防止并发请求把较旧的 Cookie 覆盖到磁盘。
        let cookies = self
            .cookies
            .lock()
            .map_err(|_| AppError::new("会话存储不可用"))?;
        let mut data = Vec::new();
        cookie_store::serde::json::save(&cookies, &mut data)
            .map_err(|_| AppError::new("无法保存会话"))?;
        let encrypted = protect(&data)?;
        let temporary = self.path.with_extension("tmp");
        fs::write(&temporary, encrypted).map_err(|_| AppError::new("无法保存会话"))?;
        fs::rename(&temporary, &self.path).map_err(|_| AppError::new("无法更新会话存储"))
    }

    #[cfg(target_os = "android")]
    pub fn save(&self) -> Result<(), AppError> {
        let cookies = self
            .cookies
            .lock()
            .map_err(|_| AppError::new("会话存储不可用"))?;
        let mut data = Vec::new();
        cookie_store::serde::json::save(&cookies, &mut data)
            .map_err(|_| AppError::new("无法保存会话"))?;
        let value = String::from_utf8(data).map_err(|_| AppError::new("会话数据无效"))?;
        let entry = keyring_core::Entry::new("ym-video", "session")
            .map_err(|_| AppError::new("无法访问 Android 安全存储"))?;
        entry
            .set_password(&value)
            .map_err(|_| AppError::new("无法保存会话"))
    }
}

impl reqwest::cookie::CookieStore for SessionStore {
    fn set_cookies(
        &self,
        headers: &mut dyn Iterator<Item = &reqwest::header::HeaderValue>,
        url: &reqwest::Url,
    ) {
        self.cookies.set_cookies(headers, url);
    }

    fn cookies(&self, url: &reqwest::Url) -> Option<reqwest::header::HeaderValue> {
        self.cookies.cookies(url)
    }
}

#[cfg(windows)]
fn crypt(data: &[u8], encrypt: bool) -> Result<Vec<u8>, AppError> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{
            CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
        },
    };
    let input = CRYPT_INTEGER_BLOB {
        cbData: data
            .len()
            .try_into()
            .map_err(|_| AppError::new("会话存储过大"))?,
        pbData: data.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    // Windows 分配输出缓冲区，复制完成后必须通过 LocalFree 释放。
    let success = unsafe {
        if encrypt {
            CryptProtectData(
                &input,
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null_mut(),
                std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        } else {
            CryptUnprotectData(
                &input,
                std::ptr::null_mut(),
                std::ptr::null(),
                std::ptr::null_mut(),
                std::ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        }
    };
    if success == 0 {
        return Err(AppError::new("无法解读本机会话，请重新登录"));
    }
    // 成功时 DPAPI 返回 cbData 个可读字节，所有权仍属于 Windows。
    let result = unsafe {
        let result = if output.cbData == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        };
        LocalFree(output.pbData.cast());
        result
    };
    Ok(result)
}

#[cfg(target_os = "android")]
fn read_android() -> Result<CookieStore, AppError> {
    let entry = keyring_core::Entry::new("ym-video", "session")
        .map_err(|_| AppError::new("无法访问 Android 安全存储"))?;
    let value = match entry.get_password() {
        Ok(value) => value,
        Err(_) => return Ok(CookieStore::default()),
    };

    cookie_store::serde::json::load(Cursor::new(value.into_bytes()))
        .map_err(|_| AppError::new("会话存储损坏，请重新登录"))
}

#[cfg(target_os = "android")]
fn initialize_android_store() -> Result<(), AppError> {
    ANDROID_STORE
        .get_or_init(|| {
            let store =
                android_native_keyring_store::Store::new().map_err(|error| error.to_string())?;
            keyring_core::set_default_store(store);
            Ok(())
        })
        .as_ref()
        .map(|()| ())
        .map_err(|error| {
            eprintln!("无法初始化 Android 安全存储：{error}");
            AppError::new("无法访问 Android 安全存储")
        })
}

#[cfg(windows)]
fn protect(data: &[u8]) -> Result<Vec<u8>, AppError> {
    crypt(data, true)
}
#[cfg(windows)]
fn unprotect(data: &[u8]) -> Result<Vec<u8>, AppError> {
    crypt(data, false)
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn session_roundtrip_is_encrypted() {
        let secret = b"session-cookie-for-local-test";
        let encrypted = protect(secret).expect("encrypt");
        assert_ne!(encrypted, secret);
        assert_eq!(unprotect(&encrypted).expect("decrypt"), secret);
        assert!(unprotect(b"invalid-session").is_err());
    }
}

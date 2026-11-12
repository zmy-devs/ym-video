use webview2_com::{
    Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION,
        COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_ALWAYS_ALLOW,
        COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_DEFAULT, COREWEBVIEW2_WEB_ERROR_STATUS,
        COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_EXPIRED, ICoreWebView2_14,
        ICoreWebView2Controller,
    },
    ServerCertificateErrorDetectedEventHandler, take_pwstr,
};
use windows_core::{Interface, PWSTR};

// 所有 HTTPS 片源的过期证书按会话放行。
fn certificate_action(
    status: COREWEBVIEW2_WEB_ERROR_STATUS,
    uri: &str,
) -> COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION {
    if status == COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_EXPIRED
        && tauri::Url::parse(uri).is_ok_and(|url| url.scheme() == "https")
    {
        COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_ALWAYS_ALLOW
    } else {
        COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_DEFAULT
    }
}

// 在 WebView2 主线程注册处理器，清单、密钥和媒体分片使用同一条规则。
pub(super) fn configure_certificate_errors(
    controller: ICoreWebView2Controller,
) -> windows_core::Result<()> {
    // SAFETY: Tauri 的 with_webview 在持有该控制器的 UI 线程调用此函数。
    let webview = unsafe { controller.CoreWebView2()? }.cast::<ICoreWebView2_14>()?;

    let handler = ServerCertificateErrorDetectedEventHandler::create(Box::new(|_, args| {
        let Some(args) = args else {
            return Ok(());
        };

        let mut status = COREWEBVIEW2_WEB_ERROR_STATUS::default();
        let mut uri = PWSTR::null();

        // SAFETY: 参数由 WebView2 回调提供，输出指针有效，URI 交给 take_pwstr 释放。
        unsafe {
            args.ErrorStatus(&mut status)?;
            args.RequestUri(&mut uri)?;
            args.SetAction(certificate_action(status, &take_pwstr(uri)))?;
        }

        Ok(())
    }));
    let mut token = 0;

    // SAFETY: WebView2 持有处理器引用，事件注册和回调均位于 UI 线程。
    unsafe { webview.add_ServerCertificateErrorDetected(&handler, &mut token) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_COMMON_NAME_IS_INCORRECT,
        COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_IS_INVALID,
        COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_REVOKED,
    };

    #[test]
    fn expired_certificates_are_allowed_for_all_https_sources() {
        for uri in [
            "https://c1.rrcdnbf6.com/video/guaiqiwuyudisanji/episode01/index.m3u8",
            "https://expired.badssl.com/video/index.m3u8",
            "https://media.example.org:8443/video/segment.ts",
            "https://192.0.2.1/video/key",
        ] {
            assert_eq!(
                certificate_action(COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_EXPIRED, uri),
                COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_ALWAYS_ALLOW,
                "{uri}",
            );
        }
    }

    #[test]
    fn non_https_and_invalid_urls_keep_default_validation() {
        for uri in ["http://c1.rrcdnbf6.com/video/index.m3u8", "invalid-url"] {
            assert_eq!(
                certificate_action(COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_EXPIRED, uri),
                COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_DEFAULT,
                "{uri}",
            );
        }
    }

    #[test]
    fn other_certificate_errors_keep_default_validation() {
        for status in [
            COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_COMMON_NAME_IS_INCORRECT,
            COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_IS_INVALID,
            COREWEBVIEW2_WEB_ERROR_STATUS_CERTIFICATE_REVOKED,
        ] {
            assert_eq!(
                certificate_action(status, "https://c1.rrcdnbf6.com/video/index.m3u8"),
                COREWEBVIEW2_SERVER_CERTIFICATE_ERROR_ACTION_DEFAULT,
                "{status:?}",
            );
        }
    }
}

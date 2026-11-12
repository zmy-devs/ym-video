#![cfg(windows)]

use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
    time::Duration,
};
use tauri::test::{mock_builder, mock_context, noop_assets};
use tauri_plugin_updater::UpdaterExt;

// 官方更新器读取静态清单，下载并验证真实签名，同时拒绝篡改的安装包。
#[test]
fn windows_update_download_verifies_signature() {
    let payload = b"Windows updater signed test fixture\n";
    let signature = include_str!("fixtures/updater.sig").trim();
    let public_key = include_str!("fixtures/updater.pub").trim();
    let server = TcpListener::bind("127.0.0.1:0").expect("本地更新服务端口");
    let address = server.local_addr().expect("本地服务地址");

    // 三轮检查分别返回最新版本、可下载版本与被篡改的下载内容。
    let worker = thread::spawn(move || {
        for _ in 0..5 {
            let (mut stream, _) = server.accept().expect("更新请求");
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .expect("读取超时");
            let mut request = [0; 8192];
            let length = stream.read(&mut request).expect("读取更新请求");
            let request = String::from_utf8_lossy(&request[..length]);
            let path = request.split_whitespace().nth(1).expect("请求路径");

            let (status, body) = if path == "/current.json" {
                ("204 No Content", Vec::new())
            } else if path.ends_with(".json") {
                let file = if path == "/tampered.json" {
                    "tampered.bin"
                } else {
                    "update.bin"
                };
                (
                    "200 OK",
                    serde_json::to_vec(&serde_json::json!({
                        "version": "999.0.0",
                        "notes": "Windows 更新测试",
                        "platforms": {
                            "windows-x86_64": {
                                "url": format!("http://{address}/{file}"),
                                "signature": signature
                            }
                        }
                    }))
                    .expect("更新清单"),
                )
            } else if path == "/tampered.bin" {
                ("200 OK", b"tampered installer".to_vec())
            } else {
                assert_eq!(path, "/update.bin");
                ("200 OK", payload.to_vec())
            };

            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n",
                body.len()
            )
            .expect("响应头");
            stream.write_all(&body).expect("响应内容");
        }
    });

    // MockRuntime 只替代窗口运行时，检查、下载和签名验证使用真实 Rust 插件。
    let mut context = mock_context(noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({ "pubkey": public_key }),
    );
    let app = mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .expect("Tauri 测试应用");

    tauri::async_runtime::block_on(async {
        for endpoint in ["current.json", "latest.json", "tampered.json"] {
            let updater = app
                .updater_builder()
                .no_proxy()
                .timeout(Duration::from_secs(5))
                .endpoints(vec![
                    format!("http://{address}/{endpoint}")
                        .parse()
                        .expect("更新地址"),
                ])
                .expect("更新源")
                .build()
                .expect("官方更新器");
            let update = updater.check().await.expect("检查静态清单");

            if endpoint == "current.json" {
                assert!(update.is_none());
                continue;
            }

            let update = update.expect("发现新版本");
            let downloaded = update.download(|_, _| {}, || {}).await;

            if endpoint == "tampered.json" {
                assert!(downloaded.is_err(), "拒绝被篡改的更新包");
            } else {
                assert_eq!(downloaded.expect("下载并校验签名"), payload);
                assert!(update.verify(b"modified installer").is_err());
            }
        }
    });

    worker.join().expect("更新服务结束");
}

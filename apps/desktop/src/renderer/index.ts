// 断网页面的重试操作按钮。
const retryButton = document.querySelector<HTMLButtonElement>(
  '[data-action="retry"]',
);
// 主进程提供的受信任 Web 站点地址。
const retryUrl = new URLSearchParams(window.location.search).get('retry');

// 点击后重新打开主进程提供的可信 Web 地址。
retryButton?.addEventListener('click', () => {
  if (retryUrl) {
    window.location.assign(retryUrl);
  }
});

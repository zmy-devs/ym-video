// 桌面本地代理与服务端代理共用的内置资源源。
export const proxySources = [
  {
    id: 'liangzi',
    name: '量子资源',
    url: 'https://cj.lziapi.com/api.php/provide/vod/',
  },
  {
    id: 'baofeng',
    name: '暴风资源',
    url: 'https://bfzyapi.com/api.php/provide/vod/',
  },
  {
    id: 'ruyi',
    name: '如意资源',
    url: 'http://cj.rycjapi.com/api.php/provide/vod/',
  },
  {
    id: 'maotai',
    name: '茅台资源',
    url: 'https://caiji.maotaizy.cc/api.php/provide/vod/',
  },
  {
    id: 'jisu',
    name: '极速资源',
    url: 'https://jszyapi.com/api.php/provide/vod/',
  },
  {
    id: 'douban',
    name: '豆瓣资源',
    url: 'https://dbzy.tv/api.php/provide/vod/',
  },
  {
    id: 'modu',
    name: '魔都资源',
    url: 'https://www.mdzyapi.com/api.php/provide/vod/',
  },
] as const;

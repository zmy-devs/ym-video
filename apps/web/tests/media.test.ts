import assert from 'node:assert/strict';
import { test } from 'node:test';
import { movieKey, parseEpisodes, parseMovie } from '@ym-video/catalog';
import { filterManifest, resolveMediaUrl } from '../src/lib/m3u8.ts';

test('同号影片在不同源之间隔离，包含分隔符的 ID 不碰撞', () => {
  assert.notEqual(movieKey('baofeng', '12'), movieKey('liangzi', '12'));
  assert.notEqual(movieKey('a:b', 'c'), movieKey('a', 'b:c'));
});

test('多线路优先选择 HLS 并保留 URL 查询参数，丢弃危险协议', () => {
  assert.deepEqual(
    parseEpisodes(
      '解析$https://example.com/watch$$$第一集$https://media.example.com/1.m3u8?token=a$b#第二集$javascript:alert(1)',
    ),
    [{ label: '第一集', url: 'https://media.example.com/1.m3u8?token=a$b' }],
  );
  assert.deepEqual(parseEpisodes(''), []);
});

test('统一校验并转换采集站影片记录', () => {
  assert.deepEqual(
    parseMovie(
      {
        vod_id: 12,
        vod_name: '示例影片',
        vod_pic: 'javascript:alert(1)',
        vod_content: '<p>简介&nbsp;&amp;详情</p>',
        vod_year: '2026',
        vod_area: '中国',
        vod_lang: '中文',
        type_name: '电影',
        vod_remarks: '更新中',
        vod_play_url: '第一集$https://media.example.com/1.m3u8',
      },
      'source',
    ),
    {
      id: 'source:12',
      vodId: '12',
      sourceId: 'source',
      name: '示例影片',
      pic: '',
      content: '简介 &详情',
      year: '2026',
      area: '中国',
      lang: '中文',
      category: '电影',
      remarks: '更新中',
      episodes: [
        { label: '第一集', url: 'https://media.example.com/1.m3u8' },
      ],
    },
  );
  assert.deepEqual(
    parseMovie(
      {
        vod_id: 12,
        vod_play_url: '原始线路$https://media.example.com/original.m3u8',
      },
      'source',
      { playUrl: '指定线路$https://media.example.com/selected.m3u8' },
    )?.episodes,
    [{ label: '指定线路', url: 'https://media.example.com/selected.m3u8' }],
  );
  assert.equal(parseMovie({ vod_name: '缺少 ID' }, 'source'), null);
});

test('主清单、根目录子清单、相对分片、密钥都以真实响应地址解析', () => {
  const base = 'https://media.example.com/show/2000k/hls/index.m3u8?token=1';
  assert.equal(
    resolveMediaUrl('../720p/index.m3u8', base),
    'https://media.example.com/show/2000k/720p/index.m3u8',
  );
  assert.equal(
    resolveMediaUrl('/show/playlist.m3u8', base),
    'https://media.example.com/show/playlist.m3u8',
  );
  assert.equal(
    resolveMediaUrl('0001.ts', base),
    'https://media.example.com/show/2000k/hls/0001.ts',
  );
  assert.equal(
    resolveMediaUrl('enc.key', base),
    'https://media.example.com/show/2000k/hls/enc.key',
  );
  assert.equal(
    resolveMediaUrl('//cdn.example.com/part.ts', base),
    'https://cdn.example.com/part.ts',
  );
});

test('过滤原有 adjump 分片，同时保留密钥、正常分片与地址上下文', () => {
  const manifest =
    '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="enc.key"\n#EXTINF:6,\n0001.ts\n#EXTINF:4,\nhttps://ad.example.com/adjump.ts\n#EXTINF:5,\n/0002.ts\n';
  const result = filterManifest(
    manifest,
    'https://media.example.com/show/index.m3u8',
  );
  assert.ok(!result.includes('adjump'));
  assert.ok(result.includes('URI="https://media.example.com/show/enc.key"'));
  assert.ok(result.includes('https://media.example.com/show/0001.ts'));
  assert.ok(result.includes('https://media.example.com/0002.ts'));
  assert.equal(
    filterManifest(
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\n2000k/hls/index.m3u8',
      'https://media.example.com/show/index.m3u8',
    ),
    '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nhttps://media.example.com/show/2000k/hls/index.m3u8',
  );
});

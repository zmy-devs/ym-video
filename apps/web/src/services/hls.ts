import Hls, {
  type Loader,
  type PlaylistLoaderContext,
  type LoaderConfiguration,
  type LoaderCallbacks,
} from 'hls.js';
import { filterManifest } from '@/lib/m3u8';

// 继承官方加载器，保留响应 URL、取消、重试和统计信息。
const PlaylistLoader = Hls.DefaultConfig.loader as new (
  ...args: ConstructorParameters<typeof Hls.DefaultConfig.loader>
) => Loader<PlaylistLoaderContext>;

// 仅过滤清单文本，不通过 Blob 丢失子清单和密钥的真实基址。
export class FilteredPlaylistLoader extends PlaylistLoader {
  load(
    context: PlaylistLoaderContext,
    config: LoaderConfiguration,
    callbacks: LoaderCallbacks<PlaylistLoaderContext>,
  ) {
    super.load(context, config, {
      ...callbacks,
      onSuccess: (response, stats, requestContext, networkDetails) => {
        if (typeof response.data === 'string') {
          response.data = filterManifest(
            response.data,
            response.url || requestContext.url,
          );
        }
        callbacks.onSuccess(response, stats, requestContext, networkDetails);
      },
    });
  }
}

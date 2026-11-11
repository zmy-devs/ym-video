import { apiFetch } from '@/lib/desktop';
import { createHistoryClient } from './history-client.ts';

export {
  commitHistorySync,
  enqueueHistoryOperation,
  readLocalHistory,
  HistoryServiceError,
} from './history-client.ts';

// 客户端使用原生账号传输同步本机观看历史队列。
const client = createHistoryClient(apiFetch);

export const fetchHistory = client.fetchHistory;
export const syncHistory = client.syncHistory;

import { repos } from '@/repo';
import { toast } from '@/store/toast';
import type { LogEntry, Plant } from '@/types/plant';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

const STORAGE_KEY = 'sikjipsa.offline-queue.v1';

type Op =
  | { kind: 'plant.update'; id: string; patch: Partial<Plant> }
  | { kind: 'plant.create'; plant: Plant }
  | { kind: 'plant.softDelete'; id: string }
  | { kind: 'log.insert'; entry: Omit<LogEntry, 'id'> };

type QueuedOp = { op: Op; queuedAt: number; attempts: number };

let queue: QueuedOp[] = [];
let online = true;
let flushing = false;
let initialized = false;

/**
 * 큐 상태를 UI 에서 구독할 수 있게 노출 — 홈 배너가 "오프라인 / 동기화
 * 대기 N개"를 그릴 때 쓴다. 모듈 내부 상태가 바뀔 때마다 publish() 로
 * 미러링한다 (큐 자체는 모듈 변수로 유지 — 스토어는 읽기 전용 뷰).
 */
export const useSyncStatus = create<{ pending: number; online: boolean }>(() => ({
  pending: 0,
  online: true,
}));

function publish() {
  useSyncStatus.setState({ pending: queue.length, online });
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* swallow — queue is best-effort */
  }
  publish();
}

async function hydrate() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    queue = raw ? JSON.parse(raw) : [];
  } catch {
    queue = [];
  }
  publish();
}

async function runOp(op: Op): Promise<void> {
  switch (op.kind) {
    case 'plant.update':   await repos.plants.update(op.id, op.patch); return;
    case 'plant.create':   await repos.plants.create(op.plant); return;
    case 'plant.softDelete': await repos.plants.softDelete(op.id); return;
    case 'log.insert':     await repos.logs.insert(op.entry); return;
  }
}

export async function flush(): Promise<void> {
  if (flushing || !online) return;
  await hydrate();
  if (queue.length === 0) return;

  flushing = true;
  let sent = 0;
  try {
    while (queue.length > 0) {
      const next = queue[0];
      try {
        await runOp(next.op);
        queue.shift();
        sent += 1;
        await persist();
      } catch (e) {
        next.attempts += 1;
        await persist();
        // Bail out and retry on next reconnect / explicit flush.
        if (next.attempts >= 5) {
          // Drop the poison-pill op so the queue can drain.
          console.warn('[offlineQueue] dropping op after 5 attempts:', next.op, e);
          queue.shift();
          await persist();
          toast.error('오프라인에 쌓인 기록 하나를 서버에 저장하지 못해 건너뛰었어요');
        } else {
          break;
        }
      }
    }
    if (queue.length === 0 && sent > 0) {
      toast.success(`밀려 있던 기록 ${sent}개를 동기화했어요`);
    }
  } finally {
    flushing = false;
    publish();
  }
}

export async function enqueue(op: Op): Promise<void> {
  await hydrate();
  queue.push({ op, queuedAt: Date.now(), attempts: 0 });
  await persist();
  if (online) flush().catch(() => {});
}

export function startQueue() {
  hydrate().then(() => flush()).catch(() => {});
  NetInfo.addEventListener((state) => {
    const next = !!state.isConnected && state.isInternetReachable !== false;
    if (next && !online) {
      // back online — drain
      online = next;
      publish();
      if (queue.length > 0) toast.info('네트워크 복구. 쌓인 기록을 보내는 중…');
      flush().catch(() => {});
    } else {
      online = next;
      publish();
    }
  });
}

export function isOnline() { return online; }
export function pendingCount() { return queue.length; }

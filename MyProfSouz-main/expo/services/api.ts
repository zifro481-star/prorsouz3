import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User, Union, Lead, NewsItem, Notification, ProfileUpdateData, RegisterData,
  LegalRequest, FileAttachment, Colleague, DirectChat, ChatMessage, Conversation,
  AIChatResponse, AIChatReply, UnionEvent, UnionDocument, Partner,
  Survey, SurveyDetail, SurveyAnswer, LearningModule, LearningLesson,
} from '@/types';

const BASE_URL = 'https://profsouz.info/api';
const LOCAL_LEADS_KEY = 'local_leads';
const LOCAL_NOTIFICATIONS_KEY = 'local_notifications';
const LOCAL_READ_NOTIFICATION_IDS_KEY = 'local_read_notification_ids';
const LOCAL_READ_CHAT_STATE_KEY = 'local_read_chat_state';
const LOCAL_NEWS_KEY = 'local_news';
const LOCAL_EVENTS_KEY = 'local_events';
const APP_RATING_SURVEY_ID = 'app-platform-rating';
const DEFAULT_LEADER_FULL_NAME = 'Грядкин Сергей Александрович';

const APP_RATING_SURVEY: SurveyDetail = {
  id: APP_RATING_SURVEY_ID,
  title: 'Оценка платформы «Мой Профсоюз»',
  description: 'Помогите нам сделать платформу лучше. Ответьте на несколько вопросов.',
  questions: [
    {
      id: 'ease',
      text: 'Насколько удобно пользоваться приложением?',
      type: 'single_choice',
      options: [
        { id: '5', text: 'Очень удобно' },
        { id: '4', text: 'Скорее удобно' },
        { id: '3', text: 'Нормально' },
        { id: '2', text: 'Есть трудности' },
        { id: '1', text: 'Неудобно' },
      ],
    },
    {
      id: 'usefulness',
      text: 'Насколько полезны сервисы приложения?',
      type: 'single_choice',
      options: [
        { id: '5', text: 'Очень полезны' },
        { id: '4', text: 'Полезны' },
        { id: '3', text: 'Иногда полезны' },
        { id: '2', text: 'Пока мало пользы' },
        { id: '1', text: 'Не полезны' },
      ],
    },
    {
      id: 'notifications',
      text: 'Какие уведомления для вас важны?',
      type: 'multiple_choice',
      options: [
        { id: 'news', text: 'Новости профсоюза' },
        { id: 'events', text: 'Мероприятия' },
        { id: 'appeals', text: 'Ответы по обращениям' },
        { id: 'legal', text: 'Ответы юриста' },
      ],
    },
    {
      id: 'comment',
      text: 'Что улучшить в первую очередь?',
      type: 'text',
    },
  ],
};

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('auth_token');
}

async function requestRaw(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Cookie'] = `token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${BASE_URL}${path}`;
  console.log(`[API] RAW ${options.method || 'GET'} ${url}`);
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const tokenMatch = setCookie.match(/token=([^;]+)/);
    if (tokenMatch) {
      await AsyncStorage.setItem('auth_token', tokenMatch[1]);
    }
  }
  return res;
}

async function requestRawPublic(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  const url = `${BASE_URL}${path}`;
  console.log(`[API] RAW PUBLIC ${options.method || 'GET'} ${url}`);
  return fetch(url, { ...options, headers, credentials: 'include' });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Cookie'] = `token=${token}`;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const tokenMatch = setCookie.match(/token=([^;]+)/);
    if (tokenMatch) {
      console.log('[API] Token received from cookie');
      await AsyncStorage.setItem('auth_token', tokenMatch[1]);
    }
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    console.log(`[API] Error ${res.status}: ${errorBody}`);
    throw new Error(errorBody || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

async function parseRawResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => '');
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function tryRawJson<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await requestRaw(path, options);
    if (!res.ok) return null;
    return parseRawResponse<T>(res);
  } catch {
    return null;
  }
}

async function tryRawJsonPublic<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const res = await requestRawPublic(path, options);
    if (!res.ok) return null;
    return parseRawResponse<T>(res);
  } catch {
    return null;
  }
}

async function tryJsonVariants<T>(
  paths: string[],
  body: object,
  method = 'POST',
  publicRequest = false
): Promise<T | null> {
  for (const path of paths) {
    const result = publicRequest
      ? await tryRawJsonPublic<T>(path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : await tryRawJson<T>(path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
    if (result) return result;
  }
  return null;
}

async function getLocalJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setLocalJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function getRecordId(item: Record<string, any> | null | undefined): string {
  return String(item?.id ?? item?._id ?? item?.newsId ?? item?.chatId ?? item?.conversationId ?? '');
}

async function getLocalLeads(): Promise<Lead[]> {
  return getLocalJson<Lead[]>(LOCAL_LEADS_KEY, []);
}

async function saveLocalLead(data: { description: string; requestType: string }): Promise<Lead> {
  const leads = await getLocalLeads();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: `local-lead-${Date.now()}`,
    description: data.description,
    requestType: data.requestType,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  await setLocalJson(LOCAL_LEADS_KEY, [lead, ...leads]);
  return lead;
}

async function getLocalNews(): Promise<NewsItem[]> {
  return getLocalJson<NewsItem[]>(LOCAL_NEWS_KEY, []);
}

async function setLocalNews(items: NewsItem[]): Promise<void> {
  await setLocalJson(LOCAL_NEWS_KEY, items);
}

async function saveLocalNews(data: Partial<NewsItem>): Promise<NewsItem> {
  const items = await getLocalNews();
  const now = new Date().toISOString();
  const item: NewsItem = {
    id: `local-news-${Date.now()}`,
    title: data.title || 'Новость',
    summary: data.summary,
    content: data.content || data.summary || '',
    imageUrl: data.imageUrl,
    createdAt: now,
    author: data.author,
  };
  await setLocalNews([item, ...items]);
  return item;
}

async function updateLocalNews(id: string, data: Partial<NewsItem>): Promise<NewsItem> {
  const items = await getLocalNews();
  const existing = items.find((item) => getRecordId(item as any) === id);
  if (!existing) throw new Error('Новость не найдена');
  const updated = { ...existing, ...data };
  await setLocalNews(items.map((item) => getRecordId(item as any) === id ? updated : item));
  return updated;
}

async function getLocalEvents(): Promise<UnionEvent[]> {
  return getLocalJson<UnionEvent[]>(LOCAL_EVENTS_KEY, []);
}

async function setLocalEvents(items: UnionEvent[]): Promise<void> {
  await setLocalJson(LOCAL_EVENTS_KEY, items);
}

async function saveLocalEvent(data: Partial<UnionEvent>): Promise<UnionEvent> {
  const items = await getLocalEvents();
  const now = new Date().toISOString();
  const item: UnionEvent = {
    id: `local-event-${Date.now()}`,
    title: data.title || 'Мероприятие',
    description: data.description,
    content: data.content || data.description || '',
    date: data.date,
    imageUrl: data.imageUrl,
    createdAt: now,
  };
  await setLocalEvents([item, ...items]);
  return item;
}

async function updateLocalEvent(id: string, data: Partial<UnionEvent>): Promise<UnionEvent> {
  const items = await getLocalEvents();
  const existing = items.find((item) => item.id === id);
  if (!existing) throw new Error('Мероприятие не найдено');
  const updated = { ...existing, ...data };
  await setLocalEvents(items.map((item) => item.id === id ? updated : item));
  return updated;
}

async function getLocalNotifications(): Promise<Notification[]> {
  return getLocalJson<Notification[]>(LOCAL_NOTIFICATIONS_KEY, []);
}

async function setLocalNotifications(notifications: Notification[]): Promise<void> {
  await setLocalJson(LOCAL_NOTIFICATIONS_KEY, notifications);
}

async function getLocalReadNotificationIds(): Promise<string[]> {
  return getLocalJson<string[]>(LOCAL_READ_NOTIFICATION_IDS_KEY, []);
}

async function addLocalReadNotificationIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const current = await getLocalReadNotificationIds();
  await setLocalJson(LOCAL_READ_NOTIFICATION_IDS_KEY, Array.from(new Set([...current, ...ids])));
}

async function isAppRatingSurveyCompleted(): Promise<boolean> {
  const completions = await getLocalJson<Record<string, boolean>>('survey_completions', {});
  return Boolean(completions[APP_RATING_SURVEY_ID]);
}

async function markAppRatingSurveyCompleted(): Promise<void> {
  const completions = await getLocalJson<Record<string, boolean>>('survey_completions', {});
  await setLocalJson('survey_completions', { ...completions, [APP_RATING_SURVEY_ID]: true });
}

function uniqById<T extends Record<string, any>>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((item) => {
    const id = getRecordId(item);
    return id && !item.id ? { ...item, id } as T : item;
  }).filter((item) => {
    const id = getRecordId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function getLocalReadChatState(): Promise<Record<string, string>> {
  return getLocalJson<Record<string, string>>(LOCAL_READ_CHAT_STATE_KEY, {});
}

async function setLocalReadChatAt(type: 'direct' | 'conversation', id: string, readAt: string): Promise<void> {
  const current = await getLocalReadChatState();
  await setLocalJson(LOCAL_READ_CHAT_STATE_KEY, { ...current, [`${type}:${id}`]: readAt });
}

function getChatActivityAt(chat: Record<string, any>): string | undefined {
  return chat.lastMessageAt || chat.updatedAt || chat.lastMessage?.createdAt || chat.lastMessage?.updatedAt;
}

async function applyLocalReadChatState<T extends Record<string, any>>(type: 'direct' | 'conversation', chats: T[]): Promise<T[]> {
  const readState = await getLocalReadChatState();
  return chats.map((chat) => {
    const id = getRecordId(chat);
    const readAt = readState[`${type}:${id}`];
    if (!id || !readAt) return chat;

    const activityAt = getChatActivityAt(chat);
    const isLocallyRead = !activityAt || new Date(activityAt).getTime() <= new Date(readAt).getTime();
    return isLocallyRead ? { ...chat, unreadCount: 0 } as T : chat;
  });
}

function uniqByAnyUserId<T extends Record<string, any>>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item?.id || item?.userId || item?.agentId || item?.memberId || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function arrayFromPayload<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const nested = payload.users || payload.members || payload.agents || payload.items || payload.data || payload.results;
  return Array.isArray(nested) ? nested : [];
}

function getAnyUserId(item: any): string {
  return String(item?.id || item?.userId || item?.agentId || item?.memberId || '');
}

function normalizePersonName(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getNameVariants(item: any): string[] {
  const fromParts = [item?.lastName, item?.firstName, item?.middleName].filter(Boolean).join(' ');
  return [
    item?.fullName,
    item?.name,
    item?.fio,
    item?.displayName,
    fromParts,
  ].filter(Boolean).map(String);
}

function isDefaultLeader(item: any): boolean {
  const target = normalizePersonName(DEFAULT_LEADER_FULL_NAME);
  return getNameVariants(item).some((name) => normalizePersonName(name) === target);
}

async function authRequest(path: string, body: object): Promise<{ user: User }> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(errorBody || `Auth failed: ${res.status}`);
  }

  // Try set-cookie via fetch
  let tokenFound = false;
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const m = setCookie.match(/token=([A-Za-z0-9\-_.]+)/);
    if (m) {
      await AsyncStorage.setItem('auth_token', m[1]);
      tokenFound = true;
    }
  }

  // Try all headers
  if (!tokenFound) {
    res.headers.forEach((value, key) => {
      const m = value.match(/token=([A-Za-z0-9\-_.]+)/);
      if (m) {
        AsyncStorage.setItem('auth_token', m[1]);
        tokenFound = true;
      }
    });
  }

  const data = await res.json();

  // Try from body
  if (!tokenFound && data.token) {
    await AsyncStorage.setItem('auth_token', data.token);
    tokenFound = true;
  }

  // Last resort: use XMLHttpRequest
  if (!tokenFound) {
    try {
      const xhrToken = await new Promise<string | null>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = () => {
          const headers = xhr.getAllResponseHeaders();
          const m = headers.match(/token=([A-Za-z0-9\-_.]+)/);
          resolve(m ? m[1] : null);
        };
        xhr.onerror = () => resolve(null);
        xhr.send(JSON.stringify(body));
      });
      if (xhrToken) {
        await AsyncStorage.setItem('auth_token', xhrToken);
      }
    } catch {}
  }

  return data;
}

export const api = {
  login: (email: string, password: string) =>
    authRequest('/auth/login', { email, password }),

  register: (data: RegisterData) =>
    authRequest('/auth/register', {
      ...data,
      defaultLeaderName: DEFAULT_LEADER_FULL_NAME,
      leaderName: DEFAULT_LEADER_FULL_NAME,
      managerName: DEFAULT_LEADER_FULL_NAME,
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  getUnions: () =>
    request<Union[]>('/unions'),

  getProfile: () =>
    request<User>('/profile'),

  updateProfile: (data: ProfileUpdateData) =>
    request<User>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getLeads: async () => {
    const remote =
      (await tryRawJson<Lead[]>('/leads')) ??
      (await tryRawJson<Lead[]>('/appeals')) ??
      (await tryRawJson<Lead[]>('/requests')) ??
      (await tryRawJson<Lead[]>('/leader-requests')) ??
      (await tryRawJson<Lead[]>('/manager-requests')) ??
      [];
    return uniqById([...(await getLocalLeads()), ...(Array.isArray(remote) ? remote : [])]);
  },

  getNews: async () => {
    const remote =
      (await tryRawJson<NewsItem[]>('/news')) ??
      (await tryRawJson<NewsItem[]>('/manager/news')) ??
      (await tryRawJson<NewsItem[]>('/admin/news')) ??
      (await tryRawJson<NewsItem[]>('/announcements?type=news')) ??
      [];
    return uniqById([...(await getLocalNews()), ...(Array.isArray(remote) ? remote : [])]);
  },

  getNotifications: async () => {
    const remote =
      (await tryRawJson<Notification[]>('/notifications')) ??
      (await tryRawJson<Notification[]>('/notifications/inbox')) ??
      (await tryRawJson<Notification[]>('/user-notifications')) ??
      [];
    const readIds = new Set(await getLocalReadNotificationIds());
    return uniqById([...(await getLocalNotifications()), ...(Array.isArray(remote) ? remote : [])])
      .map((notification) => readIds.has(notification.id) ? { ...notification, read: true } : notification);
  },

  markNotificationsRead: async (ids: string[]) => {
    await addLocalReadNotificationIds(ids);
    await tryJsonVariants<void>(
      ['/notifications/read', '/notifications/mark-read', '/notifications', '/user-notifications/read'],
      { ids, notificationIds: ids, read: true },
      'PATCH'
    );
    const local = await getLocalNotifications();
    await setLocalNotifications(local.map((n) => ids.includes(n.id) ? { ...n, read: true } : n));
  },

  createInAppNotification: (data: { title: string; message: string; type?: string; userId?: string }) =>
    tryJsonVariants<Notification>(
      ['/notifications', '/notifications/push-token', '/notifications/read'],
      data
    ),

  createLead: async (data: { description: string; requestType: string }) => {
    const payload = {
      ...data,
      type: data.requestType,
      category: data.requestType,
      title: data.requestType === 'complaint' ? 'Жалоба' : 'Инициатива',
      status: 'active',
    };
    const result = await tryJsonVariants<Lead>(
      ['/leads', '/appeals', '/requests', '/leader-requests', '/manager-requests'],
      payload
    );
    if (!result) {
      throw new Error('Не удалось отправить обращение. Проверьте подключение и попробуйте ещё раз.');
    }
    return result;
  },

  getLegalRequests: () =>
    request<LegalRequest[]>('/legal-requests'),

  createLegalRequest: (data: { subject: string; category: string; description: string; attachments?: FileAttachment[] }) =>
    request<LegalRequest>('/legal-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadFile: async (file: { uri: string; name: string; type: string }): Promise<FileAttachment> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    const res = await requestRaw('/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  getColleagues: () =>
    request<Colleague[]>('/colleagues'),

  getAgents: () =>
    request<any[]>('/agents'),

  getLeaders: async () => {
    const payload =
      (await tryRawJson<any[]>('/users?roles=leader,manager')) ??
      (await tryRawJson<any[]>('/users?role=leader')) ??
      (await tryRawJson<any[]>('/leaders')) ??
      (await tryRawJson<any[]>('/managers'));
    return arrayFromPayload(payload);
  },

  getAllUsersForTargeting: async () =>
    (await tryRawJson<any[]>('/users?limit=2000')) ??
    (await tryRawJson<any[]>('/members?limit=2000')) ??
    (await tryRawJson<any[]>('/agents?limit=2000')) ??
    [],

  getAllAgentsForReassignment: async () => {
    const batches = await Promise.all([
      tryRawJson<any[]>('/users?roles=user,member&limit=2000'),
      tryRawJson<any[]>('/users?role=user&limit=2000'),
      tryRawJson<any[]>('/users?limit=2000'),
      tryRawJson<any[]>('/agents?includeAssigned=true&limit=2000'),
      tryRawJson<any[]>('/agents?all=true&limit=2000'),
      tryRawJson<any[]>('/agents?limit=2000'),
      tryRawJson<any[]>('/members?role=user&limit=2000'),
      tryRawJson<any[]>('/members?limit=2000'),
    ]);
    return uniqByAnyUserId(batches.flatMap((batch) => arrayFromPayload(batch)));
  },

  getUnassignedAgents: async () => {
    const batches = await Promise.all([
      tryRawJson<any[]>('/users?assignment=unassigned&limit=2000'),
      tryRawJson<any[]>('/users?unassigned=true&limit=2000'),
      tryRawJson<any[]>('/agents?assignment=unassigned&limit=2000'),
      tryRawJson<any[]>('/agents/unassigned'),
      tryRawJson<any[]>('/agents?unassigned=true&limit=2000'),
      tryRawJson<any[]>('/members/unassigned'),
      tryRawJson<any[]>('/members?unassigned=true&limit=2000'),
    ]);
    return uniqByAnyUserId(batches.flatMap((batch) => arrayFromPayload(batch)));
  },

  assignAgentToLeader: async (agentId: string, leaderId: string) => {
    const body = { agentId, memberId: agentId, userId: agentId, leaderId, managerId: leaderId };
    const variants: Array<[string[], string, object]> = [
      [['/agents/assign', '/members/assign', '/users/assign', '/assign'], 'POST', body],
      [[`/agents/${agentId}/assign`, `/members/${agentId}/assign`, `/users/${agentId}/assign`], 'POST', body],
      [[`/agents/${agentId}`, `/members/${agentId}`, `/users/${agentId}`], 'PATCH', { leaderId, managerId: leaderId }],
      [[`/leaders/${leaderId}/agents`, `/leaders/${leaderId}/members`, `/managers/${leaderId}/members`], 'POST', { agentId, memberId: agentId, userId: agentId }],
    ];
    for (const [paths, method, payload] of variants) {
      const result = await tryJsonVariants<void>(paths, payload, method);
      if (result !== null) return result;
    }
    throw new Error('Не удалось закрепить участника');
  },

  assignNewUserToDefaultLeader: async (newUser: User) => {
    const userId = getAnyUserId(newUser);
    if (!userId) throw new Error('Не найден id нового пользователя');

    const leaders = await api.getLeaders();
    const defaultLeader = leaders.find(isDefaultLeader);
    const leaderId = getAnyUserId(defaultLeader);
    if (leaderId) {
      return api.assignAgentToLeader(userId, leaderId);
    }

    const body = {
      agentId: userId,
      memberId: userId,
      userId,
      leaderName: DEFAULT_LEADER_FULL_NAME,
      managerName: DEFAULT_LEADER_FULL_NAME,
      leaderFullName: DEFAULT_LEADER_FULL_NAME,
      managerFullName: DEFAULT_LEADER_FULL_NAME,
    };
    const result = await tryJsonVariants<void>(
      ['/agents/assign', '/members/assign', '/users/assign', '/assign'],
      body
    );
    if (result !== null) return result;
    throw new Error(`Не удалось найти руководителя ${DEFAULT_LEADER_FULL_NAME}`);
  },

  unassignAgentFromLeader: async (agentId: string, leaderId?: string) => {
    const body = { agentId, memberId: agentId, userId: agentId, leaderId, managerId: leaderId };
    const variants: Array<[string[], string, object]> = [
      [['/agents/unassign', '/members/unassign', '/users/unassign', '/unassign'], 'POST', body],
      [[`/agents/${agentId}/unassign`, `/members/${agentId}/unassign`, `/users/${agentId}/unassign`], 'POST', body],
      [[`/agents/${agentId}`, `/members/${agentId}`, `/users/${agentId}`], 'PATCH', { leaderId: null, managerId: null, assignedLeaderId: null, assignedManagerId: null }],
      [[`/leaders/${leaderId}/agents/${agentId}`, `/leaders/${leaderId}/members/${agentId}`, `/managers/${leaderId}/members/${agentId}`], 'DELETE', body],
    ];
    for (const [paths, method, payload] of variants) {
      const result = await tryJsonVariants<void>(paths, payload, method);
      if (result !== null) return result;
    }
    throw new Error('Не удалось открепить участника');
  },

  reassignAllUsersToLeader: async (agentIds: string[], leaderId: string) => {
    const results = await Promise.all(agentIds.map((agentId) => api.assignAgentToLeader(agentId, leaderId)));
    return results;
  },

  getDirectChats: async () => {
    const chats = await request<DirectChat[]>('/direct-chats');
    return applyLocalReadChatState('direct', Array.isArray(chats) ? chats as any[] : []) as Promise<DirectChat[]>;
  },

  createDirectChat: (recipientId: string) =>
    request<DirectChat>('/direct-chats', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    }),

  getDirectChatMessages: (chatId: string) =>
    request<{ messages: ChatMessage[] }>(`/direct-chats/${chatId}`),

  sendDirectMessage: (chatId: string, text: string) =>
    request<ChatMessage>(`/direct-chats/${chatId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getConversations: async () => {
    const conversations = await request<Conversation[]>('/conversations');
    return applyLocalReadChatState('conversation', Array.isArray(conversations) ? conversations as any[] : []) as Promise<Conversation[]>;
  },

  createConversation: async (participantId: string) => {
    const payload = {
      participantId,
      recipientId: participantId,
      agentId: participantId,
      memberId: participantId,
      userId: participantId,
    };
    const result = await tryJsonVariants<Conversation>(
      ['/conversations', '/conversations/start', '/conversations/create'],
      payload
    );
    if (result) return result;
    throw new Error('Не удалось создать чат');
  },

  getConversationMessages: (convId: string) =>
    request<{ messages: ChatMessage[] }>(`/conversations/${convId}`),

  sendConversationMessage: (convId: string, text: string) =>
    request<ChatMessage>(`/conversations/${convId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  markChatRead: async (type: 'direct' | 'conversation', id: string, readAt = new Date().toISOString()) => {
    await setLocalReadChatAt(type, id, readAt);
    const body = {
      chatId: id,
      directChatId: type === 'direct' ? id : undefined,
      conversationId: type === 'conversation' ? id : undefined,
      read: true,
      readAt,
    };
    const base = type === 'direct' ? `/direct-chats/${id}` : `/conversations/${id}`;
    const paths = [
      `${base}/read`,
      `${base}/mark-read`,
      `${base}/messages/read`,
      base,
    ];
    await tryJsonVariants<void>(paths, body, 'PATCH');
    await tryJsonVariants<void>(paths.slice(0, 3), body);
  },

  getAIChat: () =>
    request<AIChatResponse>('/ai-chat'),

  sendAIMessage: (message: string) =>
    request<AIChatReply>('/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getUnionEvents: async () => {
    const remote =
      (await tryRawJson<UnionEvent[]>('/union-events')) ??
      (await tryRawJson<UnionEvent[]>('/events')) ??
      (await tryRawJson<UnionEvent[]>('/manager/events')) ??
      (await tryRawJson<UnionEvent[]>('/admin/events')) ??
      [];
    return uniqById([...(await getLocalEvents()), ...(Array.isArray(remote) ? remote : [])]);
  },

  getUnionDocuments: () =>
    request<UnionDocument[]>('/union-documents'),

  getPartners: () =>
    request<Partner[]>('/partners'),

  getSurveys: async () => [{
    id: APP_RATING_SURVEY.id,
    title: APP_RATING_SURVEY.title,
    description: APP_RATING_SURVEY.description,
    status: (await isAppRatingSurveyCompleted()) ? 'completed' : 'new',
    completed: await isAppRatingSurveyCompleted(),
    questionsCount: APP_RATING_SURVEY.questions.length,
    createdAt: new Date().toISOString(),
  }],

  getSurveyDetail: async (id: string) => {
    if (id === APP_RATING_SURVEY_ID) return APP_RATING_SURVEY;
    return request<SurveyDetail>(`/surveys/${id}`);
  },

  submitSurvey: async (id: string, answers: SurveyAnswer[]) => {
    if (id === APP_RATING_SURVEY_ID) {
      await tryJsonVariants<void>(
        ['/surveys/app-rating/submit', '/surveys/submit', '/questionnaires/submit', '/polls/submit'],
        { surveyId: id, title: APP_RATING_SURVEY.title, answers }
      );
      await markAppRatingSurveyCompleted();
      return;
    }
    return request<void>(`/surveys/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  createNews: async (data: Partial<NewsItem>) => {
    const result = await tryJsonVariants<NewsItem>(
      ['/news', '/manager/news', '/admin/news', '/announcements'],
      { ...data, type: 'news', status: (data as any).status ?? 'published' }
    );
    return result ?? saveLocalNews(data);
  },

  updateNews: async (id: string, data: Partial<NewsItem>) => {
    const result = await tryJsonVariants<NewsItem>(
      [`/news/${id}`, `/manager/news/${id}`, `/admin/news/${id}`, `/announcements/${id}`, `/news/${id}/update`, `/manager/news/${id}/update`],
      { ...data, type: 'news' },
      'PATCH'
    );
    if (result) return result;

    const putResult = await tryJsonVariants<NewsItem>(
      [`/news/${id}`, `/manager/news/${id}`, `/admin/news/${id}`, `/announcements/${id}`],
      { ...data, type: 'news' },
      'PUT'
    );
    if (putResult) return putResult;

    const local = await getLocalNews();
    if (local.some((item) => getRecordId(item as any) === id)) return updateLocalNews(id, data);
    throw new Error('Не удалось сохранить новость на сервере');
  },

  archiveNews: async (item: Partial<NewsItem> & Record<string, any>) => {
    const id = getRecordId(item);
    if (!id) throw new Error('Не удалось определить новость');

    const payloads = [
      { ...item, status: 'archive', archived: true, isArchived: true, type: 'news' },
      { ...item, status: 'archived', archived: true, isArchived: true, type: 'news' },
      { status: 'archive', archived: true, isArchived: true, type: 'news' },
      { status: 'archived', archived: true, isArchived: true, type: 'news' },
    ];
    const archivePaths = [
      `/news/${id}/archive`,
      `/manager/news/${id}/archive`,
      `/admin/news/${id}/archive`,
      `/announcements/${id}/archive`,
    ];
    const updatePaths = [
      `/news/${id}`,
      `/manager/news/${id}`,
      `/admin/news/${id}`,
      `/announcements/${id}`,
    ];

    for (const payload of payloads) {
      const result =
        (await tryJsonVariants<NewsItem>(archivePaths, payload, 'PATCH')) ??
        (await tryJsonVariants<NewsItem>(archivePaths, payload)) ??
        (await tryJsonVariants<NewsItem>(updatePaths, payload, 'PATCH')) ??
        (await tryJsonVariants<NewsItem>(updatePaths, payload, 'PUT'));
      if (result) return result;
    }

    const local = await getLocalNews();
    if (local.some((news) => getRecordId(news as any) === id)) {
      return updateLocalNews(id, { status: 'archive' } as Partial<NewsItem>);
    }
    throw new Error('Не удалось перенести новость в архив');
  },

  deleteNews: async (id: string) => {
    await tryJsonVariants<void>(
      [`/news/${id}`, `/manager/news/${id}`, `/admin/news/${id}`, `/announcements/${id}`],
      {},
      'DELETE'
    );
    await setLocalNews((await getLocalNews()).filter((item) => item.id !== id));
  },

  createUnionEvent: async (data: Partial<UnionEvent>) => {
    const result = await tryJsonVariants<UnionEvent>(
      ['/union-events', '/events', '/manager/events', '/admin/events'],
      { ...data, status: (data as any).status ?? 'published' }
    );
    return result ?? saveLocalEvent(data);
  },

  updateUnionEvent: async (id: string, data: Partial<UnionEvent>) => {
    const result = await tryJsonVariants<UnionEvent>(
      [`/union-events/${id}`, `/events/${id}`, `/manager/events/${id}`, `/admin/events/${id}`],
      data,
      'PATCH'
    );
    return result ?? updateLocalEvent(id, data);
  },

  deleteUnionEvent: async (id: string) => {
    await tryJsonVariants<void>(
      [`/union-events/${id}`, `/events/${id}`, `/manager/events/${id}`, `/admin/events/${id}`],
      {},
      'DELETE'
    );
    await setLocalEvents((await getLocalEvents()).filter((item) => item.id !== id));
  },

  getGiveaways: async () =>
    (await tryRawJson<any[]>('/giveaways')) ??
    (await tryRawJson<any[]>('/draws')) ??
    (await tryRawJson<any[]>('/raffles')) ??
    (await tryRawJson<any[]>('/announcements?type=giveaway')) ??
    [],

  createGiveaway: (data: object) =>
    tryJsonVariants<any>(['/giveaways', '/draws', '/raffles', '/announcements'], data),

  updateGiveaway: (id: string, data: object) =>
    tryJsonVariants<any>([`/giveaways/${id}`, `/draws/${id}`, `/raffles/${id}`, `/announcements/${id}`], data, 'PATCH'),

  deleteGiveaway: (id: string) =>
    tryJsonVariants<void>([`/giveaways/${id}`, `/draws/${id}`, `/raffles/${id}`, `/announcements/${id}`], {}, 'DELETE'),

  createSurvey: (data: Partial<SurveyDetail>) =>
    tryJsonVariants<SurveyDetail>(['/surveys', '/admin/surveys', '/questionnaires', '/polls'], data),

  updateSurvey: (id: string, data: Partial<SurveyDetail>) =>
    tryJsonVariants<SurveyDetail>([`/surveys/${id}`, `/admin/surveys/${id}`, `/questionnaires/${id}`, `/polls/${id}`], data, 'PATCH'),

  deleteSurvey: (id: string) =>
    tryJsonVariants<void>([`/surveys/${id}`, `/admin/surveys/${id}`, `/questionnaires/${id}`, `/polls/${id}`], {}, 'DELETE'),

  changePassword: async (currentPassword: string, newPassword: string) => {
    const result = await tryJsonVariants<void>(
      ['/auth/change-password', '/auth/password', '/profile/password', '/users/me/password'],
      { currentPassword, oldPassword: currentPassword, password: newPassword, newPassword, confirmPassword: newPassword }
    );
    if (!result) throw new Error('Не удалось изменить пароль');
  },

  getLearningModules: () =>
    request<LearningModule[]>('/learning/modules'),

  getLearningLesson: (id: string) =>
    request<LearningLesson>(`/learning/lessons/${id}`),

  completeLesson: (id: string) =>
    request<void>(`/learning/lessons/${id}`, {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    tryJsonVariants<void>(
      ['/auth/forgot-password', '/auth/password-reset/request', '/auth/reset-password/request', '/auth/password/reset', '/auth/reset'],
      { email },
      'POST',
      true
    ),

  verifyResetCode: (email: string, code: string) =>
    tryJsonVariants<void>(
      ['/auth/verify-reset-code', '/auth/forgot-password/verify', '/auth/password-reset/verify', '/auth/reset-password/verify', '/auth/reset/verify', '/auth/password/verify'],
      { email, code, verificationCode: code, otp: code },
      'POST',
      true
    ),

  resetPasswordWithCode: (email: string, code: string, password: string) =>
    tryJsonVariants<void>(
      ['/auth/forgot-password/confirm', '/auth/password-reset', '/auth/reset-password', '/auth/password-reset/verify', '/auth/reset-password/verify'],
      { email, code, verificationCode: code, otp: code, token: code, resetToken: code, password, newPassword: password, confirmPassword: password, passwordConfirm: password },
      'POST',
      true
    ),

  getTelegramStatus: () =>
    request<{ connected: boolean; telegramUsername?: string; telegramFirstName?: string }>('/telegram/status'),

  linkTelegram: () =>
    request<{ deepLink: string; token: string; expiresAt: string }>('/telegram/link', { method: 'POST' }),

  unlinkTelegram: () =>
    request<void>('/telegram/link', { method: 'DELETE' }),

  getMaxStatus: () =>
    request<{ connected: boolean; maxUsername?: string; maxFirstName?: string }>('/max/status'),

  linkMax: () =>
    request<{ deepLink: string; token: string; expiresAt: string }>('/max/link', { method: 'POST' }),

  unlinkMax: () =>
    request<void>('/max/link', { method: 'DELETE' }),
};

import {
  extractFirstSpan,
  extractFormAction,
  extractFormInputs,
  extractTextByClass,
  findSection,
  hasText,
} from './html';
import type { CanteenSnapshot, Credentials, UserType } from './types';

const BASE_URL = 'https://www.yupparaj.ac.th';
const CANTEEN_BASE_PATH = '/canteen';
const LOGIN_PAGE_PATH = `${CANTEEN_BASE_PATH}`;
const DEFAULT_LOGIN_ACTION = `${CANTEEN_BASE_PATH}/login`;
const DASHBOARD_PATHS = [
  `${CANTEEN_BASE_PATH}/dashboard`,
  `${CANTEEN_BASE_PATH}/home`,
  `${CANTEEN_BASE_PATH}/index`,
  `${CANTEEN_BASE_PATH}`,
];
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const USER_TYPES: UserType[] = ['student', 'seller', 'admin'];

interface CookieJar {
  [key: string]: string;
}

function toAbsoluteUrl(path: string | null): string {
  const target = path && path.trim() ? path : DEFAULT_LOGIN_ACTION;
  try {
    return new URL(target, BASE_URL).toString();
  } catch (error) {
    console.warn('Failed to build absolute URL', target, error);
    return `${BASE_URL}${DEFAULT_LOGIN_ACTION}`;
  }
}

function getHeaderSetCookies(headers: Headers): string[] {
  const raw = (headers as unknown as { getAll?: (name: string) => string[]; map?: Record<string, string | string[]> }).getAll?.(
    'set-cookie',
  );
  if (raw && raw.length) {
    return raw;
  }
  const map = (headers as unknown as { map?: Record<string, string | string[]> }).map;
  if (map && map['set-cookie']) {
    const value = map['set-cookie'];
    return Array.isArray(value) ? value : [value];
  }
  const single = headers.get('set-cookie');
  if (!single) {
    return [];
  }
  return single.split(/,(?=[^;,]+=)/);
}

function mergeSetCookies(jar: CookieJar, cookies: string[]): void {
  cookies.forEach((cookie) => {
    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');
    if (!name || typeof value === 'undefined') {
      return;
    }
    jar[name.trim()] = value.trim();
  });
}

function buildCookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function fetchText(
  url: string,
  init: RequestInit,
  jar: CookieJar,
  logger?: (message: string) => void,
): Promise<{ html: string; response: Response }> {
  logger?.(`HTTP ${init.method ?? 'GET'} ${url}`);
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  if (init.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  headers['Cache-Control'] = 'no-store';
  headers.Pragma = 'no-cache';

  const method = (init.method ?? 'GET').toString().toUpperCase();

  if (Object.keys(jar).length) {
    headers.Cookie = buildCookieHeader(jar);
    logger?.(`↳ send cookies: ${headers.Cookie}`);
  }

  if (method === 'POST' && !headers.Origin) {
    headers.Origin = BASE_URL;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });
  logger?.(`↳ status ${response.status}`);
  const html = await response.text();

  const cookies = getHeaderSetCookies(response.headers);
  if (cookies.length) {
    mergeSetCookies(jar, cookies);
    logger?.(`↳ received cookies: ${cookies.map((cookie) => cookie.split(';')[0]).join(', ')}`);
  }
  return { html, response };
}

function extractCsrfToken(html: string): string | null {
  const match = html.match(/name=['"]_?csrf_token['"][^>]*value=['"]([^'"]+)['"]/i);
  if (match) {
    return match[1];
  }
  const meta = html.match(/<meta[^>]*name=['"]csrf-token['"][^>]*content=['"]([^'"]+)['"]/i);
  return meta ? meta[1] : null;
}

function buildLoginPayload(
  html: string,
  credentials: Credentials,
  csrfToken: string | null,
  userType: UserType,
  logger?: (message: string) => void,
): string {
  const inputs = extractFormInputs(html);
  const payload: Record<string, string> = {
    ...inputs,
    username: credentials.username,
    password: credentials.password,
  };

  if (csrfToken) {
    payload._csrf_token = csrfToken;
  }

  payload.user_type = userType;

  delete payload.remember;

  logger?.(`POST ฟิลด์ user_type=${payload.user_type}`);

  return Object.entries(payload)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function extractBalance(html: string): string | null {
  const container = findSection(html, 'bg-gradient-to-r');
  const source = container ?? html;
  const balance =
    extractTextByClass(source, 'p', ['text-4xl', 'font-bold', 'mt-1']) ??
    extractTextByClass(source, 'p', ['text-4xl', 'font-bold']) ??
    extractTextByClass(source, 'h1', ['text-4xl', 'font-bold']);
  return balance?.replace(/\s+/g, ' ').trim() ?? null;
}

function extractOwnerName(html: string): string | null {
  const section = findSection(html, 'mt-6');
  if (section) {
    const span = extractFirstSpan(section);
    if (span) {
      return span.replace(/\s+/g, ' ').trim();
    }
  }
  const container = findSection(html, 'bg-gradient-to-r');
  if (container) {
    const match = container.match(/<span[^>]*class=['"][^'"]*(font-medium|text-sm)[^'"]*['"][^>]*>([\s\S]*?)<\/span>/i);
    if (match) {
      return match[2].replace(/<[^>]+>/g, '').trim();
    }
  }
  return null;
}

function containsLoginForm(html: string): boolean {
  return /<form[^>]*action=['"][^'"]*login[^'"]*['"]/i.test(html) && /name=['"]username['"]/i.test(html);
}

function extractLoginErrorMessage(html: string): string | null {
  const match = html.match(
    /<div[^>]*class=['"][^'"]*(?:alert|bg-red|text-red|error)[^'"]*['"][^>]*>([\s\S]*?)<\/div>/i,
  );
  if (!match) {
    return null;
  }
  const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length ? text : null;
}

interface LoginAttemptResult {
  success: boolean;
  dashboardHtml?: string;
  failureHtml?: string;
  userType: UserType;
}

async function attemptLogin(
  credentials: Credentials,
  userType: UserType,
  logger?: (message: string) => void,
): Promise<LoginAttemptResult> {
  const jar: CookieJar = {};
  logger?.(`สร้างเซสชันใหม่สำหรับการล็อกอิน (${userType})`);
  const loginUrl = `${BASE_URL}${LOGIN_PAGE_PATH}`;
  const { html: loginHtml } = await fetchText(loginUrl, { method: 'GET' }, jar, logger);

  const csrfToken = extractCsrfToken(loginHtml);
  const action = extractFormAction(loginHtml);
  logger?.(csrfToken ? 'พบโทเค็น CSRF' : 'ไม่พบโทเค็น CSRF ใช้ค่าเริ่มต้น');
  const payload = buildLoginPayload(loginHtml, credentials, csrfToken, userType, logger);

  const { html: afterLoginHtml, response: loginResponse } = await fetchText(
    toAbsoluteUrl(action),
    {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: loginUrl,
      },
    },
    jar,
    logger,
  );

  if (loginResponse.status >= 400) {
    throw new Error(`Login failed with status ${loginResponse.status}`);
  }

  if (containsLoginForm(afterLoginHtml)) {
    logger?.('ยังอยู่หน้าล็อกอินหลังส่งข้อมูล น่าจะรหัสผ่านไม่ถูกต้องหรือประเภทผู้ใช้ผิด');
    return {
      success: false,
      failureHtml: afterLoginHtml,
      userType,
    };
  }

  let dashboardHtml = afterLoginHtml;
  if (!hasText(dashboardHtml, 'text-4xl') && !hasText(dashboardHtml, 'font-bold')) {
    for (const path of DASHBOARD_PATHS) {
      const { html } = await fetchText(`${BASE_URL}${path}`, { method: 'GET' }, jar, logger);
      if (hasText(html, 'text-4xl') || hasText(html, 'balance')) {
        dashboardHtml = html;
        break;
      }
    }
  }

  return {
    success: true,
    dashboardHtml,
    userType,
  };
}

export async function fetchCanteenSnapshot(credentials: Credentials, logger?: (message: string) => void): Promise<CanteenSnapshot> {
  const attemptOrder: UserType[] = [credentials.userType, ...USER_TYPES.filter((type) => type !== credentials.userType)];
  let lastErrorMessage: string | null = null;

  for (const attemptType of attemptOrder) {
    if (attemptType !== credentials.userType) {
      logger?.(`ลองเข้าสู่ระบบด้วยประเภทอื่น (${attemptType})`);
    }

    const scopedLogger = attemptType === credentials.userType ? logger : (message: string) => logger?.(`[${attemptType}] ${message}`);
    const result = await attemptLogin(credentials, attemptType, scopedLogger);

    if (!result.success) {
      const failureMessage = extractLoginErrorMessage(result.failureHtml ?? '') ?? 'ล็อกอินไม่สำเร็จ ตรวจสอบข้อมูลอีกครั้ง';
      logger?.(`ระบบตอบกลับ: ${failureMessage}`);
      lastErrorMessage = failureMessage;
      continue;
    }

    if (attemptType !== credentials.userType) {
      logger?.(`ล็อกอินสำเร็จด้วยประเภท ${attemptType} โปรดอัปเดตการตั้งค่าในแอปให้ตรงกัน`);
    }

    const dashboardHtml = result.dashboardHtml ?? '';
    const balance = extractBalance(dashboardHtml);
    if (!balance) {
      logger?.('ไม่พบยอดเงินในหน้าแดชบอร์ด');
      throw new Error('Unable to extract balance from dashboard');
    }

    const ownerName = extractOwnerName(dashboardHtml);
    if (!ownerName) {
      logger?.('ไม่พบชื่อเจ้าของบัญชีในหน้าแดชบอร์ด');
    }

    return {
      balanceText: balance,
      ownerName,
      fetchedAt: Date.now(),
    };
  }

  throw new Error(lastErrorMessage ?? 'ล็อกอินไม่สำเร็จ ตรวจสอบชื่อผู้ใช้ รหัสผ่าน หรือประเภทผู้ใช้');
}

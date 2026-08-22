interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const TOKEN_SCOPES = "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging";

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Trao đổi service account -> access token OAuth2 bằng JWT ký RS256 (Web Crypto),
// không cần thư viện firebase-admin (không chạy được trong Cloudflare Workers).
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: TOKEN_SCOPES,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Không lấy được access token: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface FirestoreDoc {
  name: string;
  fields?: { pushTokens?: { arrayValue?: { values?: { stringValue: string }[] } } };
}

async function fetchAllPushTokens(sa: ServiceAccount, accessToken: string): Promise<string[]> {
  const tokens: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/users`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Không đọc được users: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { documents?: FirestoreDoc[]; nextPageToken?: string };
    for (const doc of data.documents ?? []) {
      for (const v of doc.fields?.pushTokens?.arrayValue?.values ?? []) {
        if (v.stringValue) tokens.push(v.stringValue);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return tokens;
}

async function sendOne(
  sa: ServiceAccount,
  accessToken: string,
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { token, notification: { title, body } } }),
    },
  );
  return res.ok;
}

/** Gửi 1 thông báo nhắc học tới toàn bộ thiết bị đã đăng ký (users/{uid}.pushTokens). */
export async function sendDailyReminder(
  serviceAccountJson: string,
  title: string,
  body: string,
): Promise<{ sent: number; failed: number }> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const accessToken = await getAccessToken(sa);
  const tokens = await fetchAllPushTokens(sa, accessToken);

  let sent = 0;
  let failed = 0;
  for (const token of tokens) {
    const ok = await sendOne(sa, accessToken, token, title, body);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

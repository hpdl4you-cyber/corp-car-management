/**
 * Microsoft Graph API helper for sending Teams 1:1 chat messages.
 *
 * Required Azure App permissions (Application, admin consent needed):
 *   - Chat.Create
 *   - Chat.ReadWrite.All
 *
 * Required env vars:
 *   AUTH_MICROSOFT_ENTRA_ID_ID      (reused from auth)
 *   AUTH_MICROSOFT_ENTRA_ID_SECRET  (reused from auth)
 *   AUTH_MICROSOFT_ENTRA_ID_ISSUER  (reused from auth)
 *   GRAPH_APP_OID                   (service principal object ID of the app)
 */

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.match(
    /microsoftonline\.com\/([^/]+)/,
  )?.[1];
  if (!tenantId) throw new Error("Cannot extract tenantId from ISSUER env");

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
    client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: "POST", body: params },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token error: ${err}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** 앱 서비스 주체 OID와 사용자 OID로 1:1 채팅을 찾거나 생성한다. */
async function getOrCreateChat(
  token: string,
  appOid: string,
  userOid: string,
): Promise<string> {
  const body = {
    chatType: "oneOnOne",
    members: [
      {
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: ["owner"],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${appOid}`,
      },
      {
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: ["owner"],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users/${userOid}`,
      },
    ],
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/chats", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat create error: ${err}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Teams 1:1 채팅으로 메시지를 전송한다. */
export async function sendTeamsMessage(params: {
  /** users 테이블의 entra_object_id */
  userEntraOid: string;
  /** HTML 형식의 메시지 본문 */
  htmlBody: string;
}): Promise<void> {
  const appOid = process.env.GRAPH_APP_OID;
  if (!appOid) throw new Error("GRAPH_APP_OID env var is not set");

  const token = await getGraphToken();
  const chatId = await getOrCreateChat(token, appOid, params.userEntraOid);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: { contentType: "html", content: params.htmlBody },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Message send error: ${err}`);
  }
}

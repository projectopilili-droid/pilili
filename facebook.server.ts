import { FACEBOOK_PROVIDER_ID, facebookReady } from "./facebook";

type FacebookTokens = { accessToken?: string | null };

export function facebookOAuthConfig() {
  const clientId = process.env.FACEBOOK_APP_ID?.trim();
  const clientSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!facebookReady(clientId, clientSecret)) return null;
  return {
    providerId: FACEBOOK_PROVIDER_ID,
    clientId: clientId as string,
    clientSecret: clientSecret as string,
    authorizationUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["email", "public_profile"],
    getUserInfo: facebookUser,
  };
}

async function facebookUser(tokens: FacebookTokens) {
  const token = tokens.accessToken;
  if (!token) return null;
  const res = await fetch("https://graph.facebook.com/me?fields=id,name,email", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const profile = (await res.json()) as { id?: string; name?: string; email?: string };
  if (!profile.id || !profile.email) return null;
  return {
    id: profile.id,
    name: profile.name?.trim() || "PILILÍ",
    email: profile.email.trim(),
    emailVerified: true,
  };
}

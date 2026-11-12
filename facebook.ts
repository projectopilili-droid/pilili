export const FACEBOOK_PROVIDER_ID = "facebook";

export const FACEBOOK_PENDING = "A integração está a ser activada.";

export function facebookReady(id?: string | null, secret?: string | null): boolean {
  return Boolean(id?.trim() && secret?.trim());
}

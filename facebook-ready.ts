import { createServerFn } from "@tanstack/react-start";
import { facebookReady } from "./facebook";

export const facebookAuthReady = createServerFn({ method: "GET" }).handler(async () => {
  return { ready: facebookReady(process.env.FACEBOOK_APP_ID, process.env.FACEBOOK_APP_SECRET) };
});

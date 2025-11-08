import { parseDotEnv, stringifyDotEnv } from "@/utils/TwitchHandler";
import { invoke } from "@tauri-apps/api/core";

export async function verifyState(returnedState: string) {
  // verify state for CSRF protection
  let storedState: string | null = null;
  try {
    const diskState = await invoke<string>("read_file", {
      path: ".oauth_state",
    });
    storedState = diskState.trim() || null;
  } catch (err) {
    console.warn("Failed to read stored OAuth state", err);
    return false;
  }

  if (!storedState || storedState !== returnedState) {
    console.error("OAuth state mismatch - possible CSRF attack");
    return false;
  }

  // clearing the stored state
  try {
    await invoke("write_file", { path: ".oauth_state", contents: "" });
  } catch (err) {
    console.warn("Failed to clear stored OAuth state", err);
    return false;
  }

  return true;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string
) {
  try {
    // exchange code for tokens
    const tokenResponse = await invoke<string>("exchange_code_for_tokens_cmd", {
      code: code,
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: "http://localhost:3000/callback",
    });
    console.log("Tokens exchanged successfully");

    // parse the token response
    const payload = JSON.parse(tokenResponse);

    if (payload.error) {
      console.error(
        "Token exchange error:",
        payload.error_description ?? payload.error
      );
      return;
    }

    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error("Token response missing access_token or refresh_token");
      return;
    }

    // read current .env, update tokens, and save
    const envContents = await invoke<string>("read_file", { path: ".env" });
    const envData = parseDotEnv(envContents);

    envData.TWITCH_ACCESS_TOKEN = accessToken;
    envData.TWITCH_REFRESH_TOKEN = refreshToken;
    envData.TWITCH_BROADCASTER_ID = ""; // force refresh on next load

    await invoke("write_file", {
      path: ".env",
      contents: stringifyDotEnv(envData),
    });

    console.log("Tokens saved to .env");
  } catch (error) {
    console.error("Failed to exchange tokens:", error);
  }
}

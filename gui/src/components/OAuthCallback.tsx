import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { parseDotEnv, stringifyDotEnv } from "../utils/TwitchHandler";

type Status = "processing" | "success" | "error";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Processing Twitch authorization…");

  useEffect(() => {
    let cancelled = false;
    let redirectTimeout: number | undefined;

    async function handleOAuthCallback() {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const code = params.get("code");
      const returnedState = params.get("state");
      let storedState: string | null = null;
      try {
        storedState = window.localStorage.getItem("twitch_oauth_state");
      } catch (err) {
        console.warn("Failed to read stored Twitch OAuth state", err);
      }

      if (error) {
        setStatus("error");
        setMessage(`Twitch authorization failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Missing authorization code in callback.");
        return;
      }

      if (!storedState || !returnedState || storedState !== returnedState) {
        setStatus("error");
        setMessage("Authorization state mismatch. Please retry the login.");
        return;
      }

      try {
        window.localStorage.removeItem("twitch_oauth_state");
      } catch (err) {
        console.warn("Failed to clear stored Twitch OAuth state", err);
      }

      try {
        const envContents = await invoke<string>("read_file", { path: ".env" });
        const envData = parseDotEnv(envContents);

        const clientId = envData.TWITCH_CLIENT_ID?.trim();
        const clientSecret = envData.TWITCH_CLIENT_SECRET?.trim();
        const redirectUri = envData.OAUTH_REDIRECT_URI?.trim();

        if (!clientId || !clientSecret || !redirectUri) {
          setStatus("error");
          setMessage("Missing Twitch credentials or redirect URI in settings.");
          return;
        }

        const tokenResponse = await invoke<string>("exchange_code_for_tokens_cmd", {
          code,
          clientId,
          clientSecret,
          redirectUri,
        });

        const payload = JSON.parse(tokenResponse);

        if (payload.error) {
          setStatus("error");
          setMessage(`Twitch token exchange failed: ${payload.error_description ?? payload.error}`);
          return;
        }

        const accessToken = payload.access_token;
        const refreshToken = payload.refresh_token;

        if (!accessToken || !refreshToken) {
          setStatus("error");
          setMessage("Twitch token response did not include expected credentials.");
          return;
        }

        envData.TWITCH_ACCESS_TOKEN = accessToken;
        envData.TWITCH_REFRESH_TOKEN = refreshToken;
        envData.TWITCH_BROADCASTER_ID = ""; // force refresh on next load

        await invoke("write_file", {
          path: ".env",
          contents: stringifyDotEnv(envData),
        });

        window.history.replaceState({}, document.title, window.location.pathname);

        if (!cancelled) {
          setStatus("success");
          setMessage("Twitch account connected! Redirecting…");
          redirectTimeout = window.setTimeout(() => {
            navigate("/");
          }, 1500);
        }
      } catch (err) {
        console.error("Failed to complete Twitch authorization", err);
        if (!cancelled) {
          setStatus("error");
          setMessage("Something went wrong while completing Twitch authorization.");
        }
      }
    }

    handleOAuthCallback();

    return () => {
      cancelled = true;
      if (redirectTimeout !== undefined) {
        window.clearTimeout(redirectTimeout);
      }
    };
  }, [navigate]);

  return (
    <main className="container">
      <h1>Twitch Authorization</h1>
      <p>{message}</p>
      {status !== "processing" && (
        <button onClick={() => navigate("/", { replace: true })}>
          Return to main menu
        </button>
      )}
    </main>
  );
}
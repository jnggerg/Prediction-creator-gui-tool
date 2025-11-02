import { createContext, useContext, ReactNode } from "react";
import { useTwitchHandler } from "@/utils/TwitchHandler";

/*
Using context for TwitchHandler to avoid prop drilling
Components can access TwitchHandler state and functions via useTwitch()
Mostly used for settings state for ease of access
*/

const TwitchContext = createContext<ReturnType<typeof useTwitchHandler> | null>(
  null
);

export function TwitchProvider({ children }: { children: ReactNode }) {
  const twitch = useTwitchHandler();
  return (
    <TwitchContext.Provider value={twitch}>{children}</TwitchContext.Provider>
  );
}

export function useTwitch() {
  const ctx = useContext(TwitchContext);
  if (!ctx) throw new Error("useTwitch must be used inside <TwitchProvider>");
  return ctx;
}

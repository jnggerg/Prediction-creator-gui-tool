import { Button } from "./button";
import PartnerBadge from "./partnerBadge";
import { useTwitch } from "@/utils/TwitchContext";

export default function AccountCard() {
  const { streamerData, settings, setSettings } = useTwitch();

  return (
    <div className="justify-self-end mb-4 rounded-lg border border-purple-700 p-4 text-center shadow space-y-2">
      <p>Connected account:</p>
      <div className="flex items-center justify-center gap-1">
        <img
          src={streamerData.profile_image_url}
          alt={streamerData.display_name}
          width={40}
          height={40}
          className="rounded-full border dark:border-2 border-purple-700"
        />
        {streamerData.display_name}
        {streamerData.broadcaster_type === "partner" && (
          <PartnerBadge size={20} color="#9146FF" />
        )}
      </div>
      <Button
        onClick={() => {
          /* clearing tokens is enough to trigger a re-render, where the isReady fails and forces user
              to re-authenticate */
          setSettings({
            ...settings,
            TWITCH_ACCESS_TOKEN: "",
            TWITCH_REFRESH_TOKEN: "",
          });
        }}
      >
        Disconnect
      </Button>
    </div>
  );
}

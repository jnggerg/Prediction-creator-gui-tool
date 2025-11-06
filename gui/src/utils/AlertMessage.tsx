import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";

export type Status = "idle" | "saved" | "error";

export default function AlertMessage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  //make "created" message appear only for 2 seconds after saving
  useEffect(() => {
    if (status !== "saved") return;

    const timer = window.setTimeout(() => {
      setStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [status]);

  function DisplayMessage() {
    return (
      <div className="flex-1 justify-center">
        {status === "saved" && (
          <p className="text-center text-sm font-medium text-muted-foreground">
            {message}
          </p>
        )}

        {status === "error" && (
          <Alert
            variant="destructive"
            className="border-2 bg-transparent flex justfiy-center mx-auto w-fit"
          >
            <AlertTitle className="text-sm font-semibold text-destructive">
              !Error! {"->"}
            </AlertTitle>
            <AlertDescription className="text-sm text-destructive/90">
              {message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
  return {
    status,
    message,
    setStatus,
    setMessage,
    DisplayMessage,
  };
}

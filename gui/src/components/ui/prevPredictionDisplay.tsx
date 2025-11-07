import { Prediction, savePrediction } from "@/utils/JsonHandler";
import { useTwitch } from "@/utils/TwitchContext";
import { Separator } from "@radix-ui/react-separator";
import { Button } from "./button";
import { usePredictions } from "@/utils/PredictionsContext";

export function PrevPredictionDisplay() {
  const {
    runningOrLastPrediction,
    cancelPrediction,
    endPrediction,
    startPrediction,
  } = useTwitch();
  const { predictions, setPredictions } = usePredictions();

  function parseToPrediction(twitchPrediction: any): Prediction {
    const prediction: Prediction = {
      id: twitchPrediction.id,
      title: twitchPrediction.title,
      outcomes: twitchPrediction.outcomes.map((outcome: any) => outcome.title),
      prediction_window: twitchPrediction.prediction_window,
    };
    return prediction;
  }
  return (
    <>
      {/* Previous (ended or canceled) prediction display */}
      {(runningOrLastPrediction[0].status === "CANCELED" ||
        runningOrLastPrediction[0].status === "RESOLVED") && (
        <div className="w-full max-w-md mx-auto text-white p-4 rounded-2xl shadow-lg border border-zinc-800">
          <p className="text-sm text-zinc-400 mb-2 text-center">
            Previous Prediction
          </p>
          <Separator className="my-2 bg-zinc-700" />

          {/* Title */}
          <h2 className="text-lg font-semibold mb-3 text-center truncate">
            {runningOrLastPrediction[0].title}
          </h2>

          {/* Outcomes list */}
          {runningOrLastPrediction[0].outcomes &&
            runningOrLastPrediction[0].outcomes.length > 0 && (
              <ul className="space-y-2 max-h-48 overflow-y-auto mb-3 w-fit mx-auto">
                {runningOrLastPrediction[0].outcomes.map(
                  (
                    outcome: { id: string; title: string; color: string },
                    idx: number
                  ) => (
                    <li
                      key={outcome.id}
                      className="bg-zinc-800 rounded-xl px-3 py-2 hover:bg-zinc-700 transition text-center"
                    >
                      <span className="text-sm truncate">
                        Outcome {idx + 1} →{" "}
                        <span className="font-medium">{outcome.title}</span>
                      </span>
                    </li>
                  )
                )}
              </ul>
            )}

          {/* Metadata */}
          <div className="text-xs text-zinc-400 space-y-1 text-center">
            <p>
              Window:{" "}
              <span className="text-zinc-300">
                {runningOrLastPrediction[0].prediction_window} sec
              </span>
            </p>
            <p>
              Status:{" "}
              <span
                className={`font-semibold ${
                  runningOrLastPrediction[0].status === "RESOLVED"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {runningOrLastPrediction[0].status}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 mt-4">
            <Button
              type="button"
              onClick={() =>
                startPrediction(parseToPrediction(runningOrLastPrediction[0]))
              }
              className=" text-white rounded-xl px-4"
            >
              START AGAIN
            </Button>
            {!predictions.find(
              (p) => p.title === runningOrLastPrediction[0].title
            ) && (
              <Button
                type="button"
                onClick={() => {
                  savePrediction(parseToPrediction(runningOrLastPrediction[0]));
                  setPredictions([
                    ...predictions,
                    parseToPrediction(runningOrLastPrediction[0]),
                  ]);
                }}
                className="rounded-xl px-4"
              >
                SAVE
              </Button>
            )}
          </div>
        </div>
      )}
      {/* Active or locked prediction display */}
      {(runningOrLastPrediction[0].status === "LOCKED" ||
        runningOrLastPrediction[0].status === "ACTIVE") && (
        <div className="w-full max-w-md mx-auto text-white p-4 rounded-2xl shadow-lg border border-zinc-800">
          <p className="text-sm text-zinc-400 mb-2 text-center">
            Currently running prediction
          </p>
          <Separator className="my-2 bg-zinc-700" />

          {/* Title */}
          <h2 className="text-lg font-semibold mb-3 text-center truncate">
            {runningOrLastPrediction[0].title}
          </h2>

          {/* Outcomes list */}
          {runningOrLastPrediction[0].outcomes &&
            runningOrLastPrediction[0].outcomes.length > 0 && (
              <ul className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {runningOrLastPrediction[0].outcomes.map(
                  (
                    outcome: { id: string; title: string; color: string },
                    idx: number
                  ) => (
                    <li
                      key={outcome.id}
                      className="flex justify-between items-center bg-zinc-800 rounded-xl px-3 py-2 hover:bg-zinc-700 transition"
                    >
                      <span className="text-sm truncate">
                        Outcome {idx + 1} →{" "}
                        <span className="font-medium">{outcome.title}</span>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() =>
                          endPrediction(
                            runningOrLastPrediction[0].id,
                            outcome.id
                          )
                        }
                      >
                        End
                      </Button>
                    </li>
                  )
                )}
              </ul>
            )}

          {/* Metadata */}
          <div className="text-xs text-zinc-400 space-y-1 text-center">
            <p>
              Window:{" "}
              <span className="text-zinc-300">
                {runningOrLastPrediction[0].prediction_window} sec
              </span>
            </p>
            <p>
              Status:{" "}
              <span
                className={
                  runningOrLastPrediction[0].status === "ACTIVE"
                    ? "text-green-400 font-semibold"
                    : "text-yellow-400 font-semibold"
                }
              >
                {runningOrLastPrediction[0].status}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-3 mt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelPrediction(runningOrLastPrediction[0].id)}
              className="rounded-xl px-4"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

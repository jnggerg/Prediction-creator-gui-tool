import { useNavigate } from "react-router-dom";
import { deletePredictionById } from "../utils/JsonHandler";
import { useTwitch } from "../utils/TwitchContext";
import { usePredictions } from "../utils/PredictionsContext";
import { Button } from "@/components/ui/button";
import AlertMessage from "../utils/AlertMessage";

export default function MyPredictions() {
  const navigate = useNavigate();
  const { startPrediction } = useTwitch();
  const { predictions, setPredictions } = usePredictions();
  const { setStatus, setMessage, DisplayMessage } = AlertMessage();

  return (
    <div className="dark bg-background min-h-screen text-foreground p-5 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col items-start mb-6">
        <Button onClick={() => navigate(-1)} className="absolute left-4">
          ⮜ Back
        </Button>
        <h1 className="text-2xl font-bold w-full">My Predictions</h1>
      </div>

      <div className="mt-1 mb-5 w-full">
        <DisplayMessage />
      </div>

      <ul className="w-full max-w-md space-y-6">
        {predictions.length === 0 && (
          <li className="text-center text-zinc-400">No predictions found.</li>
        )}

        {predictions.map((prediction) => (
          <li
            key={prediction.id}
            className="border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm rounded-2xl shadow-md p-5 text-white transition hover:shadow-lg hover:border-purple-600"
          >
            {/* Title */}
            <p className="text-lg font-semibold text-center mb-3">
              {prediction.title}
            </p>

            {/* Outcomes */}
            {prediction.outcomes && prediction.outcomes.length > 0 && (
              <ul className="text-sm text-zinc-300 mb-3">
                <p className="text-center mb-2 font-medium text-zinc-400">
                  Outcomes:
                </p>
                {prediction.outcomes.map((outcome, idx) => (
                  <li
                    key={`${prediction.id}-${idx}`}
                    className="bg-zinc-800 px-3 py-1 rounded-xl mb-1 text-center hover:bg-zinc-700 transition"
                  >
                    Outcome {idx + 1} → {outcome}
                  </li>
                ))}
              </ul>
            )}

            {/* Window */}
            <p className="text-center text-sm text-zinc-400 mb-4">
              Window:{" "}
              <span className="text-zinc-200">
                {prediction.prediction_window} sec
              </span>
            </p>

            {/* Buttons */}
            <div className="flex justify-center gap-3 mt-2">
              <Button
                type="button"
                onClick={() => {
                  try {
                    startPrediction(prediction);
                    setMessage(`Prediction started!`);
                    setStatus("saved");
                  } catch (error) {
                    console.error("Failed to start prediction:", error);
                    setMessage(`Failed to start prediction: ${error}`);
                    setStatus("error");
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5"
              >
                START
              </Button>

              <Button
                type="button"
                onClick={() => {
                  try {
                    deletePredictionById(prediction.id);
                    setPredictions(
                      predictions.filter((p) => p.id !== prediction.id)
                    );
                    setMessage(`Prediction deleted successfully.`);
                    setStatus("saved");
                  } catch (error) {
                    console.error("Failed to delete prediction:", error);
                    setMessage(`Failed to delete prediction: ${error}`);
                    setStatus("error");
                  }
                }}
                className=" rounded-xl px-5"
                variant="destructive"
              >
                DELETE
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

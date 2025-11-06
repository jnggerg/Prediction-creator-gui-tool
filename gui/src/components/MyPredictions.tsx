import { useNavigate } from "react-router-dom";
import {
  loadPredictions,
  deletePredictionById,
  Prediction,
} from "../utils/JsonHandler";
import { useEffect, useState } from "react";
import { useTwitch } from "../utils/TwitchContext";
import { Button } from "@/components/ui/button";
import AlertMessage, { Status } from "../utils/AlertMessage";

export default function MyPredictions() {
  const navigate = useNavigate();
  const { startPrediction } = useTwitch();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const { status, message, setStatus, setMessage, DisplayMessage } =
    AlertMessage();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const predictions = await loadPredictions();
        if (isMounted) {
          setPredictions(predictions);
        }
      } catch (error) {
        console.error("Failed to load predictions:", error);
        setMessage("Failed to load predictions.");
        setStatus("error");
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dark bg-background text-foreground p-5">
      <Button type="button" onClick={() => navigate(-1)}>
        {"⮜ Back"}
      </Button>
      <DisplayMessage />
      <div className="min-h-screen w-full max-w-md mx-auto flex flex-col items-center space-y-5">
        <h1 className="text-2xl font-bold">My Predictions</h1>
        <ul>
          {predictions.length === 0 && <li>No predictions found.</li>}
          {predictions.map((prediction) => (
            <li
              key={prediction.id}
              className="mb-4 p-4 border rounded-lg shadow"
            >
              <strong>Title: {prediction.title}</strong>
              {prediction.outcomes && prediction.outcomes.length > 0 && (
                <ul>
                  <div className="">
                    Outcomes:
                    {prediction.outcomes.map((outcome, idx) => (
                      <li key={`${prediction.id}-${idx}`}>{outcome}</li>
                    ))}
                  </div>
                </ul>
              )}
              <p>Duration: {prediction.prediction_window} sec</p>
              <Button type="button" onClick={() => startPrediction(prediction)}>
                START
              </Button>
              <Button
                onClick={() => {
                  deletePredictionById(prediction.id);
                  setPredictions(
                    predictions.filter((p) => p.id !== prediction.id)
                  );
                }}
              >
                DELETE
              </Button>
              <Button>EDIT</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

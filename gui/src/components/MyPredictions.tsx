import { useNavigate } from "react-router-dom";
import { loadPredictions, deletePredictionById,Prediction } from "../utils/JsonHandler";
import { useEffect, useState } from "react";
import { useTwitchHandler } from "../utils/TwitchHandler";
import { Button } from "@/components/ui/button"

export default function MyPredictions() {
  const navigate = useNavigate();
  const { startPrediction } = useTwitchHandler();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  

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
      <div className="min-h-screen w-full max-w-md mx-auto flex flex-col items-center space-y-5">
      <h1>My Predictions</h1>
      <ul>
        {predictions.length === 0 && <li>No predictions found.</li>}
        {predictions.map((prediction) => (
          <li key={prediction.id} className="mb-4 p-4 border rounded-lg shadow">
            <strong>{prediction.title}</strong>
            {prediction.outcomes && prediction.outcomes.length > 0 && (
              <ul>
                {prediction.outcomes.map((outcome, idx) => (
                  <li key={`${prediction.id}-${idx}`}>{outcome}</li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              onClick={() => startPrediction(prediction)}
            >
              START
            </Button>
            <Button onClick={() => {deletePredictionById(prediction.id); setPredictions(predictions.filter(p => p.id !== prediction.id));}}>DELETE</Button>
            <Button>EDIT</Button>
          </li>
        ))}   
      </ul>
      </div>
    </div>
  );
}

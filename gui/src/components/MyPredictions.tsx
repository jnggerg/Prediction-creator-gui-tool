import { useNavigate } from "react-router-dom";
import { loadPredictions, Prediction } from "../utils/JsonHandler";
import { useEffect, useState } from "react";
import { startPrediction } from "../utils/TwitchHandler";

export default function MyPredictions() {
  const navigate = useNavigate();
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

  const handleStartPrediction = (prediction: Prediction) => {
    startPrediction(prediction);
  };

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        {"<- "}
      </button>
      <h1>My Predictions</h1>
      <ul>
        {predictions.length === 0 && <li>No predictions found.</li>}
        {predictions.map((prediction) => (
          <li key={prediction.id}>
            <strong>{prediction.title}</strong>
            {prediction.options && prediction.options.length > 0 && (
              <ul>
                {prediction.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => handleStartPrediction(prediction)}
            >
              DELETE
            </button>
            <button>START</button>
            <button>EDIT</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

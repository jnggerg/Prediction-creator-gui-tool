import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { loadPredictions, Prediction } from "./JsonHandler";

interface PredictionsContextType {
  predictions: Prediction[];
  setPredictions: (predictions: Prediction[]) => void;
  refresh: () => void;
}

const PredictionsContext = createContext<PredictionsContextType | undefined>(
  undefined
);

export function PredictionsProvider({ children }: { children: ReactNode }) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [refreshKey]);

  const refresh = () => setRefreshKey((key) => key + 1);

  return (
    <PredictionsContext.Provider
      value={{ predictions, setPredictions, refresh }}
    >
      {children}
    </PredictionsContext.Provider>
  );
}

export function usePredictions() {
  const context = useContext(PredictionsContext);
  if (!context) {
    throw new Error("usePredictions must be used within a PredictionsProvider");
  }
  return context;
}

import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";

export interface Prediction {
  id: number;
  title: string;
  options: string[];
  duration: number; // in seconds
}

// data validation with zod
export const PredictionSchema = z.object({
  id: z.number().int(),
  title: z.string().min(3).max(100),
  options: z.array(z.string()).min(2).max(10),
  duration: z.number().min(30),
});

export async function loadPredictions(): Promise<Prediction[]> {
  try {
    const text = JSON.parse(await invoke<string>("read_file", { path: "my_predictions.json" }));
    const parsed = z.array(PredictionSchema).safeParse(text);
    if (!parsed.success) {
      console.error("Data failed validation: ", parsed.error);
      return [];
    }
    return parsed.data;
  } catch (err) {
    console.error("Failed to read / parse json:", err);
    return [];
  }
}

export async function deletePredictionById(predictionId: number) {
  try {
    const preds = await loadPredictions();
    const filteredPreds = preds.filter((pred) => pred.id !== predictionId);
    await invoke("write_file", { path: "my_predictions.json", contents: JSON.stringify(filteredPreds) });
  } catch (err) {
    console.error("Failed to delete json:", err);
  }
}

export async function savePrediction(prediction: Prediction): Promise<string> {
  try {
    const preds = await loadPredictions();
    preds.push(PredictionSchema.safeParse(prediction).success ? prediction : (() => { throw new Error("Invalid prediction data"); })());
    await invoke("write_file", { path: "my_predictions.json", contents: JSON.stringify(preds) });
    return "Prediction saved successfully";
  } catch (err) {
    return `Failed to save prediction, ${err}`;
  }
}


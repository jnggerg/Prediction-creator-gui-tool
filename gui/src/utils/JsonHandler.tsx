import axios, { AxiosInstance } from "axios";

export const axiosClient: AxiosInstance = axios.create({
  baseURL: "http://localhost:8999",
  timeout: 1000,
  headers: { "Content-Type": "application/json" },
});

export interface Prediction {
  id: number;
  title: string;
  options?: string[];
  duration?: number;
}

export async function loadPredictions(): Promise<Prediction[]> {
  try {
    const response = await axiosClient.get<Prediction[]>(`/predictions`);
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error("Failed to read / parse json:", err);
    return [];
  }
}

export async function savePredictions(prediction: Prediction) {
  try {
    await axiosClient.post(`/predictions`, prediction);
  } catch (err) {
    console.error("Failed to write:", err);
  }
}

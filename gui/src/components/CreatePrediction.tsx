import { useNavigate } from "react-router-dom";
import { savePrediction, Prediction } from "../utils/JsonHandler";
import { useState, ChangeEvent, FormEvent, MouseEvent } from "react";
import { useTwitch } from "../utils/TwitchContext";
import { usePredictions } from "../utils/PredictionsContext";
import {
  FieldGroup,
  Field,
  FieldSet,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import AlertMessage from "../utils/AlertMessage";

export default function CreatePrediction() {
  const { startPrediction } = useTwitch();
  const { predictions, setPredictions } = usePredictions();
  const navigate = useNavigate();
  const { setStatus, setMessage, DisplayMessage } = AlertMessage();

  const [formValues, setFormValues] = useState({
    title: "",
    outcomes: "",
    prediction_window: "",
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  function buildPredictionFromForm(): Prediction | null {
    const title = formValues.title.trim();
    if (!title || title.length < 3) {
      setStatus("error");
      setMessage("Title must be at least 3 characters long.");
      return null;
    }

    let outcomes = formValues.outcomes
      .split(",")
      .map((outcomes) => outcomes.trim())
      .filter((outcomes) => outcomes.length > 0);
    outcomes = Array.from(new Set(outcomes)); //remove duplicates

    for (const outcome of outcomes) {
      if (outcome.trim().length > 25) {
        setStatus("error");
        setMessage("Each outcome must be less than 25 characters long.");
        return null;
      }
    }

    if (outcomes.length < 2) {
      setStatus("error");
      setMessage("A prediction requires at least two unique outcomes");
      return null;
    }
    const parsedWindow = Number.parseInt(formValues.prediction_window, 10);
    const prediction_window = Number.isNaN(parsedWindow) ? 90 : parsedWindow; // default to 90 seconds when input missing/invalid
    if (prediction_window < 30 || prediction_window > 1800) {
      setStatus("error");
      setMessage("Prediction window must be between 30 and 1800 seconds.");
      return null;
    }

    return {
      id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      title,
      outcomes,
      prediction_window: prediction_window,
    };
  }

  async function persistPrediction(): Promise<Prediction | null> {
    const nextPrediction = buildPredictionFromForm();
    if (!nextPrediction) {
      return null;
    }

    const updatedPredictions = [...predictions, nextPrediction];
    setPredictions(updatedPredictions);
    await savePrediction(nextPrediction);
    return nextPrediction;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    try {
      const created = await persistPrediction();
      if (created) {
        setStatus("saved");
        setMessage("Prediction saved!");
        setFormValues({ title: "", outcomes: "", prediction_window: "" }); //reset form
      }
    } catch (error) {
      console.error("Error saving prediction:", error);
      setStatus("error");
      setMessage("Prediction failed to save.");
    }
  }

  async function handleSaveAndStart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const created = await persistPrediction();
    if (created) {
      setFormValues({ title: "", outcomes: "", prediction_window: "" });
      setStatus("saved");
      setMessage("Prediction saved! Starting on Twitch...");
      await startPrediction(created);
    }
  }

  async function handleStart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const builtPrediction = buildPredictionFromForm();
    if (builtPrediction) {
      setStatus("saved");
      setMessage("Starting prediction on Twitch...");
      await startPrediction(builtPrediction);
    }
  }

  return (
    <div className="dark bg-background min-h-screen text-foreground p-5">
      <div className="mb-4 w-full flex items-center">
        <Button onClick={() => navigate(-1)} className="absolute left-4">
          ⮜ Back
        </Button>
        <h1 className="text-2xl font-bold w-full ">Create new prediction</h1>
      </div>
      <div className="items-center justify-center">
        <DisplayMessage />
        <form onSubmit={handleSave} noValidate>
          <FieldGroup className="gap-4">
            <FieldSet className="gap-4">
              <Field>
                <FieldLabel>Title:</FieldLabel>
                <Input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleInputChange}
                />
                <FieldDescription>
                  The title should be between 3 and 45 characters.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Options:</FieldLabel>
                <Input
                  type="text"
                  name="outcomes"
                  value={formValues.outcomes}
                  onChange={handleInputChange}
                />
                <FieldDescription>
                  Separate multiple options with commas, eg. "Option 1, Option
                  2, Option 3", maximum 10. Duplicates will be ignored.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Duration:</FieldLabel>
                <Input
                  type="text"
                  name="prediction_window"
                  value={formValues.prediction_window}
                  onChange={handleInputChange}
                />
                <FieldDescription>
                  Duration in seconds, can be empty, default is 90. Value should
                  be between 30 and 1800.
                </FieldDescription>
              </Field>
              <div className="flex flex-row justify-center gap-4 mt-4">
                <Button type="button" onClick={handleSaveAndStart}>
                  Save and start
                </Button>
                <Button type="submit">Save</Button>
                <Button type="button" onClick={handleStart}>
                  Start
                </Button>
              </div>
            </FieldSet>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}

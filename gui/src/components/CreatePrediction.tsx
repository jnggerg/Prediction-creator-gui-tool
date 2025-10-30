import { useNavigate } from "react-router-dom";
import {
  loadPredictions,
  savePrediction,
  Prediction,
} from "../utils/JsonHandler";
import { useEffect, useState, ChangeEvent, FormEvent, MouseEvent } from "react";
import { useTwitchHandler } from "../utils/TwitchHandler";
import { FieldGroup, Field, FieldSet, FieldLabel, FieldDescription  } from "@/components/ui/field"
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function CreatePrediction() {
  const { startPrediction } = useTwitchHandler();

  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
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
      console.error("Cannot create prediction with a title shorter than 3 chars");
      return null;
    }

    const outcomes = formValues.outcomes
      .split(",")
      .map((outcomes) => outcomes.trim())
      .filter((outcomes) => outcomes.length > 0);

    if (outcomes.length < 2) {
      console.error("A prediction requires at least two valid outcomes");
      return null;
    }
    const prediction_window = formValues.prediction_window

    return {
      id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      title,
      outcomes,
      prediction_window: parseInt(prediction_window) || 90, //default to 90 seconds if invalid
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
    const created = await persistPrediction();
    if (created) {
      setFormValues({ title: "", outcomes: "", prediction_window: "" }); //reset form
    }
  }

  async function handleSaveAndStart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const created = await persistPrediction();
    if (created) {
      setFormValues({ title: "", outcomes: "", prediction_window: "" });
      await startPrediction(created);
    }

    // TODO: Integrate with Twitch startPrediction API using `created`
    console.info(
      "Prediction saved, implement startPrediction integration",
      created
    );
  }

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
      <div className="min-h-screen items-center justify-center space-y-5">
      <h1>Create a New Prediction</h1>
      <form onSubmit={handleSave}>
        <FieldGroup>
          <FieldSet>
          <Field>
            <FieldLabel>Title:</FieldLabel>
            <Input
              type="text"
              name="title"
              value={formValues.title}
              onChange={handleInputChange}
              required
            />
            <FieldDescription>
              The title should be between 3 and 45 characters.
            </FieldDescription>
          </Field>
        <br />
        <Field>
          <FieldLabel>Options:</FieldLabel>
          <Input
            type="text"
            name="outcomes"
            value={formValues.outcomes}
            onChange={handleInputChange}
          />
          <FieldDescription>
            Separate multiple options with commas, eg. "Option 1, Option 2, Option 3", maximum 10.
          </FieldDescription>
        </Field>
        <br />
        <Field>
          <FieldLabel>Duration:</FieldLabel>
          <Input
            type="text"
            name="prediction_window"
            value={formValues.prediction_window}
            onChange={handleInputChange}
          />
          <FieldDescription>
            Duration in seconds, can be empty, default is 90. Value should be between 30 and 1800.
          </FieldDescription>
        </Field>
        <br />
        <div className="row">
          <Button type="button" onClick={handleSaveAndStart}>
            Save and start
          </Button>
          <Button type="submit">Save</Button>
          <Button
            type="button"
            onClick={() =>
              console.info("TODO: start without saving? implement logic")
            }
          >
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

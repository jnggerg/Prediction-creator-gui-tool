import { useNavigate } from "react-router-dom";
import {
  loadPredictions,
  savePrediction,
  Prediction,
} from "../utils/JsonHandler";
import { useEffect, useState, ChangeEvent, FormEvent, MouseEvent } from "react";
import { useTwitchHandler } from "../utils/TwitchHandler";

export default function CreatePrediction() {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [formValues, setFormValues] = useState({
    title: "",
    options: "",
    duration: "",
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

    const options = formValues.options
      .split(",")
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    if (options.length < 2) {
      console.error("A prediction requires at least two valid options");
      return null;
    }
    const duration = formValues.duration

    return {
      //if any exist, use the last id + 1, else start at 1
      id:
        predictions.length > 0 ? predictions[predictions.length - 1].id + 1 : 1,
      title,
      options,
      duration: parseInt(duration) || 90, //default to 90 seconds if invalid
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
      setFormValues({ title: "", options: "", duration: "" }); //reset form
    }
  }

  async function handleSaveAndStart(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const created = await persistPrediction();
    if (!created) {
      return;
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
    <div>
      <button onClick={() => navigate(-1)}>{ "<- "}</button>
      <h2>Create a New Prediction</h2>
      <form onSubmit={handleSave}>
        <label>
          Title:
          <input
            type="text"
            name="title"
            value={formValues.title}
            onChange={handleInputChange}
            required
          />
        </label>
        <br />
        <label>
          Options:
          <input
            type="text"
            name="options"
            value={formValues.options}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <label>
          Duration:
          <input
            type="text"
            name="duration"
            value={formValues.duration}
            onChange={handleInputChange}
          />
        </label>
        <br />
        <div className="row">
          <button type="button" onClick={handleSaveAndStart}>
            Save and start
          </button>
          <button type="submit">Save</button>
          <button
            type="button"
            onClick={() =>
              console.info("TODO: start without saving? implement logic")
            }
          >
            Start
          </button>
        </div>
      </form>
    </div>
  );
}

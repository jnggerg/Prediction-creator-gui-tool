import ReactDOM from "react-dom/client";
import App from "./App";
import { TwitchProvider } from "./utils/TwitchContext";
import { PredictionsProvider } from "./utils/PredictionsContext";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <TwitchProvider>
      <PredictionsProvider>
        <App />
      </PredictionsProvider>
    </TwitchProvider>
  </BrowserRouter>
);

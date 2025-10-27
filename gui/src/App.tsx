import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreatePrediction from "./components/CreatePrediction";
import MainMenu from "./components/MainMenu";
import MyPredictions from "./components/MyPredictions";
import { Settings } from "./components/settings";
import OAuthCallback from "./components/OAuthCallback";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu className="dark"/>} />
        <Route path="/CreatePrediction" element={<CreatePrediction />} />
        <Route path="/MyPredictions" element={<MyPredictions />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

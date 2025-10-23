import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreatePrediction from "./components/CreatePrediction";
import MainMenu from "./components/MainMenu";
import MyPredictions from "./components/MyPredictions";
import { Settings } from "./components/settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/CreatePrediction" element={<CreatePrediction />} />
        <Route path="/MyPredictions" element={<MyPredictions />} />
        <Route path="/Settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

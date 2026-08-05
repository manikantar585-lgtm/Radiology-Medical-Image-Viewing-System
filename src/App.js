import Reports from "./pages/Reports";
import ImageViewer from "./pages/ImageViewer";
import Patients from "./pages/Patients";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StudyList from "./pages/StudyList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/studies" element={<StudyList />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/viewer" element={<ImageViewer />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
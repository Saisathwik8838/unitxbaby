import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReduxProvider } from "./store/ReduxProvider";

import LandingPage from "./components/LandingPage";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";   // ⬅ global auth

function App() {
  return (
    <BrowserRouter>
      <ReduxProvider>

        {/* AUTH AT TOP LEVEL (FIXES EVERYTHING) */}
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>

      </ReduxProvider>
    </BrowserRouter>
  );
}

export default App;

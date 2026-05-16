import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SharedNote from "./pages/SharedNote";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const restoring = useAuthStore((state) => state.restoring);

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/shared/:token" element={<SharedNote />} />
    </Routes>
  );
}

function RootRedirect() {
  const token = useAuthStore((state) => state.token);
  const restoring = useAuthStore((state) => state.restoring);
  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

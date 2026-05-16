import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";

import { LoginForm } from "../components/auth/LoginForm";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const restoring = useAuthStore((state) => state.restoring);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!restoring && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cloud px-4">
      <div className="w-full max-w-md">
        <LoginForm
          busy={busy}
          error={error}
          onSubmit={async (values) => {
            setBusy(true);
            setError("");
            try {
              await login(values);
              navigate("/dashboard");
            } catch (submitError) {
              setError(submitError.response?.data?.message || submitError.response?.data?.detail || "Login failed");
            } finally {
              setBusy(false);
            }
          }}
        />
        <p className="mt-4 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link to="/register" className="font-medium text-slate-900">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

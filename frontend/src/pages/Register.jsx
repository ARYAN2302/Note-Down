import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { RegisterForm } from "../components/auth/RegisterForm";
import { useAuthStore } from "../store/authStore";

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-cloud px-4">
      <div className="w-full max-w-md">
        <RegisterForm
          busy={busy}
          error={error}
          success={success}
          onSubmit={async (values) => {
            setBusy(true);
            setError("");
            setSuccess("");
            try {
              await register(values);
              setSuccess("Account created. You can sign in now.");
              window.setTimeout(() => navigate("/login"), 700);
            } catch (submitError) {
              setError(submitError.response?.data?.detail || "Registration failed");
            } finally {
              setBusy(false);
            }
          }}
        />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-slate-900">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

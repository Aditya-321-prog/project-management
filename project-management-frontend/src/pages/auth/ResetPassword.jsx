import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AuthHeader from "../../components/auth/AuthHeader";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";

import { resetPassword } from "../../services/authService";

export default function ResetPassword() {
  const { resetToken } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Register jaisa hi rule (pehle yahan koi check nahi tha)
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      setMessage("Password must be 8+ characters with uppercase, lowercase and a number");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(resetToken, {
        newPassword: password,
      });

      setMessage(res.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Unable to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <AuthHeader
        title="Reset Password"
        subtitle="Choose a new password"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <PasswordInput
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <AuthButton loading={loading}>
          Reset Password
        </AuthButton>
      </form>

      {message && (
        <p className="mt-5 text-center text-sm text-slate-700 dark:text-slate-300 animate-fade-in">
          {message}
        </p>
      )}

      <Link
        to="/login"
        className="mt-6 block text-center text-blue-600"
      >
        Back to Login
      </Link>
    </div>
  );
}
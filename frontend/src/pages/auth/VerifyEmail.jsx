import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { verifyEmail } from "../../services/authService";

export default function VerifyEmail() {
  const { verificationToken } = useParams();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await verifyEmail(verificationToken);

        setSuccess(true);
        setMessage(res.data.message);
      } catch (err) {
        setSuccess(false);
        setMessage(
          err.response?.data?.message || "Verification failed"
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [verificationToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <h2 className="text-xl font-semibold">
          Verifying your email...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <h1 className="mb-4 text-3xl font-bold">
          {success ? "✅ Email Verified" : "❌ Verification Failed"}
        </h1>

        <p className="mb-6 text-slate-600">
          {message}
        </p>

        <Link
          to="/login"
          className="block rounded-xl bg-blue-600 py-3 text-center font-medium text-white hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
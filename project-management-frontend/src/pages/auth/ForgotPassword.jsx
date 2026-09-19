import { useState } from "react";
import { Link } from "react-router-dom";

import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";

import { forgotPassword } from "../../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

 const [message, setMessage] = useState("");
const [error, setError] = useState("");
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    

    try {
      
      setMessage("");
setError("");

const trimmedEmail = email.trim();

if (!trimmedEmail) {
    return setMessage("Email is required");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(trimmedEmail)) {
    return setMessage("Enter a valid email");
}
      const res = await forgotPassword(trimmedEmail);

      setMessage(res.data.message);
    } catch(err){

if(!err.response){
    setError("Unable to connect to server.");
}
else{
    setError(
        err.response.data.message ||
        "Unable to send reset link."
    );
}
} finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <AuthHeader
        title="Forgot Password"
        subtitle="We'll send you a reset link."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <AuthInput
    label="Email"
    type="email"

    name="email"
    value={email}
    disabled={loading}
    autoFocus
    onChange={(e)=>setEmail(e.target.value)}
/>

        <AuthButton
          loading={loading}
        >
          Send Reset Link
        </AuthButton>
      </form>

      {message && (
<div
className="
mt-5
rounded-lg
border
border-green-200
bg-green-50
text-green-700
px-4
py-3
text-sm
"
>
{message}
</div>
)}

{error && (
<div
className="
mt-5
rounded-lg
border
border-red-200
bg-red-50
text-red-700
px-4
py-3
text-sm
"
>
{error}
</div>
)}

      <Link
        to="/login"
        className="
mt-6
block
text-center
text-blue-600
hover:underline
transition
"
      >
        Back to Login
      </Link>
    </div>
  );
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";
import { toast } from "react-hot-toast";
import { registerUser } from "../../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {

    if (error) {
        setError("");
    }

    setForm((prev) => ({
        ...prev,
        [e.target.name]: e.target.value,
    }));
};
const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const fullName = form.fullName.trim();

if (!fullName) {
    return setError("Full name is required");
}

if (fullName.length < 2) {
    return setError("Full name must be at least 2 characters");
}

    const username = form.username.trim();
    const email = form.email.trim();

    if (!username) {
        return setError("Username is required");
    }

    if (username.length < 3) {
        return setError("Username must be at least 3 characters");
    }

    if (username.length > 30) {
        return setError("Username is too long");
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!usernameRegex.test(username)) {
        return setError(
            "Username can only contain letters, numbers and underscores"
        );
    }

    if (!email) {
        return setError("Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return setError("Enter a valid email address");
    }

    if (!form.password) {
        return setError("Password is required");
    }

    if (form.password.length < 8) {
        return setError(
            "Password must be at least 8 characters"
        );
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(form.password)) {
        return setError(
            "Password must contain uppercase, lowercase and a number"
        );
    }

    if (!form.confirmPassword) {
        return setError("Confirm password is required");
    }

    if (form.password !== form.confirmPassword) {
        return setError("Passwords do not match");
    }

    setLoading(true);

    try {

        await registerUser({
    fullName,
    username,
    email,
    password: form.password,
});

        setForm({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
});

        toast.success("Account created successfully");

        navigate("/login", {
            replace: true,
        });

    } catch (err) {

        if (!err.response) {
            setError("Unable to connect to server.");
        } else {
            setError(
                err.response.data.message ||
                "Registration failed."
            );
        }

    } finally {
        setLoading(false);
    }
};

  return (
    <AuthCard>
      <AuthHeader
        title="Create Account"
        subtitle="Join ProjectCamp"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

    <AuthInput
    id="fullName"
    label="Full Name"
    name="fullName"
    placeholder="Enter your full name"
    value={form.fullName}
    onChange={handleChange}
    autoComplete="name"
    disabled={loading}
    required
/>

       <AuthInput
  id="username"
  label="Username"
  name="username"
  placeholder="Choose a username"
  value={form.username}
  onChange={handleChange}
  autoComplete="username"
  disabled={loading}
  required
/>

<AuthInput
  id="email"
  label="Email"
  type="email"
  name="email"
  placeholder="Enter your email"
  value={form.email}
  onChange={handleChange}
  autoComplete="email"
  disabled={loading}
  required
/>

       <PasswordInput
  id="password"
  label="Password"
  name="password"
  value={form.password}
  onChange={handleChange}
  placeholder="Create password"
  autoComplete="new-password"
  disabled={loading}
  required
/>


       <PasswordInput
    id="confirmPassword"
    label="Confirm Password"
    name="confirmPassword"
    value={form.confirmPassword}
    onChange={handleChange}
    placeholder="Confirm password"
    autoComplete="new-password"
    disabled={loading}
    required
/>

<p className="text-xs text-gray-500">
    Password must contain at least 8 characters,
    one uppercase letter, one lowercase letter
    and one number.
</p>

        {error && (
    <div
        className="
        bg-red-50
        border
        border-red-200
        text-red-700
        rounded-lg
        px-4
        py-3
        text-sm
    "
    >
        {error}
    </div>
)}

        <AuthButton loading={loading}>
          Create Account
        </AuthButton>

        <p className="text-center text-sm text-gray-600">
    Already have an account?{" "}
    <Link
        to="/login"
        className="font-medium text-blue-600 hover:underline"
    >
        Login
    </Link>
</p>
      </form>
    </AuthCard>
  );
}
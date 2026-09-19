import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthCard from "../../components/auth/AuthCard";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthInput from "../../components/auth/AuthInput";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";
import { toast } from "react-hot-toast";
import { loginUser } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { GoogleLogin } from "@react-oauth/google";
import { googleLogin } from "../../services/authService";


export default function Login() {

  const navigate = useNavigate();
  const location = useLocation();
  // Login ke baad wahi page khule jahan user jaana chahta tha
  const redirectTo = location.state?.from || "/";

  const { setUser } = useAuthStore();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {

    if(error){
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

    

    const email = form.email.trim();

    if (!email) {
        return setError("Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email.trim())) {
        return setError("Enter a valid email");
    }

    if (!form.password.trim()) {
      return setError("Password is required");
    }

    setLoading(true);

    try {
      const payload = {
        email,
        password: form.password,
      };

      const res = await loginUser(payload);
      

      setUser(res.data.data.user);

      setForm({
        email:"",
        password:"",
      });


      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });

    } catch (err) {

      if (!err.response) {
          setError("Unable to connect to server.");
      } else {
          setError(
              err.response.data.message ||
              "Login failed."
          );
      }

  } finally {
      setLoading(false);
    }
  };

const handleGoogleLogin = async (credentialResponse) => {

    try {

        const res = await googleLogin(
            credentialResponse.credential
        );

        setUser(res.data.data.user);

        toast.success("Welcome!");

        navigate(redirectTo, {
            replace: true,
        });

    } catch (error) {

        console.log(error);

        toast.error(
            error.response?.data?.message ||
            "Google login failed"
        );

    }

};

  return (
    <AuthCard>
      <AuthHeader
        title="Welcome Back"
        subtitle="Login to continue to ProjectCamp"
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <AuthInput
  id="email"
  label="Email"
  type="email"
  name="email"
  placeholder="Enter your email"
  value={form.email}
  onChange={handleChange}
  autoComplete="email"
  autoFocus
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

        {error && (
              <div className="
                  bg-red-50
                  border
                  border-red-200
                  text-red-700
                  rounded-lg
                  px-4
                  py-3
                  text-sm
              ">
                  {error}
              </div>
          )}

        <div className="flex items-center justify-between text-sm">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>

          <Link
            to="/register"
            className="text-blue-600 hover:underline"
          >
            Register
          </Link>
        </div>

        <AuthButton loading={loading}>
          Login
        </AuthButton>
      </form>


      <div className="mt-6">

{/* dividing linee */}
    <div className="flex items-center my-5">

        <div className="flex-1 border-t"></div>

        <span className="px-3 text-sm text-gray-500">
            OR
        </span>

        <div className="flex-1 border-t"></div>

    </div>

    <div className="flex justify-center">

        <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() =>
                toast.error("Google login failed")
            }
        />

    </div>

</div>
    </AuthCard>
  );
}
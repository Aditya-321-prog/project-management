import { Link } from "react-router-dom";

export default function AuthLink({
  text,
  linkText,
  to,
}) {
  return (
    <p className="text-center text-sm text-slate-500">
      {text}{" "}
      <Link
        to={to}
        className="font-medium text-blue-600 hover:underline"
      >
        {linkText}
      </Link>
    </p>
  );
}
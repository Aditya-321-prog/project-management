import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  name,
  placeholder,
  autoComplete,
  disabled = false,
  required = false,
  error,
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-2 font-medium text-gray-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          className="
            w-full
            rounded-xl
            border
            px-4
            py-3
            pr-12
            outline-none
            transition
            focus:border-blue-500
            focus:ring-2
            focus:ring-blue-500
            disabled:bg-gray-100
            disabled:cursor-not-allowed
            disabled:opacity-70
          "
        />

        <button
          type="button"
          disabled={disabled}
          aria-label={
            show ? "Hide password" : "Show password"
          }
          onClick={() => setShow((prev) => !prev)}
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-gray-500
            hover:text-gray-700
            transition
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {show ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
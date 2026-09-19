export default function AuthInput({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  disabled = false,
  required = false,
  autoFocus = false,
  autoComplete,
  error,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-2 font-medium text-gray-700"
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="
          w-full
          rounded-xl
          border
          px-4
          py-3
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

      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
// Chhota avatar - photo na ho to naam ka pehla akshar
export default function Avatar({ user, size = 32, className = "" }) {
  const name = user?.fullName || user?.username || "?";
  const url = user?.avatar?.url;
  const hasPhoto = url && !url.includes("placehold.co");

  return hasPhoto ? (
    <img
      src={url}
      alt={name}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 font-semibold uppercase text-white ${className}`}
    >
      {name[0]}
    </span>
  );
}

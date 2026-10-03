export function RoundPhoto({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  const letter = name.trim().slice(0, 1).toUpperCase() || "•";
  if (src) {
    return <img className="round-photo" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="round-photo empty" style={{ width: size, height: size, flex: "0 0 auto" }} aria-hidden="true">
      {letter}
    </span>
  );
}

"use client";

import { useEffect, useState, type CSSProperties } from "react";

type UserAvatarProps = {
  picture?: string | null;
  googlePicture?: string | null;
  name?: string | null;
  email?: string | null;
  size: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

export default function UserAvatar({
  picture,
  googlePicture,
  name,
  email,
  size,
  alt = "",
  className,
  style,
}: UserAvatarProps) {
  const sources = [...new Set([picture, googlePicture].filter((source): source is string =>
    typeof source === "string" && /^(https?:\/\/|data:image\/|\/)/i.test(source),
  ))];
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => setSourceIndex(0), [picture, googlePicture]);

  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flex: "0 0 auto",
    ...style,
  };
  const source = sources[sourceIndex];
  if (source) {
    return <img src={source} alt={alt} className={className} style={baseStyle} onError={() => setSourceIndex((index) => index + 1)} />;
  }

  const initial = name?.trim().charAt(0) || email?.trim().charAt(0) || "U";
  return (
    <span
      className={className}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        ...baseStyle,
        display: "grid",
        placeItems: "center",
        background: "#e5e5e5",
        color: "#333",
        fontSize: Math.max(12, size * 0.42),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {initial.toLocaleUpperCase()}
    </span>
  );
}

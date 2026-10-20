/** Shared PickMe3D mark used by the landing page and the design editor. */
export function Logo({ size = 32, color }: { size?: number; color: string }) {
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 40 44"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path
        d="M20 1 38 11.5 20 22 2 11.5 20 1ZM2 15l16 9.5V43L2 33V15ZM22 24.5 38 15v18L22 43V24.5Z"
        fill={color}
      />
    </svg>
  );
}

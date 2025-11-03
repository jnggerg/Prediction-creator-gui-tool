export default function PartnerBadge({ size = 16, color = "#9146FF" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-label="Twitch Partner Badge"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        fill={color}
        d="M12.5 3.5L8 2 3.5 3.5 2 8l1.5 4.5L8 14l4.5-1.5L14 8l-1.5-4.5zM7 11l4.5-4.5L10 5 7 8 5.5 6.5 4 8l3 3z"
      />
    </svg>
  );
}

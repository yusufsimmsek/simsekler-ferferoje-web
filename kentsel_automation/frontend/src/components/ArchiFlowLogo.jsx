export function ArchiFlowLogo({ className = "h-6 w-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="50,12 85,31 50,50 15,31" />
      <path d="M 15,31 L 15,69 L 41,84 L 41,64 A 9,9 0 0,1 59,64 L 59,84 L 85,69 L 85,31" />
      <path d="M 41,64 L 50,50 L 59,64" />
    </svg>
  );
}

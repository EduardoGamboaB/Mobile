import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="G3 Logistics — inicio">
      <svg
        className="brand__mark"
        viewBox="0 0 200 140"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <mask id="brandMarkLines">
            <rect width="200" height="140" fill="white" />
            <g transform="rotate(-12 100 70)">
              <rect x="-30" y="32" width="260" height="7" fill="black" />
              <rect x="-30" y="64" width="260" height="7" fill="black" />
              <rect x="-30" y="96" width="260" height="7" fill="black" />
            </g>
          </mask>
        </defs>
        <text
          x="100"
          y="118"
          fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, sans-serif"
          fontSize="140"
          fontWeight={900}
          fontStyle="italic"
          fill="currentColor"
          textAnchor="middle"
          letterSpacing="-7"
          mask="url(#brandMarkLines)"
        >
          G3
        </text>
      </svg>
      <span className="brand__wordmark">
        <span className="brand__name">LOGISTICS</span>
      </span>
    </Link>
  );
}

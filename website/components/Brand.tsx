import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="G3 Logistics — inicio">
      <span className="brand__mark">G3</span>
      <span>G3 Logistics</span>
    </Link>
  );
}

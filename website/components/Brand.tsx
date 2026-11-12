import Link from 'next/link';

// Logotipo oficial en negativo (Brand Kit v2): el header y el footer van
// sobre Azul G3 Oscuro. Se sirve el SVG tal cual — nunca recomponerlo.
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="G3 Logistics — inicio">
      <img
        className="brand__logo--full"
        src="/brand/g3-logistics-negativo.svg"
        alt="G3 Logistics"
        width={150}
        height={76}
      />
    </Link>
  );
}

interface BarcodeProps {
  code: string;
}

/**
 * Purely decorative — turns a short code's characters into a deterministic
 * bar pattern (same code always renders the same barcode). Reinforces the
 * "dispatch ticket" metaphor without needing any external image/library.
 */
export function Barcode({ code }: BarcodeProps) {
  const bars = code.split('').map((char, i) => {
    const charCode = char.charCodeAt(0);
    // Alternate width and opacity based on character value, so the
    // pattern actually varies rather than looking like flat stripes.
    const widthFlex = 1 + (charCode % 3);
    const opacity = 0.4 + ((charCode % 6) / 6) * 0.6;
    return (
      <span
        key={i}
        className="barcode-bar"
        style={{ flexGrow: widthFlex, opacity }}
      />
    );
  });

  return (
    <div className="barcode" aria-hidden="true">
      {bars}
    </div>
  );
}
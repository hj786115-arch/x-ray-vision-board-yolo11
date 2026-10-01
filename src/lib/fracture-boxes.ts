import type { Finding } from "./types";

/** Keep all valid localizations, and never use a hardware box as a fracture box. */
export function selectBoxFindings(findings: Finding[], scanType: string): Finding[] {
  if (scanType !== "fracture") {
    // Preserve the original single-box behavior for the other scan types.
    const localized = findings.filter((finding) => finding.bbox);
    return localized.length
      ? [localized.reduce((best, finding) => finding.confidence > best.confidence ? finding : best)]
      : [];
  }
  return findings.filter((finding) => {
    const box = finding.bbox;
    if (!box || ![box.x, box.y, box.w, box.h].every(Number.isFinite)) return false;
    if (box.x < 0 || box.y < 0 || box.w <= 0 || box.h <= 0) return false;
    if (box.x + box.w > 100.001 || box.y + box.h > 100.001) return false;
    const name = finding.name.toLowerCase();
    return name.includes("fracture") && !/(no fracture|not fracture|healed|prior|old finding)/.test(name);
  });
}

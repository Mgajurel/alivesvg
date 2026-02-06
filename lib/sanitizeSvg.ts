import DOMPurify from "dompurify";

export function sanitizeSvg(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    ADD_ATTR: [
      "xmlns",
      "xmlns:xlink",
      "viewBox",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "d",
      "cx",
      "cy",
      "r",
      "rx",
      "ry",
      "x",
      "y",
      "x1",
      "x2",
      "y1",
      "y2",
      "width",
      "height",
      "transform",
      "opacity",
      "data-alivesvg-id",
      "data-alivesvg-animate",
      "data-alivesvg-selected",
    ],
  });
}

type SvgAnnotationResult = {
    annotatedSvg: string;
    partIds: string[];
    autoSelectedIds: string[];
};

const TARGETABLE_TAGS = [
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "ellipse",
];

function canParseSvg(): boolean {
    return typeof window !== "undefined" && typeof DOMParser !== "undefined";
}

function parseSvg(svg: string): Document | null {
    if (!canParseSvg()) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;
    return doc;
}

export function annotateSvgContent(svg: string): SvgAnnotationResult {
    const doc = parseSvg(svg);
    if (!doc) {
        return { annotatedSvg: svg, partIds: [], autoSelectedIds: [] };
    }

    const elements = Array.from(doc.querySelectorAll(TARGETABLE_TAGS.join(",")));
    const partIds: string[] = [];
    const autoSelectedIds: string[] = [];

    elements.forEach((element, index) => {
        const existingId = element.getAttribute("data-alivesvg-id");
        const partId = existingId ?? `alivesvg-${index + 1}`;

        element.setAttribute("data-alivesvg-id", partId);
        partIds.push(partId);

        if (element.getAttribute("data-part") || element.getAttribute("id")) {
            autoSelectedIds.push(partId);
        }
    });

    const serialized = new XMLSerializer().serializeToString(doc.documentElement);
    return { annotatedSvg: serialized, partIds, autoSelectedIds };
}

export function applySelection(
    svg: string,
    selectedIds: string[],
    options: { highlight?: boolean } = {},
): string {
    const doc = parseSvg(svg);
    if (!doc) return svg;

    const highlight = options.highlight ?? true;
    const selectedSet = new Set(selectedIds);
    const elements = Array.from(doc.querySelectorAll("[data-alivesvg-id]"));

    elements.forEach((element) => {
        const partId = element.getAttribute("data-alivesvg-id");
        if (!partId) return;

        if (selectedSet.has(partId)) {
            element.setAttribute("data-alivesvg-animate", "true");
            if (highlight) {
                element.setAttribute("data-alivesvg-selected", "true");
            } else {
                element.removeAttribute("data-alivesvg-selected");
            }
        } else {
            element.removeAttribute("data-alivesvg-animate");
            element.removeAttribute("data-alivesvg-selected");
        }
    });

    return new XMLSerializer().serializeToString(doc.documentElement);
}

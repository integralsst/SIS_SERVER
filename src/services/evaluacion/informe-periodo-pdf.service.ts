import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { servicioInformesPeriodo } from "./informes-periodo.service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type PdfFont = "regular" | "bold";
type PdfColor = readonly [number, number, number];
type UnknownRecord = Record<string, unknown>;

const COLORS = {
  ink: [0.09, 0.13, 0.2] as PdfColor,
  muted: [0.38, 0.43, 0.5] as PdfColor,
  line: [0.84, 0.87, 0.9] as PdfColor,
  surface: [0.96, 0.97, 0.98] as PdfColor,
  white: [1, 1, 1] as PdfColor,
  cyan: [0.02, 0.55, 0.68] as PdfColor,
  cyanSoft: [0.9, 0.97, 0.98] as PdfColor,
  green: [0.08, 0.52, 0.32] as PdfColor,
  amber: [0.72, 0.43, 0.04] as PdfColor,
  red: [0.72, 0.16, 0.16] as PdfColor,
} as const;

interface TextOptions {
  font?: PdfFont;
  fontSize?: number;
  color?: PdfColor;
  lineHeight?: number;
  width?: number;
}

interface TableColumn<Row> {
  header: string;
  width: number;
  value: (row: Row) => string;
}

interface SnapshotInformePdf {
  resultado?: unknown;
}

interface ResultadoInformePdf {
  empresa?: unknown;
  periodo?: unknown;
  resumenEmpresa?: unknown;
  procesos?: unknown;
  estandares?: unknown;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function formatNumber(value: unknown, decimals = 2): string {
  const number = asNumber(value, Number.NaN);
  return Number.isFinite(number) ? number.toFixed(decimals) : "-";
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\u0000-\u00ff]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string): string {
  return normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfString(value: string): string {
  return `(${escapePdfText(value)})`;
}

function formatPdfNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function rgb(color: PdfColor, stroke = false): string {
  const operator = stroke ? "RG" : "rg";
  return `${formatPdfNumber(color[0])} ${formatPdfNumber(color[1])} ${formatPdfNumber(color[2])} ${operator}`;
}

function slugFileName(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug || "EMPRESA";
}

class SimplePdfDocument {
  private readonly pages: string[][] = [[]];
  private pageIndex = 0;
  private cursorTop = MARGIN_TOP;

  private get commands(): string[] {
    return this.pages[this.pageIndex];
  }

  get top(): number {
    return this.cursorTop;
  }

  set top(value: number) {
    this.cursorTop = value;
  }

  addPage(): void {
    this.pages.push([]);
    this.pageIndex = this.pages.length - 1;
    this.cursorTop = MARGIN_TOP;
  }

  ensureSpace(height: number): void {
    if (this.cursorTop + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.addPage();
    }
  }

  moveDown(value: number): void {
    this.cursorTop += value;
  }

  rect(
    x: number,
    top: number,
    width: number,
    height: number,
    fill?: PdfColor,
    stroke?: PdfColor,
    lineWidth = 1
  ): void {
    const y = PAGE_HEIGHT - top - height;

    if (fill) {
      this.commands.push(
        `${rgb(fill)} ${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re f`
      );
    }

    if (stroke) {
      this.commands.push(
        `${rgb(stroke, true)} ${formatPdfNumber(lineWidth)} w ${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(width)} ${formatPdfNumber(height)} re S`
      );
    }
  }

  line(
    x1: number,
    top1: number,
    x2: number,
    top2: number,
    color: PdfColor = COLORS.line,
    lineWidth = 1
  ): void {
    this.commands.push(
      `${rgb(color, true)} ${formatPdfNumber(lineWidth)} w ${formatPdfNumber(x1)} ${formatPdfNumber(PAGE_HEIGHT - top1)} m ${formatPdfNumber(x2)} ${formatPdfNumber(PAGE_HEIGHT - top2)} l S`
    );
  }

  private measureText(
    value: string,
    fontSize: number,
    font: PdfFont
  ): number {
    const factor = font === "bold" ? 0.55 : 0.5;
    return normalizePdfText(value).length * fontSize * factor;
  }

  wrapText(
    value: string,
    width: number,
    fontSize: number,
    font: PdfFont
  ): string[] {
    const normalized = normalizePdfText(value);

    if (!normalized) {
      return [""];
    }

    const words = normalized.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (this.measureText(candidate, fontSize, font) <= width) {
        line = candidate;
        continue;
      }

      if (line) {
        lines.push(line);
      }

      if (this.measureText(word, fontSize, font) <= width) {
        line = word;
        continue;
      }

      let fragment = "";
      for (const character of word) {
        const candidateFragment = `${fragment}${character}`;
        if (
          fragment &&
          this.measureText(candidateFragment, fontSize, font) > width
        ) {
          lines.push(fragment);
          fragment = character;
        } else {
          fragment = candidateFragment;
        }
      }
      line = fragment;
    }

    if (line) {
      lines.push(line);
    }

    return lines.length ? lines : [""];
  }

  textAt(
    value: string,
    x: number,
    top: number,
    options: TextOptions = {}
  ): number {
    const font = options.font ?? "regular";
    const fontSize = options.fontSize ?? 10;
    const color = options.color ?? COLORS.ink;
    const lineHeight = options.lineHeight ?? fontSize * 1.3;
    const width = options.width ?? CONTENT_WIDTH;
    const lines = this.wrapText(value, width, fontSize, font);
    const fontResource = font === "bold" ? "F2" : "F1";

    lines.forEach((line, index) => {
      const baseline = PAGE_HEIGHT - top - fontSize - index * lineHeight;
      this.commands.push(
        `BT /${fontResource} ${formatPdfNumber(fontSize)} Tf ${rgb(color)} 1 0 0 1 ${formatPdfNumber(x)} ${formatPdfNumber(baseline)} Tm ${pdfString(line)} Tj ET`
      );
    });

    return lines.length * lineHeight;
  }

  paragraph(
    value: string,
    options: TextOptions & { gapAfter?: number } = {}
  ): void {
    const font = options.font ?? "regular";
    const fontSize = options.fontSize ?? 10;
    const lineHeight = options.lineHeight ?? fontSize * 1.35;
    const width = options.width ?? CONTENT_WIDTH;
    const lines = this.wrapText(value, width, fontSize, font);
    const height = lines.length * lineHeight;

    this.ensureSpace(height + (options.gapAfter ?? 0));
    this.textAt(value, MARGIN_X, this.cursorTop, {
      ...options,
      width,
      lineHeight,
    });
    this.cursorTop += height + (options.gapAfter ?? 0);
  }

  sectionTitle(title: string): void {
    this.ensureSpace(34);
    this.moveDown(4);
    this.rect(
      MARGIN_X,
      this.cursorTop,
      4,
      20,
      COLORS.cyan
    );
    this.textAt(title, MARGIN_X + 12, this.cursorTop + 1, {
      font: "bold",
      fontSize: 12,
      color: COLORS.ink,
      width: CONTENT_WIDTH - 12,
    });
    this.cursorTop += 30;
  }

  metricCards(
    metrics: Array<{ label: string; value: string; note?: string }>
  ): void {
    const gap = 10;
    const width = (CONTENT_WIDTH - gap * (metrics.length - 1)) / metrics.length;
    const height = 68;

    this.ensureSpace(height + 8);

    metrics.forEach((metric, index) => {
      const x = MARGIN_X + index * (width + gap);
      this.rect(x, this.cursorTop, width, height, COLORS.surface, COLORS.line);
      this.textAt(metric.label.toUpperCase(), x + 10, this.cursorTop + 10, {
        font: "bold",
        fontSize: 7.5,
        color: COLORS.muted,
        width: width - 20,
      });
      this.textAt(metric.value, x + 10, this.cursorTop + 27, {
        font: "bold",
        fontSize: 15,
        color: COLORS.ink,
        width: width - 20,
      });

      if (metric.note) {
        this.textAt(metric.note, x + 10, this.cursorTop + 49, {
          fontSize: 7.5,
          color: COLORS.muted,
          width: width - 20,
        });
      }
    });

    this.cursorTop += height + 12;
  }

  table<Row>(
    columns: Array<TableColumn<Row>>,
    rows: Row[]
  ): void {
    const fontSize = 7.5;
    const lineHeight = 9.3;
    const paddingX = 5;
    const paddingY = 5;
    const headerHeight = 24;

    const renderHeader = (): void => {
      this.ensureSpace(headerHeight + 24);
      let x = MARGIN_X;
      this.rect(
        MARGIN_X,
        this.cursorTop,
        CONTENT_WIDTH,
        headerHeight,
        COLORS.ink
      );

      columns.forEach((column) => {
        this.textAt(column.header, x + paddingX, this.cursorTop + 6, {
          font: "bold",
          fontSize: 7.2,
          color: COLORS.white,
          width: column.width - paddingX * 2,
          lineHeight: 8.5,
        });
        x += column.width;
      });

      this.cursorTop += headerHeight;
    };

    renderHeader();

    rows.forEach((row, rowIndex) => {
      const cells = columns.map((column) => {
        const value = column.value(row);
        const lines = this.wrapText(
          value,
          column.width - paddingX * 2,
          fontSize,
          "regular"
        );
        return { value, lines };
      });
      const rowHeight = Math.max(
        23,
        ...cells.map((cell) => cell.lines.length * lineHeight + paddingY * 2)
      );

      if (this.cursorTop + rowHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
        this.addPage();
        renderHeader();
      }

      if (rowIndex % 2 === 1) {
        this.rect(
          MARGIN_X,
          this.cursorTop,
          CONTENT_WIDTH,
          rowHeight,
          COLORS.surface
        );
      }

      this.rect(
        MARGIN_X,
        this.cursorTop,
        CONTENT_WIDTH,
        rowHeight,
        undefined,
        COLORS.line,
        0.5
      );

      let x = MARGIN_X;
      columns.forEach((column, columnIndex) => {
        if (columnIndex > 0) {
          this.line(
            x,
            this.cursorTop,
            x,
            this.cursorTop + rowHeight,
            COLORS.line,
            0.5
          );
        }

        this.textAt(cells[columnIndex].value, x + paddingX, this.cursorTop + paddingY, {
          fontSize,
          color: COLORS.ink,
          width: column.width - paddingX * 2,
          lineHeight,
        });
        x += column.width;
      });

      this.cursorTop += rowHeight;
    });

    this.cursorTop += 8;
  }

  private addFooters(): void {
    const total = this.pages.length;

    this.pages.forEach((commands, index) => {
      const top = PAGE_HEIGHT - 30;
      commands.push(
        `${rgb(COLORS.line, true)} 0.6 w ${formatPdfNumber(MARGIN_X)} ${formatPdfNumber(PAGE_HEIGHT - top)} m ${formatPdfNumber(PAGE_WIDTH - MARGIN_X)} ${formatPdfNumber(PAGE_HEIGHT - top)} l S`
      );
      commands.push(
        `BT /F1 7.5 Tf ${rgb(COLORS.muted)} 1 0 0 1 ${formatPdfNumber(MARGIN_X)} 18 Tm ${pdfString("Stack44 - Informe SG-SST generado desde una versión inmutable")} Tj ET`
      );
      commands.push(
        `BT /F1 7.5 Tf ${rgb(COLORS.muted)} 1 0 0 1 ${formatPdfNumber(PAGE_WIDTH - MARGIN_X - 55)} 18 Tm ${pdfString(`Página ${index + 1} de ${total}`)} Tj ET`
      );
    });
  }

  toBuffer(title: string): Buffer {
    this.addFooters();

    const pageCount = this.pages.length;
    const pageObjectIds = this.pages.map((_, index) => 5 + index * 2);
    const contentObjectIds = this.pages.map((_, index) => 6 + index * 2);
    const infoObjectId = 5 + pageCount * 2;
    const objectBodies = new Map<number, Buffer>();

    objectBodies.set(
      1,
      Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1")
    );
    objectBodies.set(
      2,
      Buffer.from(
        `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjectIds
          .map((id) => `${id} 0 R`)
          .join(" ")}] >>`,
        "latin1"
      )
    );
    objectBodies.set(
      3,
      Buffer.from(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        "latin1"
      )
    );
    objectBodies.set(
      4,
      Buffer.from(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        "latin1"
      )
    );

    this.pages.forEach((commands, index) => {
      const content = Buffer.from(commands.join("\n"), "latin1");
      objectBodies.set(
        pageObjectIds[index],
        Buffer.from(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(PAGE_WIDTH)} ${formatPdfNumber(PAGE_HEIGHT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`,
          "latin1"
        )
      );
      objectBodies.set(
        contentObjectIds[index],
        Buffer.concat([
          Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "latin1"),
          content,
          Buffer.from("\nendstream", "latin1"),
        ])
      );
    });

    objectBodies.set(
      infoObjectId,
      Buffer.from(
        `<< /Title ${pdfString(title)} /Author ${pdfString("Stack44")} /Creator ${pdfString("Stack44 SG-SST")} >>`,
        "latin1"
      )
    );

    const header = Buffer.concat([
      Buffer.from("%PDF-1.4\n%", "latin1"),
      Buffer.from([0xe2, 0xe3, 0xcf, 0xd3]),
      Buffer.from("\n", "latin1"),
    ]);
    const parts: Buffer[] = [header];
    const offsets: number[] = [0];
    let currentOffset = header.length;

    for (let id = 1; id <= infoObjectId; id += 1) {
      const body = objectBodies.get(id);
      if (!body) {
        throw new Error(`No fue posible construir el objeto PDF ${id}.`);
      }

      offsets[id] = currentOffset;
      const object = Buffer.concat([
        Buffer.from(`${id} 0 obj\n`, "latin1"),
        body,
        Buffer.from("\nendobj\n", "latin1"),
      ]);
      parts.push(object);
      currentOffset += object.length;
    }

    const xrefOffset = currentOffset;
    const xrefRows = [
      `xref\n0 ${infoObjectId + 1}\n`,
      "0000000000 65535 f \n",
      ...offsets.slice(1).map(
        (offset) => `${String(offset).padStart(10, "0")} 00000 n \n`
      ),
    ];
    const trailer =
      `trailer\n<< /Size ${infoObjectId + 1} /Root 1 0 R /Info ${infoObjectId} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    parts.push(Buffer.from(xrefRows.join(""), "latin1"));
    parts.push(Buffer.from(trailer, "latin1"));

    return Buffer.concat(parts);
  }
}

function labelGrupo(value: unknown): string {
  switch (value) {
    case "ESTANDARES_7":
      return "7 estándares";
    case "ESTANDARES_21":
      return "21 estándares";
    case "ESTANDARES_60":
      return "60 estándares";
    default:
      return "Todos los estándares";
  }
}

function labelCategorias(value: unknown): string {
  const labels: Record<string, string> = {
    DOCUMENTAL: "Gestión documental",
    INTERVENCION: "Gestión de intervención",
    EMERGENCIAS: "Gestión de emergencias",
  };
  const categories = asArray(value)
    .map((item) => (typeof item === "string" ? labels[item] ?? item : ""))
    .filter(Boolean);

  return categories.length ? categories.join(", ") : "Todas las categorías";
}

function ministerialStatus(value: unknown): string {
  switch (value) {
    case "CUMPLE":
      return "Cumple";
    case "NO_CUMPLE":
      return "No cumple";
    default:
      return "Sin evaluar";
  }
}

function buildInformePdf(
  detalle: Awaited<ReturnType<typeof servicioInformesPeriodo.obtenerDetalle>>
): { buffer: Buffer; filename: string } {
  const snapshot = detalle.snapshot as SnapshotInformePdf;
  const resultado = asRecord(snapshot.resultado) as ResultadoInformePdf;
  const empresa = asRecord(resultado.empresa);
  const periodo = asRecord(resultado.periodo);
  const resumen = asRecord(resultado.resumenEmpresa);
  const estados = asRecord(resumen.estados);
  const procesos = asArray(resultado.procesos).map(asRecord);
  const estandares = asArray(resultado.estandares).map(asRecord);
  const versionSupermatriz = asRecord(periodo.versionSupermatriz);
  const empresaNombre = asString(empresa.nombre, "Empresa");
  const empresaNit = asString(empresa.nit, "Sin NIT");
  const document = new SimplePdfDocument();

  document.rect(
    MARGIN_X,
    document.top,
    CONTENT_WIDTH,
    104,
    COLORS.cyanSoft,
    COLORS.line
  );
  document.textAt("INFORME DE RESULTADOS DEL SG-SST", MARGIN_X + 16, document.top + 14, {
    font: "bold",
    fontSize: 16,
    color: COLORS.ink,
    width: CONTENT_WIDTH - 32,
  });
  document.textAt(empresaNombre, MARGIN_X + 16, document.top + 42, {
    font: "bold",
    fontSize: 12,
    color: COLORS.cyan,
    width: CONTENT_WIDTH - 32,
  });
  document.textAt(`NIT: ${empresaNit}`, MARGIN_X + 16, document.top + 62, {
    fontSize: 9,
    color: COLORS.muted,
    width: CONTENT_WIDTH - 32,
  });
  document.textAt(
    `Periodo: enero a diciembre de ${detalle.anio}   |   Versión: ${detalle.numeroVersion}   |   Corte: ${formatDate(detalle.fechaCorte)}`,
    MARGIN_X + 16,
    document.top + 79,
    {
      fontSize: 8.5,
      color: COLORS.ink,
      width: CONTENT_WIDTH - 32,
    }
  );
  document.top += 120;

  document.sectionTitle("Identificación y trazabilidad");
  document.paragraph(`Título: ${detalle.titulo}`, {
    font: "bold",
    fontSize: 10,
    gapAfter: 4,
  });
  document.paragraph(
    `Grupo: ${labelGrupo(detalle.grupo)}. Categorías: ${labelCategorias(detalle.categoriasGestion)}.`,
    { fontSize: 9, color: COLORS.muted, gapAfter: 3 }
  );
  document.paragraph(
    `Generado por: ${detalle.generadoPor.nombre} (${detalle.generadoPor.correo}). Supermatriz: ${asString(versionSupermatriz.nombre, "No registrada")}.`,
    { fontSize: 9, color: COLORS.muted, gapAfter: 3 }
  );
  document.paragraph(
    `Fuente: ${detalle.totalGestionesFuente} gestiones y ${detalle.totalEvaluacionesFuente} aspectos evaluados. Registros históricos posteriores al año: ${detalle.registrosHistoricosPosteriores}. Última actualización de la fuente: ${formatDate(detalle.ultimaActualizacionFuente)}.`,
    { fontSize: 9, color: COLORS.muted, gapAfter: 4 }
  );

  if (detalle.motivoVersion) {
    document.paragraph(`Motivo de la versión: ${detalle.motivoVersion}`, {
      fontSize: 9,
      color: COLORS.ink,
      gapAfter: 3,
    });
  }

  document.paragraph(
    "Este documento se genera desde la fotografía inmutable almacenada para esta versión. Las actualizaciones posteriores del periodo no alteran este PDF.",
    { fontSize: 8.5, color: COLORS.cyan, gapAfter: 8 }
  );

  document.sectionTitle("Resumen general");
  document.metricCards([
    {
      label: "Cumplimiento administrativo",
      value: formatNumber(resumen.cumplimientoAdministrativo),
      note: "Escala de 0 a 5",
    },
    {
      label: "Calificación ministerial",
      value: `${formatNumber(resumen.calificacionMinisterial)}/${formatNumber(
        resumen.calificacionMinisterialMaxima
      )}`,
      note: "Regla binaria por estándar",
    },
    {
      label: "Cobertura",
      value: `${formatNumber(resumen.coberturaPorcentaje, 0)}%`,
      note: `${asNumber(resumen.evaluados)}/${asNumber(resumen.totalAspectos)} aspectos`,
    },
  ]);

  document.paragraph(
    `Estados de los aspectos: ${asNumber(estados.cumplidos)} cumplidos, ${asNumber(
      estados.parciales
    )} parciales, ${asNumber(estados.noCumplidos)} no cumplidos, ${asNumber(
      estados.noAplica
    )} no aplica y ${asNumber(estados.sinEvaluar)} sin evaluar.`,
    { fontSize: 9, color: COLORS.muted, gapAfter: 6 }
  );
  document.paragraph(
    `Estándares: ${asNumber(resumen.estandaresCumplidos)} cumplidos, ${asNumber(
      resumen.estandaresNoCumplidos
    )} no cumplidos y ${asNumber(resumen.estandaresSinEvaluar)} sin evaluar.`,
    { fontSize: 9, color: COLORS.muted, gapAfter: 8 }
  );

  document.sectionTitle("Resultados por proceso");

  if (procesos.length) {
    document.table(
      [
        {
          header: "Proceso",
          width: 260,
          value: (row) => asString(row.nombre, "Sin nombre"),
        },
        {
          header: "Evaluados",
          width: 78,
          value: (row) => `${asNumber(row.evaluados)}/${asNumber(row.totalAspectos)}`,
        },
        {
          header: "Administrativo",
          width: 82,
          value: (row) => formatNumber(row.cumplimientoAdministrativo),
        },
        {
          header: "Cobertura",
          width: 87,
          value: (row) => `${formatNumber(row.coberturaPorcentaje, 0)}%`,
        },
      ],
      procesos
    );
  } else {
    document.paragraph("Esta versión no contiene resultados por proceso.", {
      fontSize: 9,
      color: COLORS.muted,
      gapAfter: 8,
    });
  }

  document.sectionTitle("Resultados por estándar");

  if (estandares.length) {
    document.table(
      [
        {
          header: "Código",
          width: 48,
          value: (row) => asString(row.codigo, "-"),
        },
        {
          header: "Estándar",
          width: 222,
          value: (row) => asString(row.nombre, "Sin nombre"),
        },
        {
          header: "PHVA",
          width: 54,
          value: (row) => asString(asRecord(row.cicloPhva).codigo, "-"),
        },
        {
          header: "Evaluados",
          width: 58,
          value: (row) => `${asNumber(row.evaluados)}/${asNumber(row.totalAspectos)}`,
        },
        {
          header: "Admin.",
          width: 50,
          value: (row) => formatNumber(row.cumplimientoAdministrativo),
        },
        {
          header: "Ministerial",
          width: 75,
          value: (row) =>
            `${ministerialStatus(row.estadoMinisterial)} ${formatNumber(
              row.calificacionMinisterialObtenida
            )}/${formatNumber(row.calificacionMinisterialEsperada)}`,
        },
      ],
      estandares
    );
  } else {
    document.paragraph("Esta versión no contiene resultados por estándar.", {
      fontSize: 9,
      color: COLORS.muted,
      gapAfter: 8,
    });
  }

  document.ensureSpace(42);
  document.moveDown(8);
  document.line(MARGIN_X, document.top, PAGE_WIDTH - MARGIN_X, document.top);
  document.moveDown(10);
  document.paragraph(
    "Nota: los procesos presentan cumplimiento administrativo y cobertura. La calificación ministerial se calcula únicamente por estándar y para el consolidado de empresa.",
    { fontSize: 8.2, color: COLORS.muted }
  );

  const title = `${detalle.titulo} - ${empresaNombre}`;
  const filename = `Informe_SGSST_${slugFileName(empresaNombre)}_${detalle.anio}_V${detalle.numeroVersion}.pdf`;

  return {
    buffer: document.toBuffer(title),
    filename,
  };
}

export const servicioPdfInformePeriodo = {
  generar: async (
    informeId: string,
    usuario: UsuarioSesionEvaluacion
  ): Promise<{ buffer: Buffer; filename: string }> => {
    const detalle = await servicioInformesPeriodo.obtenerDetalle(
      informeId,
      usuario
    );

    return buildInformePdf(detalle);
  },
};

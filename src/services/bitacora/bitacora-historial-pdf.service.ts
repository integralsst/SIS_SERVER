import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  listarHistorialBitacoraUnificado,
  type RegistroHistorialBitacoraUnificado,
} from "./bitacora-historial-unificado.service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 44;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

type PdfFont = "regular" | "bold";
type PdfColor = readonly [number, number, number];

const COLORS = {
  ink: [0.09, 0.13, 0.2] as PdfColor,
  muted: [0.38, 0.43, 0.5] as PdfColor,
  line: [0.84, 0.87, 0.9] as PdfColor,
  surface: [0.96, 0.97, 0.98] as PdfColor,
  cyan: [0.02, 0.55, 0.68] as PdfColor,
  green: [0.08, 0.52, 0.32] as PdfColor,
} as const;

function normalizarPdfTexto(value: string): string {
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

function escaparPdfTexto(value: string): string {
  return normalizarPdfTexto(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfString(value: string): string {
  return `(${escaparPdfTexto(value)})`;
}

function numeroPdf(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function rgb(color: PdfColor, stroke = false): string {
  const operator = stroke ? "RG" : "rg";
  return `${numeroPdf(color[0])} ${numeroPdf(color[1])} ${numeroPdf(color[2])} ${operator}`;
}

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "EMPRESA"
  );
}

function fechaLegible(value: string): string {
  const [anio, mes, dia] = value.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : value;
}

function estadoLegible(value: string): string {
  const labels: Record<string, string> = {
    CUMPLIDO: "Cumplido",
    PARCIAL: "Parcial",
    NO_CUMPLIDO: "No cumplido",
    NO_APLICA: "No aplica",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

class PdfSimple {
  private readonly pages: string[][] = [[]];
  private pageIndex = 0;
  private cursorTop = MARGIN_TOP;

  private get commands(): string[] {
    return this.pages[this.pageIndex];
  }

  private medir(value: string, fontSize: number, font: PdfFont): number {
    return normalizarPdfTexto(value).length * fontSize * (font === "bold" ? 0.55 : 0.5);
  }

  private envolver(
    value: string,
    width: number,
    fontSize: number,
    font: PdfFont
  ): string[] {
    const normalized = normalizarPdfTexto(value);
    if (!normalized) return [""];

    const words = normalized.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.medir(candidate, fontSize, font) <= width) {
        line = candidate;
        continue;
      }

      if (line) lines.push(line);

      if (this.medir(word, fontSize, font) <= width) {
        line = word;
        continue;
      }

      let fragment = "";
      for (const char of word) {
        const candidateFragment = `${fragment}${char}`;
        if (
          fragment &&
          this.medir(candidateFragment, fontSize, font) > width
        ) {
          lines.push(fragment);
          fragment = char;
        } else {
          fragment = candidateFragment;
        }
      }
      line = fragment;
    }

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  private nuevaPagina(): void {
    this.pages.push([]);
    this.pageIndex = this.pages.length - 1;
    this.cursorTop = MARGIN_TOP;
  }

  private asegurarEspacio(height: number): void {
    if (this.cursorTop + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.nuevaPagina();
    }
  }

  private textoEn(
    value: string,
    x: number,
    top: number,
    options: {
      font?: PdfFont;
      fontSize?: number;
      color?: PdfColor;
      width?: number;
      lineHeight?: number;
    } = {}
  ): number {
    const font = options.font ?? "regular";
    const fontSize = options.fontSize ?? 10;
    const color = options.color ?? COLORS.ink;
    const width = options.width ?? CONTENT_WIDTH;
    const lineHeight = options.lineHeight ?? fontSize * 1.35;
    const lines = this.envolver(value, width, fontSize, font);
    const resource = font === "bold" ? "F2" : "F1";

    lines.forEach((line, index) => {
      const baseline = PAGE_HEIGHT - top - fontSize - index * lineHeight;
      this.commands.push(
        `BT /${resource} ${numeroPdf(fontSize)} Tf ${rgb(color)} 1 0 0 1 ${numeroPdf(x)} ${numeroPdf(baseline)} Tm ${pdfString(line)} Tj ET`
      );
    });

    return lines.length * lineHeight;
  }

  paragraph(
    value: string,
    options: {
      font?: PdfFont;
      fontSize?: number;
      color?: PdfColor;
      width?: number;
      lineHeight?: number;
      gapAfter?: number;
      indent?: number;
    } = {}
  ): void {
    const font = options.font ?? "regular";
    const fontSize = options.fontSize ?? 10;
    const width = options.width ?? CONTENT_WIDTH;
    const lineHeight = options.lineHeight ?? fontSize * 1.35;
    const indent = options.indent ?? 0;
    const lines = this.envolver(value, width - indent, fontSize, font);
    const height = lines.length * lineHeight;

    this.asegurarEspacio(height + (options.gapAfter ?? 0));
    this.textoEn(value, MARGIN_X + indent, this.cursorTop, {
      ...options,
      width: width - indent,
      lineHeight,
    });
    this.cursorTop += height + (options.gapAfter ?? 0);
  }

  divider(): void {
    this.asegurarEspacio(12);
    const y = PAGE_HEIGHT - this.cursorTop;
    this.commands.push(
      `${rgb(COLORS.line, true)} 0.7 w ${numeroPdf(MARGIN_X)} ${numeroPdf(y)} m ${numeroPdf(PAGE_WIDTH - MARGIN_X)} ${numeroPdf(y)} l S`
    );
    this.cursorTop += 12;
  }

  registro(item: RegistroHistorialBitacoraUnificado): void {
    const estimated = 88;
    this.asegurarEspacio(estimated);

    this.paragraph(fechaLegible(item.fechaEfectiva), {
      font: "bold",
      fontSize: 11.5,
      color: COLORS.ink,
      gapAfter: 2,
    });
    this.paragraph(
      item.fuente === "BITACORA_IA"
        ? "Bitácora asistida"
        : "Evaluación manual de la Supermatriz",
      {
        font: "bold",
        fontSize: 8,
        color: item.fuente === "BITACORA_IA" ? COLORS.cyan : COLORS.green,
        gapAfter: 5,
      }
    );

    this.paragraph(item.contenidoOriginal || "Registro sin descripción.", {
      fontSize: 9.5,
      lineHeight: 13,
      gapAfter: 5,
    });

    if (item.resultado) {
      this.paragraph(
        `Resultado: ${estadoLegible(item.resultado.estadoCumplimiento)} · ${item.resultado.calificacionAdministrativa}`,
        {
          font: "bold",
          fontSize: 9,
          gapAfter: 4,
        }
      );
    }

    if (item.aspectos.length > 0) {
      this.paragraph(
        `Aspectos: ${item.aspectos
          .map(
            (aspecto) =>
              `${aspecto.codigo ?? aspecto.id} · ${aspecto.nombre}`
          )
          .join(" | ")}`,
        {
          fontSize: 8.5,
          color: COLORS.muted,
          gapAfter: 4,
        }
      );
    }

    if (item.evidenciasUrls.length > 0) {
      for (const url of item.evidenciasUrls) {
        this.paragraph(`Evidencia: ${url}`, {
          fontSize: 8.5,
          color: COLORS.cyan,
          gapAfter: 2,
        });
      }
    }

    this.paragraph(
      `Registrado por: ${item.autor?.nombre ?? "Usuario"}${item.tipoActividad ? ` · ${item.tipoActividad}` : ""}`,
      {
        fontSize: 8,
        color: COLORS.muted,
        gapAfter: 2,
      }
    );
    this.divider();
  }

  private agregarPies(): void {
    const total = this.pages.length;
    this.pages.forEach((commands, index) => {
      const y = 30;
      commands.push(
        `${rgb(COLORS.line, true)} 0.6 w ${numeroPdf(MARGIN_X)} ${numeroPdf(y)} m ${numeroPdf(PAGE_WIDTH - MARGIN_X)} ${numeroPdf(y)} l S`
      );
      commands.push(
        `BT /F1 7.5 Tf ${rgb(COLORS.muted)} 1 0 0 1 ${numeroPdf(MARGIN_X)} 18 Tm ${pdfString("Stack44 · Bitácora SG-SST")} Tj ET`
      );
      commands.push(
        `BT /F1 7.5 Tf ${rgb(COLORS.muted)} 1 0 0 1 ${numeroPdf(PAGE_WIDTH - MARGIN_X - 60)} 18 Tm ${pdfString(`Página ${index + 1} de ${total}`)} Tj ET`
      );
    });
  }

  toBuffer(title: string): Buffer {
    this.agregarPies();

    const pageCount = this.pages.length;
    const pageIds = this.pages.map((_, index) => 5 + index * 2);
    const contentIds = this.pages.map((_, index) => 6 + index * 2);
    const infoId = 5 + pageCount * 2;
    const objects = new Map<number, Buffer>();

    objects.set(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"));
    objects.set(
      2,
      Buffer.from(
        `<< /Type /Pages /Count ${pageCount} /Kids [${pageIds
          .map((id) => `${id} 0 R`)
          .join(" ")}] >>`,
        "latin1"
      )
    );
    objects.set(
      3,
      Buffer.from(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        "latin1"
      )
    );
    objects.set(
      4,
      Buffer.from(
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        "latin1"
      )
    );

    this.pages.forEach((commands, index) => {
      const content = Buffer.from(commands.join("\n"), "latin1");
      objects.set(
        pageIds[index],
        Buffer.from(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${numeroPdf(PAGE_WIDTH)} ${numeroPdf(PAGE_HEIGHT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentIds[index]} 0 R >>`,
          "latin1"
        )
      );
      objects.set(
        contentIds[index],
        Buffer.concat([
          Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "latin1"),
          content,
          Buffer.from("\nendstream", "latin1"),
        ])
      );
    });

    objects.set(
      infoId,
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
    let offset = header.length;

    for (let id = 1; id <= infoId; id += 1) {
      const body = objects.get(id);
      if (!body) throw new Error(`No fue posible construir el objeto PDF ${id}.`);

      offsets[id] = offset;
      const object = Buffer.concat([
        Buffer.from(`${id} 0 obj\n`, "latin1"),
        body,
        Buffer.from("\nendobj\n", "latin1"),
      ]);
      parts.push(object);
      offset += object.length;
    }

    const xrefOffset = offset;
    const xref = [
      `xref\n0 ${infoId + 1}\n`,
      "0000000000 65535 f \n",
      ...offsets.slice(1).map(
        (value) => `${String(value).padStart(10, "0")} 00000 n \n`
      ),
    ];
    const trailer =
      `trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`;

    parts.push(Buffer.from(xref.join(""), "latin1"));
    parts.push(Buffer.from(trailer, "latin1"));
    return Buffer.concat(parts);
  }
}

export async function generarPdfHistorialBitacora(
  empresaId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<{ buffer: Buffer; filename: string }> {
  const historial = await listarHistorialBitacoraUnificado(
    empresaId,
    usuario,
    { limite: null }
  );
  const pdf = new PdfSimple();

  pdf.paragraph("BITÁCORA SG-SST", {
    font: "bold",
    fontSize: 18,
    color: COLORS.ink,
    gapAfter: 6,
  });
  pdf.paragraph(historial.empresa.nombre, {
    font: "bold",
    fontSize: 13,
    color: COLORS.cyan,
    gapAfter: 5,
  });
  pdf.paragraph("Histórico de actividades, revisiones y hallazgos", {
    fontSize: 10,
    color: COLORS.muted,
    gapAfter: 16,
  });

  if (historial.registros.length === 0) {
    pdf.paragraph("La empresa todavía no tiene registros en la Bitácora SG-SST.", {
      fontSize: 10,
    });
  } else {
    historial.registros.forEach((registro) => pdf.registro(registro));
  }

  return {
    buffer: pdf.toBuffer(`Bitácora SG-SST · ${historial.empresa.nombre}`),
    filename: `BITACORA_SGSST_${slug(historial.empresa.nombre)}.pdf`,
  };
}

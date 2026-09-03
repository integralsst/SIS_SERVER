import type { CrearRegistroBitacoraInput } from "../../types/bitacora.types";

export class ErrorValidacionBitacora extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BITACORA_INVALIDA"
  ) {
    super(message);
    this.name = "ErrorValidacionBitacora";
  }
}

function convertirFechaEfectiva(value: string): Date {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorValidacionBitacora(
      "Debes indicar la fecha efectiva del registro."
    );
  }

  const normalizada = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizada);

  if (!match) {
    throw new ErrorValidacionBitacora(
      "La fecha efectiva debe enviarse en formato YYYY-MM-DD."
    );
  }

  const [, year, month, day] = match;
  const fecha = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0)
  );

  if (
    fecha.getUTCFullYear() !== Number(year) ||
    fecha.getUTCMonth() !== Number(month) - 1 ||
    fecha.getUTCDate() !== Number(day)
  ) {
    throw new ErrorValidacionBitacora(
      "La fecha efectiva indicada no es válida."
    );
  }

  const hoy = new Date();
  const hoyBogota = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(hoy);

  if (normalizada > hoyBogota) {
    throw new ErrorValidacionBitacora(
      "La fecha efectiva no puede estar en el futuro."
    );
  }

  return fecha;
}

export function validarCrearRegistroBitacora(
  input: CrearRegistroBitacoraInput
): {
  fechaEfectiva: Date;
  contenido: string;
  modalidad: CrearRegistroBitacoraInput["modalidad"];
  tipoActividad: string | null;
} {
  if (!input || typeof input !== "object") {
    throw new ErrorValidacionBitacora(
      "El cuerpo del registro de bitácora no es válido."
    );
  }

  const contenido = input.contenido?.trim();

  if (!contenido || contenido.length < 10) {
    throw new ErrorValidacionBitacora(
      "El registro de bitácora debe contener al menos 10 caracteres útiles."
    );
  }

  if (contenido.length > 20000) {
    throw new ErrorValidacionBitacora(
      "El registro de bitácora no puede superar 20.000 caracteres."
    );
  }

  const tipoActividad = input.tipoActividad?.trim() || null;

  if (tipoActividad && tipoActividad.length > 150) {
    throw new ErrorValidacionBitacora(
      "El tipo de actividad no puede superar 150 caracteres."
    );
  }

  return {
    fechaEfectiva: convertirFechaEfectiva(input.fechaEfectiva),
    contenido,
    modalidad: input.modalidad ?? null,
    tipoActividad,
  };
}

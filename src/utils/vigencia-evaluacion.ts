import {
  EstadoCumplimientoAspecto,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

export type EstadoVigenciaEvaluacion =
  | "SIN_REVISION"
  | "NO_APLICA"
  | "VIGENTE_PERMANENTE"
  | "FALTA_FECHA_DOCUMENTO"
  | "PERIODICIDAD_NO_CONFIGURADA"
  | "VIGENTE"
  | "POR_VENCER"
  | "VENCIDO";

export interface ConfiguracionVigenciaCalculable {
  tipoFechaBase: TipoFechaBaseVigencia;
  cantidad: number | null;
  unidad: UnidadPeriodicidad | null;
  diasAlertaPrevia: number;
  mesFechaFija: number | null;
  diaFechaFija: number | null;
}

export interface EvaluacionParaVigencia {
  estadoCumplimiento: EstadoCumplimientoAspecto;
  fechaDocumento: Date | null;
  fechaVencimientoCalculada: Date | null;
}

export interface ResultadoVigenciaEvaluacion {
  estado: EstadoVigenciaEvaluacion;
  titulo: string;
  descripcion: string;
  fechaVencimiento: Date | null;
  diasRestantes: number | null;
  requiereAccion: boolean;
  provisional: boolean;
}

function normalizarFechaUtc(fecha: Date): Date {
  return new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      12
    )
  );
}

function ultimoDiaMesUtc(
  anio: number,
  mesBaseCero: number
): number {
  return new Date(
    Date.UTC(anio, mesBaseCero + 1, 0, 12)
  ).getUTCDate();
}

export function agregarPeriodicidadVigencia(
  fechaBase: Date,
  cantidad: number,
  unidad: UnidadPeriodicidad
): Date {
  const resultado =
    normalizarFechaUtc(fechaBase);

  switch (unidad) {
    case UnidadPeriodicidad.DIA:
      resultado.setUTCDate(
        resultado.getUTCDate() + cantidad
      );
      return resultado;

    case UnidadPeriodicidad.SEMANA:
      resultado.setUTCDate(
        resultado.getUTCDate() +
          cantidad * 7
      );
      return resultado;

    case UnidadPeriodicidad.MES: {
      const diaOriginal =
        resultado.getUTCDate();

      resultado.setUTCDate(1);
      resultado.setUTCMonth(
        resultado.getUTCMonth() +
          cantidad
      );

      const ultimoDia =
        ultimoDiaMesUtc(
          resultado.getUTCFullYear(),
          resultado.getUTCMonth()
        );

      resultado.setUTCDate(
        Math.min(
          diaOriginal,
          ultimoDia
        )
      );

      return resultado;
    }

    case UnidadPeriodicidad.ANIO: {
      const mesOriginal =
        resultado.getUTCMonth();
      const diaOriginal =
        resultado.getUTCDate();

      resultado.setUTCDate(1);
      resultado.setUTCFullYear(
        resultado.getUTCFullYear() +
          cantidad
      );
      resultado.setUTCMonth(
        mesOriginal
      );

      const ultimoDia =
        ultimoDiaMesUtc(
          resultado.getUTCFullYear(),
          mesOriginal
        );

      resultado.setUTCDate(
        Math.min(
          diaOriginal,
          ultimoDia
        )
      );

      return resultado;
    }
  }
}

export function calcularFechaVencimientoEvaluacion(
  gestionFecha: Date,
  fechaDocumento: Date | null,
  configuracion:
    | ConfiguracionVigenciaCalculable
    | null,
  esEvergreen: boolean,
  estadoCumplimiento:
    EstadoCumplimientoAspecto
): Date | null {
  if (
    estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA ||
    esEvergreen ||
    !configuracion
  ) {
    return null;
  }

  if (
    configuracion.tipoFechaBase ===
    TipoFechaBaseVigencia.FECHA_FIJA_CALENDARIO
  ) {
    if (
      !configuracion.mesFechaFija ||
      !configuracion.diaFechaFija
    ) {
      return null;
    }

    return new Date(
      Date.UTC(
        gestionFecha.getUTCFullYear(),
        configuracion.mesFechaFija - 1,
        configuracion.diaFechaFija,
        12
      )
    );
  }

  if (
    !configuracion.cantidad ||
    !configuracion.unidad
  ) {
    return null;
  }

  const fechaBase =
    configuracion.tipoFechaBase ===
    TipoFechaBaseVigencia.FECHA_DOCUMENTO
      ? fechaDocumento
      : gestionFecha;

  if (!fechaBase) {
    return null;
  }

  return agregarPeriodicidadVigencia(
    fechaBase,
    configuracion.cantidad,
    configuracion.unidad
  );
}

function diferenciaDias(
  fechaFinal: Date,
  fechaInicial: Date
): number {
  const milisegundosDia =
    24 * 60 * 60 * 1000;

  const final =
    normalizarFechaUtc(
      fechaFinal
    ).getTime();

  const inicial =
    normalizarFechaUtc(
      fechaInicial
    ).getTime();

  return Math.ceil(
    (final - inicial) /
      milisegundosDia
  );
}

export function resolverVigenciaEvaluacion({
  evaluacion,
  configuracion,
  esEvergreen,
  provisional = false,
  hoy = new Date(),
}: {
  evaluacion:
    | EvaluacionParaVigencia
    | null;
  configuracion:
    | ConfiguracionVigenciaCalculable
    | null;
  esEvergreen: boolean;
  provisional?: boolean;
  hoy?: Date;
}): ResultadoVigenciaEvaluacion {
  if (!evaluacion) {
    return {
      estado: "SIN_REVISION",
      titulo: "Sin revisión",
      descripcion:
        "Este aspecto todavía no tiene una evaluación finalizada.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: false,
      provisional,
    };
  }

  if (
    evaluacion.estadoCumplimiento ===
    EstadoCumplimientoAspecto.NO_APLICA
  ) {
    return {
      estado: "NO_APLICA",
      titulo: "No aplica",
      descripcion:
        "El aspecto fue justificado como No aplica para esta evaluación.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: false,
      provisional,
    };
  }

  if (esEvergreen) {
    return {
      estado:
        "VIGENTE_PERMANENTE",
      titulo:
        "Vigente permanente",
      descripcion:
        "Es un aspecto Evergreen. Permanece activo y debe revisarse cuando exista un cambio significativo.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: false,
      provisional,
    };
  }

  if (!configuracion) {
    return {
      estado:
        "PERIODICIDAD_NO_CONFIGURADA",
      titulo:
        "Periodicidad pendiente",
      descripcion:
        "El aspecto no tiene una regla de vigencia configurada en la Supermatriz.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: true,
      provisional,
    };
  }

  if (
    configuracion.tipoFechaBase ===
      TipoFechaBaseVigencia.FECHA_DOCUMENTO &&
    !evaluacion.fechaDocumento
  ) {
    return {
      estado:
        "FALTA_FECHA_DOCUMENTO",
      titulo:
        "Falta fecha",
      descripcion:
        "Agrega la fecha de elaboración del documento para calcular su vigencia.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: true,
      provisional,
    };
  }

  if (
    configuracion.tipoFechaBase ===
      TipoFechaBaseVigencia.FECHA_FIJA_CALENDARIO &&
    (
      !configuracion.mesFechaFija ||
      !configuracion.diaFechaFija
    )
  ) {
    return {
      estado:
        "PERIODICIDAD_NO_CONFIGURADA",
      titulo:
        "Fecha fija incompleta",
      descripcion:
        "La regla usa una fecha fija, pero el mes o el día no están configurados.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: true,
      provisional,
    };
  }

  if (
    configuracion.tipoFechaBase !==
      TipoFechaBaseVigencia.FECHA_FIJA_CALENDARIO &&
    (
      !configuracion.cantidad ||
      !configuracion.unidad
    )
  ) {
    return {
      estado:
        "PERIODICIDAD_NO_CONFIGURADA",
      titulo:
        "Periodicidad pendiente",
      descripcion:
        "La regla no tiene una cantidad y una unidad de periodicidad completas.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: true,
      provisional,
    };
  }

  if (
    !evaluacion.fechaVencimientoCalculada
  ) {
    return {
      estado:
        "PERIODICIDAD_NO_CONFIGURADA",
      titulo:
        "No se pudo calcular",
      descripcion:
        "La configuración existe, pero no produjo una fecha de vencimiento. Revisa la regla del aspecto.",
      fechaVencimiento: null,
      diasRestantes: null,
      requiereAccion: true,
      provisional,
    };
  }

  const diasRestantes =
    diferenciaDias(
      evaluacion
        .fechaVencimientoCalculada,
      hoy
    );

  if (diasRestantes < 0) {
    return {
      estado: "VENCIDO",
      titulo: "Vencido",
      descripcion:
        `Venció hace ${Math.abs(
          diasRestantes
        )} día(s).`,
      fechaVencimiento:
        evaluacion
          .fechaVencimientoCalculada,
      diasRestantes,
      requiereAccion: true,
      provisional,
    };
  }

  if (
    diasRestantes <=
    configuracion.diasAlertaPrevia
  ) {
    return {
      estado: "POR_VENCER",
      titulo: "Por vencer",
      descripcion:
        diasRestantes === 0
          ? "Vence hoy."
          : `Faltan ${diasRestantes} día(s) para el vencimiento.`,
      fechaVencimiento:
        evaluacion
          .fechaVencimientoCalculada,
      diasRestantes,
      requiereAccion: true,
      provisional,
    };
  }

  return {
    estado: "VIGENTE",
    titulo: "Vigente",
    descripcion:
      `Faltan ${diasRestantes} día(s) para el vencimiento.`,
    fechaVencimiento:
      evaluacion
        .fechaVencimientoCalculada,
    diasRestantes,
    requiereAccion: false,
    provisional,
  };
}

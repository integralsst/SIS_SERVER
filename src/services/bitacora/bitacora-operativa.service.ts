import {
  EstadoCumplimientoAspecto,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ContextoAspectoBitacora,
  PropuestaAspectoBitacora,
} from "../../types/bitacora.types";
import { extraerUrlsBitacora } from "./bitacora-enlaces.service";
import {
  guardarYAnalizarBitacora,
  leerSnapshotBitacora,
  type SnapshotBitacoraIa,
} from "./bitacora-registros.service";
import { buscarCandidatosAspectoBitacora } from "./recuperacion/candidatos-aspecto.service";
import { cargarContextoAspectosBitacora } from "./recuperacion/contexto-aspecto.service";
import {
  calcularSoporteDirectoBitacora,
  tieneSoporteDirectoBitacora,
} from "./recuperacion/relevancia-textual.service";
import type { CrearRegistroBitacoraInput } from "../../types/bitacora.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";

const MESES_ES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Términos útiles para recuperar candidatos, pero insuficientes por sí solos
 * para demostrar que la anotación trata exactamente del mismo requisito.
 *
 * La regla estricta se usa para:
 * - mostrar/enriquecer SIN_CAMBIO;
 * - autorizar una propuesta automática de Cumplido · 5.
 *
 * Las propuestas 0/3 conservan el guardrail directo ya calibrado, para evitar
 * volver demasiado conservadores los casos de incumplimiento/parcialidad.
 */
const SENALES_CONTEXTUALES_NO_INEQUIVOCAS = new Set([
  "acta",
  "actas",
  "comite",
  "copasst",
  "vigia",
  "ocupacional",
  "documento",
  "documentos",
  "evidencia",
  "evidencias",
  "soporte",
  "soportes",
  "empresa",
  "seguridad",
  "salud",
  "trabajo",
  "sgsst",
]);

function aJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function construirFechaIso(
  anio: number,
  mes: number,
  dia: number
): string | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function normalizarTexto(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fechaPareceVencimiento(texto: string, indice: number): boolean {
  const prefijo = texto.slice(Math.max(0, indice - 42), indice);
  return /(?:vigente\s+hasta|vigencia\s+hasta|vence|vencimiento|hasta\s+el)\s*$/i.test(
    prefijo
  );
}

function contextoPareceDocumental(
  texto: string,
  indice: number,
  longitud: number
): boolean {
  const ventana = texto.slice(
    Math.max(0, indice - 110),
    Math.min(texto.length, indice + longitud + 110)
  );

  return /(acta|documento|certificado|licencia|resolucion|soporte|constancia|informe|formato|matriz|plan|programa|politica|procedimiento|fecha\s+(?:del|de)|emitid|expedid|elaborad|suscrit)/i.test(
    ventana
  );
}

function extraerFechaDocumentalSegura(contenido: string): string | null {
  const texto = normalizarTexto(contenido);
  const fechas = new Set<string>();

  const agregar = (
    indice: number,
    longitud: number,
    anio: number,
    mes: number,
    dia: number
  ) => {
    if (
      fechaPareceVencimiento(texto, indice) ||
      !contextoPareceDocumental(texto, indice, longitud)
    ) {
      return;
    }

    const iso = construirFechaIso(anio, mes, dia);
    if (iso) fechas.add(iso);
  };

  for (const match of texto.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[1]),
      Number(match[2]),
      Number(match[3])
    );
  }

  for (const match of texto.matchAll(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/g)) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[3]),
      Number(match[2]),
      Number(match[1])
    );
  }

  for (const match of texto.matchAll(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/g
  )) {
    agregar(
      match.index ?? 0,
      match[0].length,
      Number(match[3]),
      MESES_ES[match[2]],
      Number(match[1])
    );
  }

  return fechas.size === 1 ? [...fechas][0] : null;
}

function calificacionPorEstado(
  estado: EstadoCumplimientoAspecto | null
): 0 | 3 | 5 | null {
  switch (estado) {
    case EstadoCumplimientoAspecto.CUMPLIDO:
      return 5;
    case EstadoCumplimientoAspecto.PARCIAL:
      return 3;
    case EstadoCumplimientoAspecto.NO_CUMPLIDO:
      return 0;
    default:
      return null;
  }
}

function urlsCanonicas(urls: string[]): string[] {
  const normalizadas = new Set<string>();

  for (const candidata of urls) {
    try {
      const url = new URL(candidata.trim());
      if (url.protocol === "http:" || url.protocol === "https:") {
        normalizadas.add(url.toString());
      }
    } catch {
      // La URL inválida se ignora; nunca se inventa una alternativa.
    }
  }

  return [...normalizadas];
}

function tieneSoporteInequivoco(
  soporte: ReturnType<typeof calcularSoporteDirectoBitacora>
): boolean {
  if (!tieneSoporteDirectoBitacora(soporte)) {
    return false;
  }

  if (
    soporte.senales.some(
      (senal) =>
        senal.startsWith("codigo:") ||
        senal.startsWith("frase:")
    )
  ) {
    return true;
  }

  const senalesEspecificas = soporte.senales.filter(
    (senal) => !SENALES_CONTEXTUALES_NO_INEQUIVOCAS.has(senal)
  );

  return new Set(senalesEspecificas).size >= 2;
}

function soporteSuficienteParaPropuesta(
  propuesta: PropuestaAspectoBitacora,
  soporte: ReturnType<typeof calcularSoporteDirectoBitacora>
): boolean {
  if (propuesta.accion !== "PROPONER_EVALUACION") {
    return tieneSoporteInequivoco(soporte);
  }

  // Un Cumplido · 5 es una afirmación fuerte: compartir solo el tema no basta.
  if (propuesta.calificacionAdministrativaPropuesta === 5) {
    return tieneSoporteInequivoco(soporte);
  }

  // Conserva la calibración ya validada para 0/3.
  return tieneSoporteDirectoBitacora(soporte);
}

function neutralizarPropuestaSinSoporte(
  propuesta: PropuestaAspectoBitacora
): PropuestaAspectoBitacora {
  const eraCumplido = propuesta.calificacionAdministrativaPropuesta === 5;

  return {
    ...propuesta,
    accion: "SIN_CAMBIO",
    estadoPropuesto: null,
    calificacionAdministrativaPropuesta: null,
    evidenciaBitacora: null,
    evidenciasUrls: [],
    fechaDocumento: null,
    justificacionTecnica: eraCumplido
      ? "Stack44 bloqueó la propuesta automática de Cumplido porque la anotación no aporta soporte inequívoco del mismo requisito completo. El aspecto permanece sin cambio."
      : "Stack44 bloqueó la propuesta automática porque la anotación no aporta soporte directo suficiente del mismo requisito. El aspecto permanece sin cambio.",
    reglaAplicada: "GUARDRAIL_SOPORTE_DIRECTO_V2",
    informacionFaltante: [
      "Falta soporte directo suficiente del mismo requisito para modificar la evaluación.",
    ],
  };
}

function construirResumen(
  propuestas: PropuestaAspectoBitacora[],
  reconocidosIds: Set<number>
) {
  const evaluaciones = propuestas.filter(
    (propuesta) => propuesta.accion === "PROPONER_EVALUACION"
  );
  const requierenRevision = propuestas.filter(
    (propuesta) =>
      propuesta.accion === "INFORMACION_INSUFICIENTE" ||
      propuesta.accion === "REQUIERE_REVISION_HUMANA"
  );
  const sinCambio = propuestas.filter(
    (propuesta) => propuesta.accion === "SIN_CAMBIO"
  );
  const aspectosReconocidos = propuestas.filter((propuesta) =>
    reconocidosIds.has(propuesta.aspectoId)
  );
  const evidenciasUrls = [
    ...new Set(evaluaciones.flatMap((propuesta) => propuesta.evidenciasUrls)),
  ];

  return {
    totalAspectosAnalizados: propuestas.length,
    totalAspectosReconocidos: aspectosReconocidos.length,
    totalEvaluacionesPropuestas: evaluaciones.length,
    totalRequierenRevision: requierenRevision.length,
    totalSinCambio: sinCambio.length,
    totalEvidenciasDetectadas: evidenciasUrls.length,
    evaluaciones,
    aspectosReconocidos,
    sinCambio,
    requierenRevision,
    evidenciasUrls,
  };
}

function enriquecerPropuestas(params: {
  contenido: string;
  propuestas: PropuestaAspectoBitacora[];
  contextos: ContextoAspectoBitacora[];
  candidatos: Awaited<ReturnType<typeof buscarCandidatosAspectoBitacora>>;
}) {
  const { contenido, propuestas, contextos, candidatos } = params;
  const contextoPorId = new Map(
    contextos.map((contexto) => [contexto.aspectoId, contexto])
  );
  const candidatoPorId = new Map(
    candidatos.map((candidato) => [candidato.aspectoId, candidato])
  );
  const reconocidosIds = new Set<number>();
  const propuestasBloqueadasIds = new Set<number>();

  for (const propuesta of propuestas) {
    const candidato = candidatoPorId.get(propuesta.aspectoId);
    if (!candidato) continue;

    const soporte = calcularSoporteDirectoBitacora({
      contenidoBitacora: contenido,
      codigo: candidato.codigo,
      nombre: candidato.nombre,
      palabrasClave: candidato.palabrasClave,
    });

    const reconocido = soporteSuficienteParaPropuesta(propuesta, soporte);

    if (reconocido) {
      reconocidosIds.add(propuesta.aspectoId);
    } else if (propuesta.accion === "PROPONER_EVALUACION") {
      propuestasBloqueadasIds.add(propuesta.aspectoId);
    }
  }

  const propuestasValidadas = propuestas.map((propuesta) =>
    propuestasBloqueadasIds.has(propuesta.aspectoId)
      ? neutralizarPropuestaSinSoporte(propuesta)
      : propuesta
  );

  const urlsDetectadas = urlsCanonicas(extraerUrlsBitacora(contenido));
  const fechaDocumental = extraerFechaDocumentalSegura(contenido);
  const reconocidos = propuestasValidadas.filter((propuesta) =>
    reconocidosIds.has(propuesta.aspectoId)
  );
  const aspectoUrlUnica =
    urlsDetectadas.length === 1 && reconocidos.length === 1
      ? reconocidos[0].aspectoId
      : null;

  const enriquecidas = propuestasValidadas.map((propuesta) => {
    if (!reconocidosIds.has(propuesta.aspectoId)) {
      return propuesta;
    }

    const contexto = contextoPorId.get(propuesta.aspectoId);
    if (!contexto) return propuesta;

    const urlsModelo = urlsCanonicas(propuesta.evidenciasUrls ?? []).filter(
      (url) => urlsDetectadas.includes(url)
    );
    const evidenciasUrls =
      urlsModelo.length > 0
        ? urlsModelo
        : aspectoUrlUnica === propuesta.aspectoId
          ? urlsDetectadas
          : [];
    const fechaDocumento = propuesta.fechaDocumento ?? fechaDocumental;

    if (propuesta.accion !== "SIN_CAMBIO") {
      return {
        ...propuesta,
        evidenciasUrls,
        fechaDocumento,
      };
    }

    const calificacionActual = calificacionPorEstado(contexto.estadoActual);
    const aportaSoporteNuevo =
      evidenciasUrls.length > 0 ||
      Boolean(
        fechaDocumento && fechaDocumento !== contexto.fechaDocumentoActual
      );

    if (!aportaSoporteNuevo || calificacionActual === null) {
      return propuesta;
    }

    return {
      ...propuesta,
      accion: "PROPONER_EVALUACION" as const,
      estadoPropuesto: contexto.estadoActual,
      calificacionAdministrativaPropuesta: calificacionActual,
      evidenciaBitacora:
        propuesta.evidenciaBitacora?.trim() ||
        "La Bitácora aporta soporte documental nuevo para el aspecto sin modificar su calificación vigente.",
      evidenciasUrls,
      fechaDocumento,
      justificacionTecnica:
        "La información confirma el estado vigente y aporta soporte documental nuevo. Stack44 registra una nueva evaluación histórica con la misma calificación para conservar inmutabilidad y actualizar evidencia/vigencia.",
      reglaAplicada: "ACTUALIZACION_SOPORTE_SIN_CAMBIO_V1",
      informacionFaltante: [],
      requiereRevisionTecnica: contexto.requiereRevisionTecnica,
    } satisfies PropuestaAspectoBitacora;
  });

  return {
    propuestas: enriquecidas,
    reconocidosIds,
  };
}

export async function guardarYAnalizarBitacoraOperativa(
  empresaId: string,
  input: CrearRegistroBitacoraInput,
  usuario: UsuarioSesionEvaluacion
) {
  const resultado = await guardarYAnalizarBitacora(
    empresaId,
    input,
    usuario
  );

  const candidatos = await buscarCandidatosAspectoBitacora({
    versionSupermatrizId: resultado.versionSupermatriz.id,
    contenidoBitacora: resultado.registro.contenidoOriginal,
  });
  const contextos = await cargarContextoAspectosBitacora({
    empresaId,
    versionSupermatrizId: resultado.versionSupermatriz.id,
    fechaEfectiva: new Date(`${resultado.registro.fechaEfectiva}T12:00:00.000Z`),
    candidatos,
  });
  const enriquecido = enriquecerPropuestas({
    contenido: resultado.registro.contenidoOriginal,
    propuestas: resultado.analisis.propuestas,
    contextos,
    candidatos,
  });

  const registro = await prisma.gestionSgsst.findUnique({
    where: { id: resultado.registro.id },
    include: { aprobacion: true },
  });

  if (!registro?.aprobacion) {
    return {
      ...resultado,
      analisis: {
        ...resultado.analisis,
        propuestas: enriquecido.propuestas,
      },
      resumen: construirResumen(
        enriquecido.propuestas,
        enriquecido.reconocidosIds
      ),
    };
  }

  const snapshot = leerSnapshotBitacora(
    registro.aprobacion.reglasAplicadas
  );
  const snapshotActualizado: SnapshotBitacoraIa = {
    ...snapshot,
    analisis: {
      ...snapshot.analisis,
      propuestas: enriquecido.propuestas,
    },
  };

  await prisma.aprobacionGestion.update({
    where: { id: registro.aprobacion.id },
    data: {
      reglasAplicadas: aJsonPrisma(snapshotActualizado),
    },
  });

  return {
    ...resultado,
    analisis: {
      ...resultado.analisis,
      propuestas: enriquecido.propuestas,
    },
    resumen: construirResumen(
      enriquecido.propuestas,
      enriquecido.reconocidosIds
    ),
  };
}

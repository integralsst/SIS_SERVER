import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { asegurarAccesoGestion } from "./acceso-evaluacion.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

export type EstadoEvidenciaAspecto =
  | "NO_REQUERIDA"
  | "NO_APLICA"
  | "PENDIENTE"
  | "COMPLETA";

export type FuenteSoporteEvidencia =
  | "EVALUACION"
  | "COMPROMISO"
  | "MIXTA"
  | null;

export interface ResultadoEstadoEvidenciaAspecto {
  estado: EstadoEvidenciaAspecto;
  requiereEvidencia: boolean;
  evidenciaPendiente: boolean;
  tieneEvidenciaEvaluacion: boolean;
  tieneEvidenciaCompromisoRelacionada: boolean;
  fuenteSoporte: FuenteSoporteEvidencia;
  compromisosConSoporte: string[];
}

export interface InsumoEstadoEvidenciaAspecto {
  requiereEvidencia: boolean;
  estadoCumplimiento: EstadoCumplimientoAspecto | string | null;
  calificacionAdministrativa: number | null;
  gestionFinalizadaValida: boolean;
  tieneEvidenciaEvaluacion: boolean;
  compromisosConSoporte?: string[];
}

interface ContextoDetalleEvidencia {
  empresaId: string;
  tareaId: number;
  anio: number;
  gestionId?: string | null;
}

const seleccionEstadoEvidencia = {
  id: true,
  gestionId: true,
  estadoCumplimiento: true,
  calificacionAdministrativa: true,
  gestion: {
    select: {
      estado: true,
      valida: true,
      empresaPeriodo: {
        select: {
          estado: true,
        },
      },
    },
  },
  aspecto: {
    select: {
      configuracionEvidencia: {
        select: {
          requiereEvidencia: true,
        },
      },
    },
  },
  evidencias: {
    where: {
      activo: true,
    },
    select: {
      id: true,
    },
    take: 1,
  },
  seguimientosCompromiso: {
    select: {
      compromiso: {
        select: {
          id: true,
          evidencias: {
            where: {
              activa: true,
            },
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.EvaluacionAspectoSelect;

type EvaluacionEstadoEvidencia =
  Prisma.EvaluacionAspectoGetPayload<{
    select: typeof seleccionEstadoEvidencia;
  }>;

interface EvaluacionVistaContexto {
  id: string;
  estadoCumplimiento: string;
  calificacionAdministrativa: number;
}

interface FilaContextoEvidencia {
  aspecto: {
    configuracionEvidencia: {
      requiereEvidencia: boolean;
    } | null;
  };
  ultimaEvaluacion: EvaluacionVistaContexto | null;
  [key: string]: unknown;
}

interface ContextoEvaluacionConFilas {
  filas: FilaContextoEvidencia[];
  resumen: Record<string, unknown>;
  [key: string]: unknown;
}

interface PermisosDetalleEvidencia {
  puedeGestionarEvidencias: boolean;
  puedeVerRevisionTecnica: boolean;
  motivoEvidencias: string | null;
  [key: string]: unknown;
}

interface ResultadoDetalleEvidencia {
  evidenciaObjetivo: {
    evaluacionId: string;
    esBorrador: boolean;
  } | null;
  permisos: PermisosDetalleEvidencia;
  evidenciasCompromiso?: Array<{
    compromiso: {
      id: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface ResultadoHistorialConTrazabilidad {
  historial: Array<{
    id: string;
    [key: string]: unknown;
  }>;
  trazabilidad: Array<{
    createdAt: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

function fuenteSoporte(
  tieneEvidenciaEvaluacion: boolean,
  tieneEvidenciaCompromisoRelacionada: boolean
): FuenteSoporteEvidencia {
  if (
    tieneEvidenciaEvaluacion &&
    tieneEvidenciaCompromisoRelacionada
  ) {
    return "MIXTA";
  }

  if (tieneEvidenciaEvaluacion) {
    return "EVALUACION";
  }

  if (tieneEvidenciaCompromisoRelacionada) {
    return "COMPROMISO";
  }

  return null;
}

export function resolverEstadoEvidenciaAspecto(
  input: InsumoEstadoEvidenciaAspecto
): ResultadoEstadoEvidenciaAspecto {
  const compromisosConSoporte = [
    ...new Set(input.compromisosConSoporte ?? []),
  ];
  const tieneEvidenciaCompromisoRelacionada =
    compromisosConSoporte.length > 0;
  const soporte = fuenteSoporte(
    input.tieneEvidenciaEvaluacion,
    tieneEvidenciaCompromisoRelacionada
  );

  if (!input.requiereEvidencia) {
    return {
      estado: "NO_REQUERIDA",
      requiereEvidencia: false,
      evidenciaPendiente: false,
      tieneEvidenciaEvaluacion: input.tieneEvidenciaEvaluacion,
      tieneEvidenciaCompromisoRelacionada,
      fuenteSoporte: soporte,
      compromisosConSoporte,
    };
  }

  const aplicaPendiente =
    input.gestionFinalizadaValida &&
    input.estadoCumplimiento ===
      EstadoCumplimientoAspecto.CUMPLIDO &&
    input.calificacionAdministrativa === 5;

  if (!aplicaPendiente) {
    return {
      estado: "NO_APLICA",
      requiereEvidencia: true,
      evidenciaPendiente: false,
      tieneEvidenciaEvaluacion: input.tieneEvidenciaEvaluacion,
      tieneEvidenciaCompromisoRelacionada,
      fuenteSoporte: soporte,
      compromisosConSoporte,
    };
  }

  if (soporte) {
    return {
      estado: "COMPLETA",
      requiereEvidencia: true,
      evidenciaPendiente: false,
      tieneEvidenciaEvaluacion: input.tieneEvidenciaEvaluacion,
      tieneEvidenciaCompromisoRelacionada,
      fuenteSoporte: soporte,
      compromisosConSoporte,
    };
  }

  return {
    estado: "PENDIENTE",
    requiereEvidencia: true,
    evidenciaPendiente: true,
    tieneEvidenciaEvaluacion: false,
    tieneEvidenciaCompromisoRelacionada: false,
    fuenteSoporte: null,
    compromisosConSoporte: [],
  };
}

function resolverDesdeEvaluacion(
  evaluacion: EvaluacionEstadoEvidencia
): ResultadoEstadoEvidenciaAspecto {
  const compromisosConSoporte =
    evaluacion.seguimientosCompromiso
      .filter(
        ({ compromiso }) =>
          compromiso.evidencias.length > 0
      )
      .map(({ compromiso }) => compromiso.id);

  return resolverEstadoEvidenciaAspecto({
    requiereEvidencia:
      evaluacion.aspecto.configuracionEvidencia
        ?.requiereEvidencia ?? false,
    estadoCumplimiento:
      evaluacion.estadoCumplimiento,
    calificacionAdministrativa:
      evaluacion.calificacionAdministrativa.toNumber(),
    gestionFinalizadaValida:
      evaluacion.gestion.valida &&
      evaluacion.gestion.estado ===
        EstadoGestionSgsst.FINALIZADA,
    tieneEvidenciaEvaluacion:
      evaluacion.evidencias.length > 0,
    compromisosConSoporte,
  });
}

async function cargarEvaluacionesEstado(
  evaluacionIds: string[]
): Promise<Map<string, EvaluacionEstadoEvidencia>> {
  const ids = [...new Set(evaluacionIds)].filter(Boolean);

  if (ids.length === 0) {
    return new Map();
  }

  const evaluaciones =
    await prisma.evaluacionAspecto.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: seleccionEstadoEvidencia,
    });

  return new Map(
    evaluaciones.map((evaluacion) => [
      evaluacion.id,
      evaluacion,
    ])
  );
}

async function buscarUltimaFinalizadaPeriodo(
  contexto: ContextoDetalleEvidencia
): Promise<EvaluacionEstadoEvidencia | null> {
  const periodo = await prisma.empresaPeriodo.findUnique({
    where: {
      empresaId_anio: {
        empresaId: contexto.empresaId,
        anio: contexto.anio,
      },
    },
    select: {
      id: true,
    },
  });

  if (!periodo) return null;

  const gestionSeleccionada = contexto.gestionId
    ? await prisma.gestionSgsst.findFirst({
        where: {
          id: contexto.gestionId,
          empresaPeriodoId: periodo.id,
          valida: true,
        },
        select: {
          fechaGestion: true,
        },
      })
    : null;
  const fechaCorte =
    gestionSeleccionada?.fechaGestion ??
    construirCorteAnual(contexto.anio);
  const versionAplicable =
    await servicioPeriodosEvaluacion.resolverVersionParaFecha(
      fechaCorte
    );

  const tarea = await prisma.supermatrizTarea.findFirst({
    where: {
      id: contexto.tareaId,
      versionSupermatrizId: versionAplicable.id,
    },
    select: {
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
    },
  });

  if (!tarea) return null;

  return prisma.evaluacionAspecto.findFirst({
    where: {
      aspecto: {
        identidadHistorica:
          tarea.aspecto.identidadHistorica,
      },
      gestion: {
        empresaPeriodo: {
          empresaId: contexto.empresaId,
        },
        fechaGestion: {
          lte: fechaCorte,
        },
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
      },
    },
    orderBy: [
      {
        gestion: {
          fechaGestion: "desc",
        },
      },
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: seleccionEstadoEvidencia,
  });
}

export async function obtenerEstadoEvidenciaEvaluacion(
  evaluacionId: string
): Promise<{
  evaluacion: EvaluacionEstadoEvidencia | null;
  estadoEvidencia: ResultadoEstadoEvidenciaAspecto | null;
}> {
  const evaluacion =
    await prisma.evaluacionAspecto.findUnique({
      where: {
        id: evaluacionId,
      },
      select: seleccionEstadoEvidencia,
    });

  return {
    evaluacion,
    estadoEvidencia: evaluacion
      ? resolverDesdeEvaluacion(evaluacion)
      : null,
  };
}

export async function enriquecerContextoConEstadoEvidencia<
  T extends ContextoEvaluacionConFilas,
>(resultado: T): Promise<T> {
  const evaluacionIds = resultado.filas
    .map((fila) => fila.ultimaEvaluacion?.id)
    .filter((id): id is string => Boolean(id));
  const evaluaciones =
    await cargarEvaluacionesEstado(evaluacionIds);

  let evidenciasPendientes = 0;
  const aspectosContados = new Set<number>();

  const filas = resultado.filas.map((fila) => {
    const evaluacion = fila.ultimaEvaluacion
      ? evaluaciones.get(fila.ultimaEvaluacion.id) ?? null
      : null;
    const estadoEvidencia = evaluacion
      ? resolverDesdeEvaluacion(evaluacion)
      : resolverEstadoEvidenciaAspecto({
          requiereEvidencia:
            fila.aspecto.configuracionEvidencia
              ?.requiereEvidencia ?? false,
          estadoCumplimiento: null,
          calificacionAdministrativa: null,
          gestionFinalizadaValida: false,
          tieneEvidenciaEvaluacion: false,
        });

    const aspectoId =
      typeof fila.aspecto === "object" &&
      fila.aspecto !== null &&
      "id" in fila.aspecto &&
      typeof fila.aspecto.id === "number"
        ? fila.aspecto.id
        : null;

    if (
      estadoEvidencia.evidenciaPendiente &&
      aspectoId !== null &&
      !aspectosContados.has(aspectoId)
    ) {
      aspectosContados.add(aspectoId);
      evidenciasPendientes += 1;
    }

    return {
      ...fila,
      estadoEvidencia: estadoEvidencia.estado,
      evidenciaPendiente:
        estadoEvidencia.evidenciaPendiente,
      detalleEvidencia: estadoEvidencia,
    };
  });

  return {
    ...resultado,
    filas,
    resumen: {
      ...resultado.resumen,
      evidenciasPendientes,
    },
  };
}

async function puedeCompletarEvidenciaPendiente(
  evaluacion: EvaluacionEstadoEvidencia,
  estadoEvidencia: ResultadoEstadoEvidenciaAspecto,
  usuario: UsuarioSesionEvaluacion
): Promise<boolean> {
  if (
    !estadoEvidencia.evidenciaPendiente ||
    evaluacion.gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
  ) {
    return false;
  }

  try {
    await asegurarAccesoGestion(
      usuario,
      evaluacion.gestionId,
      "ESCRITURA"
    );
    return true;
  } catch {
    return false;
  }
}

function motivoEvidenciasFinalizadas(
  estadoEvidencia: ResultadoEstadoEvidenciaAspecto,
  puedeCompletar: boolean
): string {
  if (estadoEvidencia.estado === "PENDIENTE") {
    return puedeCompletar
      ? "La evaluación finalizada conserva su calificación 5. Puedes agregar el soporte documental pendiente sin crear una nueva gestión."
      : "La evaluación finalizada conserva su calificación 5, pero aún requiere soporte documental. Tu rol puede consultarlo, pero no completar este soporte.";
  }

  if (estadoEvidencia.estado === "COMPLETA") {
    return "La gestión finalizada es de solo lectura y el requisito documental ya se encuentra completo.";
  }

  return "Las evidencias de una gestión finalizada son de solo lectura.";
}

export async function enriquecerDetalleConEstadoEvidencia<
  T extends ResultadoDetalleEvidencia,
>(
  resultado: T,
  usuario: UsuarioSesionEvaluacion,
  contexto?: ContextoDetalleEvidencia
): Promise<T> {
  const evaluacionObjetivoId =
    resultado.evidenciaObjetivo?.evaluacionId ?? null;
  const evaluacionObjetivo = evaluacionObjetivoId
    ? (
        await obtenerEstadoEvidenciaEvaluacion(
          evaluacionObjetivoId
        )
      ).evaluacion
    : null;
  const evaluacionOficial = contexto
    ? await buscarUltimaFinalizadaPeriodo(contexto)
    : evaluacionObjetivo?.gestion.estado ===
          EstadoGestionSgsst.FINALIZADA
      ? evaluacionObjetivo
      : null;
  const evaluacionEstado =
    evaluacionOficial ?? evaluacionObjetivo;

  if (!evaluacionEstado) {
    return {
      ...resultado,
      estadoEvidencia: "NO_APLICA",
      evidenciaPendiente: false,
      detalleEvidencia: null,
      evidenciaPendienteObjetivo: null,
      permisos: {
        ...resultado.permisos,
        puedeCompletarEvidenciaPendiente: false,
      },
    };
  }

  const estadoEvidencia =
    resolverDesdeEvaluacion(evaluacionEstado);
  const puedeCompletar =
    evaluacionOficial
      ? await puedeCompletarEvidenciaPendiente(
          evaluacionOficial,
          estadoEvidencia,
          usuario
        )
      : false;
  const compromisosValidos = new Set(
    estadoEvidencia.compromisosConSoporte
  );

  const evidenciasCompromiso =
    resultado.evidenciasCompromiso?.map((evidencia) => ({
      ...evidencia,
      soporteValidoParaEvaluacionObjetivo:
        compromisosValidos.has(evidencia.compromiso.id),
    }));

  const esBorrador =
    resultado.evidenciaObjetivo?.esBorrador ?? false;

  return {
    ...resultado,
    ...(evidenciasCompromiso
      ? { evidenciasCompromiso }
      : {}),
    estadoEvidencia: estadoEvidencia.estado,
    evidenciaPendiente:
      estadoEvidencia.evidenciaPendiente,
    detalleEvidencia: {
      ...estadoEvidencia,
      evaluacionId: evaluacionEstado.id,
      puedeCompletarPosteriormente: puedeCompletar,
    },
    evidenciaPendienteObjetivo:
      estadoEvidencia.evidenciaPendiente &&
      evaluacionOficial
        ? {
            evaluacionId: evaluacionOficial.id,
            esBorrador: false,
          }
        : null,
    permisos: {
      ...resultado.permisos,
      puedeCompletarEvidenciaPendiente: puedeCompletar,
      motivoEvidencias: esBorrador
        ? resultado.permisos.motivoEvidencias
        : motivoEvidenciasFinalizadas(
            estadoEvidencia,
            puedeCompletar
          ),
    },
  };
}

function tituloEventoEvidencia(accion: string): string {
  const titulos: Record<string, string> = {
    CREAR_EVIDENCIA: "Evidencia agregada",
    ACTUALIZAR_EVIDENCIA: "Evidencia actualizada",
    DESACTIVAR_EVIDENCIA: "Evidencia retirada",
    COMPLETAR_EVIDENCIA_PENDIENTE:
      "Evidencia pendiente completada",
  };

  return titulos[accion] ?? "Movimiento de evidencia";
}

export async function enriquecerTrazabilidadConEvidencias<
  T extends ResultadoHistorialConTrazabilidad,
>(resultado: T): Promise<T> {
  const evaluacionIds = resultado.historial.map(
    (item) => item.id
  );

  if (evaluacionIds.length === 0) {
    return resultado;
  }

  const historialEvidencias =
    await prisma.historialEvaluacion.findMany({
      where: {
        evaluacionId: {
          in: evaluacionIds,
        },
        accion: {
          in: [
            "CREAR_EVIDENCIA",
            "ACTUALIZAR_EVIDENCIA",
            "DESACTIVAR_EVIDENCIA",
            "COMPLETAR_EVIDENCIA_PENDIENTE",
          ],
        },
      },
      select: {
        id: true,
        evaluacionId: true,
        accion: true,
        descripcion: true,
        createdAt: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const eventosEvidencia = historialEvidencias.map(
    (registro) => ({
      id: `EVIDENCIA:${registro.id}`,
      tipo: "EVIDENCIA",
      titulo: tituloEventoEvidencia(registro.accion),
      descripcion:
        registro.descripcion ??
        "Se registró un movimiento de evidencia.",
      estado: registro.accion,
      createdAt: registro.createdAt.toISOString(),
      usuario: registro.usuario,
      referencia: {
        evaluacionId: registro.evaluacionId,
        revisionTecnicaId: null,
        compromisoId: null,
      },
    })
  );

  const trazabilidad = [
    ...resultado.trazabilidad,
    ...eventosEvidencia,
  ].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return {
    ...resultado,
    trazabilidad,
  };
}

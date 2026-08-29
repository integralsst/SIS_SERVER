import {
  EstadoGestionSgsst,
  EstadoRegistro,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import {
  resolverVigenciaEvaluacion,
} from "../../utils/vigencia-evaluacion";
import {
  asegurarEmpresaAccesible,
  listarEmpresasAccesibles,
} from "../empresas/acceso-empresas.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";

export interface AlertaVigencia {
  id: string;
  compromisoId: string;
  tipo: "VIGENCIA_POR_VENCER" | "VIGENCIA_VENCIDA";
  nivel: NivelAlerta;
  titulo: string;
  descripcion: string;
  empresa: {
    id: string;
    nombre: string;
  };
  aspecto: {
    id: number;
    nombre: string;
  };
  fechaLimite: string;
  accion: {
    etiqueta: string;
    ruta: string;
  };
}

interface OpcionesAlertasVigencia {
  empresaId?: string;
  limiteConsulta?: number | null;
}

const ROLES_CON_ACCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const FORMATO_ANIO_OPERATIVO = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  year: "numeric",
});

function resolverTake(
  opciones: OpcionesAlertasVigencia
): number | undefined {
  return opciones.limiteConsulta === null
    ? undefined
    : opciones.limiteConsulta ?? 100;
}

function rutaEvaluacion(
  empresaId: string,
  aspectoNombre: string
): string {
  const query = new URLSearchParams({
    aspecto: aspectoNombre,
  });

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

function formatearFechaCalendario(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

function claveEmpresaAspecto(
  empresaId: string,
  identidadHistorica: string
): string {
  return `${empresaId}\u0000${identidadHistorica}`;
}

async function listar(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasVigencia = {}
): Promise<AlertaVigencia[]> {
  if (!ROLES_CON_ACCION.includes(usuario.rol)) {
    return [];
  }

  const empresas = opciones.empresaId
    ? [await asegurarEmpresaAccesible(usuario, opciones.empresaId)]
    : await listarEmpresasAccesibles(usuario);

  if (empresas.length === 0) {
    return [];
  }

  const ahora = new Date();
  const anioOperativo = Number(FORMATO_ANIO_OPERATIVO.format(ahora));
  const fechaCorte = construirCorteAnual(anioOperativo);

  let versionAplicable: Awaited<
    ReturnType<typeof servicioPeriodosEvaluacion.resolverVersionParaFecha>
  >;

  try {
    versionAplicable =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(fechaCorte);
  } catch (error) {
    if (
      error instanceof ErrorEvaluacion &&
      error.code === "VERSION_NO_DISPONIBLE"
    ) {
      return [];
    }

    throw error;
  }

  const tareas = await prisma.supermatrizTarea.findMany({
    where: {
      versionSupermatrizId: versionAplicable.id,
      estado: EstadoRegistro.ACTIVO,
      aspecto: {
        estado: EstadoRegistro.ACTIVO,
      },
    },
    select: {
      aspecto: {
        select: {
          id: true,
          identidadHistorica: true,
          nombre: true,
          configuracion: {
            select: {
              esEvergreen: true,
            },
          },
          configuracionVigencia: true,
        },
      },
    },
  });

  const aspectoPorIdentidad = new Map(
    tareas.map(({ aspecto }) => [
      aspecto.identidadHistorica,
      aspecto,
    ])
  );
  const identidades = [...aspectoPorIdentidad.keys()];

  if (identidades.length === 0) {
    return [];
  }

  const empresaIds = empresas.map((empresa) => empresa.id);
  const empresaPorId = new Map(
    empresas.map((empresa) => [empresa.id, empresa])
  );

  const candidatos = await prisma.evaluacionAspecto.findMany({
    where: {
      aspecto: {
        identidadHistorica: {
          in: identidades,
        },
      },
      gestion: {
        estado: EstadoGestionSgsst.FINALIZADA,
        valida: true,
        fechaGestion: {
          lte: fechaCorte,
        },
        empresaPeriodo: {
          empresaId: {
            in: empresaIds,
          },
        },
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
    select: {
      id: true,
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
      gestion: {
        select: {
          empresaPeriodo: {
            select: {
              empresaId: true,
            },
          },
        },
      },
    },
  });

  const evaluacionIdPorClave = new Map<string, string>();

  for (const candidato of candidatos) {
    const empresaId = candidato.gestion.empresaPeriodo.empresaId;
    const identidad = candidato.aspecto.identidadHistorica;
    const clave = claveEmpresaAspecto(empresaId, identidad);

    if (!evaluacionIdPorClave.has(clave)) {
      evaluacionIdPorClave.set(clave, candidato.id);
    }
  }

  const evaluacionIds = [...evaluacionIdPorClave.values()];

  if (evaluacionIds.length === 0) {
    return [];
  }

  const evaluaciones = await prisma.evaluacionAspecto.findMany({
    where: {
      id: {
        in: evaluacionIds,
      },
    },
    select: {
      id: true,
      estadoCumplimiento: true,
      fechaDocumento: true,
      fechaVencimientoCalculada: true,
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
      gestion: {
        select: {
          empresaPeriodo: {
            select: {
              empresaId: true,
            },
          },
        },
      },
    },
  });

  const alertas = evaluaciones.flatMap((evaluacion) => {
    const empresaId = evaluacion.gestion.empresaPeriodo.empresaId;
    const empresa = empresaPorId.get(empresaId);
    const aspecto = aspectoPorIdentidad.get(
      evaluacion.aspecto.identidadHistorica
    );

    if (!empresa || !aspecto) {
      return [];
    }

    const detalle = resolverVigenciaEvaluacion({
      evaluacion: {
        estadoCumplimiento: evaluacion.estadoCumplimiento,
        fechaDocumento: evaluacion.fechaDocumento,
        fechaVencimientoCalculada:
          evaluacion.fechaVencimientoCalculada,
      },
      configuracion: aspecto.configuracionVigencia,
      esEvergreen: aspecto.configuracion?.esEvergreen ?? false,
      hoy: fechaCorte,
    });

    if (
      (detalle.estado !== "POR_VENCER" && detalle.estado !== "VENCIDO") ||
      !detalle.fechaVencimiento
    ) {
      return [];
    }

    const vencimiento = formatearFechaCalendario(
      detalle.fechaVencimiento
    );
    const vencida = detalle.estado === "VENCIDO";

    return [
      {
        id: `VIGENCIA:${evaluacion.id}`,
        compromisoId: evaluacion.id,
        tipo: vencida
          ? "VIGENCIA_VENCIDA"
          : "VIGENCIA_POR_VENCER",
        nivel: vencida ? "ALTA" : "MEDIA",
        titulo: vencida
          ? "Vigencia vencida"
          : "Vigencia próxima a vencer",
        descripcion: vencida
          ? `${empresa.nombre}: “${aspecto.nombre}” venció el ${vencimiento}. Registra una nueva evaluación cuando actualices el soporte.`
          : `${empresa.nombre}: “${aspecto.nombre}” vence el ${vencimiento}. ${detalle.descripcion}`,
        empresa: {
          id: empresa.id,
          nombre: empresa.nombre,
        },
        aspecto: {
          id: aspecto.id,
          nombre: aspecto.nombre,
        },
        fechaLimite: detalle.fechaVencimiento.toISOString(),
        accion: {
          etiqueta: "Ver aspecto",
          ruta: rutaEvaluacion(empresa.id, aspecto.nombre),
        },
      } satisfies AlertaVigencia,
    ];
  });

  alertas.sort((a, b) => {
    if (a.nivel !== b.nivel) {
      return a.nivel === "ALTA" ? -1 : 1;
    }

    return a.fechaLimite.localeCompare(b.fechaLimite);
  });

  const take = resolverTake(opciones);
  return take ? alertas.slice(0, take) : alertas;
}

export const servicioAlertasVigencias = {
  listar,
};

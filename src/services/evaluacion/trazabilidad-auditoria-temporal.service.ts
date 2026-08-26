import { prisma } from "../../lib/prisma";
import type { EventoTrazabilidadAspecto } from "./trazabilidad-aspecto.service";

interface ContextoAuditoriaTemporal {
  empresaId: string;
  tareaId: number;
  fechaCorte: Date;
}

interface ResultadoConTrazabilidad {
  trazabilidad: EventoTrazabilidadAspecto[];
  [key: string]: unknown;
}

function eventoAuditoria(
  data: Omit<EventoTrazabilidadAspecto, "descripcion"> & {
    descripcion?: string | null;
  }
): EventoTrazabilidadAspecto {
  return {
    ...data,
    descripcion:
      data.descripcion?.trim() ||
      "Movimiento registrado en la trazabilidad del aspecto.",
  };
}

async function cargarEventosAuditoriaTemporal(
  contexto: ContextoAuditoriaTemporal
): Promise<EventoTrazabilidadAspecto[]> {
  const tarea = await prisma.supermatrizTarea.findUnique({
    where: { id: contexto.tareaId },
    select: {
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
    },
  });

  if (!tarea) return [];

  const hallazgos = await prisma.hallazgoAuditoria.findMany({
    where: {
      aspecto: {
        is: {
          identidadHistorica:
            tarea.aspecto.identidadHistorica,
        },
      },
      auditoria: {
        is: {
          fechaAuditoria: {
            lte: contexto.fechaCorte,
          },
          empresaPeriodo: {
            is: {
              empresaId: contexto.empresaId,
            },
          },
        },
      },
    },
    include: {
      creadoPor: {
        select: { id: true, nombre: true },
      },
      auditoria: {
        select: {
          id: true,
          titulo: true,
          estado: true,
        },
      },
      recomendaciones: {
        orderBy: { createdAt: "asc" },
        include: {
          creadoPor: {
            select: { id: true, nombre: true },
          },
        },
      },
      seguimientos: {
        orderBy: { createdAt: "asc" },
        include: {
          usuario: {
            select: { id: true, nombre: true },
          },
          recomendacion: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const eventos: EventoTrazabilidadAspecto[] = [];

  for (const hallazgo of hallazgos) {
    eventos.push(
      eventoAuditoria({
        id: `AUDITORIA_HALLAZGO:${hallazgo.id}`,
        tipo: "AUDITORIA",
        titulo: "Hallazgo de auditoría registrado",
        descripcion: `${hallazgo.titulo}. ${hallazgo.descripcion}`,
        estado: hallazgo.estado,
        createdAt: hallazgo.createdAt.toISOString(),
        usuario: hallazgo.creadoPor,
        referencia: {
          evaluacionId: null,
          revisionTecnicaId: null,
          compromisoId: null,
          auditoriaId: hallazgo.auditoria.id,
          hallazgoId: hallazgo.id,
        },
      })
    );

    for (const recomendacion of hallazgo.recomendaciones) {
      eventos.push(
        eventoAuditoria({
          id: `AUDITORIA_RECOMENDACION:${recomendacion.id}`,
          tipo: "AUDITORIA",
          titulo: "Recomendación de auditoría registrada",
          descripcion: recomendacion.descripcion,
          estado: recomendacion.estado,
          createdAt: recomendacion.createdAt.toISOString(),
          usuario: recomendacion.creadoPor,
          referencia: {
            evaluacionId: null,
            revisionTecnicaId: null,
            compromisoId: null,
            auditoriaId: hallazgo.auditoria.id,
            hallazgoId: hallazgo.id,
          },
        })
      );
    }

    for (const seguimiento of hallazgo.seguimientos) {
      const estado =
        seguimiento.estadoRecomendacion ??
        seguimiento.estadoHallazgo ??
        hallazgo.estado;

      eventos.push(
        eventoAuditoria({
          id: `AUDITORIA_SEGUIMIENTO:${seguimiento.id}`,
          tipo: "AUDITORIA",
          titulo: seguimiento.recomendacion
            ? "Seguimiento de recomendación de auditoría"
            : "Seguimiento de hallazgo de auditoría",
          descripcion: seguimiento.descripcion,
          estado,
          createdAt: seguimiento.createdAt.toISOString(),
          usuario: seguimiento.usuario,
          referencia: {
            evaluacionId: null,
            revisionTecnicaId: null,
            compromisoId: null,
            auditoriaId: hallazgo.auditoria.id,
            hallazgoId: hallazgo.id,
          },
        })
      );
    }
  }

  return eventos;
}

export async function enriquecerTrazabilidadConAuditoriaTemporal<
  T extends ResultadoConTrazabilidad,
>(
  resultado: T,
  contexto: ContextoAuditoriaTemporal
): Promise<T> {
  const eventosAuditoria =
    await cargarEventosAuditoriaTemporal(contexto);

  if (eventosAuditoria.length === 0) {
    return resultado;
  }

  return {
    ...resultado,
    trazabilidad: [
      ...resultado.trazabilidad,
      ...eventosAuditoria,
    ].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    ),
  };
}

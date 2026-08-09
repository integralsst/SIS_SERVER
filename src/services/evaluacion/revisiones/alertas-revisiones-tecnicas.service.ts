import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import type { AlertaControlEvaluacion } from "../alertas-control-evaluacion.service";

const ROLES_RESOLUCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const ROLES_INTERNOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

function rutaRevisiones(
  empresaId: string,
  anio: number,
  estado: "PENDIENTE" | "REQUIERE_AJUSTES",
  revisionId: string
): string {
  const query = new URLSearchParams({
    anio: String(anio),
    revisiones: "1",
    revisionEstado: estado,
    revisionId,
  });

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

async function alertasPendientesDeResolver(
  usuario: UsuarioSesionEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (!ROLES_RESOLUCION.includes(usuario.rol)) {
    return [];
  }

  const revisiones =
    await prisma.revisionTecnicaEvaluacion.findMany({
      where: {
        estado: EstadoRevisionTecnica.PENDIENTE,
        evaluacion: {
          gestion: {
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
            empresaPeriodo: {
              empresa: {
                activo: true,
              },
            },
          },
        },
      },
      orderBy: {
        solicitadaEn: "asc",
      },
      take: 100,
      select: {
        id: true,
        solicitadaEn: true,
        motivoSolicitud: true,
        solicitadaPor: {
          select: {
            nombre: true,
          },
        },
        evaluacion: {
          select: {
            aspecto: {
              select: {
                id: true,
                nombre: true,
              },
            },
            gestion: {
              select: {
                empresaPeriodo: {
                  select: {
                    anio: true,
                    empresa: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  return revisiones.map((revision) => {
    const periodo =
      revision.evaluacion.gestion.empresaPeriodo;

    return {
      id: `REVISION_TECNICA_PENDIENTE:${revision.id}`,
      compromisoId: revision.id,
      tipo: "REVISION_TECNICA_PENDIENTE",
      nivel: "MEDIA",
      titulo: "Revisión técnica pendiente",
      descripcion: `${periodo.empresa.nombre}: revisa “${revision.evaluacion.aspecto.nombre}”, solicitada por ${revision.solicitadaPor.nombre}.`,
      empresa: periodo.empresa,
      aspecto: revision.evaluacion.aspecto,
      fechaLimite: revision.solicitadaEn.toISOString(),
      accion: {
        etiqueta: "Revisar técnicamente",
        ruta: rutaRevisiones(
          periodo.empresa.id,
          periodo.anio,
          "PENDIENTE",
          revision.id
        ),
      },
    } satisfies AlertaControlEvaluacion;
  });
}

async function alertasQueRequierenCorreccion(
  usuario: UsuarioSesionEvaluacion
): Promise<AlertaControlEvaluacion[]> {
  if (!ROLES_INTERNOS.includes(usuario.rol)) {
    return [];
  }

  const revisiones =
    await prisma.revisionTecnicaEvaluacion.findMany({
      where: {
        estado: EstadoRevisionTecnica.REQUIERE_AJUSTES,
        solicitadaPorUsuarioId: usuario.usuarioId,
        revisadaEn: {
          not: null,
        },
        evaluacion: {
          gestion: {
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
            empresaPeriodo: {
              empresa: {
                activo: true,
              },
            },
          },
        },
      },
      orderBy: {
        revisadaEn: "desc",
      },
      take: 100,
      select: {
        id: true,
        revisadaEn: true,
        conceptoTecnico: true,
        evaluacion: {
          select: {
            aspectoId: true,
            aspecto: {
              select: {
                id: true,
                nombre: true,
              },
            },
            gestion: {
              select: {
                empresaPeriodoId: true,
                empresaPeriodo: {
                  select: {
                    anio: true,
                    empresa: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  if (revisiones.length === 0) {
    return [];
  }

  const correcciones = await prisma.evaluacionAspecto.findMany({
    where: {
      OR: revisiones
        .filter(
          (
            revision
          ): revision is typeof revision & {
            revisadaEn: Date;
          } => Boolean(revision.revisadaEn)
        )
        .map((revision) => ({
          aspectoId: revision.evaluacion.aspectoId,
          createdAt: {
            gt: revision.revisadaEn,
          },
          gestion: {
            empresaPeriodoId:
              revision.evaluacion.gestion.empresaPeriodoId,
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
          },
        })),
    },
    select: {
      aspectoId: true,
      createdAt: true,
      gestion: {
        select: {
          empresaPeriodoId: true,
        },
      },
    },
  });

  return revisiones
    .filter((revision) => {
      if (!revision.revisadaEn) return false;

      return !correcciones.some(
        (correccion) =>
          correccion.aspectoId ===
            revision.evaluacion.aspectoId &&
          correccion.gestion.empresaPeriodoId ===
            revision.evaluacion.gestion.empresaPeriodoId &&
          correccion.createdAt > revision.revisadaEn
      );
    })
    .map((revision) => {
      const periodo =
        revision.evaluacion.gestion.empresaPeriodo;

      return {
        id: `REVISION_TECNICA_AJUSTES:${revision.id}`,
        compromisoId: revision.id,
        tipo: "REVISION_TECNICA_REQUIERE_AJUSTES",
        nivel: "ALTA",
        titulo: "Revisión técnica requiere corrección",
        descripcion:
          revision.conceptoTecnico ||
          `${periodo.empresa.nombre}: registra una nueva evaluación para corregir “${revision.evaluacion.aspecto.nombre}”.`,
        empresa: periodo.empresa,
        aspecto: revision.evaluacion.aspecto,
        fechaLimite:
          revision.revisadaEn?.toISOString() ??
          new Date().toISOString(),
        accion: {
          etiqueta: "Ver y corregir",
          ruta: rutaRevisiones(
            periodo.empresa.id,
            periodo.anio,
            "REQUIERE_AJUSTES",
            revision.id
          ),
        },
      } satisfies AlertaControlEvaluacion;
    });
}

export const servicioAlertasRevisionesTecnicas = {
  listar: async (
    usuario: UsuarioSesionEvaluacion
  ): Promise<AlertaControlEvaluacion[]> => {
    const [pendientes, ajustes] = await Promise.all([
      alertasPendientesDeResolver(usuario),
      alertasQueRequierenCorreccion(usuario),
    ]);

    return [...pendientes, ...ajustes];
  },
};

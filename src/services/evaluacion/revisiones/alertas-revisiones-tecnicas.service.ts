import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import type { AlertaControlEvaluacion } from "../alertas-control-evaluacion.service";
import { accionVinculoCorreccionRevision } from "./revision-tecnica-vinculo";

export interface OpcionesAlertasRevisionesTecnicas {
  empresaId?: string;
  limiteConsulta?: number | null;
}

const ROLES_RESOLUCION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const ROLES_INTERNOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const ROLES_CON_ACCESO_GLOBAL: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function resolverTake(
  opciones: OpcionesAlertasRevisionesTecnicas
): number | undefined {
  return opciones.limiteConsulta === null
    ? undefined
    : opciones.limiteConsulta ?? 100;
}

function filtroAsignacionEmpresa(
  usuario: UsuarioSesionEvaluacion
) {
  if (ROLES_CON_ACCESO_GLOBAL.includes(usuario.rol)) {
    return {};
  }

  if (
    (usuario.rol === RolUsuario.COORDINADOR ||
      usuario.rol === RolUsuario.PROFESIONAL) &&
    usuario.profesionalId
  ) {
    return {
      asignacionesProfesionales: {
        some: {
          profesionalId: usuario.profesionalId,
          activo: true,
          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte: new Date(),
              },
            },
          ],
        },
      },
    };
  }

  return {
    id: "__EMPRESA_NO_AUTORIZADA__",
  };
}

function rutaRevisiones(
  empresaId: string,
  anio: number,
  estado: "PENDIENTE" | "REQUIERE_AJUSTES",
  revisionId: string,
  gestionId?: string | null
): string {
  const query = new URLSearchParams({
    anio: String(anio),
    revisiones: "1",
    revisionEstado: estado,
    revisionId,
  });

  if (gestionId) {
    query.set("gestionId", gestionId);
  }

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

async function alertasPendientesDeResolver(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasRevisionesTecnicas
): Promise<AlertaControlEvaluacion[]> {
  if (!ROLES_RESOLUCION.includes(usuario.rol)) {
    return [];
  }

  if (
    usuario.rol === RolUsuario.COORDINADOR &&
    !usuario.profesionalId
  ) {
    return [];
  }

  const revisiones = await prisma.revisionTecnicaEvaluacion.findMany({
    where: {
      estado: EstadoRevisionTecnica.PENDIENTE,
      solicitadaPorUsuarioId: {
        not: usuario.usuarioId,
      },
      evaluacion: {
        usuarioRegistradorId: {
          not: usuario.usuarioId,
        },
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          empresaPeriodo: {
            empresa: {
              activo: true,
              ...(opciones.empresaId ? { id: opciones.empresaId } : {}),
              ...filtroAsignacionEmpresa(usuario),
            },
          },
        },
      },
    },
    orderBy: { solicitadaEn: "asc" },
    take: resolverTake(opciones),
    select: {
      id: true,
      solicitadaEn: true,
      solicitadaPor: { select: { nombre: true } },
      evaluacion: {
        select: {
          aspecto: { select: { id: true, nombre: true } },
          gestion: {
            select: {
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return revisiones.map((revision) => {
    const periodo = revision.evaluacion.gestion.empresaPeriodo;

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
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesAlertasRevisionesTecnicas
): Promise<AlertaControlEvaluacion[]> {
  if (!ROLES_INTERNOS.includes(usuario.rol)) {
    return [];
  }

  if (
    (usuario.rol === RolUsuario.COORDINADOR ||
      usuario.rol === RolUsuario.PROFESIONAL) &&
    !usuario.profesionalId
  ) {
    return [];
  }

  const revisiones = await prisma.revisionTecnicaEvaluacion.findMany({
    where: {
      estado: EstadoRevisionTecnica.REQUIERE_AJUSTES,
      revisadaEn: { not: null },
      OR: [
        {
          evaluacion: {
            usuarioRegistradorId: usuario.usuarioId,
          },
        },
        {
          evaluacion: {
            gestion: {
              participantes: {
                some: {
                  esLider: true,
                  activo: true,
                  profesional: {
                    usuarioId: usuario.usuarioId,
                  },
                },
              },
            },
          },
        },
        {
          evaluacion: {
            gestion: {
              usuarioCreadorId: usuario.usuarioId,
              participantes: {
                none: {
                  esLider: true,
                  activo: true,
                },
              },
            },
          },
        },
      ],
      evaluacion: {
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          empresaPeriodo: {
            empresa: {
              activo: true,
              ...(opciones.empresaId ? { id: opciones.empresaId } : {}),
              ...filtroAsignacionEmpresa(usuario),
            },
          },
        },
      },
    },
    orderBy: { revisadaEn: "desc" },
    take: resolverTake(opciones),
    select: {
      id: true,
      revisadaEn: true,
      conceptoTecnico: true,
      evaluacion: {
        select: {
          aspectoId: true,
          aspecto: { select: { id: true, nombre: true } },
          gestion: {
            select: {
              empresaPeriodoId: true,
              empresaPeriodo: {
                select: {
                  anio: true,
                  empresa: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (revisiones.length === 0) return [];

  const accionesVinculo = revisiones.map((revision) =>
    accionVinculoCorreccionRevision(revision.id)
  );
  const profesionalActualId =
    usuario.profesionalId ?? "__SIN_PERFIL_PROFESIONAL__";

  const vinculos = await prisma.historialEvaluacion.findMany({
    where: {
      accion: {
        in: accionesVinculo,
      },
      gestion: {
        valida: true,
        estado: {
          in: [
            EstadoGestionSgsst.BORRADOR,
            EstadoGestionSgsst.FINALIZADA,
          ],
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      accion: true,
      gestion: {
        select: {
          id: true,
          estado: true,
          participantes: {
            where: {
              profesionalId: profesionalActualId,
              activo: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const revisionesSinVinculoExplicito = revisiones.filter(
    (revision) =>
      !vinculos.some(
        (vinculo) =>
          vinculo.accion ===
          accionVinculoCorreccionRevision(revision.id)
      )
  );

  const condicionesCorreccion =
    revisionesSinVinculoExplicito.flatMap((revision) =>
      revision.revisadaEn
        ? [
            {
              aspectoId: revision.evaluacion.aspectoId,
              createdAt: { gt: revision.revisadaEn },
              gestion: {
                empresaPeriodoId:
                  revision.evaluacion.gestion.empresaPeriodoId,
                estado: EstadoGestionSgsst.FINALIZADA,
                valida: true,
              },
            },
          ]
        : []
    );

  const correccionesHistoricas = condicionesCorreccion.length
    ? await prisma.evaluacionAspecto.findMany({
        where: { OR: condicionesCorreccion },
        select: {
          aspectoId: true,
          createdAt: true,
          gestion: { select: { empresaPeriodoId: true } },
        },
      })
    : [];

  return revisiones
    .filter((revision) => {
      const accionVinculo =
        accionVinculoCorreccionRevision(revision.id);
      const vinculosRevision = vinculos.filter(
        (vinculo) => vinculo.accion === accionVinculo
      );

      if (
        vinculosRevision.some(
          (vinculo) =>
            vinculo.gestion.estado ===
            EstadoGestionSgsst.FINALIZADA
        )
      ) {
        return false;
      }

      if (vinculosRevision.length > 0) {
        return true;
      }

      const revisadaEn = revision.revisadaEn;
      if (!revisadaEn) return false;

      return !correccionesHistoricas.some(
        (correccion) =>
          correccion.aspectoId === revision.evaluacion.aspectoId &&
          correccion.gestion.empresaPeriodoId ===
            revision.evaluacion.gestion.empresaPeriodoId &&
          correccion.createdAt > revisadaEn
      );
    })
    .map((revision) => {
      const periodo = revision.evaluacion.gestion.empresaPeriodo;
      const accionVinculo =
        accionVinculoCorreccionRevision(revision.id);
      const vinculoBorrador = vinculos.find(
        (vinculo) =>
          vinculo.accion === accionVinculo &&
          vinculo.gestion.estado === EstadoGestionSgsst.BORRADOR
      );
      const puedeAbrirBorradorExacto = Boolean(
        vinculoBorrador &&
          (ROLES_CON_ACCESO_GLOBAL.includes(usuario.rol) ||
            vinculoBorrador.gestion.participantes.length > 0)
      );

      return {
        id: `REVISION_TECNICA_AJUSTES:${revision.id}`,
        compromisoId: revision.id,
        tipo: "REVISION_TECNICA_REQUIERE_AJUSTES",
        nivel: "ALTA",
        titulo: vinculoBorrador
          ? "Revisión técnica en corrección"
          : "Revisión técnica requiere corrección",
        descripcion:
          revision.conceptoTecnico ||
          `${periodo.empresa.nombre}: registra una nueva evaluación para corregir “${revision.evaluacion.aspecto.nombre}”.`,
        empresa: periodo.empresa,
        aspecto: revision.evaluacion.aspecto,
        fechaLimite:
          revision.revisadaEn?.toISOString() ?? new Date().toISOString(),
        accion: {
          etiqueta: vinculoBorrador
            ? "Continuar corrección"
            : "Ver y corregir",
          ruta: rutaRevisiones(
            periodo.empresa.id,
            periodo.anio,
            "REQUIERE_AJUSTES",
            revision.id,
            puedeAbrirBorradorExacto
              ? vinculoBorrador?.gestion.id
              : null
          ),
        },
      } satisfies AlertaControlEvaluacion;
    });
}

export const servicioAlertasRevisionesTecnicas = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesAlertasRevisionesTecnicas = {}
  ): Promise<AlertaControlEvaluacion[]> => {
    const [pendientes, ajustes] = await Promise.all([
      alertasPendientesDeResolver(usuario, opciones),
      alertasQueRequierenCorreccion(usuario, opciones),
    ]);

    return [...pendientes, ...ajustes];
  },
};

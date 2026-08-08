import {
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  EstadoSolicitudAmpliacionCompromiso,
  RolUsuario,
  TipoAprobadorAmpliacionCompromiso,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { construirAccesoDetalleCompromiso } from "./acceso-compromisos.service";
import { esRolSupervisorCompromiso } from "./acceso-operacion-compromisos.service";

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const ACCION_RELACION_ANTERIOR =
  "RELACIONAR_COMPROMISO_ANTERIOR";

function tipoDecisionPendiente(
  usuario: UsuarioSesionEvaluacion,
  decisiones: Array<{
    tipoAprobador: TipoAprobadorAmpliacionCompromiso;
  }>
): TipoAprobadorAmpliacionCompromiso | null {
  const tipo =
    usuario.rol === RolUsuario.COORDINADOR
      ? TipoAprobadorAmpliacionCompromiso.COORDINADOR
      : ROLES_ADMINISTRADOR.includes(usuario.rol)
        ? TipoAprobadorAmpliacionCompromiso.ADMINISTRADOR
        : null;

  if (!tipo) return null;

  return decisiones.some(
    (decision) => decision.tipoAprobador === tipo
  )
    ? null
    : tipo;
}

export async function obtenerAdministracionCompromiso(
  compromisoId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const accesoDetalle =
    construirAccesoDetalleCompromiso(usuario);
  const compromiso = await prisma.compromiso.findFirst({
    where: {
      AND: [
        {
          id: compromisoId,
        },
        accesoDetalle,
      ],
    },
    select: {
      id: true,
      empresaId: true,
      descripcion: true,
      fechaLimite: true,
      estado: true,
      createdAt: true,
      canceladoEn: true,
      motivoCancelacion: true,
      canceladoPor: {
        select: {
          id: true,
          nombre: true,
        },
      },
      responsables: {
        where: {
          estado: EstadoAsignacionCompromiso.ASIGNADA,
        },
        select: {
          usuarioResponsableId: true,
        },
      },
      solicitudesAmpliacion: {
        select: {
          id: true,
          numeroSolicitud: true,
          fechaLimiteAnterior: true,
          fechaLimiteSolicitada: true,
          justificacion: true,
          estado: true,
          solicitadaEn: true,
          resueltaEn: true,
          solicitadaPor: {
            select: {
              id: true,
              nombre: true,
              rol: true,
            },
          },
          decisiones: {
            select: {
              id: true,
              tipoAprobador: true,
              decision: true,
              observacion: true,
              decididaEn: true,
              decididaPor: {
                select: {
                  id: true,
                  nombre: true,
                  rol: true,
                },
              },
            },
            orderBy: {
              decididaEn: "asc",
            },
          },
        },
        orderBy: {
          numeroSolicitud: "desc",
        },
      },
      historial: {
        where: {
          accion: ACCION_RELACION_ANTERIOR,
          entidadTipo: "COMPROMISO_ANTERIOR",
        },
        select: {
          entidadId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!compromiso) {
    throw new ErrorEvaluacion(
      "El compromiso no existe o no está dentro de tu alcance.",
      404,
      "COMPROMISO_NO_ENCONTRADO"
    );
  }

  const anteriorId =
    compromiso.historial[0]?.entidadId ?? null;
  const vinculosPosteriores =
    await prisma.historialCompromiso.findMany({
      where: {
        accion: ACCION_RELACION_ANTERIOR,
        entidadTipo: "COMPROMISO_ANTERIOR",
        entidadId: compromiso.id,
      },
      select: {
        compromisoId: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  const posterioresIds = vinculosPosteriores.map(
    (vinculo) => vinculo.compromisoId
  );

  const [anterior, posteriores] = await Promise.all([
    anteriorId
      ? prisma.compromiso.findFirst({
          where: {
            AND: [
              {
                id: anteriorId,
              },
              accesoDetalle,
            ],
          },
          select: {
            id: true,
            descripcion: true,
            estado: true,
            fechaLimite: true,
            createdAt: true,
            cerradoEn: true,
            canceladoEn: true,
            gestionOrigen: {
              select: {
                empresaPeriodo: {
                  select: {
                    anio: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
    posterioresIds.length > 0
      ? prisma.compromiso.findMany({
          where: {
            AND: [
              {
                id: {
                  in: posterioresIds,
                },
              },
              accesoDetalle,
            ],
          },
          select: {
            id: true,
            descripcion: true,
            estado: true,
            fechaLimite: true,
            createdAt: true,
            cerradoEn: true,
            canceladoEn: true,
            gestionOrigen: {
              select: {
                empresaPeriodo: {
                  select: {
                    anio: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        })
      : Promise.resolve([]),
  ]);

  const solicitudPendiente =
    compromiso.solicitudesAmpliacion.find(
      (solicitud) =>
        solicitud.estado ===
        EstadoSolicitudAmpliacionCompromiso.PENDIENTE
    ) ?? null;
  const esResponsableActivo = compromiso.responsables.some(
    (responsable) =>
      responsable.usuarioResponsableId === usuario.usuarioId
  );
  const esSupervisor = esRolSupervisorCompromiso(usuario.rol);
  const estadoTerminal =
    compromiso.estado === EstadoCompromiso.CUMPLIDO ||
    compromiso.estado === EstadoCompromiso.CANCELADO;

  const serializarRelacionado = (
    relacionado: NonNullable<typeof anterior>
  ) => ({
    id: relacionado.id,
    descripcion: relacionado.descripcion,
    estado: relacionado.estado,
    fechaLimite: relacionado.fechaLimite.toISOString(),
    createdAt: relacionado.createdAt.toISOString(),
    cerradoEn: relacionado.cerradoEn?.toISOString() ?? null,
    canceladoEn:
      relacionado.canceladoEn?.toISOString() ?? null,
    anio:
      relacionado.gestionOrigen.empresaPeriodo.anio,
  });

  return {
    compromisoId: compromiso.id,
    fechaLimite: compromiso.fechaLimite.toISOString(),
    estado: compromiso.estado,
    cancelacion: {
      canceladoEn:
        compromiso.canceladoEn?.toISOString() ?? null,
      motivo: compromiso.motivoCancelacion,
      canceladoPor: compromiso.canceladoPor,
    },
    solicitudesAmpliacion:
      compromiso.solicitudesAmpliacion.map((solicitud) => ({
        ...solicitud,
        fechaLimiteAnterior:
          solicitud.fechaLimiteAnterior.toISOString(),
        fechaLimiteSolicitada:
          solicitud.fechaLimiteSolicitada.toISOString(),
        solicitadaEn: solicitud.solicitadaEn.toISOString(),
        resueltaEn:
          solicitud.resueltaEn?.toISOString() ?? null,
        decisiones: solicitud.decisiones.map((decision) => ({
          ...decision,
          decididaEn: decision.decididaEn.toISOString(),
        })),
      })),
    relacion: {
      anterior: anterior
        ? serializarRelacionado(anterior)
        : null,
      posteriores: posteriores.map(serializarRelacionado),
    },
    operacion: {
      puedeSolicitarAmpliacion:
        compromiso.estado === EstadoCompromiso.EN_EJECUCION &&
        esResponsableActivo &&
        !solicitudPendiente,
      tipoAprobadorAmpliacionPendiente:
        solicitudPendiente && esSupervisor
          ? tipoDecisionPendiente(
              usuario,
              solicitudPendiente.decisiones
            )
          : null,
      puedeCancelar: esSupervisor && !estadoTerminal,
    },
  };
}

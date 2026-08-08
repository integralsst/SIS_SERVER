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
import { correspondeAlMismoAspecto } from "../evaluacion/compromisos/identidad-aspecto-compromiso.service";
import { construirAccesoDetalleCompromiso } from "./acceso-compromisos.service";
import { esRolSupervisorCompromiso } from "./acceso-operacion-compromisos.service";

const ROLES_ADMINISTRADOR: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

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
  const compromiso = await prisma.compromiso.findFirst({
    where: {
      AND: [
        {
          id: compromisoId,
        },
        construirAccesoDetalleCompromiso(usuario),
      ],
    },
    select: {
      id: true,
      empresaId: true,
      aspectoId: true,
      aspectoCodigo: true,
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
      aspecto: {
        select: {
          id: true,
          codigo: true,
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
    },
  });

  if (!compromiso) {
    throw new ErrorEvaluacion(
      "El compromiso no existe o no está dentro de tu alcance.",
      404,
      "COMPROMISO_NO_ENCONTRADO"
    );
  }

  const candidatos = await prisma.compromiso.findMany({
    where: {
      empresaId: compromiso.empresaId,
      id: {
        not: compromiso.id,
      },
    },
    select: {
      id: true,
      aspectoId: true,
      aspectoCodigo: true,
      descripcion: true,
      estado: true,
      fechaLimite: true,
      createdAt: true,
      cerradoEn: true,
      canceladoEn: true,
      aspecto: {
        select: {
          nombre: true,
        },
      },
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
  });

  const relacionados = candidatos.filter((candidato) =>
    correspondeAlMismoAspecto(candidato, compromiso.aspecto)
  );
  const anteriores = relacionados.filter(
    (candidato) => candidato.createdAt < compromiso.createdAt
  );
  const posteriores = relacionados.filter(
    (candidato) => candidato.createdAt > compromiso.createdAt
  );
  const anterior = anteriores.at(-1) ?? null;
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
    relacionado: (typeof relacionados)[number]
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

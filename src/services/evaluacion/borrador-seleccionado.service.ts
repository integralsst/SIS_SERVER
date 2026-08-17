import {
  EstadoGestionSgsst,
  RolUsuario,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

const ROLES_ADMINISTRACION = new Set<RolUsuario>([
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
]);

function filtroAcceso(
  usuario: UsuarioSesionEvaluacion
): Prisma.GestionSgsstWhereInput {
  if (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  ) {
    return {
      id: "__sin_borrador_operativo__",
    };
  }

  if (
    (usuario.rol === RolUsuario.PROFESIONAL ||
      usuario.rol === RolUsuario.COORDINADOR) &&
    usuario.profesionalId
  ) {
    return {
      participantes: {
        some: {
          profesionalId: usuario.profesionalId,
          activo: true,
        },
      },
    };
  }

  if (ROLES_ADMINISTRACION.has(usuario.rol)) {
    return {};
  }

  return {
    usuarioCreadorId: usuario.usuarioId,
  };
}

export async function resolverBorradorSeleccionado(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion,
  gestionId?: string | null
) {
  const gestion = await prisma.gestionSgsst.findFirst({
    where: {
      empresaPeriodoId: periodoId,
      estado: EstadoGestionSgsst.BORRADOR,
      valida: true,
      ...(gestionId ? { id: gestionId } : {}),
      ...filtroAcceso(usuario),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fechaGestion: true,
      tipoActividad: true,
      estado: true,
      participantes: usuario.profesionalId
        ? {
            where: {
              profesionalId: usuario.profesionalId,
              activo: true,
            },
            select: {
              id: true,
              esLider: true,
              puedeEvaluar: true,
              puedeGestionarEvidencias: true,
            },
            take: 1,
          }
        : false,
    },
  });

  if (gestionId && !gestion) {
    throw new ErrorEvaluacion(
      "La gestión en borrador solicitada no está disponible para tu usuario en este periodo.",
      404,
      "GESTION_BORRADOR_NO_DISPONIBLE"
    );
  }

  return gestion;
}

import {
  EstadoGestionSgsst,
  RolUsuario,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { GESTION_ID_MODO_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";

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

const seleccionGestion = {
  id: true,
  fechaGestion: true,
  tipoActividad: true,
  estado: true,
} satisfies Prisma.GestionSgsstSelect;

async function buscarBorradorDisponible(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion
) {
  return prisma.gestionSgsst.findFirst({
    where: {
      empresaPeriodoId: periodoId,
      estado: EstadoGestionSgsst.BORRADOR,
      valida: true,
      ...filtroAcceso(usuario),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: seleccionGestion,
  });
}

export async function resolverBorradorSeleccionado(
  periodoId: string,
  usuario: UsuarioSesionEvaluacion,
  gestionId?: string | null
) {
  const periodo = await prisma.empresaPeriodo.findUnique({
    where: {
      id: periodoId,
    },
    select: {
      empresaId: true,
    },
  });

  if (!periodo) {
    throw new ErrorEvaluacion(
      "El periodo seleccionado no existe.",
      404,
      "PERIODO_NO_ENCONTRADO"
    );
  }

  await asegurarAccesoEmpresa(
    usuario,
    periodo.empresaId,
    "LECTURA"
  );

  // El drawer del flujo directo usa un marcador explícito para consultar
  // únicamente el estado oficial. Nunca debe heredar un borrador legado.
  if (gestionId === GESTION_ID_MODO_EVALUACION_DIRECTA) {
    return null;
  }

  if (!gestionId) {
    return buscarBorradorDisponible(periodoId, usuario);
  }

  const gestionSolicitada =
    await prisma.gestionSgsst.findFirst({
      where: {
        id: gestionId,
        empresaPeriodoId: periodoId,
        valida: true,
        ...filtroAcceso(usuario),
      },
      select: seleccionGestion,
    });

  if (!gestionSolicitada) {
    throw new ErrorEvaluacion(
      "La gestión solicitada no está disponible para tu usuario en este periodo.",
      404,
      "GESTION_NO_DISPONIBLE"
    );
  }

  if (
    gestionSolicitada.estado === EstadoGestionSgsst.BORRADOR
  ) {
    return gestionSolicitada;
  }

  if (
    gestionSolicitada.estado === EstadoGestionSgsst.FINALIZADA
  ) {
    /*
     * Durante la transición posterior a una finalización, la URL puede
     * conservar durante unos instantes el gestionId que acaba de cerrarse.
     * El detalle debe seguir disponible: si existe otro borrador accesible,
     * lo usamos como contexto operativo; si no existe, devolvemos null y los
     * servicios de detalle resolverán la última evaluación finalizada válida.
     */
    return buscarBorradorDisponible(periodoId, usuario);
  }

  throw new ErrorEvaluacion(
    "La gestión solicitada ya no está disponible como borrador operativo.",
    409,
    "GESTION_NO_OPERATIVA"
  );
}
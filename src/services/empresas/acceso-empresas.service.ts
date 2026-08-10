import { Prisma, RolUsuario } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

const ROLES_GLOBALES: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function filtroAsignacionVigente(
  profesionalId: string
): Prisma.EmpresaWhereInput {
  const ahora = new Date();

  return {
    asignacionesProfesionales: {
      some: {
        profesionalId,
        activo: true,
        OR: [
          { fechaFin: null },
          { fechaFin: { gte: ahora } },
        ],
      },
    },
  };
}

export function construirFiltroEmpresasAccesibles(
  usuario: UsuarioSesionEvaluacion
): Prisma.EmpresaWhereInput {
  if (ROLES_GLOBALES.includes(usuario.rol)) {
    return { activo: true };
  }

  if (
    usuario.rol === RolUsuario.PROFESIONAL ||
    usuario.rol === RolUsuario.COORDINADOR
  ) {
    if (!usuario.profesionalId) {
      throw new ErrorEvaluacion(
        "Tu usuario profesional o coordinador no tiene un perfil asociado.",
        403,
        "PROFESIONAL_NO_ASOCIADO"
      );
    }

    return {
      activo: true,
      ...filtroAsignacionVigente(usuario.profesionalId),
    };
  }

  if (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  ) {
    if (!usuario.empresaId) {
      throw new ErrorEvaluacion(
        "Tu usuario cliente no tiene una empresa asociada.",
        403,
        "EMPRESA_CLIENTE_NO_ASOCIADA"
      );
    }

    return {
      id: usuario.empresaId,
      activo: true,
    };
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso al centro de acciones.",
    403,
    "ROL_ACCIONES_NO_AUTORIZADO"
  );
}

export async function listarEmpresasAccesibles(
  usuario: UsuarioSesionEvaluacion,
  busqueda = ""
) {
  const filtroBusqueda: Prisma.EmpresaWhereInput | undefined =
    busqueda
      ? {
          OR: [
            { nombre: { contains: busqueda } },
            { nit: { contains: busqueda } },
            { ciudadPrincipal: { contains: busqueda } },
          ],
        }
      : undefined;

  return prisma.empresa.findMany({
    where: {
      AND: [
        construirFiltroEmpresasAccesibles(usuario),
        ...(filtroBusqueda ? [filtroBusqueda] : []),
      ],
    },
    select: {
      id: true,
      nombre: true,
      nit: true,
      ciudadPrincipal: true,
    },
    orderBy: { nombre: "asc" },
  });
}

export async function asegurarEmpresaAccesible(
  usuario: UsuarioSesionEvaluacion,
  empresaId: string
) {
  const empresa = await prisma.empresa.findFirst({
    where: {
      AND: [
        construirFiltroEmpresasAccesibles(usuario),
        { id: empresaId },
      ],
    },
    select: {
      id: true,
      nombre: true,
      nit: true,
      ciudadPrincipal: true,
    },
  });

  if (!empresa) {
    throw new ErrorEvaluacion(
      "No tienes acceso a la empresa seleccionada.",
      403,
      "EMPRESA_NO_AUTORIZADA"
    );
  }

  return empresa;
}

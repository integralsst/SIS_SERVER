import {
  EstadoAsignacionCompromiso,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import type {
  AlcanceConsultaCompromisos,
} from "../../types/compromisos/consulta-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

const ROLES_SUPERVISION_GLOBAL: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function filtroResponsableActual(
  usuarioId: string
): Prisma.CompromisoWhereInput {
  return {
    responsables: {
      some: {
        usuarioResponsableId: usuarioId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
    },
  };
}

function filtroEmpresasAsignadas(
  profesionalId: string
): Prisma.CompromisoWhereInput {
  const ahora = new Date();

  return {
    empresa: {
      asignacionesProfesionales: {
        some: {
          profesionalId,
          activo: true,
          OR: [
            {
              fechaFin: null,
            },
            {
              fechaFin: {
                gte: ahora,
              },
            },
          ],
        },
      },
    },
  };
}

function exigirPerfilProfesional(
  usuario: UsuarioSesionEvaluacion
): string {
  if (!usuario.profesionalId) {
    throw new ErrorEvaluacion(
      "Tu usuario no tiene un perfil profesional asociado.",
      403,
      "PROFESIONAL_NO_ASOCIADO"
    );
  }

  return usuario.profesionalId;
}

export function construirAccesoListadoCompromisos(
  usuario: UsuarioSesionEvaluacion,
  alcance: AlcanceConsultaCompromisos
): Prisma.CompromisoWhereInput {
  if (
    ROLES_SUPERVISION_GLOBAL.includes(
      usuario.rol
    )
  ) {
    return alcance === "MIS_COMPROMISOS"
      ? filtroResponsableActual(usuario.usuarioId)
      : {};
  }

  if (usuario.rol === RolUsuario.COORDINADOR) {
    const accesoEmpresas = filtroEmpresasAsignadas(
      exigirPerfilProfesional(usuario)
    );

    if (alcance === "MIS_COMPROMISOS") {
      return {
        AND: [
          accesoEmpresas,
          filtroResponsableActual(
            usuario.usuarioId
          ),
        ],
      };
    }

    return accesoEmpresas;
  }

  if (usuario.rol === RolUsuario.PROFESIONAL) {
    exigirPerfilProfesional(usuario);

    if (alcance !== "MIS_COMPROMISOS") {
      throw new ErrorEvaluacion(
        "El profesional solo puede consultar sus compromisos asignados.",
        403,
        "SUPERVISION_NO_AUTORIZADA"
      );
    }

    return filtroResponsableActual(
      usuario.usuarioId
    );
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso a la bandeja interna de compromisos.",
    403,
    "ROL_COMPROMISOS_NO_AUTORIZADO"
  );
}

export function construirAccesoDetalleCompromiso(
  usuario: UsuarioSesionEvaluacion
): Prisma.CompromisoWhereInput {
  if (
    ROLES_SUPERVISION_GLOBAL.includes(
      usuario.rol
    )
  ) {
    return {};
  }

  if (usuario.rol === RolUsuario.COORDINADOR) {
    return filtroEmpresasAsignadas(
      exigirPerfilProfesional(usuario)
    );
  }

  if (usuario.rol === RolUsuario.PROFESIONAL) {
    exigirPerfilProfesional(usuario);

    return filtroResponsableActual(
      usuario.usuarioId
    );
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso al detalle interno de compromisos.",
    403,
    "ROL_COMPROMISOS_NO_AUTORIZADO"
  );
}

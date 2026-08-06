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

const ROLES_CLIENTE: RolUsuario[] = [
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
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

function exigirEmpresaCliente(
  usuario: UsuarioSesionEvaluacion
): string {
  if (!usuario.empresaId) {
    throw new ErrorEvaluacion(
      "Tu usuario cliente no tiene una empresa asociada.",
      403,
      "EMPRESA_CLIENTE_NO_ASOCIADA"
    );
  }

  return usuario.empresaId;
}

function filtroParticipacionCliente(
  usuario: UsuarioSesionEvaluacion
): Prisma.CompromisoWhereInput {
  return {
    AND: [
      {
        empresaId: exigirEmpresaCliente(usuario),
      },
      filtroResponsableActual(usuario.usuarioId),
    ],
  };
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

  if (ROLES_CLIENTE.includes(usuario.rol)) {
    if (alcance !== "MIS_COMPROMISOS") {
      throw new ErrorEvaluacion(
        "Los usuarios cliente solo pueden consultar los compromisos que tienen asignados.",
        403,
        "SUPERVISION_CLIENTE_NO_AUTORIZADA"
      );
    }

    return filtroParticipacionCliente(usuario);
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

  if (ROLES_CLIENTE.includes(usuario.rol)) {
    return filtroParticipacionCliente(usuario);
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso al detalle interno de compromisos.",
    403,
    "ROL_COMPROMISOS_NO_AUTORIZADO"
  );
}

import { RolUsuario } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { TIPO_ACTIVIDAD_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";

const ROLES_INTERNOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const ROLES_CLIENTE: RolUsuario[] = [
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

export type CapacidadParticipanteGestion =
  | "EVALUAR"
  | "EVIDENCIAS"
  | "LIDER";

export async function asegurarAccesoEmpresa(
  usuario: UsuarioSesionEvaluacion,
  empresaId: string,
  modo: "LECTURA" | "ESCRITURA"
) {
  const empresa = await prisma.empresa.findUnique({
    where: {
      id: empresaId,
    },
    select: {
      id: true,
      nit: true,
      nombre: true,
      ciudadPrincipal: true,
      claseRiesgoPrincipal: true,
      activo: true,
    },
  });

  if (!empresa) {
    throw new ErrorEvaluacion(
      "La empresa seleccionada no existe.",
      404,
      "EMPRESA_NO_ENCONTRADA"
    );
  }

  if (!empresa.activo) {
    throw new ErrorEvaluacion(
      "La empresa seleccionada está inactiva.",
      409,
      "EMPRESA_INACTIVA"
    );
  }

  if (ROLES_INTERNOS.includes(usuario.rol)) {
    return empresa;
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

    const asignacion = await prisma.empresaProfesional.findFirst({
      where: {
        empresaId,
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
      select: {
        id: true,
      },
    });

    if (!asignacion) {
      throw new ErrorEvaluacion(
        "No tienes una asignación activa para evaluar esta empresa.",
        403,
        "EMPRESA_NO_ASIGNADA"
      );
    }

    return empresa;
  }

  if (ROLES_CLIENTE.includes(usuario.rol)) {
    if (usuario.empresaId !== empresaId) {
      throw new ErrorEvaluacion(
        "No tienes acceso a la información de esta empresa.",
        403,
        "EMPRESA_NO_AUTORIZADA"
      );
    }

    if (modo === "ESCRITURA") {
      throw new ErrorEvaluacion(
        "Los usuarios cliente solo pueden consultar la evaluación.",
        403,
        "EVALUACION_SOLO_LECTURA"
      );
    }

    return empresa;
  }

  throw new ErrorEvaluacion(
    "Tu rol no tiene acceso al módulo de evaluación.",
    403,
    "ROL_NO_AUTORIZADO"
  );
}

export async function asegurarAccesoPeriodo(
  usuario: UsuarioSesionEvaluacion,
  periodoId: string,
  modo: "LECTURA" | "ESCRITURA"
) {
  const periodo = await prisma.empresaPeriodo.findUnique({
    where: {
      id: periodoId,
    },
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          activo: true,
        },
      },
      versionSupermatriz: {
        select: {
          id: true,
          nombre: true,
          estado: true,
        },
      },
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
    modo
  );

  return periodo;
}

export async function asegurarAccesoGestion(
  usuario: UsuarioSesionEvaluacion,
  gestionId: string,
  modo: "LECTURA" | "ESCRITURA"
) {
  const gestion = await prisma.gestionSgsst.findUnique({
    where: {
      id: gestionId,
    },
    include: {
      empresaPeriodo: true,
    },
  });

  if (!gestion) {
    throw new ErrorEvaluacion(
      "La gestión seleccionada no existe.",
      404,
      "GESTION_NO_ENCONTRADA"
    );
  }

  await asegurarAccesoEmpresa(
    usuario,
    gestion.empresaPeriodo.empresaId,
    modo
  );

  if (
    modo === "ESCRITURA" &&
    usuario.rol === RolUsuario.PROFESIONAL
  ) {
    if (!usuario.profesionalId) {
      throw new ErrorEvaluacion(
        "Tu usuario profesional no tiene un perfil asociado.",
        403,
        "PROFESIONAL_NO_ASOCIADO"
      );
    }

    // Las nuevas evaluaciones directas no usan GestionParticipante. El
    // permiso proviene de la asignación EmpresaProfesional ya validada arriba.
    if (gestion.tipoActividad === TIPO_ACTIVIDAD_EVALUACION_DIRECTA) {
      return gestion;
    }

    const participante =
      await prisma.gestionParticipante.findFirst({
        where: {
          gestionId,
          profesionalId: usuario.profesionalId,
          activo: true,
        },
        select: {
          id: true,
        },
      });

    if (!participante) {
      throw new ErrorEvaluacion(
        "Solo puedes modificar gestiones en las que participas activamente.",
        403,
        "GESTION_SIN_PARTICIPACION"
      );
    }
  }

  return gestion;
}

export async function asegurarCapacidadParticipanteGestion(
  usuario: UsuarioSesionEvaluacion,
  gestionId: string,
  capacidad: CapacidadParticipanteGestion
) {
  if (ROLES_INTERNOS.includes(usuario.rol)) {
    return null;
  }

  if (
    usuario.rol !== RolUsuario.PROFESIONAL &&
    usuario.rol !== RolUsuario.COORDINADOR
  ) {
    throw new ErrorEvaluacion(
      "Tu rol no puede operar como participante de una gestión.",
      403,
      "PARTICIPACION_NO_AUTORIZADA"
    );
  }

  if (!usuario.profesionalId) {
    throw new ErrorEvaluacion(
      "Tu usuario no tiene un perfil profesional asociado.",
      403,
      "PROFESIONAL_NO_ASOCIADO"
    );
  }

  const gestion = await prisma.gestionSgsst.findUnique({
    where: { id: gestionId },
    select: {
      tipoActividad: true,
      empresaPeriodo: {
        select: { empresaId: true },
      },
    },
  });

  if (!gestion) {
    throw new ErrorEvaluacion(
      "La gestión seleccionada no existe.",
      404,
      "GESTION_NO_ENCONTRADA"
    );
  }

  if (
    gestion.tipoActividad === TIPO_ACTIVIDAD_EVALUACION_DIRECTA &&
    capacidad !== "LIDER"
  ) {
    await asegurarAccesoEmpresa(
      usuario,
      gestion.empresaPeriodo.empresaId,
      "ESCRITURA"
    );
    return null;
  }

  const participante = await prisma.gestionParticipante.findFirst({
    where: {
      gestionId,
      profesionalId: usuario.profesionalId,
      activo: true,
    },
    select: {
      id: true,
      esLider: true,
      puedeEvaluar: true,
      puedeGestionarEvidencias: true,
    },
  });

  if (!participante) {
    throw new ErrorEvaluacion(
      "Debes ser participante activo de la gestión para realizar esta operación.",
      403,
      "GESTION_SIN_PARTICIPACION"
    );
  }

  if (capacidad === "EVALUAR" && !participante.puedeEvaluar) {
    throw new ErrorEvaluacion(
      "Tu participación en esta gestión no permite registrar evaluaciones.",
      403,
      "PARTICIPANTE_SIN_PERMISO_EVALUAR"
    );
  }

  if (
    capacidad === "EVIDENCIAS" &&
    !participante.puedeGestionarEvidencias
  ) {
    throw new ErrorEvaluacion(
      "Tu participación en esta gestión no permite gestionar evidencias.",
      403,
      "PARTICIPANTE_SIN_PERMISO_EVIDENCIAS"
    );
  }

  if (capacidad === "LIDER" && !participante.esLider) {
    throw new ErrorEvaluacion(
      "Solo el líder de la gestión puede completar esta operación.",
      403,
      "PARTICIPANTE_NO_LIDER"
    );
  }

  return participante;
}

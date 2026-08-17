import {
  EstadoGestionSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ActualizarParticipanteGestionInput,
  CrearParticipanteGestionInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { asegurarAccesoGestion } from "./acceso-evaluacion.service";

const ROLES_ADMINISTRACION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function normalizarResponsabilidad(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const texto = value.trim();

  if (!texto) return null;

  if (texto.length > 2000) {
    throw new ErrorEvaluacion(
      "La responsabilidad del participante no puede superar los 2000 caracteres."
    );
  }

  return texto;
}

async function obtenerGestionParaEquipo(
  gestionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const gestion = await asegurarAccesoGestion(
    usuario,
    gestionId,
    "LECTURA"
  );

  if (!gestion.valida) {
    throw new ErrorEvaluacion(
      "La gestión está invalidada.",
      409,
      "GESTION_INVALIDADA"
    );
  }

  return gestion;
}

async function asegurarGestionEditable(
  gestionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const gestion = await obtenerGestionParaEquipo(
    gestionId,
    usuario
  );

  if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
    throw new ErrorEvaluacion(
      "El equipo solo puede modificarse mientras la gestión está en borrador.",
      409,
      "GESTION_NO_EDITABLE"
    );
  }

  return gestion;
}

async function puedeAdministrarEquipo(
  gestionId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<boolean> {
  if (ROLES_ADMINISTRACION.includes(usuario.rol)) {
    return true;
  }

  if (usuario.rol === RolUsuario.COORDINADOR) {
    return true;
  }

  if (
    usuario.rol !== RolUsuario.PROFESIONAL ||
    !usuario.profesionalId
  ) {
    return false;
  }

  const lider = await prisma.gestionParticipante.findFirst({
    where: {
      gestionId,
      profesionalId: usuario.profesionalId,
      activo: true,
      esLider: true,
    },
    select: {
      id: true,
    },
  });

  return Boolean(lider);
}

async function asegurarPuedeAdministrarEquipo(
  gestionId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<void> {
  if (await puedeAdministrarEquipo(gestionId, usuario)) {
    return;
  }

  throw new ErrorEvaluacion(
    "Solo el líder de la gestión, un coordinador o un administrador puede modificar el equipo.",
    403,
    "EQUIPO_GESTION_NO_AUTORIZADO"
  );
}

async function obtenerAsignacionProfesional(
  empresaId: string,
  profesionalId: string
) {
  const asignacion = await prisma.empresaProfesional.findFirst({
    where: {
      empresaId,
      profesionalId,
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
      profesional: {
        activo: true,
      },
    },
    include: {
      profesional: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          correo: true,
          cargo: true,
          profesion: true,
          rolProfesional: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              correo: true,
              rol: true,
              activo: true,
            },
          },
        },
      },
      categoriasGestion: {
        include: {
          categoriaGestion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
    },
  });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "El profesional seleccionado no tiene una asignación activa con esta empresa.",
      409,
      "PROFESIONAL_NO_ASIGNADO"
    );
  }

  return asignacion;
}

function validarCategoriaGestion(
  categoriaGestionId: number | null,
  asignacion: Awaited<ReturnType<typeof obtenerAsignacionProfesional>>
): void {
  if (!categoriaGestionId) return;

  const categoriasConfiguradas =
    asignacion.categoriasGestion.length > 0;

  if (!categoriasConfiguradas) {
    // Compatibilidad: las asignaciones históricas/demo no tenían categorías
    // configuradas. Mientras no se configure ninguna, no se bloquea el uso.
    return;
  }

  const compatible = asignacion.categoriasGestion.some(
    ({ categoriaGestionId: id }) => id === categoriaGestionId
  );

  if (!compatible) {
    throw new ErrorEvaluacion(
      "El profesional no tiene habilitada la categoría seleccionada para esta gestión.",
      409,
      "PROFESIONAL_CATEGORIA_NO_AUTORIZADA"
    );
  }
}

async function buscarConflictoBorrador(
  profesionalId: string,
  empresaPeriodoId: string,
  gestionIdExcluir: string
) {
  return prisma.gestionParticipante.findFirst({
    where: {
      profesionalId,
      activo: true,
      gestionId: {
        not: gestionIdExcluir,
      },
      gestion: {
        empresaPeriodoId,
        estado: EstadoGestionSgsst.BORRADOR,
        valida: true,
      },
    },
    select: {
      gestion: {
        select: {
          id: true,
          tipoActividad: true,
          fechaGestion: true,
        },
      },
    },
  });
}

function serializarParticipante(participante: {
  id: string;
  gestionId: string;
  profesionalId: string;
  esLider: boolean;
  puedeEvaluar: boolean;
  puedeGestionarEvidencias: boolean;
  responsabilidad: string | null;
  activo: boolean;
  fechaInicio: Date;
  fechaFin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profesional: {
    id: string;
    nombres: string;
    apellidos: string;
    correo: string;
    cargo: string | null;
    profesion: string | null;
    rolProfesional: string | null;
    usuario: {
      id: string;
      nombre: string;
      correo: string;
      rol: RolUsuario;
      activo: boolean;
    } | null;
  };
  asignadoPor: {
    id: string;
    nombre: string;
  };
  retiradoPor: {
    id: string;
    nombre: string;
  } | null;
}) {
  return {
    ...participante,
    fechaInicio: participante.fechaInicio.toISOString(),
    fechaFin: participante.fechaFin?.toISOString() ?? null,
    createdAt: participante.createdAt.toISOString(),
    updatedAt: participante.updatedAt.toISOString(),
  };
}

const includeParticipante = {
  profesional: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      correo: true,
      cargo: true,
      profesion: true,
      rolProfesional: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
          activo: true,
        },
      },
    },
  },
  asignadoPor: {
    select: {
      id: true,
      nombre: true,
    },
  },
  retiradoPor: {
    select: {
      id: true,
      nombre: true,
    },
  },
} as const;

export const servicioParticipantesGestion = {
  listar: async (
    gestionId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await obtenerGestionParaEquipo(
      gestionId,
      usuario
    );

    const participantes = await prisma.gestionParticipante.findMany({
      where: {
        gestionId,
      },
      orderBy: [
        {
          activo: "desc",
        },
        {
          esLider: "desc",
        },
        {
          fechaInicio: "asc",
        },
      ],
      include: includeParticipante,
    });

    return {
      gestion: {
        id: gestion.id,
        estado: gestion.estado,
        categoriaGestionId: gestion.categoriaGestionId,
      },
      puedeAdministrarEquipo:
        await puedeAdministrarEquipo(gestionId, usuario),
      participantes: participantes.map(serializarParticipante),
    };
  },

  listarDisponibles: async (
    gestionId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await asegurarGestionEditable(
      gestionId,
      usuario
    );
    await asegurarPuedeAdministrarEquipo(
      gestionId,
      usuario
    );

    const asignaciones = await prisma.empresaProfesional.findMany({
      where: {
        empresaId: gestion.empresaPeriodo.empresaId,
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
        profesional: {
          activo: true,
        },
      },
      orderBy: [
        {
          profesional: {
            apellidos: "asc",
          },
        },
        {
          profesional: {
            nombres: "asc",
          },
        },
      ],
      include: {
        profesional: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            correo: true,
            cargo: true,
            profesion: true,
            rolProfesional: true,
            usuario: {
              select: {
                id: true,
                nombre: true,
                correo: true,
                rol: true,
                activo: true,
              },
            },
          },
        },
        categoriasGestion: {
          include: {
            categoriaGestion: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    const participantesActivos =
      await prisma.gestionParticipante.findMany({
        where: {
          gestionId,
          activo: true,
        },
        select: {
          profesionalId: true,
        },
      });
    const activos = new Set(
      participantesActivos.map(({ profesionalId }) => profesionalId)
    );

    const resultado = [];

    for (const asignacion of asignaciones) {
      const conflicto = await buscarConflictoBorrador(
        asignacion.profesionalId,
        gestion.empresaPeriodoId,
        gestionId
      );
      const categorias = asignacion.categoriasGestion.map(
        ({ categoriaGestion }) => categoriaGestion
      );
      const categoriasConfiguradas = categorias.length > 0;
      const categoriaCompatible =
        !gestion.categoriaGestionId ||
        !categoriasConfiguradas ||
        categorias.some(
          ({ id }) => id === gestion.categoriaGestionId
        );

      resultado.push({
        profesional: asignacion.profesional,
        rolAsignacion: asignacion.rolAsignacion,
        esProfesionalAsignado:
          asignacion.esProfesionalAsignado,
        categorias,
        categoriasConfiguradas,
        categoriaCompatible,
        yaParticipa: activos.has(asignacion.profesionalId),
        conflictoBorrador: conflicto
          ? {
              gestionId: conflicto.gestion.id,
              tipoActividad: conflicto.gestion.tipoActividad,
              fechaGestion:
                conflicto.gestion.fechaGestion.toISOString(),
            }
          : null,
        disponibleParaAgregar:
          !activos.has(asignacion.profesionalId) &&
          !conflicto &&
          categoriaCompatible,
      });
    }

    return resultado;
  },

  agregar: async (
    gestionId: string,
    data: CrearParticipanteGestionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const gestion = await asegurarGestionEditable(
      gestionId,
      usuario
    );
    await asegurarPuedeAdministrarEquipo(
      gestionId,
      usuario
    );

    if (
      typeof data.profesionalId !== "string" ||
      !data.profesionalId.trim()
    ) {
      throw new ErrorEvaluacion(
        "Debes seleccionar un profesional."
      );
    }

    const profesionalId = data.profesionalId.trim();
    const asignacion = await obtenerAsignacionProfesional(
      gestion.empresaPeriodo.empresaId,
      profesionalId
    );

    validarCategoriaGestion(
      gestion.categoriaGestionId,
      asignacion
    );

    const yaParticipa = await prisma.gestionParticipante.findFirst({
      where: {
        gestionId,
        profesionalId,
        activo: true,
      },
      select: {
        id: true,
      },
    });

    if (yaParticipa) {
      throw new ErrorEvaluacion(
        "El profesional ya participa activamente en esta gestión.",
        409,
        "PARTICIPANTE_YA_ACTIVO"
      );
    }

    const conflicto = await buscarConflictoBorrador(
      profesionalId,
      gestion.empresaPeriodoId,
      gestionId
    );

    if (conflicto) {
      throw new ErrorEvaluacion(
        `El profesional ya participa en otra gestión en borrador de este periodo: ${conflicto.gestion.tipoActividad}.`,
        409,
        "PARTICIPANTE_OTRO_BORRADOR"
      );
    }

    const activos = await prisma.gestionParticipante.count({
      where: {
        gestionId,
        activo: true,
      },
    });
    const esLider = Boolean(data.esLider) || activos === 0;
    const responsabilidad = normalizarResponsabilidad(
      data.responsabilidad
    );

    const creado = await prisma.$transaction(async (tx) => {
      if (esLider) {
        await tx.gestionParticipante.updateMany({
          where: {
            gestionId,
            activo: true,
          },
          data: {
            esLider: false,
          },
        });
      }

      return tx.gestionParticipante.create({
        data: {
          gestionId,
          profesionalId,
          esLider,
          puedeEvaluar:
            data.puedeEvaluar ?? true,
          puedeGestionarEvidencias:
            data.puedeGestionarEvidencias ?? true,
          responsabilidad:
            responsabilidad === undefined
              ? null
              : responsabilidad,
          asignadoPorUsuarioId: usuario.usuarioId,
        },
        include: includeParticipante,
      });
    });

    return serializarParticipante(creado);
  },

  actualizar: async (
    gestionId: string,
    participanteId: string,
    data: ActualizarParticipanteGestionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    await asegurarGestionEditable(
      gestionId,
      usuario
    );
    await asegurarPuedeAdministrarEquipo(
      gestionId,
      usuario
    );

    const participante =
      await prisma.gestionParticipante.findFirst({
        where: {
          id: participanteId,
          gestionId,
          activo: true,
        },
        include: includeParticipante,
      });

    if (!participante) {
      throw new ErrorEvaluacion(
        "El participante activo no existe.",
        404,
        "PARTICIPANTE_NO_ENCONTRADO"
      );
    }

    if (
      participante.esLider &&
      data.esLider === false
    ) {
      throw new ErrorEvaluacion(
        "Para cambiar el liderazgo, asigna primero como líder a otro participante.",
        409,
        "GESTION_REQUIERE_LIDER"
      );
    }

    const responsabilidad = normalizarResponsabilidad(
      data.responsabilidad
    );

    const actualizado = await prisma.$transaction(async (tx) => {
      if (data.esLider === true && !participante.esLider) {
        await tx.gestionParticipante.updateMany({
          where: {
            gestionId,
            activo: true,
            id: {
              not: participanteId,
            },
          },
          data: {
            esLider: false,
          },
        });
      }

      return tx.gestionParticipante.update({
        where: {
          id: participanteId,
        },
        data: {
          ...(data.esLider === true
            ? { esLider: true }
            : {}),
          ...(typeof data.puedeEvaluar === "boolean"
            ? { puedeEvaluar: data.puedeEvaluar }
            : {}),
          ...(typeof data.puedeGestionarEvidencias === "boolean"
            ? {
                puedeGestionarEvidencias:
                  data.puedeGestionarEvidencias,
              }
            : {}),
          ...(responsabilidad !== undefined
            ? { responsabilidad }
            : {}),
        },
        include: includeParticipante,
      });
    });

    return serializarParticipante(actualizado);
  },

  retirar: async (
    gestionId: string,
    participanteId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    await asegurarGestionEditable(
      gestionId,
      usuario
    );
    await asegurarPuedeAdministrarEquipo(
      gestionId,
      usuario
    );

    const participante =
      await prisma.gestionParticipante.findFirst({
        where: {
          id: participanteId,
          gestionId,
          activo: true,
        },
        include: includeParticipante,
      });

    if (!participante) {
      throw new ErrorEvaluacion(
        "El participante activo no existe.",
        404,
        "PARTICIPANTE_NO_ENCONTRADO"
      );
    }

    const totalActivos = await prisma.gestionParticipante.count({
      where: {
        gestionId,
        activo: true,
      },
    });

    if (totalActivos <= 1) {
      throw new ErrorEvaluacion(
        "La gestión debe conservar al menos un participante activo.",
        409,
        "GESTION_SIN_PARTICIPANTES"
      );
    }

    if (participante.esLider) {
      throw new ErrorEvaluacion(
        "No puedes retirar al líder actual. Asigna primero otro líder.",
        409,
        "GESTION_REQUIERE_LIDER"
      );
    }

    const retirado = await prisma.gestionParticipante.update({
      where: {
        id: participanteId,
      },
      data: {
        activo: false,
        fechaFin: new Date(),
        retiradoPorUsuarioId: usuario.usuarioId,
      },
      include: includeParticipante,
    });

    return serializarParticipante(retirado);
  },
};

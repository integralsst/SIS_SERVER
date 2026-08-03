import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { asegurarAccesoPeriodo } from "./acceso-evaluacion.service";

const ROLES_INVALIDACION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function nombreResponsable(gestion: {
  profesional: {
    nombres: string;
    apellidos: string;
  } | null;
  usuarioCreador: {
    nombre: string;
  };
}): string {
  if (gestion.profesional) {
    const nombre = [
      gestion.profesional.nombres,
      gestion.profesional.apellidos,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (nombre) {
      return nombre;
    }
  }

  return gestion.usuarioCreador.nombre;
}

export const servicioHistorialGestiones = {
  listar: async (
    periodoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await asegurarAccesoPeriodo(
      usuario,
      periodoId,
      "LECTURA"
    );

    const esCliente =
      usuario.rol === RolUsuario.ADMIN_CLIENTE ||
      usuario.rol === RolUsuario.USUARIO_CLIENTE;

    const gestiones = await prisma.gestionSgsst.findMany({
      where: {
        empresaPeriodoId: periodoId,
        ...(esCliente
          ? {
              estado: EstadoGestionSgsst.FINALIZADA,
              valida: true,
            }
          : {
              estado: {
                in: [
                  EstadoGestionSgsst.FINALIZADA,
                  EstadoGestionSgsst.INVALIDADA,
                ],
              },
            }),
      },
      orderBy: [
        {
          fechaGestion: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 100,
      include: {
        profesional: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
          },
        },
        categoriaGestion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        usuarioCreador: {
          select: {
            id: true,
            nombre: true,
          },
        },
        historial: {
          where: {
            accion: "INVALIDAR_GESTION",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        _count: {
          select: {
            evaluaciones: true,
          },
        },
      },
    });

    const puedeInvalidarPeriodo =
      periodo.estado === EstadoPeriodoSgsst.ABIERTO &&
      ROLES_INVALIDACION.includes(usuario.rol);

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        estado: periodo.estado,
      },
      gestiones: gestiones.map((gestion) => {
        const eventoInvalidacion = gestion.historial[0] ?? null;

        return {
          id: gestion.id,
          fechaGestion: gestion.fechaGestion.toISOString(),
          modalidad: gestion.modalidad,
          tipoActividad: gestion.tipoActividad,
          observacionGeneral: gestion.observacionGeneral,
          estado: gestion.estado,
          valida: gestion.valida,
          finalizadaEn: gestion.finalizadaEn?.toISOString() ?? null,
          invalidadaEn: gestion.invalidadaEn?.toISOString() ?? null,
          motivoInvalidacion: gestion.motivoInvalidacion,
          responsable: nombreResponsable(gestion),
          categoriaGestion: gestion.categoriaGestion,
          totalEvaluaciones: gestion._count.evaluaciones,
          creadaEn: gestion.createdAt.toISOString(),
          invalidacion: eventoInvalidacion
            ? {
                usuario: eventoInvalidacion.usuario,
                fecha: eventoInvalidacion.createdAt.toISOString(),
                descripcion: eventoInvalidacion.descripcion,
              }
            : null,
          puedeInvalidar:
            puedeInvalidarPeriodo &&
            gestion.estado === EstadoGestionSgsst.FINALIZADA &&
            gestion.valida,
        };
      }),
    };
  },
};

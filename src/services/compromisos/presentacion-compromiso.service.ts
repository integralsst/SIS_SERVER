import {
  EstadoAsignacionCompromiso,
  Prisma,
} from "@prisma/client";

import {
  calcularSemaforoCompromiso,
} from "./fechas-compromiso.service";

export const seleccionCompromisoListado = {
  id: true,
  descripcion: true,
  recursos: true,
  fechaLimite: true,
  estado: true,
  createdAt: true,
  updatedAt: true,
  empresa: {
    select: {
      id: true,
      nombre: true,
      nit: true,
    },
  },
  aspecto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
  gestionOrigen: {
    select: {
      id: true,
      fechaGestion: true,
      tipoActividad: true,
    },
  },
  evaluacionOrigen: {
    select: {
      supermatrizTarea: {
        select: {
          proceso: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
    },
  },
  responsables: {
    where: {
      estado:
        EstadoAsignacionCompromiso.ASIGNADA,
    },
    select: {
      id: true,
      tipo: true,
      estado: true,
      usuarioResponsable: {
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
        },
      },
      actividad: {
        select: {
          id: true,
          descripcion: true,
          estado: true,
          atendidaEn: true,
        },
      },
    },
    orderBy: {
      asignadoEn: "asc",
    },
  },
} satisfies Prisma.CompromisoSelect;

export function serializarCompromisoListado(
  compromiso: Prisma.CompromisoGetPayload<{
    select: typeof seleccionCompromisoListado;
  }>,
  hoy: Date,
  limiteProximo: Date
) {
  const responsables = [
    ...compromiso.responsables,
  ].sort((primero, segundo) => {
    if (primero.tipo === segundo.tipo) {
      return primero.usuarioResponsable.nombre.localeCompare(
        segundo.usuarioResponsable.nombre,
        "es"
      );
    }

    return primero.tipo === "PRINCIPAL" ? -1 : 1;
  });

  const {
    evaluacionOrigen,
    ...datos
  } = compromiso;

  return {
    ...datos,
    proceso:
      evaluacionOrigen.supermatrizTarea
        ?.proceso ?? null,
    fechaLimite:
      compromiso.fechaLimite.toISOString(),
    createdAt: compromiso.createdAt.toISOString(),
    updatedAt: compromiso.updatedAt.toISOString(),
    gestionOrigen: {
      ...compromiso.gestionOrigen,
      fechaGestion:
        compromiso.gestionOrigen.fechaGestion.toISOString(),
    },
    responsables,
    semaforo: calcularSemaforoCompromiso(
      compromiso.estado,
      compromiso.fechaLimite,
      hoy,
      limiteProximo
    ),
  };
}

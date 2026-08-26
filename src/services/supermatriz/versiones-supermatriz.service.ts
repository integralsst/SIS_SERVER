import {
  EstadoVersionSupermatriz,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { clonarVersionSupermatrizPorEtapas } from "./clonar-version-supermatriz.service";
import { limpiarVersionClonadaIncompleta } from "./limpiar-version-clonada.service";
import type {
  DatosClonarVersion,
  DatosVersionSupermatriz,
} from "../../types/supermatriz.types";
import {
  asegurarVersionBorrador,
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

const incluirVersionDetalle = {
  clonadaDe: {
    select: {
      id: true,
      nombre: true,
    },
  },
  _count: {
    select: {
      tareas: true,
      cambios: true,
      ciclosPhva: true,
      categoriasEstandar: true,
      estandares: true,
      aspectos: true,
      procesos: true,
      palabrasClave: true,
      requisitosNormativos: true,
    },
  },
} satisfies Prisma.VersionSupermatrizInclude;

function finDiaAnterior(fecha: Date): Date {
  return new Date(Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate() - 1,
    12,
    0,
    0,
    0
  ));
}

function claveLinajeAspecto(aspecto: {
  codigo: string | null;
  nombre: string;
  estandar: {
    codigo: string | null;
    nombre: string;
    categoriaEstandar: {
      codigo: string | null;
      nombre: string;
      cicloPhva: {
        codigo: string;
      };
    };
  };
}): string {
  const categoria = aspecto.estandar.categoriaEstandar;

  return [
    categoria.cicloPhva.codigo,
    categoria.codigo ?? "",
    categoria.nombre,
    aspecto.estandar.codigo ?? "",
    aspecto.estandar.nombre,
    aspecto.codigo ?? "",
    aspecto.nombre,
  ].join("::");
}

async function sincronizarIdentidadesAspectosClonados(
  versionOrigenId: number,
  versionNuevaId: number
): Promise<void> {
  const seleccion = {
    id: true,
    identidadHistorica: true,
    codigo: true,
    nombre: true,
    estandar: {
      select: {
        codigo: true,
        nombre: true,
        categoriaEstandar: {
          select: {
            codigo: true,
            nombre: true,
            cicloPhva: {
              select: {
                codigo: true,
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.AspectoSelect;

  const [origen, destino] = await Promise.all([
    prisma.aspecto.findMany({
      where: { versionSupermatrizId: versionOrigenId },
      select: seleccion,
    }),
    prisma.aspecto.findMany({
      where: { versionSupermatrizId: versionNuevaId },
      select: seleccion,
    }),
  ]);

  if (origen.length !== destino.length) {
    throw new ErrorValidacionSupermatriz(
      "La versión clonada no contiene la misma cantidad de aspectos que su origen."
    );
  }

  const origenPorClave = new Map(
    origen.map((aspecto) => [
      claveLinajeAspecto(aspecto),
      aspecto.identidadHistorica,
    ])
  );
  const destinoPorClave = new Map(
    destino.map((aspecto) => [
      claveLinajeAspecto(aspecto),
      aspecto,
    ])
  );

  if (
    origenPorClave.size !== origen.length ||
    destinoPorClave.size !== destino.length
  ) {
    throw new ErrorValidacionSupermatriz(
      "La clonación contiene claves de aspecto ambiguas y no es seguro inferir su identidad histórica."
    );
  }

  const actualizaciones = destino.map((aspecto) => {
    const identidadHistorica = origenPorClave.get(
      claveLinajeAspecto(aspecto)
    );

    if (!identidadHistorica) {
      throw new ErrorValidacionSupermatriz(
        `No fue posible conservar la identidad histórica del aspecto "${aspecto.nombre}" durante la clonación.`
      );
    }

    return prisma.aspecto.update({
      where: { id: aspecto.id },
      data: { identidadHistorica },
    });
  });

  await prisma.$transaction(actualizaciones);
}

export const servicioVersionesSupermatriz = {
  obtenerTodas: () =>
    prisma.versionSupermatriz.findMany({
      include: incluirVersionDetalle,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    }),

  obtenerPorId: (id: number) =>
    prisma.versionSupermatriz.findUnique({
      where: {
        id,
      },
      include: {
        ...incluirVersionDetalle,
        cambios: {
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                correo: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },
      },
    }),

  crear: async (
    data: DatosVersionSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const version =
        await tx.versionSupermatriz.create({
          data: {
            ...data,
            estado:
              EstadoVersionSupermatriz.BORRADOR,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId:
            version.id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: version.id,
          accion: "CREAR",
          descripcion: `Creación de la versión borrador ${version.nombre}.`,
          datosDespues:
            comoJsonPrisma(version),
          usuarioId,
        },
      });

      return version;
    }),

  actualizar: async (
    id: number,
    data: DatosVersionSupermatriz,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        id
      );

      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      const actualizada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data,
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "ACTUALIZAR",
          descripcion: `Actualización de los datos de la versión ${actualizada.nombre}.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(actualizada),
          usuarioId,
        },
      });

      return actualizada;
    }),

  publicar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      await asegurarVersionBorrador(
        tx,
        id
      );

      const tareasActivas =
        await tx.supermatrizTarea.findMany({
          where: {
            versionSupermatrizId: id,
            estado: "ACTIVO",
          },
          include: {
            categoriasGestion: true,
            proceso: true,
            aspecto: {
              include: {
                planAccionEspecifico: true,
                estandar: {
                  include: {
                    categoriaEstandar: {
                      include: {
                        cicloPhva: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

      if (tareasActivas.length === 0) {
        throw new ErrorValidacionSupermatriz(
          "No se puede publicar una versión sin filas activas."
        );
      }

      const filaInconsistente =
        tareasActivas.find(
          (tarea) =>
            tarea.proceso.estado !== "ACTIVO" ||
            tarea.aspecto.estado !== "ACTIVO" ||
            tarea.aspecto.planAccionEspecifico?.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.categoriaEstandar.estado !==
              "ACTIVO" ||
            tarea.aspecto.estandar.categoriaEstandar.cicloPhva.estado !==
              "ACTIVO" ||
            tarea.categoriasGestion.length === 0
        );

      if (filaInconsistente) {
        throw new ErrorValidacionSupermatriz(
          `La fila ${
            filaInconsistente.codigo ??
            filaInconsistente.id
          } tiene relaciones inactivas o incompletas.`
        );
      }

      const estandaresSinGrupo =
        await tx.estandar.count({
          where: {
            versionSupermatrizId: id,
            estado: "ACTIVO",
            gruposMinisteriales: {
              none: {},
            },
          },
        });

      if (estandaresSinGrupo > 0) {
        throw new ErrorValidacionSupermatriz(
          "Todos los estándares activos deben estar clasificados en al menos un grupo de 7, 21 o 60 estándares."
        );
      }

      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow({
          where: { id },
        });

      const vigentesActuales =
        await tx.versionSupermatriz.findMany({
          where: {
            estado: EstadoVersionSupermatriz.VIGENTE,
            id: { not: id },
          },
          orderBy: [
            { vigenteDesde: "desc" },
            { id: "desc" },
          ],
        });

      if (vigentesActuales.length > 1) {
        throw new ErrorValidacionSupermatriz(
          "Existe más de una versión vigente de la Supermatriz. Corrige esa inconsistencia antes de publicar una nueva versión."
        );
      }

      if (vigentesActuales.length === 1) {
        const vigenteActual = vigentesActuales[0];

        if (anterior.clonadaDeId !== vigenteActual.id) {
          throw new ErrorValidacionSupermatriz(
            `La versión sucesora debe crearse clonando la versión vigente "${vigenteActual.nombre}". Esto conserva la identidad histórica de los aspectos.`
          );
        }

        if (!anterior.vigenteDesde) {
          throw new ErrorValidacionSupermatriz(
            "Indica la fecha desde la cual empezará a aplicar la nueva versión."
          );
        }

        if (
          vigenteActual.vigenteDesde &&
          anterior.vigenteDesde <= vigenteActual.vigenteDesde
        ) {
          throw new ErrorValidacionSupermatriz(
            "La nueva versión debe iniciar después de la versión actualmente vigente."
          );
        }

        await tx.versionSupermatriz.update({
          where: {
            id: vigenteActual.id,
          },
          data: {
            estado: EstadoVersionSupermatriz.CERRADA,
            vigenteHasta: finDiaAnterior(anterior.vigenteDesde),
          },
        });
      }

      const publicada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data: {
            estado: EstadoVersionSupermatriz.VIGENTE,
            vigenteHasta: null,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "PUBLICAR",
          descripcion: `La versión ${publicada.nombre} fue publicada como vigente desde ${
            publicada.vigenteDesde
              ? publicada.vigenteDesde.toISOString().slice(0, 10)
              : "el inicio de la operación"
          }.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(publicada),
          usuarioId,
        },
      });

      return publicada;
    }),

  cerrar: async (
    id: number,
    usuarioId: string
  ) =>
    prisma.$transaction(async (tx) => {
      const anterior =
        await tx.versionSupermatriz.findUniqueOrThrow(
          {
            where: {
              id,
            },
          }
        );

      if (
        anterior.estado ===
        EstadoVersionSupermatriz.CERRADA
      ) {
        return anterior;
      }

      if (
        anterior.estado ===
        EstadoVersionSupermatriz.VIGENTE
      ) {
        throw new ErrorValidacionSupermatriz(
          "Una versión vigente solo puede cerrarse al publicar su versión sucesora. Así se conserva la continuidad temporal de la Supermatriz."
        );
      }

      const cerrada =
        await tx.versionSupermatriz.update({
          where: {
            id,
          },
          data: {
            estado:
              EstadoVersionSupermatriz.CERRADA,
          },
        });

      await tx.historialCambioSupermatriz.create({
        data: {
          versionSupermatrizId: id,
          tipoEntidad:
            "VersionSupermatriz",
          entidadId: id,
          accion: "CERRAR",
          descripcion: `La versión ${cerrada.nombre} fue cerrada.`,
          datosAntes:
            comoJsonPrisma(anterior),
          datosDespues:
            comoJsonPrisma(cerrada),
          usuarioId,
        },
      });

      return cerrada;
    }),

  clonar: async (
    id: number,
    data: DatosClonarVersion,
    usuarioId: string
  ) => {
    const nuevaVersionId =
      await clonarVersionSupermatrizPorEtapas(
        id,
        data,
        usuarioId
      );

    try {
      await sincronizarIdentidadesAspectosClonados(
        id,
        nuevaVersionId
      );
    } catch (error) {
      await limpiarVersionClonadaIncompleta(
        nuevaVersionId
      );
      throw error;
    }

    return prisma.versionSupermatriz.findUniqueOrThrow({
      where: {
        id: nuevaVersionId,
      },
      include: incluirVersionDetalle,
    });
  },
};

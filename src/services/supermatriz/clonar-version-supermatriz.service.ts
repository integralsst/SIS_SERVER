import {
  EstadoVersionSupermatriz,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { DatosClonarVersion } from "../../types/supermatriz.types";
import {
  comoJsonPrisma,
  ErrorValidacionSupermatriz,
} from "../../utils/supermatriz";

const TAMANO_BLOQUE = 250;

async function procesarEnBloques<T>(
  items: T[],
  ejecutar: (bloque: T[]) => Promise<unknown>
): Promise<void> {
  for (
    let inicio = 0;
    inicio < items.length;
    inicio += TAMANO_BLOQUE
  ) {
    const bloque = items.slice(
      inicio,
      inicio + TAMANO_BLOQUE
    );

    if (bloque.length > 0) {
      await ejecutar(bloque);
    }
  }
}

function obtenerMapeado(
  mapa: Map<number, number>,
  idOrigen: number,
  mensaje: string
): number {
  const idDestino = mapa.get(idOrigen);

  if (!idDestino) {
    throw new ErrorValidacionSupermatriz(
      mensaje
    );
  }

  return idDestino;
}

async function limpiarVersionClonadaIncompleta(
  versionSupermatrizId: number
): Promise<void> {
  const operaciones: Array<{
    nombre: string;
    ejecutar: () => Promise<unknown>;
  }> = [
    {
      nombre:
        "historial de la versión incompleta",
      ejecutar: () =>
        prisma.historialCambioSupermatriz.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre:
        "categorías de gestión de las filas",
      ejecutar: () =>
        prisma.supermatrizTareaCategoriaGestion.deleteMany({
          where: {
            supermatrizTarea: {
              versionSupermatrizId,
            },
          },
        }),
    },
    {
      nombre: "filas de la Supermatriz",
      ejecutar: () =>
        prisma.supermatrizTarea.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "aspectos",
      ejecutar: () =>
        prisma.aspecto.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "estándares",
      ejecutar: () =>
        prisma.estandar.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "categorías de estándar",
      ejecutar: () =>
        prisma.categoriaEstandar.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "ciclos PHVA",
      ejecutar: () =>
        prisma.cicloPhva.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "procesos",
      ejecutar: () =>
        prisma.proceso.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "palabras clave",
      ejecutar: () =>
        prisma.palabraClave.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "requisitos normativos",
      ejecutar: () =>
        prisma.requisitoNormativo.deleteMany({
          where: {
            versionSupermatrizId,
          },
        }),
    },
    {
      nombre: "versión incompleta",
      ejecutar: () =>
        prisma.versionSupermatriz.delete({
          where: {
            id: versionSupermatrizId,
          },
        }),
    },
  ];

  for (const operacion of operaciones) {
    try {
      await operacion.ejecutar();
    } catch (error) {
      console.error(
        `[SUPERMATRIZ-CLONAR-LIMPIEZA] No fue posible eliminar ${operacion.nombre}.`,
        error
      );
    }
  }
}

const incluirOrigenClonacion = {
  ciclosPhva: {
    orderBy: {
      orden: "asc",
    },
  },
  categoriasEstandar: {
    orderBy: {
      orden: "asc",
    },
  },
  estandares: {
    include: {
      gruposMinisteriales: true,
    },
    orderBy: {
      orden: "asc",
    },
  },
  aspectos: {
    include: {
      planAccionEspecifico: true,
      configuracion: true,
      configuracionVigencia: true,
      configuracionTareaCotidiana: true,
      configuracionEvidencia: true,
      configuracionRevision: true,
      palabrasClave: true,
      requisitosNormativos: true,
      reglasAprobacion: true,
      vigencias: true,
    },
    orderBy: {
      orden: "asc",
    },
  },
  procesos: true,
  palabrasClave: true,
  requisitosNormativos: true,
  tareas: {
    include: {
      categoriasGestion: true,
    },
    orderBy: {
      orden: "asc",
    },
  },
} satisfies Prisma.VersionSupermatrizInclude;

export async function clonarVersionSupermatrizPorEtapas(
  versionOrigenId: number,
  data: DatosClonarVersion,
  usuarioId: string
): Promise<number> {
  const origen =
    await prisma.versionSupermatriz.findUnique({
      where: {
        id: versionOrigenId,
      },
      include: incluirOrigenClonacion,
    });

  if (!origen) {
    throw new ErrorValidacionSupermatriz(
      "La versión de origen no existe."
    );
  }

  let nuevaVersionId: number | null = null;

  try {
    const nueva =
      await prisma.versionSupermatriz.create({
        data: {
          clonadaDeId: origen.id,
          nombre: data.nombre,
          descripcion:
            data.descripcion ??
            `Clon de ${origen.nombre}.`,
          estado:
            EstadoVersionSupermatriz.BORRADOR,
          vigenteDesde: data.vigenteDesde,
          vigenteHasta: data.vigenteHasta,
        },
      });

    nuevaVersionId = nueva.id;

    // ==================================================
    // 1. CICLOS PHVA
    // ==================================================

    await prisma.cicloPhva.createMany({
      data: origen.ciclosPhva.map(
        (ciclo) => ({
          versionSupermatrizId: nueva.id,
          codigo: ciclo.codigo,
          nombre: ciclo.nombre,
          orden: ciclo.orden,
          porcentajeEsperado:
            ciclo.porcentajeEsperado,
          estado: ciclo.estado,
        })
      ),
    });

    const ciclosNuevos =
      await prisma.cicloPhva.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const ciclosNuevosPorCodigo =
      new Map(
        ciclosNuevos.map((ciclo) => [
          ciclo.codigo,
          ciclo.id,
        ])
      );

    const ciclos = new Map<number, number>();

    for (const ciclo of origen.ciclosPhva) {
      const nuevoId =
        ciclosNuevosPorCodigo.get(
          ciclo.codigo
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar el ciclo PHVA "${ciclo.nombre}".`
        );
      }

      ciclos.set(ciclo.id, nuevoId);
    }

    // ==================================================
    // 2. CATEGORÍAS DE ESTÁNDAR
    // ==================================================

    await prisma.categoriaEstandar.createMany({
      data: origen.categoriasEstandar.map(
        (categoria) => ({
          versionSupermatrizId: nueva.id,
          cicloPhvaId: obtenerMapeado(
            ciclos,
            categoria.cicloPhvaId,
            `No fue posible clonar la categoría "${categoria.nombre}": ciclo PHVA faltante.`
          ),
          codigo: categoria.codigo,
          nombre: categoria.nombre,
          descripcion:
            categoria.descripcion,
          orden: categoria.orden,
          porcentajeEsperado:
            categoria.porcentajeEsperado,
          estado: categoria.estado,
        })
      ),
    });

    const categoriasNuevas =
      await prisma.categoriaEstandar.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const categoriasNuevasPorClave =
      new Map(
        categoriasNuevas.map(
          (categoria) => [
            `${categoria.cicloPhvaId}::${categoria.nombre}`,
            categoria.id,
          ]
        )
      );

    const categorias =
      new Map<number, number>();

    for (
      const categoria of origen.categoriasEstandar
    ) {
      const cicloNuevoId =
        obtenerMapeado(
          ciclos,
          categoria.cicloPhvaId,
          `No fue posible relacionar la categoría "${categoria.nombre}".`
        );

      const nuevoId =
        categoriasNuevasPorClave.get(
          `${cicloNuevoId}::${categoria.nombre}`
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar la categoría "${categoria.nombre}".`
        );
      }

      categorias.set(
        categoria.id,
        nuevoId
      );
    }

    // ==================================================
    // 3. ESTÁNDARES Y GRUPOS MINISTERIALES
    // ==================================================

    await prisma.estandar.createMany({
      data: origen.estandares.map(
        (estandar) => ({
          versionSupermatrizId: nueva.id,
          categoriaEstandarId:
            obtenerMapeado(
              categorias,
              estandar.categoriaEstandarId,
              `No fue posible clonar el estándar "${estandar.nombre}": categoría faltante.`
            ),
          codigo: estandar.codigo,
          nombre: estandar.nombre,
          descripcion:
            estandar.descripcion,
          orden: estandar.orden,
          calificacionMinisterialEsperada:
            estandar.calificacionMinisterialEsperada,
          estado: estandar.estado,
        })
      ),
    });

    const estandaresNuevos =
      await prisma.estandar.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const estandaresNuevosPorClave =
      new Map(
        estandaresNuevos.map(
          (estandar) => [
            `${estandar.categoriaEstandarId}::${estandar.nombre}`,
            estandar.id,
          ]
        )
      );

    const estandares =
      new Map<number, number>();

    for (
      const estandar of origen.estandares
    ) {
      const categoriaNuevaId =
        obtenerMapeado(
          categorias,
          estandar.categoriaEstandarId,
          `No fue posible relacionar el estándar "${estandar.nombre}".`
        );

      const nuevoId =
        estandaresNuevosPorClave.get(
          `${categoriaNuevaId}::${estandar.nombre}`
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar el estándar "${estandar.nombre}".`
        );
      }

      estandares.set(
        estandar.id,
        nuevoId
      );
    }

    const relacionesGrupos =
      origen.estandares.flatMap(
        (estandar) => {
          const estandarId =
            obtenerMapeado(
              estandares,
              estandar.id,
              `No fue posible relacionar los grupos del estándar "${estandar.nombre}".`
            );

          return estandar.gruposMinisteriales.map(
            (grupo) => ({
              estandarId,
              grupoMinisterialId:
                grupo.grupoMinisterialId,
            })
          );
        }
      );

    await procesarEnBloques(
      relacionesGrupos,
      (bloque) =>
        prisma.estandarGrupoMinisterial.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    // ==================================================
    // 4. PALABRAS CLAVE
    // ==================================================

    await procesarEnBloques(
      origen.palabrasClave.map(
        (palabra) => ({
          versionSupermatrizId: nueva.id,
          nombre: palabra.nombre,
        })
      ),
      (bloque) =>
        prisma.palabraClave.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const palabrasNuevas =
      await prisma.palabraClave.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const palabrasNuevasPorNombre =
      new Map(
        palabrasNuevas.map(
          (palabra) => [
            palabra.nombre,
            palabra.id,
          ]
        )
      );

    const palabrasClave =
      new Map<number, number>();

    for (
      const palabra of origen.palabrasClave
    ) {
      const nuevoId =
        palabrasNuevasPorNombre.get(
          palabra.nombre
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar la palabra clave "${palabra.nombre}".`
        );
      }

      palabrasClave.set(
        palabra.id,
        nuevoId
      );
    }

    // ==================================================
    // 5. REQUISITOS NORMATIVOS
    // ==================================================

    await procesarEnBloques(
      origen.requisitosNormativos.map(
        (requisito) => ({
          versionSupermatrizId: nueva.id,
          clave: requisito.clave,
          norma: requisito.norma,
          articulo:
            requisito.articulo,
          descripcion:
            requisito.descripcion,
          estado: requisito.estado,
        })
      ),
      (bloque) =>
        prisma.requisitoNormativo.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const requisitosNuevos =
      await prisma.requisitoNormativo.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const requisitosNuevosPorClave =
      new Map(
        requisitosNuevos.map(
          (requisito) => [
            requisito.clave,
            requisito.id,
          ]
        )
      );

    const requisitosNormativos =
      new Map<number, number>();

    for (
      const requisito of origen.requisitosNormativos
    ) {
      const nuevoId =
        requisitosNuevosPorClave.get(
          requisito.clave
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar el requisito "${requisito.clave}".`
        );
      }

      requisitosNormativos.set(
        requisito.id,
        nuevoId
      );
    }

    // ==================================================
    // 6. ASPECTOS BASE
    // ==================================================

    await procesarEnBloques(
      origen.aspectos.map(
        (aspecto) => ({
          versionSupermatrizId: nueva.id,
          estandarId:
            obtenerMapeado(
              estandares,
              aspecto.estandarId,
              `No fue posible clonar el aspecto "${aspecto.nombre}": estándar faltante.`
            ),
          codigo: aspecto.codigo,
          nombre: aspecto.nombre,
          descripcion:
            aspecto.descripcion,
          orden: aspecto.orden,
          estado: aspecto.estado,
        })
      ),
      (bloque) =>
        prisma.aspecto.createMany({
          data: bloque,
        })
    );

    const aspectosNuevos =
      await prisma.aspecto.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const aspectosNuevosPorClave =
      new Map(
        aspectosNuevos.map(
          (aspecto) => [
            `${aspecto.estandarId}::${aspecto.nombre}`,
            aspecto.id,
          ]
        )
      );

    const aspectos =
      new Map<number, number>();

    for (
      const aspecto of origen.aspectos
    ) {
      const estandarNuevoId =
        obtenerMapeado(
          estandares,
          aspecto.estandarId,
          `No fue posible relacionar el aspecto "${aspecto.nombre}".`
        );

      const nuevoId =
        aspectosNuevosPorClave.get(
          `${estandarNuevoId}::${aspecto.nombre}`
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar el aspecto "${aspecto.nombre}".`
        );
      }

      aspectos.set(
        aspecto.id,
        nuevoId
      );
    }

    // ==================================================
    // 7. CONFIGURACIONES Y RELACIONES DE ASPECTOS
    // ==================================================

    const planes =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.planAccionEspecifico
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar el plan del aspecto "${aspecto.nombre}".`
                    ),
                  descripcion:
                    aspecto
                      .planAccionEspecifico
                      .descripcion,
                  estado:
                    aspecto
                      .planAccionEspecifico
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      planes,
      (bloque) =>
        prisma.planAccionEspecifico.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const configuracionesAspecto =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.configuracion
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar la configuración del aspecto "${aspecto.nombre}".`
                    ),
                  esEvergreen:
                    aspecto.configuracion
                      .esEvergreen,
                  bloqueEvergreen:
                    aspecto.configuracion
                      .bloqueEvergreen,
                  documentoActualizacionPeriodica:
                    aspecto.configuracion
                      .documentoActualizacionPeriodica,
                  tareaEjecucionCotidiana:
                    aspecto.configuracion
                      .tareaEjecucionCotidiana,
                  incluirInformeEstadoTareas:
                    aspecto.configuracion
                      .incluirInformeEstadoTareas,
                  permiteNoAplica:
                    aspecto.configuracion
                      .permiteNoAplica,
                  estado:
                    aspecto.configuracion
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      configuracionesAspecto,
      (bloque) =>
        prisma.configuracionAspecto.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const configuracionesVigencia =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.configuracionVigencia
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar la vigencia del aspecto "${aspecto.nombre}".`
                    ),
                  tipoFechaBase:
                    aspecto
                      .configuracionVigencia
                      .tipoFechaBase,
                  fuentePeriodicidad:
                    aspecto
                      .configuracionVigencia
                      .fuentePeriodicidad,
                  cantidad:
                    aspecto
                      .configuracionVigencia
                      .cantidad,
                  unidad:
                    aspecto
                      .configuracionVigencia
                      .unidad,
                  diasAlertaPrevia:
                    aspecto
                      .configuracionVigencia
                      .diasAlertaPrevia,
                  permiteFechaManual:
                    aspecto
                      .configuracionVigencia
                      .permiteFechaManual,
                  mesFechaFija:
                    aspecto
                      .configuracionVigencia
                      .mesFechaFija,
                  diaFechaFija:
                    aspecto
                      .configuracionVigencia
                      .diaFechaFija,
                  descripcionRegla:
                    aspecto
                      .configuracionVigencia
                      .descripcionRegla,
                  estado:
                    aspecto
                      .configuracionVigencia
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      configuracionesVigencia,
      (bloque) =>
        prisma.configuracionVigenciaAspecto.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const configuracionesTareaCotidiana =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.configuracionTareaCotidiana
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar la tarea cotidiana del aspecto "${aspecto.nombre}".`
                    ),
                  cantidadObjetivo:
                    aspecto
                      .configuracionTareaCotidiana
                      .cantidadObjetivo,
                  unidad:
                    aspecto
                      .configuracionTareaCotidiana
                      .unidad,
                  descripcion:
                    aspecto
                      .configuracionTareaCotidiana
                      .descripcion,
                  estado:
                    aspecto
                      .configuracionTareaCotidiana
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      configuracionesTareaCotidiana,
      (bloque) =>
        prisma.configuracionTareaCotidiana.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const configuracionesEvidencia =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.configuracionEvidencia
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar la evidencia del aspecto "${aspecto.nombre}".`
                    ),
                  requiereEvidencia:
                    aspecto
                      .configuracionEvidencia
                      .requiereEvidencia,
                  descripcionEvidencia:
                    aspecto
                      .configuracionEvidencia
                      .descripcionEvidencia,
                  visibleClienteDefault:
                    aspecto
                      .configuracionEvidencia
                      .visibleClienteDefault,
                  estado:
                    aspecto
                      .configuracionEvidencia
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      configuracionesEvidencia,
      (bloque) =>
        prisma.configuracionEvidenciaAspecto.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const configuracionesRevision =
      origen.aspectos.flatMap(
        (aspecto) =>
          aspecto.configuracionRevision
            ? [
                {
                  aspectoId:
                    obtenerMapeado(
                      aspectos,
                      aspecto.id,
                      `No fue posible relacionar la revisión del aspecto "${aspecto.nombre}".`
                    ),
                  requiereRevisionTecnica:
                    aspecto
                      .configuracionRevision
                      .requiereRevisionTecnica,
                  observaciones:
                    aspecto
                      .configuracionRevision
                      .observaciones,
                  estado:
                    aspecto
                      .configuracionRevision
                      .estado,
                },
              ]
            : []
      );

    await procesarEnBloques(
      configuracionesRevision,
      (bloque) =>
        prisma.configuracionRevisionTecnica.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const relacionesPalabras =
      origen.aspectos.flatMap(
        (aspecto) => {
          const aspectoId =
            obtenerMapeado(
              aspectos,
              aspecto.id,
              `No fue posible relacionar las palabras del aspecto "${aspecto.nombre}".`
            );

          return aspecto.palabrasClave.map(
            (item) => ({
              aspectoId,
              palabraClaveId:
                obtenerMapeado(
                  palabrasClave,
                  item.palabraClaveId,
                  `No fue posible relacionar una palabra clave del aspecto "${aspecto.nombre}".`
                ),
            })
          );
        }
      );

    await procesarEnBloques(
      relacionesPalabras,
      (bloque) =>
        prisma.aspectoPalabraClave.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const relacionesRequisitos =
      origen.aspectos.flatMap(
        (aspecto) => {
          const aspectoId =
            obtenerMapeado(
              aspectos,
              aspecto.id,
              `No fue posible relacionar los requisitos del aspecto "${aspecto.nombre}".`
            );

          return aspecto.requisitosNormativos.map(
            (item) => ({
              aspectoId,
              requisitoNormativoId:
                obtenerMapeado(
                  requisitosNormativos,
                  item.requisitoNormativoId,
                  `No fue posible relacionar un requisito del aspecto "${aspecto.nombre}".`
                ),
            })
          );
        }
      );

    await procesarEnBloques(
      relacionesRequisitos,
      (bloque) =>
        prisma.aspectoRequisitoNormativo.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const reglasAprobacion =
      origen.aspectos.flatMap(
        (aspecto) => {
          const aspectoId =
            obtenerMapeado(
              aspectos,
              aspecto.id,
              `No fue posible relacionar las reglas del aspecto "${aspecto.nombre}".`
            );

          return aspecto.reglasAprobacion.map(
            (regla) => ({
              aspectoId,
              modalidad: regla.modalidad,
              tipoActividad:
                regla.tipoActividad,
              criterio: regla.criterio,
              requiereAprobacion:
                regla.requiereAprobacion,
              vigenteDesde:
                regla.vigenteDesde,
              vigenteHasta:
                regla.vigenteHasta,
              estado: regla.estado,
            })
          );
        }
      );

    await procesarEnBloques(
      reglasAprobacion,
      (bloque) =>
        prisma.reglaAprobacionGestion.createMany({
          data: bloque,
        })
    );

    const vigencias =
      origen.aspectos.flatMap(
        (aspecto) => {
          const aspectoId =
            obtenerMapeado(
              aspectos,
              aspecto.id,
              `No fue posible relacionar las vigencias del aspecto "${aspecto.nombre}".`
            );

          return aspecto.vigencias.map(
            (vigencia) => ({
              aspectoId,
              vigenteDesde:
                vigencia.vigenteDesde,
              vigenteHasta:
                vigencia.vigenteHasta,
              motivoDesactivacion:
                vigencia.motivoDesactivacion,
              estado: vigencia.estado,
            })
          );
        }
      );

    await procesarEnBloques(
      vigencias,
      (bloque) =>
        prisma.vigenciaAspecto.createMany({
          data: bloque,
        })
    );

    // ==================================================
    // 8. PROCESOS
    // ==================================================

    await procesarEnBloques(
      origen.procesos.map(
        (proceso) => ({
          versionSupermatrizId: nueva.id,
          codigo: proceso.codigo,
          nombre: proceso.nombre,
          descripcion:
            proceso.descripcion,
          estado: proceso.estado,
        })
      ),
      (bloque) =>
        prisma.proceso.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    const procesosNuevos =
      await prisma.proceso.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const procesosNuevosPorNombre =
      new Map(
        procesosNuevos.map(
          (proceso) => [
            proceso.nombre,
            proceso.id,
          ]
        )
      );

    const procesos =
      new Map<number, number>();

    for (
      const proceso of origen.procesos
    ) {
      const nuevoId =
        procesosNuevosPorNombre.get(
          proceso.nombre
        );

      if (!nuevoId) {
        throw new ErrorValidacionSupermatriz(
          `No fue posible relacionar el proceso "${proceso.nombre}".`
        );
      }

      procesos.set(
        proceso.id,
        nuevoId
      );
    }

    // ==================================================
    // 9. FILAS DE LA SUPERMATRIZ
    // ==================================================

    await procesarEnBloques(
      origen.tareas.map(
        (tarea) => ({
          versionSupermatrizId: nueva.id,
          aspectoId:
            obtenerMapeado(
              aspectos,
              tarea.aspectoId,
              "No fue posible clonar una fila: aspecto faltante."
            ),
          procesoId:
            obtenerMapeado(
              procesos,
              tarea.procesoId,
              "No fue posible clonar una fila: proceso faltante."
            ),
          codigo: tarea.codigo,
          orden: tarea.orden,
          ejecucion:
            tarea.ejecucion,
          fundamentosSoportes:
            tarea.fundamentosSoportes,
          responsableActividad:
            tarea.responsableActividad,
          metasEstandar:
            tarea.metasEstandar,
          recursosAdministrativos:
            tarea.recursosAdministrativos,
          estado: tarea.estado,
        })
      ),
      (bloque) =>
        prisma.supermatrizTarea.createMany({
          data: bloque,
        })
    );

    const tareasNuevas =
      await prisma.supermatrizTarea.findMany({
        where: {
          versionSupermatrizId: nueva.id,
        },
      });

    const tareasNuevasPorClave =
      new Map(
        tareasNuevas.map(
          (tarea) => [
            `${tarea.aspectoId}::${tarea.procesoId}`,
            tarea.id,
          ]
        )
      );

    const relacionesCategoriasGestion =
      origen.tareas.flatMap(
        (tarea) => {
          const aspectoNuevoId =
            obtenerMapeado(
              aspectos,
              tarea.aspectoId,
              "No fue posible relacionar las categorías de una fila."
            );

          const procesoNuevoId =
            obtenerMapeado(
              procesos,
              tarea.procesoId,
              "No fue posible relacionar las categorías de una fila."
            );

          const tareaNuevaId =
            tareasNuevasPorClave.get(
              `${aspectoNuevoId}::${procesoNuevoId}`
            );

          if (!tareaNuevaId) {
            throw new ErrorValidacionSupermatriz(
              "No fue posible relacionar una fila clonada con sus categorías de gestión."
            );
          }

          return tarea.categoriasGestion.map(
            (categoria) => ({
              supermatrizTareaId:
                tareaNuevaId,
              categoriaGestionId:
                categoria.categoriaGestionId,
            })
          );
        }
      );

    await procesarEnBloques(
      relacionesCategoriasGestion,
      (bloque) =>
        prisma.supermatrizTareaCategoriaGestion.createMany({
          data: bloque,
          skipDuplicates: true,
        })
    );

    // ==================================================
    // 10. HISTORIAL
    // ==================================================

    await prisma.historialCambioSupermatriz.create({
      data: {
        versionSupermatrizId:
          nueva.id,
        tipoEntidad:
          "VersionSupermatriz",
        entidadId: nueva.id,
        accion: "CLONAR",
        descripcion:
          `La versión ${nueva.nombre} fue clonada desde ${origen.nombre}.`,
        datosDespues:
          comoJsonPrisma({
            versionOrigenId:
              origen.id,
            versionNuevaId:
              nueva.id,
          }),
        usuarioId,
      },
    });

    return nueva.id;
  } catch (error) {
    if (nuevaVersionId) {
      await limpiarVersionClonadaIncompleta(
        nuevaVersionId
      );
    }

    console.error(
      "[SUPERMATRIZ-VERSIONES-CLONAR]",
      error
    );

    throw error;
  }
}

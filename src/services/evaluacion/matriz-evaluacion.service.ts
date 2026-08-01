import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoRegistro,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { servicioPeriodosEvaluacion } from "./periodos-evaluacion.service";

function serializarFecha(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function serializarEvaluacion(evaluacion: {
  id: string;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  calificacionAdministrativa: { toNumber(): number };
  observacion: string | null;
  fechaDocumento: Date | null;
  fechaVencimientoCalculada: Date | null;
  justificacionNoAplica: string | null;
  marcadaRevisionTecnica: boolean;
  createdAt: Date;
  updatedAt: Date;
  gestion: {
    id: string;
    fechaGestion: Date;
    tipoActividad: string;
    estado: EstadoGestionSgsst;
  };
}) {
  return {
    id: evaluacion.id,
    estadoCumplimiento: evaluacion.estadoCumplimiento,
    calificacionAdministrativa:
      evaluacion.calificacionAdministrativa.toNumber(),
    observacion: evaluacion.observacion,
    fechaDocumento: serializarFecha(evaluacion.fechaDocumento),
    fechaVencimientoCalculada: serializarFecha(
      evaluacion.fechaVencimientoCalculada
    ),
    justificacionNoAplica:
      evaluacion.justificacionNoAplica,
    marcadaRevisionTecnica:
      evaluacion.marcadaRevisionTecnica,
    creadaEn: evaluacion.createdAt.toISOString(),
    actualizadaEn: evaluacion.updatedAt.toISOString(),
    gestion: {
      id: evaluacion.gestion.id,
      fechaGestion:
        evaluacion.gestion.fechaGestion.toISOString(),
      tipoActividad: evaluacion.gestion.tipoActividad,
      estado: evaluacion.gestion.estado,
    },
  };
}

function calcularEstadoVigencia(
  evaluacion: {
    fechaVencimientoCalculada: Date | null;
  } | null,
  diasAlertaPrevia: number
): "SIN_REVISION" | "VIGENTE" | "POR_VENCER" | "VENCIDO" | "SIN_VENCIMIENTO" {
  if (!evaluacion) {
    return "SIN_REVISION";
  }

  if (!evaluacion.fechaVencimientoCalculada) {
    return "SIN_VENCIMIENTO";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vencimiento = new Date(
    evaluacion.fechaVencimientoCalculada
  );
  vencimiento.setHours(0, 0, 0, 0);

  if (vencimiento.getTime() < hoy.getTime()) {
    return "VENCIDO";
  }

  const limiteAlerta = new Date(hoy);
  limiteAlerta.setDate(
    limiteAlerta.getDate() + diasAlertaPrevia
  );

  if (vencimiento.getTime() <= limiteAlerta.getTime()) {
    return "POR_VENCER";
  }

  return "VIGENTE";
}

export const servicioMatrizEvaluacion = {
  obtenerContexto: async (
    empresaId: string,
    anio: number,
    usuario: UsuarioSesionEvaluacion
  ) => {
    validarAnio(anio);

    const empresa = await asegurarAccesoEmpresa(
      usuario,
      empresaId,
      "LECTURA"
    );

    const periodo = await prisma.empresaPeriodo.findUnique({
      where: {
        empresaId_anio: {
          empresaId,
          anio,
        },
      },
      include: {
        versionSupermatriz: {
          select: {
            id: true,
            nombre: true,
            estado: true,
          },
        },
      },
    });

    let versionDisponible: {
      id: number;
      nombre: string;
      estado: string;
      vigenteDesde: Date | null;
      vigenteHasta: Date | null;
    } | null = null;

    if (!periodo) {
      try {
        versionDisponible =
          await servicioPeriodosEvaluacion.obtenerVersionDisponible(
            anio
          );
      } catch (error) {
        if (
          !(
            error instanceof ErrorEvaluacion &&
            error.code === "VERSION_NO_DISPONIBLE"
          )
        ) {
          throw error;
        }
      }
    }

    const versionSupermatrizId =
      periodo?.versionSupermatrizId ??
      versionDisponible?.id ??
      null;

    const categoriasGestion =
      await prisma.categoriaGestion.findMany({
        where: {
          estado: EstadoRegistro.ACTIVO,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      });

    if (!versionSupermatrizId) {
      return {
        empresa,
        anio,
        periodo: null,
        versionDisponible: null,
        gestionActiva: null,
        categoriasGestion,
        filas: [],
        resumen: {
          totalAspectos: 0,
          evaluados: 0,
          sinRevision: 0,
          vigentes: 0,
          porVencer: 0,
          vencidos: 0,
          cumplimientoAdministrativo: 0,
          calificacionMinisterial: 0,
          calificacionMinisterialMaxima: 0,
        },
      };
    }

    const gestionActiva = periodo
      ? await prisma.gestionSgsst.findFirst({
          where: {
            empresaPeriodoId: periodo.id,
            usuarioCreadorId: usuario.usuarioId,
            estado: EstadoGestionSgsst.BORRADOR,
            valida: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            categoriaGestion: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
            profesional: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
        })
      : null;

    const tareas = await prisma.supermatrizTarea.findMany({
      where: {
        versionSupermatrizId,
        estado: EstadoRegistro.ACTIVO,
        aspecto: {
          estado: EstadoRegistro.ACTIVO,
          estandar: {
            estado: EstadoRegistro.ACTIVO,
            categoriaEstandar: {
              estado: EstadoRegistro.ACTIVO,
              cicloPhva: {
                estado: EstadoRegistro.ACTIVO,
              },
            },
          },
        },
        proceso: {
          estado: EstadoRegistro.ACTIVO,
        },
      },
      orderBy: [
        {
          orden: "asc",
        },
        {
          id: "asc",
        },
      ],
      include: {
        proceso: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
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
        aspecto: {
          include: {
            planAccionEspecifico: {
              select: {
                descripcion: true,
              },
            },
            configuracion: true,
            configuracionVigencia: true,
            configuracionEvidencia: true,
            configuracionRevision: true,
            estandar: {
              include: {
                categoriaEstandar: {
                  include: {
                    cicloPhva: {
                      select: {
                        id: true,
                        codigo: true,
                        nombre: true,
                        orden: true,
                      },
                    },
                  },
                },
                gruposMinisteriales: {
                  include: {
                    grupoMinisterial: {
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
          },
        },
      },
    });

    const evaluacionesFinalizadas = periodo
      ? await prisma.evaluacionAspecto.findMany({
          where: {
            gestion: {
              empresaPeriodoId: periodo.id,
              estado: EstadoGestionSgsst.FINALIZADA,
              valida: true,
            },
          },
          orderBy: [
            {
              gestion: {
                fechaGestion: "desc",
              },
            },
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
          include: {
            gestion: {
              select: {
                id: true,
                fechaGestion: true,
                tipoActividad: true,
                estado: true,
              },
            },
          },
        })
      : [];

    const evaluacionesBorrador = gestionActiva
      ? await prisma.evaluacionAspecto.findMany({
          where: {
            gestionId: gestionActiva.id,
          },
          include: {
            gestion: {
              select: {
                id: true,
                fechaGestion: true,
                tipoActividad: true,
                estado: true,
              },
            },
          },
        })
      : [];

    const ultimaPorAspecto = new Map<
      number,
      (typeof evaluacionesFinalizadas)[number]
    >();

    for (const evaluacion of evaluacionesFinalizadas) {
      if (!ultimaPorAspecto.has(evaluacion.aspectoId)) {
        ultimaPorAspecto.set(
          evaluacion.aspectoId,
          evaluacion
        );
      }
    }

    const borradorPorAspecto = new Map(
      evaluacionesBorrador.map((evaluacion) => [
        evaluacion.aspectoId,
        evaluacion,
      ])
    );

    const filas = tareas.map((tarea) => {
      const ultimaEvaluacion =
        ultimaPorAspecto.get(tarea.aspectoId) ?? null;
      const evaluacionGestionActiva =
        borradorPorAspecto.get(tarea.aspectoId) ?? null;
      const diasAlertaPrevia =
        tarea.aspecto.configuracionVigencia
          ?.diasAlertaPrevia ?? 30;

      return {
        tareaId: tarea.id,
        orden: tarea.orden,
        codigo: tarea.codigo,
        ejecucion: tarea.ejecucion,
        proceso: tarea.proceso,
        categoriasGestion: tarea.categoriasGestion.map(
          ({ categoriaGestion }) => categoriaGestion
        ),
        cicloPhva:
          tarea.aspecto.estandar.categoriaEstandar
            .cicloPhva,
        categoriaEstandar: {
          id: tarea.aspecto.estandar.categoriaEstandar.id,
          codigo:
            tarea.aspecto.estandar.categoriaEstandar
              .codigo,
          nombre:
            tarea.aspecto.estandar.categoriaEstandar
              .nombre,
        },
        estandar: {
          id: tarea.aspecto.estandar.id,
          codigo: tarea.aspecto.estandar.codigo,
          nombre: tarea.aspecto.estandar.nombre,
          calificacionMinisterialEsperada:
            tarea.aspecto.estandar
              .calificacionMinisterialEsperada?.toNumber() ??
            0.5,
          gruposMinisteriales:
            tarea.aspecto.estandar.gruposMinisteriales.map(
              ({ grupoMinisterial }) => grupoMinisterial
            ),
        },
        aspecto: {
          id: tarea.aspecto.id,
          codigo: tarea.aspecto.codigo,
          nombre: tarea.aspecto.nombre,
          planAccionEspecifico:
            tarea.aspecto.planAccionEspecifico
              ?.descripcion ?? null,
          configuracion: tarea.aspecto.configuracion,
          configuracionVigencia:
            tarea.aspecto.configuracionVigencia,
          configuracionEvidencia:
            tarea.aspecto.configuracionEvidencia,
          configuracionRevision:
            tarea.aspecto.configuracionRevision,
        },
        ultimaEvaluacion: ultimaEvaluacion
          ? serializarEvaluacion(ultimaEvaluacion)
          : null,
        evaluacionGestionActiva: evaluacionGestionActiva
          ? serializarEvaluacion(evaluacionGestionActiva)
          : null,
        estadoVigencia: calcularEstadoVigencia(
          ultimaEvaluacion,
          diasAlertaPrevia
        ),
      };
    });

    const aspectosUnicos = new Map<
      number,
      (typeof filas)[number]
    >();

    for (const fila of filas) {
      if (!aspectosUnicos.has(fila.aspecto.id)) {
        aspectosUnicos.set(fila.aspecto.id, fila);
      }
    }

    const filasAspectos = [...aspectosUnicos.values()];
    const evaluadas = filasAspectos.filter(
      (fila) => Boolean(fila.ultimaEvaluacion)
    );

    const promedioAdministrativo =
      evaluadas.length > 0
        ? evaluadas.reduce(
            (acumulado, fila) =>
              acumulado +
              (fila.ultimaEvaluacion
                ?.calificacionAdministrativa ?? 0),
            0
          ) / evaluadas.length
        : 0;

    const estandares = new Map<
      number,
      {
        esperada: number;
        aspectos: Set<number>;
      }
    >();

    for (const fila of filasAspectos) {
      const actual = estandares.get(fila.estandar.id) ?? {
        esperada:
          fila.estandar.calificacionMinisterialEsperada,
        aspectos: new Set<number>(),
      };

      actual.aspectos.add(fila.aspecto.id);
      estandares.set(fila.estandar.id, actual);
    }

    let calificacionMinisterial = 0;
    let calificacionMinisterialMaxima = 0;

    for (const estandar of estandares.values()) {
      calificacionMinisterialMaxima += estandar.esperada;

      const cumpleCompleto = [...estandar.aspectos].every(
        (aspectoId) => {
          const evaluacion = ultimaPorAspecto.get(aspectoId);

          return (
            evaluacion?.estadoCumplimiento ===
              EstadoCumplimientoAspecto.CUMPLIDO ||
            evaluacion?.estadoCumplimiento ===
              EstadoCumplimientoAspecto.NO_APLICA
          );
        }
      );

      if (cumpleCompleto) {
        calificacionMinisterial += estandar.esperada;
      }
    }

    const contarVigencia = (
      estado: (typeof filasAspectos)[number]["estadoVigencia"]
    ) =>
      filasAspectos.filter(
        (fila) => fila.estadoVigencia === estado
      ).length;

    return {
      empresa,
      anio,
      periodo: periodo
        ? {
            id: periodo.id,
            anio: periodo.anio,
            estado: periodo.estado,
            fechaApertura:
              periodo.fechaApertura.toISOString(),
            fechaCierre: serializarFecha(periodo.fechaCierre),
            versionSupermatriz:
              periodo.versionSupermatriz,
          }
        : null,
      versionDisponible: versionDisponible
        ? {
            ...versionDisponible,
            vigenteDesde: serializarFecha(
              versionDisponible.vigenteDesde
            ),
            vigenteHasta: serializarFecha(
              versionDisponible.vigenteHasta
            ),
          }
        : null,
      gestionActiva: gestionActiva
        ? {
            id: gestionActiva.id,
            fechaGestion:
              gestionActiva.fechaGestion.toISOString(),
            modalidad: gestionActiva.modalidad,
            tipoActividad: gestionActiva.tipoActividad,
            observacionGeneral:
              gestionActiva.observacionGeneral,
            estado: gestionActiva.estado,
            categoriaGestion:
              gestionActiva.categoriaGestion,
            profesional: gestionActiva.profesional,
          }
        : null,
      categoriasGestion,
      filas,
      resumen: {
        totalAspectos: filasAspectos.length,
        evaluados: evaluadas.length,
        sinRevision: contarVigencia("SIN_REVISION"),
        vigentes:
          contarVigencia("VIGENTE") +
          contarVigencia("SIN_VENCIMIENTO"),
        porVencer: contarVigencia("POR_VENCER"),
        vencidos: contarVigencia("VENCIDO"),
        cumplimientoAdministrativo: Number(
          promedioAdministrativo.toFixed(2)
        ),
        calificacionMinisterial: Number(
          calificacionMinisterial.toFixed(2)
        ),
        calificacionMinisterialMaxima: Number(
          calificacionMinisterialMaxima.toFixed(2)
        ),
      },
    };
  },
};

import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoRegistro,
  Prisma,
  RolUsuario,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  ErrorEvaluacion,
  validarAnio,
} from "../../utils/evaluacion";
import {
  resolverVigenciaEvaluacion,
  type ResultadoVigenciaEvaluacion,
} from "../../utils/vigencia-evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";

type BooleanoMysql = boolean | number | bigint | null;

interface TareaResumenRaw {
  tareaId: number;
  tareaCodigo: string | null;
  tareaOrden: number;
  aspectoId: number;
  versionId: number;
  versionNombre: string;
  versionEstado: string;
  procesoId: number;
  procesoCodigo: string | null;
  procesoNombre: string;
  procesoDescripcion: string | null;
  aspectoCodigo: string | null;
  aspectoNombre: string;
  configuracionAspectoId: number | null;
  esEvergreen: BooleanoMysql;
  configuracionVigenciaId: number | null;
  tipoFechaBase: TipoFechaBaseVigencia | null;
  cantidad: number | null;
  unidad: UnidadPeriodicidad | null;
  diasAlertaPrevia: number | null;
  mesFechaFija: number | null;
  diaFechaFija: number | null;
}

interface CategoriaGestionRaw {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

interface EvaluacionVigenciaRaw {
  evaluacionId: string | null;
  estadoCumplimiento: EstadoCumplimientoAspecto | null;
  fechaDocumento: Date | string | null;
  fechaVencimientoCalculada: Date | string | null;
}

function serializarFecha(
  value: Date | null | undefined
): string | null {
  return value ? value.toISOString() : null;
}

function serializarDetalleVigencia(
  detalle: ResultadoVigenciaEvaluacion
) {
  return {
    ...detalle,
    fechaVencimiento: serializarFecha(
      detalle.fechaVencimiento
    ),
  };
}

function comoBooleano(value: BooleanoMysql): boolean {
  return value === true || value === 1 || value === 1n;
}

function comoFecha(
  value: Date | string | null
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const fecha = new Date(value);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function usuarioEsCliente(
  usuario: UsuarioSesionEvaluacion
): boolean {
  return (
    usuario.rol === RolUsuario.ADMIN_CLIENTE ||
    usuario.rol === RolUsuario.USUARIO_CLIENTE
  );
}

function milisegundosDesde(inicio: bigint): number {
  return Number(
    (
      Number(process.hrtime.bigint() - inicio) /
      1_000_000
    ).toFixed(1)
  );
}

function convertirEvaluacion(
  row: EvaluacionVigenciaRaw | undefined
) {
  if (!row?.evaluacionId || !row.estadoCumplimiento) {
    return null;
  }

  return {
    estadoCumplimiento: row.estadoCumplimiento,
    fechaDocumento: comoFecha(row.fechaDocumento),
    fechaVencimientoCalculada: comoFecha(
      row.fechaVencimientoCalculada
    ),
  };
}

async function obtenerTareaBase(
  tareaId: number,
  versionSupermatrizId: number
): Promise<TareaResumenRaw | null> {
  const filas = await prisma.$queryRaw<TareaResumenRaw[]>(
    Prisma.sql`
      SELECT
        st.id AS tareaId,
        st.codigo AS tareaCodigo,
        st.orden AS tareaOrden,
        st.aspectoId AS aspectoId,
        vs.id AS versionId,
        vs.nombre AS versionNombre,
        vs.estado AS versionEstado,
        p.id AS procesoId,
        p.codigo AS procesoCodigo,
        p.nombre AS procesoNombre,
        p.descripcion AS procesoDescripcion,
        a.codigo AS aspectoCodigo,
        a.nombre AS aspectoNombre,
        ca.id AS configuracionAspectoId,
        ca.esEvergreen AS esEvergreen,
        cv.id AS configuracionVigenciaId,
        cv.tipoFechaBase AS tipoFechaBase,
        cv.cantidad AS cantidad,
        cv.unidad AS unidad,
        cv.diasAlertaPrevia AS diasAlertaPrevia,
        cv.mesFechaFija AS mesFechaFija,
        cv.diaFechaFija AS diaFechaFija
      FROM supermatriz_tareas st
      INNER JOIN versiones_supermatriz vs
        ON vs.id = st.versionSupermatrizId
      INNER JOIN procesos p
        ON p.id = st.procesoId
      INNER JOIN aspectos a
        ON a.id = st.aspectoId
      LEFT JOIN configuraciones_aspecto ca
        ON ca.aspectoId = a.id
      LEFT JOIN configuraciones_vigencia_aspecto cv
        ON cv.aspectoId = a.id
      WHERE st.id = ${tareaId}
        AND st.versionSupermatrizId = ${versionSupermatrizId}
        AND st.estado = ${EstadoRegistro.ACTIVO}
      LIMIT 1
    `
  );

  return filas[0] ?? null;
}

async function obtenerCategoriasGestion(
  tareaId: number
): Promise<CategoriaGestionRaw[]> {
  return prisma.$queryRaw<CategoriaGestionRaw[]>(
    Prisma.sql`
      SELECT
        cg.id AS id,
        cg.codigo AS codigo,
        cg.nombre AS nombre,
        cg.descripcion AS descripcion
      FROM supermatriz_tarea_categorias_gestion stcg
      INNER JOIN categorias_gestion cg
        ON cg.id = stcg.categoriaGestionId
      WHERE stcg.supermatrizTareaId = ${tareaId}
      ORDER BY cg.id ASC
    `
  );
}

async function obtenerEvaluacionBorrador(
  gestionId: string | null,
  aspectoId: number
): Promise<EvaluacionVigenciaRaw | undefined> {
  if (!gestionId) return undefined;

  const filas = await prisma.$queryRaw<
    EvaluacionVigenciaRaw[]
  >(
    Prisma.sql`
      SELECT
        ea.id AS evaluacionId,
        ea.estadoCumplimiento AS estadoCumplimiento,
        ea.fechaDocumento AS fechaDocumento,
        ea.fechaVencimientoCalculada AS fechaVencimientoCalculada
      FROM gestiones_sgsst gs
      LEFT JOIN evaluaciones_aspecto ea
        ON ea.gestionId = gs.id
        AND ea.aspectoId = ${aspectoId}
      WHERE gs.id = ${gestionId}
        AND gs.estado = ${EstadoGestionSgsst.BORRADOR}
        AND gs.valida = 1
      LIMIT 1
    `
  );

  return filas[0];
}

async function obtenerUltimaEvaluacion(
  empresaId: string,
  aspectoId: number,
  codigoAspecto: string | null
): Promise<EvaluacionVigenciaRaw | undefined> {
  const filtroAspecto = codigoAspecto
    ? Prisma.sql`a.codigo = ${codigoAspecto}`
    : Prisma.sql`ea.aspectoId = ${aspectoId}`;

  const filas = await prisma.$queryRaw<
    EvaluacionVigenciaRaw[]
  >(
    Prisma.sql`
      SELECT
        ea.id AS evaluacionId,
        ea.estadoCumplimiento AS estadoCumplimiento,
        ea.fechaDocumento AS fechaDocumento,
        ea.fechaVencimientoCalculada AS fechaVencimientoCalculada
      FROM evaluaciones_aspecto ea
      INNER JOIN gestiones_sgsst gs
        ON gs.id = ea.gestionId
      INNER JOIN empresa_periodos_sgsst ep
        ON ep.id = gs.empresaPeriodoId
      INNER JOIN aspectos a
        ON a.id = ea.aspectoId
      WHERE ep.empresaId = ${empresaId}
        AND gs.valida = 1
        AND gs.estado = ${EstadoGestionSgsst.FINALIZADA}
        AND ${filtroAspecto}
      ORDER BY gs.fechaGestion DESC, ea.createdAt DESC
      LIMIT 1
    `
  );

  return filas[0];
}

export const servicioDetalleResumenDinamico = {
  obtener: async (
    empresaId: string,
    tareaId: number,
    anio: number,
    usuario: UsuarioSesionEvaluacion,
    gestionId?: string | null
  ) => {
    validarAnio(anio);

    const inicioTotal = process.hrtime.bigint();
    const inicioAcceso = process.hrtime.bigint();

    const [empresa, periodo] = await Promise.all([
      asegurarAccesoEmpresa(
        usuario,
        empresaId,
        "LECTURA"
      ),
      prisma.empresaPeriodo.findUnique({
        where: {
          empresaId_anio: {
            empresaId,
            anio,
          },
        },
        select: {
          id: true,
          anio: true,
          estado: true,
          versionSupermatrizId: true,
        },
      }),
    ]);

    const accesoPeriodoMs = milisegundosDesde(
      inicioAcceso
    );

    if (!periodo) {
      throw new ErrorEvaluacion(
        "El periodo seleccionado todavía no está abierto.",
        404,
        "PERIODO_NO_ENCONTRADO"
      );
    }

    const inicioTarea = process.hrtime.bigint();
    const [tarea, categoriasGestion, gestionSeleccionada] =
      await Promise.all([
        obtenerTareaBase(
          tareaId,
          periodo.versionSupermatrizId
        ),
        obtenerCategoriasGestion(tareaId),
        resolverBorradorSeleccionado(
          periodo.id,
          usuario,
          gestionId
        ),
      ]);
    const tareaMs = milisegundosDesde(inicioTarea);

    if (!tarea) {
      throw new ErrorEvaluacion(
        "La fila seleccionada no pertenece a la versión de este periodo.",
        404,
        "FILA_NO_ENCONTRADA"
      );
    }

    const inicioEvaluaciones = process.hrtime.bigint();
    const [borradorRaw, ultimaRaw] = await Promise.all([
      obtenerEvaluacionBorrador(
        gestionSeleccionada?.id ?? null,
        tarea.aspectoId
      ),
      obtenerUltimaEvaluacion(
        empresaId,
        tarea.aspectoId,
        tarea.aspectoCodigo
      ),
    ]);
    const evaluacionesMs = milisegundosDesde(
      inicioEvaluaciones
    );

    const evaluacionBorrador = convertirEvaluacion(
      borradorRaw
    );
    const ultimaEvaluacion = convertirEvaluacion(ultimaRaw);
    const evaluacionObjetivo =
      evaluacionBorrador ?? ultimaEvaluacion;

    const configuracionVigencia =
      tarea.configuracionVigenciaId && tarea.tipoFechaBase
        ? {
            tipoFechaBase: tarea.tipoFechaBase,
            cantidad: tarea.cantidad,
            unidad: tarea.unidad,
            diasAlertaPrevia:
              tarea.diasAlertaPrevia ?? 30,
            mesFechaFija: tarea.mesFechaFija,
            diaFechaFija: tarea.diaFechaFija,
          }
        : null;

    const detalleVigencia = resolverVigenciaEvaluacion({
      evaluacion: evaluacionObjetivo,
      configuracion: configuracionVigencia,
      esEvergreen: comoBooleano(tarea.esEvergreen),
      provisional: Boolean(evaluacionBorrador),
    });

    const totalMs = milisegundosDesde(inicioTotal);

    if (totalMs >= 750) {
      console.info(
        "[rendimiento] resumen-rapido-etapas",
        {
          empresaId,
          tareaId,
          anio,
          gestionId: gestionSeleccionada?.id ?? null,
          accesoPeriodoMs,
          tareaMs,
          evaluacionesMs,
          totalMs,
        }
      );
    }

    return {
      empresa,
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        estado: periodo.estado,
        versionSupermatriz: {
          id: tarea.versionId,
          nombre: tarea.versionNombre,
          estado: tarea.versionEstado,
        },
      },
      tarea: {
        id: tarea.tareaId,
        codigo: tarea.tareaCodigo,
        orden: tarea.tareaOrden,
        versionSupermatriz: {
          id: tarea.versionId,
          nombre: tarea.versionNombre,
          estado: tarea.versionEstado,
        },
        proceso: {
          id: tarea.procesoId,
          codigo: tarea.procesoCodigo,
          nombre: tarea.procesoNombre,
          descripcion: tarea.procesoDescripcion,
        },
        categoriasGestion,
        aspecto: {
          id: tarea.aspectoId,
          codigo: tarea.aspectoCodigo,
          nombre: tarea.aspectoNombre,
        },
      },
      detalleVigencia:
        serializarDetalleVigencia(detalleVigencia),
      permisos: {
        puedeVerRevisionTecnica:
          !usuarioEsCliente(usuario),
      },
    };
  },
};

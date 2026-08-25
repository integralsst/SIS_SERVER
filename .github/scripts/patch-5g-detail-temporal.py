from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: se esperaba 1 coincidencia y se encontraron {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: se esperaba 1 coincidencia y se encontraron {count}")
    return updated


# ==========================================================
# detalle-aspecto-rapido.service.ts
# ==========================================================
path = "src/services/evaluacion/detalle-aspecto-rapido.service.ts"
text = read(path)

text = replace_once(
    text,
    'import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";\n',
    'import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";\nimport {\n  construirCorteAnual,\n  servicioPeriodosEvaluacion,\n} from "./periodos-evaluacion.service";\n',
    "rapido/import-periodos",
)

text = regex_once(
    text,
    r'function filtroAspectoHistorico\([\s\S]*?\n}\n\nasync function resolverEmpresaPeriodo',
    '''function filtroAspectoHistorico(\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null\n): Prisma.EvaluacionAspectoWhereInput {\n  if (identidadHistorica) {\n    return {\n      aspecto: {\n        identidadHistorica,\n      },\n    };\n  }\n\n  if (codigo) {\n    return {\n      aspecto: {\n        codigo,\n      },\n    };\n  }\n\n  return {\n    aspectoId,\n  };\n}\n\nasync function resolverEmpresaPeriodo''',
    "rapido/filtro-identidad",
)

text = regex_once(
    text,
    r'async function resolverEmpresaPeriodo\([\s\S]*?\n}\n\nasync function buscarGestionActiva',
    '''async function resolverEmpresaPeriodo(\n  empresaId: string,\n  anio: number,\n  usuario: UsuarioSesionEvaluacion\n) {\n  validarAnio(anio);\n\n  const fechaCorte = construirCorteAnual(anio);\n  const [empresa, periodo, versionAplicable] = await Promise.all([\n    asegurarAccesoEmpresa(\n      usuario,\n      empresaId,\n      "LECTURA"\n    ),\n    prisma.empresaPeriodo.findUnique({\n      where: {\n        empresaId_anio: {\n          empresaId,\n          anio,\n        },\n      },\n      select: {\n        id: true,\n        anio: true,\n        estado: true,\n      },\n    }),\n    servicioPeriodosEvaluacion.resolverVersionParaFecha(\n      fechaCorte\n    ),\n  ]);\n\n  if (!periodo) {\n    throw new ErrorEvaluacion(\n      "El periodo seleccionado todavía no está abierto.",\n      404,\n      "PERIODO_NO_ENCONTRADO"\n    );\n  }\n\n  return {\n    empresa,\n    periodo,\n    fechaCorte,\n    versionAplicable,\n  };\n}\n\nasync function buscarGestionActiva''',
    "rapido/contexto-temporal",
)

text = regex_once(
    text,
    r'async function buscarUltimaEvaluacionVigencia\([\s\S]*?\n}\n\nasync function resolverTareaMinima',
    '''async function buscarUltimaEvaluacionVigencia(\n  empresaId: string,\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null,\n  fechaCorte: Date\n) {\n  return prisma.evaluacionAspecto.findFirst({\n    where: {\n      ...filtroAspectoHistorico(\n        aspectoId,\n        identidadHistorica,\n        codigo\n      ),\n      gestion: {\n        empresaPeriodo: {\n          empresaId,\n        },\n        fechaGestion: {\n          lte: fechaCorte,\n        },\n        valida: true,\n        estado: EstadoGestionSgsst.FINALIZADA,\n      },\n    },\n    orderBy: [\n      {\n        gestion: {\n          fechaGestion: "desc",\n        },\n      },\n      {\n        createdAt: "desc",\n      },\n      {\n        id: "desc",\n      },\n    ],\n    select: seleccionEvaluacionVigencia,\n  });\n}\n\nasync function resolverTareaMinima''',
    "rapido/ultima-al-corte",
)

text = replace_once(
    text,
    '''        select: {\n          id: true,\n          codigo: true,\n          nombre: true,\n        },''',
    '''        select: {\n          id: true,\n          identidadHistorica: true,\n          codigo: true,\n          nombre: true,\n        },''',
    "rapido/tarea-minima-identidad",
)

text = replace_once(
    text,
    '''    aspecto: {\n      codigo: string | null;\n      nombre: string;\n    };\n  },\n  usuario: UsuarioSesionEvaluacion,\n  esCliente: boolean\n) {''',
    '''    aspecto: {\n      identidadHistorica: string;\n      codigo: string | null;\n      nombre: string;\n    };\n  },\n  usuario: UsuarioSesionEvaluacion,\n  esCliente: boolean,\n  fechaCorte: Date\n) {''',
    "rapido/compromisos-firma",
)

text = regex_once(
    text,
    r'      \.\.\.\(tarea\.aspecto\.codigo[\s\S]*?\n          \}\),\n      \.\.\.\(esCliente',
    '''      aspecto: {\n        identidadHistorica:\n          tarea.aspecto.identidadHistorica,\n      },\n      gestionOrigen: {\n        fechaGestion: {\n          lte: fechaCorte,\n        },\n      },\n      ...(esCliente''',
    "rapido/compromisos-identidad-corte",
)

text = replace_once(
    text,
    '''    const { empresa, periodo } =\n      await resolverEmpresaPeriodo(''',
    '''    const {\n      empresa,\n      periodo,\n      fechaCorte,\n      versionAplicable,\n    } = await resolverEmpresaPeriodo(''',
    "rapido/resumen-contexto",
)

text = replace_once(
    text,
    '''          versionSupermatrizId:\n            periodo.versionSupermatrizId,''',
    '''          versionSupermatrizId:\n            versionAplicable.id,''',
    "rapido/resumen-version",
)

text = replace_once(
    text,
    '''              id: true,\n              codigo: true,\n              nombre: true,\n              configuracion:''',
    '''              id: true,\n              identidadHistorica: true,\n              codigo: true,\n              nombre: true,\n              configuracion:''',
    "rapido/resumen-identidad",
)

text = replace_once(
    text,
    '''        buscarUltimaEvaluacionVigencia(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.codigo\n        ),''',
    '''        buscarUltimaEvaluacionVigencia(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.identidadHistorica,\n          tarea.aspecto.codigo,\n          fechaCorte\n        ),''',
    "rapido/resumen-ultima",
)

text = replace_once(
    text,
    '''        versionSupermatriz:\n          periodo.versionSupermatriz,''',
    '''        versionSupermatriz:\n          versionAplicable,''',
    "rapido/resumen-version-response",
)

# Configuración: segunda resolución de periodo.
config_marker = '  obtenerConfiguracion: async ('
config_pos = text.index(config_marker)
hist_pos = text.index('  obtenerHistorialPaginado: async (')
prefix, config_block, suffix = text[:config_pos], text[config_pos:hist_pos], text[hist_pos:]
config_block = replace_once(
    config_block,
    '''    const { periodo } = await resolverEmpresaPeriodo(''',
    '''    const { periodo, versionAplicable } =\n      await resolverEmpresaPeriodo(''',
    "rapido/config-contexto",
)
config_block = replace_once(
    config_block,
    '''      periodo.versionSupermatrizId\n    );''',
    '''      versionAplicable.id\n    );''',
    "rapido/config-version",
)
text = prefix + config_block + suffix

# Historial paginado: contexto anual, identidad histórica y corte.
hist_pos = text.index('  obtenerHistorialPaginado: async (')
prefix, hist_block = text[:hist_pos], text[hist_pos:]
hist_block = replace_once(
    hist_block,
    '''    const { periodo } = await resolverEmpresaPeriodo(''',
    '''    const {\n      periodo,\n      fechaCorte,\n      versionAplicable,\n    } = await resolverEmpresaPeriodo(''',
    "rapido/hist-contexto",
)
hist_block = replace_once(
    hist_block,
    '''      periodo.versionSupermatrizId\n    );''',
    '''      versionAplicable.id\n    );''',
    "rapido/hist-version",
)
hist_block = replace_once(
    hist_block,
    '''            usuario,\n            esCliente\n          )''',
    '''            usuario,\n            esCliente,\n            fechaCorte\n          )''',
    "rapido/hist-compromisos-corte",
)
hist_block = replace_once(
    hist_block,
    '''          ...filtroAspectoHistorico(\n            tarea.aspectoId,\n            tarea.aspecto.codigo\n          ),''',
    '''          ...filtroAspectoHistorico(\n            tarea.aspectoId,\n            tarea.aspecto.identidadHistorica,\n            tarea.aspecto.codigo\n          ),''',
    "rapido/hist-identidad",
)
hist_block = replace_once(
    hist_block,
    '''            empresaPeriodo: {\n              empresaId,\n            },\n            ...(esCliente''',
    '''            empresaPeriodo: {\n              empresaId,\n            },\n            fechaGestion: {\n              lte: fechaCorte,\n            },\n            ...(esCliente''',
    "rapido/hist-corte",
)
text = prefix + hist_block
write(path, text)


# ==========================================================
# detalle-aspecto-secciones.service.ts
# Solo endpoints usados actualmente por el controlador:
# resumen e historial no paginado.
# ==========================================================
path = "src/services/evaluacion/detalle-aspecto-secciones.service.ts"
text = read(path)

text = replace_once(
    text,
    'import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";\n',
    'import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";\nimport { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";\nimport {\n  construirCorteAnual,\n  servicioPeriodosEvaluacion,\n} from "./periodos-evaluacion.service";\n',
    "secciones/import-temporal",
)

text = regex_once(
    text,
    r'function filtroAspectoHistorico\([\s\S]*?\n}\n\nasync function resolverEmpresaPeriodo',
    '''function filtroAspectoHistorico(\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null\n): Prisma.EvaluacionAspectoWhereInput {\n  if (identidadHistorica) {\n    return {\n      aspecto: {\n        identidadHistorica,\n      },\n    };\n  }\n\n  if (codigo) {\n    return {\n      aspecto: {\n        codigo,\n      },\n    };\n  }\n\n  return {\n    aspectoId,\n  };\n}\n\nasync function resolverEmpresaPeriodo''',
    "secciones/filtro-identidad",
)

text = replace_once(
    text,
    '''          id: true,\n          codigo: true,\n          nombre: true,\n          configuracion: true,''',
    '''          id: true,\n          identidadHistorica: true,\n          codigo: true,\n          nombre: true,\n          configuracion: true,''',
    "secciones/tarea-identidad",
)

text = regex_once(
    text,
    r'async function buscarUltimaFinalizada\([\s\S]*?\n}\n\nfunction serializarEvaluacionDetalle',
    '''async function buscarUltimaFinalizada(\n  empresaId: string,\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null,\n  fechaCorte: Date\n) {\n  return prisma.evaluacionAspecto.findFirst({\n    where: {\n      ...filtroAspectoHistorico(\n        aspectoId,\n        identidadHistorica,\n        codigo\n      ),\n      gestion: {\n        empresaPeriodo: {\n          empresaId,\n        },\n        fechaGestion: {\n          lte: fechaCorte,\n        },\n        valida: true,\n        estado: EstadoGestionSgsst.FINALIZADA,\n      },\n    },\n    orderBy: [\n      {\n        gestion: {\n          fechaGestion: "desc",\n        },\n      },\n      {\n        createdAt: "desc",\n      },\n      {\n        id: "desc",\n      },\n    ],\n    include: inclusionEvaluacionDetalle,\n  });\n}\n\nfunction serializarEvaluacionDetalle''',
    "secciones/ultima-al-corte",
)

# Resumen: usar gestión seleccionada para resolver fecha y versión.
summary_start = text.index('  obtenerResumen: async (')
history_start = text.index('  obtenerHistorial: async (')
prefix, summary, rest = text[:summary_start], text[summary_start:history_start], text[history_start:]
summary = replace_once(
    summary,
    '''    usuario: UsuarioSesionEvaluacion\n  ) => {''',
    '''    usuario: UsuarioSesionEvaluacion,\n    gestionId?: string | null\n  ) => {''',
    "secciones/resumen-signature",
)
summary = replace_once(
    summary,
    '''    const [tarea, gestionActiva] = await Promise.all([\n      prisma.supermatrizTarea.findFirst({''',
    '''    const gestionActiva =\n      await resolverBorradorSeleccionado(\n        periodo.id,\n        usuario,\n        gestionId\n      );\n    const fechaCorte =\n      gestionActiva?.fechaGestion ?? construirCorteAnual(anio);\n    const versionAplicable =\n      await servicioPeriodosEvaluacion.resolverVersionParaFecha(\n        fechaCorte\n      );\n\n    const tarea = await prisma.supermatrizTarea.findFirst({''',
    "secciones/resumen-gestion-version",
)
summary = replace_once(
    summary,
    '''          versionSupermatrizId:\n            periodo.versionSupermatrizId,''',
    '''          versionSupermatrizId:\n            versionAplicable.id,''',
    "secciones/resumen-version",
)
# Cerrar el antiguo Promise.all: retirar buscarGestionActiva y corchetes.
summary = regex_once(
    summary,
    r'\n      \}\),\n      buscarGestionActiva\([\s\S]*?\n      \),\n    \]\);',
    '\n      });',
    "secciones/resumen-quitar-busqueda-antigua",
)
summary = replace_once(
    summary,
    '''        buscarUltimaFinalizada(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.codigo\n        ),''',
    '''        buscarUltimaFinalizada(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.identidadHistorica,\n          tarea.aspecto.codigo,\n          fechaCorte\n        ),''',
    "secciones/resumen-ultima",
)
summary = replace_once(
    summary,
    '''        versionSupermatriz:\n          periodo.versionSupermatriz,''',
    '''        versionSupermatriz:\n          versionAplicable,''',
    "secciones/resumen-version-response",
)
text = prefix + summary + rest

# Historial no paginado: versión al corte e impedir mirar años posteriores.
history_start = text.index('  obtenerHistorial: async (')
evidence_start = text.index('  obtenerEvidencias: async (')
prefix, history, rest = text[:history_start], text[history_start:evidence_start], text[evidence_start:]
history = replace_once(
    history,
    '''    const { periodo } = await resolverEmpresaPeriodo(''',
    '''    const { periodo } = await resolverEmpresaPeriodo(''',
    "secciones/hist-periodo-presente",
)
history = replace_once(
    history,
    '''    const tarea = await resolverTareaMinima(\n      tareaId,\n      periodo.versionSupermatrizId\n    );''',
    '''    const fechaCorte = construirCorteAnual(anio);\n    const versionAplicable =\n      await servicioPeriodosEvaluacion.resolverVersionParaFecha(\n        fechaCorte\n      );\n    const tarea = await resolverTareaMinima(\n      tareaId,\n      versionAplicable.id\n    );''',
    "secciones/hist-version",
)
history = replace_once(
    history,
    '''          ...filtroAspectoHistorico(\n            tarea.aspectoId,\n            tarea.aspecto.codigo\n          ),''',
    '''          ...filtroAspectoHistorico(\n            tarea.aspectoId,\n            tarea.aspecto.identidadHistorica,\n            tarea.aspecto.codigo\n          ),''',
    "secciones/hist-identidad",
)
history = replace_once(
    history,
    '''            empresaPeriodo: {\n              empresaId,\n            },\n            ...(esCliente''',
    '''            empresaPeriodo: {\n              empresaId,\n            },\n            fechaGestion: {\n              lte: fechaCorte,\n            },\n            ...(esCliente''',
    "secciones/hist-corte",
)
text = prefix + history + rest
write(path, text)


# ==========================================================
# detalle-borrador-seleccionado.service.ts
# Evidencias y revisión técnica del controlador actual.
# ==========================================================
path = "src/services/evaluacion/detalle-borrador-seleccionado.service.ts"
text = read(path)

text = replace_once(
    text,
    'import { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";\n',
    'import { resolverBorradorSeleccionado } from "./borrador-seleccionado.service";\nimport {\n  construirCorteAnual,\n  servicioPeriodosEvaluacion,\n} from "./periodos-evaluacion.service";\n',
    "borrador/import-temporal",
)

text = regex_once(
    text,
    r'function filtroAspectoHistorico\([\s\S]*?\n}\n\nasync function resolverPeriodoYTarea',
    '''function filtroAspectoHistorico(\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null\n): Prisma.EvaluacionAspectoWhereInput {\n  if (identidadHistorica) {\n    return {\n      aspecto: {\n        identidadHistorica,\n      },\n    };\n  }\n\n  if (codigo) {\n    return {\n      aspecto: {\n        codigo,\n      },\n    };\n  }\n\n  return {\n    aspectoId,\n  };\n}\n\nasync function resolverPeriodoYTarea''',
    "borrador/filtro-identidad",
)

text = regex_once(
    text,
    r'async function resolverPeriodoYTarea\([\s\S]*?\n}\n\nasync function buscarEvaluacionBorrador',
    '''async function resolverPeriodo(\n  empresaId: string,\n  anio: number\n) {\n  const periodo = await prisma.empresaPeriodo.findUnique({\n    where: {\n      empresaId_anio: {\n        empresaId,\n        anio,\n      },\n    },\n    select: {\n      id: true,\n    },\n  });\n\n  if (!periodo) {\n    throw new ErrorEvaluacion(\n      "El periodo seleccionado todavía no está abierto.",\n      404,\n      "PERIODO_NO_ENCONTRADO"\n    );\n  }\n\n  return periodo;\n}\n\nasync function resolverTareaParaFecha(\n  tareaId: number,\n  fechaCorte: Date\n) {\n  const versionAplicable =\n    await servicioPeriodosEvaluacion.resolverVersionParaFecha(\n      fechaCorte\n    );\n\n  const tarea = await prisma.supermatrizTarea.findFirst({\n    where: {\n      id: tareaId,\n      versionSupermatrizId: versionAplicable.id,\n      estado: EstadoRegistro.ACTIVO,\n    },\n    select: {\n      aspectoId: true,\n      aspecto: {\n        select: {\n          identidadHistorica: true,\n          codigo: true,\n        },\n      },\n    },\n  });\n\n  if (!tarea) {\n    throw new ErrorEvaluacion(\n      "La fila seleccionada no pertenece a la versión aplicable en la fecha consultada.",\n      404,\n      "FILA_NO_ENCONTRADA"\n    );\n  }\n\n  return tarea;\n}\n\nasync function buscarEvaluacionBorrador''',
    "borrador/contexto-temporal",
)

text = regex_once(
    text,
    r'async function buscarUltimaFinalizada\([\s\S]*?\n}\n\nfunction serializarEvaluacionDetalle',
    '''async function buscarUltimaFinalizada(\n  empresaId: string,\n  aspectoId: number,\n  identidadHistorica: string | null,\n  codigo: string | null,\n  fechaCorte: Date\n): Promise<EvaluacionDetalle | null> {\n  return prisma.evaluacionAspecto.findFirst({\n    where: {\n      ...filtroAspectoHistorico(\n        aspectoId,\n        identidadHistorica,\n        codigo\n      ),\n      gestion: {\n        empresaPeriodo: {\n          empresaId,\n        },\n        fechaGestion: {\n          lte: fechaCorte,\n        },\n        valida: true,\n        estado: EstadoGestionSgsst.FINALIZADA,\n      },\n    },\n    orderBy: [\n      {\n        gestion: {\n          fechaGestion: "desc",\n        },\n      },\n      {\n        createdAt: "desc",\n      },\n      {\n        id: "desc",\n      },\n    ],\n    include: inclusionEvaluacionDetalle,\n  });\n}\n\nfunction serializarEvaluacionDetalle''',
    "borrador/ultima-al-corte",
)

# Evidencias: periodo -> borrador -> fecha -> versión/tarea.
evid_start = text.index('  obtenerEvidencias: async (')
rev_start = text.index('  obtenerRevisionTecnica: async (')
prefix, evid, rev = text[:evid_start], text[evid_start:rev_start], text[rev_start:]
evid = regex_once(
    evid,
    r'    const \{ periodo, tarea \} = await resolverPeriodoYTarea\([\s\S]*?\n    \);\n    const gestion = await resolverBorradorSeleccionado\([\s\S]*?\n    \);',
    '''    const periodo = await resolverPeriodo(\n      empresaId,\n      anio\n    );\n    const gestion = await resolverBorradorSeleccionado(\n      periodo.id,\n      usuario,\n      gestionId\n    );\n    const fechaCorte =\n      gestion?.fechaGestion ?? construirCorteAnual(anio);\n    const tarea = await resolverTareaParaFecha(\n      tareaId,\n      fechaCorte\n    );''',
    "borrador/evid-contexto",
)
evid = replace_once(
    evid,
    '''        buscarUltimaFinalizada(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.codigo\n        ),''',
    '''        buscarUltimaFinalizada(\n          empresaId,\n          tarea.aspectoId,\n          tarea.aspecto.identidadHistorica,\n          tarea.aspecto.codigo,\n          fechaCorte\n        ),''',
    "borrador/evid-ultima",
)
evid = regex_once(
    evid,
    r'              \.\.\.\(tarea\.aspecto\.codigo[\s\S]*?\n                  \}\),\n              \.\.\.\(esCliente',
    '''              aspecto: {\n                identidadHistorica:\n                  tarea.aspecto.identidadHistorica,\n              },\n              ...(esCliente''',
    "borrador/evid-compromiso-identidad",
)
text = prefix + evid + rev

# Revisión técnica: mismo contexto y corte.
rev_start = text.index('  obtenerRevisionTecnica: async (')
prefix, rev = text[:rev_start], text[rev_start:]
rev = regex_once(
    rev,
    r'    const \{ periodo, tarea \} = await resolverPeriodoYTarea\([\s\S]*?\n    \);\n    const gestion = await resolverBorradorSeleccionado\([\s\S]*?\n    \);',
    '''    const periodo = await resolverPeriodo(\n      empresaId,\n      anio\n    );\n    const gestion = await resolverBorradorSeleccionado(\n      periodo.id,\n      usuario,\n      gestionId\n    );\n    const fechaCorte =\n      gestion?.fechaGestion ?? construirCorteAnual(anio);\n    const tarea = await resolverTareaParaFecha(\n      tareaId,\n      fechaCorte\n    );''',
    "borrador/rev-contexto",
)
rev = replace_once(
    rev,
    '''            ...filtroAspectoHistorico(\n              tarea.aspectoId,\n              tarea.aspecto.codigo\n            ),''',
    '''            ...filtroAspectoHistorico(\n              tarea.aspectoId,\n              tarea.aspecto.identidadHistorica,\n              tarea.aspecto.codigo\n            ),''',
    "borrador/rev-identidad",
)
rev = replace_once(
    rev,
    '''              empresaPeriodo: {\n                empresaId,\n              },\n              OR:''',
    '''              empresaPeriodo: {\n                empresaId,\n              },\n              fechaGestion: {\n                lte: fechaCorte,\n              },\n              OR:''',
    "borrador/rev-corte",
)
text = prefix + rev
write(path, text)


# ==========================================================
# controlador: pasar gestionId al resumen por secciones.
# ==========================================================
path = "src/controllers/evaluacion/detalle-aspecto.controller.ts"
text = read(path)
text = replace_once(
    text,
    '''      async ({ empresaId, tareaId, anio, usuario }) => {\n        const resultado =\n          await servicioDetalleAspectoSecciones.obtenerResumen(\n            empresaId,\n            tareaId,\n            anio,\n            usuario\n          );''',
    '''      async ({\n        empresaId,\n        tareaId,\n        anio,\n        gestionId,\n        usuario,\n      }) => {\n        const resultado =\n          await servicioDetalleAspectoSecciones.obtenerResumen(\n            empresaId,\n            tareaId,\n            anio,\n            usuario,\n            gestionId\n          );''',
    "controller/resumen-gestion-seleccionada",
)
write(path, text)

print("Patch 5G temporal aplicado correctamente.")

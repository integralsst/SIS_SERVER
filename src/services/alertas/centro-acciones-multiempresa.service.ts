import type {
  AccionCentro,
  CategoriaAccionCentro,
  ConsultaCentroAcciones,
} from "../../types/alertas/centro-acciones.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { listarEmpresasAccesibles } from "../empresas/acceso-empresas.service";
import { servicioCentroAcciones } from "./centro-acciones.service";
import { normalizarAccionCentro } from "./normalizador-acciones.service";

const CATEGORIAS: CategoriaAccionCentro[] = [
  "GESTIONES",
  "EVIDENCIAS",
  "REVISION_TECNICA",
  "NO_APLICA",
  "APROBACIONES",
  "AUDITORIAS",
  "OTROS",
];

function crearConteoCategorias(): Record<CategoriaAccionCentro, number> {
  return {
    GESTIONES: 0,
    EVIDENCIAS: 0,
    REVISION_TECNICA: 0,
    NO_APLICA: 0,
    APROBACIONES: 0,
    AUDITORIAS: 0,
    OTROS: 0,
  };
}

function filtrarAcciones(
  acciones: AccionCentro[],
  consulta: Pick<ConsultaCentroAcciones, "categoria" | "prioridad">
): AccionCentro[] {
  return acciones.filter((accion) => {
    if (
      consulta.categoria !== "TODAS" &&
      accion.categoria !== consulta.categoria
    ) {
      return false;
    }

    if (consulta.prioridad === "URGENTE") {
      return accion.nivel === "ALTA";
    }

    if (consulta.prioridad === "PENDIENTE") {
      return accion.nivel !== "ALTA";
    }

    return true;
  });
}

function paginar<T>(
  elementos: T[],
  pagina: number,
  limite: number
): T[] {
  const inicio = (pagina - 1) * limite;
  return elementos.slice(inicio, inicio + limite);
}

function totalPaginas(total: number, limite: number): number {
  return Math.max(1, Math.ceil(total / limite));
}

async function accionesNormalizadas(
  usuario: UsuarioSesionEvaluacion,
  empresaId?: string
): Promise<AccionCentro[]> {
  const alertas = await servicioCentroAcciones.listarTodas(
    usuario,
    empresaId
  );

  return alertas.map(normalizarAccionCentro);
}

export const servicioCentroAccionesMultiempresa = {
  resumen: async (usuario: UsuarioSesionEvaluacion) => {
    const [empresas, acciones] = await Promise.all([
      listarEmpresasAccesibles(usuario),
      accionesNormalizadas(usuario),
    ]);
    const empresasConAcciones = new Set(
      acciones.map((accion) => accion.empresa.id)
    );
    const porCategoria = crearConteoCategorias();

    for (const accion of acciones) {
      porCategoria[accion.categoria] += 1;
    }

    const urgentes = acciones.filter(
      (accion) => accion.nivel === "ALTA"
    ).length;

    return {
      total: acciones.length,
      urgentes,
      pendientes: acciones.length - urgentes,
      empresasAccesibles: empresas.length,
      empresasConAcciones: empresasConAcciones.size,
      empresasAlDia: empresas.length - empresasConAcciones.size,
      categorias: porCategoria,
      generadasEn: new Date().toISOString(),
    };
  },

  listarEmpresas: async (
    usuario: UsuarioSesionEvaluacion,
    consulta: ConsultaCentroAcciones
  ) => {
    const [empresas, todasAcciones] = await Promise.all([
      listarEmpresasAccesibles(usuario, consulta.busqueda),
      accionesNormalizadas(usuario),
    ]);
    const acciones = filtrarAcciones(todasAcciones, consulta);
    const accionesPorEmpresa = new Map<string, AccionCentro[]>();

    for (const accion of acciones) {
      const actuales = accionesPorEmpresa.get(accion.empresa.id) ?? [];
      actuales.push(accion);
      accionesPorEmpresa.set(accion.empresa.id, actuales);
    }

    const hayFiltroAcciones =
      consulta.categoria !== "TODAS" ||
      consulta.prioridad !== "TODAS";

    const resultado = empresas
      .map((empresa) => {
        const accionesEmpresa = accionesPorEmpresa.get(empresa.id) ?? [];
        const urgentes = accionesEmpresa.filter(
          (accion) => accion.nivel === "ALTA"
        ).length;
        const porCategoria = crearConteoCategorias();

        for (const accion of accionesEmpresa) {
          porCategoria[accion.categoria] += 1;
        }

        return {
          id: empresa.id,
          nombre: empresa.nombre,
          nit: empresa.nit,
          ciudadPrincipal: empresa.ciudadPrincipal,
          total: accionesEmpresa.length,
          urgentes,
          pendientes: accionesEmpresa.length - urgentes,
          estado:
            urgentes > 0
              ? ("URGENTE" as const)
              : accionesEmpresa.length > 0
                ? ("PENDIENTE" as const)
                : ("AL_DIA" as const),
          porCategoria,
        };
      })
      .filter((empresa) => !hayFiltroAcciones || empresa.total > 0)
      .sort((a, b) => {
        const prioridadEstado = {
          URGENTE: 1,
          PENDIENTE: 2,
          AL_DIA: 3,
        } as const;
        const prioridad =
          prioridadEstado[a.estado] - prioridadEstado[b.estado];

        if (prioridad !== 0) return prioridad;
        if (a.urgentes !== b.urgentes) return b.urgentes - a.urgentes;
        if (a.total !== b.total) return b.total - a.total;
        return a.nombre.localeCompare(b.nombre, "es");
      });

    return {
      empresas: paginar(resultado, consulta.pagina, consulta.limite),
      paginacion: {
        pagina: consulta.pagina,
        limite: consulta.limite,
        total: resultado.length,
        paginas: totalPaginas(resultado.length, consulta.limite),
      },
      generadasEn: new Date().toISOString(),
    };
  },

  listarAccionesEmpresa: async (
    usuario: UsuarioSesionEvaluacion,
    empresaId: string,
    consulta: ConsultaCentroAcciones
  ) => {
    const todasAcciones = await accionesNormalizadas(usuario, empresaId);
    const acciones = filtrarAcciones(todasAcciones, consulta);
    const urgentes = acciones.filter(
      (accion) => accion.nivel === "ALTA"
    ).length;
    const porCategoria = crearConteoCategorias();

    for (const categoria of CATEGORIAS) {
      porCategoria[categoria] = acciones.filter(
        (accion) => accion.categoria === categoria
      ).length;
    }

    return {
      resumen: {
        total: acciones.length,
        urgentes,
        pendientes: acciones.length - urgentes,
        categorias: porCategoria,
      },
      acciones: paginar(acciones, consulta.pagina, consulta.limite),
      paginacion: {
        pagina: consulta.pagina,
        limite: consulta.limite,
        total: acciones.length,
        paginas: totalPaginas(acciones.length, consulta.limite),
      },
      generadasEn: new Date().toISOString(),
    };
  },
};

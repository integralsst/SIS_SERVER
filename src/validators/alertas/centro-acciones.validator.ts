import type {
  CategoriaAccionCentro,
  ConsultaCentroAcciones,
  PrioridadConsultaAcciones,
} from "../../types/alertas/centro-acciones.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

const CATEGORIAS = new Set<CategoriaAccionCentro | "TODAS">([
  "TODAS",
  "GESTIONES",
  "EVIDENCIAS",
  "REVISION_TECNICA",
  "NO_APLICA",
  "APROBACIONES",
  "AUDITORIAS",
  "OTROS",
]);

const PRIORIDADES = new Set<PrioridadConsultaAcciones>([
  "TODAS",
  "URGENTE",
  "PENDIENTE",
]);

function enteroPositivo(
  valor: unknown,
  predeterminado: number,
  maximo: number
): number {
  const numero = Number(valor ?? predeterminado);

  if (!Number.isInteger(numero) || numero < 1 || numero > maximo) {
    throw new ErrorEvaluacion(
      `El valor debe ser un entero entre 1 y ${maximo}.`,
      400,
      "FILTRO_ACCIONES_INVALIDO"
    );
  }

  return numero;
}

export function normalizarConsultaCentroAcciones(
  query: Record<string, unknown>
): ConsultaCentroAcciones {
  const categoria = String(query.categoria ?? "TODAS").toUpperCase() as
    | CategoriaAccionCentro
    | "TODAS";
  const prioridad = String(query.prioridad ?? "TODAS").toUpperCase() as
    PrioridadConsultaAcciones;

  if (!CATEGORIAS.has(categoria)) {
    throw new ErrorEvaluacion(
      "La categoría del centro de acciones no es válida.",
      400,
      "CATEGORIA_ACCIONES_INVALIDA"
    );
  }

  if (!PRIORIDADES.has(prioridad)) {
    throw new ErrorEvaluacion(
      "La prioridad del centro de acciones no es válida.",
      400,
      "PRIORIDAD_ACCIONES_INVALIDA"
    );
  }

  return {
    busqueda: String(query.busqueda ?? query.search ?? "").trim(),
    categoria,
    prioridad,
    pagina: enteroPositivo(query.pagina ?? query.page, 1, 100_000),
    limite: enteroPositivo(query.limite ?? query.limit, 25, 100),
  };
}

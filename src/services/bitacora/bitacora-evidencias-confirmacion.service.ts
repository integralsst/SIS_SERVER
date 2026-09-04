import type {
  DecisionEvidenciaBitacoraInput,
  EvidenciaPendienteConfirmacionBitacora,
  PropuestaAspectoBitacora,
  ResultadoAnalisisBitacora,
  TipoUrlBitacora,
} from "../../types/bitacora.types";
import { ErrorValidacionBitacora } from "../../validators/bitacora/bitacora.validator";
import { extraerUrlsBitacora } from "./bitacora-enlaces.service";

const TIPOS_URL = new Set<TipoUrlBitacora>([
  "EVIDENCIA_DIRECTA",
  "RECURSO_ACCION",
  "REFERENCIA",
  "CONTACTO",
]);

function descripcionPorTipo(
  tipo: TipoUrlBitacora,
  aspectoIdsSugeridos: number[]
): string {
  const destino =
    aspectoIdsSugeridos.length > 0
      ? ` La IA lo relacionó con ${aspectoIdsSugeridos.length === 1 ? "el aspecto sugerido" : "los aspectos sugeridos"}.`
      : " La IA no encontró una asociación directa suficientemente clara con un aspecto evaluable.";

  switch (tipo) {
    case "EVIDENCIA_DIRECTA":
      return `La IA interpreta este enlace como posible acceso a un soporte ya existente del requisito.${destino}`;
    case "RECURSO_ACCION":
      return `La IA interpreta este enlace como un recurso para ejecutar una actividad pendiente o futura; por sí solo no demuestra que la actividad ya se haya realizado.${destino}`;
    case "CONTACTO":
      return `La IA interpreta este enlace como un medio de contacto o acceso a un tercero/proveedor, no como prueba automática de cumplimiento.${destino}`;
    default:
      return `La IA interpreta este enlace como material de referencia o consulta, no como prueba automática de cumplimiento.${destino}`;
  }
}

export function prepararUrlsParaConfirmacionHumana(
  analisis: ResultadoAnalisisBitacora,
  urlsAutorizadas: string[]
): ResultadoAnalisisBitacora {
  const unidades = new Map(
    (analisis.unidadesVerificacion ?? []).map((unidad) => [unidad.id, unidad])
  );
  const urls = [...new Set(urlsAutorizadas.map((url) => url.trim()).filter(Boolean))];

  const evidenciasPendientesConfirmacion: EvidenciaPendienteConfirmacionBitacora[] =
    urls.map((url) => {
      const candidatas: Array<{
        propuesta: PropuestaAspectoBitacora;
        tipo: TipoUrlBitacora;
        descripcion: string;
        unidadVerificacionIds: string[];
        anclada: boolean;
      }> = [];

      for (const propuesta of analisis.propuestas) {
        const unidadesPropuesta = new Set(propuesta.unidadVerificacionIds ?? []);

        for (const clasificacion of propuesta.clasificacionUrls ?? []) {
          if (
            !clasificacion ||
            typeof clasificacion.url !== "string" ||
            clasificacion.url.trim() !== url ||
            !TIPOS_URL.has(clasificacion.tipo) ||
            !Array.isArray(clasificacion.unidadVerificacionIds)
          ) {
            continue;
          }

          const unidadVerificacionIds = [
            ...new Set(
              clasificacion.unidadVerificacionIds.filter((unidadId) => {
                if (!unidadesPropuesta.has(unidadId)) {
                  return false;
                }
                const unidad = unidades.get(unidadId);
                return (
                  unidad?.tipo === "EVALUACION" &&
                  extraerUrlsBitacora(unidad.fragmentoBitacora).includes(url)
                );
              })
            ),
          ];

          candidatas.push({
            propuesta,
            tipo: clasificacion.tipo,
            descripcion:
              typeof clasificacion.descripcion === "string"
                ? clasificacion.descripcion.trim()
                : "",
            unidadVerificacionIds,
            anclada: unidadVerificacionIds.length > 0,
          });
        }
      }

      candidatas.sort((a, b) => {
        if (a.anclada !== b.anclada) return a.anclada ? -1 : 1;
        const directaA = a.propuesta.relacionSemantica === "DIRECTA";
        const directaB = b.propuesta.relacionSemantica === "DIRECTA";
        if (directaA !== directaB) return directaA ? -1 : 1;
        return b.propuesta.confianza - a.propuesta.confianza;
      });

      const mejor = candidatas[0];
      const sugerenciasValidas = candidatas.filter(
        (item) =>
          item.anclada && item.propuesta.relacionSemantica === "DIRECTA"
      );
      const aspectoIdsSugeridos = [
        ...new Set(sugerenciasValidas.map((item) => item.propuesta.aspectoId)),
      ];
      const unidadVerificacionIds = [
        ...new Set(
          sugerenciasValidas.flatMap((item) => item.unidadVerificacionIds)
        ),
      ];
      const tipoSugerido = mejor?.tipo ?? "REFERENCIA";

      return {
        url,
        tipoSugerido,
        descripcionSugerida:
          mejor?.descripcion ||
          descripcionPorTipo(tipoSugerido, aspectoIdsSugeridos),
        aspectoIdsSugeridos,
        unidadVerificacionIds,
      };
    });

  return {
    ...analisis,
    versionPrompt: `${analisis.versionPrompt}+url-confirmacion-humana-v2`,
    evidenciasPendientesConfirmacion,
    propuestas: analisis.propuestas.map((propuesta) => ({
      ...propuesta,
      // La IA solo sugiere. Ninguna URL queda aprobada como evidencia antes
      // de la decisión explícita del profesional.
      evidenciasUrls: [],
    })),
  };
}

export function validarDecisionesEvidenciaBitacora(params: {
  pendientes: EvidenciaPendienteConfirmacionBitacora[];
  propuestas: PropuestaAspectoBitacora[];
  aspectoIdsExcluidos: number[];
  decisiones?: DecisionEvidenciaBitacoraInput[];
}): DecisionEvidenciaBitacoraInput[] {
  const pendientes = params.pendientes ?? [];
  if (pendientes.length === 0) {
    return [];
  }

  if (!Array.isArray(params.decisiones)) {
    throw new ErrorValidacionBitacora(
      "Debes revisar y decidir todos los enlaces detectados antes de aplicar la Bitácora.",
      409,
      "BITACORA_EVIDENCIAS_PENDIENTES"
    );
  }

  const urlsPendientes = new Set(pendientes.map((item) => item.url));
  const excluidos = new Set(params.aspectoIdsExcluidos);
  const aspectosAplicables = new Set(
    params.propuestas
      .filter(
        (propuesta) =>
          propuesta.accion === "PROPONER_EVALUACION" &&
          !excluidos.has(propuesta.aspectoId)
      )
      .map((propuesta) => propuesta.aspectoId)
  );
  const urlsVistas = new Set<string>();
  const normalizadas: DecisionEvidenciaBitacoraInput[] = [];

  for (const decision of params.decisiones) {
    if (
      !decision ||
      typeof decision.url !== "string" ||
      (decision.decision !== "CONFIRMAR" &&
        decision.decision !== "DESCARTAR")
    ) {
      throw new ErrorValidacionBitacora(
        "Una decisión de evidencia no es válida.",
        400,
        "BITACORA_DECISION_EVIDENCIA_INVALIDA"
      );
    }

    const url = decision.url.trim();
    if (!urlsPendientes.has(url)) {
      throw new ErrorValidacionBitacora(
        "Se intentó decidir un enlace que no pertenece al análisis actual.",
        400,
        "BITACORA_DECISION_EVIDENCIA_NO_AUTORIZADA"
      );
    }
    if (urlsVistas.has(url)) {
      throw new ErrorValidacionBitacora(
        "Un mismo enlace no puede decidirse más de una vez.",
        400,
        "BITACORA_DECISION_EVIDENCIA_DUPLICADA"
      );
    }
    urlsVistas.add(url);

    if (decision.decision === "DESCARTAR") {
      normalizadas.push({ url, decision: "DESCARTAR", aspectoIds: [] });
      continue;
    }

    const aspectoIds = [
      ...new Set(
        (decision.aspectoIds ?? []).filter((aspectoId) =>
          Number.isInteger(aspectoId)
        )
      ),
    ];
    if (aspectoIds.length === 0) {
      throw new ErrorValidacionBitacora(
        "Para confirmar un enlace como evidencia debes seleccionar al menos un aspecto.",
        400,
        "BITACORA_EVIDENCIA_SIN_ASPECTO"
      );
    }
    if (aspectoIds.some((aspectoId) => !aspectosAplicables.has(aspectoId))) {
      throw new ErrorValidacionBitacora(
        "El enlace solo puede confirmarse para aspectos aplicables y no excluidos de este análisis.",
        400,
        "BITACORA_EVIDENCIA_ASPECTO_NO_APLICABLE"
      );
    }

    normalizadas.push({ url, decision: "CONFIRMAR", aspectoIds });
  }

  const faltantes = pendientes.filter((item) => !urlsVistas.has(item.url));
  if (faltantes.length > 0) {
    throw new ErrorValidacionBitacora(
      `Debes decidir ${faltantes.length} enlace(s) pendiente(s) antes de aplicar la Bitácora.`,
      409,
      "BITACORA_EVIDENCIAS_PENDIENTES"
    );
  }

  return normalizadas;
}

export function construirUrlsConfirmadasPorAspecto(
  decisiones: DecisionEvidenciaBitacoraInput[]
): Record<string, string[]> {
  const urlsPorAspecto = new Map<number, Set<string>>();

  for (const decision of decisiones) {
    if (decision.decision !== "CONFIRMAR") continue;

    for (const aspectoId of decision.aspectoIds ?? []) {
      const actuales = urlsPorAspecto.get(aspectoId) ?? new Set<string>();
      actuales.add(decision.url);
      urlsPorAspecto.set(aspectoId, actuales);
    }
  }

  return Object.fromEntries(
    [...urlsPorAspecto.entries()].map(([aspectoId, urls]) => [
      String(aspectoId),
      [...urls],
    ])
  );
}

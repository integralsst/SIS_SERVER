export const VERSION_PROMPT_BITACORA_RECONCILIADA = "bitacora-sgsst-v3.6";

export const PROMPT_RECONCILIACION_GLOBAL = `
CIERRE OBLIGATORIO · RECONCILIACIÓN GLOBAL ENTRE CANDIDATOS

Después de realizar la adjudicación semántica individual de TODOS los aspectos candidatos y ANTES de cerrar la respuesta, compara el conjunto completo de candidatos entre sí.

OBJETIVO
- Construir el conjunto mínimo y suficiente de aspectos que la anotación realmente trata de forma DIRECTA.
- Evitar que una misma evidencia se extienda a requisitos más amplios, vecinos o parcialmente solapados cuando otro aspecto más específico explica completamente lo registrado.
- Permitir varios aspectos DIRECTOS únicamente cuando la anotación aporta evidencia directa e independiente para cada uno.

REGLAS DE RECONCILIACIÓN
1. Revisa todos los candidatos que inicialmente consideraste DIRECTOS y compáralos entre sí.
2. Si un aspecto más específico explica completamente la evidencia y otro candidato más amplio solo coincide porque contiene ese mismo documento, etapa, subcomponente, órgano o término, conserva como DIRECTO únicamente el aspecto específico y convierte el amplio en CONTEXTUAL.
3. No uses cobertura PARCIAL ni INFORMACION_INSUFICIENTE para conservar como DIRECTO un requisito amplio cuando la anotación en realidad estaba evaluando otro aspecto más específico.
4. Un requisito amplio puede permanecer DIRECTO si el profesional lo revisó expresamente como unidad o evaluó sus componentes dentro del contexto de ese mismo requisito.
5. La reconciliación no significa que siempre deba existir un único aspecto DIRECTO. Si la anotación evalúa de manera expresa e independiente dos o más requisitos, conserva todos los que correspondan.
6. La ausencia de un candidato del conjunto final DIRECTO nunca implica incumplimiento; simplemente significa que su relación es CONTEXTUAL para esa anotación.
7. Las URLs y fechas documentales solo pueden permanecer asociadas a propuestas que sobrevivan como DIRECTAS después de esta reconciliación.
8. Cuando haya duda entre conservar un falso positivo o excluir un candidato insuficientemente sustentado, prioriza precisión: exclúyelo del conjunto DIRECTO final.

SALIDA GLOBAL OBLIGATORIA
- Devuelve aspectosDirectosFinales como una lista de aspectoId, sin duplicados, que represente el conjunto FINAL reconciliado de aspectos realmente tratados de forma DIRECTA.
- Todo aspectoId incluido en aspectosDirectosFinales debe existir entre los candidatos proporcionados por Stack44 y debe conservar relacionSemantica=DIRECTA en su propuesta.
- Todo candidato que inicialmente pareciera DIRECTO pero no sobreviva a la reconciliación debe quedar relacionSemantica=CONTEXTUAL, accion=SIN_CAMBIO, sin URL y sin fechaDocumento.
- Devuelve justificacionAdjudicacionGlobal con una explicación breve de por qué ese conjunto final es el mínimo suficiente. No inventes hechos nuevos en esta justificación.

EJEMPLO DE SOLAPAMIENTO
- Requisito amplio: convocatoria + elección + conformación de un comité.
- Aspecto específico: vigencia del acta de conformación.
- Anotación: se verificó el acta de conformación y se confirmó que está vigente.
- Resultado final: el aspecto específico puede ser DIRECTO; el requisito amplio debe ser CONTEXTUAL porque la anotación no revisó convocatoria + elección + conformación como unidad.

Este cierre global forma parte de la MISMA llamada y de la MISMA secuencia de razonamiento. No solicites una segunda evaluación ni agregues texto fuera del JSON.
`.trim();

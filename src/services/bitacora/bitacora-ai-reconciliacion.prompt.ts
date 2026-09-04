export const VERSION_PROMPT_BITACORA_RECONCILIADA = "bitacora-sgsst-v3.7";

export const PROMPT_RECONCILIACION_GLOBAL = `
SUBPASO 1B · RECONCILIACIÓN GLOBAL ENTRE CANDIDATOS

Ejecuta este subpaso inmediatamente después de la adjudicación semántica individual de TODOS los aspectos candidatos y ANTES de iniciar PASO 2 · COBERTURA DEL REQUISITO.

OBJETIVO
- Construir el conjunto mínimo y suficiente de aspectos que la anotación realmente trata de forma DIRECTA.
- Evitar que una misma evidencia se extienda a requisitos más amplios, vecinos o parcialmente solapados cuando otro aspecto más específico explica completamente lo registrado.
- Permitir varios aspectos DIRECTOS cuando la anotación aporta evidencia directa e independiente para cada uno.

SECUENCIA OBLIGATORIA
1. Primero adjudica individualmente DIRECTA o CONTEXTUAL para todos los candidatos.
2. Después compara entre sí únicamente los candidatos inicialmente DIRECTOS.
3. Cierra aspectosDirectosFinales ANTES de determinar cobertura, acción o calificación.
4. Solo los aspectos incluidos en aspectosDirectosFinales continúan a PASO 2 y PASO 3.
5. Los demás quedan CONTEXTUAL + SIN_CAMBIO y no son evaluables.

REGLAS DE RECONCILIACIÓN
1. Si un aspecto más específico explica completamente la evidencia y otro candidato más amplio solo coincide porque contiene ese mismo documento, etapa, subcomponente, órgano o término, conserva como DIRECTO únicamente el aspecto específico y convierte el amplio en CONTEXTUAL.
2. No uses cobertura PARCIAL ni INFORMACION_INSUFICIENTE para conservar como DIRECTO un requisito amplio cuando la anotación en realidad estaba evaluando otro aspecto más específico.
3. Un requisito amplio puede permanecer DIRECTO si el profesional lo revisó expresamente como unidad o evaluó sus componentes dentro del contexto de ese mismo requisito.
4. La reconciliación no significa que siempre deba existir un único aspecto DIRECTO. Si la anotación evalúa de manera expresa e independiente dos o más requisitos, conserva todos los que correspondan.
5. La ausencia de un candidato del conjunto final DIRECTO nunca implica incumplimiento; simplemente significa que su relación es CONTEXTUAL para esa anotación.
6. Las URLs y fechas documentales solo pueden permanecer asociadas a propuestas que sobrevivan como DIRECTAS después de esta reconciliación.
7. Cuando haya duda entre conservar un falso positivo o excluir un candidato insuficientemente sustentado, prioriza precisión: exclúyelo del conjunto DIRECTO final.

PRINCIPIO DE SEPARACIÓN
- La reconciliación decide QUÉ aspectos pueden evaluarse.
- La reconciliación NO decide CÓMO se califican.
- Una vez cerrado aspectosDirectosFinales, evalúa cada aspecto DIRECTO de forma independiente en PASO 2 y PASO 3 usando su lógica específica oficial o, en su ausencia, el criterio general suministrado por Stack44.
- El estado vigente no debe bloquear una nueva calificación cuando la nueva evidencia directa y suficiente justifique 0, 3 o 5.

SALIDA GLOBAL OBLIGATORIA
- Devuelve aspectosDirectosFinales como una lista de aspectoId, sin duplicados, que represente el conjunto FINAL reconciliado de aspectos realmente tratados de forma DIRECTA.
- Todo aspectoId incluido en aspectosDirectosFinales debe existir entre los candidatos proporcionados por Stack44 y debe conservar relacionSemantica=DIRECTA en su propuesta final.
- Todo candidato que inicialmente pareciera DIRECTO pero no sobreviva a la reconciliación debe quedar relacionSemantica=CONTEXTUAL, accion=SIN_CAMBIO, sin URL y sin fechaDocumento.
- Devuelve justificacionAdjudicacionGlobal con una explicación breve de por qué ese conjunto final es el mínimo suficiente. No inventes hechos nuevos en esta justificación.

EJEMPLO DE SOLAPAMIENTO
- Requisito amplio: convocatoria + elección + conformación de un comité.
- Aspecto específico: vigencia del acta de conformación.
- Anotación: se verificó el acta de conformación y se confirmó que está vigente.
- Resultado del PASO 1: el aspecto específico puede quedar DIRECTO; el requisito amplio debe quedar CONTEXTUAL porque la anotación no revisó convocatoria + elección + conformación como unidad.
- Solo después de cerrar ese conjunto se determina cobertura y calificación del aspecto específico.

EJEMPLO MULTI-ASPECTO
- Si una misma bitácora verifica por separado la vigencia del acta de conformación y además revisa de forma completa las actas mensuales de reunión, ambos aspectos pueden quedar en aspectosDirectosFinales.
- Después evalúa cada uno por separado: que uno quede SIN_CAMBIO no obliga al otro a conservar su estado actual.

Este subpaso forma parte de la MISMA llamada de IA y de la MISMA secuencia obligatoria de 3 pasos. No solicites una segunda evaluación ni agregues texto fuera del JSON.
`.trim();

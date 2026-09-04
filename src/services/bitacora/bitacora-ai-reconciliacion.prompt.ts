export const VERSION_PROMPT_BITACORA_RECONCILIADA = "bitacora-sgsst-v3.13";

export const PROMPT_RECONCILIACION_GLOBAL = `
SUBPASO 1A · UNIDADES DE VERIFICACIÓN DEL REGISTRO

Ejecuta este subpaso antes de cerrar la adjudicación semántica final de candidatos y ANTES de PASO 2 · COBERTURA DEL REQUISITO.

OBJETIVO
- Separar el contenido original de la Bitácora en hechos verificables concretos antes de relacionarlos con aspectos candidatos.
- Evitar que una frase sobre un comité, documento o tema se extienda por asociación temática a requisitos vecinos que realmente no fueron revisados.
- Mantener una sola llamada de IA: las unidades son parte de la misma respuesta estructurada y de la misma secuencia de 3 pasos.

REGLAS DE UNIDADES
1. Devuelve unidadesVerificacion como una lista de unidades identificadas UV-1, UV-2, UV-3... sin saltos ni duplicados.
2. Cada unidad representa UN hecho material revisado o UNA exclusión explícita de alcance. No construyas unidades a partir de nombres, descripciones, palabras clave ni lógica de los aspectos candidatos.
3. fragmentoBitacora debe ser un fragmento CONTINUO copiado literalmente del contenidoOriginal. No lo parafrasees, no corrijas redacción y no inventes texto.
4. objetoTecnico describe en pocas palabras el objeto realmente tratado por ese fragmento: por ejemplo acta de conformación, actas de reunión, sistema de archivo, procedimiento documental, plan, política, matriz, soporte, actividad o condición concreta.
5. resultadoObservado resume exclusivamente el hecho escrito en el fragmento; no agregues conclusiones que no estén en la Bitácora.
6. Usa tipo=EVALUACION cuando el fragmento documenta una revisión, verificación, hallazgo, existencia, ausencia, estado, resultado o condición que sí fue objeto de la actividad.
7. Usa tipo=EXCLUSION cuando el fragmento declara expresamente que un objeto NO se revisó, NO se evaluó, NO fue objeto de revisión, NO se abordó o quedó fuera del alcance.
8. Una unidad EXCLUSION nunca es evidencia de incumplimiento ni puede sustentar 0, 3 o 5.
9. No conviertas una simple mención temática en unidad de evaluación si el texto no documenta un hecho verificable sobre ese objeto.
10. Varias frases pueden formar unidades distintas aunque pertenezcan al mismo tema cuando describen verificaciones diferentes.

ANCLAJE OBLIGATORIO UNIDAD → ASPECTO
1. Cada propuesta debe devolver unidadVerificacionIds.
2. Un aspecto puede quedar DIRECTO únicamente si unidadVerificacionIds contiene al menos una unidad EVALUACION que trate el MISMO objeto técnico, etapa, órgano, condición o requisito material del aspecto.
3. Compartir palabras como comité, acta, archivo, gestión, documentación, soporte o SG-SST NO permite reutilizar una unidad para un requisito vecino.
4. Si la única unidad relacionada con un candidato es EXCLUSION, ese candidato debe usar alcanceEvaluacion=EXCLUIDO, relacionSemantica=CONTEXTUAL y quedar fuera de aspectosDirectosFinales.
5. Si un candidato no tiene ninguna unidad EVALUACION que lo sustente de manera directa, debe quedar CONTEXTUAL aunque haya sido recuperado por similitud temática.
6. Una misma unidad EVALUACION puede sustentar varios aspectos únicamente cuando el propio fragmento evalúa realmente cada uno de esos requisitos. No reutilices una unidad solo porque los requisitos pertenecen al mismo comité, proceso o documento.
7. Para requisitos compuestos, la unidad debe demostrar que el profesional revisó ese requisito como unidad o sus componentes dentro del contexto de ese mismo requisito; un subcomponente aislado de otro aspecto más específico no basta.
8. unidadVerificacionIds puede quedar vacío para candidatos CONTEXTUALES que no tengan relación material con ninguna unidad. Para EXCLUIDO debe identificar la unidad EXCLUSION correspondiente.

SUBPASO 1B · RECONCILIACIÓN GLOBAL ENTRE CANDIDATOS

Ejecuta este subpaso inmediatamente después de construir las unidades y de la adjudicación semántica individual de TODOS los aspectos candidatos y ANTES de iniciar PASO 2 · COBERTURA DEL REQUISITO.

OBJETIVO
- Construir el conjunto mínimo y suficiente de aspectos que la anotación realmente trata de forma DIRECTA.
- Evitar que una misma evidencia se extienda a requisitos más amplios, vecinos o parcialmente solapados cuando otro aspecto más específico explica completamente lo registrado.
- Permitir varios aspectos DIRECTOS cuando la anotación aporta evidencia directa e independiente para cada uno.

SECUENCIA OBLIGATORIA
1. Primero construye unidadesVerificacion desde el contenidoOriginal.
2. Adjudica individualmente DIRECTA o CONTEXTUAL para todos los candidatos usando únicamente unidades verificadas del registro como ancla.
3. Para cada propuesta declara alcanceEvaluacion como EVALUADO o EXCLUIDO antes de cerrar el conjunto global.
4. Después compara entre sí únicamente los candidatos inicialmente DIRECTOS y no excluidos de alcance.
5. Cierra aspectosDirectosFinales ANTES de determinar cobertura, acción o calificación.
6. Solo los aspectos incluidos en aspectosDirectosFinales continúan a PASO 2 y PASO 3.
7. Los demás quedan CONTEXTUAL + SIN_CAMBIO y no son evaluables.

REGLAS DE RECONCILIACIÓN
1. Si un aspecto más específico explica completamente la evidencia y otro candidato más amplio solo coincide porque contiene ese mismo documento, etapa, subcomponente, órgano o término, conserva como DIRECTO únicamente el aspecto específico y convierte el amplio en CONTEXTUAL.
2. No uses cobertura PARCIAL ni INFORMACION_INSUFICIENTE para conservar como DIRECTO un requisito amplio cuando la anotación en realidad estaba evaluando otro aspecto más específico.
3. Un requisito amplio puede permanecer DIRECTO si el profesional lo revisó expresamente como unidad o evaluó sus componentes dentro del contexto de ese mismo requisito.
4. La reconciliación no significa que siempre deba existir un único aspecto DIRECTO. Si la anotación evalúa de manera expresa e independiente dos o más requisitos, conserva todos los que correspondan.
5. La ausencia de un candidato del conjunto final DIRECTO nunca implica incumplimiento; simplemente significa que su relación es CONTEXTUAL para esa anotación.
6. Las URLs y fechas documentales solo pueden permanecer asociadas a propuestas que sobrevivan como DIRECTAS después de esta reconciliación.
7. Cuando haya duda entre conservar un falso positivo o excluir un candidato insuficientemente sustentado, prioriza precisión: exclúyelo del conjunto DIRECTO final.
8. Distingue el OBJETO TÉCNICO evaluado. Sistema, procedimiento, programa, plan, política, informe, registro, acta, matriz, protocolo y evidencia son objetos distintos salvo que el propio texto los vincule de forma expresa dentro del mismo requisito. No conviertas en DIRECTO un candidato sobre "procedimiento" solo porque la nota habla de un "sistema", ni un candidato sobre "plan" porque la nota trate una "política", ni equivalencias análogas.
9. Si la anotación nombra y evalúa expresamente un objeto técnico específico y otro candidato vecino exige un objeto diferente que no fue revisado, conserva el primero como DIRECTO y el vecino como CONTEXTUAL, aunque ambos compartan términos de archivo, conservación, gestión, documentación, seguimiento o control.
10. Antes de conservar un candidato como DIRECTO, verifica que sus unidadVerificacionIds sigan correspondiendo exactamente al mismo requisito después de comparar todos los candidatos entre sí.

CONTRATO DE ALCANCE EXPLÍCITO
1. alcanceEvaluacion es un interruptor de seguridad de alcance y NO sustituye relacionSemantica.
2. Usa alcanceEvaluacion=EXCLUIDO únicamente cuando la anotación diga de forma explícita e inequívoca que ese objeto o requisito no se revisó, no se evaluó, no fue objeto de revisión, no se abordó o quedó fuera del alcance de la actividad.
3. Usa alcanceEvaluacion=EVALUADO cuando el objeto no está expresamente excluido por alcance. Esto no obliga a que sea DIRECTO: relacionSemantica y la reconciliación global siguen determinando si realmente corresponde al requisito.
4. Toda propuesta EXCLUIDO debe quedar relacionSemantica=CONTEXTUAL, accion=SIN_CAMBIO, coberturaRequisito=NO_APLICA, calificacionAdministrativaPropuesta=null, evidenciaBitacora=null, evidenciasUrls=[], fechaDocumento=null y no puede aparecer en aspectosDirectosFinales.
5. Nunca conviertas EXCLUIDO en INFORMACION_INSUFICIENTE: si el profesional decidió no revisar ese requisito, no existe una evaluación técnica que completar.
6. Toda propuesta EXCLUIDO debe señalar en unidadVerificacionIds al menos una unidad tipo EXCLUSION que contenga el fragmento original que delimitó el alcance.

REGLAS DE EXCLUSIÓN EXPLÍCITA DE ALCANCE
1. Expresiones como "no se revisó", "no se evaluó", "no fue objeto de revisión", "no se abordó en esta actividad", "quedó fuera del alcance" y formulaciones inequívocamente equivalentes indican que ese objeto o requisito NO FUE EVALUADO en esta Bitácora.
2. Si un candidato corresponde precisamente al objeto o requisito que la propia anotación excluye de la revisión, debe usar alcanceEvaluacion=EXCLUIDO, quedar CONTEXTUAL + SIN_CAMBIO y no puede incluirse en aspectosDirectosFinales.
3. Una exclusión explícita de alcance NO es evidencia negativa sobre existencia, cumplimiento o estado. Por sí sola nunca autoriza 0, 3, 5 ni INFORMACION_INSUFICIENTE para el requisito excluido.
4. Distingue siempre "NO SE REVISÓ X" de "SE REVISÓ X Y SE CONFIRMÓ QUE NO EXISTE / NO SE ENCONTRÓ / LA EMPRESA NO CUENTA CON X". Solo el segundo tipo de formulación puede constituir verificación negativa directa cuando la lógica aplicable lo permita.
5. La exclusión afecta únicamente al objeto expresamente excluido. No elimines otros aspectos que la misma anotación sí evalúa de forma directa e independiente.
6. Una frase usada por el profesional para delimitar alcance no debe transformarse en una evaluación adversa del requisito que decidió no revisar.

REGLAS TRANSVERSALES DE PRECISIÓN PARA PASOS 2 Y 3
1. "No fue posible confirmar", "no se pudo confirmar", "no fue posible verificar", "no se pudo verificar", "no se logró establecer" y expresiones equivalentes describen una LIMITACIÓN DE EVIDENCIA; no prueban por sí solas inexistencia, ausencia ni incumplimiento.
2. Una limitación de evidencia no autoriza automáticamente calificación 0. Solo puede sustentar 0 cuando la propia anotación contiene además una verificación negativa material del mismo requisito, por ejemplo: "se verificó que no existe", "la empresa no cuenta con", "el soporte fue revisado y no fue encontrado", "se confirmó la ausencia" o una formulación inequívocamente equivalente.
3. Si existe LÓGICA ESPECÍFICA OFICIAL y esa lógica asigna 3 a evidencia parcial, indirecta, incompleta o a una condición equivalente a la observada, aplica 3. No sustituyas esa regla por un 0 del criterio general.
4. Si la evidencia es parcial o indirecta pero la lógica específica no permite decidir con seguridad entre 0/3/5, usa INFORMACION_INSUFICIENTE; nunca conviertas incertidumbre en inexistencia.
5. La lógica específica oficial prevalece sobre el criterio general también cuando el criterio general permitiría una conclusión más severa. No mezcles ambos para empeorar una calificación definida explícitamente por la lógica específica.

SUBPASO 1C · RECONCILIACIÓN GLOBAL DE EVIDENCIAS URL

Ejecuta este subpaso DESPUÉS de cerrar aspectosDirectosFinales y ANTES de devolver el JSON final. Forma parte de la misma llamada y no modifica la calificación de ningún aspecto.

OBJETIVO
- Decidir globalmente qué URL detectada corresponde realmente a qué aspecto DIRECTO final.
- Evitar que una URL ambigua se copie a varios aspectos solo porque todos son DIRECTOS.
- Permitir asignaciones 1→1, N→N y una misma URL compartida por varios aspectos únicamente cuando el propio texto lo atribuya de forma inequívoca.

REGLAS OBLIGATORIAS DE EVIDENCIA
1. Revisa TODAS las URLs detectadas y TODOS los aspectos incluidos en aspectosDirectosFinales como un único problema de asignación.
2. Devuelve asignacionesEvidenciaFinales únicamente para vínculos inequívocos entre URL y aspecto(s).
3. Cada objeto de asignacionesEvidenciaFinales contiene una URL exacta de enlacesDetectados y la lista aspectoIds a la que esa URL soporta directamente.
4. Si una URL es soporte exclusivo de un aspecto, incluye únicamente ese aspectoId.
5. Una misma URL puede incluir varios aspectoIds SOLO cuando el registro afirme de forma clara que esa misma evidencia soporta directamente cada uno de esos requisitos. Compartir tema, órgano, comité o visita no basta.
6. Si el texto dice que la URL es soporte general, adjunto general, enlace de la visita, o declara que no es posible determinar a cuál de varios aspectos corresponde, NO la asignes a ninguno: omítela de asignacionesEvidenciaFinales.
7. Si existen dos URLs y el texto atribuye claramente una a cada uno de dos aspectos, conserva ambas asignaciones independientes.
8. No inventes asociaciones por proximidad temática. Precisión > recall: ante duda, deja la URL sin asignar.
9. Después de cerrar asignacionesEvidenciaFinales, cada propuesta DIRECTA debe tener en evidenciasUrls EXACTAMENTE las URLs que la asignación global le otorgó. Si no recibió ninguna, evidenciasUrls=[].
10. Una propuesta CONTEXTUAL o EXCLUIDO conserva siempre evidenciasUrls=[].

EJEMPLO NEGATIVO OBLIGATORIO
- Dos aspectos quedan DIRECTOS.
- Existe una sola URL.
- La nota dice que es soporte general de la visita o que no puede determinarse a cuál de los dos aspectos corresponde.
- Resultado: asignacionesEvidenciaFinales=[] y evidenciasUrls=[] en ambas propuestas. Nunca copies la URL a los dos aspectos.

EJEMPLO POSITIVO OBLIGATORIO
- Dos aspectos quedan DIRECTOS.
- URL 1 está descrita explícitamente como evidencia exclusiva del aspecto A.
- URL 2 está descrita explícitamente como evidencia exclusiva del aspecto B.
- Resultado: asignacionesEvidenciaFinales=[{url: URL1, aspectoIds:[A]}, {url: URL2, aspectoIds:[B]}] y cada propuesta contiene únicamente su URL correspondiente.

PRINCIPIO DE SEPARACIÓN
- Las unidades de verificación determinan QUÉ hechos reales contiene la Bitácora y sirven de ancla obligatoria para cada aspecto DIRECTO.
- alcanceEvaluacion decide si existe una exclusión explícita de alcance que debe bloquear la evaluación del candidato.
- La reconciliación decide QUÉ aspectos pueden evaluarse.
- La reconciliación de evidencias decide QUÉ URL puede vincularse a cada aspecto DIRECTO.
- Ninguna de las dos reconciliaciones decide CÓMO se califican los aspectos.
- Una vez cerrado aspectosDirectosFinales, evalúa cada aspecto DIRECTO de forma independiente en PASO 2 y PASO 3 usando su lógica específica oficial o, en su ausencia, el criterio general suministrado por Stack44.
- El estado vigente no debe bloquear ni sesgar la nueva calificación cuando la nueva evidencia directa y suficiente justifique 0, 3 o 5.
- La comparación entre el resultado técnico nuevo y el estado vigente corresponde a Stack44 después de la respuesta del modelo.

SALIDA GLOBAL OBLIGATORIA
- Devuelve unidadesVerificacion antes de las propuestas. Cada unidad debe cumplir el contrato del SUBPASO 1A y estar anclada literalmente al contenidoOriginal.
- Cada propuesta debe devolver alcanceEvaluacion con uno de estos valores exactos: EVALUADO o EXCLUIDO.
- Cada propuesta debe devolver unidadVerificacionIds sin duplicados y solo con IDs existentes en unidadesVerificacion.
- Devuelve aspectosDirectosFinales como una lista de aspectoId, sin duplicados, que represente el conjunto FINAL reconciliado de aspectos realmente tratados de forma DIRECTA y nunca incluya propuestas EXCLUIDO.
- Todo aspectoId incluido en aspectosDirectosFinales debe existir entre los candidatos proporcionados por Stack44, tener alcanceEvaluacion=EVALUADO, conservar relacionSemantica=DIRECTA y señalar al menos una unidad EVALUACION compatible con el mismo requisito.
- Todo candidato con alcanceEvaluacion=EXCLUIDO debe quedar relacionSemantica=CONTEXTUAL, accion=SIN_CAMBIO, sin URL y sin fechaDocumento, y señalar la unidad EXCLUSION correspondiente.
- Todo candidato que inicialmente pareciera DIRECTO pero no sobreviva a la reconciliación debe quedar relacionSemantica=CONTEXTUAL, accion=SIN_CAMBIO, sin URL y sin fechaDocumento.
- Devuelve asignacionesEvidenciaFinales como la lista FINAL reconciliada de asociaciones URL→aspectoIds. Las URLs ambiguas se omiten y nunca se asocian a propuestas EXCLUIDO.
- Devuelve justificacionAdjudicacionGlobal con una explicación breve de por qué ese conjunto final es el mínimo suficiente. No inventes hechos nuevos en esta justificación.

EJEMPLO DE SOLAPAMIENTO
- Requisito amplio: convocatoria + elección + conformación de un comité.
- Aspecto específico: vigencia del acta de conformación.
- Anotación: se verificó el acta de conformación y se confirmó que está vigente.
- Unidad: UV-1 tipo=EVALUACION, objetoTecnico="acta de conformación", fragmentoBitacora copiado literalmente de esa verificación.
- Resultado del PASO 1: el aspecto específico puede quedar DIRECTO usando UV-1; el requisito amplio debe quedar CONTEXTUAL porque UV-1 no demuestra convocatoria + elección + conformación como unidad.
- Solo después de cerrar ese conjunto se determina cobertura y calificación del aspecto específico.

EJEMPLO MULTI-ASPECTO
- Si una misma bitácora verifica por separado la vigencia del acta de conformación y además revisa de forma completa las actas mensuales de reunión, crea unidades EVALUACION independientes para cada verificación.
- Ambos aspectos pueden quedar en aspectosDirectosFinales, cada uno anclado a su propia unidad.
- Después evalúa cada uno por separado: que uno termine SIN_CAMBIO después de la comparación del backend no obliga al otro a conservar su estado actual.

Este subpaso forma parte de la MISMA llamada de IA y de la MISMA secuencia obligatoria de 3 pasos. No solicites una segunda evaluación ni agregues texto fuera del JSON.
`.trim();
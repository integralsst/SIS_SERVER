export interface LogicaEvaluacionAspectoFuente {
  excelRow: number;
  codigo: string;
  nombre: string;
  logicaEvaluacion: string;
}

export const FUENTE_LOGICAS_EVALUACION = {
  archivo: "1 HERRAMIENTA SIS SGSST SEGUIMIENTO Y CONTROL",
  hoja: "Diagnostico del SGSST",
  columna: "FX",
} as const;

/**
 * Lógicas específicas actualmente diligenciadas en la columna FX de la
 * Herramienta SIS. Las filas sin lógica específica no se completan ni se
 * inventan: Stack44 aplica el criterio general 0/3/5 con evidencia directa.
 */
export const LOGICAS_EVALUACION_ASPECTOS: LogicaEvaluacionAspectoFuente[] = [
  {
    excelRow: 41,
    codigo: "1181A",
    nombre: "Soportes de la elección y conteo de votos del comité de convivencia",
    logicaEvaluacion: `Evidencia válida: Acta de conteo de votos del Comité de Convivencia Laboral, debidamente documentada, fechada y firmada.
Calificación:
5: Se evidencia el acta de conteo de votos, fechada y firmada.
3: Se cuenta con el acta de conteo de votos, pero no tiene fecha, no cuenta con las firmas requeridas o presenta ambas condiciones. También se asigna 3 cuando se encuentra documentado que la conformación del Comité de Convivencia Laboral está en proceso y, por tanto, todavía no se ha generado el acta definitiva de conteo de votos.
0: No se evidencia el acta de conteo de votos ni se encuentra documentado un proceso vigente de conformación del Comité de Convivencia Laboral.`,
  },
  {
    excelRow: 43,
    codigo: "1183",
    nombre: "Informes de gestión del Comité de Convivencia. (cada 3 meses)",
    logicaEvaluacion: `Evidencia válida: La existencia del informe documentado correspondiente al trimestre.
5: Se tienen los informes trimestrales al día a la fecha de corte.
3: Existen informes, pero no se encuentran al día.
0: No existen informes trimestrales.`,
  },
  {
    excelRow: 44,
    codigo: "1184",
    nombre: "Soportes de las actas de reunión del Comité de Convivencia y su gestión.",
    logicaEvaluacion: `Evidencia válida: Existencia de las actas documentadas, fechadas y firmadas de las reuniones mensuales del Comité de Convivencia Laboral.
5: Se evidencian todas las actas mensuales exigibles y se encuentran al día de corte, fechadas y firmadas.
3: Existen actas de reunión, pero no se encuentran al día; falta una o más actas de meses ya finalizados. También se asigna 3 cuando existen las actas, pero alguna no tiene fecha o no cuenta con las firmas.
0: No se evidencia ninguna acta de reunión mensual del Comité de Convivencia Laboral.`,
  },
  {
    excelRow: 84,
    codigo: "2511",
    nombre: "La empresa cuenta con un sistema de archivo o retención documental.",
    logicaEvaluacion: `Evidencia válida: Registro explícito en la bitácora indicando que la empresa cuenta con un sistema de archivo o retención documental físico, digital/en la nube o combinado. No son suficientes menciones aisladas de documentos guardados, cargados o archivados.
5: Existencia del sistema confirmada explícitamente.
3: Evidencia indirecta o parcial, sin confirmación expresa.
0: No existe registro que evidencie la existencia del sistema.`,
  },
  {
    excelRow: 85,
    codigo: "2512",
    nombre: "Los registros y documentos son conservados de manera controlada, garantizando que sean legibles, facilmente identificables y accesibles.",
    logicaEvaluacion: `Evidencia válida: Registro explícito en la bitácora indicando que los documentos y registros del SG-SST se conservan de manera controlada y permanecen legibles, identificables y accesibles. Puede tratarse de conservación física, digital/en la nube o combinada. No es suficiente indicar únicamente que un documento fue guardado, cargado o subido a Drive.
5: Se confirma explícitamente que la conservación es controlada y que los registros son legibles, identificables y accesibles.
3: Existe evidencia parcial sobre conservación, organización o acceso, pero no se confirman todas las condiciones del aspecto.
0: No existe registro que permita evidenciar conservación controlada de los documentos.`,
  },
];

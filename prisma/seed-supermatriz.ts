import "dotenv/config";

import {
  BloqueEvergreen,
  CodigoCategoriaGestion,
  CodigoGrupoMinisterial,
  EstadoRegistro,
  EstadoVersionSupermatriz,
  FuentePeriodicidad,
  PrismaClient,
  RolUsuario,
  TipoFechaBaseVigencia,
  UnidadPeriodicidad,
} from "@prisma/client";

const prisma = new PrismaClient();

type FilaFuente = {
  excelRow: number;
  orden: number;
  proceso: string;
  aspecto: string;
  planAccion: string;
  informeEstadoTareas: string | null;
  cicloPhva: string;
  porcentajeCiclo: number | null;
  categoriaEstandar: string;
  porcentajeCategoria: number | null;
  estandar: string;
  calificacionEsperada: number | null;
  gestionIntervencion: string | null;
  gestionDocumental: string | null;
  gestionEmergencias: string | null;
  documentosEvergreen: string | null;
  ejecucion: string | null;
  docActualPeriodica: string | null;
  grupo7: number | null;
  grupo21: number | null;
  grupo60: number | null;
  responsableActividad: string | null;
  fundamentosSoportes: string | null;
  metasEstandar: string | null;
  recursosAdministrativos: string | null;
  palabrasClave: string | null;
  tareaEjecucionCotidiana: string | null;
};

const FILAS_EXCEL: FilaFuente[] = [
  {
    "excelRow": 3,
    "orden": 1,
    "proceso": "12. ROLES Y RESP EN SST",
    "aspecto": "1111. Documento de designación del responsable del SGSST, con la asignación de responsabilidades.",
    "planAccion": "Elaborar el documento para la asignación del responsable del SGSST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": 25.0,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": 10.0,
    "estandar": "111. Responsable del Sistema de Gestión de Seguridad y Salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": null,
    "grupo7": 1,
    "grupo21": 1,
    "grupo60": 1,
    "responsableActividad": "Coord. SST\nResp del SG-SST",
    "fundamentosSoportes": "Acta de designación del responsable del sgsst, firmado por Gerencia",
    "metasEstandar": "Establecer y definir la persona responsable del SGSST y las responsabilidades de cada una de las áreas.",
    "recursosAdministrativos": "Equipos de Oficina\nSoftware",
    "palabrasClave": "Designación del responsable del Sistema de Gestión de la seguridad y salud en el trabajo",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 4,
    "orden": 2,
    "proceso": "12. ROLES Y RESP EN SST",
    "aspecto": "1112. Dirección de la SST. El responsable del sistema del SG-SST cuenta con el perfil de formación que lo acredite. (Técnico, tecnólogo, profesional, especialista o maestria en SST).",
    "planAccion": "Validar la existencia del diploma o certificado que acredite la formación del responsable del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "111. Responsable del Sistema de Gestión de Seguridad y Salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": null,
    "grupo7": 1,
    "grupo21": 1,
    "grupo60": 1,
    "responsableActividad": "Gestión Humana\nCoord. SST",
    "fundamentosSoportes": "Documentos que certifque la formación del Responsable del Sgsst. (Diploma o acta de grado de formación universitaria)",
    "metasEstandar": "Establecer y definir la persona responsable del SGSST y las responsabilidades de cada una de las áreas.",
    "recursosAdministrativos": "Procesos de selección de personal",
    "palabrasClave": "Perfil de formación del responsable del sistema de gestión de la seguridad y salud en el trabajo",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 5,
    "orden": 3,
    "proceso": "12. ROLES Y RESP EN SST",
    "aspecto": "1113. Dirección de la SST. El responsable del sistema del SG-SST cuenta con la licencia en SST vigente",
    "planAccion": "Validar la licencia del responsable del SG-SST y que se encuentre vigente",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "111. Responsable del Sistema de Gestión de Seguridad y Salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": null,
    "grupo7": 1,
    "grupo21": 1,
    "grupo60": 1,
    "responsableActividad": "Gestión Humana\nCoord. SST",
    "fundamentosSoportes": "Documento licencia para prestación de servicios en SST, resolución emitida por la secretaría de Salud.",
    "metasEstandar": "Establecer y definir la persona responsable del SGSST y las responsabilidades de cada una de las áreas.",
    "recursosAdministrativos": "Gestión de Profesional. Formalización del Convenio",
    "palabrasClave": "Licencia de seguridad y salud en el trabajo",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 6,
    "orden": 4,
    "proceso": "11. CAPACITACION OBLIGATORIA",
    "aspecto": "1114. El responsable de la ejecución del SG-SST cuenta con el curso virtual de 50 horas sobre el SG-SST",
    "planAccion": "Realizar el curso de 50 horas por parte del encargado del SG-SST y verificar el soporte respectivo",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "111. Responsable del Sistema de Gestión de Seguridad y Salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": "Cada 3 años",
    "grupo7": 1,
    "grupo21": 1,
    "grupo60": 1,
    "responsableActividad": "Responsable de SGSST",
    "fundamentosSoportes": "Certificado de realización del curso de 50 horas o el de 20 horas en SST",
    "metasEstandar": "Establecer y definir la persona responsable del SGSST y las responsabilidades de cada una de las áreas.",
    "recursosAdministrativos": "Equipos de Oficina\nSoftware",
    "palabrasClave": "Curso de 50 horas en SST",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 7,
    "orden": 5,
    "proceso": "11. CAPACITACION OBLIGATORIA",
    "aspecto": "1115 El responsable del SG-SST cuenta con el curso de actualización de 20 horas?",
    "planAccion": "Realizar el curso de 20 horas por parte del encargado del SG-SST y verificar el soporte respectivo",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "111. Responsable del Sistema de Gestión de Seguridad y Salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": "Cada 3 años",
    "grupo7": 1,
    "grupo21": 1,
    "grupo60": 1,
    "responsableActividad": "Responsable de SGSST",
    "fundamentosSoportes": "Certificado de realización del curso de 50 horas o el de 20 horas en SST",
    "metasEstandar": "Establecer y definir la persona responsable del SGSST y las responsabilidades de cada una de las áreas.",
    "recursosAdministrativos": "Equipos de Oficina\nSoftware",
    "palabrasClave": "Curso de actualización del 20 horas en SST",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 10,
    "orden": 7,
    "proceso": "12. ROLES Y RESP EN SST",
    "aspecto": "1121. Asignación y comunicación de responsabilidades: Responsabilidades en SGSST en los niveles de la organización. Asignadas y documentadas.",
    "planAccion": "Documentar y asignar las responsabilidades en Seguridad y salud en el trabajo a todos los niveles de la organización.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "112. Responsabilidades en el Sistema de gestión de la seguridad y salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se informa a empresa y al profesional",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 2,
    "responsableActividad": "Responsable del SGSST",
    "fundamentosSoportes": "Documento donde se definen las responsabilidades de las partes interesadas.\nRegistro de socialización de las responsabilidades a todos los niveles de la organización.",
    "metasEstandar": "Garantizar la definición y divulgación a las partes interesadas en todos los niveles de la organización sus responsabilidades frente al SG-SST",
    "recursosAdministrativos": "Equipos de oficina, papelería",
    "palabrasClave": "Responsabilidades en SGSST en los niveles de la organización. Asignadas y documentadas.",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 13,
    "orden": 9,
    "proceso": "5. PLANIFICACION",
    "aspecto": "1131. La Planificación permite definir los recursos financieros, humanos, técnicos y de otra índole requeridos para la implementación, mantenimiento y continuidad del SG-SST",
    "planAccion": "Asignar los recursos financieros, humanos, técnicos y de otra índole para la implementación, mantenimiento y continuidad del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "113 Asignación de recursos para el Sistema de Gestión de la seguridad y salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se elabora plan de trabajo con asignación de presupuesto definido por la empresa",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 2,
    "grupo60": 3,
    "responsableActividad": "Gerencia, Responsable del SGSST",
    "fundamentosSoportes": "Plan de trabajo y cronograma de actividades en SST",
    "metasEstandar": "Garantizar y mantener de manera permanente los recursos para la documentación, implementación y mantenimiento del SG-SST",
    "recursosAdministrativos": "Ejercicios de planeación, disponibilidad de tiempo, personal, equipos de oficina, papelería.",
    "palabrasClave": "Recursos para el diseño, implementación, mantenimiento y continuidad del SGSST. (financieros, humanos, técnicos y de otra índole).",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 14,
    "orden": 10,
    "proceso": "12. ROLES Y RESP EN SST",
    "aspecto": "1132. Definición de Recursos  financieros, técnicos y humanos para el desarrollo del SGSST.",
    "planAccion": "Garantizar la existencia de los recursos necesarios para el SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "113 Asignación de recursos para el Sistema de Gestión de la seguridad y salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "Se elabora plan de trabajo con asignación de presupuesto definido por la empresa",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 2,
    "grupo60": 3,
    "responsableActividad": "Gerencia, Responsable del SGSST",
    "fundamentosSoportes": "Costos y gastos asociados a la intervención, implementación y mantenimieto del Sg-sst.  Soportes de pago, contratos o convenios, soportes contables.",
    "metasEstandar": "Garantizar y mantener de manera permanente los recursos para la documentación, implementación y mantenimiento del SG-SST",
    "recursosAdministrativos": "Ejercicios de planeación, disponibilidad de tiempo, personal, equipos de oficina, papelería.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 15,
    "orden": 11,
    "proceso": "13. PLAN DE TRABAJO EN SST",
    "aspecto": "1133. Se evidencia la asignación de recursos para la ejecución del Plan de trabajo anual en SST.",
    "planAccion": "Definir y asignar los recursos requeridos para el desarrollo del plan anual.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "113 Asignación de recursos para el Sistema de Gestión de la seguridad y salud en el trabajo - SG-SST. (0,5)",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "Se elabora plan de trabajo con asignación de presupuesto definido por la empresa",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 2,
    "grupo60": 3,
    "responsableActividad": "Responsable del SG-SST",
    "fundamentosSoportes": "Soportes contables y definición de presupuesto anual",
    "metasEstandar": "Garantizar y mantener de manera permanente los recursos para la documentación, implementación y mantenimiento del SG-SST",
    "recursosAdministrativos": "Ejercicios de planeación, disponibilidad de tiempo, personal, equipos de oficina, papelería.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 18,
    "orden": 13,
    "proceso": "18. AFILIACION AL SISTEMA GENERAL DE RIESGOS LABORALES",
    "aspecto": "1141. AFILIACION AL SGRL: Los trabajadores vinculados laboralmente a la fecha se encuentran afiliados a la seguridad social y la empresa ha realizado los pagos respectivos con base en la clase de riesgo.",
    "planAccion": "Validar la afiliaciación y pagos a la seguridad social del personal vinculado directamente. (4 meses anteriores)",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "114 Afiliación al Sistema General de Riesgos Laborales",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se solicita información vía correo electrónico al contacto de la empresa, se deja evidencia en drive",
    "docActualPeriodica": "Semestral",
    "grupo7": 2,
    "grupo21": 3,
    "grupo60": 4,
    "responsableActividad": "Gerencia, Gestión humana",
    "fundamentosSoportes": "Evidencia de afiliación al sistema  de seguridad social integral y soporte del pago realizado",
    "metasEstandar": "Garantizar que el personal propio y contratista se encuentre afiliado al Sistema General de Riesgos Laborales",
    "recursosAdministrativos": "Software y equipos de oficina",
    "palabrasClave": "Afiliación al sistema general de riesgos laborales",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 19,
    "orden": 14,
    "proceso": "18. AFILIACION AL SISTEMA GENERAL DE RIESGOS LABORALES",
    "aspecto": "1142. Los trabajadores vinculados por prestación de servicios a la fecha se encuentran afiliados al Sistema integral de seguridad social.",
    "planAccion": "Validar la afiliaciación y pagos a la seguridad social del personal vinculado por prestación de servicios. (último mes)",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "114 Afiliación al Sistema General de Riesgos Laborales",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "Se solicita información vía correo electrónico al contacto de la empresa, se deja evidencia en drive",
    "docActualPeriodica": "Semestral",
    "grupo7": 2,
    "grupo21": 3,
    "grupo60": 4,
    "responsableActividad": "Gerencia, Gestión humana",
    "fundamentosSoportes": "Evidencia de afiliación al sistema  de seguridad social integral y soporte del pago realizado",
    "metasEstandar": "Garantizar que el personal propio y contratista se encuentre afiliado al Sistema General de Riesgos Laborales",
    "recursosAdministrativos": "Software y equipos de oficina",
    "palabrasClave": "Afiliación al seguridad social del personal independiente",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 22,
    "orden": 16,
    "proceso": "39. TRABAJOS ESPECIALES",
    "aspecto": "1151. Identificación y relacionamiento en el SGSST, de los trabajadores dedicados en forma permanente a las actividades de alto riesgo que relaciona el decreto 2090 de 2003",
    "planAccion": "Elaborar y aplicar la herramienta para la identificación de trabajadores que realizan actividades de alto riesgo según Decreto 2090 de 2003",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "115. Pago de Pensión trabajadores de alto riesgo",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 años",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 5,
    "responsableActividad": "Responsable del SGSST",
    "fundamentosSoportes": "Registro. Diligenciamiento de formato definido para la validación respectiva.",
    "metasEstandar": "Identificar de manera efectiva las actividades de alto riesgo defnidas enl Decreto 2090 de 2003.",
    "recursosAdministrativos": "Software y equipos de oficina",
    "palabrasClave": "Actividades de alto riesgo según el decreto 2090. Identificación y relacionamiento en SGSST. Cotización",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 23,
    "orden": 17,
    "proceso": "39. TRABAJOS ESPECIALES",
    "aspecto": "1152. La empresa cotiza el monto establecido en la norma al sistema de pensiones por los trabajadores que realizan actividades de alto riesgo de manera permanente. (Decreto 2090 de 2003)",
    "planAccion": "Verificar el pago de los aportes respectivos en pensión a los trabajadores que realizan actividades de alto riesgo de manera permanente.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "115. Pago de Pensión trabajadores de alto riesgo",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 5,
    "responsableActividad": "Responsable del SGSST",
    "fundamentosSoportes": "Soporte del pago realizado, en caso que aplique",
    "metasEstandar": "Identificar de manera efectiva las actividades de alto riesgo defnidas enl Decreto 2090 de 2003.",
    "recursosAdministrativos": "Software y equipos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 26,
    "orden": 19,
    "proceso": "24. COPASST",
    "aspecto": "1161. Soportes de la convocatoria, elección y conformación del COPASST y/o Vigía Ocupacional",
    "planAccion": "Convocar, elegir y conformar al Copasst/vigía y formalizar a través de acta de conformación.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "116. Conformación Copasst/Vigía",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 2 años",
    "grupo7": null,
    "grupo21": 4,
    "grupo60": 6,
    "responsableActividad": "COPASST/vigía,  Responsable del SGSST, Gerencia",
    "fundamentosSoportes": "Acta de convocatoria, acta de elección y conteo de votos y acta de conformación",
    "metasEstandar": "Conformar el COPASST, realizar las reuniones y documentar las actas respectivas.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": "Convocatoria, elección y conformación del Copasst",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 27,
    "orden": 20,
    "proceso": "24. COPASST",
    "aspecto": "1162. El acta de conformación se encuentra vigente",
    "planAccion": "Verificar la vigencia del Copasst/vigía",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "116. Conformación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 2 años",
    "grupo7": null,
    "grupo21": 4,
    "grupo60": 6,
    "responsableActividad": "COPASST/vigía,  Responsable del SGSST, Gerencia",
    "fundamentosSoportes": "Acta de conformación, fechada y firmada",
    "metasEstandar": "Conformar el COPASST, realizar las reuniones y documentar las actas respectivas.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": "Acta de conformación del Copasst",
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 28,
    "orden": 21,
    "proceso": "24. COPASST",
    "aspecto": "1163. Soportes de las actas de reunión del COPASST y/o Vigía Ocupacional y su gestión. (último año)",
    "planAccion": "Validar la existencia de las actas de reunión del Copasst del último año y verificar el cumplimiento de sus funciones.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "116. Conformación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": 4,
    "grupo60": 6,
    "responsableActividad": "COPASST/vigía,  Responsable del SGSST, Gerencia",
    "fundamentosSoportes": "Actas de reuniones mensuales o extraordinarias",
    "metasEstandar": "Conformar el COPASST, realizar las reuniones y documentar las actas respectivas.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": "Actas de reunión del Copasst",
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 31,
    "orden": 23,
    "proceso": "24. COPASST",
    "aspecto": "1171. Capacitación básica al COPASST. (Funciones del Copasst-Vigia, conceptos básicos de SST, Inspecciones de seguridad, invest de accidentes).",
    "planAccion": "Capacitar al Copasst en funciones del Copasst, conceptos básicos de SST, inspecciones de seguridad, inv de accidentes)",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 2 años",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": "Capacitación y formación al copasst",
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 32,
    "orden": 24,
    "proceso": "24. COPASST",
    "aspecto": "1171a. Capacitación al COPASST en funciones del Copasst/vigía",
    "planAccion": "Capacitar al Copasst/vigía en funciones específcas del rol.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 33,
    "orden": 25,
    "proceso": "24. COPASST",
    "aspecto": "1171b. Capacitación al COPASST en conceptos básicos de seguridad y salud en el trabajo.",
    "planAccion": "Capacitar al Copasst/vigía en conceptos básicos de seguridad y salud en el trabajo.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 34,
    "orden": 26,
    "proceso": "24. COPASST",
    "aspecto": "1171c. Dar a conocer o socializar al Comité Paritario de SST el plan de trabajo Anual",
    "planAccion": "Socializar con el Copasst/vigía el plan anual de trabajo",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 35,
    "orden": 27,
    "proceso": "24. COPASST",
    "aspecto": "1171d. Capacitación al COPASST en inspecciones de seguridad",
    "planAccion": "Capacitar al Copasst/vigía en Inspecciones de seguridad",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 36,
    "orden": 28,
    "proceso": "24. COPASST",
    "aspecto": "1171e. Capacitación en procesos de Auditoria",
    "planAccion": "Capacitar al Copasst/vigía en auditorías del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 37,
    "orden": 29,
    "proceso": "24. COPASST",
    "aspecto": "1171f. Capacitación al COPASST en Investigación de accidentes",
    "planAccion": "Capacitar al Copasst/vigía en Investigación de accidentes.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "117. Capacitación Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 7,
    "responsableActividad": "COPASST/Vigía, Responsable del SGSST",
    "fundamentosSoportes": "Registros de capacitación y/o entrenamieto",
    "metasEstandar": "Capacitar al Copasst y mantenerlo informado frente a la temáticva propia del SGSST",
    "recursosAdministrativos": "Espacios de capacitación, disponibilidad de tiempo para formación, equipos y ayudas académicas.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 40,
    "orden": 31,
    "proceso": "26. COMITE CONVIVENCIA",
    "aspecto": "1181. Soportes de la convocatoria del comité de convivencia",
    "planAccion": "Realizar la convocatoria del comité de convivencia",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "118. Conformación del Comité de convivencia",
    "calificacionEsperada": 0.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 años",
    "grupo7": null,
    "grupo21": 5,
    "grupo60": 8,
    "responsableActividad": "Responsable del SGSST, Comité de Convivencia",
    "fundamentosSoportes": "Acta de convocatoria",
    "metasEstandar": "Conformar el comité de convivencia y mantener su funcionamiento, garantizando la documentación y conservación de las actas de reunión.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 41,
    "orden": 32,
    "proceso": "26. COMITE CONVIVENCIA",
    "aspecto": "1181A. Soportes de la elección y conteo de votos del comité de convivencia",
    "planAccion": "Realizar la elección y el conteo de votos del comité de convivencia",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "118. Conformación del Comité de convivencia",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 años",
    "grupo7": null,
    "grupo21": 5,
    "grupo60": 8,
    "responsableActividad": "Responsable del SGSST, Comité de Convivencia",
    "fundamentosSoportes": "Acta de elección y conteo de votos",
    "metasEstandar": "Conformar el comité de convivencia y mantener su funcionamiento, garantizando la documentación y conservación de las actas de reunión.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 42,
    "orden": 33,
    "proceso": "26. COMITE CONVIVENCIA",
    "aspecto": "1182. Comité de convivencia vigente y evidencia de conformación",
    "planAccion": "Validar la vigencia del Comité de convivencia",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "118. Conformación del Comité de convivencia",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 2 años",
    "grupo7": null,
    "grupo21": 5,
    "grupo60": 8,
    "responsableActividad": "Responsable del SGSST, Comité de Convivencia",
    "fundamentosSoportes": "Acta de conformación, fechada y firmada",
    "metasEstandar": "Conformar el comité de convivencia y mantener su funcionamiento, garantizando la documentación y conservación de las actas de reunión.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 43,
    "orden": 34,
    "proceso": "26. COMITE CONVIVENCIA",
    "aspecto": "1183. Informes de gestión del Comité de Convivencia. (cada 3 meses)",
    "planAccion": "Elaborar informes de gestión del Comité de Convivencia cada 3 meses",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "118. Conformación del Comité de convivencia",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 meses",
    "grupo7": null,
    "grupo21": 5,
    "grupo60": 8,
    "responsableActividad": "Responsable del SGSST, Comité de Convivencia",
    "fundamentosSoportes": "Documento. Informe generado cada 3 meses.",
    "metasEstandar": "Conformar el comité de convivencia y mantener su funcionamiento, garantizando la documentación y conservación de las actas de reunión.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 44,
    "orden": 35,
    "proceso": "26. COMITE CONVIVENCIA",
    "aspecto": "1184. Soportes de las actas de reunión del Comité de Convivencia y su gestión.",
    "planAccion": "Validar la existencia de las actas del Comité de convivencia. (Mensual)",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "118. Conformación del Comité de convivencia",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": 5,
    "grupo60": 8,
    "responsableActividad": "Responsable del SGSST, Comité de Convivencia",
    "fundamentosSoportes": "Actas de reunión del comité de convivencia. Fechado y firmado",
    "metasEstandar": "Conformar el comité de convivencia y mantener su funcionamiento, garantizando la documentación y conservación de las actas de reunión.",
    "recursosAdministrativos": "Disponibilidad de tiempo para el personal, espacios y equipos de trabajo.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 47,
    "orden": 37,
    "proceso": "14. PLAN DE CAPACITACION EN SST",
    "aspecto": "1211. La Empresa cuenta con un Programa anual de Capacitación en SST acorde con la matríz de peligros y necesidades en SST.",
    "planAccion": "Elaborar programa de capacitación anual de promoción y prevención en SST con base en la Matríz de peligros y Necesidades en SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "121. Programa de capacitación, promoción y prevención - PyP",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": 3,
    "grupo21": 6,
    "grupo60": 9,
    "responsableActividad": "Responsable del SGSST, Copasst, Alta dirección",
    "fundamentosSoportes": "Documento. Programa de capacitación firmado y fechado",
    "metasEstandar": "Documentar e implementar el plan de capacitación en SST, registrar las actividades de capacitación y validar con el Copasst y mandos medios y superiores de la empresa su contenido y pertinencia",
    "recursosAdministrativos": "Espacios de trabajo, equipos de oficina.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 48,
    "orden": 38,
    "proceso": "14. PLAN DE CAPACITACION EN SST",
    "aspecto": "1213. Se llevan registros de capacitación en SST suministrada a los trabajadores.",
    "planAccion": "Validar la existencia de registros de capacitación y formación en SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "121. Programa de capacitación, promoción y prevención - PyP",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": 3,
    "grupo21": 6,
    "grupo60": 9,
    "responsableActividad": "Responsable del SGSST, Copasst, Alta dirección",
    "fundamentosSoportes": "Registros de capacitación y entrenamiento.",
    "metasEstandar": "Documentar e implementar el plan de capacitación en SST, registrar las actividades de capacitación y validar con el Copasst y mandos medios y superiores de la empresa su contenido y pertinencia",
    "recursosAdministrativos": "Espacios de trabajo, equipos de oficina.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 51,
    "orden": 40,
    "proceso": "15. INDUCCION Y REINDUCCION EN SST",
    "aspecto": "1221. Registro de inducción y reinducción en Seguridad y Salud en el Trabajo (Capacitación general en prevención de riesgos con base a las actividades a desarrollar, que incluya entre otros la identificación de peligros y control de riesgos en su trabajo, y la prevención de AT y EL)",
    "planAccion": "Verificar los registros de las inducciones y reinducciones suministradas a los trabajadores vinculados laboralmente y por prestación de servicios.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "122. Inducción y reinducción en SG-SST, actividades de promoción y prevención - PyP",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 10,
    "responsableActividad": "Responsable del SGSST.",
    "fundamentosSoportes": "Registros de capacitación y entrenamiento.",
    "metasEstandar": "Capacitar al personal en temas relacionados con la SST y en actividades de promoción y prevención, mantener los registros de capacitación, inducción, reinducción y entrenamiento.",
    "recursosAdministrativos": "Espacios de capacitación, material pedagógico, papelería, equipos de oficina, insumos",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 52,
    "orden": 41,
    "proceso": "14. PLAN DE CAPACITACION EN SST",
    "aspecto": "1222. Cobertura de capacitación y evaluación",
    "planAccion": "Validar la cobertura de las capacitaciones y su evaluación.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "122. Inducción y reinducción en SG-SST, actividades de promoción y prevención - PyP",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención realiza seguimiento a cobertura con base en información suministrada por la empresa",
    "docActualPeriodica": "Cuatrimestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 10,
    "responsableActividad": "Mandos medios y superiores",
    "fundamentosSoportes": "Registros de evaluación. Formato de cobertura en capacitaciones",
    "metasEstandar": "Capacitar al personal en temas relacionados con la SST y en actividades de promoción y prevención, mantener los registros de capacitación, inducción, reinducción y entrenamiento.",
    "recursosAdministrativos": "Espacios de capacitación, material pedagógico, papelería, equipos de oficina, insumos",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 55,
    "orden": 43,
    "proceso": "11. CAPACITACION OBLIGATORIA",
    "aspecto": "1231. El responsable de la ejecución del SG-SST cuenta con el curso virtual de 50 horas sobre el SG-SST",
    "planAccion": "Realizar el curso de 50 horas sobre el SG-SST y verificar certificado.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "123  Responsables del Sistema de Gestión de Seguridad y Salud en el Trabajo - SG-SST con curso(50 horas)",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 11,
    "responsableActividad": "Responsable del SG-SST",
    "fundamentosSoportes": "Certificado de formación del curso de 50 horas en SST, vigente",
    "metasEstandar": "Contar con el personal responsable del Sistema de Gestión de la Seguridad y Salud en el Trabajo capacitado",
    "recursosAdministrativos": "Equipo de computo, conexión a internet para la realización del cursos de 50 horas",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 56,
    "orden": 44,
    "proceso": "11. CAPACITACION OBLIGATORIA",
    "aspecto": "12311. El responsable del SG-SST cuenta con el curso de actualización de 20 horas?",
    "planAccion": "Realizar el curso de actualización de 20 horas",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "RECURSOS (10%)",
    "porcentajeCategoria": null,
    "estandar": "123  Responsables del Sistema de Gestión de Seguridad y Salud en el Trabajo - SG-SST con curso(50 horas)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 11,
    "responsableActividad": "Responsable del SG-SST",
    "fundamentosSoportes": "Certificado de formación del curso de 20 horas en SST, vigente",
    "metasEstandar": "Contar con el personal responsable del Sistema de Gestión de la Seguridad y Salud en el Trabajo capacitado",
    "recursosAdministrativos": "Equipo de computo, conexión a internet para la realización del cursos de 20 horas",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 59,
    "orden": 46,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2111. Política de Seguridad y Salud en el Trabajo, fechada y Firmada por el empleador.",
    "planAccion": "Documentar la Política de Seguridad y Salud en el trabajo, fechar y hacer firmar por el empleador",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": 15.0,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento. Política de Seguridad y Salud en el trabajo, fechada y firmada",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 60,
    "orden": 47,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2111. Política de Seguridad y Salud en el Trabajo Documentada con base en lo exigido por la normativa vigente.",
    "planAccion": "Documentar la Política de Seguridad y Salud en el trabajo con base a los criterios definidos por la normativa vigente.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento. Política de Seguridad y Salud en el trabajo, fechada y firmada",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 61,
    "orden": 48,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2112. La Política es revisada anualmente y se adecua de ser necesario",
    "planAccion": "Revisar anualmente la política de SST y validar lo requerido por la norma.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registro o acta de revisión y/o adecuación anual",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 62,
    "orden": 49,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2113. Registro de divulgación de la Política de Seguridad y Salud en el Trabajo al COPASST",
    "planAccion": "Divulgar y/o socializar la Política de seguridad y Salud en el trabajo al Copasst",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registro de capacitación y/o entrenamiento.",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística del evento",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 63,
    "orden": 50,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2114. La Política se encuentra accesible a todos los trabajadores y partes interesadas en el lugar de trabajo.",
    "planAccion": "Publicar la política de SST en lugar visible, accesible a todo el personal",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Verificación Insitu de la política SST publicada en Sitio visible para las partes interesadas",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Espacios de trabajo",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 64,
    "orden": 51,
    "proceso": "4. POLITICA DE SST",
    "aspecto": "2116. Socialización de la Política de Seguridad y Salud en el Trabajo a todo el personal",
    "planAccion": "Divulgar y/o socializar la Política de seguridad y Salud en el trabajo a todo el personal.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "211 Política del SGSST -SGSST firmada, fechada y comunicada al Copasst/vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 7,
    "grupo60": 12,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registro de capacitación y/o entrenamiento.",
    "metasEstandar": "Mantener revisada , actualizada y divulgada la polírtica de seguridad y salud en el trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística del evento",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 67,
    "orden": 53,
    "proceso": "10. OBJETIVOS DEL SG-SST",
    "aspecto": "2211. Objetivos en materia de Seguridad y Salud en el Trabajo (Documentados). Acordes con la politica de SST, Diagnóstico inicial y auditorías.",
    "planAccion": "Documentar los objetivos del SGSST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "221 Objetivos definidos, claros, medibles, cuantificables, con metas. Documentados, revisados del SG-SST",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 13,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento donde se definen los objetivos del SGSST",
    "metasEstandar": "Establecer los objetivos que direccionan el SGSST y medir su cumplimiento",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 68,
    "orden": 54,
    "proceso": "10. OBJETIVOS DEL SG-SST",
    "aspecto": "2212. Objetivos en materia de Seguridad y Salud en el Trabajo (Firmados por el empleador)",
    "planAccion": "Avalar y firmar por parte del empleador, los objetivos del SG-SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "221 Objetivos definidos, claros, medibles, cuantificables, con metas. Documentados, revisados del SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 13,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento donde se definen los objetivos del SGSST, fechado y firmado",
    "metasEstandar": "Establecer los objetivos que direccionan el SGSST y medir su cumplimiento",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 69,
    "orden": 55,
    "proceso": "10. OBJETIVOS DEL SG-SST",
    "aspecto": "2213. Los Objetivos del SG-SST son claros, medibles, cuantificables y tienen metas definidas para su cumplimiento.",
    "planAccion": "Establecer las metas a cumplir de los objetivos del SG-SST. Medir y Cuantificar",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "221 Objetivos definidos, claros, medibles, cuantificables, con metas. Documentados, revisados del SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 13,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Indicador de cumplimiento de los objetivos propuestos",
    "metasEstandar": "Establecer los objetivos que direccionan el SGSST y medir su cumplimiento",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 70,
    "orden": 56,
    "proceso": "10. OBJETIVOS DEL SG-SST",
    "aspecto": "2214. Los objetivos en SST son revisados y evaluados periódicamente, mínimo una vez al año, y actualizados de ser necesarios.",
    "planAccion": "Revisar anualmente los objetivos del SG-SST y su cumplimiento",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "221 Objetivos definidos, claros, medibles, cuantificables, con metas. Documentados, revisados del SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 13,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Acta o documento donde se evidencie la revisión y/o actualización y/o evaluación de los objetivos en SST",
    "metasEstandar": "Establecer los objetivos que direccionan el SGSST y medir su cumplimiento",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 71,
    "orden": 57,
    "proceso": "10. OBJETIVOS DEL SG-SST",
    "aspecto": "2215. Divulgación de los Objetivos de SST a todos los trabajadores. Registro de divulgación.",
    "planAccion": "Divulgar los objetivos del SG-SST a todos los trabajadores",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "221 Objetivos definidos, claros, medibles, cuantificables, con metas. Documentados, revisados del SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 13,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registro de divulgación de los objetivos en SST",
    "metasEstandar": "Establecer los objetivos que direccionan el SGSST y medir su cumplimiento",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 74,
    "orden": 59,
    "proceso": "1. DIAGNOSTICO INICIAL",
    "aspecto": "2311. Registro y/o informe de la Evaluación o diagnóstico inicial del SGSST realizada por el responsable del SGSST o contratada con personal externo con licencia en SST.",
    "planAccion": "Realizar la evaluación inicial del SG-SST con base en la resolución 0312 de 2019, por el responsable del SGSST o por personal externo contratado con licencia en SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "231. Evaluación e identificación de prioridades",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 14,
    "responsableActividad": "Seguridad y Salud en el trabajo",
    "fundamentosSoportes": "Registro. Formato diligenciado de diagnóstico inicial realizado.",
    "metasEstandar": "Garantizar la existencia del Diagnóstico inicial",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 77,
    "orden": 61,
    "proceso": "13. PLAN DE TRABAJO EN SST",
    "aspecto": "2411. El plan de trabajo Anual se encuentra documentado y contiene los objetivos, metas. actividades, responsables, cronograma y recursos del SG-SST.",
    "planAccion": "Diseñar y definir un plan de trabajo anual con objetivos, metas, actividades, responsables, cronograma y recursos",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "241. Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado.",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional documental elabora el documento maestro y lo carga al drive de la emoresa, el profesional de intervención valida el presupuesto y el profesional documental gestiona las firmas.",
    "docActualPeriodica": "Anual",
    "grupo7": 4,
    "grupo21": 8,
    "grupo60": 15,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento plan de trabajo anual vigente, fechado y firmado",
    "metasEstandar": "Definir y mantener el plan de trabajo anual y los recursos para su desarrollo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 78,
    "orden": 62,
    "proceso": "13. PLAN DE TRABAJO EN SST",
    "aspecto": "2412. El Plan de Trabajo Anual en SST se encuentra firmado por el empleador y el responsable del SGSST.",
    "planAccion": "Hacer firmar el plan de trabajo por parte del empleador y por el responsable del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "241. Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": 4,
    "grupo21": 8,
    "grupo60": 15,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento plan de trabajo anual vigente, fechado y firmado",
    "metasEstandar": "Definir y mantener el plan de trabajo anual y los recursos para su desarrollo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 79,
    "orden": 63,
    "proceso": "13. PLAN DE TRABAJO EN SST",
    "aspecto": "2413. El plan de trabajo anual en SST se encuentra en desarrollo para alcanzar cada uno de los objetivos propuestos.",
    "planAccion": "Revisar el grado de cumplimiento y desarrollo del cronograma de actividades, si se evidencia incumplimiento elaborar planes de mejora.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "241. Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": 4,
    "grupo21": 8,
    "grupo60": 15,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento plan de trabajo anual vigente, fechado y firmado",
    "metasEstandar": "Definir y mantener el plan de trabajo anual y los recursos para su desarrollo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 80,
    "orden": 64,
    "proceso": "17. CRONOGRAMA DE ACTIVIDADES",
    "aspecto": "2414. El Plan de trabajo anual en SST cuenta con cronograma de actividades firmado por el empleador y el responsable del SGSST.",
    "planAccion": "Definir el plan de trabajo del SGSST, hacer firmar por el empleador y por el responsable del SGSST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "241. Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": 4,
    "grupo21": 8,
    "grupo60": 15,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento plan de trabajo anual vigente, fechado y firmado",
    "metasEstandar": "Definir y mantener el plan de trabajo anual y los recursos para su desarrollo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 81,
    "orden": 65,
    "proceso": "17. CRONOGRAMA DE ACTIVIDADES",
    "aspecto": "2415. La Empresa desarrolla el Cronograma de actividades en SST Documentado.",
    "planAccion": "Verificar que el cronograma se esté desarrollando, si se evidencia incumplimiento elaborar planes de mejora.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "241. Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención realiza seguimiento periodico al plan y lo documenta en la pestaña de seguimiento.",
    "docActualPeriodica": "NA",
    "grupo7": 4,
    "grupo21": 8,
    "grupo60": 15,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registros y documento que soportan el desarrollo de las actividades propuestas",
    "metasEstandar": "Definir y mantener el plan de trabajo anual y los recursos para su desarrollo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 84,
    "orden": 67,
    "proceso": "25. CONSERV DE DOCUMENTOS",
    "aspecto": "2511. La empresa cuenta con un sistema de archivo o retención documental.",
    "planAccion": "Garantizar un espacio o sitio para el almacenamiento o retención documental del SG-SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "251 Archivo o retención documental del SGSST - SG-SST",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional documental pregunta a las partes si se cuenta con archivo físico y valida que se encuentre creado el archivo en drive",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 9,
    "grupo60": 16,
    "responsableActividad": "Personal de archivo o conservación documental",
    "fundamentosSoportes": "Archivo o carpeta de conservación de documentos. Documentos y registros digitales",
    "metasEstandar": "Mantener bajo control los documentos del SGSST y la rastreabilidad de la información",
    "recursosAdministrativos": "Espacios de trabajo, equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 85,
    "orden": 68,
    "proceso": "25. CONSERV DE DOCUMENTOS",
    "aspecto": "2512. Los registros y documentos son conservados de manera controlada, garantizando que sean legibles, facilmente identificables y accesibles.",
    "planAccion": "Validar que los documentos se conservar legibles y en perfecto estado",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "251 Archivo o retención documental del SGSST - SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención garantiza que la Carpeta se encuentre ordenada y actualizada",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 9,
    "grupo60": 16,
    "responsableActividad": "Personal de archivo o conservación documental",
    "fundamentosSoportes": "Archivo o carpeta de conservación de documentos. Documentos y registros digitales",
    "metasEstandar": "Mantener bajo control los documentos del SGSST y la rastreabilidad de la información",
    "recursosAdministrativos": "Espacios de trabajo, equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 86,
    "orden": 69,
    "proceso": "25. CONSERV DE DOCUMENTOS",
    "aspecto": "25121. Procedimiento para la documentación y conservación de los documentos del SGSST.",
    "planAccion": "Elaborar el procedimiento que defina la documentación y conservación de los documentos del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "251 Archivo o retención documental del SGSST - SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": "Se elabora/actualiza el procedimiento y se informa a las partes interesadas",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": 9,
    "grupo60": 16,
    "responsableActividad": "Personal de archivo o conservación documental",
    "fundamentosSoportes": "Documento procedimiento  para la documentación y conservación documental",
    "metasEstandar": "Mantener bajo control los documentos del SGSST y la rastreabilidad de la información",
    "recursosAdministrativos": "Espacios de trabajo, equipos e insumos de oficina, papelería",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 89,
    "orden": 71,
    "proceso": "36. RENDICION DE CUENTAS",
    "aspecto": "2611. Rendición de cuentas al interior de la empresa: Coordinación de SST. Informe de rendición de cuentas en SST documentado. (Anual)",
    "planAccion": "Verificar registro documental que evidencie la rendición de cuentas por parte del Coordinador de SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "261 Rendición sobre el desempeño",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El informe se construye con la información de intervención, documental y de emergencias",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 17,
    "responsableActividad": "Responsable del Sistema de Gestión de la seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento rendición de cuentas",
    "metasEstandar": "Garantizar que cada uno de los responsables del SGSST informen sobre la gestión realizada en SST",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 90,
    "orden": 72,
    "proceso": "36. RENDICION DE CUENTAS",
    "aspecto": "2612. Rendición de cuentas al interior de la empresa: Copasst - Vigía. Informe de rendición de cuentas en SST documentado. (Anual)",
    "planAccion": "Verificar registro documental que evidencie la rendición de cuentas por parte del Copasst/Vigía.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "261 Rendición sobre el desempeño",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "x",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención garantiza las actas del Copasst/vigia, con base en esa información el profesional documental elabora el informe y lo comparte a las partes interesadas.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 17,
    "responsableActividad": "Copasst o Vigía Ocupacional",
    "fundamentosSoportes": "Documento rendición de cuentas",
    "metasEstandar": "Garantizar que cada uno de los responsables del SGSST informen sobre la gestión realizada en SST",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 91,
    "orden": 73,
    "proceso": "36. RENDICION DE CUENTAS",
    "aspecto": "2613. Rendición de cuentas al interior de la empresa: Comité de convivencia. Informe de rendición de cuentas en SST documentado. (Anual)",
    "planAccion": "Verificar registro documental que evidencie la rendición de cuentas por parte del Comité de Convivencia.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "261 Rendición sobre el desempeño",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención garantiza las actas del CCL, con base en esa información el profesional documental elabora el informe y lo comparte a las partes interesadas.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 17,
    "responsableActividad": "Comité de Convivencia",
    "fundamentosSoportes": "Documento rendición de cuentas",
    "metasEstandar": "Garantizar que cada uno de los responsables del SGSST informen sobre la gestión realizada en SST",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 92,
    "orden": 74,
    "proceso": "36. RENDICION DE CUENTAS",
    "aspecto": "2614. Rendición de cuentas al interior de la empresa: Brigada de emergencias. Informe de rendición de cuentas en SST documentado. (Anual)",
    "planAccion": "Verificar registro documental que evidencie la rendición de cuentas por parte de la brigada de emergencias",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "261 Rendición sobre el desempeño",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de emergencias y el profesional validan la gestión y elaboran el informe respectivo, se informa a las partes interesadas.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 17,
    "responsableActividad": "Brigada de Emergencias",
    "fundamentosSoportes": "Documento rendición de cuentas",
    "metasEstandar": "Garantizar que cada uno de los responsables del SGSST informen sobre la gestión realizada en SST",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 95,
    "orden": 76,
    "proceso": "7. MATRIZ DE REQUISITOS LEGALES",
    "aspecto": "2711. Cumplimiento de los requisitos normativos aplicables: Matriz Legal actualizada con las normas del Sistema General de Riesgos Laborales que apliquen a la empresa, para el cumplimiento de Requisitos Normativos",
    "planAccion": "Documentar la Matríz de requisitos legales y mantenerla actualizada con la normas legales vigentes y aplicables a la empresa.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "271 Matríz Legal",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de gestión dociumental valida la normativa legal vigente y comparte el estado de la matriz",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 18,
    "responsableActividad": "Gerencia y Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento Matríz de requisitos legales, actualizado",
    "metasEstandar": "Mantener actualizada la información legal referente al SGSST aplicable y vigente",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 98,
    "orden": 78,
    "proceso": "34. COMUNICACIONES",
    "aspecto": "2811. Mecanismos y/o canales para recibir, documentar y responder a las comunicaciones internas y externas en SST",
    "planAccion": "Definir los mecanismos de comunicación a utilizar para responder a las necesidades en SST de clientes internos y externos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "281 Mecanismos de comunicación, autoreporte en SG-SST",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 19,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Actas de reunión de copasst, Actas de reunión de comtés de convivencia",
    "metasEstandar": "Mantener información actualizada y relevante sobre el estado de salud de los colaboradores y de sus condiciones de trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 99,
    "orden": 79,
    "proceso": "20. DIAGNOSTICO DE CONDICIONES DE SALUD",
    "aspecto": "2812. Encuesta para el autoreporte de las condiciones de salud de la población trabajadora.",
    "planAccion": "Elaborar la encuesta de autoreporte de condiciones de salud.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "281 Mecanismos de comunicación, autoreporte en SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 19,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Registro. Encuesta de diagnóstico de condiciones de salud",
    "metasEstandar": "Mantener información actualizada y relevante sobre el estado de salud de los colaboradores y de sus condiciones de trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 100,
    "orden": 80,
    "proceso": "20. DIAGNOSTICO DE CONDICIONES DE SALUD",
    "aspecto": "2812. Mecanismos para el autoreporte de condiciones de trabajo y salud para el personal. (Encuesta de condiciones de salud)",
    "planAccion": "Aplicar el autoreporte de condiciones de salud. (Encuesta) y elaborar informe",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "281 Mecanismos de comunicación, autoreporte en SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 19,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Registro. Encuesta de diagnóstico de condiciones de salud",
    "metasEstandar": "Mantener información actualizada y relevante sobre el estado de salud de los colaboradores y de sus condiciones de trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 103,
    "orden": 82,
    "proceso": "42. ADQUISICIONES",
    "aspecto": "2911. Procedimiento Adquisión de productos o servicios, donde se identifiquen y evaluen las especificaciones relativas a las compras en materia de SST.",
    "planAccion": "Elaborar el procedimiento para la adquisición de productos o servicios, donde se identifiquen y evaluen las especificaciones relativas a las compras en materia de SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "291 Identificación, evaluación para adquisición de productos y servicios en SG-SST",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 20,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Documento procedimiento adquisición de productos y servicios",
    "metasEstandar": "Identificar las adquisiciones realizadas e identificar, evaluar e intervenir los peligros y riesgos existentes",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 104,
    "orden": 83,
    "proceso": "28. ELEMENTOS DE PP",
    "aspecto": "2912. Matríz de Elementos de Protección Personal",
    "planAccion": "Elaborar la matríz de elementos de protección personal.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "291 Identificación, evaluación para adquisición de productos y servicios en SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 años",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 20,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Documento, matríz de elementos de protección personal",
    "metasEstandar": "Identificar las adquisiciones realizadas e identificar, evaluar e intervenir los peligros y riesgos existentes",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 107,
    "orden": 85,
    "proceso": "43. CONTRATISTAS",
    "aspecto": "21011. La empresa cuenta con un procedimiento para el proceso de evaluación y selección de contratistas la empresa incluye aspectos de SST.",
    "planAccion": "Elaborar el procedimiento para la evaluación y selección de contratistas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "2101 Evaluación y selección de proveedores y contratistas",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 21,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Documento, procedimiento de evaluación y selección de contratistas",
    "metasEstandar": "Garantizar el control efectivo del cumplimiento del SG-SST de los contratistas que prestan servicios para la Empresa",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 108,
    "orden": 86,
    "proceso": "43. CONTRATISTAS",
    "aspecto": "21012. Los proveedores o contratistas tienen implementado el SG-SST y conocen los peligros y riesgos y la forma de controlarlos al ejecutar el servicio.",
    "planAccion": "Verificar que los contratistas cuenten con el SG-SST documentado e implementado y conocen los peligros y riesgos y la forma de controlarlos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "2101 Evaluación y selección de proveedores y contratistas",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El prifesional documental elabora los documentos, el profesional de intervención los socializa y hace seguimiento a los contratistas y proveedores",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 21,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Registro, formato de verificación de cumplimiento legal por parte de los proveedores y contratistas",
    "metasEstandar": "Garantizar el control efectivo del cumplimiento del SG-SST de los contratistas que prestan servicios para la Empresa",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 111,
    "orden": 88,
    "proceso": "33. GESTION DEL CAMBIO",
    "aspecto": "21111. Procedimiento Gestión del Cambio",
    "planAccion": "Elaborar el procedimiento para evaluar el impacto sobre la SST que se pueda generar por cambios internos o externos",
    "informeEstadoTareas": "x",
    "cicloPhva": "PLANEAR (25%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION INTEGRAL DEL SISTEMA DE GESTIÓN DE LA SEGURIDAD Y LA SALUD EN EL TRABAJO (15%)",
    "porcentajeCategoria": null,
    "estandar": "2111. Evaluación del impacto de cambios internos y externos en el SG-SST",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": "El profesional de gestión documental elabora el procedimiento y lo informa a las partes interesadas.",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 22,
    "responsableActividad": "Seguridad Y salud en el trabajo",
    "fundamentosSoportes": "Documento, procedimiento gestión del cambio",
    "metasEstandar": "Gestionar de manera oportuna los peligros y riesgos que se puedan generar por cambios internos y externos a los procesos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 114,
    "orden": 90,
    "proceso": "21. PERFIL SOCIODEMOGRAFICO",
    "aspecto": "3111. Informe de perfil sociodemográfico de todos los trabajadores, del último año.",
    "planAccion": "Aplicar y elaborar informe de perfíl sociodemográfico de la población trabajadora.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": 60.0,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": 20.0,
    "estandar": "311. Evaluación médica Ocupacional.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 10,
    "grupo60": 23,
    "responsableActividad": "Médico Laboral\nSeguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento, informe perfíl sociodemográfico",
    "metasEstandar": "Intervenir en el 100% de las condiciones de riesgos que puedan generar patologías ocupacionales en la población trabajadora",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 115,
    "orden": 91,
    "proceso": "20. DIAGNOSTICO DE CONDICIONES DE SALUD",
    "aspecto": "3112. Informe del diagnóstico de condiciones de Salud",
    "planAccion": "Elaborar informe del diagnóstico de las condiciones de salud.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "311. Evaluación médica Ocupacional.",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 2 años",
    "grupo7": null,
    "grupo21": 10,
    "grupo60": 23,
    "responsableActividad": "Médico Laboral\nSeguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento, informe diagnóstico de condiciones de salud",
    "metasEstandar": "Intervenir en el 100% de las condiciones de riesgos que puedan generar patologías ocupacionales en la población trabajadora",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 116,
    "orden": 92,
    "proceso": "45. INDICADORES",
    "aspecto": "3113. Evaluación y análisis de las estadísticas de enfermedades laborales, incidentes, accidentes de trabajo y ausentismo laboral por enfermedad",
    "planAccion": "Realizar el análisis estadístico de salud de los trabajadores tanto de origen común como de origen laboral.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "311. Evaluación médica Ocupacional.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": 10,
    "grupo60": 23,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Estadística e indicadores del SGSST",
    "metasEstandar": "Intervenir en el 100% de las condiciones de riesgos que puedan generar patologías ocupacionales en la población trabajadora",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 119,
    "orden": 95,
    "proceso": "32. PROMOCION Y PREVENCION DE LA SALUD Y LA SEGURIDAD",
    "aspecto": "3121. Prevención y promoción de Riesgos Laborales: La empresa desarrolla e implementa actividades de prevención de accidentes de trabajo y enfermedades laborales.",
    "planAccion": "Definir actividades de prevención de accidentes de trabajo y enfermedades laborales.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "312. Actividades de Promoción y Prevención en Salud",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "x",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 11,
    "grupo60": 24,
    "responsableActividad": "Gerencia\nSST\nMédico Ocupacional",
    "fundamentosSoportes": "Documentos y registros evidencia de la implementación del Sg-sst",
    "metasEstandar": "Intervenir al 100% los factores de riesgo de mayor valoración con base en la matríz de pelirgos y valoración de riesgos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 120,
    "orden": 96,
    "proceso": "32. PROMOCION Y PREVENCION DE LA SALUD Y LA SEGURIDAD",
    "aspecto": "3122. Obligaciones de los Empleadores: La Empresa desarrolla e implementa actividades de promoción de la salud.",
    "planAccion": "Definir actividades de promoción de la salud a realizar.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "312. Actividades de Promoción y Prevención en Salud",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "x",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 11,
    "grupo60": 24,
    "responsableActividad": "Gerencia\nSST\nMédico Ocupacional",
    "fundamentosSoportes": "Registros de capacitación y entrenamiento.",
    "metasEstandar": "Intervenir al 100% los factores de riesgo de mayor valoración con base en la matríz de pelirgos y valoración de riesgos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 121,
    "orden": 97,
    "proceso": "31. PROGRAMA DE VIGILANCIA EPIDEM",
    "aspecto": "3123. La empresa desarrolla acciones de vigilancia de la salud de los trabajadores mediante Programas de vigilancia epidemiológica",
    "planAccion": "Definir e implementar programa de vigilancia epidemiológica con base en los riesgos aplicables",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "312. Actividades de Promoción y Prevención en Salud",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "x",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": 11,
    "grupo60": 24,
    "responsableActividad": "Gerencia\nSST\nMédico Ocupacional",
    "fundamentosSoportes": "Documento. Sistema de vigilancia epidemiológica. Registros de capacitación",
    "metasEstandar": "Intervenir al 100% los factores de riesgo de mayor valoración con base en la matríz de pelirgos y valoración de riesgos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 124,
    "orden": 99,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3131. Profesiograma documentado y enviado al médico ocupacional para la realización de los exámenes. (Perfil del cargo)",
    "planAccion": "Elaborar perfil del cargo (Profesiograma) para enviar al médico ocupacional que realiza los exámenes médicos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "313. Información al Médico de los perfiles de cargo",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 25,
    "responsableActividad": "Médico Laboral\nSeguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Documento perfil del cargo",
    "metasEstandar": "Establecer que el 100% de los cargos de la Empresa cuente con la descripción e identificación de tareas y actividades que permita definir el tipo de exámenes a realizar y su periodicidad.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 127,
    "orden": 101,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3141. Registros conceptos de aptitud examenes de ingreso, periódico y retiro. Realización de evaluaciones médicas de acuerdo con la normatividad y los peligros.",
    "planAccion": "Validar que se cuenten con los conceptos médicos de los exámenes médicos ocupacionales.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "314. Realización de los exámenes médicos ocupacionales. Peligros. Periodicidad.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": 5,
    "grupo21": 12,
    "grupo60": 26,
    "responsableActividad": "Médico Laboral\nSeguridad y Salud en el Trabajo.\nGestión Humana",
    "fundamentosSoportes": "Conceptos médicos de los exámenes realizados",
    "metasEstandar": "Garantizar quie el 100% de los colaboradores cuentes con los exámenes médico de intreso, periódico y de retiro.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 128,
    "orden": 102,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3143. La empresa cuenta con la evidencia del documento donde se le comunica al trabajador los resultados de las evaluaciones médicas.",
    "planAccion": "Comunicar o validar que al trabajador se le informó sobre los resultados de las evaluaciones médicas ocupacionales.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "314. Realización de los exámenes médicos ocupacionales. Peligros. Periodicidad.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Semestral",
    "grupo7": 5,
    "grupo21": 12,
    "grupo60": 26,
    "responsableActividad": "Médico Laboral",
    "fundamentosSoportes": "Soporte de entrega de los resultados de los exámenes médicos ocupacionales",
    "metasEstandar": "Garantizar quie el 100% de los colaboradores cuentes con los exámenes médico de intreso, periódico y de retiro.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 131,
    "orden": 104,
    "proceso": "25. CONSERV DE DOCUMENTOS",
    "aspecto": "3151. Las historias clínicas ocupacionales se encuentran en custodia del médico ocupacional",
    "planAccion": "Evidenciar que la custodía de las historias clínicas se encuentran a cargo del médico ocupacional.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "315. Custodia de historias clínicas",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 27,
    "responsableActividad": "Médico Laboral",
    "fundamentosSoportes": "Carta emitida por el médico ocupacional donde garantice la custodia de los exámenes médicos",
    "metasEstandar": "Garantizar que los exámenes médicos ocupacionales permanezcan en custodia del médico ocupacional, garantizando su confidencialidad",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 134,
    "orden": 106,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3161. La empresa acata las restricciones y recomendaciones del médico laboral (EPS - ARL) prescritas a los trabajadores para la realización de sus funciones.",
    "planAccion": "Validar que las restricciones que se han generado por parte de las EPS o ARL se cumplan o se estén llevando a cabo.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "316. Restricciones o recomendaciones médico laborales.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 13,
    "grupo60": 28,
    "responsableActividad": "Gerencia y seguridad y salud en el Trabajo",
    "fundamentosSoportes": "Acta de seguimiento a las recomendaciones y/o restricciones generadas por el médico laboral",
    "metasEstandar": "Garantizar que el 100% de las restricciones recomendaciones médicas emitidas por la EPS y la ARL se acaten",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 135,
    "orden": 107,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3162. La empresa de ser necesario adecúa los puestos de trabajo, reubica al trabajador o realiza readaptación laboral.",
    "planAccion": "Revisar si existen reubicaciones o adaptación de puestos de trabajo con base en recomendaciones de la EPs o ARL respectiva.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "316. Restricciones o recomendaciones médico laborales.",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 13,
    "grupo60": 28,
    "responsableActividad": "Gerencia y seguridad y salud en el Trabajo",
    "fundamentosSoportes": "Soportes de pago de mejoras, registros, fotografias.",
    "metasEstandar": "Garantizar que el 100% de las restricciones recomendaciones médicas emitidas por la EPS y la ARL se acaten",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 136,
    "orden": 108,
    "proceso": "22. EXAMENES MEDICOS",
    "aspecto": "3163. La empresa anexa los documentos requeridos por las entidades calificadoras y/o juntas de calificación de invalidez requeridos para calificación de origen o pérdida de capacidad laboral.",
    "planAccion": "Verificar si la empresa envia documentos de soporte requeridos por las entidades calificadoras y/o juntas de calificación de invalidez cuando son requeridos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "316. Restricciones o recomendaciones médico laborales.",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 13,
    "grupo60": 28,
    "responsableActividad": "Gerencia y seguridad y salud en el Trabajo",
    "fundamentosSoportes": "Evidencia de envio de soportes requeridos",
    "metasEstandar": "Garantizar que el 100% de las restricciones recomendaciones médicas emitidas por la EPS y la ARL se acaten",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 139,
    "orden": 110,
    "proceso": "30. ESTILOS DE VIDA Y DE TRABAJO SALUDABLE",
    "aspecto": "3171. La empresa cuenta con un programa de estilos de vida y de trabajo saludable, incluye campañas específicas tendientes a la prevención y el control de la farmacodependencia, el alcoholismo y el tabaquismo.",
    "planAccion": "Elaborar el programa de estilos de vida y de trabajo saludable, que incluya campañas de prevención del tabaquismo, alcoholismo y la farmacodependencia.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "317. Estilos de vida y entornos saludables (Controles, tabaquismo, alcoholismo, farmacodependencia y otros)",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 2",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 29,
    "responsableActividad": "Seguridad y Salud en el trabajo",
    "fundamentosSoportes": "Documento, programa de estilos de vida y de trabajo saludable.",
    "metasEstandar": "Promover al 100% del personal estilos de vida y de trabajo saludables",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 140,
    "orden": 111,
    "proceso": "3. POLITICA DE ALCOHOL Y DROGAS",
    "aspecto": "3172. Política de  Alcohol y Drogas Documentada.",
    "planAccion": "Documentar la política de alcohol y drogas",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "317. Estilos de vida y entornos saludables (Controles, tabaquismo, alcoholismo, farmacodependencia y otros)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 29,
    "responsableActividad": "Gerencia y seguridad y salud en el Trabajo",
    "fundamentosSoportes": "Documento. Política de alcohol y drogas, fechado y firmado",
    "metasEstandar": "Promover al 100% del personal estilos de vida y de trabajo saludables",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 141,
    "orden": 112,
    "proceso": "3. POLITICA DE ALCOHOL Y DROGAS",
    "aspecto": "3173. Política de Alcohol y Drogas (Fechada y Firmada por el empleador)",
    "planAccion": "Validar la firma de la politica  de alcohol y drogas por parte del empleador",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "317. Estilos de vida y entornos saludables (Controles, tabaquismo, alcoholismo, farmacodependencia y otros)",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 29,
    "responsableActividad": "Gerencia y seguridad y salud en el Trabajo",
    "fundamentosSoportes": "Documento. Política de alcohol y drogas, fechado y firmado",
    "metasEstandar": "Promover al 100% del personal estilos de vida y de trabajo saludables",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 142,
    "orden": 113,
    "proceso": "3. POLITICA DE ALCOHOL Y DROGAS",
    "aspecto": "3174. Socialización y/o Registro de divulgación de la Política de Alcohol y Drogas.",
    "planAccion": "Divulgar al personal la política de alcohol y drogas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "317. Estilos de vida y entornos saludables (Controles, tabaquismo, alcoholismo, farmacodependencia y otros)",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 29,
    "responsableActividad": "Seguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Registro de capacitación y/o entrenamiento",
    "metasEstandar": "Promover al 100% del personal estilos de vida y de trabajo saludables",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 145,
    "orden": 115,
    "proceso": "16. RECURSOS",
    "aspecto": "3181. En las sedes de la Empresa se cuenta con suministro permanente de agua potable, servicios sanitarios y mecanismos para disponer excretas y basuras.",
    "planAccion": "Realizar observación directa y registrando fotografica,ente o de manera fílmica si la sede cuenta con agua potable, servicios sanitarios y mecanismos para disponer excretas y basuras.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "318. Agua Potable, servicios sanitarios y disposición de basuras.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional de intervención envia correo electrónico con las fotos de las facilidades de la empresa dirigido a la Gerencia de la empresa con copia al profesional de gestión documental.",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 30,
    "responsableActividad": "Gerencia",
    "fundamentosSoportes": "Verificación insitu, recibos de energía, agua y convenios de recolección de residuos especiales, registro fílmico o fotográfico",
    "metasEstandar": "Garantizar que el 100% del personal cuente con las condiciones necesarias para realizar sus actividades",
    "recursosAdministrativos": "Convenios de servicios públicos,  servicios sanitarios,  insumos de limpieza y de aseo personal",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 148,
    "orden": 117,
    "proceso": "40. ORDEN Y ASEO",
    "aspecto": "3191. La empresa elimina los residuos sólidos, líquidos o gaseosos que se producen, así como los residuos peligrosos de forma que no se pone en riesgo a los trabajadores.",
    "planAccion": "Verificar que la empresa realiza eliminación de los residuos sólidos, líquidos o gaseosos que producen. Registro fotográfico.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "319. Eliminación adecuada de residuos sólidos, líquidos o gaseosos",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 31,
    "responsableActividad": "Gerencia",
    "fundamentosSoportes": "Convenios con empresas de recolección de residuos especiales.",
    "metasEstandar": "Garantizar que el 100% del personal cuente con las condiciones necesarias para realizar sus actividades",
    "recursosAdministrativos": "Convenios de servicios públicos,  servicios sanitarios,  insumos de limpieza y de aseo personal",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 149,
    "orden": 118,
    "proceso": "40. ORDEN Y ASEO",
    "aspecto": "3192. La empresa elimina sus residuos peligrosos a través de una compañía autorizada para tal fin y se cuenta con contrato entre las partes.",
    "planAccion": "Evidenciar la existencia de convenio entere las partes para la eliminación y disposición de residuos peligrosos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "319. Eliminación adecuada de residuos sólidos, líquidos o gaseosos",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de gestión documental enviará solicitud aclaratoria a la empresa por email, se conservará el email en drive",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 31,
    "responsableActividad": "Gerencia",
    "fundamentosSoportes": "Convenios con empresas de recolección de residuos especiales.",
    "metasEstandar": "Garantizar que el 100% del personal cuente con las condiciones necesarias para realizar sus actividades",
    "recursosAdministrativos": "Convenios de servicios públicos,  servicios sanitarios,  insumos de limpieza.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 152,
    "orden": 120,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3211. La Empresa reporta los accidentes de trabajo y las enfermedades laborales",
    "planAccion": "Validar el reporte de los accidentes de trabajo y las enfermedades laborales alas ARL o EPS respectivas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "321. Reporte de los accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial del Ministerio de trabajo",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 14,
    "grupo60": 32,
    "responsableActividad": "Gestión Humana\nSeguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Reportes de accidentes de trabajo o enfermedades laborales",
    "metasEstandar": "Garantizar que el 100% de los accidentes de trabajo y las enfermedades laborales sean reportadas a la Arl y a las entidades que correponda enn los tiempos establecidos por la ley",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 153,
    "orden": 121,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3212. La empresa reporta los accidentes graves y mortales y la enfermedades laborales a la dirección territorial dentro de los 2 días siguientes a la ocurrencia del evento.",
    "planAccion": "Verificar si han ocurrido accidentes graves o se han disgnósticado enfermedades laborales y si estos se han reportado a la dirección territorial del Ministerio del trabajo dentro los 2 dias siguientes a la ocurrencia del evento.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "321. Reporte de los accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial del Ministerio de trabajo",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 14,
    "grupo60": 32,
    "responsableActividad": "Gestión Humana\nSeguridad y Salud en el Trabajo",
    "fundamentosSoportes": "Carta de reporte de AT graves",
    "metasEstandar": "Garantizar que el 100% de los accidentes de trabajo y las enfermedades laborales sean reportadas a la Arl y a las entidades que correponda enn los tiempos establecidos por la ley",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 156,
    "orden": 123,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3221. La empresa adelanta las investigaciones de Inc, AT y EL acorde con lo establecido en la Resolución 1401 de 2007.",
    "planAccion": "Validar la existencia de las investigaciones de los accidentes e incidentes de trabajo y de las enfermedades laborales y si se tomaron acciones para otros trabajadores potencialmente expuestos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "322. Investigación de accidentes, incidentes y enfermedad laboral.",
    "calificacionEsperada": 2.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 15,
    "grupo60": 33,
    "responsableActividad": "Seguridad y Salud en el Trabajo, equipo investigador, Gerencia, Gestión Humana",
    "fundamentosSoportes": "Registro de investigaciones de accidentes de trabajo realizadas",
    "metasEstandar": "Garantizar la investigación al 100% de los accidentes, incidentes y enfermedades laborales que se presenten e intervenir las causas que los originaron.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 157,
    "orden": 124,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3222. La Empresa Investiga todos los incidentes y accidentes de trabajo dentro de los quince (15) días siguientes a su ocurrencia, a través del equipo investigador.",
    "planAccion": "Verificar que los accidentes de trabajo son investigados dentro de los 15 días posteriores a su ocurrencia y que participa el equipo investigador.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "322. Investigación de accidentes, incidentes y enfermedad laboral.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 15,
    "grupo60": 33,
    "responsableActividad": "Seguridad y Salud en el Trabajo, equipo investigador, Gerencia, Gestión Humana",
    "fundamentosSoportes": "Registro de investigaciones de accidentes de trabajo realizadas",
    "metasEstandar": "Garantizar la investigación al 100% de los accidentes, incidentes y enfermedades laborales que se presenten e intervenir las causas que los originaron.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 158,
    "orden": 125,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "32221. Seguimiento a Investigaciones de accidentes y a planes de acción propuestos.",
    "planAccion": "Realizar seguimiento a las investigaciones realizadas y a los planes de acción propuestos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "322. Investigación de accidentes, incidentes y enfermedad laboral.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 15,
    "grupo60": 33,
    "responsableActividad": "Seguridad y Salud en el Trabajo, equipo investigador, Gerencia, Gestión Humana",
    "fundamentosSoportes": "Acta de registro diario",
    "metasEstandar": "Garantizar la investigación al 100% de los accidentes, incidentes y enfermedades laborales que se presenten e intervenir las causas que los originaron.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 159,
    "orden": 126,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3223. Conformación del equipo investigador de accidentes e incidentes de trabajo y enfermedades laborales",
    "planAccion": "Conformar el equipo investigador con base en lo establecido por la Resolución 1401.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "322. Investigación de accidentes, incidentes y enfermedad laboral.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 15,
    "grupo60": 33,
    "responsableActividad": "Seguridad y Salud en el Trabajo, equipo investigador, Gerencia, Gestión Humana",
    "fundamentosSoportes": "Evidencia en los registros de investigación de accidentes de trabajo de la conformación del equipo investigador",
    "metasEstandar": "Garantizar la investigación al 100% de los accidentes, incidentes y enfermedades laborales que se presenten e intervenir las causas que los originaron.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 160,
    "orden": 127,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3224. Los accidentes de trabajo graves o mortales son investigados con la participación de un profesional con licencia en Seguridad y Salud en el Trabajo y con el Copasst o vigía.",
    "planAccion": "Validar si el profesional que realiza las investigaciones cuenta con licencia en seguridad y salud en el trabajo y la participación del copasst o vigía en las investigaciones.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "322. Investigación de accidentes, incidentes y enfermedad laboral.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de gestión documental y el profesional de intervención haran seguimiento a los eventos mortales y registraran su seguimiento.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 15,
    "grupo60": 33,
    "responsableActividad": "Seguridad y Salud en el Trabajo, equipo investigador, Gerencia, Gestión Humana",
    "fundamentosSoportes": "Registro de investigaciones de accidentes de trabajo graves",
    "metasEstandar": "Garantizar la investigación al 100% de los accidentes, incidentes y enfermedades laborales que se presenten e intervenir las causas que los originaron.",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 163,
    "orden": 129,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "3231. La empresa mantiene un registro estadístico de los AT y de las EL y el análisis y las conclusiones derivadas del estudio. (Matriz de ausentismo)",
    "planAccion": "Revisar el registro estadístico actualizado de lo corrido del año y el año inmediatamente anterior y su respectivo análisis y conclusiones.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "323. Registro y análisis estadístico de incidentes, accidentes de trabajo y enfermedad laboral.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 34,
    "responsableActividad": "Seguridad y Salud en el trabajo y Gestión Humana",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por el ausentismo por difertentes causas al interior de la empresa",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 166,
    "orden": 131,
    "proceso": "45. INDICADORES",
    "aspecto": "3311. La Empresa mide la severidad de los accidentes de trabajo y su relación con los peligros/riesgos.",
    "planAccion": "Ealborar o validar las estadísiticas de severidad y su relación con los peligros/riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "331. Medición de la severidad de los accidentes de trabajo y enfermedad laboral.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 35,
    "responsableActividad": "Seguridad y Salud en el trabajo y Gestión Humana",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por casos severos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 169,
    "orden": 133,
    "proceso": "45. INDICADORES",
    "aspecto": "3321. La empresa mide la frecuencia de los accidentes de trabajo, incidentes de trabajo y enfermedades laborales",
    "planAccion": "Elaborar las estadísticas de frecuencia de la accidentalidad garantizar mínimo 2 años",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "332. Medición de la frecuencia de los incidentes, accidentes de trabajo y enfermedad laboral",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 36,
    "responsableActividad": "Seguridad y Salud en el trabajo y Gestión Humana",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por la frecuencia de los eventos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 172,
    "orden": 135,
    "proceso": "45. INDICADORES",
    "aspecto": "3331. La Empresa mide la mortalidad por accidentes de trabajo y enfermedades laborales como mínimo una vez al año.",
    "planAccion": "Elaborar las estadísticas de mortalidad de la empresa y validar su relación con los peligros/riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "333. Medición de la Mortalidad de accidentes de trabajo y enfermedad laboral.",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 37,
    "responsableActividad": "Seguridad y Salud en el trabajo y Gestión Humana",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por casos mortales",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 175,
    "orden": 137,
    "proceso": "45. INDICADORES",
    "aspecto": "3341. La Empresa mide la prevalencia de la enfermedad laboral mínimo una vez al año.",
    "planAccion": "Elaborar las estadísticas de prevalencia de la enfermedad laboral mínimo una vez al año y teniendo en cuenta el año inmediatamente anterior y su relacion peligro/riesgos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "334. Medición de la prevalencia de incidentes, accidentes de trabajo y enfermedad laboral",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 38,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por casos  antiguos de enfermedada laboral",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 178,
    "orden": 139,
    "proceso": "45. INDICADORES",
    "aspecto": "3351. La Empresa mide la incidencia de la enfermedad laboral mínimo una vez al año.",
    "planAccion": "Elaborar las estadísticas de incidencia de la enfermedad laboral mínimo una vez al año y teniendo en cuenta el año inmediatamente anterior y su relacion peligro/riesgos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "335. Medición de la incidencia de incidentes, accidentes de trabajo y enfermedad laboral",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Mensual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 39,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por casos nuevos de enfermedada laboral",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 181,
    "orden": 141,
    "proceso": "45. INDICADORES",
    "aspecto": "3361. La empresa mide el ausentismo por enfermedad general y común y por accidente de trabajo mínimo una vez al año.",
    "planAccion": "Garantizar el Diligenciamiento de la matríz de ausentismo general.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE LA SALUD (20%)",
    "porcentajeCategoria": null,
    "estandar": "336. Medición del ausentismo por incidentes, accidentes de trabajo y enfermedad laboral",
    "calificacionEsperada": 1.0,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 40,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Estadísticas del Sgsst",
    "metasEstandar": "Garantizar el manejo estadístico de la información generada por el ausentismo general",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 184,
    "orden": 143,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4111. La Empresa tiene definida y aplica una metodología para la identificación de los peligros y evaluación de los riesgos",
    "planAccion": "Definir metodología para la identificación de peligros y valoración de riesgos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": 30.0,
    "estandar": "411. Metodología para la identificación, evaluación y valoración de peligros",
    "calificacionEsperada": 4.0,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 41,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Metodología para la identificación de peligros y valoración de riesgos",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 185,
    "orden": 144,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4112. La Empresa adopta métodos (procedimiento) para la identificación, prevención, evaluación, valoración y control de los peligros y riesgos de la empresa y participan los trabajadores.",
    "planAccion": "Aplicar la metodología definida para la identificaciónde peligros y valoración de riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "411. Metodología para la identificación, evaluación y valoración de peligros",
    "calificacionEsperada": null,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 41,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Procedimiento",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 186,
    "orden": 145,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4112B. Identificación General de Peligros y/o riesgos por  Cargos.",
    "planAccion": "Documentar los peligros y riesgos propios de las operaciones por cargos",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "411. Metodología para la identificación, evaluación y valoración de peligros",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 41,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento, formato diligenciado",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 189,
    "orden": 147,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4121. Identificación anual de peligros y evaluación y valoración de los riesgos Documentada. (Se cuenta con constancia de acompañamiento de la ARL?)",
    "planAccion": "Actualizar anualmente la identificación de peligros y valoración de riesgos y que en su actualización participen los trabajadores.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "412. Identificación de peligros con participación de todos los niveles de la empresa.",
    "calificacionEsperada": 4.0,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": 6,
    "grupo21": 16,
    "grupo60": 42,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento matríz de peligros. Acta o registro de acompañamiento de la ARL",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 190,
    "orden": 148,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4122. Cuando se presentan eventos catastróficos o mortales los peligros y riesgos asociados con el evento son validados en la matríz de identificación de peligros y riesgos.",
    "planAccion": "Validar si los peligros y riesgos asociados a eventos catastróficos o mortaless están relacionados en la matríz de identificación de peligros y riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "412. Identificación de peligros con participación de todos los niveles de la empresa.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": 6,
    "grupo21": 16,
    "grupo60": 42,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento matríz de peligros y valoración de riesgos",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 191,
    "orden": 149,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4123. La matríz de peligros se elabora de manera participativa (Formato de identificación General de peligros y riesgos por cargos. Con la participación de los trabajadores).",
    "planAccion": "Garantizar que la matríz de peligros y valoración de riesgos se realice de manera participativa.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "412. Identificación de peligros con participación de todos los niveles de la empresa.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional documental elabora el formato y el profesional de intervención implementa su diligenciamiento y manejo en drive",
    "docActualPeriodica": null,
    "grupo7": 6,
    "grupo21": 16,
    "grupo60": 42,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Formato de identificación General de peligros y riesgos por cargos. Con la participación de los trabajadores",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 192,
    "orden": 150,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "41231. Revisión, seguimiento y/o actualización de la matriz de peligros y valoración de riesgos.",
    "planAccion": "Revisar, hacer seguimiento y actualizar la matríz de peligros.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "412. Identificación de peligros con participación de todos los niveles de la empresa.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de gestión documental hara seguimiento a la documemtación de la matriz de riesgos. Validara los cargos.",
    "docActualPeriodica": "Anual",
    "grupo7": 6,
    "grupo21": 16,
    "grupo60": 42,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Matríz de dentificación de peligros actualizada",
    "metasEstandar": "Identificar y valorar el 100% de los factores de riesgo que puedan incidir negativamente en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 195,
    "orden": 152,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4131. La empresa realiza inventario de materias primas e insumos, productos intermedios o finales, subproductos y desechos, sustancias químicas y verifica si estos son o están compuestos por agentes o sustancias catalogadas como carcinógenas en el grupo 1 de la clasificación de la agencia internacional de investigación sobre el cáncer. IARC; o con toxicidad aguda según los criterios del Sistema Globalmente Armonizado (categorias I y II).",
    "planAccion": "Elaborar inventario de sustancias químicas, materias primas e insumos, productos intermedios o finales, subproductos y desechos y validar si están catalogadas como cancerigenas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "413. Identificación y priorización de la naturaleza de los peligros (Metodología adicional - cancerigenos y otros)",
    "calificacionEsperada": 3.0,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 43,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento inventario de materias primas einsumos, productos intermedios o finales, subproductos y desechos, sustancias químicas verificado vs IARC o toxicidad aguda según SGA",
    "metasEstandar": "Garantizar la identificación y análisi de los productos químicos utilizados en los procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 196,
    "orden": 153,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4132. La empresa prioriza y realiza labores de prevención e intervención de sustancias o agentes carcinógenos o con toxicidad aguda.",
    "planAccion": "Priorizar y establecer actividades de prevención e intervención de sustancias o agentes cancerigénos o con toxicidad aguda.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "413. Identificación y priorización de la naturaleza de los peligros (Metodología adicional - cancerigenos y otros)",
    "calificacionEsperada": null,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 43,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registros de intervención. Registros de capacitación y/o entrenamiento",
    "metasEstandar": "Garantizar la identificación y análisi de los productos químicos utilizados en los procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 197,
    "orden": 154,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4133. La Empresa destina áreas o sitios de almacenamiento de las materias primas e insumos y sustancias catalogadas como carcinógenas o con toxicidad aguda",
    "planAccion": "Definir conjuntamente con la empresa los sitios de almacenamiento fijo o temporal de sustancias catalogadas como cancerigenas o con toxicidad aguda.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "413. Identificación y priorización de la naturaleza de los peligros (Metodología adicional - cancerigenos y otros)",
    "calificacionEsperada": null,
    "gestionIntervencion": "x",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención realiza una inspección de las áreas de trabajo y emite un informe relacionado con el manejo de productos químicos.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 43,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Validación insitu del almacenamiento",
    "metasEstandar": "Garantizar la identificación y análisi de los productos químicos utilizados en los procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 200,
    "orden": 156,
    "proceso": "24. COPASST",
    "aspecto": "4141. Informar al COPASST sobre los resultados de las evaluaciones de los ambientes de trabajo.",
    "planAccion": "Remitir los resultados de las mediciones ambientales al Copasst/vigía",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "414. Realización mediciones ambientales, químicos, físicos y biológicos.",
    "calificacionEsperada": 4.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención realiza inspección de los lugares de trabajo y determina si se requiere mediciones ocupacionales, el profesional documental con base en la inspección emite concepto. Se puede generar a través de email.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 44,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Informe sobre los resultados de evaluaciones ocupacionales ambientales. Acta de copasst/vigia",
    "metasEstandar": "Garantizar que el Copasst se encuentre informado sobre aspectos relevantes relacionados con los factores de riesgo higiénicos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 201,
    "orden": 157,
    "proceso": "41. HIGIENE INDUSTRIAL",
    "aspecto": "4142. Realización de mediciones ocupacionales y/o ambientales",
    "planAccion": "Realizar o validar mediciones ambientales ocupacionales con base en los riesgos identificados, validar si aplica la realización de las mediciones.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "414. Realización mediciones ambientales, químicos, físicos y biológicos.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": null,
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 44,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Informe de mediciones realizadas",
    "metasEstandar": "Identificar el 100% de los factores de riesgos higiénicos presentes en los lugares de trabajo",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 204,
    "orden": 159,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4211. Las medidas de prevención y control de los peligros y riesgos se ejecutan acorde con el esquema de jerarquización, priorizando la intervención en la fuente y en el medio.",
    "planAccion": "Jerarquizar y priorizar los peligros y riesgos con el fin ejecutar las medidas de prevención y control establecidas",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "421. Se implementan medidas de prevención y control / peligros",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención debe garantizar estándares, capacitaciones e inspecciones con recomendaciones.",
    "docActualPeriodica": "NA",
    "grupo7": 7,
    "grupo21": null,
    "grupo60": 45,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registros de intervención de peligros y riesgos, Estándares de seguridad. registros de capacitación y entrenamiento.",
    "metasEstandar": "Garantizar la intervención del 100% de los factores de riesgos identificados y valorados",
    "recursosAdministrativos": "Equipos e insumos de oficina, papelería, espacios de trabajo, disponibilidad de tiempo, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 205,
    "orden": 160,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4212. Las medidas de prevención y control de los peligros y riesgos se encuentran programadas en el plan de trabajo anual.",
    "planAccion": "Integrar en el cronograma de actividades las medidas de intervención y control definidos en la matríz de peligros y valoración de riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "421. Se implementan medidas de prevención y control / peligros",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención valida el plan de trabajo y el plan de capacitación en SST. Gestiona las firmas de los documentos",
    "docActualPeriodica": "NA",
    "grupo7": 7,
    "grupo21": null,
    "grupo60": 45,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Plan de trabajo anual, cronograma de actividades",
    "metasEstandar": "Garantizar la intervención del 100% de los factores de riesgos identificados y valorados",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 206,
    "orden": 161,
    "proceso": "8. MATRIZ DE PELIGROS",
    "aspecto": "4213. Las medidas de prevención y control de los peligros y riesgos se toman teniendo en cuenta : Eliminación del peligro/riesgo, Sustitución, Controles de ingeniería, Controles administrativos, Equipos y epp y colectivo",
    "planAccion": "Garantizar que se dé preponderancia a las medidas de prevención y control, respecto de los peligros / riesgos prioritarios",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "421. Se implementan medidas de prevención y control / peligros",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención debe garantizar estándares, capacitaciones e inspecciones con recomendaciones.",
    "docActualPeriodica": "NA",
    "grupo7": 7,
    "grupo21": null,
    "grupo60": 45,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Matríz de identificación de peligros y valoración de riesgos",
    "metasEstandar": "Garantizar la intervención del 100% de los factores de riesgos identificados y valorados",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 209,
    "orden": 163,
    "proceso": "28. ELEMENTOS DE PP",
    "aspecto": "4221. La empresa desarrolla acciones necesarias para que los equipos de seguridad y epp sean utilizados por los trabajadores.",
    "planAccion": "Realizar actividades de capacitación y sensibilización hacie el uso de los equipos de seguridad y EPP.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "422. Se verifica aplicación de las medidas de prevención y control",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención debe garantizar los registros de capacitación, estándares de seguridad, registros de capacitación en uso de epp, evidencia de entrega de epp.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 46,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registro de inspecciones de seguridad, registros de capacitación y entrenamiento",
    "metasEstandar": "Garantizar que el 100% del personal cuente con los EPP  y los equipos requeridos para realizar sus actividades y garantizar su utilización.",
    "recursosAdministrativos": "Equipos e insumos de oficina, logística, disponibilidad de tiempo",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 210,
    "orden": 164,
    "proceso": "19. PARTICIPACION DE LOS TRABAJADORES",
    "aspecto": "4221. Se verifica la aplicación por parte de los trabajadores de las medidas de prevención y control de los peligros/riesgos",
    "planAccion": "Validar soportes documentales donde se verifica el cumplimiento de las responsabillidades de los trabajadores frente a la aplicación de las medidas de prevención y y control de los peligros/riesgos.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "422. Se verifica aplicación de las medidas de prevención y control",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "Evidencia de inspecciones de seguridad y observación de comportamientyos",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 46,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registro de inspecciones de seguridad",
    "metasEstandar": "Garantizar que el 100% del personal cumple con los estándares de seguridad establecidos",
    "recursosAdministrativos": "Equipos e insumos de oficina, logística, disponibilidad de tiempo",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 213,
    "orden": 166,
    "proceso": "37. PROTOCOLOS DE SST",
    "aspecto": "4231. La empresa cuenta con Procedimientos, instructivos internos de seguridad y salud en el trabajo, fichas técnicas para los peligros identificados.",
    "planAccion": "Elaborar procedimientos, instructivos, fichas técnicas cuando aplique y protocolos de seguridad de SST.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "423. Hay procedimientos, instructivos, fichas, protocolos.",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional de intervención define las necesidades de estándares y capacitaciones. El profesional documental elabora los estándares e informa a las partes interesadas.",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 47,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Procedimientos de seguridad. Estándares de seguridad. Procedimientos operativos seguros",
    "metasEstandar": "Documentar los estándares y protocolos de seguridad de las actividades que puedan generar un impacto negativo en la seguridad y salud de los colaboradores",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 216,
    "orden": 168,
    "proceso": "35. INSPECCIONES DE SEGURIDAD",
    "aspecto": "4241. Registro de inspecciones a las instalaciones, maquinas y equipos",
    "planAccion": "Realizar inspección de seguridad a instalaciones, máquinas y equipos. Garantizar la participación del Copasst.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "424. Inspección con el Copasst o vigía.",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención realizará inspecciones de seguridad a instalaciones, máquinas y equipos. Garantizar la participación del Copasst en algunas inspecciones.",
    "docActualPeriodica": "Trimestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 48,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registro de inspecciones de seguridad",
    "metasEstandar": "Involucrar activamente al Copasst en la identificación de peligros y riesgos en las operaciones. Realizar inspecciones programadas con el Copasst.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 217,
    "orden": 169,
    "proceso": "35. INSPECCIONES DE SEGURIDAD",
    "aspecto": "4242. Registro de inspección de todos los equipos relacionados con la prevención y atención de emergencias",
    "planAccion": "Realizar inspección de seguridad a instalaciones, máquinas y equipos relacionados con la prevención y atención de emergencias. garantizar la participación del Copasst / Vigía",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "424. Inspección con el Copasst o vigía.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención realizará inspección a botiquines, extintores, camillas, gabinetes, señalización de emergencias. El profesional de emergencias realizará apoyo especializado.",
    "docActualPeriodica": "Trimestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 48,
    "responsableActividad": "Seguridad y Salud en el trabajo",
    "fundamentosSoportes": "Registro de inspecciones de equipos",
    "metasEstandar": "Involucrar activamente al Copasst en la identificación de peligros y riesgos en las operaciones. Realizar inspecciones programadas con el Copasst.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 218,
    "orden": 170,
    "proceso": "24. COPASST",
    "aspecto": "4243. El comité paritario de seguridad y salud en el trabajo o vigia, participa en las inspecciones de seguridad",
    "planAccion": "Programar a a los miembros del Copasst o al vigia SST a que participen en las inspecciones de seguridad que se realicen.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "424. Inspección con el Copasst o vigía.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención invitará mínimo a un miembro del Copasst o al vigía a participar del proceso de inspección.",
    "docActualPeriodica": "Trimestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 48,
    "responsableActividad": "Copasst o Vigía",
    "fundamentosSoportes": "Actas de copasst, registros de inspecciones de seguridad",
    "metasEstandar": "Involucrar activamente al Copasst en la identificación de peligros y riesgos en las operaciones. Realizar inspecciones programadas con el Copasst.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 221,
    "orden": 172,
    "proceso": "44. MANTENIMIENTO PREVENTIVO Y CORRECTIVO",
    "aspecto": "4251. La empresa realiza mantenimiento de las instalaciones, equipos, herramientas de acuerdo con los informes de inspección y con base a los manuales de uso.",
    "planAccion": "Validar la planeación de mantenimeinto a equipos, instalaciones y herramientas al área encargada del mantenimiento.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "425. Mantenimiento periódico de instalaciones, equipos máquinas y herramientas",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional de intervención solicitará por email a la empresa el plan de mantenimiento de instalaciones y equipos o la descripción de como se realiza.",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": 17,
    "grupo60": 49,
    "responsableActividad": "Gerencia, área de mantenimiento",
    "fundamentosSoportes": "Informe de inspecciones de seguridad. Documentación de mejoras. Soporte de gastos realizados en las mejoras",
    "metasEstandar": "Garantizar el óptimo funcionamiento de los equipos, herramientas e instalaciones",
    "recursosAdministrativos": "Lógística, personal, insumos, equipos, epp",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 224,
    "orden": 174,
    "proceso": "28. ELEMENTOS DE PP",
    "aspecto": "4261. La Empresa entrega y Registra la entrega y reposición de equipos y elementos de protección personal. (Sin ningún costo para el trabajador)",
    "planAccion": "Garantizar la entrega y reposición de los EPP a los trabajadores.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "426. Entrega de elementos de protección personal. EPP, Se verifica con contratistas y subcontratistas.",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de intervención socializará el formato de entrega de epp y realizará seguimiento a su actualización.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 18,
    "grupo60": 50,
    "responsableActividad": "Seguridad y Salud en el trabajo, Jefe inmediato del trabajador",
    "fundamentosSoportes": "Registro de entrega de elementos de protección personal",
    "metasEstandar": "Garantizar la entrega al 100% del personal que requiera elementos de protección personal con base a las características de los riesgos",
    "recursosAdministrativos": "Equipos e insumos de oficina, epp, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 225,
    "orden": 175,
    "proceso": "28. ELEMENTOS DE PP",
    "aspecto": "4262. Se verifica que los contratistas y subcontratistas que realizan actividades en la empresa se les entrega y reponen los EPP.",
    "planAccion": "Verificar que los contratsitas y subcontratsitas que realizan labores en la empresa se les entregan y reponen oportunamente los EPP:",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "426. Entrega de elementos de protección personal. EPP, Se verifica con contratistas y subcontratistas.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional solicitará a los contratsitas y subcontratistas evidencia de la entrega de los EPP a sus trabajadores.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 18,
    "grupo60": 50,
    "responsableActividad": "Seguridad y Salud en el trabajo, Jefe inmediato del trabajador",
    "fundamentosSoportes": "Registro de entrega de elementos de protección personal de contratistas.",
    "metasEstandar": "Garantizar la entrega al 100% del personal que requiera elementos de protección personal con base a las características de los riesgos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 226,
    "orden": 176,
    "proceso": "14. PLAN DE CAPACITACION EN SST",
    "aspecto": "4263. Capacitación  en Uso y cuidados de elementos de protección personal",
    "planAccion": "Capacitar al personal en el uso y cuidados de los Elementos de protección personal",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTIÓN DE PELIGROS Y RIESGOS (30%)",
    "porcentajeCategoria": null,
    "estandar": "426. Entrega de elementos de protección personal. EPP, Se verifica con contratistas y subcontratistas.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención debe garantizar la capacitación del perosnal en uso y cuidados de epp.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 18,
    "grupo60": 50,
    "responsableActividad": "Seguridad y Salud en el trabajo, Jefe inmediato del trabajador",
    "fundamentosSoportes": "Registro de capacitación y entrenamiento en uso y cuidado de elementos de protección personal",
    "metasEstandar": "Garantizar que el 100% del personal que utiliza o requiere elementos de protección personal conozca sobre las ventajas, usos y cuidados de los EPP",
    "recursosAdministrativos": "Espacios de trabajo, disponibilidad de tiempos, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 229,
    "orden": 178,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5111. Planes de prevención, preparación y respuesta ante emergencias (Plan de Emergencias)",
    "planAccion": "Recolectar información, diseñar y Documentar el plan de prevención y respuesta ante emergencias.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": 10.0,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": 5.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional documental solicita al profesional de emergencias la elaboración del plan de emergencias para empresas nuevas. Para actualizaciones el profesional documental solicitara información al profesional de intervencion para validar si es pertinente o no la actualización.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Documento plan de emergencias",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 230,
    "orden": 179,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5112. La empresa cuenta con planos de las instalaciones que identifican áreas y salidas de emergencia.",
    "planAccion": "Elaborar los planos de las instalaciones donde se identifiquen las áreas y salidas de Emergencias.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional de intervención en informe de inspección identifica si la empresa cuenta con los planos de evacuación de las instalaciones y señalización  de emergencias. Puede ser informe por email enviado a contacto de la empresa y Gerencia con copia a profesional Documental",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Documento planos de evacuación visibles en los sitios de trabajo",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 231,
    "orden": 180,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5113. La Empresa cuenta con señalización de las áreas en caso de emergencias.",
    "planAccion": "Realizar inventario de necesidades de señalización y garantizar la señalización de las instalaciones de la empresa.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional en inspección de señalización identifica si se cuenta con señalización de emergencias, se elabora informe el cual puede ser enviado por email, con copia al profesional documental. Para casos especiales se solicitará apoyo al profesional de emergencias",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Verificación isitu de la señalización y demarcación de áreas",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 232,
    "orden": 181,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "51131. Inspección para señalización de seguridad y/o emergencias",
    "planAccion": "Programar, ejecutar y evidenciar inspección de necesidades de señalización.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Cada 3 meses",
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Informe de inspección",
    "metasEstandar": "Garantizar la señalización relacioada con Emergencias de las instalaciones de la empresa",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 233,
    "orden": 182,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5114. Simulacros como mínimo una vez al año con la participación de todos los trabajadores",
    "planAccion": "Realizar simulacro de emergencias mínimo una vez al año",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional de emergencias solicita a la empresa y al profesional de intervención posible fecha de realización de simulacros, se informan fechas a los profesionales de emergencias. SE propone realizar simualcrios en Marzo, Junio. El profesional de emergencias enviará informe al profesional documental.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Registro. Simulacro de emergencia anual.",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Espacios de trabajo, disponibilidad de tiempos, logística, equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 234,
    "orden": 183,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5115. Se cuenta con registro de divulgación de los resultados de los Simulacros de Emergencia.",
    "planAccion": "Socializar los resultados del simulacro al personal y garantizar el registro de la actividad",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional documental realizará la socialización de los resultados del simulacro inmediatamente después de realizar el simulavcro, dejando documentado la socializaciónnen un formato de registro de asistencia a capacitación. El registro será enviado al profesional documental.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Registro de capacitación y/o entrenamiento",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 235,
    "orden": 184,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5116. Las mejoras son tenidas en cuenta en el plan de mejoramiento del plan de emergencias.",
    "planAccion": "Elaborar plan de mejoramiento del plan de emergencias y realizar seguimiento.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "511. Se cuenta con el plan de prevención y preparación ante Emergencias",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": "NA",
    "ejecucion": "Con base en el informe de evacuación el profesional de emergencias y el profesional documental definen si se requiere actualización del plan de emergencias, se elaborará email informando si se requiere o no actualización con base en el informe de evacuación.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 19,
    "grupo60": 51,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Documentación de mejoras realizadas. Soporte de pagos realizados.",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 238,
    "orden": 186,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5121. Registro de conformación de la Brigada de Emergencias",
    "planAccion": "Conformar la brigada de emergencias y formalizar registro de conformación.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "512. Brigada de Prevención conformada, capacitada y dotada.",
    "calificacionEsperada": 5.0,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional de emergencias en su primera visita define el listado de brigadistas. Para las empresas antiguas se solicitará al contacto de la empresa la actualización el listado de brigadistas con apoyo del profesional de intervención.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 20,
    "grupo60": 52,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Registro. Formato conformación brigada de emergencias.",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 239,
    "orden": 187,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5122. Plan de capacitación para la brigada de Emergencias",
    "planAccion": "Documentar el plan de capacitación de la brigada de Emergencias.",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "512. Brigada de Prevención conformada, capacitada y dotada.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional documental elabora el documento y lo envia por email a las partes interesadas.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 20,
    "grupo60": 52,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Documento. Plan de capacitación de la brigada de Emergencias",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 240,
    "orden": 188,
    "proceso": "29. EMERGENCIAS",
    "aspecto": "5123. Capacitación, entrenamiento y dotación de la brigada de emergencias",
    "planAccion": "Capacitar a la brigada de Emergencias",
    "informeEstadoTareas": "x",
    "cicloPhva": "HACER (60%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "GESTION DE AMENAZAS (10%)",
    "porcentajeCategoria": null,
    "estandar": "512. Brigada de Prevención conformada, capacitada y dotada.",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": "X",
    "documentosEvergreen": null,
    "ejecucion": "El profesional de emergencias define las actividades a realizar en el año y los posibles meses de realización, el profesional documental solita posibles fechas a la empresa y las programa con el profesional de emergencias.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": 20,
    "grupo60": 52,
    "responsableActividad": "Seguridad y salud en el trabajo, brigadistas",
    "fundamentosSoportes": "Registro de capacitación y entrenamiento de la brigada de Emergencias. Registro de entrega de dotación de la brigada.",
    "metasEstandar": "Implementar y mantener el Plan de emergencias, ejecutando las tareas del plan, actualizando el documento, formando la brigada y realizando los simulacros respectivos.",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": "X"
  },
  {
    "excelRow": 243,
    "orden": 190,
    "proceso": "45. INDICADORES",
    "aspecto": "6111. La Empresa tiene definidos los Indicadores del Sistema de Gestión de la Seguridad y Salud en el trabajo (Estructura, Proceso y Resultado)",
    "planAccion": "Definir y documentar los indicadores de Estructura, proceso y resultado.",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": 5.0,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": 5.0,
    "estandar": "611. Indicadores estructura, proceso y resultado",
    "calificacionEsperada": 1.25,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": "El profesional documental elabora el documento con los indicadores y los envia a las partes interesadas. El profesional de intervención documentará de manera periódica los indicadores.",
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 53,
    "responsableActividad": "Seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Indicadores del Sistema de gestión de la seguridad y salud en el trabajo",
    "metasEstandar": "Garantizar que el 100% de los indicadores relevantes del sistema de gestión se encuentren definidos y evaluados",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 246,
    "orden": 192,
    "proceso": "48. AUDITORIAS",
    "aspecto": "6121. La empresa cuenta con un programa de auditorias, el cual contiene idoneidad de la persona que audita, alcance de la auditoría, la periodicidad, la metodología y la presentación de informes.",
    "planAccion": "Elaborar el programa de auditorias que cumpla con los requsitos establecidos en la norma.",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "612. La Empresa adelanta auditoria por lo menos una vez al año",
    "calificacionEsperada": 1.25,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "Bloque 3",
    "ejecucion": null,
    "docActualPeriodica": null,
    "grupo7": null,
    "grupo21": null,
    "grupo60": 54,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Programa de auditorias",
    "metasEstandar": "Garantizar que el SG-SST cuente con un plan de auditorias que permita evaluar cada uno de sus procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 247,
    "orden": 193,
    "proceso": "48. AUDITORIAS",
    "aspecto": "6122. Planificación anual de auditorías al SGSST, con la participación del Copasst/Vigía. En cronograma de actividades.",
    "planAccion": "Realizar la planificación de las auditorias del SG-SST con la participación del Copastt o el vigía de SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "612. La Empresa adelanta auditoria por lo menos una vez al año",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El Profesional de gestión a la intervención realizará la programación de la auditoría anual del SGSST.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 54,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Plan de auditorias",
    "metasEstandar": "Garantizar que el SG-SST cuente con un plan de auditorias que permita evaluar cada uno de sus procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 248,
    "orden": 194,
    "proceso": "48. AUDITORIAS",
    "aspecto": "6123. La Empresa realiza una Auditoria anual al cumplimiento del SGSST.",
    "planAccion": "Realizar auditoria al SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "612. La Empresa adelanta auditoria por lo menos una vez al año",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de gestión documental realiza la auditoría con las partes interesadas y prepara el informe de auditoría.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 54,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento. Informe de auditorias",
    "metasEstandar": "Garantizar que el SG-SST cuente con un plan de auditorias que permita evaluar cada uno de sus procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 249,
    "orden": 195,
    "proceso": "48. AUDITORIAS",
    "aspecto": "6124. Comunicación de los informes o resultados de las auditorias a los responsables de adelantar las medidas preventivas, correctivas o de mejora.",
    "planAccion": "Elaborar los informes de auditorias y comunicar los resultados a las partes interesadas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "612. La Empresa adelanta auditoria por lo menos una vez al año",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención socializará los resultados de la auditoría a las partes interesadas y dejará evidencia en acta de reunión.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 54,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Acta o registro de comunicación a partes interesadas.",
    "metasEstandar": "Garantizar que el SG-SST cuente con un plan de auditorias que permita evaluar cada uno de sus procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina, espacios de trabajo, logística.",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 252,
    "orden": 197,
    "proceso": "48. AUDITORIAS",
    "aspecto": "6131. El proceso de auditoría abarca los aspectos descritos en el art 2.2.4.6.30 del Decreto 1072 de 2015",
    "planAccion": "Garantizar que el alcance de la auditoría abarque los 13 aspectos que describe el art. 2.2.4.6.30 del Decreto 1072 de 2015.",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "613. Revisión anual por la alta dirección, resultados y alcance de la auditoria",
    "calificacionEsperada": 1.25,
    "gestionIntervencion": null,
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": "NA",
    "ejecucion": "El profesional de gestión documental elaborada la docunentación, plan de auditorias y lista de chequeo alineada con el Decreto 1072 de 2015.",
    "docActualPeriodica": "NA",
    "grupo7": null,
    "grupo21": 21,
    "grupo60": 55,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento programa de auditoria del Sgsst",
    "metasEstandar": "Garantizar que el SG-SST cuente con un plan de auditorias que permita evaluar cada uno de sus procesos",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 255,
    "orden": 199,
    "proceso": "50. REVISION POR LA ALTA DIRECCION",
    "aspecto": "6141. Revisión del  SGSST por la alta dirección de la empresa mínimo una vez al año.",
    "planAccion": "Validar la revisión mínimo una vez al año del SG-SST por parte de la Alta Dirección",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "614. Planificación auditorias con el Copasst/Vigía",
    "calificacionEsperada": 1.25,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención se reunirá con la alta dirección para socializar y revisar los resultados de la auditoría. De esta reunión se elabora acta que soporta la revisión por la alta dirección",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 56,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Acta o registro de revisión del SGSST por la alta Gerencia",
    "metasEstandar": "Garantizar que la alta dirección revise y evalue el SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 256,
    "orden": 200,
    "proceso": "50. REVISION POR LA ALTA DIRECCION",
    "aspecto": "6142. Divulgación de los resultados de la revisión del SGSST al COPASST - Vigía y al responsable del SGSST",
    "planAccion": "Verificar que la Alta Dirección comunica los resultados de la revisión del SG-SST al Copasst/vigía y al responsable del SG-SST",
    "informeEstadoTareas": "x",
    "cicloPhva": "VERIFICAR ( 5%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "VERIFICACIÓN DEL SG-SST (5%)",
    "porcentajeCategoria": null,
    "estandar": "614. Planificación auditorias con el Copasst/Vigía",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": null,
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": "El profesional de intervención en reunión de copasst puede socializar resultados y dejar evidencia en actas o realizar envio por email y dejar evidencia.",
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 56,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Acta de Copasst - Vigía",
    "metasEstandar": "Dar a conocer al 100% de las partes interesadas los avances del SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 259,
    "orden": 202,
    "proceso": "49. ACCIONES PREVENTIVAS Y CORRECTIVAS",
    "aspecto": "7111. La Empresa define y documenta las Acciones preventivas y correctivas del SGSST con base en los resultados de la supervisión y medición de la eficacia del SG-SST, de las auditorias y de la revisión por la alta gerencia.",
    "planAccion": "Garantizar la ejecución e implementación de las acciones preventivas y/o correctivas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "ACTUAR (10%)",
    "porcentajeCiclo": 10.0,
    "categoriaEstandar": "MEJORAMIENTO (10%)",
    "porcentajeCategoria": 10.0,
    "estandar": "711. Definir acciones de promoción y prevención con base en resultados del SG-SST",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 57,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento, acciones preventivas y correctivas",
    "metasEstandar": "Garantizar la intervención y mejora de las desviaciones encontradas en el desarrollo del SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 260,
    "orden": 203,
    "proceso": "49. ACCIONES PREVENTIVAS Y CORRECTIVAS",
    "aspecto": "7112. Matríz de seguimiento a recomendaciones",
    "planAccion": "Evidenciar el seguimiento de las acciones correctivas y preventivas generadas en el proceso de auditoria.",
    "informeEstadoTareas": "x",
    "cicloPhva": "ACTUAR (10%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "MEJORAMIENTO (10%)",
    "porcentajeCategoria": null,
    "estandar": "711. Definir acciones de promoción y prevención con base en resultados del SG-SST",
    "calificacionEsperada": null,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 57,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documento matríz de seguimiento a recomendaciones",
    "metasEstandar": "Garantizar la intervención y mejora de las desviaciones encontradas en el desarrollo del SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 263,
    "orden": 205,
    "proceso": "49. ACCIONES PREVENTIVAS Y CORRECTIVAS",
    "aspecto": "7121. Ejecución y documentación de mejoras o registros de gestión de los riesgos",
    "planAccion": "Ejecución, seguimiento y documentación de las acciones correctivas, preventivas y/o de mejora detectadas por la Alta Dirección.",
    "informeEstadoTareas": "x",
    "cicloPhva": "ACTUAR (10%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "MEJORAMIENTO (10%)",
    "porcentajeCategoria": null,
    "estandar": "712. Toma de medidas correctivas, preventivas y de mejora.",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Anual",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 58,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Documentación de mejoras. Soporte de pagos e inversiones. Ejecución de actividades.",
    "metasEstandar": "Garantizar la intervención y mejora de las desviaciones encontradas en el desarrollo del SG-SST",
    "recursosAdministrativos": "Equipos, insumos, personal, herramientas, epp",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 266,
    "orden": 207,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "7131. La Empresa implementa el registro del seguimiento realizado a las acciones ejecutadas a partir de cada investigación de accidente, incidente de trabajo o enfermedad laboral ocurrido en la empresa.",
    "planAccion": "Implementar y documentar las acciones preventivas, correctivas y/o de mejora planteados como resultado de las investigaciones y verificar si han sido efectivas.",
    "informeEstadoTareas": "x",
    "cicloPhva": "ACTUAR (10%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "MEJORAMIENTO (10%)",
    "porcentajeCategoria": null,
    "estandar": "713. Ejecución de acciones preventivas, correctivas y de mejora de la investigación de incidentes, accidentes de trabajo y enfermedad laboral",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Semestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 59,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registro. Seguimiento a recomendaciones.",
    "metasEstandar": "Garantizar la intervención y mejora de las desviaciones encontradas en el desarrollo del SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  },
  {
    "excelRow": 269,
    "orden": 209,
    "proceso": "23. INVESTIGACION DE AT",
    "aspecto": "7141. La empresa Implementa las medidas y acciones correctivas que, como producto de la investigación, recomienden el COPASST o Vigía; las autoridades administrativas laborales y ambientales; así como la ARL a la que se encuentra afiliado.",
    "planAccion": "Implementar y registrar los requerimientos o recomendaciones de las autoridades administrativas así como de las ARL.",
    "informeEstadoTareas": "x",
    "cicloPhva": "ACTUAR (10%)",
    "porcentajeCiclo": null,
    "categoriaEstandar": "MEJORAMIENTO (10%)",
    "porcentajeCategoria": null,
    "estandar": "714. Implementar medidas y acciones correctivas de autoridades y ARL",
    "calificacionEsperada": 2.5,
    "gestionIntervencion": "X",
    "gestionDocumental": "X",
    "gestionEmergencias": null,
    "documentosEvergreen": null,
    "ejecucion": null,
    "docActualPeriodica": "Semestral",
    "grupo7": null,
    "grupo21": null,
    "grupo60": 60,
    "responsableActividad": "Gerencia y seguridad y salud en el trabajo",
    "fundamentosSoportes": "Registro. Seguimiento a recomendaciones.",
    "metasEstandar": "Garantizar la intervención y mejora de las desviaciones encontradas en el desarrollo del SG-SST",
    "recursosAdministrativos": "Equipos e insumos de oficina, logística",
    "palabrasClave": null,
    "tareaEjecucionCotidiana": null
  }
];

const NOMBRE_VERSION =
  process.env.SUPERMATRIZ_SEED_VERSION_NAME?.trim() ||
  "Supermatriz SIS - Excel maestro";

const RECREAR_VERSION =
  process.env.SUPERMATRIZ_SEED_RECREATE !== "false";

type GrupoCodigo = CodigoGrupoMinisterial;

type PeriodicidadPreparada = {
  cantidad: number | null;
  unidad: UnidadPeriodicidad | null;
  descripcionRegla: string | null;
  documentoActualizacionPeriodica: boolean;
};

type FilaPreparada = FilaFuente & {
  procesoCodigo: string;
  procesoNombre: string;
  aspectoCodigoOriginal: string;
  aspectoCodigo: string;
  aspectoNombreCompleto: string;
  aspectoNombre: string;
  estandarCodigo: string;
  estandarNombre: string;
  cicloCodigo: string;
  cicloNombre: string;
  cicloPorcentaje: number;
  categoriaCodigo: string;
  categoriaNombre: string;
  categoriaPorcentaje: number;
  grupos: GrupoCodigo[];
  categoriasGestion: CodigoCategoriaGestion[];
  periodicidad: PeriodicidadPreparada;
  esEvergreen: boolean;
  bloqueEvergreen: BloqueEvergreen | null;
  esTareaCotidiana: boolean;
};

function texto(valor: string | null | undefined): string {
  return (valor ?? "").trim();
}

function esX(valor: string | null | undefined): boolean {
  return texto(valor).toLowerCase() === "x";
}

function esNumeroMarcador(
  valor: number | null
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isFinite(valor)
  );
}

function separarCodigo(
  valor: string,
  etiqueta: string
): {
  codigo: string;
  nombre: string;
} {
  const coincidencia = valor
    .trim()
    .match(/^([0-9]+)\s*[\.\-:]?\s*(.+)$/s);

  if (!coincidencia) {
    throw new Error(
      `${etiqueta} no tiene código numérico reconocible: "${valor}".`
    );
  }

  return {
    codigo: coincidencia[1],
    nombre: coincidencia[2].trim(),
  };
}

function quitarCalificacionFinal(
  nombre: string
): string {
  return nombre
    .replace(
      /\s*\(\s*[0-9]+(?:[.,][0-9]+)?\s*\)\s*$/u,
      ""
    )
    .trim();
}

function separarNombrePorcentaje(
  valor: string,
  etiqueta: string
): {
  nombre: string;
  porcentaje: number;
} {
  const coincidencia = valor
    .trim()
    .match(
      /^(.*?)\s*\(\s*([0-9]+(?:[.,][0-9]+)?)\s*%\s*\)\s*$/u
    );

  if (!coincidencia) {
    throw new Error(
      `${etiqueta} no contiene un porcentaje reconocible: "${valor}".`
    );
  }

  return {
    nombre: coincidencia[1].trim(),
    porcentaje: Number(
      coincidencia[2].replace(",", ".")
    ),
  };
}

function codigoSlug(valor: string): string {
  const codigo = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!codigo) {
    throw new Error(
      `No fue posible generar código para "${valor}".`
    );
  }

  return codigo.slice(0, 50);
}

function recortarEnPalabra(
  valor: string,
  limite: number
): string {
  if (valor.length <= limite) {
    return valor;
  }

  const porcion = valor.slice(
    0,
    Math.max(1, limite - 1)
  );

  const ultimoEspacio =
    porcion.lastIndexOf(" ");

  const base =
    ultimoEspacio >= Math.floor(limite * 0.65)
      ? porcion.slice(0, ultimoEspacio)
      : porcion;

  return `${base.trim()}…`;
}

function fragmentarTexto(
  valor: string,
  limite: number
): string[] {
  const limpio = valor.trim();

  if (!limpio) {
    return [];
  }

  if (limpio.length <= limite) {
    return [limpio];
  }

  const resultado: string[] = [];
  let restante = limpio;

  while (restante.length > limite) {
    const porcion = restante.slice(0, limite + 1);
    const candidatos = [
      porcion.lastIndexOf(". "),
      porcion.lastIndexOf("; "),
      porcion.lastIndexOf(", "),
      porcion.lastIndexOf(" "),
    ];

    const corte =
      candidatos.find(
        (indice) =>
          indice >= Math.floor(limite * 0.55)
      ) ?? limite;

    const fragmento = restante
      .slice(0, corte)
      .replace(/[.,;:\s]+$/u, "")
      .trim();

    if (fragmento) {
      resultado.push(fragmento);
    }

    restante = restante
      .slice(corte)
      .replace(/^[.,;:\s]+/u, "")
      .trim();
  }

  if (restante) {
    resultado.push(restante);
  }

  return resultado;
}

function prepararPalabrasClave(
  valor: string | null
): string[] {
  const limpio = texto(valor);

  if (!limpio) {
    return [];
  }

  const partes = limpio
    .split(/\n|;/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) =>
      fragmentarTexto(item, 100)
    );

  return [...new Set(partes)];
}

function prepararPeriodicidad(
  valor: string | null
): PeriodicidadPreparada {
  const original = texto(valor);

  if (!original || original.toUpperCase() === "NA") {
    return {
      cantidad: null,
      unidad: null,
      documentoActualizacionPeriodica: false,
      descripcionRegla:
        original.toUpperCase() === "NA"
          ? "Valor original del Excel: NA. El sistema conserva la revisión anual por defecto."
          : "Sin periodicidad explícita en el Excel. El sistema conserva la revisión anual por defecto.",
    };
  }

  const normalizado = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const equivalencias: Record<
    string,
    {
      cantidad: number;
      unidad: UnidadPeriodicidad;
    }
  > = {
    anual: {
      cantidad: 1,
      unidad: UnidadPeriodicidad.ANIO,
    },
    semestral: {
      cantidad: 6,
      unidad: UnidadPeriodicidad.MES,
    },
    trimestral: {
      cantidad: 3,
      unidad: UnidadPeriodicidad.MES,
    },
    cuatrimestral: {
      cantidad: 4,
      unidad: UnidadPeriodicidad.MES,
    },
    mensual: {
      cantidad: 1,
      unidad: UnidadPeriodicidad.MES,
    },
    "cada 3 meses": {
      cantidad: 3,
      unidad: UnidadPeriodicidad.MES,
    },
    "cada 2 anos": {
      cantidad: 2,
      unidad: UnidadPeriodicidad.ANIO,
    },
    "cada 3 anos": {
      cantidad: 3,
      unidad: UnidadPeriodicidad.ANIO,
    },
  };

  const encontrada =
    equivalencias[normalizado];

  if (!encontrada) {
    throw new Error(
      `Periodicidad no reconocida: "${original}".`
    );
  }

  return {
    ...encontrada,
    documentoActualizacionPeriodica: true,
    descripcionRegla: `Periodicidad original del Excel: ${original}.`,
  };
}

function prepararEvergreen(
  valor: string | null
): {
  esEvergreen: boolean;
  bloqueEvergreen: BloqueEvergreen | null;
} {
  const original = texto(valor).toLowerCase();

  if (
    !original ||
    original === "na"
  ) {
    return {
      esEvergreen: false,
      bloqueEvergreen: null,
    };
  }

  const mapa: Record<
    string,
    BloqueEvergreen
  > = {
    "bloque 1":
      BloqueEvergreen.PRIMER_CUATRIMESTRE,
    "bloque 2":
      BloqueEvergreen.SEGUNDO_CUATRIMESTRE,
    "bloque 3":
      BloqueEvergreen.TERCER_CUATRIMESTRE,
  };

  const bloque = mapa[original];

  if (!bloque) {
    throw new Error(
      `Bloque Evergreen no reconocido: "${valor}".`
    );
  }

  return {
    esEvergreen: true,
    bloqueEvergreen: bloque,
  };
}

function gruposDeFila(
  fila: FilaFuente
): GrupoCodigo[] {
  const grupos: GrupoCodigo[] = [];

  /**
   * En el Excel, las columnas 7, 21 y 60 no contienen
   * únicamente el valor 1. Contienen el número ordinal
   * del estándar dentro de cada grupo: 1...7, 1...21
   * y 1...60. Por eso cualquier número indica pertenencia.
   */
  if (esNumeroMarcador(fila.grupo7)) {
    grupos.push(
      CodigoGrupoMinisterial.ESTANDARES_7
    );
  }

  if (esNumeroMarcador(fila.grupo21)) {
    grupos.push(
      CodigoGrupoMinisterial.ESTANDARES_21
    );
  }

  if (esNumeroMarcador(fila.grupo60)) {
    grupos.push(
      CodigoGrupoMinisterial.ESTANDARES_60
    );
  }

  return grupos;
}

function categoriasGestionDeFila(
  fila: FilaFuente
): CodigoCategoriaGestion[] {
  const categorias: CodigoCategoriaGestion[] =
    [];

  if (esX(fila.gestionIntervencion)) {
    categorias.push(
      CodigoCategoriaGestion.INTERVENCION
    );
  }

  if (esX(fila.gestionDocumental)) {
    categorias.push(
      CodigoCategoriaGestion.DOCUMENTAL
    );
  }

  if (esX(fila.gestionEmergencias)) {
    categorias.push(
      CodigoCategoriaGestion.EMERGENCIAS
    );
  }

  return categorias;
}

function prepararFilas(): FilaPreparada[] {
  const aparicionesCodigoAspecto =
    new Map<string, number>();

  const calificacionPorEstandar =
    new Map<string, number>();

  for (const fila of FILAS_EXCEL) {
    const estandar = separarCodigo(
      fila.estandar,
      `Estándar de la fila Excel ${fila.excelRow}`
    );

    if (
      fila.calificacionEsperada !== null
    ) {
      const anterior =
        calificacionPorEstandar.get(
          estandar.codigo
        );

      if (
        anterior !== undefined &&
        Math.abs(
          anterior -
            fila.calificacionEsperada
        ) > 0.0001
      ) {
        throw new Error(
          `Calificación inconsistente en el estándar ${estandar.codigo}.`
        );
      }

      calificacionPorEstandar.set(
        estandar.codigo,
        fila.calificacionEsperada
      );
    }
  }

  return FILAS_EXCEL.map((fila) => {
    const proceso = separarCodigo(
      fila.proceso,
      `Proceso de la fila Excel ${fila.excelRow}`
    );

    const aspecto = separarCodigo(
      fila.aspecto,
      `Aspecto de la fila Excel ${fila.excelRow}`
    );

    const estandar = separarCodigo(
      fila.estandar,
      `Estándar de la fila Excel ${fila.excelRow}`
    );

    const calificacionEsperada =
      calificacionPorEstandar.get(
        estandar.codigo
      );

    if (
      calificacionEsperada === undefined
    ) {
      throw new Error(
        `No se encontró calificación esperada para el estándar ${estandar.codigo}.`
      );
    }

    const ciclo = separarNombrePorcentaje(
      fila.cicloPhva,
      `Ciclo de la fila Excel ${fila.excelRow}`
    );

    const categoria =
      separarNombrePorcentaje(
        fila.categoriaEstandar,
        `Categoría de la fila Excel ${fila.excelRow}`
      );

    const aparicion =
      (aparicionesCodigoAspecto.get(
        aspecto.codigo
      ) ?? 0) + 1;

    aparicionesCodigoAspecto.set(
      aspecto.codigo,
      aparicion
    );

    const codigoAspecto =
      aparicion === 1
        ? aspecto.codigo
        : `${aspecto.codigo}-${String.fromCharCode(
            63 + aparicion
          )}`;

    const evergreen =
      prepararEvergreen(
        fila.documentosEvergreen
      );

    return {
      ...fila,
      calificacionEsperada,
      procesoCodigo: proceso.codigo,
      procesoNombre: proceso.nombre,
      aspectoCodigoOriginal:
        aspecto.codigo,
      aspectoCodigo: codigoAspecto,
      aspectoNombreCompleto:
        aspecto.nombre,
      aspectoNombre: recortarEnPalabra(
        aspecto.nombre,
        191
      ),
      estandarCodigo:
        estandar.codigo,
      estandarNombre:
        quitarCalificacionFinal(
          estandar.nombre
        ),
      cicloCodigo: codigoSlug(
        ciclo.nombre
      ),
      cicloNombre: ciclo.nombre,
      cicloPorcentaje:
        ciclo.porcentaje,
      categoriaCodigo:
        codigoSlug(
          categoria.nombre
        ),
      categoriaNombre:
        categoria.nombre,
      categoriaPorcentaje:
        categoria.porcentaje,
      grupos: gruposDeFila(fila),
      categoriasGestion:
        categoriasGestionDeFila(fila),
      periodicidad:
        prepararPeriodicidad(
          fila.docActualPeriodica
        ),
      esEvergreen:
        evergreen.esEvergreen,
      bloqueEvergreen:
        evergreen.bloqueEvergreen,
      esTareaCotidiana:
        esX(
          fila.tareaEjecucionCotidiana
        ),
    };
  });
}

function validarDatos(
  filas: FilaPreparada[]
): void {
  const ciclos = new Set(
    filas.map(
      (fila) => fila.cicloCodigo
    )
  );

  const categorias = new Set(
    filas.map(
      (fila) =>
        `${fila.cicloCodigo}|${fila.categoriaCodigo}`
    )
  );

  const estandares = new Map<
    string,
    {
      grupos: Set<GrupoCodigo>;
      calificacion: number;
    }
  >();

  const procesos = new Set(
    filas.map(
      (fila) => fila.procesoCodigo
    )
  );

  const codigosAspecto = new Set<string>();
  const relaciones =
    new Set<string>();

  for (const fila of filas) {
    if (
      fila.categoriasGestion.length === 0
    ) {
      throw new Error(
        `La fila Excel ${fila.excelRow} no tiene categoría de gestión.`
      );
    }

    if (
      fila.calificacionEsperada === null
    ) {
      throw new Error(
        `El estándar ${fila.estandarCodigo} no tiene calificación esperada en la fila Excel ${fila.excelRow}.`
      );
    }

    if (
      codigosAspecto.has(
        fila.aspectoCodigo
      )
    ) {
      throw new Error(
        `Código de aspecto duplicado después de normalizar: ${fila.aspectoCodigo}.`
      );
    }

    codigosAspecto.add(
      fila.aspectoCodigo
    );

    const relacion =
      `${fila.aspectoCodigo}|${fila.procesoCodigo}`;

    if (relaciones.has(relacion)) {
      throw new Error(
        `Relación aspecto-proceso repetida: ${relacion}.`
      );
    }

    relaciones.add(relacion);

    const actual =
      estandares.get(
        fila.estandarCodigo
      ) ?? {
        grupos: new Set<GrupoCodigo>(),
        calificacion:
          fila.calificacionEsperada,
      };

    if (
      Math.abs(
        actual.calificacion -
          fila.calificacionEsperada
      ) > 0.0001
    ) {
      throw new Error(
        `Calificación inconsistente en el estándar ${fila.estandarCodigo}.`
      );
    }

    for (const grupo of fila.grupos) {
      actual.grupos.add(grupo);
    }

    estandares.set(
      fila.estandarCodigo,
      actual
    );
  }

  const conteosEsperados = {
    filas: 149,
    ciclos: 4,
    categorias: 7,
    estandares: 60,
    procesos: 43,
  };

  const conteosReales = {
    filas: filas.length,
    ciclos: ciclos.size,
    categorias: categorias.size,
    estandares: estandares.size,
    procesos: procesos.size,
  };

  for (
    const [
      clave,
      esperado,
    ] of Object.entries(
      conteosEsperados
    )
  ) {
    const real =
      conteosReales[
        clave as keyof typeof conteosReales
      ];

    if (real !== esperado) {
      throw new Error(
        `Validación fallida: ${clave}=${real}; se esperaban ${esperado}.`
      );
    }
  }

  const conteoGrupos: Record<
    GrupoCodigo,
    number
  > = {
    [CodigoGrupoMinisterial.ESTANDARES_7]:
      0,
    [CodigoGrupoMinisterial.ESTANDARES_21]:
      0,
    [CodigoGrupoMinisterial.ESTANDARES_60]:
      0,
  };

  for (
    const estandar of estandares.values()
  ) {
    if (estandar.grupos.size === 0) {
      throw new Error(
        "Existe un estándar sin clasificación 7/21/60."
      );
    }

    for (const grupo of estandar.grupos) {
      conteoGrupos[grupo] += 1;
    }
  }

  if (
    conteoGrupos[
      CodigoGrupoMinisterial.ESTANDARES_7
    ] !== 7 ||
    conteoGrupos[
      CodigoGrupoMinisterial.ESTANDARES_21
    ] !== 21 ||
    conteoGrupos[
      CodigoGrupoMinisterial.ESTANDARES_60
    ] !== 60
  ) {
    throw new Error(
      `Clasificación ministerial inconsistente: 7=${conteoGrupos.ESTANDARES_7}, 21=${conteoGrupos.ESTANDARES_21}, 60=${conteoGrupos.ESTANDARES_60}.`
    );
  }
}

async function limpiarVersionExistente(
  nombre: string
): Promise<void> {
  const existente =
    await prisma.versionSupermatriz.findUnique(
      {
        where: {
          nombre,
        },
        select: {
          id: true,
          estado: true,
        },
      }
    );

  if (!existente) {
    return;
  }

  if (!RECREAR_VERSION) {
    throw new Error(
      `Ya existe la versión "${nombre}". Ejecuta el reset o define SUPERMATRIZ_SEED_RECREATE=true.`
    );
  }

  console.log(
    `♻️ Eliminando la versión previa del super seed: ${nombre}...`
  );

  const versionSupermatrizId =
    existente.id;

  await prisma.historialCambioSupermatriz.deleteMany(
    {
      where: {
        versionSupermatrizId,
      },
    }
  );

  await prisma.supermatrizTarea.deleteMany(
    {
      where: {
        versionSupermatrizId,
      },
    }
  );

  await prisma.aspecto.deleteMany({
    where: {
      versionSupermatrizId,
    },
  });

  await prisma.estandar.deleteMany({
    where: {
      versionSupermatrizId,
    },
  });

  await prisma.categoriaEstandar.deleteMany(
    {
      where: {
        versionSupermatrizId,
      },
    }
  );

  await prisma.cicloPhva.deleteMany({
    where: {
      versionSupermatrizId,
    },
  });

  await prisma.proceso.deleteMany({
    where: {
      versionSupermatrizId,
    },
  });

  await prisma.palabraClave.deleteMany({
    where: {
      versionSupermatrizId,
    },
  });

  await prisma.requisitoNormativo.deleteMany(
    {
      where: {
        versionSupermatrizId,
      },
    }
  );

  await prisma.versionSupermatriz.delete({
    where: {
      id: versionSupermatrizId,
    },
  });
}

async function prepararCatalogosGlobales(
  sumasGrupo: Record<
    GrupoCodigo,
    number
  >
): Promise<{
  categoriasGestion: Map<
    CodigoCategoriaGestion,
    number
  >;
  gruposMinisteriales: Map<
    GrupoCodigo,
    number
  >;
}> {
  const categoriasDefinicion = [
    {
      codigo:
        CodigoCategoriaGestion.DOCUMENTAL,
      nombre: "Gestión documental",
      descripcion:
        "Actividades y evidencias relacionadas con la gestión documental del SG-SST.",
    },
    {
      codigo:
        CodigoCategoriaGestion.INTERVENCION,
      nombre:
        "Gestión a la intervención",
      descripcion:
        "Actividades de intervención, acompañamiento y ejecución operativa del SG-SST.",
    },
    {
      codigo:
        CodigoCategoriaGestion.EMERGENCIAS,
      nombre:
        "Gestión de emergencias",
      descripcion:
        "Actividades relacionadas con prevención, preparación y respuesta ante emergencias.",
    },
  ];

  const categoriasGestion =
    new Map<
      CodigoCategoriaGestion,
      number
    >();

  for (
    const definicion of categoriasDefinicion
  ) {
    const registro =
      await prisma.categoriaGestion.upsert(
        {
          where: {
            codigo:
              definicion.codigo,
          },
          update: {
            nombre:
              definicion.nombre,
            descripcion:
              definicion.descripcion,
            estado:
              EstadoRegistro.ACTIVO,
          },
          create: {
            ...definicion,
            estado:
              EstadoRegistro.ACTIVO,
          },
        }
      );

    categoriasGestion.set(
      definicion.codigo,
      registro.id
    );
  }

  const gruposDefinicion = [
    {
      codigo:
        CodigoGrupoMinisterial.ESTANDARES_7,
      nombre: "7 estándares",
    },
    {
      codigo:
        CodigoGrupoMinisterial.ESTANDARES_21,
      nombre: "21 estándares",
    },
    {
      codigo:
        CodigoGrupoMinisterial.ESTANDARES_60,
      nombre: "60 estándares",
    },
  ];

  const gruposMinisteriales =
    new Map<
      GrupoCodigo,
      number
    >();

  for (
    const definicion of gruposDefinicion
  ) {
    const porcentajeEvaluable =
      Number(
        sumasGrupo[
          definicion.codigo
        ].toFixed(2)
      );

    const porcentajeComplemento =
      Number(
        (
          100 -
          porcentajeEvaluable
        ).toFixed(2)
      );

    const registro =
      await prisma.grupoMinisterial.upsert(
        {
          where: {
            codigo:
              definicion.codigo,
          },
          update: {
            nombre:
              definicion.nombre,
            porcentajeEvaluable,
            porcentajeComplemento,
            estado:
              EstadoRegistro.ACTIVO,
          },
          create: {
            codigo:
              definicion.codigo,
            nombre:
              definicion.nombre,
            porcentajeEvaluable,
            porcentajeComplemento,
            estado:
              EstadoRegistro.ACTIVO,
          },
        }
      );

    gruposMinisteriales.set(
      definicion.codigo,
      registro.id
    );
  }

  return {
    categoriasGestion,
    gruposMinisteriales,
  };
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🌱 Iniciando super seed de la Supermatriz..."
  );
  console.log(
    "📄 Fuente: Diagnostico del SGSST, columnas A:Z."
  );
  console.log("");

  const filas = prepararFilas();
  validarDatos(filas);

  const ciclosUnicos =
    new Map<
      string,
      {
        codigo: string;
        nombre: string;
        porcentajeEsperado: number;
        orden: number;
      }
    >();

  const categoriasUnicas =
    new Map<
      string,
      {
        codigo: string;
        nombre: string;
        porcentajeEsperado: number;
        cicloCodigo: string;
        orden: number;
      }
    >();

  const estandaresUnicos =
    new Map<
      string,
      {
        codigo: string;
        nombre: string;
        categoriaCodigo: string;
        calificacion: number;
        grupos: Set<GrupoCodigo>;
        orden: number;
      }
    >();

  const procesosUnicos =
    new Map<
      string,
      {
        codigo: string;
        nombre: string;
      }
    >();

  for (const fila of filas) {
    if (
      !ciclosUnicos.has(
        fila.cicloCodigo
      )
    ) {
      ciclosUnicos.set(
        fila.cicloCodigo,
        {
          codigo:
            fila.cicloCodigo,
          nombre:
            fila.cicloNombre,
          porcentajeEsperado:
            fila.cicloPorcentaje,
          orden:
            ciclosUnicos.size + 1,
        }
      );
    }

    const claveCategoria =
      `${fila.cicloCodigo}|${fila.categoriaCodigo}`;

    if (
      !categoriasUnicas.has(
        claveCategoria
      )
    ) {
      categoriasUnicas.set(
        claveCategoria,
        {
          codigo:
            fila.categoriaCodigo,
          nombre:
            fila.categoriaNombre,
          porcentajeEsperado:
            fila.categoriaPorcentaje,
          cicloCodigo:
            fila.cicloCodigo,
          orden:
            categoriasUnicas.size + 1,
        }
      );
    }

    const estandarActual =
      estandaresUnicos.get(
        fila.estandarCodigo
      ) ?? {
        codigo:
          fila.estandarCodigo,
        nombre:
          fila.estandarNombre,
        categoriaCodigo:
          fila.categoriaCodigo,
        calificacion:
          fila.calificacionEsperada ??
          0,
        grupos:
          new Set<GrupoCodigo>(),
        orden:
          estandaresUnicos.size + 1,
      };

    for (const grupo of fila.grupos) {
      estandarActual.grupos.add(
        grupo
      );
    }

    estandaresUnicos.set(
      fila.estandarCodigo,
      estandarActual
    );

    if (
      !procesosUnicos.has(
        fila.procesoCodigo
      )
    ) {
      procesosUnicos.set(
        fila.procesoCodigo,
        {
          codigo:
            fila.procesoCodigo,
          nombre:
            fila.procesoNombre,
        }
      );
    }
  }

  const sumasGrupo: Record<
    GrupoCodigo,
    number
  > = {
    [CodigoGrupoMinisterial.ESTANDARES_7]:
      0,
    [CodigoGrupoMinisterial.ESTANDARES_21]:
      0,
    [CodigoGrupoMinisterial.ESTANDARES_60]:
      0,
  };

  for (
    const estandar of estandaresUnicos.values()
  ) {
    for (const grupo of estandar.grupos) {
      sumasGrupo[grupo] +=
        estandar.calificacion;
    }
  }

  await limpiarVersionExistente(
    NOMBRE_VERSION
  );

  const {
    categoriasGestion,
    gruposMinisteriales,
  } = await prepararCatalogosGlobales(
    sumasGrupo
  );

  const version =
    await prisma.versionSupermatriz.create(
      {
        data: {
          nombre: NOMBRE_VERSION,
          descripcion:
            "Importación controlada del Excel maestro de SIS. Incluye 149 filas, 149 aspectos, 43 procesos, 60 estándares, 7 categorías y 4 ciclos PHVA.",
          estado:
            EstadoVersionSupermatriz.BORRADOR,
        },
      }
    );

  console.log(
    `✓ Versión borrador creada: ${version.nombre} (ID ${version.id})`
  );

  const cicloIds =
    new Map<string, number>();

  for (
    const ciclo of ciclosUnicos.values()
  ) {
    const creado =
      await prisma.cicloPhva.create({
        data: {
          versionSupermatrizId:
            version.id,
          codigo: ciclo.codigo,
          nombre: ciclo.nombre,
          orden: ciclo.orden,
          porcentajeEsperado:
            ciclo.porcentajeEsperado,
          estado:
            EstadoRegistro.ACTIVO,
        },
      });

    cicloIds.set(
      ciclo.codigo,
      creado.id
    );
  }

  console.log(
    `✓ Ciclos PHVA: ${cicloIds.size}`
  );

  const categoriaIds =
    new Map<string, number>();

  for (
    const categoria of categoriasUnicas.values()
  ) {
    const cicloPhvaId =
      cicloIds.get(
        categoria.cicloCodigo
      );

    if (!cicloPhvaId) {
      throw new Error(
        `Ciclo no encontrado para la categoría ${categoria.codigo}.`
      );
    }

    const creado =
      await prisma.categoriaEstandar.create(
        {
          data: {
            versionSupermatrizId:
              version.id,
            cicloPhvaId,
            codigo:
              categoria.codigo,
            nombre:
              categoria.nombre,
            descripcion: null,
            orden:
              categoria.orden,
            porcentajeEsperado:
              categoria.porcentajeEsperado,
            estado:
              EstadoRegistro.ACTIVO,
          },
        }
      );

    categoriaIds.set(
      categoria.codigo,
      creado.id
    );
  }

  console.log(
    `✓ Categorías del estándar: ${categoriaIds.size}`
  );

  const estandarIds =
    new Map<string, number>();

  for (
    const estandar of estandaresUnicos.values()
  ) {
    const categoriaEstandarId =
      categoriaIds.get(
        estandar.categoriaCodigo
      );

    if (!categoriaEstandarId) {
      throw new Error(
        `Categoría no encontrada para el estándar ${estandar.codigo}.`
      );
    }

    const relacionesGrupos = [
      ...estandar.grupos,
    ].map((codigo) => {
      const grupoMinisterialId =
        gruposMinisteriales.get(
          codigo
        );

      if (!grupoMinisterialId) {
        throw new Error(
          `Grupo ministerial no encontrado: ${codigo}.`
        );
      }

      return {
        grupoMinisterialId,
      };
    });

    const creado =
      await prisma.estandar.create({
        data: {
          versionSupermatrizId:
            version.id,
          categoriaEstandarId,
          codigo:
            estandar.codigo,
          nombre:
            estandar.nombre,
          descripcion: null,
          orden:
            estandar.orden,
          calificacionMinisterialEsperada:
            estandar.calificacion,
          estado:
            EstadoRegistro.ACTIVO,
          gruposMinisteriales: {
            create:
              relacionesGrupos,
          },
        },
      });

    estandarIds.set(
      estandar.codigo,
      creado.id
    );
  }

  console.log(
    `✓ Estándares: ${estandarIds.size}`
  );

  const procesoIds =
    new Map<string, number>();

  for (
    const proceso of procesosUnicos.values()
  ) {
    const creado =
      await prisma.proceso.create({
        data: {
          versionSupermatrizId:
            version.id,
          codigo:
            proceso.codigo,
          nombre:
            proceso.nombre,
          descripcion: null,
          estado:
            EstadoRegistro.ACTIVO,
        },
      });

    procesoIds.set(
      proceso.codigo,
      creado.id
    );
  }

  console.log(
    `✓ Procesos: ${procesoIds.size}`
  );

  const aspectoIds =
    new Map<string, number>();

  for (
    const [
      indice,
      fila,
    ] of filas.entries()
  ) {
    const estandarId =
      estandarIds.get(
        fila.estandarCodigo
      );

    if (!estandarId) {
      throw new Error(
        `Estándar no encontrado para el aspecto ${fila.aspectoCodigo}.`
      );
    }

    const descripcionAspecto =
      fila.aspectoCodigo ===
      fila.aspectoCodigoOriginal
        ? fila.aspectoNombreCompleto
        : `${fila.aspectoNombreCompleto}\n\nCódigo original en el Excel: ${fila.aspectoCodigoOriginal}. El seed agregó el sufijo "${fila.aspectoCodigo}" para evitar códigos duplicados dentro de la versión.`;

    const aspecto =
      await prisma.aspecto.create({
        data: {
          versionSupermatrizId:
            version.id,
          estandarId,
          codigo:
            fila.aspectoCodigo,
          nombre:
            fila.aspectoNombre,
          descripcion:
            descripcionAspecto,
          orden:
            fila.orden,
          estado:
            EstadoRegistro.ACTIVO,
          planAccionEspecifico: {
            create: {
              descripcion:
                fila.planAccion,
              estado:
                EstadoRegistro.ACTIVO,
            },
          },
          configuracion: {
            create: {
              esEvergreen:
                fila.esEvergreen,
              bloqueEvergreen:
                fila.bloqueEvergreen,
              documentoActualizacionPeriodica:
                fila.periodicidad
                  .documentoActualizacionPeriodica,
              tareaEjecucionCotidiana:
                fila.esTareaCotidiana,
              incluirInformeEstadoTareas:
                esX(
                  fila.informeEstadoTareas
                ),
              permiteNoAplica: true,
              estado:
                EstadoRegistro.ACTIVO,
            },
          },
          configuracionVigencia: {
            create: {
              tipoFechaBase:
                TipoFechaBaseVigencia.FECHA_DOCUMENTO,
              fuentePeriodicidad:
                FuentePeriodicidad.CONFIGURACION_TECNICA,
              cantidad:
                fila.periodicidad
                  .cantidad,
              unidad:
                fila.periodicidad
                  .unidad,
              diasAlertaPrevia: 30,
              permiteFechaManual: true,
              mesFechaFija: null,
              diaFechaFija: null,
              descripcionRegla:
                fila.periodicidad
                  .descripcionRegla,
              estado:
                EstadoRegistro.ACTIVO,
            },
          },
          ...(fila.esTareaCotidiana
            ? {
                configuracionTareaCotidiana:
                  {
                    create: {
                      cantidadObjetivo: 1,
                      unidad:
                        UnidadPeriodicidad.DIA,
                      descripcion:
                        "Marcado con X en la columna Tareas de ejecución cotidiana del Excel maestro.",
                      estado:
                        EstadoRegistro.ACTIVO,
                    },
                  },
              }
            : {}),
          configuracionEvidencia: {
            create: {
              requiereEvidencia:
                Boolean(
                  texto(
                    fila.fundamentosSoportes
                  )
                ),
              descripcionEvidencia:
                fila.fundamentosSoportes,
              visibleClienteDefault:
                false,
              estado:
                EstadoRegistro.ACTIVO,
            },
          },
          configuracionRevision: {
            create: {
              requiereRevisionTecnica:
                false,
              observaciones: null,
              estado:
                EstadoRegistro.ACTIVO,
            },
          },
        },
      });

    aspectoIds.set(
      fila.aspectoCodigo,
      aspecto.id
    );

    const palabrasClave =
      prepararPalabrasClave(
        fila.palabrasClave
      );

    for (
      const nombre of palabrasClave
    ) {
      const palabra =
        await prisma.palabraClave.upsert(
          {
            where: {
              versionSupermatrizId_nombre:
                {
                  versionSupermatrizId:
                    version.id,
                  nombre,
                },
            },
            update: {},
            create: {
              versionSupermatrizId:
                version.id,
              nombre,
            },
          }
        );

      await prisma.aspectoPalabraClave.create(
        {
          data: {
            aspectoId:
              aspecto.id,
            palabraClaveId:
              palabra.id,
          },
        }
      );
    }

    if (
      (indice + 1) % 25 === 0 ||
      indice + 1 === filas.length
    ) {
      console.log(
        `   Aspectos creados: ${indice + 1}/${filas.length}`
      );
    }
  }

  console.log(
    `✓ Aspectos: ${aspectoIds.size}`
  );

  for (
    const [
      indice,
      fila,
    ] of filas.entries()
  ) {
    const aspectoId =
      aspectoIds.get(
        fila.aspectoCodigo
      );

    const procesoId =
      procesoIds.get(
        fila.procesoCodigo
      );

    if (
      !aspectoId ||
      !procesoId
    ) {
      throw new Error(
        `No fue posible resolver la fila Excel ${fila.excelRow}.`
      );
    }

    const relacionesGestion =
      fila.categoriasGestion.map(
        (codigo) => {
          const categoriaGestionId =
            categoriasGestion.get(
              codigo
            );

          if (!categoriaGestionId) {
            throw new Error(
              `Categoría de gestión no encontrada: ${codigo}.`
            );
          }

          return {
            categoriaGestionId,
          };
        }
      );

    await prisma.supermatrizTarea.create(
      {
        data: {
          versionSupermatrizId:
            version.id,
          aspectoId,
          procesoId,
          codigo: null,
          orden: fila.orden,
          ejecucion:
            fila.ejecucion,
          fundamentosSoportes:
            fila.fundamentosSoportes,
          responsableActividad:
            fila.responsableActividad,
          metasEstandar:
            fila.metasEstandar,
          recursosAdministrativos:
            fila.recursosAdministrativos,
          estado:
            EstadoRegistro.ACTIVO,
          categoriasGestion: {
            create:
              relacionesGestion,
          },
        },
      }
    );

    if (
      (indice + 1) % 25 === 0 ||
      indice + 1 === filas.length
    ) {
      console.log(
        `   Filas creadas: ${indice + 1}/${filas.length}`
      );
    }
  }

  const actor =
    await prisma.usuario.findFirst({
      where: {
        rol:
          RolUsuario.SUPERADMIN,
        activo: true,
      },
      select: {
        id: true,
      },
    });

  await prisma.historialCambioSupermatriz.create(
    {
      data: {
        versionSupermatrizId:
          version.id,
        tipoEntidad:
          "VersionSupermatriz",
        entidadId:
          version.id,
        accion:
          "IMPORTAR_EXCEL",
        descripcion:
          "Super seed creado desde el Excel maestro de seguimiento y control del SG-SST.",
        datosDespues: {
          filas: filas.length,
          aspectos:
            aspectoIds.size,
          procesos:
            procesoIds.size,
          estandares:
            estandarIds.size,
          categorias:
            categoriaIds.size,
          ciclos:
            cicloIds.size,
          grupos: {
            estandares7: 7,
            estandares21: 21,
            estandares60: 60,
          },
          porcentajeEvaluable: {
            estandares7:
              Number(
                sumasGrupo.ESTANDARES_7.toFixed(
                  2
                )
              ),
            estandares21:
              Number(
                sumasGrupo.ESTANDARES_21.toFixed(
                  2
                )
              ),
            estandares60:
              Number(
                sumasGrupo.ESTANDARES_60.toFixed(
                  2
                )
              ),
          },
        },
        usuarioId:
          actor?.id ?? null,
      },
    }
  );

  const verificacion =
    await prisma.versionSupermatriz.findUniqueOrThrow(
      {
        where: {
          id: version.id,
        },
        include: {
          _count: {
            select: {
              ciclosPhva: true,
              categoriasEstandar:
                true,
              estandares: true,
              aspectos: true,
              procesos: true,
              tareas: true,
            },
          },
        },
      }
    );

  console.log("");
  console.log(
    "✅ Super seed finalizado correctamente."
  );
  console.log(
    `   Versión: ${verificacion.nombre}`
  );
  console.log(
    `   Ciclos: ${verificacion._count.ciclosPhva}`
  );
  console.log(
    `   Categorías: ${verificacion._count.categoriasEstandar}`
  );
  console.log(
    `   Estándares: ${verificacion._count.estandares}`
  );
  console.log(
    `   Aspectos: ${verificacion._count.aspectos}`
  );
  console.log(
    `   Procesos: ${verificacion._count.procesos}`
  );
  console.log(
    `   Filas: ${verificacion._count.tareas}`
  );
  console.log(
    "   Estado de la versión: BORRADOR"
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "❌ Error ejecutando el super seed:"
    );
    console.error(error);
    console.error("");
    console.error(
      "El script es repetible: corrige el problema y vuelve a ejecutar npm run seed:supermatriz."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

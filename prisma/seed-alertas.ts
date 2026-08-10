import "dotenv/config";

import {
  EstadoActividadCompromiso,
  EstadoAprobacionGestion,
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  EstadoCumplimientoAspecto,
  EstadoDecisionNoAplica,
  EstadoGestionSgsst,
  EstadoRegistro,
  EstadoRevisionTecnica,
  EstadoVersionSupermatriz,
  ModalidadGestion,
  PrismaClient,
  TipoResponsableCompromiso,
} from "@prisma/client";

import {
  CUENTAS_DEMO,
  EMPRESAS_DEMO,
} from "./seeds/datos-demo.seed";

const prisma = new PrismaClient();
const MARCA_SEED = "[SEED ALERTAS]";

function fechaDias(desplazamiento: number): Date {
  const fecha = new Date();
  fecha.setUTCHours(12, 0, 0, 0);
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento);
  return fecha;
}

function fechaHoraDias(desplazamiento: number): Date {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento);
  return fecha;
}

async function main(): Promise<void> {
  console.log("");
  console.log(
    "🚦 Preparando escenarios multiempresa para el Centro de Acciones..."
  );

  const version =
    await prisma.versionSupermatriz.findFirst({
      where: {
        estado: EstadoVersionSupermatriz.VIGENTE,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
        nombre: true,
      },
    });

  if (!version) {
    throw new Error(
      "No existe una versión VIGENTE de la Supermatriz. Ejecuta primero npm run seed:supermatriz."
    );
  }

  const nitsDemo = EMPRESAS_DEMO.map(
    (empresa) => empresa.nit
  );
  const empresas = await prisma.empresa.findMany({
    where: {
      nit: {
        in: nitsDemo,
      },
      activo: true,
    },
    select: {
      id: true,
      nit: true,
      nombre: true,
    },
  });

  if (empresas.length !== EMPRESAS_DEMO.length) {
    throw new Error(
      `Se esperaban ${EMPRESAS_DEMO.length} empresas demo y solo se encontraron ${empresas.length}. Ejecuta primero npm run seed:demo.`
    );
  }

  const empresaPorNit = new Map(
    empresas.map((empresa) => [empresa.nit, empresa])
  );
  const empresaAlDia = empresaPorNit.get(
    EMPRESAS_DEMO[0].nit
  );
  const empresaCompromisos = empresaPorNit.get(
    EMPRESAS_DEMO[1].nit
  );
  const empresaControles = empresaPorNit.get(
    EMPRESAS_DEMO[2].nit
  );
  const empresaAprobaciones = empresaPorNit.get(
    EMPRESAS_DEMO[3].nit
  );

  if (
    !empresaAlDia ||
    !empresaCompromisos ||
    !empresaControles ||
    !empresaAprobaciones
  ) {
    throw new Error(
      "No fue posible resolver las cuatro empresas demo."
    );
  }

  const [
    superadmin,
    usuarioCoordinador,
    usuarioProfesional,
  ] = await Promise.all([
    prisma.usuario.findUnique({
      where: {
        correo: CUENTAS_DEMO.superadmin.correo,
      },
      select: {
        id: true,
      },
    }),
    prisma.usuario.findUnique({
      where: {
        correo: CUENTAS_DEMO.coordinador.correo,
      },
      select: {
        id: true,
        profesional: {
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.usuario.findUnique({
      where: {
        correo: CUENTAS_DEMO.profesional.correo,
      },
      select: {
        id: true,
        profesional: {
          select: {
            id: true,
          },
        },
      },
    }),
  ]);

  if (
    !superadmin ||
    !usuarioCoordinador?.profesional ||
    !usuarioProfesional?.profesional
  ) {
    throw new Error(
      "Faltan las identidades demo requeridas. Ejecuta primero npm run seed:demo."
    );
  }

  const tareasFuente =
    await prisma.supermatrizTarea.findMany({
      where: {
        versionSupermatrizId: version.id,
        estado: EstadoRegistro.ACTIVO,
        aspecto: {
          estado: EstadoRegistro.ACTIVO,
        },
      },
      orderBy: {
        orden: "asc",
      },
      take: 40,
      select: {
        id: true,
        orden: true,
        aspecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    });

  const tareas = [];
  const aspectosUsados = new Set<number>();

  for (const tarea of tareasFuente) {
    if (aspectosUsados.has(tarea.aspecto.id)) {
      continue;
    }

    tareas.push(tarea);
    aspectosUsados.add(tarea.aspecto.id);

    if (tareas.length >= 10) {
      break;
    }
  }

  if (tareas.length < 10) {
    throw new Error(
      "La Supermatriz vigente no tiene al menos 10 aspectos distintos para construir el escenario demo."
    );
  }

  const gestionesPrevias =
    await prisma.gestionSgsst.count({
      where: {
        tipoActividad: {
          startsWith: MARCA_SEED,
        },
        empresaPeriodo: {
          empresaId: {
            in: empresas.map((empresa) => empresa.id),
          },
        },
      },
    });

  if (gestionesPrevias > 0) {
    throw new Error(
      "Ya existen escenarios de seed:alertas. Para evitar duplicados, ejecuta reset:total y vuelve a cargar los seeds en orden."
    );
  }

  const anio = new Date().getFullYear();
  const ahora = new Date();

  await prisma.$transaction(
    async (tx) => {
      const periodos = new Map<string, string>();

      for (const empresa of empresas) {
        const periodo = await tx.empresaPeriodo.upsert({
          where: {
            empresaId_anio: {
              empresaId: empresa.id,
              anio,
            },
          },
          update: {
            versionSupermatrizId: version.id,
          },
          create: {
            empresaId: empresa.id,
            versionSupermatrizId: version.id,
            anio,
            creadoPorUsuarioId: superadmin.id,
          },
          select: {
            id: true,
          },
        });

        periodos.set(empresa.id, periodo.id);
      }

      const periodoAlDia = periodos.get(empresaAlDia.id);
      const periodoCompromisos = periodos.get(
        empresaCompromisos.id
      );
      const periodoControles = periodos.get(
        empresaControles.id
      );
      const periodoAprobaciones = periodos.get(
        empresaAprobaciones.id
      );

      if (
        !periodoAlDia ||
        !periodoCompromisos ||
        !periodoControles ||
        !periodoAprobaciones
      ) {
        throw new Error(
          "No fue posible crear los periodos demo."
        );
      }

      // ==================================================
      // 1. EMPRESA AL DÍA
      // Tres aspectos calificados en 5 y sin acciones.
      // ==================================================
      const gestionAlDia = await tx.gestionSgsst.create({
        data: {
          empresaPeriodoId: periodoAlDia,
          profesionalId:
            usuarioProfesional.profesional.id,
          usuarioCreadorId: usuarioProfesional.id,
          fechaGestion: fechaDias(-10),
          modalidad: ModalidadGestion.PRESENCIAL,
          tipoActividad: `${MARCA_SEED} Empresa al día`,
          observacionGeneral:
            "Escenario sin acciones pendientes para validar estado verde del Centro de Acciones.",
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          finalizadaEn: fechaHoraDias(-10),
        },
      });

      for (const tarea of tareas.slice(0, 3)) {
        await tx.evaluacionAspecto.create({
          data: {
            gestionId: gestionAlDia.id,
            aspectoId: tarea.aspecto.id,
            supermatrizTareaId: tarea.id,
            usuarioRegistradorId: usuarioProfesional.id,
            estadoCumplimiento:
              EstadoCumplimientoAspecto.CUMPLIDO,
            calificacionAdministrativa: 5,
            observacion:
              "Cumplimiento verificado para escenario demo al día.",
            fechaDocumento: fechaDias(-15),
          },
        });
      }

      // ==================================================
      // 2. EMPRESA CON COMPROMISOS
      // Actividad vencida, reasignación y recalificación.
      // ==================================================
      const crearEvaluacionCompromiso = async (
        indiceTarea: number,
        calificacion: 0 | 3,
        estadoCumplimiento:
          | EstadoCumplimientoAspecto.NO_CUMPLIDO
          | EstadoCumplimientoAspecto.PARCIAL,
        etiqueta: string
      ) => {
        const tarea = tareas[indiceTarea];
        const gestion = await tx.gestionSgsst.create({
          data: {
            empresaPeriodoId: periodoCompromisos,
            profesionalId:
              usuarioProfesional.profesional.id,
            usuarioCreadorId: usuarioProfesional.id,
            fechaGestion: fechaDias(-8 + indiceTarea),
            modalidad: ModalidadGestion.PRESENCIAL,
            tipoActividad: `${MARCA_SEED} ${etiqueta}`,
            observacionGeneral:
              "Gestión demo que origina un compromiso real de prueba.",
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
            finalizadaEn: fechaHoraDias(-8 + indiceTarea),
          },
        });

        const evaluacion = await tx.evaluacionAspecto.create({
          data: {
            gestionId: gestion.id,
            aspectoId: tarea.aspecto.id,
            supermatrizTareaId: tarea.id,
            usuarioRegistradorId: usuarioProfesional.id,
            estadoCumplimiento,
            calificacionAdministrativa: calificacion,
            observacion:
              "Resultado demo que requiere plan de acción y seguimiento.",
          },
        });

        return {
          tarea,
          gestion,
          evaluacion,
        };
      };

      const pendienteActividad =
        await crearEvaluacionCompromiso(
          3,
          3,
          EstadoCumplimientoAspecto.PARCIAL,
          "Compromiso con actividad vencida"
        );
      const compromisoActividad = await tx.compromiso.create({
        data: {
          empresaId: empresaCompromisos.id,
          gestionOrigenId: pendienteActividad.gestion.id,
          evaluacionOrigenId:
            pendienteActividad.evaluacion.id,
          aspectoId: pendienteActividad.tarea.aspecto.id,
          aspectoCodigo:
            pendienteActividad.tarea.aspecto.codigo,
          creadoPorUsuarioId: usuarioCoordinador.id,
          descripcion:
            "Completar la actividad pendiente del aspecto evaluado parcialmente.",
          recursos:
            "Tiempo del profesional y soporte documental.",
          fechaLimite: fechaDias(-5),
          estado: EstadoCompromiso.EN_EJECUCION,
        },
      });
      const responsableActividad =
        await tx.compromisoResponsable.create({
          data: {
            compromisoId: compromisoActividad.id,
            usuarioResponsableId: usuarioProfesional.id,
            asignadoPorUsuarioId: usuarioCoordinador.id,
            tipo: TipoResponsableCompromiso.PRINCIPAL,
            estado: EstadoAsignacionCompromiso.ASIGNADA,
          },
        });
      await tx.actividadCompromiso.create({
        data: {
          compromisoResponsableId: responsableActividad.id,
          descripcion:
            "Cargar la evidencia y completar la actividad demo vencida.",
          estado: EstadoActividadCompromiso.PENDIENTE,
        },
      });

      const pendienteReasignacion =
        await crearEvaluacionCompromiso(
          4,
          0,
          EstadoCumplimientoAspecto.NO_CUMPLIDO,
          "Compromiso pendiente de reasignación"
        );
      const compromisoReasignacion =
        await tx.compromiso.create({
          data: {
            empresaId: empresaCompromisos.id,
            gestionOrigenId: pendienteReasignacion.gestion.id,
            evaluacionOrigenId:
              pendienteReasignacion.evaluacion.id,
            aspectoId:
              pendienteReasignacion.tarea.aspecto.id,
            aspectoCodigo:
              pendienteReasignacion.tarea.aspecto.codigo,
            creadoPorUsuarioId: usuarioCoordinador.id,
            descripcion:
              "Reasignar el compromiso rechazado por el responsable inicial.",
            fechaLimite: fechaDias(-2),
            estado:
              EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
          },
        });
      await tx.compromisoResponsable.create({
        data: {
          compromisoId: compromisoReasignacion.id,
          usuarioResponsableId: usuarioProfesional.id,
          asignadoPorUsuarioId: usuarioCoordinador.id,
          tipo: TipoResponsableCompromiso.PRINCIPAL,
          estado: EstadoAsignacionCompromiso.RECHAZADA,
          rechazadoEn: fechaHoraDias(-1),
          motivoRechazo:
            "Escenario demo: responsable rechazó la asignación para probar reasignación.",
        },
      });

      const pendienteRecalificacion =
        await crearEvaluacionCompromiso(
          5,
          3,
          EstadoCumplimientoAspecto.PARCIAL,
          "Compromiso listo para recalificar"
        );
      const compromisoRecalificacion =
        await tx.compromiso.create({
          data: {
            empresaId: empresaCompromisos.id,
            gestionOrigenId:
              pendienteRecalificacion.gestion.id,
            evaluacionOrigenId:
              pendienteRecalificacion.evaluacion.id,
            aspectoId:
              pendienteRecalificacion.tarea.aspecto.id,
            aspectoCodigo:
              pendienteRecalificacion.tarea.aspecto.codigo,
            creadoPorUsuarioId: usuarioCoordinador.id,
            descripcion:
              "Actividad completada; falta registrar la reevaluación efectiva en 5.",
            fechaLimite: fechaDias(10),
            estado: EstadoCompromiso.EN_EJECUCION,
          },
        });
      const responsableRecalificacion =
        await tx.compromisoResponsable.create({
          data: {
            compromisoId: compromisoRecalificacion.id,
            usuarioResponsableId: usuarioProfesional.id,
            asignadoPorUsuarioId: usuarioCoordinador.id,
            tipo: TipoResponsableCompromiso.PRINCIPAL,
            estado: EstadoAsignacionCompromiso.ASIGNADA,
          },
        });
      await tx.actividadCompromiso.create({
        data: {
          compromisoResponsableId:
            responsableRecalificacion.id,
          descripcion:
            "Actividad demo ya atendida; el supervisor debe recalificar.",
          estado: EstadoActividadCompromiso.ATENDIDA,
          atendidaPorUsuarioId: usuarioProfesional.id,
          atendidaEn: fechaHoraDias(-1),
        },
      });

      // ==================================================
      // 3. EMPRESA CON CONTROLES
      // No aplica pendiente y revisión técnica pendiente.
      // ==================================================
      const tareaNoAplica = tareas[6];
      const gestionNoAplica = await tx.gestionSgsst.create({
        data: {
          empresaPeriodoId: periodoControles,
          profesionalId:
            usuarioProfesional.profesional.id,
          usuarioCreadorId: usuarioProfesional.id,
          fechaGestion: fechaDias(-4),
          modalidad: ModalidadGestion.OFICINA,
          tipoActividad: `${MARCA_SEED} No aplica pendiente`,
          observacionGeneral:
            "Solicitud demo de No aplica pendiente de decisión del coordinador.",
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          finalizadaEn: fechaHoraDias(-4),
        },
      });
      const evaluacionNoAplica =
        await tx.evaluacionAspecto.create({
          data: {
            gestionId: gestionNoAplica.id,
            aspectoId: tareaNoAplica.aspecto.id,
            supermatrizTareaId: tareaNoAplica.id,
            usuarioRegistradorId: usuarioProfesional.id,
            estadoCumplimiento:
              EstadoCumplimientoAspecto.NO_APLICA,
            calificacionAdministrativa: 5,
            justificacionNoAplica:
              "Escenario demo para validar la decisión de No aplica.",
          },
        });
      await tx.decisionNoAplica.create({
        data: {
          evaluacionId: evaluacionNoAplica.id,
          solicitadaPorUsuarioId: usuarioProfesional.id,
          estado: EstadoDecisionNoAplica.PENDIENTE,
          resultadoEfectivo: 3,
          solicitadaEn: fechaHoraDias(-3),
        },
      });

      const tareaRevision = tareas[7];
      const gestionRevision = await tx.gestionSgsst.create({
        data: {
          empresaPeriodoId: periodoControles,
          profesionalId:
            usuarioProfesional.profesional.id,
          usuarioCreadorId: usuarioProfesional.id,
          fechaGestion: fechaDias(-3),
          modalidad: ModalidadGestion.PRESENCIAL,
          tipoActividad: `${MARCA_SEED} Revisión técnica pendiente`,
          observacionGeneral:
            "Evaluación demo marcada para revisión técnica.",
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          finalizadaEn: fechaHoraDias(-3),
        },
      });
      const evaluacionRevision =
        await tx.evaluacionAspecto.create({
          data: {
            gestionId: gestionRevision.id,
            aspectoId: tareaRevision.aspecto.id,
            supermatrizTareaId: tareaRevision.id,
            usuarioRegistradorId: usuarioProfesional.id,
            estadoCumplimiento:
              EstadoCumplimientoAspecto.CUMPLIDO,
            calificacionAdministrativa: 5,
            observacion:
              "Cumple, pero requiere validación técnica demo.",
            marcadaRevisionTecnica: true,
            motivoRevisionTecnica:
              "Validar técnicamente el soporte presentado en el escenario demo.",
          },
        });
      await tx.revisionTecnicaEvaluacion.create({
        data: {
          evaluacionId: evaluacionRevision.id,
          solicitadaPorUsuarioId: usuarioProfesional.id,
          estado: EstadoRevisionTecnica.PENDIENTE,
          motivoSolicitud:
            "Escenario demo para probar la bandeja de revisiones técnicas.",
          solicitadaEn: fechaHoraDias(-2),
        },
      });

      // ==================================================
      // 4. EMPRESA CON APROBACIÓN PENDIENTE
      // Una evaluación provisional y el resto por calificar.
      // ==================================================
      const tareaAprobacion = tareas[8];
      const gestionAprobacion = await tx.gestionSgsst.create({
        data: {
          empresaPeriodoId: periodoAprobaciones,
          profesionalId:
            usuarioProfesional.profesional.id,
          usuarioCreadorId: usuarioProfesional.id,
          fechaGestion: fechaDias(-2),
          modalidad: ModalidadGestion.REMOTA,
          tipoActividad: `${MARCA_SEED} Gestión pendiente de aprobación`,
          observacionGeneral:
            "Gestión demo finalizada y pendiente de aprobación administrativa.",
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          finalizadaEn: fechaHoraDias(-2),
        },
      });
      const evaluacionAprobacion =
        await tx.evaluacionAspecto.create({
          data: {
            gestionId: gestionAprobacion.id,
            aspectoId: tareaAprobacion.aspecto.id,
            supermatrizTareaId: tareaAprobacion.id,
            usuarioRegistradorId: usuarioProfesional.id,
            estadoCumplimiento:
              EstadoCumplimientoAspecto.CUMPLIDO,
            calificacionAdministrativa: 5,
            observacion:
              "Resultado demo provisional hasta decisión administrativa.",
          },
        });
      const aprobacion = await tx.aprobacionGestion.create({
        data: {
          gestionId: gestionAprobacion.id,
          estado: EstadoAprobacionGestion.PENDIENTE,
          reglasAplicadas: [
            {
              origen: "seed-alertas",
              criterio:
                "Escenario controlado para validar aprobación pendiente.",
            },
          ],
          generadaEn: fechaHoraDias(-1),
        },
      });
      await tx.aprobacionGestionEvaluacion.create({
        data: {
          aprobacionGestionId: aprobacion.id,
          evaluacionId: evaluacionAprobacion.id,
        },
      });
    },
    {
      maxWait: 5000,
      timeout: 30000,
    }
  );

  console.log("");
  console.log("✅ Escenarios de alertas creados.");
  console.log(`Versión Supermatriz: ${version.nombre}`);
  console.log(`Periodo: ${anio}`);
  console.log("");
  console.table([
    {
      empresa: empresaAlDia.nombre,
      escenario: "Sin acciones pendientes",
      esperado: "Empresa al día",
    },
    {
      empresa: empresaCompromisos.nombre,
      escenario:
        "Actividad vencida + reasignación + recalificación",
      esperado: "Compromisos urgentes y pendientes",
    },
    {
      empresa: empresaControles.nombre,
      escenario:
        "No aplica + revisión técnica",
      esperado: "Controles pendientes según rol",
    },
    {
      empresa: empresaAprobaciones.nombre,
      escenario:
        "Gestión pendiente de aprobación",
      esperado: "Aprobación pendiente para administrador",
    },
  ]);
  console.log("");
  console.log(
    "ℹ️ Los aspectos no incluidos en estas gestiones permanecen por calificar."
  );
  console.log(
    "ℹ️ SUPERADMIN ve acciones administrativas globales; COORDINADOR y PROFESIONAL ven únicamente las que corresponden a sus reglas actuales."
  );
  console.log(
    `ℹ️ Seed ejecutado: ${MARCA_SEED} ${ahora.toISOString()}`
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "❌ Error ejecutando seed:alertas:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

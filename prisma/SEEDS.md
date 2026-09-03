# Seeds y reconstrucción de Stack44

Este directorio mantiene únicamente los seeds y utilidades vigentes para reconstruir el entorno de Stack44 de forma controlada.

## Flujo oficial de reconstrucción total

Después de un `npm run reset:total`, reconstruir con:

```bash
npm run seed:reconstruccion
```

Ese comando ejecuta, en este orden:

1. `npm run seed:supermatriz`
   - crea la versión de Supermatriz y sus catálogos;
   - crea procesos, PHVA, categorías, estándares, aspectos y relaciones;
   - ejecuta automáticamente `backfill-logica-evaluacion-aspectos.ts` para cargar la lógica de evaluación disponible en la fuente SIS.
2. `npm run seed:entorno-base`
   - crea o actualiza la empresa base SIS;
   - crea o actualiza las cuentas base de prueba;
   - crea los perfiles de coordinador y profesional;
   - asigna coordinador y profesional a la empresa base.

## Comandos vigentes

```bash
npm run seed:reconstruccion
npm run seed:supermatriz
npm run seed:entorno-base
npm run seed:superadmin
npm run backfill:logica-evaluacion -- --dry-run
npm run backfill:logica-evaluacion
npm run reset:supermatriz
npm run reset:total
```

`seed:superadmin` se conserva como utilidad independiente para bootstrap de un SUPERADMIN productivo mediante variables de entorno. No crea datos demo.

`backfill:gestion-participantes` se conserva únicamente como utilidad histórica de compatibilidad; no forma parte del flujo normal de reconstrucción.

## Seguridad

`reset:total` exige confirmación explícita mediante variables de entorno y valida el nombre de la base antes de borrar información. No ejecutar un reset contra una base que no haya sido verificada previamente.

No usar `prisma db push --force-reset` para reconstruir datos. El esquema y los datos se gestionan por separado.

## Fuente de la lógica de evaluación

La lógica de evaluación específica disponible proviene de:

- Archivo: `1 HERRAMIENTA SIS SGSST SEGUIMIENTO Y CONTROL`
- Hoja: `Diagnostico del SGSST`
- Columna: `FX`

Las filas cuya lógica específica esté vacía permanecen con `Aspecto.logicaEvaluacion = null`; el motor de Bitácora aplica únicamente el criterio general 0/3/5 con evidencia directa y no inventa reglas específicas.

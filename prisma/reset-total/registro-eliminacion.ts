export type ResultadoEliminacion = {
  count: number;
};

export async function eliminarRegistros(
  nombre: string,
  operacion: () => Promise<ResultadoEliminacion>
): Promise<number> {
  const resultado = await operacion();

  console.log(
    `   ✓ ${nombre}: ${resultado.count} registro(s)`
  );

  return resultado.count;
}


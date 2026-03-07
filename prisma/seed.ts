/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el sembrado (seeding) de la base de datos...');

  // Datos proporcionados para el administrador maestro
  const adminEmail = 'admin@sis.com';
  const adminPassword = 'Sis2026!';

  // Encriptamos la clave del admin antes de guardarla para máxima seguridad
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  // Usamos upsert para evitar duplicados si corres el comando varias veces
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, 
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Administrador Principal',
      company: 'SIS - Consultoría SST', 
      role: 'ADMIN',
    },
  });

  console.log(`✅ Usuario administrador creado/verificado: ${adminUser.email}`);
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
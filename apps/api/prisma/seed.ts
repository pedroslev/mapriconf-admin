import { PrismaClient, Role, TaskStatus, Priority, TaskType, ProjectRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const managerPassword = await bcrypt.hash('Manager123!', 10)
  const operatorPassword = await bcrypt.hash('Operator123!', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mapriconf.com.ar' },
    update: {},
    create: {
      email: 'admin@mapriconf.com.ar',
      name: 'Administrador',
      password: adminPassword,
      role: Role.ADMIN,
      department: 'Administración',
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'gerencia@mapriconf.com.ar' },
    update: {},
    create: {
      email: 'gerencia@mapriconf.com.ar',
      name: 'Leonardo López',
      password: managerPassword,
      role: Role.MANAGER,
      department: 'Gerencia',
    },
  })

  const operatorVentas = await prisma.user.upsert({
    where: { email: 'ventas@mapriconf.com.ar' },
    update: {},
    create: {
      email: 'ventas@mapriconf.com.ar',
      name: 'Operador Ventas',
      password: operatorPassword,
      role: Role.OPERATOR,
      department: 'Ventas',
    },
  })

  const operatorLogistica = await prisma.user.upsert({
    where: { email: 'logistica@mapriconf.com.ar' },
    update: {},
    create: {
      email: 'logistica@mapriconf.com.ar',
      name: 'Operador Logística',
      password: operatorPassword,
      role: Role.OPERATOR,
      department: 'Logística',
    },
  })

  const projects = [
    { name: 'Ventas', slug: 'ventas', color: '#10B981', icon: 'shopping-cart', description: 'Tareas del área de ventas' },
    { name: 'Logística', slug: 'logistica', color: '#F59E0B', icon: 'truck', description: 'Entregas, rutas y flota' },
    { name: 'Depósito', slug: 'deposito', color: '#6366F1', icon: 'warehouse', description: 'Stock, inventario y recepción de mercadería' },
    { name: 'Administración', slug: 'administracion', color: '#EF4444', icon: 'building', description: 'Finanzas, RRHH y compliance' },
    { name: 'Servicio Técnico', slug: 'tecnico', color: '#8B5CF6', icon: 'wrench', description: 'Soporte técnico y capacitaciones a clientes' },
    { name: 'Mantenimiento', slug: 'mantenimiento', color: '#64748B', icon: 'settings', description: 'Mantenimiento de vehículos, equipos e instalaciones' },
  ]

  const createdProjects: Record<string, { id: string }> = {}
  for (const p of projects) {
    const project = await prisma.project.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, createdById: admin.id },
    })
    createdProjects[p.slug] = project
  }

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: createdProjects['ventas'].id, userId: manager.id } },
    update: {},
    create: { projectId: createdProjects['ventas'].id, userId: manager.id, role: ProjectRole.LEAD },
  })
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: createdProjects['ventas'].id, userId: operatorVentas.id } },
    update: {},
    create: { projectId: createdProjects['ventas'].id, userId: operatorVentas.id, role: ProjectRole.MEMBER },
  })
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: createdProjects['logistica'].id, userId: operatorLogistica.id } },
    update: {},
    create: { projectId: createdProjects['logistica'].id, userId: operatorLogistica.id, role: ProjectRole.MEMBER },
  })

  const sampleTasks = [
    {
      taskNumber: 1,
      displayId: 'VEN-1',
      title: 'Reclamo Panadería El Trigo - falta de levadura',
      description: 'El cliente reportó que el último pedido llegó incompleto, faltaban 5 kg de levadura Calsa.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      type: TaskType.INCIDENT,
      projectId: createdProjects['ventas'].id,
      assignedToId: operatorVentas.id,
      createdById: manager.id,
      customerName: 'Panadería El Trigo',
      customerCuit: '20-12345678-9',
    },
    {
      taskNumber: 2,
      displayId: 'VEN-2',
      title: 'Seguimiento pedido mensual - Confitería La Esquina',
      description: 'Coordinar el pedido mensual de materias primas.',
      status: TaskStatus.OPEN,
      priority: Priority.MEDIUM,
      type: TaskType.ORDER,
      projectId: createdProjects['ventas'].id,
      assignedToId: operatorVentas.id,
      createdById: operatorVentas.id,
      customerName: 'Confitería La Esquina',
    },
    {
      taskNumber: 1,
      displayId: 'LOG-1',
      title: 'Revisión frenos Camión Ruta A',
      description: 'El camión de la ruta A reportó problemas con los frenos. Llevar a revisión mecánica.',
      status: TaskStatus.OPEN,
      priority: Priority.URGENT,
      type: TaskType.INTERNAL,
      projectId: createdProjects['logistica'].id,
      assignedToId: operatorLogistica.id,
      createdById: manager.id,
      vehiclePlate: 'ABC-123',
      routeCode: 'RUTA-A',
    },
    {
      taskNumber: 1,
      displayId: 'DEP-1',
      title: 'Control de stock mensual - Levadura Calsa',
      description: 'Realizar conteo mensual de levadura Calsa en todos los depósitos.',
      status: TaskStatus.OPEN,
      priority: Priority.MEDIUM,
      type: TaskType.INTERNAL,
      projectId: createdProjects['deposito'].id,
      createdById: admin.id,
    },
  ]

  for (const task of sampleTasks) {
    const existing = await prisma.task.findUnique({ where: { displayId: task.displayId } })
    if (!existing) {
      await prisma.task.create({ data: task })
    }
  }

  console.log('Seed completed!')
  console.log('')
  console.log('Usuarios creados:')
  console.log('  admin@mapriconf.com.ar     / Admin123!    (ADMIN)')
  console.log('  gerencia@mapriconf.com.ar  / Manager123!  (MANAGER)')
  console.log('  ventas@mapriconf.com.ar    / Operator123! (OPERATOR)')
  console.log('  logistica@mapriconf.com.ar / Operator123! (OPERATOR)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

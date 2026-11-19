import { createDb } from './db/client'
import type { RequestContext } from './common/context'
import { AuditRepository } from './modules/audit/audit.repository'
import { AuditService } from './modules/audit/audit.service'
import { UsersRepository } from './modules/users/users.repository'
import { UsersService } from './modules/users/users.service'
import { AuthService } from './modules/auth/auth.service'
import { SettingsRepository } from './modules/settings/settings.repository'
import { SettingsService } from './modules/settings/settings.service'
import { StudentsRepository } from './modules/students/students.repository'
import { StudentsService } from './modules/students/students.service'
import { PaymentsRepository } from './modules/payments/payments.repository'
import { PaymentsService } from './modules/payments/payments.service'
import { ProductsRepository } from './modules/products/products.repository'
import { ProductsService } from './modules/products/products.service'
import { SalesRepository } from './modules/sales/sales.repository'
import { SalesService } from './modules/sales/sales.service'
import { ExpensesRepository, ExpensesService } from './modules/expenses/expenses.service'
import { ActivitiesRepository, ActivitiesService } from './modules/activities/activities.service'
import { CashierService } from './modules/cashier/cashier.service'
import { DashboardService } from './modules/dashboard/dashboard.service'
import { BackupService } from './modules/backup/backup.service'

/**
 * Composition root. Equivale a los `@Module({ providers: [...] })` de Nest.js:
 * cada servicio recibe sus repositorios por constructor y no conoce a Next.js.
 * Se crea por petición para propagar el actor (auditoría) hacia la base.
 */
export function createServices(ctx: RequestContext) {
  const db = createDb(ctx.actor)

  const auditRepo = new AuditRepository(db)
  const usersRepo = new UsersRepository(db)
  const settingsRepo = new SettingsRepository(db)
  const studentsRepo = new StudentsRepository(db)
  const paymentsRepo = new PaymentsRepository(db)
  const productsRepo = new ProductsRepository(db)
  const salesRepo = new SalesRepository(db)
  const expensesRepo = new ExpensesRepository(db)
  const activitiesRepo = new ActivitiesRepository(db)

  const audit = new AuditService(auditRepo)
  const students = new StudentsService(studentsRepo, paymentsRepo, settingsRepo)

  return {
    audit,
    users: new UsersService(usersRepo, ctx.actor),
    auth: new AuthService(usersRepo, audit),
    settings: new SettingsService(settingsRepo),
    students,
    payments: new PaymentsService(paymentsRepo, studentsRepo, settingsRepo),
    products: new ProductsService(productsRepo, settingsRepo),
    sales: new SalesService(salesRepo, settingsRepo),
    expenses: new ExpensesService(expensesRepo),
    activities: new ActivitiesService(activitiesRepo),
    cashier: new CashierService(paymentsRepo, salesRepo),
    dashboard: new DashboardService(students, paymentsRepo, salesRepo, productsRepo, expensesRepo),
    backup: new BackupService(db, settingsRepo),
  }
}

export type Services = ReturnType<typeof createServices>

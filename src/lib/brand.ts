import packageJson from '../../package.json'

/** Marca de la aplicación (login, sidebar, títulos). La versión se lee de package.json. */
export const brand = {
  name: 'ÁGUILAS',
  gym: 'Águilas Boxeo Hualpén',
  tagline: 'BOXEO HUALPÉN',
  badge: 'Gestión de gimnasio de boxeo',
  headline: 'Acceso al sistema de gestión',
  description:
    'Administra alumnos, pagos, ventas, inventario, egresos y planificación del gimnasio en un solo lugar.',
  features: [
    { text: 'Sesión protegida con cookie httpOnly firmada (JWT).' },
    { text: 'Toda acción queda registrada en el log de auditoría.' },
  ],
  version: packageJson.version,
}

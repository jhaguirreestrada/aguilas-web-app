export const SETTINGS_SECTIONS = [
  { slug: 'general', label: 'General y WhatsApp', title: 'Parámetros generales', sub: 'Nombre del gimnasio, días de advertencia y mensajes de WhatsApp' },
  { slug: 'tipos-de-pago', label: 'Tipos de pago', title: 'Tipos de pago', sub: 'Opciones al registrar pagos y ventas' },
  { slug: 'planes', label: 'Planes', title: 'Planes', sub: 'Nombre, duración (meses o días) y monto sugerido' },
  { slug: 'estados-de-alumno', label: 'Estados de alumno', title: 'Estados de alumno', sub: 'Activo, De baja e Inactivo son del sistema y no se pueden quitar' },
  { slug: 'categorias-de-producto', label: 'Categorías de producto', title: 'Categorías de producto', sub: 'Para clasificar el inventario' },
  { slug: 'tipos-de-egreso', label: 'Tipos de egreso', title: 'Tipos de egreso', sub: 'Gastos del gimnasio que se registran cada mes (Egresos)' },
  { slug: 'categorias-mujer', label: 'Categorías Mujer', title: 'Categorías Mujer (Amateur)', sub: 'Se asignan según el peso' },
  { slug: 'categorias-hombre', label: 'Categorías Hombre', title: 'Categorías Hombre (Amateur)', sub: 'Se asignan según el peso' },
] as const
export type SettingsSlug = (typeof SETTINGS_SECTIONS)[number]['slug']


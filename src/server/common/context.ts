/** Quién ejecuta la operación; se propaga a la base para la auditoría. */
export interface Actor {
  id: string
  username: string
}

export interface RequestContext {
  actor: Actor | null
}

import { cn } from '@/lib/utils'

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string }

/** Select con el mismo look que `Input`. */
export function Select({ label, className, children, ...rest }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>}
      <select
        className={cn('w-full py-2.5 px-3 text-sm bg-background/80 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:border-action focus:ring-action/30 transition-all', className)}
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}

import { cn } from '@/lib/utils'

export function Avatar({
  name,
  src,
  color,
  className,
}: {
  name: string
  src?: string | null
  color?: string | null
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src) {
    return <img src={src} alt={name} className={cn('h-10 w-10 rounded-full object-cover', className)} />
  }

  return (
    <div
      className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', className)}
      style={{ backgroundColor: color ?? 'var(--color-primary)' }}
    >
      {initials}
    </div>
  )
}

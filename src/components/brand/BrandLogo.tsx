/** Escudo de Águilas (del HTML original). */
export function BrandLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lgGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFD700" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
        <linearGradient id="lgRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EF4444" /><stop offset="1" stopColor="#D90429" /></linearGradient>
      </defs>
      <path d="M60 8 106 24v38c0 26-20 42-46 52C34 104 14 88 14 62V24Z" fill="#0F172A" stroke="url(#lgGold)" strokeWidth="5" strokeLinejoin="miter" />
      <path d="M26 78 38 52l14-14 18-4 14 6 16 8-14 6-5 9-11 5-3 14-12 6-6-8-9-4Z" fill="url(#lgRed)" />
      <path d="M70 34l14 6 16 8-14 6-9-3Z" fill="url(#lgGold)" />
      <path d="M60 46l8 4-8 2Z" fill="#0F172A" />
      <circle cx="62" cy="49" r="1.8" fill="#fff" />
      <path d="M30 86l-8 14M40 90l-4 14" stroke="url(#lgGold)" strokeWidth="3" strokeLinecap="square" />
    </svg>
  )
}

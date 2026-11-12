export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground font-sans antialiased flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#FFD700_1px,transparent_1px)] [background-size:24px_24px] z-0" />
        <div className="relative z-10 w-full flex items-center justify-center">{children}</div>
      </div>
    </div>
  )
}

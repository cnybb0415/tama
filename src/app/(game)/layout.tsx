export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', position: 'relative' }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: "url('/picture/login_bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
        zIndex: 0,
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100dvh',
      }}>
        {children}
      </div>
    </div>
  )
}

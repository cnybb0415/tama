export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* 다마고치 회색 배경을 페이지 전체로 확장 */}
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
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}>
        {children}
      </div>
    </div>
  )
}

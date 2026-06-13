'use client'

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes drift1 {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(-40px,30px) scale(1.08)}
        }
        @keyframes drift2 {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(50px,-25px) scale(1.06)}
        }
        @keyframes drift3 {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(-30px,40px) scale(1.04)}
          66%{transform:translate(35px,-20px) scale(0.97)}
        }
      `}</style>

      {/* Large top-center hero glow */}
      <div
        className="absolute"
        style={{
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(88,85,212,0.18) 0%, rgba(88,85,212,0.06) 40%, transparent 70%)',
          animation: 'drift1 18s ease-in-out infinite',
        }}
      />

      {/* Bottom-left accent glow */}
      <div
        className="absolute"
        style={{
          bottom: '-10%',
          left: '-10%',
          width: '55%',
          height: '55%',
          background: 'radial-gradient(ellipse at center, rgba(88,85,212,0.10) 0%, transparent 65%)',
          animation: 'drift2 22s ease-in-out infinite',
        }}
      />

      {/* Top-right subtle glow */}
      <div
        className="absolute"
        style={{
          top: '5%',
          right: '-5%',
          width: '40%',
          height: '45%',
          background: 'radial-gradient(ellipse at center, rgba(120,116,230,0.08) 0%, transparent 65%)',
          animation: 'drift3 26s ease-in-out infinite',
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Edge vignette to fade dots at edges */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 85% 80% at 50% 40%, transparent 50%, #0B1120 100%)',
        }}
      />
    </div>
  )
}

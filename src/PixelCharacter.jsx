import { useEffect, useRef } from 'react'

const LEVEL_COLORS = [
  { body: '#378ADD', belt: '#0C447C', name: 'Rekrut',    nameColor: '#378ADD' },
  { body: '#1D9E75', belt: '#085041', name: 'Kämpfer',   nameColor: '#1D9E75' },
  { body: '#BA7517', belt: '#633806', name: 'Krieger',   nameColor: '#BA7517' },
  { body: '#7F77DD', belt: '#3C3489', name: 'Ritter',    nameColor: '#7F77DD' },
  { body: '#D85A30', belt: '#4A1B0C', name: 'Champion',  nameColor: '#D85A30' },
  { body: '#639922', belt: '#173404', name: 'Held',      nameColor: '#639922' },
  { body: '#D4537E', belt: '#4B1528', name: 'Legende',   nameColor: '#D4537E' },
  { body: '#888780', belt: '#2C2C2A', name: 'Meister',   nameColor: '#888780' },
]

function getLevel(xp) {
  const thresholds = [0, 100, 250, 500, 900, 1500, 2500, 4000]
  let lvl = 1
  thresholds.forEach((t, i) => { if (xp >= t) lvl = i + 1 })
  return Math.min(lvl, thresholds.length)
}

export default function PixelCharacter({ totalXP, justCompleted }) {
  const charRef   = useRef(null)
  const floatRef  = useRef(null)
  const prevXP    = useRef(totalXP)
  const prevLevel = useRef(getLevel(totalXP))

  const level   = getLevel(totalXP)
  const colors  = LEVEL_COLORS[level - 1] || LEVEL_COLORS[0]
  const thresholds = [0, 100, 250, 500, 900, 1500, 2500, 4000]
  const xpThis  = thresholds[level - 1] || 0
  const xpNext  = thresholds[level] || xpThis + 500
  const pct     = Math.min(((totalXP - xpThis) / (xpNext - xpThis)) * 100, 100)

  useEffect(() => {
    const newLevel = getLevel(totalXP)
    const gained   = totalXP - prevXP.current

    if (gained > 0 && charRef.current) {
      if (newLevel > prevLevel.current) {
        charRef.current.style.animation = 'none'
        void charRef.current.offsetWidth
        charRef.current.style.animation = 'hq-levelup 0.7s ease-in-out, hq-idle 1.4s ease-in-out 0.7s infinite'
      }
      if (floatRef.current) {
        floatRef.current.textContent = '+' + gained + ' XP'
        floatRef.current.style.animation = 'none'
        void floatRef.current.offsetWidth
        floatRef.current.style.animation = 'hq-xpfloat 1.2s ease-out forwards'
      }
    }
    prevXP.current    = totalXP
    prevLevel.current = newLevel
  }, [totalXP])

  return (
    <>
      <style>{`
        @keyframes hq-idle    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes hq-levelup { 0%{transform:scale(1) rotate(0)} 25%{transform:scale(1.35) rotate(-8deg)} 75%{transform:scale(1.35) rotate(8deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes hq-xpfloat { 0%{opacity:0;transform:translateX(-50%) translateY(0)} 20%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-36px)} }
        @keyframes hq-shine   { 0%,100%{opacity:0} 50%{opacity:1} }
      `}</style>

      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', textAlign: 'center' }}>

        {/* Character name & level */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#6b6a65', textTransform: 'uppercase', letterSpacing: 0.5 }}>Dein Held</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: colors.nameColor, background: colors.nameColor + '18', border: '0.5px solid ' + colors.nameColor + '44', borderRadius: 99, padding: '3px 10px' }}>
            LVL {level} · {colors.name}
          </span>
        </div>

        {/* Character sprite */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
          <div ref={floatRef} style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#1D9E75', opacity: 0, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10 }} />

          <div ref={charRef} style={{ animation: 'hq-idle 1.4s ease-in-out infinite', display: 'inline-block' }}>
            <svg width="64" height="96" viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg">
              {/* Hair / helmet */}
              <rect x="14" y="1"  width="20" height="4"  rx="1" fill={colors.belt}/>
              {/* Head */}
              <rect x="14" y="3"  width="20" height="18" rx="3" fill="#F5C4B3"/>
              {/* Eyes */}
              <rect x="18" y="9"  width="4"  height="4"  rx="1" fill="#1a1a18"/>
              <rect x="26" y="9"  width="4"  height="4"  rx="1" fill="#1a1a18"/>
              {/* Eye shine */}
              <rect x="19" y="10" width="1"  height="1"  fill="white"/>
              <rect x="27" y="10" width="1"  height="1"  fill="white"/>
              {/* Mouth */}
              <rect x="20" y="16" width="8"  height="2"  rx="1" fill="#D85A30"/>
              {/* Ear */}
              <rect x="12" y="8"  width="3"  height="5"  rx="1" fill="#F0997B"/>
              <rect x="33" y="8"  width="3"  height="5"  rx="1" fill="#F0997B"/>
              {/* Body / tunic */}
              <rect x="13" y="21" width="22" height="24" rx="2" fill={colors.body}/>
              {/* Belt */}
              <rect x="13" y="38" width="22" height="4"  fill={colors.belt}/>
              <rect x="21" y="38" width="6"  height="4"  fill="#FAC775"/>
              {/* Chest detail */}
              <rect x="15" y="23" width="5"  height="12" rx="1" fill={colors.body === '#378ADD' ? '#B5D4F4' : 'rgba(255,255,255,0.2)'}/>
              {/* Left arm */}
              <rect x="7"  y="21" width="7"  height="20" rx="3" fill={colors.body}/>
              <rect x="7"  y="39" width="7"  height="5"  rx="2" fill="#F5C4B3"/>
              {/* Right arm */}
              <rect x="34" y="21" width="7"  height="20" rx="3" fill={colors.body}/>
              <rect x="34" y="39" width="7"  height="5"  rx="2" fill="#F5C4B3"/>
              {/* Sword (right hand) */}
              {level >= 2 && <>
                <rect x="41" y="14" width="3"  height="24" rx="1" fill="#B4B2A9"/>
                <rect x="38" y="22" width="9"  height="2"  rx="1" fill="#FAC775"/>
                <rect x="41" y="11" width="3"  height="5"  rx="1" fill="#FAC775"/>
              </>}
              {/* Shield (left hand) – lvl 3+ */}
              {level >= 3 && <>
                <rect x="2"  y="25" width="8"  height="10" rx="2" fill={colors.belt}/>
                <rect x="4"  y="27" width="4"  height="6"  rx="1" fill={colors.body}/>
              </>}
              {/* Cape – lvl 5+ */}
              {level >= 5 && <>
                <rect x="12" y="21" width="3"  height="22" rx="1" fill="#D85A30" opacity="0.8"/>
              </>}
              {/* Crown – lvl 7+ */}
              {level >= 7 && <>
                <rect x="16" y="0"  width="16" height="5"  rx="1" fill="#FAC775"/>
                <rect x="18" y="-2" width="3"  height="4"  rx="1" fill="#FAC775"/>
                <rect x="23" y="-3" width="3"  height="5"  rx="1" fill="#FAC775"/>
                <rect x="28" y="-2" width="3"  height="4"  rx="1" fill="#FAC775"/>
              </>}
              {/* Legs */}
              <rect x="14" y="45" width="9"  height="22" rx="2" fill="#2C2C2A"/>
              <rect x="25" y="45" width="9"  height="22" rx="2" fill="#444441"/>
              {/* Boots */}
              <rect x="12" y="63" width="12" height="6"  rx="2" fill="#1a1a18"/>
              <rect x="24" y="63" width="12" height="6"  rx="2" fill="#2C2C2A"/>
              {/* Gold stars for level up  */}
              {level >= 4 && <rect x="10" y="3" width="4" height="4" rx="1" fill="#FAC775" style={{ animation: 'hq-shine 2s ease-in-out infinite' }}/>}
              {level >= 6 && <rect x="34" y="3" width="4" height="4" rx="1" fill="#FAC775" style={{ animation: 'hq-shine 2s ease-in-out 0.5s infinite' }}/>}
            </svg>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6a65', marginBottom: 5 }}>
          <span>XP bis Level {level + 1}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div style={{ background: '#f5f4f0', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${colors.body}88, ${colors.body})`, width: pct + '%', transition: 'width 0.6s ease' }}/>
        </div>

        {/* Level milestones */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {LEVEL_COLORS.map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: i < level ? c.body : '#f5f4f0', border: `0.5px solid ${i < level ? c.body : 'rgba(0,0,0,0.1)'}`, transition: 'all 0.3s' }} title={`LVL ${i+1}: ${c.name}`}/>
          ))}
        </div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#6b6a65', marginTop: 6 }}>
          {LEVEL_COLORS.slice(level).map(c => c.name).slice(0,3).join(' → ')}
        </div>
      </div>
    </>
  )
}

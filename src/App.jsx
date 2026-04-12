import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import PixelCharacter from './PixelCharacter'
import { getLang, setLang, t } from './i18n'
import './index.css'

const XP_PER_HABIT     = 20
const STREAK_BONUS     = 5
const FREE_LIMIT       = 3
const STRIPE_LINK      = 'https://buy.stripe.com/test_aFacN46o4elS2kudNT7Re00'
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000]
const DAY_LABELS_EN    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS_DE    = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// ── Dark Mode Hook ────────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('hq-dark') === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('hq-dark', dark) } catch {}
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
    document.body.style.background = dark ? '#1a1a18' : '#f5f4f0'
  }, [dark])
  return [dark, setDark]
}

// ── Dark-aware style helper ───────────────────────────────────────────────────
function ds(dark) {
  return {
    bg:      dark ? '#1a1a18' : '#f5f4f0',
    card:    dark ? '#2a2a28' : '#fff',
    border:  dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    border2: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    text:    dark ? '#e8e6e0' : '#1a1a18',
    text2:   dark ? '#9e9d97' : '#6b6a65',
    text3:   dark ? '#6b6a65' : '#9e9d97',
    input:   dark ? '#333330' : '#f5f4f0',
    cardDone:   dark ? '#04342C' : '#E1F5EE',
    borderDone: dark ? '#085041' : '#9FE1CB',
    premium:    dark ? '#412402' : '#FAEEDA',
    premiumBorder: dark ? '#854F0B' : '#FAC775',
    premiumText:   dark ? '#EF9F27' : '#633806',
    premiumText2:  dark ? '#FAC775' : '#854F0B',
    error:      dark ? '#501313' : '#FCEBEB',
    errorBorder: dark ? '#791F1F' : '#F7C1C1',
    shieldText:  dark ? '#EF9F27' : '#633806',
    shieldText2: dark ? '#FAC775' : '#854F0B',
  }
}

// ── Dark Mode Toggle Button ───────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} title={dark ? 'Light Mode' : 'Dark Mode'} style={{
      padding: '4px 10px', fontSize: 14, background: 'transparent',
      border: '0.5px solid ' + (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
      borderRadius: 8, cursor: 'pointer', color: dark ? '#e8e6e0' : '#6b6a65',
      fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

// ── Notification Settings Panel ───────────────────────────────────────────────
function NotifToggle({ on, onToggle, dark }) {
  const d = ds(dark)
  return (
    <button onClick={onToggle} style={{
      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
      background: on ? '#1D9E75' : (dark ? '#444441' : '#D3D1C7'),
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: 3,
        transform: on ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s',
      }} />
    </button>
  )
}

function NotificationPanel({ dark, lang }) {
  const d = ds(dark)
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hq-notifs')) || { daily: true, streak: true, levelup: true, time: '08:00' } }
    catch { return { daily: true, streak: true, levelup: true, time: '08:00' } }
  })
  const [permStatus, setPermStatus] = useState(() => {
    if (typeof Notification !== 'undefined') return Notification.permission
    return 'unsupported'
  })

  useEffect(() => {
    try { localStorage.setItem('hq-notifs', JSON.stringify(notifs)) } catch {}
  }, [notifs])

  const requestPermission = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPermStatus(perm)
  }

  const rows = lang === 'de'
    ? [
        { key: 'daily',   label: 'Tägliche Erinnerung', sub: 'Erinnere mich an meine Habits', hasTime: true },
        { key: 'streak',  label: 'Streak-Warnung',      sub: 'Wenn ein Streak in Gefahr ist' },
        { key: 'levelup', label: 'Level-Up!',            sub: 'Feiere dein nächstes Level' },
      ]
    : [
        { key: 'daily',   label: 'Daily reminder', sub: 'Remind me about my habits', hasTime: true },
        { key: 'streak',  label: 'Streak warning', sub: 'When a streak is at risk' },
        { key: 'levelup', label: 'Level up!',      sub: 'Celebrate your next level' },
      ]

  return (
    <div style={{ background: d.card, border: '0.5px solid ' + d.border, borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: d.text2, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        🔔 {lang === 'de' ? 'Benachrichtigungen' : 'Notifications'}
      </div>
      {rows.map((r) => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid ' + d.border }}>
          <div>
            <div style={{ fontSize: 12, color: d.text }}>{r.label}</div>
            <div style={{ fontSize: 10, color: d.text3, marginTop: 2 }}>{r.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {r.hasTime && notifs[r.key] && (
              <input type="time" value={notifs.time}
                onChange={(e) => setNotifs({ ...notifs, time: e.target.value })}
                style={{ fontSize: 11, color: '#BA7517', background: 'transparent', border: '0.5px solid ' + d.border, borderRadius: 6, padding: '3px 8px', fontFamily: 'inherit', cursor: 'pointer' }}
              />
            )}
            <NotifToggle on={notifs[r.key]} onToggle={() => setNotifs({ ...notifs, [r.key]: !notifs[r.key] })} dark={dark} />
          </div>
        </div>
      ))}
      {permStatus !== 'granted' && permStatus !== 'unsupported' && (
        <button onClick={requestPermission} style={{
          width: '100%', padding: 8, marginTop: 10, background: 'transparent',
          border: '0.5px solid ' + d.border, borderRadius: 8, fontSize: 11,
          color: '#378ADD', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {lang === 'de' ? '🔔 Browser-Benachrichtigungen aktivieren' : '🔔 Enable browser notifications'}
        </button>
      )}
      {permStatus === 'granted' && (
        <div style={{ fontSize: 10, color: '#1D9E75', marginTop: 8, textAlign: 'center' }}>
          ✓ {lang === 'de' ? 'Benachrichtigungen aktiv' : 'Notifications enabled'}
        </div>
      )}
    </div>
  )
}

// ── Language Switcher ─────────────────────────────────────────────────────────
function LangSwitch({ lang, onChange, dark }) {
  const d = ds(dark)
  return (
    <div style={{ display: 'flex', gap: 4, background: d.input, borderRadius: 8, padding: 3 }}>
      {['en', 'de'].map(l => (
        <button key={l} onClick={() => onChange(l)} style={{
          padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: lang === l ? '#BA7517' : 'transparent',
          color: lang === l ? 'white' : d.text2,
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          transition: 'all 0.15s',
        }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ── Weekly Calendar ───────────────────────────────────────────────────────────
function WeekCalendar({ userId, lang, dark }) {
  const [logs, setLogs] = useState([])
  const tx = t(lang)
  const d = ds(dark)
  const DAY_LABELS = lang === 'de' ? DAY_LABELS_DE : DAY_LABELS_EN

  useEffect(() => {
    if (!userId) return
    const loadLogs = async () => {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const dd = new Date(); dd.setDate(dd.getDate() - i)
        days.push(dd.toISOString().split('T')[0])
      }
      const { data } = await supabase.from('daily_logs').select('*').eq('user_id', userId).in('log_date', days)
      setLogs(data || [])
    }
    loadLogs()
  }, [userId])

  const getDay = (offset) => {
    const dd = new Date(); dd.setDate(dd.getDate() - (6 - offset))
    return dd.toISOString().split('T')[0]
  }
  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ ...s.card, background: d.card, border: '0.5px solid ' + d.border }}>
      <div style={{ ...s.sectionTitle, color: d.text2 }}>{tx.thisWeek}</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
        {DAY_LABELS.map((label, i) => {
          const date    = getDay(i)
          const log     = logs.find(l => l.log_date === date)
          const pct     = log && log.total > 0 ? log.completed / log.total : 0
          const isToday = date === today
          const isDone  = pct >= 1 && log?.total > 0
          const hasAny  = pct > 0
          let bg = d.input
          if (isDone) bg = '#1D9E75'
          else if (hasAny) bg = '#9FE1CB'
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: bg, border: isToday ? '2px solid #BA7517' : '1px solid ' + d.border, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, fontSize: 10, color: isDone ? 'white' : d.text2, fontFamily: isDone ? "'Press Start 2P', monospace" : 'Inter, sans-serif', transition: 'all 0.3s' }}>
                {isDone ? '✓' : log?.completed || ''}
              </div>
              <div style={{ fontSize: 9, color: isToday ? '#BA7517' : d.text2, fontWeight: isToday ? 600 : 400 }}>{label}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'center' }}>
        {[{ color: '#1D9E75', label: tx.calendar.allDone },{ color: '#9FE1CB', label: tx.calendar.partial },{ color: d.input, label: tx.calendar.noEntry }].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, border: '1px solid ' + d.border }} />
            <span style={{ fontSize: 10, color: d.text2 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Streak Shield Banner ──────────────────────────────────────────────────────
function StreakShieldBanner({ shields, onUse, isPremium, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  if (!isPremium) return null
  if (shields <= 0) return (
    <div style={{ ...s.shieldBanner, background: d.input, borderColor: d.border }}>
      <span style={{ fontSize: 20 }}>🛡️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: d.text2, marginBottom: 3 }}>STREAK SHIELD</div>
        <div style={{ fontSize: 11, color: d.text2 }}>{tx.shieldNone}</div>
      </div>
    </div>
  )
  return (
    <div style={{ ...s.shieldBanner, background: d.premium, borderColor: d.premiumBorder }}>
      <span style={{ fontSize: 20 }}>🛡️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: d.shieldText, marginBottom: 3 }}>{tx.shieldAvailable}</div>
        <div style={{ fontSize: 11, color: d.shieldText2 }}>{shields}{tx.shieldText}</div>
      </div>
      <button style={s.shieldBtn} onClick={onUse}>{tx.shieldUse}</button>
    </div>
  )
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth, lang, onLangChange, dark, onDarkToggle }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isLogin,  setIsLogin]  = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const tx = t(lang)
  const d = ds(dark)

  const handle = async () => {
    if (!email || !password) { setError(tx.enterCredentials); return }
    setLoading(true); setError('')
    let result
    if (isLogin) { result = await supabase.auth.signInWithPassword({ email, password }) }
    else { result = await supabase.auth.signUp({ email, password }) }
    setLoading(false)
    if (result.error) { setError(result.error.message); return }
    if (!isLogin && !result.data.session) { setError(tx.confirmEmail); return }
    onAuth(result.data.session?.user)
  }

  return (
    <div style={{ ...s.authWrap, background: d.bg }}>
      <div style={{ ...s.authCard, background: d.card, border: '0.5px solid ' + d.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <a href="/landing.html" style={{ ...s.backLink, color: d.text2 }}>{tx.backToHome}</a>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <DarkToggle dark={dark} onToggle={onDarkToggle} />
            <LangSwitch lang={lang} onChange={onLangChange} dark={dark} />
          </div>
        </div>
        <div style={s.logo}>{tx.appName}</div>
        <div style={{ ...s.tagline, color: d.text2 }}>{tx.tagline}</div>
        <div style={{ marginTop: 24 }}>
          <input style={{ ...s.input, width: '100%', marginBottom: 10, background: d.input, color: d.text, borderColor: d.border2 }} type="email" placeholder={tx.email} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          <input style={{ ...s.input, width: '100%', marginBottom: 10, background: d.input, color: d.text, borderColor: d.border2 }} type="password" placeholder={tx.password} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          {error && <div style={{ ...s.errorMsg, background: d.error, borderColor: d.errorBorder }}>{error}</div>}
          <button style={{ ...s.addBtn, width: '100%', padding: 12, fontSize: 8, marginTop: 4 }} onClick={handle} disabled={loading}>
            {loading ? '...' : isLogin ? tx.login : tx.register}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button style={s.switchBtn} onClick={() => { setIsLogin(!isLogin); setError('') }}>
            {isLogin ? tx.noAccount : tx.hasAccount}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stats Panel ───────────────────────────────────────────────────────────────
function StatsPanel({ stats, shields, isPremium, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  const items = [
    { label: tx.stats.dayStreak,  value: stats.current_streak  + 'd', color: '#D85A30' },
    { label: tx.stats.bestStreak, value: stats.longest_streak  + 'd', color: '#BA7517' },
    { label: tx.stats.totalDone,  value: stats.total_completed + 'x', color: '#1D9E75' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isPremium ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap: 8, marginBottom: '1rem' }}>
      {items.map((item, i) => (
        <div key={i} style={{ ...s.statCard, background: d.card, border: '0.5px solid ' + d.border }}>
          <div style={{ ...s.statValue, color: item.color }}>{item.value}</div>
          <div style={{ ...s.statLabel, color: d.text2 }}>{item.label}</div>
        </div>
      ))}
      {isPremium && (
        <div style={{ ...s.statCard, background: d.card, border: '0.5px solid ' + d.border }}>
          <div style={{ ...s.statValue, color: shields > 0 ? '#BA7517' : '#B4B2A9' }}>{shields}x 🛡️</div>
          <div style={{ ...s.statLabel, color: d.text2 }}>{tx.stats.shields}</div>
        </div>
      )}
    </div>
  )
}

// ── Premium Banner ────────────────────────────────────────────────────────────
function PremiumBanner({ onUpgrade, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  return (
    <div style={{ ...s.premiumBanner, background: d.premium, borderColor: d.premiumBorder }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: d.premiumText, marginBottom: 4 }}>{tx.freeLimitReached}</div>
        <div style={{ fontSize: 12, color: d.premiumText2 }}>{tx.freeLimitText}</div>
      </div>
      <button style={s.upgradeBtn} onClick={onUpgrade}>{tx.upgradeBtn}</button>
    </div>
  )
}

// ── Premium Modal ─────────────────────────────────────────────────────────────
function PremiumModal({ onClose, onUpgrade, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 400, textAlign: 'center', background: d.card, border: '0.5px solid ' + d.border }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#BA7517', marginBottom: 8 }}>{tx.premiumTitle}</div>
        <div style={{ fontSize: 13, color: d.text2, marginBottom: 20, lineHeight: 1.7 }}>{tx.premiumSubtitle}</div>
        <div style={{ background: d.input, borderRadius: 12, padding: '1rem', marginBottom: 20, textAlign: 'left' }}>
          {tx.premiumFeatures.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: d.text, padding: '5px 0', borderBottom: i < 3 ? '0.5px solid ' + d.border : 'none' }}>{f}</div>
          ))}
        </div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#BA7517', marginBottom: 4 }}>{tx.premiumPrice}</div>
        <div style={{ fontSize: 11, color: d.text2, marginBottom: 16 }}>{tx.premiumPeriod}</div>
        <button style={{ ...s.upgradeBtn, width: '100%', padding: 14, fontSize: 9, marginBottom: 8 }} onClick={onUpgrade}>{tx.upgradeNow}</button>
        <button style={{ ...s.cancelBtn, color: d.text2, borderColor: d.border }} onClick={onClose}>{tx.maybeLater}</button>
      </div>
    </div>
  )
}

// ── Shield Modal ──────────────────────────────────────────────────────────────
function ShieldModal({ onConfirm, onClose, currentStreak, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth: 360, textAlign: 'center', background: d.card, border: '0.5px solid ' + d.border }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#BA7517', marginBottom: 12 }}>{tx.shieldTitle}</div>
        <div style={{ fontSize: 13, color: d.text2, marginBottom: 20, lineHeight: 1.7 }}>
          {tx.shieldBody.split('\n').map((line, i) => <div key={i}>{line.replace('streak?', `${currentStreak}-day streak?`)}</div>)}
        </div>
        <div style={{ fontSize: 11, color: '#B4B2A9', marginBottom: 20 }}>{tx.shieldLeft}</div>
        <button style={{ ...s.upgradeBtn, width: '100%', padding: 12, fontSize: 8, marginBottom: 8 }} onClick={onConfirm}>{tx.shieldConfirm}</button>
        <button style={{ ...s.cancelBtn, color: d.text2, borderColor: d.border }} onClick={onClose}>{tx.cancel}</button>
      </div>
    </div>
  )
}

// ── XPBar ─────────────────────────────────────────────────────────────────────
function XPBar({ totalXP, lang, dark }) {
  const tx = t(lang)
  const d = ds(dark)
  const lvl    = LEVEL_THRESHOLDS.reduce((acc, thr, i) => totalXP >= thr ? i + 1 : acc, 1)
  const xpThis = LEVEL_THRESHOLDS[lvl - 1] || 0
  const xpNext = LEVEL_THRESHOLDS[lvl] || xpThis + 500
  const pct    = Math.min(((totalXP - xpThis) / (xpNext - xpThis)) * 100, 100)
  return (
    <div style={{ ...s.xpSection, background: d.card, border: '0.5px solid ' + d.border }}>
      <div style={s.xpTop}>
        <span style={{ ...s.levelBadge, background: d.premium, borderColor: d.premiumBorder }}>{lang === 'de' ? 'LVL' : 'LVL'} {lvl}</span>
        <span style={{ ...s.xpLabel, color: d.text2 }}>{totalXP - xpThis} / {xpNext - xpThis} XP</span>
      </div>
      <div style={{ ...s.xpBarBg, background: d.input, borderColor: d.border }}><div style={{ ...s.xpBarFill, width: pct + '%' }} /></div>
      <div style={s.xpStats}><span style={{ ...s.xpStat, color: d.text2 }}>{tx.total}: <strong>{totalXP}</strong> XP</span></div>
    </div>
  )
}

// ── AddHabitForm ──────────────────────────────────────────────────────────────
function AddHabitForm({ onAdd, isPremium, habitCount, lang, dark }) {
  const [name, setName] = useState('')
  const [cat,  setCat]  = useState('health')
  const tx = t(lang)
  const d = ds(dark)
  const atLimit = !isPremium && habitCount >= FREE_LIMIT
  const handle = () => { if (!name.trim() || atLimit) return; onAdd(name.trim(), cat); setName('') }
  return (
    <div style={{ ...s.card, background: d.card, border: '0.5px solid ' + d.border, ...(atLimit ? { opacity: 0.6 } : {}) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ ...s.sectionTitle, color: d.text2 }}>{tx.newHabit}</div>
        {!isPremium && <span style={{ fontSize: 11, color: habitCount >= FREE_LIMIT ? '#E24B4A' : d.text2 }}>{habitCount}/{FREE_LIMIT} free</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...s.input, background: d.input, color: d.text, borderColor: d.border2 }} placeholder={atLimit ? tx.upgradePlaceholder : tx.addPlaceholder}
          value={name} maxLength={50} disabled={atLimit}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        <button style={{ ...s.addBtn, ...(atLimit ? { background: '#B4B2A9' } : {}) }} onClick={handle} disabled={atLimit}>+ ADD</button>
      </div>
      {!atLimit && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {Object.keys(tx.cats).map(c => (
            <button key={c} style={{ ...s.catBtn, borderColor: d.border, color: d.text2, ...(cat === c ? s.catBtnActive : {}) }} onClick={() => setCat(c)}>{tx.cats[c]}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── EditModal ─────────────────────────────────────────────────────────────────
function EditModal({ habit, onSave, onClose, lang, dark }) {
  const [name, setName] = useState(habit.name)
  const [cat,  setCat]  = useState(habit.cat)
  const tx = t(lang)
  const d = ds(dark)
  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modal, background: d.card, border: '0.5px solid ' + d.border }}>
        <div style={{ ...s.sectionTitle, color: d.text2 }}>{tx.editHabit}</div>
        <input style={{ ...s.input, width: '100%', background: d.input, color: d.text, borderColor: d.border2 }} value={name} maxLength={50} autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(name, cat); if (e.key === 'Escape') onClose() }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {Object.keys(tx.cats).map(c => (
            <button key={c} style={{ ...s.catBtn, borderColor: d.border, color: d.text2, ...(cat === c ? s.catBtnActive : {}) }} onClick={() => setCat(c)}>{tx.cats[c]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={{ ...s.cancelBtn, color: d.text2, borderColor: d.border }} onClick={onClose}>{tx.cancel}</button>
          <button style={s.saveBtn} onClick={() => onSave(name.trim(), cat)}>{tx.save}</button>
        </div>
      </div>
    </div>
  )
}

// ── HabitCard (with Drag & Drop) ──────────────────────────────────────────────
function HabitCard({ habit, onToggle, onDelete, onEdit, lang, dark, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) {
  const tx = t(lang)
  const d = ds(dark)
  const catStyle = {
    health:  { background: dark ? '#173404' : '#EAF3DE', color: dark ? '#97C459' : '#639922' },
    lernen:  { background: dark ? '#04342C' : '#E1F5EE', color: dark ? '#5DCAA5' : '#1D9E75' },
    mindset: { background: dark ? '#4A1B0C' : '#FAECE7', color: dark ? '#F0997B' : '#D85A30' },
    kreativ: { background: dark ? '#412402' : '#FAEEDA', color: dark ? '#EF9F27' : '#BA7517' },
  }[habit.cat] || {}

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        ...s.habitCard,
        background: habit.done ? d.cardDone : d.card,
        border: isDragOver ? '2px solid #BA7517' : ('0.5px solid ' + (habit.done ? d.borderDone : d.border)),
        padding: isDragOver ? '12px 15px' : '13px 1rem',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.97)' : 'none',
        cursor: 'grab',
        transition: 'all 0.15s',
      }}
    >
      {/* Drag Handle */}
      <div style={{ color: d.text3, cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="3" cy="2" r="1.2" /><circle cx="9" cy="2" r="1.2" />
          <circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" />
          <circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" />
        </svg>
      </div>

      <button style={{ ...s.checkBtn, borderColor: d.border2, ...(habit.done ? s.checkBtnChecked : {}) }} onClick={() => onToggle(habit)}>
        {habit.done && <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5l4 4 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...s.habitName, color: habit.done ? d.text2 : d.text, ...(habit.done ? s.habitNameDone : {}) }}>{habit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ ...s.catPill, ...catStyle }}>{tx.cats[habit.cat] || habit.cat}</span>
          <span style={{ ...s.streak, color: d.text2 }}>{habit.streak >= 3 ? '🔥' : '○'} {habit.streak}d</span>
          <span style={{ ...s.xpPill, background: dark ? '#412402' : '#FAEEDA', color: dark ? '#EF9F27' : '#BA7517' }}>+{XP_PER_HABIT}XP</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={{ ...s.iconBtn, borderColor: d.border, color: d.text2 }} onClick={() => onEdit(habit)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2l2 2-6.5 6.5H2.5V8L9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button style={{ ...s.iconBtn, ...s.iconBtnDel, borderColor: d.border }} onClick={() => { if (confirm(tx.deleteConfirm)) onDelete(habit.id) }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5.5 3.5V2.5h2v1M4 3.5l.5 7.5h4l.5-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main App ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [dark, setDark]       = useDarkMode()
  const [lang, setLangState]  = useState(getLang)
  const [user, setUser]       = useState(null)
  const [habits, setHabits]   = useState([])
  const [totalXP, setTotalXP] = useState(0)
  const [isPremium, setIsPremium]     = useState(false)
  const [shields, setShields]         = useState(0)
  const [stats, setStats]             = useState({ current_streak: 0, longest_streak: 0, total_completed: 0 })
  const [loading, setLoading]         = useState(true)
  const [editingHabit, setEditingHabit] = useState(null)
  const [showPremium, setShowPremium]   = useState(false)
  const [showShield, setShowShield]     = useState(false)
  const [showNotifs, setShowNotifs]     = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [toast, setToast] = useState({ msg: '', show: false })

  // Drag & Drop state
  const [dragId, setDragId]         = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const tx = t(lang)
  const d = ds(dark)

  const handleLangChange = (l) => { setLang(l); setLangState(l) }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) { loadHabits(); loadProfile() } }, [user])

  const loadHabits = async () => {
    const { data, error } = await supabase.from('habits').select('*').order('sort_order', { ascending: true })
    if (!error && data) {
      setHabits(data)
      const xp = data.filter(h => h.done).reduce((sum, h) => sum + XP_PER_HABIT + Math.min(h.streak, 10) * STREAK_BONUS, 0)
      setTotalXP(xp)
    }
  }

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setIsPremium(data.is_premium || false)
      setShields(data.streak_shields || 0)
      setStats({ current_streak: data.current_streak || 0, longest_streak: data.longest_streak || 0, total_completed: data.total_completed || 0 })
      if (data.is_premium) {
        const today2      = new Date().toISOString().split('T')[0]
        const lastGranted = data.last_shield_granted
        if (!lastGranted || lastGranted.substring(0, 7) !== today2.substring(0, 7)) {
          await supabase.from('profiles').update({ streak_shields: 1, last_shield_granted: today2 }).eq('id', user.id)
          setShields(1)
        }
        const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
        if (data.last_active === twoDaysAgo.toISOString().split('T')[0] && data.current_streak > 0) setShowShield(true)
      }
    }
  }

  const useShield = async () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    await supabase.from('profiles').update({ streak_shields: shields - 1, last_active: yesterday.toISOString().split('T')[0] }).eq('id', user.id)
    setShields(prev => prev - 1); setShowShield(false)
    showToastMsg('🛡️ ' + (lang === 'de' ? 'Streak gerettet!' : 'Streak saved!'))
  }

  const updateDailyLog = async (updatedHabits) => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('daily_logs').upsert({ user_id: user.id, log_date: today, completed: updatedHabits.filter(h => h.done).length, total: updatedHabits.length }, { onConflict: 'user_id,log_date' })
  }

  const showToastMsg = (msg) => { setToast({ msg, show: true }); setTimeout(() => setToast(t => ({ ...t, show: false })), 2000) }

  const addHabit = async (name, cat) => {
    if (!isPremium && habits.length >= FREE_LIMIT) { setShowPremium(true); return }
    const sortOrder = habits.length > 0 ? Math.max(...habits.map(h => h.sort_order || 0)) + 1 : 0
    const { data, error } = await supabase.from('habits').insert([{ name, cat, streak: 0, done: false, user_id: user.id, sort_order: sortOrder }]).select()
    if (!error && data) { const nh = [...habits, data[0]]; setHabits(nh); showToastMsg(tx.questAdded); await updateDailyLog(nh) }
  }

  const toggleHabit = async (habit) => {
    const newDone = !habit.done
    const newStreak = newDone ? habit.streak + 1 : Math.max(0, habit.streak - 1)
    const earned = XP_PER_HABIT + Math.min(habit.streak, 10) * STREAK_BONUS
    const { error } = await supabase.from('habits').update({ done: newDone, streak: newStreak }).eq('id', habit.id)
    if (!error) {
      const nh = habits.map(h => h.id === habit.id ? { ...h, done: newDone, streak: newStreak } : h)
      setHabits(nh)
      if (newDone) {
        setTotalXP(xp => xp + earned); setJustCompleted(true); setTimeout(() => setJustCompleted(false), 1000)
        showToastMsg(`+${earned} ${tx.xpEarned}`)
        const newTotal = (stats.total_completed || 0) + 1
        const today = new Date().toISOString().split('T')[0]
        const ns = stats.current_streak + 1
        const nl = Math.max(stats.longest_streak, ns)
        await supabase.from('profiles').update({ total_completed: newTotal, current_streak: ns, longest_streak: nl, last_active: today }).eq('id', user.id)
        setStats({ current_streak: ns, longest_streak: nl, total_completed: newTotal })
      } else { setTotalXP(xp => Math.max(0, xp - earned)) }
      await updateDailyLog(nh)
    }
  }

  const deleteHabit = async (id) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) { const nh = habits.filter(h => h.id !== id); setHabits(nh); await updateDailyLog(nh) }
  }

  const editHabit = async (id, name, cat) => {
    const { error } = await supabase.from('habits').update({ name, cat }).eq('id', id)
    if (!error) setHabits(prev => prev.map(h => h.id === id ? { ...h, name, cat } : h))
  }

  // ── Drag & Drop Handlers ────────────────────────────────────────────────────
  const handleDragStart = (id) => setDragId(id)
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id) }
  const handleDrop = async (targetId) => {
    if (dragId === null || dragId === targetId) return
    const arr = [...habits]
    const fromIdx = arr.findIndex(h => h.id === dragId)
    const toIdx = arr.findIndex(h => h.id === targetId)
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    // Update sort_order locally
    const updated = arr.map((h, i) => ({ ...h, sort_order: i }))
    setHabits(updated)
    setDragId(null)
    setDragOverId(null)
    // Persist new order to Supabase
    for (const h of updated) {
      await supabase.from('habits').update({ sort_order: h.sort_order }).eq('id', h.id)
    }
  }
  const handleDragEnd = () => { setDragId(null); setDragOverId(null) }

  const logout = async () => { await supabase.auth.signOut(); setHabits([]); setTotalXP(0); setIsPremium(false); setStats({ current_streak: 0, longest_streak: 0, total_completed: 0 }) }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: d.text2, fontFamily: "'Press Start 2P', monospace", fontSize: 10, background: d.bg, minHeight: '100vh' }}>{tx.loading}</div>
  if (!user) return <AuthScreen onAuth={setUser} lang={lang} onLangChange={handleLangChange} dark={dark} onDarkToggle={() => setDark(!dark)} />

  const done = habits.filter(h => h.done).length
  const total = habits.length
  const pct = total ? Math.round(done / total * 100) : 0
  const today = new Date()
  const days = lang === 'de'
    ? ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
    : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = lang === 'de'
    ? ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
    : ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dateStr = `${days[today.getDay()]}, ${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`

  return (
    <div style={{ ...s.app, color: d.text }}>
      <div style={{ ...s.toast, ...(toast.show ? s.toastShow : {}) }}>{toast.msg}</div>
      <div style={s.header}>
        <a href="/landing.html" style={{ ...s.backLink, color: d.text2 }}>{tx.backToHome}</a>
        <div style={s.logo}>{tx.appName}</div>
        <div style={{ ...s.tagline, color: d.text2 }}>{tx.tagline}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <LangSwitch lang={lang} onChange={handleLangChange} dark={dark} />
          {isPremium && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, background: d.premium, color: '#BA7517', border: '0.5px solid ' + d.premiumBorder, borderRadius: 99, padding: '3px 8px' }}>{tx.premiumBadge}</span>}
          <DarkToggle dark={dark} onToggle={() => setDark(!dark)} />
          <button style={{
            padding: '4px 10px', fontSize: 14, background: showNotifs ? '#1D9E75' : 'transparent',
            border: '0.5px solid ' + (showNotifs ? '#1D9E75' : d.border),
            borderRadius: 8, cursor: 'pointer', color: showNotifs ? '#fff' : d.text2,
            fontFamily: 'Inter, sans-serif',
          }} onClick={() => setShowNotifs(!showNotifs)} title="Notifications">
            🔔
          </button>
          <button style={{ ...s.logoutBtn, color: d.text2, borderColor: d.border }} onClick={logout}>{tx.logout}</button>
        </div>
      </div>

      {showNotifs && <NotificationPanel dark={dark} lang={lang} />}

      <XPBar totalXP={totalXP} lang={lang} dark={dark} />
      <StatsPanel stats={stats} shields={shields} isPremium={isPremium} lang={lang} dark={dark} />
      <WeekCalendar userId={user.id} lang={lang} dark={dark} />
      {isPremium && <StreakShieldBanner shields={shields} onUse={() => setShowShield(true)} isPremium={isPremium} lang={lang} dark={dark} />}
      <PixelCharacter totalXP={totalXP} justCompleted={justCompleted} />
      {!isPremium && habits.length >= FREE_LIMIT && <PremiumBanner onUpgrade={() => setShowPremium(true)} lang={lang} dark={dark} />}

      <div style={{ textAlign: 'center', fontSize: 12, color: d.text2, marginBottom: '0.75rem' }}>{dateStr}</div>
      <AddHabitForm onAdd={addHabit} isPremium={isPremium} habitCount={habits.length} lang={lang} dark={dark} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ ...s.sectionTitle, color: d.text2 }}>{tx.todayQuests}</div>
        <div style={{ fontSize: 12, color: d.text2 }}>{done} / {total}</div>
      </div>
      <div style={{ ...s.dailyBarBg, background: d.card, borderColor: d.border }}><div style={{ ...s.dailyBarFill, width: pct + '%' }} /></div>

      {habits.length === 0 ? (
        <div style={{ ...s.emptyState, color: d.text2, background: d.card, borderColor: d.border2 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, marginBottom: 16 }}>?</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>{tx.noHabits.split('\n').map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.map(h => (
            <HabitCard
              key={h.id} habit={h} lang={lang} dark={dark}
              onToggle={toggleHabit} onDelete={deleteHabit} onEdit={setEditingHabit}
              onDragStart={() => handleDragStart(h.id)}
              onDragOver={(e) => handleDragOver(e, h.id)}
              onDrop={() => handleDrop(h.id)}
              onDragEnd={handleDragEnd}
              isDragging={dragId === h.id}
              isDragOver={dragOverId === h.id}
            />
          ))}
        </div>
      )}

      {!isPremium && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button style={{ ...s.upgradeBtn, padding: '10px 24px', fontSize: 8 }} onClick={() => setShowPremium(true)}>{tx.unlockPremium}</button>
        </div>
      )}

      {editingHabit && <EditModal habit={editingHabit} onSave={(name, cat) => { editHabit(editingHabit.id, name, cat); setEditingHabit(null) }} onClose={() => setEditingHabit(null)} lang={lang} dark={dark} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} onUpgrade={() => { window.open(STRIPE_LINK, '_blank'); setShowPremium(false) }} lang={lang} dark={dark} />}
      {showShield && <ShieldModal currentStreak={stats.current_streak} onConfirm={useShield} onClose={() => setShowShield(false)} lang={lang} dark={dark} />}
    </div>
  )
}

const s = {
  app:        { maxWidth: 520, margin: '0 auto' },
  header:     { textAlign: 'center', marginBottom: '1.5rem', position: 'relative' },
  logo:       { fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: '#BA7517' },
  tagline:    { fontSize: 12, color: '#6b6a65', marginTop: 6 },
  dateBanner: { textAlign: 'center', fontSize: 12, color: '#6b6a65', marginBottom: '0.75rem' },
  backLink:   { position: 'absolute', left: 0, top: 0, fontSize: 11, color: '#6b6a65', textDecoration: 'none', fontFamily: 'Inter, sans-serif' },
  logoutBtn:  { padding: '4px 10px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#6b6a65', fontFamily: 'Inter, sans-serif' },
  statCard:   { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '0.75rem', textAlign: 'center' },
  statValue:  { fontFamily: "'Press Start 2P', monospace", fontSize: 13, fontWeight: 500, marginBottom: 4 },
  statLabel:  { fontSize: 10, color: '#6b6a65' },
  shieldBanner: { background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 12, padding: '12px 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12 },
  shieldBtn:    { padding: '7px 12px', background: '#BA7517', color: 'white', border: 'none', borderRadius: 8, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer', whiteSpace: 'nowrap' },
  authWrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  authCard:  { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380 },
  errorMsg:  { fontSize: 12, color: '#E24B4A', background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '8px 12px', marginBottom: 8 },
  switchBtn: { background: 'none', border: 'none', color: '#BA7517', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' },
  premiumBanner: { background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 12, padding: '12px 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12 },
  upgradeBtn:    { padding: '8px 16px', background: '#BA7517', color: 'white', border: 'none', borderRadius: 8, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer', whiteSpace: 'nowrap' },
  xpSection:  { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' },
  xpTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  levelBadge: { fontFamily: "'Press Start 2P', monospace", fontSize: 9, background: '#FAEEDA', color: '#BA7517', border: '0.5px solid #FAC775', borderRadius: 8, padding: '4px 8px' },
  xpLabel:    { fontSize: 12, color: '#6b6a65' },
  xpBarBg:    { background: '#f5f4f0', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 99, height: 14, overflow: 'hidden' },
  xpBarFill:  { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#FAC775,#BA7517)', transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' },
  xpStats:    { display: 'flex', gap: 16, marginTop: 10 },
  xpStat:     { fontSize: 11, color: '#6b6a65' },
  card:         { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem' },
  sectionTitle: { fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#6b6a65', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 },
  input:        { flex: 1, padding: '9px 12px', fontSize: 14, border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 8, background: '#f5f4f0', color: '#1a1a18', fontFamily: 'Inter, sans-serif', outline: 'none' },
  addBtn:       { padding: '9px 14px', background: '#BA7517', color: 'white', border: 'none', borderRadius: 8, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer', whiteSpace: 'nowrap' },
  catBtn:       { padding: '4px 12px', fontSize: 11, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 99, background: 'transparent', color: '#6b6a65', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  catBtnActive: { background: '#FAEEDA', color: '#BA7517', borderColor: '#FAC775', fontWeight: 500 },
  dailyBarBg:   { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: '1rem' },
  dailyBarFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#9FE1CB,#1D9E75)', transition: 'width 0.4s ease' },
  habitCard:       { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '13px 1rem', display: 'flex', alignItems: 'center', gap: 12 },
  habitCardDone:   { background: '#E1F5EE', borderColor: '#9FE1CB' },
  habitName:       { fontSize: 14, fontWeight: 500, color: '#1a1a18', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  habitNameDone:   { textDecoration: 'line-through', color: '#6b6a65' },
  checkBtn:        { width: 30, height: 30, borderRadius: 8, border: '2px solid rgba(0,0,0,0.18)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkBtnChecked: { background: '#1D9E75', borderColor: '#1D9E75' },
  catPill:  { fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 500 },
  streak:   { fontSize: 11, color: '#6b6a65' },
  xpPill:   { fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#BA7517', background: '#FAEEDA', borderRadius: 4, padding: '2px 5px' },
  iconBtn:    { width: 28, height: 28, border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 8, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6a65' },
  iconBtnDel: { color: '#E24B4A' },
  emptyState: { textAlign: 'center', padding: '2.5rem 1rem', color: '#6b6a65', background: '#fff', border: '0.5px dashed rgba(0,0,0,0.18)', borderRadius: 12 },
  toast:     { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%) translateY(10px)', background: '#1D9E75', color: 'white', fontFamily: "'Press Start 2P', monospace", fontSize: 8, padding: '10px 20px', borderRadius: 8, opacity: 0, transition: 'opacity 0.25s, transform 0.25s', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 999 },
  toastShow: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal:        { background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 360 },
  saveBtn:      { padding: '8px 18px', background: '#BA7517', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  cancelBtn:    { padding: '8px 18px', background: 'transparent', color: '#6b6a65', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
}
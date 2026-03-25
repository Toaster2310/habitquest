import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PixelCharacter from './PixelCharacter'
import './index.css'

const XP_PER_HABIT = 20
const STREAK_BONUS = 5
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000]
const CAT_LABELS = { health: 'Gesundheit', lernen: 'Lernen', mindset: 'Mindset', kreativ: 'Kreativ' }

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [isLogin,  setIsLogin]  = useState(true)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async () => {
    if (!email || !password) { setError('Bitte E-Mail und Passwort eingeben.'); return }
    setLoading(true); setError('')
    let result
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }
    setLoading(false)
    if (result.error) { setError(result.error.message); return }
    if (!isLogin && !result.data.session) {
      setError('Bitte bestätige deine E-Mail, dann kannst du dich einloggen.')
      return
    }
    onAuth(result.data.session?.user)
  }

  return (
    <div style={s.authWrap}>
      <div style={s.authCard}>
        <div style={s.logo}>HabitQuest</div>
        <div style={s.tagline}>Dein persönliches Quest-Tagebuch</div>
        <div style={{ marginTop: 24 }}>
          <input style={{ ...s.input, width: '100%', marginBottom: 10 }} type="email"
            placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />
          <input style={{ ...s.input, width: '100%', marginBottom: 10 }} type="password"
            placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()} />
          {error && <div style={s.errorMsg}>{error}</div>}
          <button style={{ ...s.addBtn, width: '100%', padding: 12, fontSize: 8, marginTop: 4 }}
            onClick={handle} disabled={loading}>
            {loading ? '...' : isLogin ? 'EINLOGGEN' : 'REGISTRIEREN'}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button style={s.switchBtn} onClick={() => { setIsLogin(!isLogin); setError('') }}>
            {isLogin ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Einloggen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── XPBar ─────────────────────────────────────────────────────────────────────
function XPBar({ totalXP }) {
  const lvl    = LEVEL_THRESHOLDS.reduce((acc, t, i) => totalXP >= t ? i + 1 : acc, 1)
  const xpThis = LEVEL_THRESHOLDS[lvl - 1] || 0
  const xpNext = LEVEL_THRESHOLDS[lvl] || xpThis + 500
  const pct    = Math.min(((totalXP - xpThis) / (xpNext - xpThis)) * 100, 100)
  return (
    <div style={s.xpSection}>
      <div style={s.xpTop}>
        <span style={s.levelBadge}>LVL {lvl}</span>
        <span style={s.xpLabel}>{totalXP - xpThis} / {xpNext - xpThis} XP</span>
      </div>
      <div style={s.xpBarBg}>
        <div style={{ ...s.xpBarFill, width: pct + '%' }} />
      </div>
      <div style={s.xpStats}>
        <span style={s.xpStat}>Gesamt: <strong>{totalXP}</strong> XP</span>
      </div>
    </div>
  )
}

// ── AddHabitForm ──────────────────────────────────────────────────────────────
function AddHabitForm({ onAdd }) {
  const [name, setName] = useState('')
  const [cat,  setCat]  = useState('health')
  const handle = () => { if (!name.trim()) return; onAdd(name.trim(), cat); setName('') }
  return (
    <div style={s.card}>
      <div style={s.sectionTitle}>Neue Gewohnheit</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={s.input} placeholder="z.B. 30 Min. lesen..." value={name}
          maxLength={50} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()} />
        <button style={s.addBtn} onClick={handle}>+ ADD</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {Object.keys(CAT_LABELS).map(c => (
          <button key={c} style={{ ...s.catBtn, ...(cat === c ? s.catBtnActive : {}) }}
            onClick={() => setCat(c)}>{CAT_LABELS[c]}</button>
        ))}
      </div>
    </div>
  )
}

// ── EditModal ─────────────────────────────────────────────────────────────────
function EditModal({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit.name)
  const [cat,  setCat]  = useState(habit.cat)
  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.sectionTitle}>Gewohnheit bearbeiten</div>
        <input style={{ ...s.input, width: '100%' }} value={name} maxLength={50} autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(name, cat); if (e.key === 'Escape') onClose() }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {Object.keys(CAT_LABELS).map(c => (
            <button key={c} style={{ ...s.catBtn, ...(cat === c ? s.catBtnActive : {}) }}
              onClick={() => setCat(c)}>{CAT_LABELS[c]}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button style={s.cancelBtn} onClick={onClose}>Abbrechen</button>
          <button style={s.saveBtn} onClick={() => onSave(name.trim(), cat)}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

// ── HabitCard ─────────────────────────────────────────────────────────────────
function HabitCard({ habit, onToggle, onDelete, onEdit }) {
  const catStyle = {
    health:  { background: '#EAF3DE', color: '#639922' },
    lernen:  { background: '#E1F5EE', color: '#1D9E75' },
    mindset: { background: '#FAECE7', color: '#D85A30' },
    kreativ: { background: '#FAEEDA', color: '#BA7517' },
  }[habit.cat] || {}
  return (
    <div style={{ ...s.habitCard, ...(habit.done ? s.habitCardDone : {}) }}>
      <button style={{ ...s.checkBtn, ...(habit.done ? s.checkBtnChecked : {}) }}
        onClick={() => onToggle(habit)}>
        {habit.done && (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5l4 4 6-6" stroke="white" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...s.habitName, ...(habit.done ? s.habitNameDone : {}) }}>{habit.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ ...s.catPill, ...catStyle }}>{CAT_LABELS[habit.cat]}</span>
          <span style={s.streak}>{habit.streak >= 3 ? '🔥' : '○'} {habit.streak}d</span>
          <span style={s.xpPill}>+{XP_PER_HABIT}XP</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={s.iconBtn} onClick={() => onEdit(habit)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M9 2l2 2-6.5 6.5H2.5V8L9 2z" stroke="currentColor"
                  strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button style={{ ...s.iconBtn, ...s.iconBtnDel }}
          onClick={() => { if (confirm('Löschen?')) onDelete(habit.id) }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 3.5h9M5.5 3.5V2.5h2v1M4 3.5l.5 7.5h4l.5-7.5"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,           setUser]           = useState(null)
  const [habits,         setHabits]         = useState([])
  const [totalXP,        setTotalXP]        = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [editingHabit,   setEditingHabit]   = useState(null)
  const [justCompleted,  setJustCompleted]  = useState(false)
  const [toast,          setToast]          = useState({ msg: '', show: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (user) loadHabits() }, [user])

  const loadHabits = async () => {
    const { data, error } = await supabase
      .from('habits').select('*').order('created_at', { ascending: true })
    if (!error && data) {
      setHabits(data)
      const xp = data.filter(h => h.done)
        .reduce((sum, h) => sum + XP_PER_HABIT + Math.min(h.streak, 10) * STREAK_BONUS, 0)
      setTotalXP(xp)
    }
  }

  const showToast = (msg) => {
    setToast({ msg, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2000)
  }

  const addHabit = async (name, cat) => {
    const { data, error } = await supabase
      .from('habits').insert([{ name, cat, streak: 0, done: false, user_id: user.id }]).select()
    if (!error && data) { setHabits(prev => [...prev, data[0]]); showToast('Quest hinzugefügt!') }
  }

  const toggleHabit = async (habit) => {
    const newDone   = !habit.done
    const newStreak = newDone ? habit.streak + 1 : Math.max(0, habit.streak - 1)
    const earned    = XP_PER_HABIT + Math.min(habit.streak, 10) * STREAK_BONUS
    const { error } = await supabase
      .from('habits').update({ done: newDone, streak: newStreak }).eq('id', habit.id)
    if (!error) {
      setHabits(prev => prev.map(h =>
        h.id === habit.id ? { ...h, done: newDone, streak: newStreak } : h))
      if (newDone) {
        setTotalXP(xp => xp + earned)
        setJustCompleted(true)
        setTimeout(() => setJustCompleted(false), 1000)
        showToast(`+${earned} XP earned!`)
      } else {
        setTotalXP(xp => Math.max(0, xp - earned))
      }
    }
  }

  const deleteHabit = async (id) => {
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (!error) setHabits(prev => prev.filter(h => h.id !== id))
  }

  const editHabit = async (id, name, cat) => {
    const { error } = await supabase.from('habits').update({ name, cat }).eq('id', id)
    if (!error) setHabits(prev => prev.map(h => h.id === id ? { ...h, name, cat } : h))
  }

  const logout = async () => {
    await supabase.auth.signOut(); setHabits([]); setTotalXP(0)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b6a65',
      fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>Loading...</div>
  )
  if (!user) return <AuthScreen onAuth={setUser} />

  const done  = habits.filter(h => h.done).length
  const total = habits.length
  const pct   = total ? Math.round(done / total * 100) : 0
  const today   = new Date()
  const days    = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
  const months  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const dateStr = `${days[today.getDay()]}, ${today.getDate()}. ${months[today.getMonth()]} ${today.getFullYear()}`

  return (
    <div style={s.app}>
      <div style={{ ...s.toast, ...(toast.show ? s.toastShow : {}) }}>{toast.msg}</div>

      <div style={s.header}>
        <div style={s.logo}>HabitQuest</div>
        <div style={s.tagline}>Verwandle deine Gewohnheiten in Abenteuer</div>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>

      <XPBar totalXP={totalXP} />

      {/* Pixel Character */}
      <PixelCharacter totalXP={totalXP} justCompleted={justCompleted} />

      <div style={s.dateBanner}>{dateStr}</div>

      <AddHabitForm onAdd={addHabit} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={s.sectionTitle}>Heutige Quests</div>
        <div style={{ fontSize: 12, color: '#6b6a65' }}>{done} von {total}</div>
      </div>
      <div style={s.dailyBarBg}>
        <div style={{ ...s.dailyBarFill, width: pct + '%' }} />
      </div>

      {habits.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, marginBottom: 16 }}>?</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>Noch keine Gewohnheiten.<br />Füge deine erste Quest hinzu!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.map(h => (
            <HabitCard key={h.id} habit={h} onToggle={toggleHabit}
              onDelete={deleteHabit} onEdit={setEditingHabit} />
          ))}
        </div>
      )}

      {editingHabit && (
        <EditModal habit={editingHabit}
          onSave={(name, cat) => { editHabit(editingHabit.id, name, cat); setEditingHabit(null) }}
          onClose={() => setEditingHabit(null)} />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  app:        { maxWidth: 520, margin: '0 auto' },
  header:     { textAlign: 'center', marginBottom: '1.5rem', position: 'relative' },
  logo:       { fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: '#BA7517' },
  tagline:    { fontSize: 12, color: '#6b6a65', marginTop: 6 },
  dateBanner: { textAlign: 'center', fontSize: 12, color: '#6b6a65', marginBottom: '0.75rem' },
  logoutBtn:  { position: 'absolute', right: 0, top: 0, padding: '4px 10px', fontSize: 10, background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 8, cursor: 'pointer', color: '#6b6a65', fontFamily: 'Inter, sans-serif' },

  authWrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  authCard:  { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380 },
  errorMsg:  { fontSize: 12, color: '#E24B4A', background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '8px 12px', marginBottom: 8 },
  switchBtn: { background: 'none', border: 'none', color: '#BA7517', fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' },

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

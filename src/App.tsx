import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  generateKey, exportKey, importKey, encryptData, decryptData,
  combineIvAndEncrypted, splitIvAndEncrypted,
  arrayBufferToBase64, base64ToArrayBuffer, hashPassword
} from './lib/crypto'
import { FileText, Upload, Copy, Check, Lock, Trash2, Shield, Clock, X, Eye, PenLine, Settings, KeyRound, Link2, Timer, Github } from 'lucide-react'
import './index.css'

// Particle Network Background
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const particles: { x: number; y: number; vx: number; vy: number }[] = []
    const particleCount = 60
    const connectionDistance = 150
    let mouseX = 0
    let mouseY = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) {
          p.x -= dx * 0.01
          p.y -= dy * 0.01
        }
      })

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />
}

// View/Receive Share Component
function ViewShare({ shareId, encryptionKey }: { shareId: string; encryptionKey: string }) {
  const [status, setStatus] = useState<'loading' | 'password' | 'decrypting' | 'ready' | 'expired' | 'error'>('loading')
  const [content, setContent] = useState<{ type: 'text' | 'file'; data: string; fileName?: string } | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shareData, setShareData] = useState<any>(null)

  useEffect(() => {
    loadShare()
  }, [shareId])

  async function loadShare() {
    try {
      const { data: share, error } = await supabase
        .from('shares')
        .select('*')
        .eq('id', shareId)
        .maybeSingle()

      if (error || !share) {
        setStatus('expired')
        return
      }

      if (new Date(share.expiry_time) < new Date()) {
        await supabase.from('shares').delete().eq('id', shareId)
        if (share.file_path) {
          await supabase.storage.from('encrypted-files').remove([share.file_path])
        }
        setStatus('expired')
        return
      }

      if (share.is_read && share.read_once) {
        setStatus('expired')
        return
      }

      // Check max views
      if (share.max_views !== null && share.view_count >= share.max_views) {
        await supabase.from('shares').delete().eq('id', shareId)
        if (share.file_path) {
          await supabase.storage.from('encrypted-files').remove([share.file_path])
        }
        setStatus('expired')
        return
      }

      setShareData(share)

      if (share.password_hash) {
        setStatus('password')
      } else {
        await decryptShare(share)
      }
    } catch {
      setStatus('error')
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shareData) return

    const hash = await hashPassword(password)
    if (hash !== shareData.password_hash) {
      setError('Incorrect password')
      return
    }

    await decryptShare(shareData)
  }

  async function decryptShare(share: any) {
    setStatus('decrypting')
    try {
      const key = await importKey(encryptionKey)

      if (share.type === 'text') {
        const combined = base64ToArrayBuffer(share.encrypted_content)
        const { iv, encrypted } = splitIvAndEncrypted(combined)
        const decrypted = await decryptData(encrypted, iv, key)
        const text = new TextDecoder().decode(decrypted)
        setContent({ type: 'text', data: text })
      } else {
        const { data: fileData, error } = await supabase.storage
          .from('encrypted-files')
          .download(share.file_path)

        if (error || !fileData) throw new Error('File not found')

        const combined = await fileData.arrayBuffer()
        const { iv, encrypted } = splitIvAndEncrypted(combined)
        const decrypted = await decryptData(encrypted, iv, key)
        const blob = new Blob([decrypted])
        const url = URL.createObjectURL(blob)
        setContent({ type: 'file', data: url, fileName: share.file_name })
      }

      // Increment view count
      const newViewCount = (share.view_count || 0) + 1
      const shouldDelete = share.read_once || (share.max_views !== null && newViewCount >= share.max_views)
      
      if (shouldDelete) {
        await supabase.from('shares').update({ is_read: true, view_count: newViewCount }).eq('id', share.id)
        if (share.file_path) {
          await supabase.storage.from('encrypted-files').remove([share.file_path])
        }
      } else {
        await supabase.from('shares').update({ view_count: newViewCount }).eq('id', share.id)
      }

      setStatus('ready')
    } catch {
      setError('Decryption failed. Invalid key or corrupted data.')
      setStatus('error')
    }
  }

  if (status === 'loading' || status === 'decrypting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <div className="glass-card rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-text-secondary border-t-accent-primary rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">{status === 'loading' ? 'Loading...' : 'Decrypting...'}</p>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <ParticleBackground />
        <div className="glass-card rounded-lg p-8 text-center relative z-10 max-w-md mx-4">
          <Trash2 className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
          <p className="text-text-secondary">This share has expired or was already accessed.</p>
        </div>
      </div>
    )
  }

  if (status === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <ParticleBackground />
        <form onSubmit={handlePasswordSubmit} className="glass-card rounded-lg p-8 relative z-10 max-w-md mx-4 w-full">
          <Lock className="w-12 h-12 text-accent-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-center">Password Required</h2>
          <p className="text-text-secondary text-center mb-6">This share is protected.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full text-input rounded-md p-4 text-white font-mono mb-4"
          />
          {error && <p className="text-status-error text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full btn-primary rounded-md py-4">
            Unlock
          </button>
        </form>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <ParticleBackground />
        <div className="glass-card rounded-lg p-8 text-center relative z-10 max-w-md mx-4">
          <X className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-text-secondary">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <ParticleBackground />
      <div className="glass-card rounded-lg p-8 relative z-10 max-w-2xl mx-4 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-status-success" />
          <h2 className="text-xl font-semibold">Decrypted Content</h2>
        </div>
        
        {content?.type === 'text' ? (
          <pre className="text-input rounded-md p-4 font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-auto">
            {content.data}
          </pre>
        ) : content?.type === 'file' ? (
          <a
            href={content.data}
            download={content.fileName || 'file'}
            className="flex items-center justify-center gap-3 btn-primary rounded-md py-4 w-full"
          >
            <Upload className="w-5 h-5 rotate-180" />
            Download {content.fileName}
          </a>
        ) : null}

        {(shareData?.read_once || (shareData?.max_views !== null && (shareData?.view_count || 0) + 1 >= shareData?.max_views)) && (
          <p className="text-status-error text-sm mt-4 text-center">
            This link has reached its view limit. The content has been deleted.
          </p>
        )}
      </div>
    </div>
  )
}

// Main Share Creation Component
function CreateShare() {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [readOnce, setReadOnce] = useState(false)
  const [maxViewsInput, setMaxViewsInput] = useState('')
  const [expiryMinutes, setExpiryMinutes] = useState('')
  const [expiryError, setExpiryError] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [expiryTime, setExpiryTime] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!expiryTime) return
    const interval = setInterval(() => {
      const now = new Date()
      const diff = expiryTime.getTime() - now.getTime()
      if (diff <= 0) {
        setCountdown('Expired')
        clearInterval(interval)
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(
        hours > 0 
          ? `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
          : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [expiryTime])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && droppedFile.size <= 50 * 1024 * 1024) {
      setFile(droppedFile)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.size <= 50 * 1024 * 1024) {
      setFile(selectedFile)
    }
  }

  const getExpiryDate = (): Date | null => {
    if (!expiryMinutes.trim()) return null
    const minutes = parseInt(expiryMinutes, 10)
    if (isNaN(minutes) || minutes <= 0) return null
    return new Date(Date.now() + minutes * 60 * 1000)
  }

  const getMaxViews = (): number | null => {
    if (!maxViewsInput.trim()) return null
    const views = parseInt(maxViewsInput, 10)
    if (isNaN(views) || views <= 0) return null
    return views
  }

  const handleExpiryChange = (value: string) => {
    setExpiryMinutes(value)
    const num = parseInt(value, 10)
    if (value && !isNaN(num) && num > 60) {
      setExpiryError('Maximum time limit is 60 minutes')
    } else {
      setExpiryError('')
    }
  }

  async function handleSubmit() {
    if (mode === 'text' && !text.trim()) return
    if (mode === 'file' && !file) return

    setLoading(true)
    setProgress(10)

    try {
      const key = await generateKey()
      const keyString = await exportKey(key)
      setProgress(20)

      const passwordHash = password ? await hashPassword(password) : null
      const expiryDate = getExpiryDate()

      if (mode === 'text') {
        const { encrypted, iv } = await encryptData(text, key)
        const combined = combineIvAndEncrypted(iv, encrypted)
        const encryptedContent = arrayBufferToBase64(combined)
        setProgress(60)

        const { data, error } = await supabase
          .from('shares')
          .insert({
            type: 'text',
            encrypted_content: encryptedContent,
            encryption_key_hint: keyString.substring(0, 8),
            expiry_time: expiryDate ? expiryDate.toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            read_once: readOnce,
            max_views: getMaxViews(),
            view_count: 0,
            password_hash: passwordHash,
          })
          .select('id')
          .maybeSingle()

        if (error || !data) throw error

        setProgress(100)
        const link = `${window.location.origin}/#/${data.id}/${keyString}`
        setGeneratedLink(link)
        setExpiryTime(expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      } else if (file) {
        const buffer = await file.arrayBuffer()
        setProgress(30)

        const { encrypted, iv } = await encryptData(buffer, key)
        const combined = combineIvAndEncrypted(iv, encrypted)
        setProgress(50)

        const filePath = `${Date.now()}-${crypto.randomUUID()}`
        const { error: uploadError } = await supabase.storage
          .from('encrypted-files')
          .upload(filePath, new Blob([combined]), {
            contentType: 'application/octet-stream',
          })

        if (uploadError) throw uploadError
        setProgress(80)

        const { data, error } = await supabase
          .from('shares')
          .insert({
            type: 'file',
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            encryption_key_hint: keyString.substring(0, 8),
            expiry_time: expiryDate ? expiryDate.toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            read_once: readOnce,
            max_views: getMaxViews(),
            view_count: 0,
            password_hash: passwordHash,
          })
          .select('id')
          .maybeSingle()

        if (error || !data) throw error

        setProgress(100)
        const link = `${window.location.origin}/#/${data.id}/${keyString}`
        setGeneratedLink(link)
        setExpiryTime(expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
      }
    } catch (err) {
      console.error(err)
      alert('Failed to create share. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setGeneratedLink('')
    setText('')
    setFile(null)
    setPassword('')
    setReadOnce(false)
    setMaxViewsInput('')
    setExpiryMinutes('')
    setExpiryError('')
    setExpiryTime(null)
    setProgress(0)
  }

  if (generatedLink) {
    return (
      <div className="min-h-screen flex flex-col bg-void">
        <ParticleBackground />
        
        <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50">
          <span className="text-xl font-bold tracking-tight">0xShare</span>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-16">
          <div className="glass-card rounded-lg p-8 w-full max-w-lg animate-fade-in relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="success-pulse w-10 h-10 rounded-full bg-status-success/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-status-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Link Generated</h2>
                <p className="text-text-secondary text-sm">Your encrypted share is ready.</p>
              </div>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="w-full text-input rounded-md p-4 pr-12 font-mono text-sm text-text-secondary"
              />
              <button
                onClick={copyLink}
                className="copy-btn absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded"
              >
                {copied ? <Check className="w-5 h-5 text-status-success" /> : <Copy className="w-5 h-5 text-text-secondary" />}
              </button>
            </div>

            {copied && (
              <p className="text-status-success text-sm mb-4 text-center animate-fade-in">Copied to clipboard</p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-text-secondary text-sm mb-6">
              {expiryMinutes && (
                <div className="info-badge flex items-center gap-2 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {countdown}</span>
                </div>
              )}
              {!expiryMinutes && (
                <div className="info-badge flex items-center gap-2 px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span>No expiry</span>
                </div>
              )}
              {maxViewsInput && (
                <div className="info-badge flex items-center gap-2 px-3 py-1.5 rounded-full">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{maxViewsInput} view{parseInt(maxViewsInput) > 1 ? 's' : ''} max</span>
                </div>
              )}
              {readOnce && (
                <div className="info-badge flex items-center gap-2 px-3 py-1.5 rounded-full">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Burns after read</span>
                </div>
              )}
            </div>

            <button onClick={reset} className="btn-secondary w-full rounded-md py-3">
              Create Another
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-void">
      <ParticleBackground />
      
      <header className="glass-header fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50">
        <span 
          className="logo-text flex items-center gap-2 text-xl font-bold tracking-tight"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Shield className="w-5 h-5 text-accent-primary" />
          0xShare
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-8">
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.02em' }}>
            Private text and file sharing.
          </h1>
          <p className="text-text-secondary text-lg">
            Encrypted. One link. Full control.
          </p>
        </div>

        {/* Core Control Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-8 relative z-10">
          <div className="feature-card rounded-lg p-5 text-center">
            <Eye className="feature-icon w-8 h-8 text-accent-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Custom View Control</h3>
            <p className="text-text-secondary text-sm">Set exact number of allowed views. Link auto-destructs after limit.</p>
          </div>
          <div className="feature-card rounded-lg p-5 text-center">
            <Clock className="feature-icon w-8 h-8 text-accent-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Custom Time Control</h3>
            <p className="text-text-secondary text-sm">Set expiry in minutes. Maximum 60 minutes for tight security.</p>
          </div>
          <div className="feature-card rounded-lg p-5 text-center">
            <Shield className="feature-icon w-8 h-8 text-accent-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Client-Side Encryption</h3>
            <p className="text-text-secondary text-sm">AES-256 encryption in your browser. Server never sees your data.</p>
          </div>
        </div>

        <div className="glass-card rounded-lg p-6 md:p-8 w-full max-w-lg relative z-10">
          {/* Mode Toggle */}
          <div className="mode-toggle flex gap-2 p-1 rounded-md mb-6">
            <button
              onClick={() => setMode('text')}
              className={`mode-toggle-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-md ${
                mode === 'text' ? 'active' : ''
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">Share Text</span>
            </button>
            <button
              onClick={() => setMode('file')}
              className={`mode-toggle-btn flex-1 flex items-center justify-center gap-2 py-3 rounded-md ${
                mode === 'file' ? 'active' : ''
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="font-medium">Share File</span>
            </button>
          </div>

          {/* Text Mode */}
          {mode === 'text' && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 10000))}
                  placeholder="Paste sensitive data..."
                  className="w-full h-40 text-input rounded-md p-4 font-mono text-sm resize-none"
                />
                <span className="absolute bottom-3 right-3 text-text-tertiary text-xs">
                  {text.length}/10000
                </span>
              </div>
            </div>
          )}

          {/* File Mode */}
          {mode === 'file' && (
            <div className="animate-fade-in">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`drop-zone rounded-md p-8 text-center cursor-pointer ${dragActive ? 'active' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-accent-primary" />
                    <div className="text-left">
                      <p className="font-medium truncate max-w-xs">{file.name}</p>
                      <p className="text-text-secondary text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="p-2 hover:bg-glass-hover rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
                    <p className="text-text-secondary mb-1">Drop file here or click to browse</p>
                    <p className="text-text-tertiary text-sm">Max 50MB</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-obsidian/50 border border-border-subtle hover:border-border-highlight transition-colors">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={readOnce}
                  onChange={(e) => {
                    setReadOnce(e.target.checked)
                    if (e.target.checked) setMaxViewsInput('')
                  }}
                  className="custom-checkbox"
                />
                <span className="text-sm font-medium">Burn after reading</span>
              </label>
              <Trash2 className="w-4 h-4 text-text-tertiary" />
            </div>

            <div className="relative">
              <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="number"
                min="1"
                value={maxViewsInput}
                onChange={(e) => {
                  setMaxViewsInput(e.target.value)
                  if (e.target.value) setReadOnce(false)
                }}
                disabled={readOnce}
                placeholder="Type number of viewers"
                className={`w-full text-input rounded-md py-3 pl-10 pr-4 text-sm ${readOnce ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={expiryMinutes}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="Type time limit in minutes"
                  className={`w-full text-input rounded-md py-3 pl-10 pr-4 text-sm ${expiryError ? 'border-status-error' : ''}`}
                />
              </div>
              {expiryError && (
                <p className="text-status-error text-xs pl-1">{expiryError}</p>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional password"
                className="w-full text-input rounded-md py-3 pl-10 pr-4 text-sm"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-6">
              <div className="progress-bar h-2 rounded-full overflow-hidden">
                <div
                  className="progress-fill h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="encrypting-text text-text-secondary text-sm text-center mt-2">Encrypting...</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || (mode === 'text' ? !text.trim() : !file) || !!expiryError}
            className="w-full btn-primary rounded-md py-4 mt-6 text-lg"
          >
            {loading ? 'Encrypting...' : 'Generate Secure Link'}
          </button>
        </div>

        {/* Trust Signals */}
        <div className="grid grid-cols-3 gap-6 mt-12 max-w-lg w-full relative z-10">
          {[
            { icon: Shield, text: 'No account required' },
            { icon: Lock, text: 'End-to-end encryption' },
            { icon: Trash2, text: 'Self-destructing links' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="text-center">
              <Icon className="w-5 h-5 text-text-tertiary mx-auto mb-2" />
              <p className="text-text-tertiary text-xs">{text}</p>
            </div>
          ))}
        </div>

        {/* How It Works Section */}
        <section className="w-full max-w-4xl mt-24 mb-16 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
              How 0xShare Works
            </h2>
            <p className="text-text-secondary text-lg">Create. Control. Share. Expire.</p>
          </div>

          {/* Steps with flow line */}
          <div className="relative">
            {/* Flow line - hidden on mobile */}
            <div className="hidden md:block absolute top-16 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-border-highlight to-transparent" />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4">
              {[
                { icon: PenLine, step: '01', title: 'Create', desc: 'Choose Text or File. Type or upload your sensitive data.' },
                { icon: Settings, step: '02', title: 'Set Access', desc: 'Input view limit & time limit. Max 60 minutes.' },
                { icon: KeyRound, step: '03', title: 'Encrypt', desc: 'AES-256 in browser. Server never sees your data.' },
                { icon: Link2, step: '04', title: 'Share', desc: 'Generate secure link. Copy and send anywhere.' },
                { icon: Timer, step: '05', title: 'Auto Expire', desc: 'Views count down. Time ticks. Auto-delete when done.' },
              ].map(({ icon: Icon, step, title, desc }, index) => (
                <div
                  key={step}
                  className="step-card rounded-lg p-5 text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="step-icon-container w-12 h-12 rounded-full bg-obsidian border border-border-subtle flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-accent-primary" />
                  </div>
                  <span className="text-text-tertiary text-xs font-mono tracking-wider">{step}</span>
                  <h3 className="font-semibold mt-1 mb-2">{title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Demo Preview */}
          <div className="mt-12 glass-card rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex gap-1 p-1 bg-obsidian rounded-md">
                <div className="px-3 py-1.5 bg-glass-panel rounded text-xs font-medium border border-border-highlight">Text</div>
                <div className="px-3 py-1.5 text-xs text-text-tertiary">File</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-8 bg-obsidian rounded-md flex items-center px-3">
                <Eye className="w-3 h-3 text-text-tertiary mr-2" />
                <span className="text-xs text-text-secondary">5 views remaining</span>
              </div>
              <div className="h-8 bg-obsidian rounded-md flex items-center px-3">
                <Clock className="w-3 h-3 text-text-tertiary mr-2" />
                <span className="text-xs text-text-secondary">Expires in 14:32</span>
              </div>
            </div>
            <div className="mt-4 h-10 bg-accent-primary rounded-md flex items-center justify-center">
              <span className="text-void text-sm font-semibold">Generate Secure Link</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn-primary px-12 py-4 rounded-md text-lg font-semibold"
            >
              Open App
            </button>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center relative z-10 border-t border-border-subtle">
        <div className="flex items-center justify-center gap-2 text-text-tertiary text-sm">
          <span>0xShare</span>
          <span className="text-border-highlight">|</span>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-text-secondary transition-colors cursor-pointer"
          >
            <Github className="w-4 h-4" />
            <span>Open Source</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

function App() {
  const [view, setView] = useState<{ type: 'create' } | { type: 'view'; id: string; key: string }>({ type: 'create' })

  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#/')) {
      const parts = hash.slice(2).split('/')
      if (parts.length >= 2) {
        setView({ type: 'view', id: parts[0], key: parts[1] })
      }
    }

    const handleHashChange = () => {
      const newHash = window.location.hash
      if (newHash.startsWith('#/')) {
        const parts = newHash.slice(2).split('/')
        if (parts.length >= 2) {
          setView({ type: 'view', id: parts[0], key: parts[1] })
        }
      } else {
        setView({ type: 'create' })
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (view.type === 'view') {
    return <ViewShare shareId={view.id} encryptionKey={view.key} />
  }

  return <CreateShare />
}

export default App

import { useEffect, useState } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { DictionaryTerm } from '@/types'

export function DictionaryPage() {
  const userId = useAuthStore((s) => s.userId)
  const [terms, setTerms] = useState<DictionaryTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [definition, setDefinition] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    const { data } = await supabase
      .from('dictionary')
      .select('*')
      .eq('status', 'approved')
      .order('term', { ascending: true })
    setTerms((data as DictionaryTerm[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('dictionary').insert({
        term,
        definition,
        proposed_by: userId,
        status: 'pending',
      })
      if (insErr) throw insErr
      setTerm('')
      setDefinition('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo proponer el término')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Diccionario</h1>
        <button
          onClick={() => setOpen(true)}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-accent text-black"
          aria-label="Proponer término"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}

      {!loading && terms.length === 0 && (
        <Card className="text-center">
          <BookOpen size={20} className="mx-auto mb-2 text-muted" />
          <p className="text-sm text-muted">Aún no hay términos aprobados.</p>
        </Card>
      )}

      {terms.map((t) => (
        <Card key={t.id} className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{t.term}</span>
            <Badge tone="neutral">GLOSARIO</Badge>
          </div>
          <p className="text-xs text-muted">{t.definition}</p>
        </Card>
      ))}

      <Sheet open={open} onClose={() => setOpen(false)} title="Proponer término">
        <form onSubmit={handlePropose}>
          <Input id="d-term" label="Término" value={term} onChange={(e) => setTerm(e.target.value)} required />
          <Input
            id="d-def"
            label="Definición"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            required
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Enviando…' : 'Enviar para revisión'}
          </Button>
        </form>
      </Sheet>
    </PageShell>
  )
}

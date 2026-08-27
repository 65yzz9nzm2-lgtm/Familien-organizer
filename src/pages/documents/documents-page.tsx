import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { documentsService } from '@/services/documents.service'
import { formatDate } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

const CATEGORIES = ['Auto', 'Versicherung', 'Wohnung', 'Finanzen', 'Schule', 'Verträge', 'Sonstiges']

export default function DocumentsPage() {
  const { family } = useFamily()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Tables<'documents'>[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      setDocuments(await documentsService.getDocuments(family.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  async function handleFileSelected(file: File | undefined) {
    if (!file || !family || !user) return
    setUploading(true)
    try {
      const path = await documentsService.uploadFile(family.id, file)
      await documentsService.createDocument({
        family_id: family.id,
        name: file.name,
        category: 'Sonstiges',
        storage_path: path,
        owner_id: user.id,
        uploaded_by: user.id,
      })
      await load()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleOpen(doc: Tables<'documents'>) {
    const url = await documentsService.getSignedUrl(doc.storage_path)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(doc: Tables<'documents'>) {
    await documentsService.deleteDocument(doc.id, doc.storage_path)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  if (!family) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Dokument hochladen
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState emoji="📄" title="Noch keine Dokumente" description="Verträge, Versicherungen & Co. sicher an einem Ort." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => handleOpen(doc)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                      {doc.expires_at && ` · läuft ab am ${formatDate(doc.expires_at)}`}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{doc.category}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} aria-label="Löschen">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">Kategorien: {CATEGORIES.join(', ')}</p>
    </div>
  )
}

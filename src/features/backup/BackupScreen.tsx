import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  backupFileName,
  createBackup,
  createSetsCsv,
  parseBackup,
  restoreBackup,
  type ImportMode,
  type ImportPreview,
} from '@/db/backup'
import { getLastBackupAt, setLastBackupAt } from '@/db/repositories/metaRepo'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ExportIcon, ImportIcon, InfoIcon, ShareIcon, WarningIcon } from '@/components/icons'
import { useToast } from '@/app/providers/ToastProvider'
import { formatDate, formatDayLabel } from '@/lib/date'

/* Varmuuskopio, vienti ja tuonti (SPEC §6.10). */

/**
 * Jako Web Share API:lla, koska iPhonessa se on ainoa tapa saada tiedosto
 * iCloud Driveen. Jos jakoa ei tueta, tiedosto ladataan.
 */
async function shareOrDownload(blob: Blob, fileName: string): Promise<void> {
  const file = new File([blob], fileName, { type: blob.type })
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return
    } catch (error) {
      // Käyttäjä voi perua jaon – silloin ei ladata mitään.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function BackupScreen() {
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const lastBackupAt = useLiveQuery(async () => (await getLastBackupAt()) ?? null, [], undefined)

  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [confirming, setConfirming] = useState(false)

  const exportJson = async (): Promise<void> => {
    setBusy(true)
    try {
      const backup = await createBackup()
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      await shareOrDownload(blob, backupFileName(backup.exportedAt))
      await setLastBackupAt(backup.exportedAt)
      toast.show('Varmuuskopio viety', { tone: 'good' })
    } catch {
      toast.show('Vienti epäonnistui', { tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = async (): Promise<void> => {
    setBusy(true)
    try {
      const csv = await createSetsCsv()
      // BOM, jotta Excel tunnistaa UTF-8:n ja ääkköset näkyvät oikein.
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
      await shareOrDownload(blob, backupFileName().replace('.json', '.csv'))
      toast.show('CSV viety', { tone: 'good' })
    } catch {
      toast.show('Vienti epäonnistui', { tone: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const readFile = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const result = parseBackup(JSON.parse(text) as unknown)
      if (!result.valid) {
        toast.show(result.message, { tone: 'danger', durationMs: 6000 })
        return
      }
      setPreview(result)
    } catch {
      toast.show('Tiedostoa ei voitu lukea', { tone: 'danger' })
    }
  }

  return (
    <>
      <ScreenHeader title="Varmuuskopio" back="/settings" />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <Card className="flex items-start gap-2.5 p-4">
          <WarningIcon size={18} className="mt-0.5 shrink-0 text-warn" />
          <p className="text-xs leading-relaxed text-muted">
            Data on vain tässä puhelimessa. Selain voi poistaa sen tilan loppuessa, eikä
            puhelimen varmuuskopio kata sitä luotettavasti. Vie JSON säännöllisesti ja tallenna se
            pilveen.
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Viimeisin varmuuskopio</h2>
          <p className="num mt-1 text-sm text-muted">
            {lastBackupAt === null || lastBackupAt === undefined
              ? 'Ei vielä varmuuskopiota.'
              : `${formatDayLabel(lastBackupAt)} · ${formatDate(lastBackupAt)}`}
          </p>
          <div className="mt-3 space-y-2">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              icon={<ShareIcon size={18} />}
              disabled={busy}
              onClick={() => void exportJson()}
            >
              Vie JSON ja jaa
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={<ExportIcon size={18} />}
              disabled={busy}
              onClick={() => void exportCsv()}
            >
              Vie sarjat CSV:nä
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Tuonti</h2>
          <p className="mt-1 text-xs text-muted">
            Valitse aiemmin viety JSON-tiedosto. Näet ensin esikatselun ja valitset, yhdistetäänkö
            vai korvataanko nykyinen data.
          </p>
          <Button
            variant="secondary"
            fullWidth
            className="mt-3"
            icon={<ImportIcon size={18} />}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Tuo JSON
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void readFile(file)
            }}
          />
        </Card>

        <Card className="flex items-start gap-2.5 p-4">
          <InfoIcon size={18} className="mt-0.5 shrink-0 text-faint" />
          <p className="text-xs leading-relaxed text-muted">
            JSON sisältää kaiken: liikkeet, ohjelman, treenit, sarjat, asetukset ja liikkeiden
            kuvat. CSV on tarkoitettu taulukkolaskentaan eikä sitä voi tuoda takaisin.
          </p>
        </Card>
      </div>

      {preview === null ? null : (
        <Card className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-50 p-4 shadow-[var(--shadow-float)]">
          <h2 className="text-sm font-semibold">Tuotavan tiedoston sisältö</h2>
          <p className="num mt-1 text-sm text-muted">
            {preview.counts.sessions} treeniä · {preview.counts.exercises} liikettä ·{' '}
            {preview.counts.sets} sarjaa
          </p>
          <p className="num mt-0.5 text-xs text-faint">
            Viety {formatDate(preview.exportedAt)} · skeema v{preview.schemaVersion}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant={mode === 'merge' ? 'primary' : 'secondary'}
              onClick={() => setMode('merge')}
            >
              Yhdistä
            </Button>
            <Button
              variant={mode === 'replace' ? 'primary' : 'secondary'}
              onClick={() => setMode('replace')}
            >
              Korvaa
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            {mode === 'merge'
              ? 'Yhdistä säilyttää nykyisen datan ja ohittaa rivit, jotka ovat jo olemassa.'
              : 'Korvaa poistaa nykyisen datan ja kirjoittaa tilalle tiedoston sisällön.'}
          </p>

          <div className="mt-3 flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setPreview(null)}>
              Peruuta
            </Button>
            <Button variant="primary" fullWidth onClick={() => setConfirming(true)}>
              Tuo
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirming}
        title={mode === 'replace' ? 'Korvataanko nykyinen data?' : 'Yhdistetäänkö tiedosto?'}
        details={
          mode === 'replace'
            ? 'Nykyiset treenit, liikkeet ja ohjelma poistetaan ja tilalle tulee tiedoston sisältö.'
            : 'Tiedoston rivit lisätään nykyisen datan rinnalle. Olemassa olevia rivejä ei ylikirjoiteta.'
        }
        confirmLabel={mode === 'replace' ? 'Korvaa' : 'Yhdistä'}
        tone={mode === 'replace' ? 'danger' : 'neutral'}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          const file = preview?.file
          setConfirming(false)
          setPreview(null)
          if (!file) return
          setBusy(true)
          void restoreBackup(file, mode)
            .then((result) => {
              toast.show(
                `Tuotu: ${result.added} riviä lisätty${result.skipped > 0 ? `, ${result.skipped} ohitettu` : ''}`,
                { tone: 'good', durationMs: 5000 },
              )
            })
            .catch(() => toast.show('Tuonti epäonnistui', { tone: 'danger' }))
            .finally(() => setBusy(false))
        }}
      />
    </>
  )
}

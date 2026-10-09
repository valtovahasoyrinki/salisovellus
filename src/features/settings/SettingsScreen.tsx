import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { getLastBackupAt } from '@/db/repositories/metaRepo'
import { DEFAULT_INCREMENTS, updateSettings } from '@/db/repositories/settingsRepo'
import { deleteAllData } from '@/db/backup'
import { EQUIPMENT_ORDER, equipmentLabel } from '@/domain/equipment'
import type { Equipment, ThemeMode } from '@/domain/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ListRow } from '@/components/ui/ListRow'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Toggle } from '@/components/ui/Toggle'
import { ExportIcon, InfoIcon, WarningIcon } from '@/components/icons'
import { useSettings } from '@/app/useSettings'
import { useToast } from '@/app/providers/ToastProvider'
import { formatDayLabel } from '@/lib/date'
import { formatNumber } from '@/lib/format'
import { hapticsSupported, setHapticsEnabled } from '@/lib/haptics'
import { formatBytes, getStorageStatus, requestPersistentStorage, type StorageStatus } from '@/lib/storage'
import { wakeLockSupported } from '@/lib/wakeLock'

const THEMES: Array<{ value: ThemeMode; label: string }> = [
  { value: 'dark', label: 'Tumma' },
  { value: 'light', label: 'Vaalea' },
  { value: 'system', label: 'Järjestelmä' },
]

export default function SettingsScreen() {
  const navigate = useNavigate()
  const settings = useSettings()
  const toast = useToast()
  const lastBackupAt = useLiveQuery(async () => (await getLastBackupAt()) ?? null, [], undefined)
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [resetting, setResetting] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    void getStorageStatus().then(setStorage)
  }, [])

  return (
    <>
      <ScreenHeader title="Asetukset" back="/" />

      <div className="space-y-3 px-4 pt-3 pb-6">
        <Section title="Treeni">
          <Row label="Viikkotavoite" hint="Treenejä viikossa">
            <NumberStepper
              label="Viikkotavoite"
              value={settings.weeklyTarget}
              onChange={(value) => void updateSettings({ weeklyTarget: value })}
              step={1}
              min={1}
              max={14}
            />
          </Row>
          <Row label="Viikkosarjojen ohjealue" hint="Työsarjaa lihasryhmälle viikossa">
            <div className="grid grid-cols-2 gap-2">
              <NumberStepper
                label="Ohjealueen alaraja"
                value={settings.weeklySetsRange.min}
                onChange={(value) =>
                  void updateSettings({
                    weeklySetsRange: {
                      min: value,
                      max: Math.max(value, settings.weeklySetsRange.max),
                    },
                  })
                }
                step={1}
                min={1}
                max={40}
              />
              <NumberStepper
                label="Ohjealueen yläraja"
                value={settings.weeklySetsRange.max}
                onChange={(value) =>
                  void updateSettings({
                    weeklySetsRange: {
                      min: Math.min(value, settings.weeklySetsRange.min),
                      max: value,
                    },
                  })
                }
                step={1}
                min={1}
                max={40}
              />
            </div>
          </Row>
        </Section>

        <Section title="Lepoajastin">
          <Row label="Oletuspituus" hint="Käytetään, jos liikkeellä tai päivällä ei ole omaa">
            <NumberStepper
              label="Lepoajastimen oletuspituus sekunteina"
              value={settings.defaultRestSec}
              onChange={(value) => void updateSettings({ defaultRestSec: value })}
              step={15}
              min={0}
              max={600}
              unit="s"
            />
          </Row>
          <ToggleRow
            label="Äänimerkki"
            hint="Lyhyt piippaus, kun lepo päättyy"
            checked={settings.restSoundEnabled}
            onChange={(checked) => void updateSettings({ restSoundEnabled: checked })}
          />
          <ToggleRow
            label="Värinä"
            hint={
              hapticsSupported()
                ? 'Värinä sarjan kuittauksesta ja levon lopusta'
                : 'Tämä selain ei tue värinää (iOS)'
            }
            checked={settings.restVibrationEnabled}
            onChange={(checked) => {
              setHapticsEnabled(checked)
              void updateSettings({ restVibrationEnabled: checked })
            }}
          />
        </Section>

        <Section title="Painonlisäykset" hint="Liikkeen oma asetus ohittaa nämä">
          <div className="space-y-2 px-4 pb-3">
            {EQUIPMENT_ORDER.map((equipment: Equipment) => (
              <div key={equipment} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-muted">{equipmentLabel(equipment)}</span>
                <NumberStepper
                  label={`Painonlisäys: ${equipmentLabel(equipment)}`}
                  value={settings.increments[equipment] ?? DEFAULT_INCREMENTS[equipment]}
                  onChange={(value) =>
                    void updateSettings({
                      increments: { ...settings.increments, [equipment]: value },
                    })
                  }
                  step={0.25}
                  min={0.25}
                  max={25}
                  unit="kg"
                  format={formatNumber}
                  allowDecimalInput
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ulkoasu">
          <div className="px-4 pb-3">
            <SegmentedControl
              options={THEMES}
              value={settings.theme}
              onChange={(value) => void updateSettings({ theme: value })}
              ariaLabel="Teema"
            />
          </div>
        </Section>

        <Section title="Data">
          <ul className="divide-y divide-border">
            <li>
              <ListRow
                to="/settings/backup"
                title="Varmuuskopiot"
                subtitle={
                  lastBackupAt === null || lastBackupAt === undefined
                    ? 'Ei vielä varmuuskopiota'
                    : `Viimeksi ${formatDayLabel(lastBackupAt)}`
                }
                leading={<ExportIcon size={20} className="text-muted" />}
              />
            </li>
            <li>
              <ListRow
                title="Tallennus pysyvänä"
                subtitle={
                  storage === null
                    ? 'Tarkistetaan…'
                    : storage.persistent
                      ? 'Selain ei poista dataa tilan loppuessa'
                      : 'Selain voi poistaa datan – pyydä pysyvyys'
                }
                trailing={
                  storage?.persistent ? (
                    <span className="text-xs text-good">Päällä</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void requestPersistentStorage().then(async (granted) => {
                          setStorage(await getStorageStatus())
                          toast.show(
                            granted ? 'Tallennus on nyt pysyvä' : 'Selain ei myöntänyt pysyvyyttä',
                            { tone: granted ? 'good' : 'neutral' },
                          )
                        })
                      }}
                    >
                      Pyydä
                    </Button>
                  )
                }
              />
            </li>
            {storage?.usageBytes === undefined ? null : (
              <li>
                <ListRow
                  title="Käytetty tila"
                  trailing={
                    <span className="num text-sm text-muted">
                      {formatBytes(storage.usageBytes)}
                      {storage.quotaBytes === undefined
                        ? ''
                        : ` / ${formatBytes(storage.quotaBytes)}`}
                    </span>
                  }
                />
              </li>
            )}
          </ul>
        </Section>

        <Card className="flex items-start gap-2.5 p-4">
          <InfoIcon size={18} className="mt-0.5 shrink-0 text-faint" />
          <p className="text-xs leading-relaxed text-muted">
            Ruutu pysyy päällä treenin aikana
            {wakeLockSupported() ? '.' : ', jos selain tukee sitä – tämä selain ei tue.'} Data on
            vain tässä laitteessa eikä sitä lähetetä mihinkään.
          </p>
        </Card>

        <Button
          variant="ghost"
          fullWidth
          className="text-danger"
          icon={<WarningIcon size={18} />}
          onClick={() => setResetting(1)}
        >
          Poista kaikki data
        </Button>
      </div>

      <ConfirmDialog
        open={resetting === 1}
        title="Poistetaanko kaikki data?"
        details="Ohjelma, liikekirjasto, kaikki treenit ja asetukset poistetaan tästä laitteesta. Tätä ei voi perua."
        confirmLabel="Jatka"
        onCancel={() => setResetting(0)}
        onConfirm={() => setResetting(2)}
      />

      <ConfirmDialog
        open={resetting === 2}
        title="Varmista vielä"
        details="Viimeinen vahvistus. Jos et ole vienyt varmuuskopiota, data katoaa lopullisesti."
        confirmLabel="Poista kaikki"
        onCancel={() => setResetting(0)}
        onConfirm={() => {
          setResetting(0)
          void deleteAllData().then(() => {
            toast.show('Kaikki data poistettu')
            void navigate('/onboarding', { replace: true })
          })
        }}
      />
    </>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {children}
    </Card>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 px-4 py-3">
      <div>
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

import { useState } from 'react'
import { useToast } from '@/app/providers/ToastProvider'
import { MuscleMap } from '@/components/MuscleMap/MuscleMap'
import { MuscleSelector, type MuscleSelection } from '@/components/MuscleMap/MuscleSelector'
import {
  ArchiveIcon,
  BarbellIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  EditIcon,
  ExportIcon,
  FlameIcon,
  GripIcon,
  ImportIcon,
  InfoIcon,
  MoreIcon,
  RestoreIcon,
  SearchIcon,
  ShareIcon,
  SkipIcon,
  SwapIcon,
  TrashIcon,
  TrophyIcon,
  WarningIcon,
  dayIcon,
  equipmentIcon,
} from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { Collapsible } from '@/components/ui/Collapsible'
import { DragList } from '@/components/ui/DragList'
import { ListGroup, ListRow } from '@/components/ui/ListRow'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { StatTile } from '@/components/ui/StatTile'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { Toggle } from '@/components/ui/Toggle'
import { EQUIPMENT_ORDER, equipmentLabel } from '@/domain/equipment'
import type { DayIcon } from '@/domain/types'
import {
  formatPercentDelta,
  formatRepsDelta,
  formatSets,
  formatVolume,
  formatWeight,
  formatWeightDelta,
} from '@/lib/format'

/**
 * Komponenttigalleria (kehitystyökalu, reitti /dev/gallery).
 * Ainoa tapa tarkistaa jaetut komponentit mobiilikoossa ja molemmilla
 * teemoilla ilman että näkymät ovat valmiita. Ei linkitetty navigaatiosta.
 */

const DAY_ICON_LABELS: Array<[DayIcon, string]> = [
  ['push', 'Push'],
  ['pull', 'Pull'],
  ['legs', 'Legs'],
  ['upper', 'Ylä'],
  ['lower', 'Ala'],
  ['full', 'Koko'],
  ['arms', 'Kädet'],
  ['core', 'Keski'],
]

const UI_ICONS = [
  ['Haku', SearchIcon],
  ['Muokkaa', EditIcon],
  ['Poista', TrashIcon],
  ['Arkistoi', ArchiveIcon],
  ['Palauta', RestoreIcon],
  ['Kamera', CameraIcon],
  ['Kahva', GripIcon],
  ['Kalenteri', CalendarIcon],
  ['Kello', ClockIcon],
  ['Jaa', ShareIcon],
  ['Vienti', ExportIcon],
  ['Tuonti', ImportIcon],
  ['Sulje', CloseIcon],
  ['Valikko', MoreIcon],
  ['Ohita', SkipIcon],
  ['Varoitus', WarningIcon],
  ['Info', InfoIcon],
  ['Putki', FlameIcon],
  ['Vaihda', SwapIcon],
  ['Kuittaa', CheckIcon],
  ['Ennätys', TrophyIcon],
] as const

/* Teema luetaan ja kirjoitetaan suoraan juurielementistä, jotta painike toimii
   myös silloin kun kuvakaappausskripti vaihtaa teemaa ulkopuolelta. */
function flipTheme(): void {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'
}

interface DemoExercise {
  id: string
  name: string
  detail: string
}

const DEMO_EXERCISES: DemoExercise[] = [
  { id: 'bench', name: 'Penkkipunnerrus', detail: '4 × 6–10 · 180 s' },
  { id: 'incline', name: 'Vinopenkki käsipainoilla', detail: '3 × 8–12 · 150 s' },
  { id: 'press', name: 'Pystypunnerrus', detail: '3 × 6–10 · 150 s' },
]

export default function ComponentGallery() {
  const toast = useToast()
  const [weight, setWeight] = useState(82.5)
  const [reps, setReps] = useState(8)
  const [rest, setRest] = useState(150)
  const [sound, setSound] = useState(true)
  const [persist, setPersist] = useState(false)
  const [name, setName] = useState('Penkkipunnerrus')
  const [note, setNote] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string[]>(['chest'])
  const [muscles, setMuscles] = useState<MuscleSelection>({
    primary: ['chest'],
    secondary: ['front_delts', 'triceps'],
  })
  const [exercises, setExercises] = useState(DEMO_EXERCISES)
  const [sets, setSets] = useState([1, 2, 3])
  const toggleFilter = (id: string): void => {
    setMuscleFilter((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  return (
    <>
      <ScreenHeader
        title="Komponentit"
        subtitle="Jaetut komponentit mobiilikoossa"
        back="/"
        action={
          <Button variant="secondary" onClick={flipTheme}>
            Teema
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-4 pt-4 pb-10">
        <Section title="Syöte: NumberStepper" note="Pito toistaa, luvun napautus avaa näppäimistön">
          <NumberStepper
            label="Paino kilogrammoina"
            value={weight}
            onChange={setWeight}
            step={2.5}
            min={0}
            max={400}
            size="lg"
            unit="kg"
            allowDecimalInput
            format={(value) => formatWeight(value).replace(' kg', '')}
          />
          <div className="flex gap-2">
            <NumberStepper label="Toistot" value={reps} onChange={setReps} step={1} min={0} max={50} />
            <NumberStepper
              label="Lepo sekunteina"
              value={rest}
              onChange={setRest}
              step={15}
              min={0}
              max={600}
              unit="s"
            />
          </div>
        </Section>

        <Section title="Painikkeet ja merkinnät">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={<CheckIcon size={20} />}>
              Kuittaa
            </Button>
            <Button variant="secondary">Lisää sarja</Button>
            <Button variant="ghost">Ohita</Button>
            <Button variant="danger" icon={<TrashIcon size={20} />}>
              Poista
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Arkistoitu</Badge>
            <Badge variant="good" icon={<CheckIcon size={14} />}>
              +2,5 kg
            </Badge>
            <Badge variant="record" icon={<TrophyIcon size={14} />}>
              Ennätys
            </Badge>
            <Badge variant="danger">Poistuu</Badge>
          </div>
        </Section>

        <Section title="Suodatus: Chip">
          <ChipRow label="Lihasryhmäsuodatus">
            {[
              ['chest', 'Rinta', 12],
              ['lats', 'Leveä selkälihas', 9],
              ['quads', 'Etureisi', 8],
              ['biceps', 'Hauis', 6],
              ['abs', 'Vatsa', 5],
            ].map(([id, label, count]) => (
              <Chip
                key={String(id)}
                label={String(label)}
                count={Number(count)}
                selected={muscleFilter.includes(String(id))}
                onClick={() => toggleFilter(String(id))}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Luvut: StatTile">
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Volyymi"
              value={12450}
              format={formatVolume}
              delta={1250}
              formatDelta={(value) => formatWeightDelta(value)}
            />
            <StatTile
              label="Paras e1RM"
              value={104.2}
              format={formatWeight}
              delta={4.1}
              formatDelta={formatPercentDelta}
            />
            <StatTile label="Työsarjat" value={14.5} format={formatSets} delta={-2} formatDelta={formatRepsDelta} />
            <StatTile label="Kesto" value={58} format={(value) => `${value} min`} />
          </div>
        </Section>

        <Section title="Edistyminen">
          <div className="flex items-center gap-4">
            <ProgressRing progress={0.75} size={72} label="Viikkotavoite 3/4 treeniä">
              <span className="num text-lg font-semibold">3/4</span>
              <span className="text-[0.625rem] text-muted">treeniä</span>
            </ProgressRing>
            <ProgressRing progress={0.4} size={56} tone="good" label="Lepoa jäljellä 60 sekuntia" />
            <ProgressRing progress={1} size={56} tone="record" label="Ennätysrengas täynnä" />
          </div>
          <div className="flex flex-col gap-2">
            <ProgressBar progress={0.62} label="Viikon sarjat: rinta" />
            <ProgressBar progress={0.9} tone="good" zone={{ from: 0.5, to: 1 }} label="Viikon sarjat: selkä, ohjealue 10–20" />
            <ProgressBar progress={0.2} tone="warn" label="Viikon sarjat: pohkeet" />
          </div>
        </Section>

        <Section title="Lomake">
          <TextField label="Liikkeen nimi" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Painonlisäys"
            value="kaksi ja puoli"
            readOnly
            error="Anna luku, esim. 2,5"
            inputMode="decimal"
          />
          <TextArea
            label="Muistiinpano"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Esim. oikea olkapää kipeä"
            hint="Näkyy vain tässä treenissä"
          />
        </Section>

        <Section title="Listat">
          <ListGroup>
            <ListRow
              title="Lepoajastimen ääni"
              subtitle="Soi, kun lepo päättyy"
              leading={<ClockIcon size={20} />}
              trailing={<Toggle checked={sound} onChange={setSound} label="Lepoajastimen ääni" />}
            />
            <ListRow
              title="Tallennuksen pysyvyys"
              subtitle="Selain voi tyhjentää datan ilman tätä"
              leading={<ArchiveIcon size={20} />}
              trailing={<Toggle checked={persist} onChange={setPersist} label="Tallennuksen pysyvyys" />}
            />
            <ListRow title="Varmuuskopiot" subtitle="Viimeksi 12 päivää sitten" leading={<ExportIcon size={20} />} to="/settings/backup" />
            <ListRow
              title="Penkkipunnerrus"
              subtitle="Rinta · Tanko"
              leading={<BarbellIcon size={20} />}
              onClick={() => toast.show('Rivi napautettu')}
            />
          </ListGroup>
        </Section>

        <Section title="Järjestys: DragList" note="Kahvasta raahaten tai nuolinäppäimillä">
          <DragList
            items={exercises}
            onReorder={setExercises}
            getKey={(item) => item.id}
            getLabel={(item) => item.name}
            label="Päivän liikkeet"
            renderItem={(item, handle) => (
              <Card className="flex items-center gap-2 pr-3">
                {handle}
                <span className="min-w-0 flex-1 py-2">
                  <span className="block truncate text-[0.9375rem]">{item.name}</span>
                  <span className="num block text-xs text-muted">{item.detail}</span>
                </span>
                <SwapIcon size={20} className="text-muted" />
              </Card>
            )}
          />
        </Section>

        <Section title="Poisto: SwipeRow" note="Pyyhkäise vasemmalle">
          <div className="flex flex-col gap-2">
            {sets.map((set) => (
              <SwipeRow
                key={set}
                deleteLabel={`Poista sarja ${set}`}
                onDelete={() => {
                  setSets((current) => current.filter((value) => value !== set))
                  toast.show(`Sarja ${set} poistettu`, {
                    action: { label: 'Kumoa', onAction: () => setSets((current) => [...current, set].sort()) },
                  })
                }}
              >
                <div className="flex min-h-14 items-center gap-3 border border-border bg-surface-1 px-4">
                  <span className="num w-6 text-sm text-muted">{set}</span>
                  <span className="num flex-1 text-lg font-semibold">80 × 8</span>
                  <Badge variant="good">+2,5 kg</Badge>
                </div>
              </SwipeRow>
            ))}
            {sets.length === 0 ? (
              <Button variant="secondary" onClick={() => setSets([1, 2, 3])}>
                Palauta sarjat
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="Avautuva osio">
          <Collapsible
            title="Lokakuu 2026"
            subtitle="12 treeniä · 148 sarjaa"
            trailing={<Badge variant="good">+8 %</Badge>}
            defaultOpen
          >
            <p className="text-sm text-muted">
              Kuukauden treenit listataan tähän. Osio avautuu layout-animaatiolla, joten animaatio on
              pelkkää transformia.
            </p>
          </Collapsible>
          <Collapsible title="Liikkeen lisätiedot" subtitle="Lihakset, väline, oletukset">
            <p className="text-sm text-muted">Suljettu oletuksena.</p>
          </Collapsible>
        </Section>

        <Section title="Lihaskartta" note="Korttikuva 120 px ja lämpökartta 320 px">
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center">
              <MuscleMap
                view="front"
                primary={['chest', 'triceps']}
                secondary={['front_delts']}
                className="h-[132px]"
              />
              <p className="mt-1 text-center text-xs text-muted">Penkkipunnerrus</p>
            </div>
            <div className="flex flex-col items-center">
              <MuscleMap
                view="back"
                primary={['lats', 'upper_back']}
                secondary={['biceps', 'rear_delts']}
                className="h-[132px]"
              />
              <p className="mt-1 text-center text-xs text-muted">Kulmasoutu</p>
            </div>
          </div>
          <Card className="p-3">
            <CardHeader title="Viikon kuormitus" subtitle="Peittävyys = viikkosarjat lihasryhmälle" />
            <div className="px-1 pt-3 pb-1">
              <MuscleMap
                view="both"
                className="h-64 w-full"
                intensity={{
                  chest: 0.9,
                  front_delts: 0.6,
                  side_delts: 0.45,
                  triceps: 0.7,
                  lats: 0.8,
                  upper_back: 0.5,
                  biceps: 0.55,
                  quads: 1,
                  hamstrings: 0.35,
                  glutes: 0.4,
                  calves: 0.15,
                  abs: 0.3,
                }}
              />
            </div>
          </Card>
        </Section>

        <Section
          title="Lihasten valinta: MuscleSelector"
          note="Napautus kiertää: ei valittu → ensisijainen → toissijainen → ei valittu"
        >
          <MuscleSelector
            value={muscles}
            onChange={setMuscles}
            error={
              muscles.primary.length === 0 ? 'Valitse vähintään yksi ensisijainen lihas' : undefined
            }
          />
        </Section>

        <Section title="Ikonit: treenipäivät">
          <IconGrid
            items={DAY_ICON_LABELS.map(([icon, label]) => {
              const Icon = dayIcon(icon)
              return { label, node: <Icon /> }
            })}
          />
        </Section>

        <Section title="Ikonit: välineet">
          <IconGrid
            items={EQUIPMENT_ORDER.map((equipment) => {
              const Icon = equipmentIcon(equipment)
              return { label: equipmentLabel(equipment), node: <Icon /> }
            })}
          />
        </Section>

        <Section title="Ikonit: käyttöliittymä">
          <IconGrid items={UI_ICONS.map(([label, Icon]) => ({ label, node: <Icon /> }))} />
        </Section>
      </div>
    </>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">{title}</h2>
        {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

function IconGrid({ items }: { items: Array<{ label: string; node: React.ReactNode }> }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface-1 py-2.5 text-text"
        >
          {item.node}
          <span className="w-full truncate px-1 text-center text-[0.625rem] text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

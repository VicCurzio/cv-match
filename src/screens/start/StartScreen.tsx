import { ArrowRight, Building2, Download, Globe2, Mail, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { MARKET_PROFILES, type MarketId } from '@/domain/market/marketProfile'
import type { Settings } from '@/domain/resume/storage'
import type { CvSummary } from '@/domain/resume/useResume'
import { RecoveryNotice } from '@/screens/recovery/RecoveryNotice'
import { Card } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { Button } from '@/shared/ui/Button'
import { copy } from '@/shared/config/copy'
import { cn } from '@/shared/utils/cn'

/**
 * The answer to the empty state: nobody is dropped in front of a blank form.
 * The two questions asked here are the two that change the result the most.
 *
 * It is also where the resumes kept in this browser are listed. Several people
 * can have a resume here -- your own and a relative's -- and starting a new one
 * adds it, without touching the others.
 */

interface Props {
  /** The resumes with something in them. Empty on a first visit. */
  cvs: CvSummary[]
  onStart: (settings: Pick<Settings, 'market' | 'atsMode' | 'template'>) => void
  onOpen: (cv: CvSummary) => void
  /** Downloads one resume as a `.json` copy. */
  onBackup: (cv: CvSummary) => void
  onDelete: (cv: CvSummary) => void
  /** The raw text of a saved document that could not be read, to offer back. */
  unreadable: string | null
  onDismissUnreadable: () => void
}

function Choice({
  selected,
  title,
  hint,
  icon,
  onClick,
}: {
  selected: boolean
  title: string
  hint: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors duration-150 ease-out',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-muted-foreground/40',
      )}
    >
      <span className={cn('mt-0.5', selected ? 'text-primary' : 'text-muted-foreground')}>
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

export function StartScreen({ cvs, onStart, onOpen, onBackup, onDelete, unreadable, onDismissUnreadable }: Props) {
  const [market, setMarket] = useState<MarketId>('AR')
  const [atsMode, setAtsMode] = useState<boolean | null>(null)
  const [deleting, setDeleting] = useState<CvSummary | null>(null)

  const answers = {
    market,
    atsMode: atsMode === true,
    template: atsMode ? 'harvard' : 'modern',
  } as const

  // The one that was open last goes first: it is almost always the one to continue.
  const listed = [...cvs].sort((a, b) => Number(b.isOpen) - Number(a.isOpen))

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header>
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          {copy.appName}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{copy.start.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.start.subtitle}</p>
      </header>

      {unreadable ? <RecoveryNotice unreadable={unreadable} onDismiss={onDismissUnreadable} /> : null}

      {listed.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="saved-cvs">
          <h2 id="saved-cvs" className="text-sm font-medium">
            {copy.start.savedTitle}
          </h2>
          <ul className="flex flex-col gap-2">
            {listed.map((cv) => (
              <li key={cv.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cv.fullName || copy.start.unnamed}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {copy.start.versionCount(cv.versionIds.length)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={cv === listed[0] ? 'primary' : 'secondary'}
                      size="sm"
                      aria-label={copy.start.openLabel(cv.fullName)}
                      onClick={() => onOpen(cv)}
                    >
                      {copy.start.open}
                      <ArrowRight />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={copy.start.deleteLabel(cv.fullName)}
                      onClick={() => setDeleting(cv)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{copy.start.newInstead}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{copy.start.marketQuestion}</h2>
        {(Object.keys(MARKET_PROFILES) as MarketId[]).map((id) => (
          <Choice
            key={id}
            selected={market === id}
            title={MARKET_PROFILES[id].label}
            hint={MARKET_PROFILES[id].description}
            icon={id === 'AR' ? <Building2 size={18} /> : <Globe2 size={18} />}
            onClick={() => setMarket(id)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{copy.start.atsQuestion}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{copy.start.atsExplainer}</p>
        <Choice
          selected={atsMode === true}
          title={copy.start.atsYes}
          hint={copy.start.atsYesHint}
          icon={<Building2 size={18} />}
          onClick={() => setAtsMode(true)}
        />
        <Choice
          selected={atsMode === false}
          title={copy.start.atsNo}
          hint={copy.start.atsNoHint}
          icon={<Mail size={18} />}
          onClick={() => setAtsMode(false)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={listed.length > 0 ? 'secondary' : 'primary'}
          size="lg"
          disabled={atsMode === null}
          onClick={() => onStart(answers)}
        >
          {listed.length > 0 ? copy.start.beginNew : copy.start.begin}
          <ArrowRight />
        </Button>
      </div>

      {deleting ? (
        <Dialog label={copy.start.deleteTitle} onClose={() => setDeleting(null)} className="max-w-md" align="center">
          <div className="flex flex-col gap-4 p-5">
            <h2 className="text-base font-semibold">{copy.start.deleteTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {copy.start.deleteBody(deleting.fullName, deleting.versionIds.length)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  onBackup(deleting)
                  onDelete(deleting)
                  setDeleting(null)
                }}
              >
                <Download />
                {copy.start.backupAndDelete}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(deleting)
                  setDeleting(null)
                }}
              >
                {copy.start.deleteWithoutBackup}
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                {copy.start.cancel}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}

      <Card className="p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Todo pasa en tu navegador. El CV no se sube a ningún servidor, no hay cuenta que crear y
          nadie más lo ve.
        </p>
      </Card>
    </main>
  )
}

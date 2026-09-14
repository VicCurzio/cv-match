import { ArrowRight, Building2, Download, Globe2, Mail } from 'lucide-react'
import { useState } from 'react'
import { MARKET_PROFILES, type MarketId } from '@/domain/market/marketProfile'
import type { Settings } from '@/domain/resume/storage'
import { RecoveryNotice } from '@/screens/recovery/RecoveryNotice'
import { Card } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { Button } from '@/shared/ui/Button'
import { copy } from '@/shared/config/copy'
import { cn } from '@/shared/utils/cn'

/**
 * The answer to the empty state: nobody is dropped in front of a blank form.
 * The two questions asked here are the two that change the result the most.
 */

interface Props {
  /** The resume already in this browser, or `null` on a first visit. */
  saved: { fullName: string; versions: number } | null
  onStart: (settings: Pick<Settings, 'market' | 'atsMode' | 'template'>) => void
  onResume: () => void
  /** Downloads the saved document as a `.json` copy. */
  onBackup: () => void
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

export function StartScreen({ saved, onStart, onResume, onBackup, unreadable, onDismissUnreadable }: Props) {
  const [market, setMarket] = useState<MarketId>('AR')
  const [atsMode, setAtsMode] = useState<boolean | null>(null)
  const [confirming, setConfirming] = useState(false)

  const answers = {
    market,
    atsMode: atsMode === true,
    template: atsMode ? 'harvard' : 'modern',
  } as const

  /*
   * With a resume saved, "Empezar" used to carry on with that same resume under
   * the new answers: there was no way to start from zero -- to make a second
   * person's resume after your own -- short of clearing browser data by hand.
   * Starting over now replaces it, so it asks first and offers the copy.
   */
  function begin() {
    if (saved) setConfirming(true)
    else onStart(answers)
  }

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

      {saved ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium">{copy.start.savedTitle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {copy.start.savedDetail(saved.fullName, saved.versions)}
            </p>
          </div>
          <Button variant="primary" onClick={onResume}>
            {copy.start.resume}
            <ArrowRight />
          </Button>
        </Card>
      ) : null}

      {saved ? <p className="text-sm text-muted-foreground">{copy.start.newInstead}</p> : null}

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
          variant={saved ? 'secondary' : 'primary'}
          size="lg"
          disabled={atsMode === null}
          onClick={begin}
        >
          {saved ? copy.start.beginNew : copy.start.begin}
          <ArrowRight />
        </Button>
      </div>

      {confirming && saved ? (
        <Dialog
          label={copy.start.replaceTitle}
          onClose={() => setConfirming(false)}
          className="max-w-md"
          align="center"
        >
          <div className="flex flex-col gap-4 p-5">
            <h2 className="text-base font-semibold">{copy.start.replaceTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {copy.start.replaceBody(saved.fullName, saved.versions)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  onBackup()
                  onStart(answers)
                }}
              >
                <Download />
                {copy.start.backupAndBegin}
              </Button>
              <Button variant="destructive" onClick={() => onStart(answers)}>
                {copy.start.beginWithoutBackup}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
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

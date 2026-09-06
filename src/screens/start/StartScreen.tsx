import { ArrowRight, Building2, Globe2, Mail } from 'lucide-react'
import { useState } from 'react'
import { MARKET_PROFILES, type MarketId } from '@/domain/market/marketProfile'
import type { Settings } from '@/domain/resume/storage'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { copy } from '@/shared/config/copy'
import { cn } from '@/shared/utils/cn'

/**
 * The answer to the empty state: nobody is dropped in front of a blank form.
 * The two questions asked here are the two that change the result the most.
 */

interface Props {
  hasSaved: boolean
  onStart: (settings: Pick<Settings, 'market' | 'atsMode' | 'template'>) => void
  onResume: () => void
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

export function StartScreen({ hasSaved, onStart, onResume }: Props) {
  const [market, setMarket] = useState<MarketId>('AR')
  const [atsMode, setAtsMode] = useState<boolean | null>(null)

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header>
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          {copy.appName}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{copy.start.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.start.subtitle}</p>
      </header>

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
          variant="primary"
          size="lg"
          disabled={atsMode === null}
          onClick={() =>
            onStart({
              market,
              atsMode: atsMode === true,
              template: atsMode ? 'harvard' : 'modern',
            })
          }
        >
          {copy.start.begin}
          <ArrowRight />
        </Button>
        {hasSaved ? (
          <Button variant="ghost" size="lg" onClick={onResume}>
            {copy.start.resume}
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Todo pasa en tu navegador. El CV no se sube a ningún servidor, no hay cuenta que crear y
          nadie más lo ve.
        </p>
      </Card>
    </main>
  )
}

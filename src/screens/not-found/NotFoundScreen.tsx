import { Link } from 'react-router'
import { Card } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'
import { paths } from '@/screens/routes'

/**
 * A mistyped address gets a way back, not a blank page. Without a catch-all
 * route the app renders nothing at all, and it looks broken rather than lost.
 */
export function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="flex w-full flex-col gap-3 p-6">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">{copy.appName}</p>
        <h1 className="text-xl font-semibold">{copy.notFound.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.notFound.body}</p>
        <Link
          to={paths.start}
          className="mt-2 inline-flex h-10 w-fit items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          {copy.notFound.back}
        </Link>
      </Card>
    </main>
  )
}

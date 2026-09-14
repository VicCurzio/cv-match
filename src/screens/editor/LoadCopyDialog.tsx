import { Download } from 'lucide-react'
import type { ImportPlan } from '@/domain/resume/storage'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { copy } from '@/shared/config/copy'

/**
 * Asks before a `.json` copy replaces what is open, naming both sides. Same
 * three ways out as starting a new resume: keep a copy first, go ahead, or not.
 */
export function LoadCopyDialog({
  plan,
  onBackup,
  onLoad,
  onClose,
}: {
  plan: ImportPlan
  onBackup: () => void
  onLoad: () => void
  onClose: () => void
}) {
  const body =
    plan.scope === 'document'
      ? copy.loadCopy.whole(
          plan.current.fullName,
          plan.current.versions,
          plan.incoming.fullName,
          plan.incoming.versions,
        )
      : copy.loadCopy.base(plan.current.fullName, plan.incoming.fullName, plan.current.versions)

  return (
    <Dialog label={copy.loadCopy.title} onClose={onClose} className="max-w-md" align="center">
      <div className="flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold">{copy.loadCopy.title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              onBackup()
              onLoad()
            }}
          >
            <Download />
            {copy.loadCopy.backupAndLoad}
          </Button>
          <Button variant="destructive" onClick={onLoad}>
            {copy.loadCopy.loadWithoutBackup}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {copy.loadCopy.cancel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

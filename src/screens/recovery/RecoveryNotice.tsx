import { downloadBlob } from '@/domain/export/download'
import { Button } from '@/shared/ui/Button'
import { Notice } from '@/shared/ui/Card'
import { copy } from '@/shared/config/copy'

/**
 * A saved document that could not be read, offered back before the autosave
 * writes over it. It is the one failure in this app that destroys work.
 *
 * Shown on the start screen as well as in the editor. Since the app has routes,
 * an unreadable document means no resume, and no resume means the editor
 * redirects to the start screen -- so an offer that lived only in the editor
 * was out of sight exactly when it mattered.
 */
export function RecoveryNotice({ unreadable, onDismiss }: { unreadable: string; onDismiss: () => void }) {
  return (
    <Notice tone="warning" live>
      {copy.recovery.unreadable}
      <span className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            downloadBlob(new Blob([unreadable], { type: 'application/json' }), copy.recovery.fileName)
            onDismiss()
          }}
        >
          {copy.recovery.download}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {copy.recovery.dismiss}
        </Button>
      </span>
    </Notice>
  )
}

import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useMatch, useNavigate } from 'react-router'
import { downloadJson } from '@/domain/export/download'
import { useResume } from '@/domain/resume/useResume'
import { NotFoundScreen } from '@/screens/not-found/NotFoundScreen'
import { VERSION_ROUTE, editorAccess, paths, resumePath } from '@/screens/routes'
import { StartScreen } from '@/screens/start/StartScreen'
import { copy } from '@/shared/config/copy'

/*
 * The editor is loaded when someone gets to it, not with the start screen. It
 * carries the PDF renderer and its layout engine -- over half a megabyte
 * compressed -- and the start screen is two questions: on a phone with a weak
 * signal that was several seconds of blank page before anything to read.
 */
const EditorScreen = lazy(() =>
  import('@/screens/editor/EditorScreen').then((module) => ({ default: module.EditorScreen })),
)

function EditorLoading() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-8" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-card" />
      <div className="h-[60vh] animate-pulse rounded-card bg-card" />
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const onEditor = useMatch(paths.editor)
  const onVersion = useMatch(VERSION_ROUTE)

  // The address selects the version; the start screen and the 404 select nothing.
  const selected = onVersion ? (onVersion.params.versionId ?? null) : onEditor ? null : undefined
  const state = useResume(selected)

  // Answering the start questions in this visit counts as having a resume, even
  // before the first autosave lands.
  const [started, setStarted] = useState(false)
  const versionIds = state.versions.map((version) => version.id)

  const editor = () => {
    const access = editorAccess({
      hasResume: state.hasSaved || started,
      versionId: selected ?? null,
      versionIds,
    })
    return access.kind === 'redirect' ? <Navigate to={access.to} replace /> : (
      <Suspense fallback={<EditorLoading />}>
        <EditorScreen state={state} />
      </Suspense>
    )
  }

  return (
    <Routes>
      <Route
        path={paths.start}
        element={
          <StartScreen
            // Answered earlier in this visit counts: going back from the editor
            // must still offer to continue, not only to start over.
            saved={
              state.hasSaved || started
                ? { fullName: state.base.personal.fullName, versions: state.versions.length }
                : null
            }
            onBackup={() => downloadJson(state.toDocument(), copy.start.backupFileName)}
            onStart={(settings) => {
              // A first visit has nothing to replace. Otherwise the screen has
              // already asked, and this is the confirmed start over.
              if (state.hasSaved || started) state.startNew(settings)
              else state.setBaseSettings(settings)
              setStarted(true)
              navigate(paths.editor)
            }}
            onResume={() => navigate(resumePath(state.activeVersionId, versionIds))}
          />
        }
      />
      <Route path={paths.editor} element={editor()} />
      <Route path={VERSION_ROUTE} element={editor()} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}

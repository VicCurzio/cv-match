import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useMatch, useNavigate } from 'react-router'
import { downloadJson } from '@/domain/export/download'
import { exportCv } from '@/domain/resume/storage'
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
      hasResume: state.cvs.length > 0 || started,
      versionId: selected ?? null,
      versionIds,
    })
    // Under /editor, only the base and a version are addresses; anything else goes to the base.
    if (!onEditor && !onVersion) return <Navigate to={paths.editor} replace />
    // No resume at all: the start screen replaces the editor.
    if (access.kind === 'redirect' && access.to !== paths.editor) return <Navigate to={access.to} replace />

    /*
     * A version that is not in the open resume redirects BESIDE the editor, not
     * instead of it. React Router applies an address change as a transition,
     * behind ordinary state updates, so switching resume or deleting a version
     * briefly renders the new state under the old address. Rendering the
     * redirect in the editor's place then unmounted the editor and built it
     * again: the preview was redrawn from nothing and a notice raised a moment
     * before was gone.
     */
    return (
      <>
        {access.kind === 'redirect' ? <Navigate to={access.to} replace /> : null}
        <Suspense fallback={<EditorLoading />}>
          <EditorScreen state={state} />
        </Suspense>
      </>
    )
  }

  return (
    <Routes>
      <Route
        path={paths.start}
        element={
          <StartScreen
            cvs={state.cvs}
            unreadable={state.unreadable}
            onDismissUnreadable={state.dismissUnreadable}
            onBackup={(cv) => {
              const saved = state.findCv(cv.id)
              if (saved) downloadJson(exportCv(saved), copy.start.backupFileName)
            }}
            onDelete={(cv) => state.deleteCv(cv.id)}
            onStart={(settings) => {
              // An untouched resume is reused; otherwise a new one is added
              // beside the others, which stay as they are.
              if (state.openIsBlank) state.setBaseSettings(settings)
              else state.createCv(settings)
              setStarted(true)
              navigate(paths.editor)
            }}
            onOpen={(cv) => {
              state.openCv(cv.id)
              navigate(resumePath(cv.activeVersionId, cv.versionIds))
            }}
          />
        }
      />
      {/*
        One route for the base and every version, and anything else under
        /editor goes back to the base (see `editor` above).
      */}
      <Route path={`${paths.editor}/*`} element={editor()} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}

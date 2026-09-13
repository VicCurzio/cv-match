import { useState } from 'react'
import { Navigate, Route, Routes, useMatch, useNavigate } from 'react-router'
import { useResume } from '@/domain/resume/useResume'
import { EditorScreen } from '@/screens/editor/EditorScreen'
import { NotFoundScreen } from '@/screens/not-found/NotFoundScreen'
import { VERSION_ROUTE, editorAccess, paths, resumePath } from '@/screens/routes'
import { StartScreen } from '@/screens/start/StartScreen'

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
    return access.kind === 'redirect' ? <Navigate to={access.to} replace /> : <EditorScreen state={state} />
  }

  return (
    <Routes>
      <Route
        path={paths.start}
        element={
          <StartScreen
            hasSaved={state.hasSaved}
            onStart={(settings) => {
              state.setSettings(settings)
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

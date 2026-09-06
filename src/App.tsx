import { useState } from 'react'
import { useResume } from '@/domain/resume/useResume'
import { EditorScreen } from '@/screens/editor/EditorScreen'
import { StartScreen } from '@/screens/start/StartScreen'

export default function App() {
  const state = useResume()
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <StartScreen
        hasSaved={state.hasSaved}
        onStart={(settings) => {
          state.setSettings(settings)
          setStarted(true)
        }}
        onResume={() => setStarted(true)}
      />
    )
  }

  return <EditorScreen state={state} />
}

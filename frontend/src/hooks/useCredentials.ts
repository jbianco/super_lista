import { useState } from 'react'

export function useCredentials() {
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({})
  const [showCreds, setShowCreds] = useState(false)

  return { credentials, setCredentials, showCreds, setShowCreds }
}

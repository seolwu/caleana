import { useState, useEffect } from 'react'

const useKeyboardDetection = () => {
  const [isKeyboardAvailable, setIsKeyboardAvailable] = useState(false)

  useEffect(() => {
    const detectKeyboard = () => {
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
      setIsKeyboardAvailable(isDesktop || !hasCoarsePointer)
    }

    detectKeyboard()
    window.addEventListener('resize', detectKeyboard)

    return () => {
      window.removeEventListener('resize', detectKeyboard)
    }
  }, [])

  return isKeyboardAvailable
}

export default useKeyboardDetection
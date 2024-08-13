'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getOrCreateDefaultWorkspace } from '@/lib/indexeddb'
import Loading from '@/components/loading'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initDB()
        const defaultWorkspace = await getOrCreateDefaultWorkspace()
        router.push(`/workspace/${defaultWorkspace.id}`)
      } catch (error) {
        console.error('Error initializing app:', error)
      }
    }

    initializeApp()
  }, [router])

  return (<Loading />)
}
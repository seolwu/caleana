'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Workspace, LinkItem, Attribute } from '@/types'
import { saveWorkspace, saveLinks, saveAttributes } from '@/lib/indexeddb'

export default function ImportWorkspacePage({ params }: { params: { base64: string } }) {
  const router = useRouter()

  useEffect(() => {
    const importWorkspace = async () => {
      try {
        const stringifyData = atob(decodeURIComponent(params.base64))
        const importData = JSON.parse(stringifyData)
        if (importData.workspace && importData.links && importData.attributes) {
          const workspace: Workspace = importData.workspace
          const links: LinkItem[] = importData.links
          const attributes: Attribute[] = importData.attributes

          await saveWorkspace(workspace)
          await saveLinks(links, workspace.id)
          await saveAttributes(attributes, workspace.id)

          router.push(`/workspace/${workspace.id}`)
        } else {
          throw new Error('Invalid import data structure')
        }
      } catch (error) {
        console.error('Import error:', error)
        router.push('/')
      }
    }

    importWorkspace()
  }, [params.base64, router])

  return (
    <div className='min-h-screen bg-base-200 flex items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold mb-4'>Importing Workspace...</h1>
        <div className='loading loading-spinner loading-lg'></div>
      </div>
    </div>
  )
}
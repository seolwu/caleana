import React, { useCallback, useEffect, useState } from 'react'
import { Attribute, LinkItem, Workspace } from '@/types'
import { saveWorkspace, deleteWorkspace } from '@/lib/indexeddb'

interface WorkspaceManagerProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace
  onWorkspaceChange: (workspace: Workspace) => void
  onWorkspacesChange: (workspaces: Workspace[]) => void
  activeTab: string
  links: LinkItem[]
  attributes: Attribute[]
  onImport: (workspace: Workspace, links: LinkItem[], attributes: Attribute[]) => void
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onWorkspacesChange,
  activeTab,
  links,
  attributes,
  onImport,
}) => {
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newPropertyState, setNewPropertyState] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    setNewPropertyState(false)
  }, [activeTab])

  const handleAddWorkspace = useCallback(async () => {
    if (newWorkspaceName.trim()) {
      const newWorkspace: Workspace = {
        id: Date.now().toString(),
        name: newWorkspaceName.trim(),
      }
      const updatedWorkspaces = [...workspaces, newWorkspace]
      await saveWorkspace(newWorkspace)
      onWorkspacesChange(updatedWorkspaces)
      setNewWorkspaceName('')
    }
  }, [workspaces, newWorkspaceName, saveWorkspace, onWorkspacesChange, setNewWorkspaceName])

  const handleDeleteWorkspace = useCallback(async (id: string) => {
    await deleteWorkspace(id)
    const updatedWorkspaces = workspaces.filter(ws => ws.id !== id)
    onWorkspacesChange(updatedWorkspaces)
    if (currentWorkspace.id === id && updatedWorkspaces.length > 0) {
      onWorkspaceChange(updatedWorkspaces[0])
    }
  }, [workspaces, currentWorkspace, deleteWorkspace, onWorkspaceChange, onWorkspacesChange])

  const handleNewProperty = useCallback(() => {
    setNewPropertyState(true)
  }, [setNewPropertyState])

  const handleCancelProperty = useCallback(() => {
    setNewPropertyState(false)
  }, [setNewPropertyState])

  const handleExport = useCallback(() => {
    const utf8ToBase64 = (data: string) => {
      return btoa(encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16))
      }))
    }
    const generateRandomString = (seed: number, length: number): string => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      const seededRandom = (seed: number) => {
        let x = Math.sin(seed++) * 10000
        return x - Math.floor(x)
      }
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(seededRandom(seed + i) * characters.length)
        result += characters.charAt(randomIndex)
      }
      return result
    }

    const exportWorkspaceData = {
      id: Date.now().toString(),
      name: generateRandomString(Date.now(), 13),
    }

    const exportData = {
      workspace: exportWorkspaceData,
      links,
      attributes,
    }
    const exportString = utf8ToBase64(JSON.stringify(exportData))
    const exportUrl = `${window.location.origin}/workspace/new/${exportString}`
    
    navigator.clipboard.writeText(exportUrl).then(() => {
      alert('Export URL copied to clipboard!')
    }, (err) => {
      console.error('Could not copy text: ', err)
    })
  }, [])

  const handleImport = useCallback((importString: string) => {
    try {
      const str = atob(importString)
      const importData = JSON.parse(str)
      if (importData.workspace && importData.links && importData.attributes) {
        onImport(importData.workspace, importData.links, importData.attributes)
        setImportError(null)
      } else {
        throw new Error('Invalid import data structure')
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportError('Invalid import data. Please check the URL or string and try again.')
    }
    return importError === null
  }, [onImport, importError, setImportError])

  const sortKey = useCallback((item: { name: string }): [number, string, string, string, string] => {
    if (item.name === 'Default') {
      return [0, '', '', '', '']
    }

    const value = item.name
    const alphas = value.replace(/[^a-zA-Z]/g, '')
    const numbers = value.replace(/[^0-9]/g, '')
    const specials = value.replace(/[a-zA-Z0-9\u0080-\uFFFF]/g, '')
    const unicodeChars = value.replace(/[\u0000-\u007F]/g, '')

    return [1, alphas.toLowerCase(), unicodeChars, numbers, specials]
  }, [])

  return (
    <>
      <h3 className='text-lg font-semibold mb-4'>Workspaces</h3>
      <ul className='mb-4'>
        {workspaces.sort((a, b) => {
          const keyA = sortKey(a)
          const keyB = sortKey(b)
          
          for (let i = 0; i < keyA.length; i++) {
            if (keyA[i] < keyB[i]) return -1
            if (keyA[i] > keyB[i]) return 1
          }
          
          return 0
        }).map(workspace => (
          <li key={workspace.id} className='flex justify-between items-center mb-2'>
            <span>{workspace.name}</span>
            <div>
              <button
                className='btn btn-sm btn-primary mr-2'
                onClick={() => onWorkspaceChange(workspace)}
                disabled={workspace.id === currentWorkspace.id}
              >
                Select
              </button>
              <button
                className='btn btn-sm btn-error'
                onClick={() => workspace.id !== 'default' && handleDeleteWorkspace(workspace.id)}
                disabled={workspaces.length === 1 || workspace.id === 'default'}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {newPropertyState ? (
        <div className='mb-4'>
          <input
            type='text'
            placeholder='New workspace name'
            className='input input-bordered w-full max-w-sm mb-2'
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
          />
          <button className='btn btn-neutral ml-1 float-right' onClick={handleCancelProperty}>
            Cancel
          </button>
          <button className='btn btn-primary float-right' onClick={handleAddWorkspace}>
            Add Workspace
          </button>
        </div>
      ) : (
        <button className='btn btn-primary float-right' onClick={handleNewProperty}>
          New Workspace
        </button>
      )}
      <div className='mt-6 space-y-4'>
        <button className='btn btn-primary w-full mt-4' onClick={handleExport}>
          Export Current Workspace
        </button>
        <div>
          <input
            type='text'
            placeholder='Paste import URL or base64 string here'
            className='input input-bordered w-full'
            onChange={(e) => (handleImport(e.target.value.split('/').pop() || '') && (e.target.value = ''))}
          />
          {importError && <p className='text-error mt-2'>{importError}</p>}
        </div>
      </div>
    </>
  )
}

export default WorkspaceManager
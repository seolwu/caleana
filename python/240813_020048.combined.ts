// ..\app\layout.tsx
import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const font = Noto_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Project Caleana',
  description: 'Manage your links more easily and access them at faster speeds.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={font.className}>{children}</body>
    </html>
  )
}



// ..\app\page.tsx
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


// ..\app\workspace\[id]\page.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Gallery from '@/components/Gallery'
import AddLinkDialog from '@/components/AddLinkDialog'
import EditLinkDialog from '@/components/EditLinkDialog'
import Settings from '@/components/Settings'
import Drawer from '@/components/Drawer'
import TxtFileImport from '@/components/TxtFileImport'
import Toast from '@/components/Toast'
import Loading from '@/components/loading'
import { sortLinks, filterLinks } from '@/utils/sort-filter-utils'
import { LinkItem, Attribute, Workspace } from '@/types'
import {
  initDB,
  saveLinks,
  getLinks,
  saveAttributes,
  getAttributes,
  deleteLink,
  getWorkspaces,
  saveWorkspace,
  getOrCreateDefaultWorkspace,
} from '@/lib/indexeddb'
import useKeyboardDetection from '@/hooks/useKeyboardDetection'
import { SortAttributeTypes, Items, filterAttributeTypes } from '@/types/constants'

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [links, setLinks] = useState<LinkItem[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTxtImportDrawerOpen, setIsTxtImportDrawerOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null)
  const [sortBy, setSortBy] = useState('최신 순')
  const [filterBy, setFilterBy] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isKeyboardAvailable = useKeyboardDetection()

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB()
        const loadedWorkspaces = await getWorkspaces()
        setWorkspaces(loadedWorkspaces)

        let currentWorkspace = loadedWorkspaces.find(ws => ws.id === params.id)
        if (!currentWorkspace) {
          currentWorkspace = await getOrCreateDefaultWorkspace()
        }
        setCurrentWorkspace(currentWorkspace)

        const [loadedLinks, loadedAttributes] = await Promise.all([
          getLinks(currentWorkspace.id),
          getAttributes(currentWorkspace.id),
        ])
        setLinks(loadedLinks.map((link, index) => ({ ...link, order: link.order ?? index })))
        setAttributes([
          { id: '1', name: filterAttributeTypes.FAVORITES, type: 'filter', isDefault: true },
          ...loadedAttributes.filter(attr => !attr.isDefault),
        ])
      } catch (error) {
        console.error('Error initializing database or loading data:', error)
        setToastMessage('Error loading data. Please try refreshing the page.')
        setShowToast(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id])
  
  const handleAddLink = useCallback(async (url: string, title: string, thumbnailUrl: string | null) => {
    if (!currentWorkspace) return
    const newLink: LinkItem = {
      id: Date.now().toString(),
      url,
      title,
      domain: new URL(url).hostname,
      isFavorite: false,
      thumbnailUrl,
      order: links.length,
    }
    try {
      await saveLinks([...links, newLink], currentWorkspace.id)
      setLinks(prevLinks => [...prevLinks, newLink])
      setToastMessage('Link added successfully')
      setShowToast(true)
    } catch (error) {
      console.error('Error adding link:', error)
      setToastMessage('Error adding link. Please try again.')
      setShowToast(true)
    }
  }, [links, currentWorkspace])

  const handleEditLink = useCallback((id: string) => {
    const linkToEdit = links.find(link => link.id === id)
    if (linkToEdit) {
      setEditingLink(linkToEdit)
      setIsEditDialogOpen(true)
    }
  }, [links])

  const handleImportLinks = useCallback(async (importedLinks: {
    url: string
    title: string
    thumbnailUrl: string | null
    isFavorite: boolean
    order: number,
  }[]) => {
    if (!currentWorkspace) return
    const newLinks: LinkItem[] = importedLinks.map(link => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...link,
      domain: new URL(link.url).hostname,
    }))
    const updatedLinks = [...links, ...newLinks]
    setLinks(updatedLinks)
    await saveLinks(updatedLinks, currentWorkspace.id)
    setToastMessage(`Successfully imported ${newLinks.length} links`)
    setShowToast(true)
  }, [links, currentWorkspace])

  const handleDeleteLink = useCallback(async (id: string) => {
    if (!currentWorkspace) return
    try {
      await deleteLink(id, currentWorkspace.id)
      setLinks(prevLinks => prevLinks.filter(link => link.id !== id))
      setToastMessage('Link deleted successfully')
      setShowToast(true)
    } catch (error) {
      console.error('Error deleting link:', error)
      setToastMessage('Error deleting link. Please try again.')
      setShowToast(true)
    }
  }, [currentWorkspace])

  const handleToggleFavorite = useCallback((id: string) => {
    setLinks(prevLinks => prevLinks.map(link => 
      link.id === id ? { ...link, isFavorite: !link.isFavorite } : link
    ))
  }, [])

  const handleSaveAttributes = useCallback(async (newAttributes: Attribute[]) => {
    if (!currentWorkspace) return
    try {
      await saveAttributes(newAttributes, currentWorkspace.id)
      setAttributes(newAttributes)
      setToastMessage('Attributes saved successfully')
      setShowToast(true)
    } catch (error) {
      console.error('Error saving attributes:', error)
      setToastMessage('Error saving attributes. Please try again.')
      setShowToast(true)
    }
  }, [currentWorkspace])

  const handleWorkspaceChange = useCallback((workspace: Workspace) => {
    router.push(`/workspace/${workspace.id}`)
  }, [router])

  const handleDropdownSelect = useCallback((item: string, category: string) => {
    switch (category) {
      case Items.ADD:
        if (item === Items.ADD_LINK) {
          setIsAddDialogOpen(true)
        } else if (item === Items.ADD_TXT_FILE) {
          setIsTxtImportDrawerOpen(true)
        }
        break
      case Items.SORT:
        setSortBy(item)
        break
      case Items.FILTER:
        setFilterBy(prevFilterBy => prevFilterBy === item ? '' : item)
        break
      default:
        console.log(`Unhandled category: ${category}`)
    }
  }, [])
  
  const handleMoveItem = useCallback(async (dragIndex: number, hoverIndex: number) => {
    setLinks(prevLinks => {
      const newLinks = [...prevLinks]
      const draggedItem = newLinks[dragIndex]
      newLinks.splice(dragIndex, 1)
      newLinks.splice(hoverIndex, 0, draggedItem)
      return newLinks.map((link, index) => ({ ...link, order: index }))
    })
    setSortBy(SortAttributeTypes.CUSTOM)

    if (currentWorkspace) {
      try {
        await saveLinks(links.map((link, index) => ({ ...link, order: index })), currentWorkspace.id)
      } catch (error) {
        console.error('Error saving links after reordering:', error)
        setToastMessage('Error saving link order. Please try again.')
        setShowToast(true)
      }
    }
  }, [links, currentWorkspace])

  const handleImport = useCallback(async (newWorkspace: Workspace, newLinks: LinkItem[], newAttributes: Attribute[]) => {
    try {
      await saveWorkspace(newWorkspace)
      await saveLinks(newLinks, newWorkspace.id)
      await saveAttributes(newAttributes, newWorkspace.id)
      
      setWorkspaces(prev => [...prev, newWorkspace])
      setLinks(newLinks)
      setAttributes(newAttributes)
      setCurrentWorkspace(newWorkspace)
      
      router.push(`/workspace/${newWorkspace.id}`)
      setToastMessage('Workspace imported successfully')
      setShowToast(true)
    } catch (error) {
      console.error('Error importing workspace:', error)
      setToastMessage('Error importing workspace. Please try again.')
      setShowToast(true)
    }
  }, [router])

  const processedLinks = useMemo(() => {
    let result = [...links]
    if (sortBy === SortAttributeTypes.CUSTOM) {
      result.sort((a, b) => a.order - b.order)
    } else if (sortBy) {
      result = sortLinks(result, sortBy, attributes)
    }
    if (filterBy) {
      result = filterLinks(result, filterBy, attributes)
    }
    if (searchTerm) {
      result = result.filter(link => 
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return result
  }, [links, sortBy, filterBy, searchTerm, attributes])

  if (isLoading || !currentWorkspace) {
    return (<Loading />)
  }

  return (
    <div className='min-h-screen bg-base-200 flex flex-col animate-fade-in'>
      <Header 
        onDropdownSelect={handleDropdownSelect} 
        attributes={attributes}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchInputRef={searchInputRef}
        isKeyboardAvailable={isKeyboardAvailable}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentWorkspace={currentWorkspace}
      />
      <main className='flex-grow container mx-auto py-8 animate-slide-in-top'>
        <Gallery 
          items={processedLinks} 
          onDelete={handleDeleteLink}
          onToggleFavorite={handleToggleFavorite}
          onEdit={handleEditLink}
          onMoveItem={handleMoveItem}
        />
      </main>
      <AddLinkDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddLink}
        workspaceId={currentWorkspace.id}
      />
      <EditLinkDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingLink(null)
        }}
        onEdit={handleEditLink}
        link={editingLink}
        workspaceId={currentWorkspace.id}
      />
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        attributes={attributes}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSaveAttributes={handleSaveAttributes}
        onWorkspaceChange={handleWorkspaceChange}
        onWorkspacesChange={setWorkspaces}
        links={links}
        onImport={handleImport}
      />
      <Drawer isOpen={isTxtImportDrawerOpen} onClose={() => setIsTxtImportDrawerOpen(false)}>
        <TxtFileImport onImport={handleImportLinks} workspaceId={currentWorkspace.id} currentLinksCount={links.length} />
      </Drawer>
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  )
}


// ..\app\workspace\new\[base64]\page.tsx
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


// ..\app\workspace\new\page.tsx
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


// ..\app\workspace\page.tsx
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


// ..\components\AddLinkDialog.tsx
import React, { useState, useEffect } from 'react'
import Dialog from './Dialog'
import { getThumbnailFromUrl } from '@/utils/image-extraction-utils'

interface AddLinkDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (url: string, title: string, thumbnailUrl: string | null, workspaceId: string) => void
  workspaceId: string
}

const AddLinkDialog: React.FC<AddLinkDialogProps> = ({ isOpen, onClose, onAdd, workspaceId }) => {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  useEffect(() => {
    const generateThumbnail = async () => {
      if (url) {
        setIsGeneratingThumbnail(true)
        try {
          const thumbnail = await getThumbnailFromUrl(ensureHttpPrefix(url))
          setThumbnailUrl(thumbnail)
        } catch (error) {
          console.error('Error generating thumbnail:', error)
        } finally {
          setIsGeneratingThumbnail(false)
        }
      }
    }

    generateThumbnail()
  }, [url])

  const ensureHttpPrefix = (input: string): string => {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input
    }
    return `https://${input}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const processedUrl = ensureHttpPrefix(url)
    onAdd(processedUrl, title, thumbnailUrl, workspaceId)
    setUrl('')
    setTitle('')
    setThumbnailUrl(null)
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title='Add New Link'>
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label htmlFor='url' className='block text-sm font-medium mb-1'>URL</label>
          <input
            type='text'
            id='url'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className='input input-bordered w-full'
            placeholder='www.example.com'
            required
          />
        </div>
        <div className='mb-4'>
          <label htmlFor='title' className='block text-sm font-medium mb-1'>Title</label>
          <input
            type='text'
            id='title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='input input-bordered w-full'
            required
          />
        </div>
        {isGeneratingThumbnail && <p className='text-sm text-gray-500 mb-4'>Generating thumbnail...</p>}
        {thumbnailUrl && (
          <div className='stack w-full mb-4'>
            <div className='card bg-base-200 text-center shadow-md'>
              <img src={thumbnailUrl} alt='Thumbnail' className='w-full max-h-96 object-cover rounded' />
            </div>
            <div className='card bg-base-200 text-center shadow blur-sm'>
              <img src={thumbnailUrl} alt='Thumbnail' className='w-full max-h-96 object-cover rounded' />
            </div>
            <div className='card bg-base-200 text-center shadow-sm blur'>
              <img src={thumbnailUrl} alt='Thumbnail' className='w-full max-h-96 object-cover rounded' />
            </div>
          </div>
        )}
        <div className='flex justify-end space-x-2'>
          <button type='button' onClick={onClose} className='btn btn-ghost'>Cancel</button>
          <button type='submit' className='btn btn-primary'>Add</button>
        </div>
      </form>
    </Dialog>
  )
}

export default AddLinkDialog


// ..\components\AttributeManager.tsx
import React, { useCallback, useEffect, useState } from 'react'
import { Attribute } from '@/types'

interface AttributeManagerProps {
  attributes: Attribute[]
  type: 'sort' | 'filter'
  onSaveAttributes: (attributes: Attribute[]) => void
  activeTab: string
}

const AttributeManager: React.FC<AttributeManagerProps> = ({
  attributes,
  type,
  onSaveAttributes,
  activeTab,
}) => {
  const [newAttributeName, setNewAttributeName] = useState('')
  const [newAttributeCondition, setNewAttributeCondition] = useState('')
  const [newPropertyState, setNewPropertyState] = useState(false)

  useEffect(() => {
    setNewPropertyState(false)
  }, [activeTab])

  const handleAddAttribute = async () => {
    if (newAttributeName.trim()) {
      const newAttribute: Attribute = {
        id: Date.now().toString(),
        name: newAttributeName.trim(),
        type: type,
        condition: newAttributeCondition.trim() || undefined,
      }
      const updatedAttributes = [...attributes, newAttribute]
      await onSaveAttributes(updatedAttributes)
      setNewAttributeName('')
      setNewAttributeCondition('')
    }
  }

  const handleDeleteAttribute = async (id: string) => {
    const updatedAttributes = attributes.filter(attr => attr.id !== id)
    await onSaveAttributes(updatedAttributes)
  }

  const handleNewProperty = () => {
    setNewPropertyState(true)
  }

  const handleCancelProperty = () => {
    setNewPropertyState(false)
  }

  return (
    <>
      <h3 className='text-lg font-semibold mb-4'>
        {type === 'sort' ? 'Sort' : 'Filter'}
      </h3>
      <ul className='mb-4'>
        {attributes
          .filter(attr => attr.type === type)
          .map(attr => (
            <li key={attr.id} className='flex justify-between items-center mb-2'>
              <span>{attr.name}</span>
              <span className='text-sm text-gray-500'>{attr.condition}</span>
              <button
                className='btn btn-sm btn-error'
                onClick={() => attr.isDefault ?? handleDeleteAttribute(attr.id)}
                disabled={attr.isDefault}
              >
                Delete
              </button>
            </li>
          ))}
      </ul>
      {newPropertyState ? (
        <div className='mb-4'>
          <div>
            <input
              type='text'
              placeholder='New attribute name'
              className='input input-bordered w-full max-w-sm mb-2'
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
            />
            <button className='btn btn-primary float-right' onClick={handleAddAttribute}>
              Add Attribute
            </button>
          </div>
          <div>
            <input
              type='text'
              placeholder={activeTab === 'sort' ? 'a.title.localeCompare(b.title)' : 'item.url.includes("example")'}
              className='input input-bordered w-full max-w-sm mb-2'
              value={newAttributeCondition}
              onChange={(e) => setNewAttributeCondition(e.target.value)}
            />
            <button className='btn btn-neutral float-right' onClick={handleCancelProperty}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className='btn btn-primary float-right' onClick={handleNewProperty}>
          New Attribute
        </button>
      )}
    </>
  )
}

export default AttributeManager


// ..\components\Dialog.tsx
import React from 'react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center animate-fade-in'>
      <div className='relative bg-base-100 rounded-lg w-full max-w-2xl m-4 p-6 animate-scale-in shadow-xl'>
        <h2 className='text-2xl font-bold mb-4 text-base-content'>{title}</h2>
        <button
          onClick={onClose}
          className='absolute top-2 right-2 btn btn-sm btn-circle btn-ghost'
          aria-label='Close dialog'
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

export default Dialog


// ..\components\Drawer.tsx
import React from 'react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 overflow-hidden z-50 animate-fade-in'>
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute inset-0 bg-black bg-opacity-50 transition-opacity' onClick={onClose} />
        <section className='absolute inset-x-0 bottom-0 max-h-full flex animate-slide-in-bottom'>
          <div className='w-screen max-h-[80vh]'>
            <div className='h-full flex flex-col bg-base-100 shadow-xl overflow-y-scroll rounded-t-2xl'>
              <div className='flex-1 overflow-y-auto p-4'>
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Drawer


// ..\components\DropDown.tsx
import React, { useState, useRef, useEffect } from 'react'

interface DropdownProps {
  label: React.ReactNode
  items: string[]
  onSelect: (item: string) => void
}

const Dropdown: React.FC<DropdownProps> = ({ label, items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggle = () => setIsOpen(!isOpen)

  const handleSelect = (item: string) => {
    onSelect(item)
    setIsOpen(false)
  }

  return (
    <div className='dropdown' ref={dropdownRef}>
      <label tabIndex={0} className='btn m-1' onClick={handleToggle}>
        {label}
      </label>
      {isOpen && (
        <ul tabIndex={0} className='dropdown-content z-[1] menu p-2 shadow bg-base-300 rounded-box w-52'>
          {items.length === 0 ? (
            <span className='p-2'>The attribute does not exist.</span>
          ) : (
            items.map((item, index) => (
              <li key={index} onClick={() => handleSelect(item)}>
                <a>{item}</a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default Dropdown


// ..\components\DropdownMenu.tsx
import React, { useState, useRef, useEffect } from 'react'
import { DropdownProps } from '@/utils/types'

const Dropdown: React.FC<DropdownProps> = ({ label, items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggle = () => setIsOpen(!isOpen)

  const handleSelect = (item: string) => {
    onSelect(item)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        setIsOpen(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prevIndex) => (prevIndex + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length)
        break
      case 'Enter':
        if (focusedIndex !== -1) {
          handleSelect(items[focusedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  useEffect(() => {
    if (isOpen && focusedIndex !== -1) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  return (
    <div className='dropdown' ref={dropdownRef}>
      <label
        tabIndex={0}
        className='btn btn-base-200 m-1 whitespace-nowrap flex-nowrap'
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {label}
      </label>
      {isOpen && (
        <ul
          tabIndex={0}
          className='dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52'
        >
          {items.map((item, index) => (
            <li
              key={index}
              ref={(el: HTMLLIElement | null) => {
                itemRefs.current[index] = el
              }}
              tabIndex={0}
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelect(item)
              }}
              className={`hover:bg-base-300 ${focusedIndex === index ? 'bg-base-300' : ''}`}
            >
              <a>{item}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Dropdown


// ..\components\EditLinkDialog.tsx
import React, { useState, useEffect } from 'react'
import Dialog from './Dialog'
import { getThumbnailFromUrl } from '@/utils/image-extraction-utils'
import { LinkItem } from '@/types'

interface EditLinkDialogProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: string, url: string, title: string, thumbnailUrl: string | null, workspaceId: string) => void
  link: LinkItem | null
  workspaceId: string
}

const EditLinkDialog: React.FC<EditLinkDialogProps> = ({ isOpen, onClose, onEdit, link, workspaceId }) => {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  useEffect(() => {
    if (link) {
      setUrl(link.url)
      setTitle(link.title)
      setThumbnailUrl(link.thumbnailUrl)
    }
  }, [link])

  useEffect(() => {
    const generateThumbnail = async () => {
      if (url && url !== link?.url) {
        setIsGeneratingThumbnail(true)
        try {
          const thumbnail = await getThumbnailFromUrl(url)
          setThumbnailUrl(thumbnail)
        } catch (error) {
          console.error('Error generating thumbnail:', error)
        } finally {
          setIsGeneratingThumbnail(false)
        }
      }
    }

    generateThumbnail()
  }, [url, link])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (link) {
      onEdit(link.id, url, title, thumbnailUrl, workspaceId)
      onClose()
    }
  }

  if (!link) return null

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title='Edit Link'>
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label htmlFor='edit-url' className='block text-sm font-medium mb-1'>URL</label>
          <input
            type='url'
            id='edit-url'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className='input input-bordered w-full'
            required
          />
        </div>
        <div className='mb-4'>
          <label htmlFor='edit-title' className='block text-sm font-medium mb-1'>Title</label>
          <input
            type='text'
            id='edit-title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='input input-bordered w-full'
            required
          />
        </div>
        {isGeneratingThumbnail && <p className='text-sm text-gray-500 mb-4'>Generating thumbnail...</p>}
        {thumbnailUrl && (
          <div className='mb-4'>
            <img src={thumbnailUrl} alt='Thumbnail' className='w-full max-h-48 object-cover rounded' />
          </div>
        )}
        <div className='flex justify-end space-x-2'>
          <button type='button' onClick={onClose} className='btn btn-ghost'>Cancel</button>
          <button type='submit' className='btn btn-primary'>Save</button>
        </div>
      </form>
    </Dialog>
  )
}

export default EditLinkDialog


// ..\components\Gallery.tsx
import React, { useRef } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { LinkItem, SortType } from '@/types'

const DraggableWrapper = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode,
    className: string
  }
>(({ children, className }, ref) => <div ref={ref} className={className}>{children}</div>)

const GalleryItem: React.FC<{ 
  item: LinkItem 
  index: number 
  moveItem: (dragIndex: number, hoverIndex: number) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onEdit: (id: string) => void
}> = ({ item, index, moveItem, onDelete, onToggleFavorite, onEdit }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag({
    type: 'GALLERY_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'GALLERY_ITEM',
    hover(draggedItem: { index: number }) {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index)
        draggedItem.index = index
      }
    },
  })

  drag(drop(ref))

  const itemSize = item.thumbnailUrl ? 'col-span-1 row-span-2' : 'col-span-1 row-span-1'
  
  return (
    <DraggableWrapper ref={ref} className={`${itemSize} p-2`}>
      <div className={`card bg-base-100 shadow-xl h-full transition-all duration-200 ease-in-out ${isDragging ? 'opacity-50' : 'hover:scale-105'} animate-scale-in`}>
        {item.thumbnailUrl && ( 
          <figure className='px-4 pt-4'>
            <img src={item.thumbnailUrl} alt={item.title} className='rounded-xl object-cover w-full h-36' />
          </figure>
        )}
        <div className='card-body p-3'>
          <div className='grid p-2 gap-2'>
            <h2 className='card-title text-base line-clamp-2'>{item.title}</h2>
            <p className='text-sm text-gray-500 truncate'>{item.domain}</p>
          </div>
          <div className='card-actions justify-end mt-2'>
            <a 
              href={item.url} 
              target='_blank' 
              rel='noopener noreferrer' 
              className='btn btn-primary btn-xs'
            >
              Open
            </a>
            <button 
              className={`btn btn-xs ${item.isFavorite ? 'btn-warning' : 'btn-outline'}`} 
              onClick={() => onToggleFavorite(item.id)}
            >
              {item.isFavorite ? '★' : '☆'}
            </button>
            <button className='btn btn-info btn-xs' onClick={() => onEdit(item.id)}>Edit</button>
            <button className='btn btn-error btn-xs' onClick={() => onDelete(item.id)}>Delete</button>
          </div>
        </div>
      </div>
    </DraggableWrapper>
  )
}

const Gallery: React.FC<{ 
  items: LinkItem[] 
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onEdit: (id: string) => void
  onMoveItem: (dragIndex: number, hoverIndex: number) => void
}> = ({ items, onDelete, onToggleFavorite, onEdit, onMoveItem }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-auto grid-auto-flow-dense'>
        {items.map((item, index) => (
          <GalleryItem 
            key={item.id} 
            item={item} 
            index={index} 
            moveItem={onMoveItem} 
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
          />
        ))}
      </div>
    </DndProvider>
  )
}

export default Gallery


// ..\components\Header.tsx
import React from 'react'
import Dropdown from './DropDown'
import { Attribute, Workspace } from '@/types'
import { Items } from '@/types/constants'

interface HeaderProps {
  onDropdownSelect: (item: string, category: string) => void
  attributes: Attribute[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchInputRef: React.RefObject<HTMLInputElement>
  isKeyboardAvailable: boolean
  onOpenSettings: () => void
  currentWorkspace: Workspace
}

const Header: React.FC<HeaderProps> = ({ 
  onDropdownSelect, 
  attributes, 
  searchTerm, 
  setSearchTerm, 
  searchInputRef,
  isKeyboardAvailable,
  onOpenSettings,
  currentWorkspace
}) => {
  const sortAttributes = attributes.filter(attr => attr.type === 'sort').map(attr => attr.name)
  const filterAttributes = attributes.filter(attr => attr.type === 'filter').map(attr => attr.name)

  return (
    <header className='bg-base-100 shadow-lg p-4 select-none'>
      <div className='flex justify-between items-center'>
        <div className='flex space-x-4 items-center'>
          <Dropdown label={<>{Items.ADD} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>n</kbd>}</>}
            items={[Items.ADD_LINK, Items.ADD_TXT_FILE]} 
            onSelect={(item) => onDropdownSelect(item, Items.ADD)} 
          />
          {/* <Dropdown 
            label={<>{Items.SORT} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>s</kbd>}</>}
            items={sortAttributes} 
            onSelect={(item) => onDropdownSelect(item, Items.SORT)} 
          /> */}
          <Dropdown 
            label={<>{Items.FILTER} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>f</kbd>}</>}
            items={filterAttributes} 
            onSelect={(item) => onDropdownSelect(item, Items.FILTER)} 
          />
          <button className='btn btn-base-200' onClick={onOpenSettings}>
            {Items.SETTINGS} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>S</kbd>}
          </button>
        </div>
        <h1 className='text-lg font-bold'>{currentWorkspace.name}</h1>
        <div className='flex items-center space-x-4'>
          <div className='form-control'>
            <div className='input-group relative'>
              <input
                type='text'
                placeholder='Search…'
                className='input input-bordered'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
              />
              {isKeyboardAvailable && (
                <span className='absolute kbd kbd-sm my-3 right-4'>/</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header


// ..\components\Settings.tsx
import React, { useState, useEffect } from 'react'
import { Attribute, LinkItem, Workspace } from '@/types'
import AttributeManager from './AttributeManager'
import WorkspaceManager from './WorkspaceManager'
import { AnimatePresence, motion } from 'framer-motion'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  attributes: Attribute[]
  workspaces: Workspace[]
  currentWorkspace: Workspace
  onSaveAttributes: (attributes: Attribute[]) => void
  onWorkspaceChange: (workspace: Workspace) => void
  onWorkspacesChange: (workspaces: Workspace[]) => void
  links: LinkItem[]
  onImport: (workspace: Workspace, links: LinkItem[], attributes: Attribute[]) => void
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  attributes,
  workspaces,
  currentWorkspace,
  onSaveAttributes,
  onWorkspaceChange,
  onWorkspacesChange,
  links,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'sort' | 'filter' | 'workspace'>('workspace')
  const [localAttributes, setLocalAttributes] = useState<Attribute[]>(attributes)

  useEffect(() => {
    setLocalAttributes(attributes)
  }, [attributes])

  const handleSave = () => {
    onSaveAttributes(localAttributes)
    onClose()
  }

  const tabs = [
    { id: 'workspace', label: 'Workspaces' },
    { id: 'filter', label: 'Filter' },
    // { id: 'sort', label: 'Sort' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scaleX: 1.45, scaleY: 1.2 }}
          animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleX: 1.45, scaleY: 1.2 }}
          transition={{ duration: 0.3, ease: 'circInOut' }}
          className='fixed inset-0 bg-base-200 z-50 overflow-auto'
        >
          <div className='p-4 pb-2'>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm breadcrumbs">
                  <ul>
                    <li>Settings</li>
                    <li>{tabs.find(tab => tab.id === activeTab)?.label}</li>
                  </ul>
                </div>
              </div>
              <button onClick={onClose} className="btn btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className='flex'>
            <div className='w-1/4 pr-4'>
              <ul className='menu bg-base-200 rounded-box gap-1'>
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <a
                      className={activeTab === tab.id ? 'active' : ''}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    >
                      {tab.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className='w-3/4 pr-2'>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  {activeTab === 'filter' && (
                    <AttributeManager
                      attributes={localAttributes}
                      type={activeTab}
                      onSaveAttributes={onSaveAttributes}
                      activeTab={activeTab}
                    />
                  )}
                  {activeTab === 'workspace' && (
                    <WorkspaceManager
                      workspaces={workspaces}
                      currentWorkspace={currentWorkspace}
                      onWorkspaceChange={onWorkspaceChange}
                      onWorkspacesChange={onWorkspacesChange}
                      activeTab={activeTab}
                      links={links}
                      attributes={attributes}
                      onImport={onImport}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className='flex justify-end mt-6 p-2'>
            <button className='btn btn-ghost mr-2' onClick={onClose}>
              Cancel
            </button>
            <button className='btn btn-primary' onClick={handleSave}>
              Save
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    // <Dialog isOpen={isOpen} onClose={onClose} title='Settings'>

    // </Dialog>
  )
}

export default SettingsDialog


// ..\components\Toast.tsx
import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className='toast toast-end'>
      <div className='alert alert-success'>
        <div>
          <span>{message}</span>
        </div>
      </div>
    </div>
  )
}

export default Toast


// ..\components\TxtFileImport.tsx
import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { getThumbnailFromUrl } from '@/utils/image-extraction-utils'

interface TxtFileImportProps {
  onImport: (links: {
    url: string
    title: string
    thumbnailUrl: string | null
    isFavorite: boolean
    order: number
  }[], workspaceId: string) => Promise<void>
  workspaceId: string
  currentLinksCount: number
}

const TxtFileImport: React.FC<TxtFileImportProps> = ({ onImport, workspaceId, currentLinksCount }) => {
  const [content, setContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setContent(reader.result as string)
      }
      reader.readAsText(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/plain': ['.txt'] } })

  const parseLinks = (text: string) => {
    const lines = text.split('\n')
    const links: {
      url: string
      title: string
      isFavorite: boolean
    }[] = []
    let currentUrl = ''

    lines.forEach((line) => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        if (line.startsWith('http') || line.startsWith('https:')) {
          const parts = line.split(' ')
          currentUrl = parts[0]
          if (parts.length > 1) {
            const title = parts.slice(1, -1).join(' ') || parts[0]
            const isFavorite = parts[parts.length - 1] === '+'
            links.push({ url: currentUrl, title, isFavorite })
            currentUrl = ''
          }
        } else if (currentUrl) {
          const parts = line.split(' ')
          const title = parts.slice(0, -1).join(' ') || parts[0]
          const isFavorite = parts[parts.length - 1] === '+'
          links.push({ url: currentUrl + parts[0], title, isFavorite })
        }
      }
    })

    return links
  }

  const handleImport = async () => {
    setIsImporting(true)
    const parsedLinks = parseLinks(content)
    const linksWithThumbnails = await Promise.all(
      parsedLinks.map(async (link, index) => {
        const thumbnailUrl = await getThumbnailFromUrl(link.url)
        return { ...link, thumbnailUrl, order: currentLinksCount + index }
      })
    )
    await onImport(linksWithThumbnails, workspaceId)
    setIsImporting(false)
    setContent('')
  }

  return (
    <div className='p-4'>
      <h2 className='text-lg font-semibold mb-4'>Import Links from TXT</h2>
      <div {...getRootProps()} className={`border-2 border-dashed p-4 mb-4 ${isDragActive ? 'border-blue-500' : 'border-gray-300'}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the TXT file here ...</p>
        ) : (
          <p>Drag 'n' drop a TXT file here, or click to select a file</p>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
`# To add a link, write:
https://google.com/ Google

# Add the + symbol to add it directly to your favorites.
https://youtube.com/ Youtube +

# It's okay if you don't write the double slashes (//).
https:example.com Example

# To add multiple links at once, write:
https:youtube.com/watch?v=
  lg5WKsVnEA4 'Michael Rosen - Nice'
  # The tabs must be of equal length.
  a1KBb9mTgck Anpanman's March +`}
        className='w-full h-64 p-2 border rounded mb-4'
      />
      <button 
        onClick={handleImport} 
        className='btn btn-primary'
        disabled={isImporting}
      >
        {isImporting ? 'Importing...' : 'Import Links'}
      </button>
    </div>
  )
}

export default TxtFileImport


// ..\components\WorkspaceManager.tsx
import React, { useEffect, useState } from 'react'
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

  const handleAddWorkspace = async () => {
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
  }

  const handleDeleteWorkspace = async (id: string) => {
    await deleteWorkspace(id)
    const updatedWorkspaces = workspaces.filter(ws => ws.id !== id)
    onWorkspacesChange(updatedWorkspaces)
    if (currentWorkspace.id === id && updatedWorkspaces.length > 0) {
      onWorkspaceChange(updatedWorkspaces[0])
    }
  }

  const handleNewProperty = () => {
    setNewPropertyState(true)
  }

  const handleCancelProperty = () => {
    setNewPropertyState(false)
  }

  const handleExport = () => {
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
  }

  const handleImport = (importString: string) => {
    try {
      const importData = JSON.parse(atob(importString))
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
  }

  return (
    <>
      <h3 className='text-lg font-semibold mb-4'>Workspaces</h3>
      <ul className='mb-4'>
        {workspaces.map(workspace => (
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


// ..\components\loading.tsx
export default function Loading() {
  return (
    <div className='flex items-center justify-center w-full min-h-screen'>
      <div className='grid grid-cols-3 gap-4 auto-rows-auto'>
        {[...Array(9)].map((_, index) => (
          <div 
            key={index}
            className={`skeleton h-32 w-32 ${index === 8 ? 'opacity-30' : 'opacity-65'}`  }
            style={{animationDelay: `${(index + 1) * 85}ms`}}
          ></div>
        ))}
      </div>
    </div>
  )
}


// ..\hooks\useKeyboardDetection.ts
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


// ..\lib\indexeddb.ts
import { LinkItem, Attribute, Workspace } from '@/types'

const DB_NAME = 'CaleannaDB'
const DB_VERSION = 1
const LINKS_STORE = 'links'
const ATTRIBUTES_STORE = 'attributes'
const WORKSPACES_STORE = 'workspaces'

let db: IDBDatabase | null = null

export const initDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Error opening database'))

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      resolve()
    }

    request.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains(LINKS_STORE)) {
        const linkStore = db.createObjectStore(LINKS_STORE, { keyPath: 'id' })
        linkStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(ATTRIBUTES_STORE)) {
        const attrStore = db.createObjectStore(ATTRIBUTES_STORE, { keyPath: 'id' })
        attrStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }

      if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
        db.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' })
      }
    }
  })
}

export const createDefaultWorkspace = async (): Promise<Workspace> => {
  const defaultWorkspace: Workspace = {
    id: 'default',
    name: 'Default',
  }

  await saveWorkspace(defaultWorkspace)
  return defaultWorkspace
}

export const getOrCreateDefaultWorkspace = async (): Promise<Workspace> => {
  const workspaces = await getWorkspaces()
  if (workspaces.length === 0) {
    return await createDefaultWorkspace()
  }
  return workspaces[0]
}

const ensureDBInitialized = async (): Promise<IDBDatabase> => {
  if (!db) {
    await initDB()
  }
  if (!db) {
    throw new Error('Database initialization failed')
  }
  return db
}

export const saveLinks = async (links: LinkItem[], workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readwrite')
    const store = transaction.objectStore(LINKS_STORE)

    links.forEach(link => {
      store.put({ ...link, workspaceId })
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error saving links'))
  })
}

export const getLinks = async (workspaceId: string): Promise<LinkItem[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readonly')
    const store = transaction.objectStore(LINKS_STORE)
    const index = store.index('workspaceId')
    const request = index.getAll(workspaceId)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting links'))
  })
}

export const saveAttributes = async (attributes: Attribute[], workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ATTRIBUTES_STORE], 'readwrite')
    const store = transaction.objectStore(ATTRIBUTES_STORE)

    attributes.forEach(attribute => {
      store.put({ ...attribute, workspaceId })
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error saving attributes'))
  })
}

export const getAttributes = async (workspaceId: string): Promise<Attribute[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ATTRIBUTES_STORE], 'readonly')
    const store = transaction.objectStore(ATTRIBUTES_STORE)
    const index = store.index('workspaceId')
    const request = index.getAll(workspaceId)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting attributes'))
  })
}

export const saveWorkspace = async (workspace: Workspace): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE], 'readwrite')
    const store = transaction.objectStore(WORKSPACES_STORE)
    
    const request = store.put(workspace)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Error saving workspace'))
  })
}

export const getWorkspaces = async (): Promise<Workspace[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE], 'readonly')
    const store = transaction.objectStore(WORKSPACES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting workspaces'))
  })
}

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE, LINKS_STORE, ATTRIBUTES_STORE], 'readwrite')
    const workspaceStore = transaction.objectStore(WORKSPACES_STORE)
    const linksStore = transaction.objectStore(LINKS_STORE)
    const attributesStore = transaction.objectStore(ATTRIBUTES_STORE)

    workspaceStore.delete(workspaceId)
    
    const linksIndex = linksStore.index('workspaceId')
    const linksRequest = linksIndex.openCursor(IDBKeyRange.only(workspaceId))
    linksRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    const attributesIndex = attributesStore.index('workspaceId')
    const attributesRequest = attributesIndex.openCursor(IDBKeyRange.only(workspaceId))
    attributesRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error deleting workspace'))
  })
}

export const deleteLink = async (id: string, workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readwrite')
    const store = transaction.objectStore(LINKS_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Error deleting link with id ${id} in workspace ${workspaceId}`))
  })
}


// ..\types\constants.ts
export const Items = {
  ADD: 'Add' as const,
  ADD_LINK: 'Add link' as const,
  ADD_TXT_FILE: 'Add as txt file' as const,
  SORT: 'Sort' as const,
  FILTER: 'Filter' as const,
  SETTINGS: 'Settings' as const,
}

export const SortAttributeTypes = {
  NEWEST: 'Newest' as const,
  OLDEST: 'Oldest' as const,
  DOMAIN: 'Domain' as const,
  NAME: 'Name' as const,
  CUSTOM: 'Custom' as const,
}

export const filterAttributeTypes = {
  FAVORITES: 'Favorites' as const,
}


// ..\types\index.ts
import { SortAttributeTypes } from './constants'

export interface LinkItem {
  id: string
  url: string
  title: string
  domain: string
  isFavorite: boolean
  thumbnailUrl: string | null
  order: number
}

export interface Attribute {
  id: string
  name: string
  type: 'sort' | 'filter'
  isDefault?: boolean
  condition?: string
}

export interface Workspace {
  id: string
  name: string
}

export type SortType = typeof SortAttributeTypes[keyof typeof SortAttributeTypes]

export type SortFunction = (a: LinkItem, b: LinkItem) => number
export type FilterFunction = (item: LinkItem) => boolean


// ..\utils\image-extraction-utils.ts
export const extractVideoThumbnail = async (videoUrl: string): Promise<string> => {
  // Remove search parameters from the URL
  const urlWithoutSearch = new URL(videoUrl)
  urlWithoutSearch.search = ''
  const cleanVideoUrl = urlWithoutSearch.toString()

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = cleanVideoUrl
    video.load()
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0
    })
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnailBase64 = canvas.toDataURL('image/jpeg')
      resolve(thumbnailBase64)
    })
    video.addEventListener('error', (e) => {
      reject(e)
    })
  })
}

export const getThumbnailFromUrl = async (url: string): Promise<string | null> => {
  const urlWithoutSearch = new URL(url)
  urlWithoutSearch.search = ''
  const cleanUrl = urlWithoutSearch.toString()

  if (cleanUrl.toLowerCase().endsWith('.mp4')) {
    try {
      return await extractVideoThumbnail(cleanUrl)
    } catch (error) {
      console.error('Error extracting video thumbnail:', error)
      return null
    }
  } else if (cleanUrl.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
    return cleanUrl
  } else {
    return null
  }
}

export const saveThumbnailToStorage = (url: string, thumbnailBase64: string) => {
  const thumbnails = JSON.parse(localStorage.getItem('videoThumbnails') || '{}')
  thumbnails[url] = thumbnailBase64
  localStorage.setItem('videoThumbnails', JSON.stringify(thumbnails))
}

export const getThumbnailFromStorage = (url: string): string | null => {
  const thumbnails = JSON.parse(localStorage.getItem('videoThumbnails') || '{}')
  return thumbnails[url] || null
}


// ..\utils\sort-filter-utils.ts
import { LinkItem, Attribute } from '@/types'
import { SortAttributeTypes, filterAttributeTypes } from '@/types/constants'

export const createSortFunction = (attribute: Attribute): ((a: LinkItem, b: LinkItem) => number) => {
  switch (attribute.name) {
    case SortAttributeTypes.NEWEST:
      return (a, b) => Number(b.id) - Number(a.id)
    case SortAttributeTypes.OLDEST:
      return (a, b) => Number(a.id) - Number(b.id)
    case SortAttributeTypes.DOMAIN:
      return (a, b) => a.domain.localeCompare(b.domain)
    case SortAttributeTypes.NAME:
      return (a, b) => a.title.localeCompare(b.title)
    case SortAttributeTypes.CUSTOM:
      return (a, b) => a.order - b.order
    default:
      if (attribute.condition) {
        try {
          return new Function('a', 'b', `return ${attribute.condition}`) as (a: LinkItem, b: LinkItem) => number
        } catch (error) {
          console.error('Invalid sort condition:', error)
          return () => 0
        }
      }
      return () => 0
  }
}

export const createFilterFunction = (attribute: Attribute): ((item: LinkItem) => boolean) => {
  switch (attribute.name) {
    case filterAttributeTypes.FAVORITES:
      return (item) => item.isFavorite
    default:
      if (attribute.condition) {
        try {
          return new Function('item', `return ${attribute.condition}`) as (item: LinkItem) => boolean
        } catch (error) {
          console.error('Invalid filter condition:', error)
          return () => true
        }
      }
      return () => true
  }
}

export const sortLinks = (links: LinkItem[], sortBy: string, attributes: Attribute[]): LinkItem[] => {
  const sortAttribute = attributes.find(attr => attr.name === sortBy && attr.type === 'sort')
  if (!sortAttribute) return links
  
  const sortFunction = createSortFunction(sortAttribute)
  return [...links].sort(sortFunction)
}

export const filterLinks = (links: LinkItem[], filterBy: string, attributes: Attribute[]): LinkItem[] => {
  const filterAttribute = attributes.find(attr => attr.name === filterBy && attr.type === 'filter')
  if (!filterAttribute) return links

  const filterFunction = createFilterFunction(filterAttribute)
  return links.filter(filterFunction)
}



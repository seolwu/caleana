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
  const [sortBy, setSortBy] = useState(SortAttributeTypes.CUSTOM)
  const [filterBy, setFilterBy] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isKeyboardAvailable = false && useKeyboardDetection()

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
      // case Items.SORT:
      //   setSortBy(item)
      //   break
      // case Items.FILTER:
      //   setFilterBy(prevFilterBy => prevFilterBy === item ? '' : item)
      //   break
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
      {/* <Drawer isOpen={isTxtImportDrawerOpen} onClose={() => setIsTxtImportDrawerOpen(false)}>
        <TxtFileImport onImport={handleImportLinks} workspaceId={currentWorkspace.id} currentLinksCount={links.length} />
      </Drawer> */}
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  )
}
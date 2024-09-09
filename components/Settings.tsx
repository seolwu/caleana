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
    // { id: 'filter', label: 'Filter' },
    // { id: 'sort', label: 'Sort' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
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
          <div className='flex gap-4'>
            <div className='w-1/4'>
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
                  {activeTab === 'sort' && (
                    <AttributeManager
                      attributes={localAttributes}
                      type={activeTab}
                      onSaveAttributes={onSaveAttributes}
                      activeTab={activeTab}
                    />
                  )}
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
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
  // const sortAttributes = attributes.filter(attr => attr.type === 'sort').map(attr => attr.name)
  // const filterAttributes = attributes.filter(attr => attr.type === 'filter').map(attr => attr.name)

  return (
    <header className='bg-base-100 shadow-lg p-4 select-none'>
      <div className='flex justify-between items-center gap-2'>
        <div className='flex space-x-4 items-center'>
          <button className='btn btn-base-200' onClick={() => onDropdownSelect(Items.ADD_LINK, Items.ADD)}>
            {Items.ADD} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>A</kbd>}
          </button>
          {/* <Dropdown label={<>{Items.ADD} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>n</kbd>}</>}
            items={[Items.ADD_LINK, Items.ADD_TXT_FILE]} 
            onSelect={(item) => onDropdownSelect(item, Items.ADD)} 
          />
          <Dropdown 
            label={<>{Items.SORT} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>s</kbd>}</>}
            items={sortAttributes} 
            onSelect={(item) => onDropdownSelect(item, Items.SORT)} 
          />
          <Dropdown 
            label={<>{Items.FILTER} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>f</kbd>}</>}
            items={filterAttributes} 
            onSelect={(item) => onDropdownSelect(item, Items.FILTER)} 
          /> */}
          <button className='btn btn-base-200' onClick={onOpenSettings}>
            {Items.SETTINGS} {isKeyboardAvailable && <kbd className='kbd kbd-sm ml-1'>S</kbd>}
          </button>
        </div>
        <h1 className='text-lg font-bold truncate'>{currentWorkspace.name}</h1>
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
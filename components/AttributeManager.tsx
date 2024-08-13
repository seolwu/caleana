import React, { useEffect, useState } from 'react'
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
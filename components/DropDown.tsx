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
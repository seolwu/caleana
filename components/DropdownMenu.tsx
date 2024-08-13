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
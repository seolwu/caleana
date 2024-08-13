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
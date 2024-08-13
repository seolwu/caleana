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
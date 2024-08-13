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
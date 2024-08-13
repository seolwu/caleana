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
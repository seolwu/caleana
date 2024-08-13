import React, { useState, useEffect } from 'react'
import Dialog from './Dialog'
import { getThumbnailFromUrl } from '@/utils/image-extraction-utils'
import { LinkItem } from '@/types'

interface EditLinkDialogProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (id: string, url: string, title: string, thumbnailUrl: string | null, workspaceId: string) => void
  link: LinkItem | null
  workspaceId: string
}

const EditLinkDialog: React.FC<EditLinkDialogProps> = ({ isOpen, onClose, onEdit, link, workspaceId }) => {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)

  useEffect(() => {
    if (link) {
      setUrl(link.url)
      setTitle(link.title)
      setThumbnailUrl(link.thumbnailUrl)
    }
  }, [link])

  useEffect(() => {
    const generateThumbnail = async () => {
      if (url && url !== link?.url) {
        setIsGeneratingThumbnail(true)
        try {
          const thumbnail = await getThumbnailFromUrl(url)
          setThumbnailUrl(thumbnail)
        } catch (error) {
          console.error('Error generating thumbnail:', error)
        } finally {
          setIsGeneratingThumbnail(false)
        }
      }
    }

    generateThumbnail()
  }, [url, link])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (link) {
      onEdit(link.id, url, title, thumbnailUrl, workspaceId)
      onClose()
    }
  }

  if (!link) return null

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title='Edit Link'>
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label htmlFor='edit-url' className='block text-sm font-medium mb-1'>URL</label>
          <input
            type='url'
            id='edit-url'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className='input input-bordered w-full'
            required
          />
        </div>
        <div className='mb-4'>
          <label htmlFor='edit-title' className='block text-sm font-medium mb-1'>Title</label>
          <input
            type='text'
            id='edit-title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='input input-bordered w-full'
            required
          />
        </div>
        {isGeneratingThumbnail && <p className='text-sm text-gray-500 mb-4'>Generating thumbnail...</p>}
        {thumbnailUrl && (
          <div className='mb-4'>
            <img src={thumbnailUrl} alt='Thumbnail' className='w-full max-h-48 object-cover rounded' />
          </div>
        )}
        <div className='flex justify-end space-x-2'>
          <button type='button' onClick={onClose} className='btn btn-ghost'>Cancel</button>
          <button type='submit' className='btn btn-primary'>Save</button>
        </div>
      </form>
    </Dialog>
  )
}

export default EditLinkDialog
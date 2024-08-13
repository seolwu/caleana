import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { getThumbnailFromUrl } from '@/utils/image-extraction-utils'

interface TxtFileImportProps {
  onImport: (links: {
    url: string
    title: string
    thumbnailUrl: string | null
    isFavorite: boolean
    order: number
  }[], workspaceId: string) => Promise<void>
  workspaceId: string
  currentLinksCount: number
}

const TxtFileImport: React.FC<TxtFileImportProps> = ({ onImport, workspaceId, currentLinksCount }) => {
  const [content, setContent] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setContent(reader.result as string)
      }
      reader.readAsText(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/plain': ['.txt'] } })

  const parseLinks = (text: string) => {
    const lines = text.split('\n')
    const links: {
      url: string
      title: string
      isFavorite: boolean
    }[] = []
    let currentUrl = ''

    lines.forEach((line) => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        if (line.startsWith('http') || line.startsWith('https:')) {
          const parts = line.split(' ')
          currentUrl = parts[0]
          if (parts.length > 1) {
            const title = parts.slice(1, -1).join(' ') || parts[0]
            const isFavorite = parts[parts.length - 1] === '+'
            links.push({ url: currentUrl, title, isFavorite })
            currentUrl = ''
          }
        } else if (currentUrl) {
          const parts = line.split(' ')
          const title = parts.slice(0, -1).join(' ') || parts[0]
          const isFavorite = parts[parts.length - 1] === '+'
          links.push({ url: currentUrl + parts[0], title, isFavorite })
        }
      }
    })

    return links
  }

  const handleImport = async () => {
    setIsImporting(true)
    const parsedLinks = parseLinks(content)
    const linksWithThumbnails = await Promise.all(
      parsedLinks.map(async (link, index) => {
        const thumbnailUrl = await getThumbnailFromUrl(link.url)
        return { ...link, thumbnailUrl, order: currentLinksCount + index }
      })
    )
    await onImport(linksWithThumbnails, workspaceId)
    setIsImporting(false)
    setContent('')
  }

  return (
    <div className='p-4'>
      <h2 className='text-lg font-semibold mb-4'>Import Links from TXT</h2>
      <div {...getRootProps()} className={`border-2 border-dashed p-4 mb-4 ${isDragActive ? 'border-blue-500' : 'border-gray-300'}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the TXT file here ...</p>
        ) : (
          <p>Drag & drop a TXT file here, or click to select a file</p>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
`# To add a link, write:
https://google.com/ Google

# Add the + symbol to add it directly to your favorites.
https://youtube.com/ Youtube +

# It's okay if you don't write the double slashes (//).
https:example.com Example

# To add multiple links at once, write:
https:youtube.com/watch?v=
  lg5WKsVnEA4 'Michael Rosen - Nice'
  # The tabs must be of equal length.
  a1KBb9mTgck Anpanman's March +`}
        className='w-full h-64 p-2 border rounded mb-4'
      />
      <button 
        onClick={handleImport} 
        className='btn btn-primary'
        disabled={isImporting}
      >
        {isImporting ? 'Importing...' : 'Import Links'}
      </button>
    </div>
  )
}

export default TxtFileImport
export const extractVideoThumbnail = async (videoUrl: string): Promise<string> => {
  // Remove search parameters from the URL
  const urlWithoutSearch = new URL(videoUrl)
  urlWithoutSearch.search = ''
  const cleanVideoUrl = urlWithoutSearch.toString()

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = cleanVideoUrl
    video.load()
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0
    })
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnailBase64 = canvas.toDataURL('image/jpeg')
      resolve(thumbnailBase64)
    })
    video.addEventListener('error', (e) => {
      reject(e)
    })
  })
}

export const getThumbnailFromUrl = async (url: string): Promise<string | null> => {
  const urlWithoutSearch = new URL(url)
  urlWithoutSearch.search = ''
  const cleanUrl = urlWithoutSearch.toString()

  if (cleanUrl.toLowerCase().endsWith('.mp4')) {
    try {
      return await extractVideoThumbnail(cleanUrl)
    } catch (error) {
      console.error('Error extracting video thumbnail:', error)
      return null
    }
  } else if (cleanUrl.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
    return cleanUrl
  } else {
    return null
  }
}

export const saveThumbnailToStorage = (url: string, thumbnailBase64: string) => {
  const thumbnails = JSON.parse(localStorage.getItem('videoThumbnails') || '{}')
  thumbnails[url] = thumbnailBase64
  localStorage.setItem('videoThumbnails', JSON.stringify(thumbnails))
}

export const getThumbnailFromStorage = (url: string): string | null => {
  const thumbnails = JSON.parse(localStorage.getItem('videoThumbnails') || '{}')
  return thumbnails[url] || null
}
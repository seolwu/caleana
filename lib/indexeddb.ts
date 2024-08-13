import { LinkItem, Attribute, Workspace } from '@/types'

const DB_NAME = 'CaleannaDB'
const DB_VERSION = 1
const LINKS_STORE = 'links'
const ATTRIBUTES_STORE = 'attributes'
const WORKSPACES_STORE = 'workspaces'

let db: IDBDatabase | null = null

export const initDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error('Error opening database'))

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      resolve()
    }

    request.onupgradeneeded = (event) => {
      db = (event.target as IDBOpenDBRequest).result
      
      if (!db.objectStoreNames.contains(LINKS_STORE)) {
        const linkStore = db.createObjectStore(LINKS_STORE, { keyPath: 'id' })
        linkStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(ATTRIBUTES_STORE)) {
        const attrStore = db.createObjectStore(ATTRIBUTES_STORE, { keyPath: 'id' })
        attrStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }

      if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
        db.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' })
      }
    }
  })
}

export const createDefaultWorkspace = async (): Promise<Workspace> => {
  const defaultWorkspace: Workspace = {
    id: 'default',
    name: 'Default',
  }

  await saveWorkspace(defaultWorkspace)
  return defaultWorkspace
}

export const getOrCreateDefaultWorkspace = async (): Promise<Workspace> => {
  const workspaces = await getWorkspaces()
  if (workspaces.length === 0) {
    return await createDefaultWorkspace()
  }
  return workspaces[0]
}

const ensureDBInitialized = async (): Promise<IDBDatabase> => {
  if (!db) {
    await initDB()
  }
  if (!db) {
    throw new Error('Database initialization failed')
  }
  return db
}

export const saveLinks = async (links: LinkItem[], workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readwrite')
    const store = transaction.objectStore(LINKS_STORE)

    links.forEach(link => {
      store.put({ ...link, workspaceId })
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error saving links'))
  })
}

export const getLinks = async (workspaceId: string): Promise<LinkItem[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readonly')
    const store = transaction.objectStore(LINKS_STORE)
    const index = store.index('workspaceId')
    const request = index.getAll(workspaceId)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting links'))
  })
}

export const saveAttributes = async (attributes: Attribute[], workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ATTRIBUTES_STORE], 'readwrite')
    const store = transaction.objectStore(ATTRIBUTES_STORE)

    attributes.forEach(attribute => {
      store.put({ ...attribute, workspaceId })
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error saving attributes'))
  })
}

export const getAttributes = async (workspaceId: string): Promise<Attribute[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ATTRIBUTES_STORE], 'readonly')
    const store = transaction.objectStore(ATTRIBUTES_STORE)
    const index = store.index('workspaceId')
    const request = index.getAll(workspaceId)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting attributes'))
  })
}

export const saveWorkspace = async (workspace: Workspace): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE], 'readwrite')
    const store = transaction.objectStore(WORKSPACES_STORE)
    
    const request = store.put(workspace)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error('Error saving workspace'))
  })
}

export const getWorkspaces = async (): Promise<Workspace[]> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE], 'readonly')
    const store = transaction.objectStore(WORKSPACES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Error getting workspaces'))
  })
}

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([WORKSPACES_STORE, LINKS_STORE, ATTRIBUTES_STORE], 'readwrite')
    const workspaceStore = transaction.objectStore(WORKSPACES_STORE)
    const linksStore = transaction.objectStore(LINKS_STORE)
    const attributesStore = transaction.objectStore(ATTRIBUTES_STORE)

    workspaceStore.delete(workspaceId)
    
    const linksIndex = linksStore.index('workspaceId')
    const linksRequest = linksIndex.openCursor(IDBKeyRange.only(workspaceId))
    linksRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    const attributesIndex = attributesStore.index('workspaceId')
    const attributesRequest = attributesIndex.openCursor(IDBKeyRange.only(workspaceId))
    attributesRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error('Error deleting workspace'))
  })
}

export const deleteLink = async (id: string, workspaceId: string): Promise<void> => {
  const database = await ensureDBInitialized()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([LINKS_STORE], 'readwrite')
    const store = transaction.objectStore(LINKS_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Error deleting link with id ${id} in workspace ${workspaceId}`))
  })
}
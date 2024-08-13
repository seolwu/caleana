import { SortAttributeTypes } from './constants'

export interface LinkItem {
  id: string
  url: string
  title: string
  domain: string
  isFavorite: boolean
  thumbnailUrl: string | null
  order: number
}

export interface Attribute {
  id: string
  name: string
  type: 'sort' | 'filter'
  isDefault?: boolean
  condition?: string
}

export interface Workspace {
  id: string
  name: string
}

export type SortType = typeof SortAttributeTypes[keyof typeof SortAttributeTypes]

export type SortFunction = (a: LinkItem, b: LinkItem) => number
export type FilterFunction = (item: LinkItem) => boolean
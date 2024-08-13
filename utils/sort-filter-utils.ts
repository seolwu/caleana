import { LinkItem, Attribute } from '@/types'
import { SortAttributeTypes, filterAttributeTypes } from '@/types/constants'

export const createSortFunction = (attribute: Attribute): ((a: LinkItem, b: LinkItem) => number) => {
  switch (attribute.name) {
    case SortAttributeTypes.NEWEST:
      return (a, b) => Number(b.id) - Number(a.id)
    case SortAttributeTypes.OLDEST:
      return (a, b) => Number(a.id) - Number(b.id)
    case SortAttributeTypes.DOMAIN:
      return (a, b) => a.domain.localeCompare(b.domain)
    case SortAttributeTypes.NAME:
      return (a, b) => a.title.localeCompare(b.title)
    case SortAttributeTypes.CUSTOM:
      return (a, b) => a.order - b.order
    default:
      if (attribute.condition) {
        try {
          return new Function('a', 'b', `return ${attribute.condition}`) as (a: LinkItem, b: LinkItem) => number
        } catch (error) {
          console.error('Invalid sort condition:', error)
          return () => 0
        }
      }
      return () => 0
  }
}

export const createFilterFunction = (attribute: Attribute): ((item: LinkItem) => boolean) => {
  switch (attribute.name) {
    case filterAttributeTypes.FAVORITES:
      return (item) => item.isFavorite
    default:
      if (attribute.condition) {
        try {
          return new Function('item', `return ${attribute.condition}`) as (item: LinkItem) => boolean
        } catch (error) {
          console.error('Invalid filter condition:', error)
          return () => true
        }
      }
      return () => true
  }
}

export const sortLinks = (links: LinkItem[], sortBy: string, attributes: Attribute[]): LinkItem[] => {
  const sortAttribute = attributes.find(attr => attr.name === sortBy && attr.type === 'sort')
  if (!sortAttribute) return links
  
  const sortFunction = createSortFunction(sortAttribute)
  return [...links].sort(sortFunction)
}

export const filterLinks = (links: LinkItem[], filterBy: string, attributes: Attribute[]): LinkItem[] => {
  const filterAttribute = attributes.find(attr => attr.name === filterBy && attr.type === 'filter')
  if (!filterAttribute) return links

  const filterFunction = createFilterFunction(filterAttribute)
  return links.filter(filterFunction)
}
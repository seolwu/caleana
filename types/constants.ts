export const Items = {
  ADD: 'Add' as const,
  ADD_LINK: 'Add link' as const,
  ADD_TXT_FILE: 'Add as txt file' as const,
  SORT: 'Sort' as const,
  FILTER: 'Filter' as const,
  SETTINGS: 'Settings' as const,
}

export const SortAttributeTypes = {
  NEWEST: 'Newest' as const,
  OLDEST: 'Oldest' as const,
  DOMAIN: 'Domain' as const,
  NAME: 'Name' as const,
  CUSTOM: 'Custom' as const,
}

export const filterAttributeTypes = {
  FAVORITES: 'Favorites' as const,
}
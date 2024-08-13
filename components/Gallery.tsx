import React, { useRef } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Image from 'next/image'
import { LinkItem } from '@/types'

const DraggableWrapper = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode,
    className: string
  }
>(({ children, className }, ref) => <div ref={ref} className={className}>{children}</div>)

DraggableWrapper.displayName = 'DraggableWrapper'

const GalleryItem: React.FC<{ 
  item: LinkItem 
  index: number 
  moveItem: (dragIndex: number, hoverIndex: number) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onEdit: (id: string) => void
}> = ({ item, index, moveItem, onDelete, onEdit }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag({
    type: 'GALLERY_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'GALLERY_ITEM',
    hover(draggedItem: { index: number }) {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index)
        draggedItem.index = index
      }
    },
  })

  drag(drop(ref))

  const itemSize = item.thumbnailUrl ? 'col-span-1 row-span-2' : 'col-span-1 row-span-1'
  
  return (
    <DraggableWrapper ref={ref} className={`${itemSize} p-2`}>
      <div className={`card bg-base-100 shadow-xl h-full transition-all duration-200 ease-in-out ${isDragging ? 'opacity-50' : 'hover:scale-105'} animate-scale-in`}>
        {item.thumbnailUrl && ( 
          <figure className='px-4 pt-4'>
            <Image src={item.thumbnailUrl} alt={item.title} className='rounded-xl object-cover w-full h-36' />
          </figure>
        )}
        <div className='card-body p-3'>
          <div className='grid p-2 gap-2'>
            <h2 className='card-title text-base line-clamp-2'>{item.title}</h2>
            <p className='text-sm text-gray-500 truncate'>{item.domain}</p>
          </div>
          <div className='card-actions justify-end mt-2'>
            <a 
              href={item.url} 
              target='_blank' 
              rel='noopener noreferrer' 
              className='btn btn-primary btn-xs'
            >
              Open
            </a>
            {/* <button 
              className={`btn btn-xs ${item.isFavorite ? 'btn-warning' : 'btn-outline'}`} 
              onClick={() => onToggleFavorite(item.id)}
            >
              {item.isFavorite ? '★' : '☆'}
            </button> */}
            <button className='btn btn-info btn-xs' onClick={() => onEdit(item.id)}>Edit</button>
            <button className='btn btn-error btn-xs' onClick={() => onDelete(item.id)}>Delete</button>
          </div>
        </div>
      </div>
    </DraggableWrapper>
  )
}

const Gallery: React.FC<{ 
  items: LinkItem[] 
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onEdit: (id: string) => void
  onMoveItem: (dragIndex: number, hoverIndex: number) => void
}> = ({ items, onDelete, onToggleFavorite, onEdit, onMoveItem }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-auto grid-auto-flow-dense'>
        {items.map((item, index) => (
          <GalleryItem 
            key={item.id} 
            item={item} 
            index={index} 
            moveItem={onMoveItem} 
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onEdit={onEdit}
          />
        ))}
      </div>
    </DndProvider>
  )
}

export default Gallery
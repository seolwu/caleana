export default function Loading() {
  return (
    <div className='flex items-center justify-center w-full min-h-screen'>
      <div className='grid grid-cols-3 gap-4 auto-rows-auto'>
        {[...Array(9)].map((_, index) => (
          <div 
            key={index}
            className={`skeleton h-32 w-32 ${index === 8 ? 'opacity-30' : 'opacity-65'}`  }
            style={{animationDelay: `${(index + 1) * 85}ms`}}
          ></div>
        ))}
      </div>
    </div>
  )
}
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function PostView() {
  const [post, setPost] = useState(null)
  const [validGuest, setValidGuest] = useState(false)
  const { id } = useParams()

  useEffect(() => {
    checkGuestAccess()
  }, [id])

  async function checkGuestAccess() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) {
      setPost(data)
      setValidGuest(true)
      
    }
  }

  if (!validGuest) return <div>Acceso no autorizado</div>
  if (!post) return <div>Cargando...</div>

  return (
    <div className="min-h-screen py-8 px-4 bg-white dark:bg-gray-900 ">
      <div className="bg-white dark:bg-gray-800 mx-auto max-w-screen-xl lg:grid lg:grid-cols-2 rounded-lg border border-white dark:border-gray-600 shadow-lg overflow-hidden">
        {/* Contenido del post */}
        <div className="p-6 font-light text-gray-500 sm:text-lg dark:text-gray-400">
          <h1 className="mb-4 text-3xl md:text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white">
            {post.title}
          </h1>
          <p className="mb-4">{post.content}</p>
        </div>
        
        {/* Contenedor de la imagen */}
        <div className="relative lg:flex lg:justify-end">
          <img 
            src={post.image_url} 
            alt={post.title} 
            className="w-full h-auto lg:w-auto lg:h-full max-h-96 object-cover lg:object-contain lg:max-w-full m-3"
            style={{ marginLeft: 'auto' }}
          />
        </div>
      </div>
    </div>
  )
}
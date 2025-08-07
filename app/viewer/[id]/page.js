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
    // Verifica si el post es público o si el usuario tiene acceso
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) {
      // Opción 1: Posts completamente públicos
      setPost(data)
      setValidGuest(true)
      
      // Opción 2: Validar email del invitado (requiere implementación adicional)
      // const guestEmail = localStorage.getItem('guestEmail')
      // const { data: access } = await supabase
      //   .from('guest_access')
      //   .select('*')
      //   .eq('post_id', id)
      //   .eq('guest_email', guestEmail)
      
      // if (access) {
      //   setPost(data)
      //   setValidGuest(true)
      // }
    }
  }

  if (!validGuest) return <div>Acceso no autorizado</div>
  if (!post) return <div>Cargando...</div>

  return (
    <div className="post-view">
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {post.image_url && (
        <img 
          src={post.image_url} 
          alt={post.title} 
          style={{ maxWidth: '100%' }}
        />
      )}
    </div>
  )
}
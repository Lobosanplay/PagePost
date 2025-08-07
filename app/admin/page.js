'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [guestEmail, setGuestEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkUser()
    fetchPosts()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
  }

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('created_by', (await supabase.auth.getUser()).data.user.id)
    
    if (!error) setPosts(data)
  }

  async function createPost() {
    let imageUrl = null
    
    if (image) {
      const fileName = `posts/${Date.now()}-${image.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, image)
      
      if (!uploadError) {
        imageUrl = supabase.storage.from('post-images').getPublicUrl(uploadData.path).data.publicUrl
      }
    }

    const { error } = await supabase
      .from('posts')
      .insert([{ 
        title, 
        content, 
        image_url: imageUrl,
        created_by: (await supabase.auth.getUser()).data.user.id
      }])
    
    if (!error) {
      setTitle('')
      setContent('')
      setImage(null)
      fetchPosts()
    }
  }

  async function shareWithGuest(postId) {
    const { error } = await supabase
      .from('guest_access')
      .insert([{ post_id: postId, guest_email: guestEmail }])
    
    if (!error) {
      // Envía el enlace por email (implementación opcional)
      const postLink = `${window.location.origin}/view/${postId}`
      alert(`Comparte este enlace con tu invitado: ${postLink}`)
      setGuestEmail('')
    }
  }

  return (
    <div className="admin-container">
      <h1>Panel de Administración</h1>
      
      <div className="post-form">
        <h2>Crear Nuevo Post</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenido"
        />
        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
        />
        <button onClick={createPost}>Publicar</button>
      </div>

      <div className="posts-list">
        <h2>Tus Posts</h2>
        {posts.map(post => (
          <div key={post.id} className="post-item">
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            {post.image_url && <img src={post.image_url} alt={post.title} />}
            
            <div className="share-section">
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email del invitado"
              />
              <button onClick={() => shareWithGuest(post.id)}>Compartir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [loading, setLoading] = useState(false);
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
  try {
    setLoading(true);
    
    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication required');

    // 2. Subir imagen si existe
    let imageUrl = null;
    if (image) {
      const fileName = `posts/${user.id}/${Date.now()}-${image.name.replace(/\s+/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, image, {
          cacheControl: '3600',
          upsert: false,
          contentType: image.type
        });
      
      if (uploadError) throw uploadError;
      imageUrl = supabase.storage.from('post-images').getPublicUrl(uploadData.path).data.publicUrl;
    }

    // 3. Crear post
    const { error } = await supabase
      .from('posts')
      .insert([{ 
        title, 
        content, 
        image_url: imageUrl,
        created_by: user.id
      }]);
    
    if (error) throw error;

    // 4. Limpiar formulario y refrescar
    setTitle('');
    setContent('');
    setImage(null);
    await fetchPosts();
    
  } catch (error) {
    console.error('Error creating post:', error);
    alert(error.message);
  } finally {
    setLoading(false);
  }
}


  async function shareWithGuest(postId) {

    const { data: post, error: postError } = await supabase
    .from('posts')
    .select('created_by')
    .eq('id', postId)
    .single();

    if (postError || post.created_by !== (await supabase.auth.getUser()).data.user.id) {
      throw new Error('No tienes permisos para compartir este post');
    }

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Panel de Administración</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Crea y gestiona tus posts</p>
        </div>

        {/* Formulario de creación */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-white dark:border-gray-600 shadow-lg p-6 mb-12">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Crear Nuevo Post</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe un título atractivo"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Desarrolla tu contenido aquí"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="image" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen</label>
              <input
                id="image"
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                className="block text-sm text-gray-500 dark:text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700"
              />
            </div>
            
            <button
              onClick={createPost}
              className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Publicar Post
            </button>
          </div>
        </div>

        {/* Lista de posts */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Tus Posts</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg border border-white dark:border-gray-600 shadow-lg overflow-hidden">
                {/* Imagen del post */}
                {post.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Contenido del post */}
                <div className="relative p-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{post.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{post.content}</p>
                  
                    <button type="button" className='absolute top-1 right-0 p-2 text-white rounded-md text-red-700 border border-red hover:bg-red-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex intems-center me-2 dark:border-red-500 dark:text-red-500 dark:hover:text-white dark:focus:ring-red-800 dark:hover:bg-red-500'>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="Red" strokeWidth="2"/>
                        <path d="M8 8L16 16" stroke="Red" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 8L8 16" stroke="Red" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="sr-only">Icon description</span>
                  </button>
                  {/* Sección para compartir */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <label htmlFor={`guest-email-${post.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Compartir con invitado</label>
                    <div className="flex space-x-2">
                      <input
                        id={`guest-email-${post.id}`}
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="email@invitado.com"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => shareWithGuest(post.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
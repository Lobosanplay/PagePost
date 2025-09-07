'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entrydate, setEntryDate] = useState('')
  const [departuredate, setDepartureDate] = useState('')
  const [destination, setDestination] = useState('')
  const [image, setImage] = useState(null)
  const [guestEmails, setGuestEmails] = useState({});
  const [isDeleting, setIsDeleting] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'list'
  const router = useRouter()

  const handleGuestEmailChange = (postId, email) => {
    setGuestEmails(prev => ({
      ...prev,
      [postId]: email
    }));
  };

  useEffect(() => {
    checkUser()
    if(checkUser) {
      fetchPosts()
    }
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/login')
    return true
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
          arrival_date: entrydate,
          departure_date: departuredate,
          destination,
          image_url: imageUrl,
          created_by: user.id
        }]);
      
      if (error) throw error;

      // 4. Limpiar formulario y refrescar
      setTitle('');
      setContent('');
      setEntryDate('');
      setDepartureDate('');
      setDestination('');
      setImage(null);
      await fetchPosts();
      
      // Cambiar a la pestaña de listado
      setActiveTab('list');
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function shareWithGuest(postId) {
    const email = guestEmails[postId] || '';

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
      .insert([{ post_id: postId, guest_email: guestEmails }])
    
    if (!error) {
      // Envía el enlace por email (implementación opcional)
      const postLink = `${window.location.origin}/view/${postId}`
      alert(`Comparte este enlace con tu invitado: ${postLink}`)
      setGuestEmails('')
    }
  }

  async function deletePost(id) {
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchPosts();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    } finally {
      setIsDeleting(null);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con navegación y logout */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Panel de Administración</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Crea y gestiona tus posts</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'create' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Crear Post
            </button>
            
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Ver Posts
            </button>
            
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h11m0 0-4-4m4 4-4 4m-5 3H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h3"/>
              </svg>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Formulario de creación */}
        {activeTab === 'create' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-white dark:border-gray-600 shadow-lg p-6 mb-8">
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
              
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <div className="flex-1 min-w-0">
                  <label htmlFor="entry-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de entrada
                  </label>
                  <input
                    id="entry-date"
                    type="datetime-local"
                    value={entrydate}
                    min="2018-06-07T00:00"
                    max="3000-12-31T00:00"  
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <label htmlFor="departure-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de salida
                  </label>
                  <input
                    id="departure-date"
                    type="datetime-local"
                    min="2018-06-07T00:00"
                    max="3000-12-31T00:00"  
                    value={departuredate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="destination" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino</label>
                <textarea
                  id="setDestination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Destino del producto"
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
                disabled={loading}
                className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Publicando...' : 'Publicar Post'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de posts */}
        {activeTab === 'list' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tus Posts</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>
            
            {posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-white dark:border-gray-600 shadow-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay posts aún</h3>
                <p className="text-gray-500 dark:text-gray-400">Crea tu primer post haciendo clic en "Crear Post"</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                >
                  Crear primer post
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
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
                    <div className="relative p-6">
                      <button 
                        type="button" 
                        disabled={isDeleting === post.id} 
                        onClick={() => deletePost(post.id)} 
                        className='absolute top-4 right-4 text-red-600 dark:text-red-500 hover:text-white hover:bg-red-600 rounded-md p-2 transition-colors'
                        title="Eliminar post"
                      >
                        {isDeleting === post.id ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        )}
                      </button>
                      
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{post.title}</h3>
                      
                      {post.destination && (
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          <span className="font-medium">Destino:</span> {post.destination}
                        </p>
                      )}
                      
                      {post.arrival_date && post.departure_date && (
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div>
                            <span className="font-medium">Entrada:</span> {new Date(post.arrival_date).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Salida:</span> {new Date(post.departure_date).toLocaleString()}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-6">{post.content}</p>
                      
                      {/* Sección para compartir */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                        <label htmlFor={`guest-email-${post.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Compartir con invitado
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            id={`guest-email-${post.id}`}
                            type="email"
                            value={guestEmails[post.id] || ''}
                            onChange={(e) => handleGuestEmailChange(post.id, e.target.value)}
                            placeholder="email@invitado.com"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                          />
                          <button
                            onClick={() => shareWithGuest(post.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 whitespace-nowrap"
                          >
                            Compartir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
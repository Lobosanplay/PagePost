'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function PostView() {
  const [post, setPost] = useState(null)
  const [validGuest, setValidGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()

  useEffect(() => {
    checkGuestAccess()
  }, [id])

  async function checkGuestAccess() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setPost(data)
        setValidGuest(true)
      }
    } catch (error) {
      console.error('Error accessing post:', error)
      setValidGuest(false)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!validGuest || !post) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso no autorizado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No tienes permisos para ver este contenido
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Contenedor principal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Sección de imagen */}
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 lg:aspect-h-12">
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="w-full h-full object-cover lg:rounded-l-xl"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/800/600'
                  }}
                />
              </div>
              
              {/* Overlay de información en imagen */}
              {post.arrival_date && post.departure_date && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold">Llegada:</span>
                      <br />
                      <span>{formatDate(post.arrival_date)}</span>
                    </div>
                    <div className="text-center">
                      <div className="w-6 h-0.5 bg-white mx-auto mb-1"></div>
                      <div className="text-xs">→</div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">Salida:</span>
                      <br />
                      <span>{formatDate(post.departure_date)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sección de contenido */}
            <div className="p-8">
              {/* Header del post */}
              <div className="mb-6">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                  {post.title}
                </h1>
                
                {post.destination && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{post.destination}</span>
                  </div>
                )}
              </div>

              {/* Información de fechas (versión desktop) */}
              <div className="hidden lg:block mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Fecha de llegada
                    </h3>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(post.arrival_date)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Fecha de salida
                    </h3>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(post.departure_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenido principal */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {post.content?.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Metadata adicional */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Publicado el {formatDate(post.created_at)}</span>
                  {post.updated_at !== post.created_at && (
                    <span>Actualizado el {formatDate(post.updated_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
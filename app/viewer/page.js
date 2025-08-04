"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }) => {
            if (data?.role === 'admin') {
              router.push('/admin')
            } else {
              router.push('/viewer')
            }
          })
      } else {
        router.push('/login')
      }
    })
  }, [])

  return <div>Loading...</div>
}
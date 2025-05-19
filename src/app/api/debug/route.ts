import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 1. Check environment variables
    const envVars = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      // Don't expose actual values for security
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }

    // 2. Test Supabase client creation
    let supabaseClientStatus = 'not_attempted'
    try {
      const supabase = createRouteHandlerClient({ cookies })
      supabaseClientStatus = 'success'
    } catch (error) {
      supabaseClientStatus = 'failed'
      console.error('Supabase client creation error:', error)
    }

    // 3. Test database connection
    let dbConnectionStatus = 'not_attempted'
    let dbError = null
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data, error } = await supabase.from('users').select('count').limit(1)
      if (error) {
        dbConnectionStatus = 'failed'
        dbError = error.message
      } else {
        dbConnectionStatus = 'success'
      }
    } catch (error) {
      dbConnectionStatus = 'failed'
      dbError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Database connection error:', error)
    }

    // 4. Test auth configuration
    let authStatus = 'not_attempted'
    let authError = null
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        authStatus = 'failed'
        authError = error.message
      } else {
        authStatus = 'success'
      }
    } catch (error) {
      authStatus = 'failed'
      authError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Auth configuration error:', error)
    }

    return NextResponse.json({
      environment: envVars,
      supabaseClient: {
        status: supabaseClientStatus
      },
      database: {
        status: dbConnectionStatus,
        error: dbError
      },
      authentication: {
        status: authStatus,
        error: authError
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
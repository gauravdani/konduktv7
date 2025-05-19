import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          details: 'Email must be a valid email address with a proper domain'
        },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    )

    // Sign in user
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Sign in error:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          details: authError.message,
          code: authError.status
        },
        { status: 401 }
      )
    }

    if (!authData.user) {
      console.error('No user data returned from sign in')
      return NextResponse.json(
        { error: 'Authentication failed - no user data returned' },
        { status: 401 }
      )
    }

    // Get user profile
    let { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      
      // If profile doesn't exist, create it
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: authData.user.email,
              role: 'team_member', // Default role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()

        if (createError) {
          console.error('Profile creation error:', createError)
          return NextResponse.json(
            { 
              error: 'Failed to create user profile',
              details: createError.message,
              code: createError.code
            },
            { status: 500 }
          )
        }

        profileData = newProfile
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to fetch user profile',
            details: profileError.message,
            code: profileError.code
          },
          { status: 500 }
        )
      }
    }

    // Get user's domains - first get domains where user is manager
    const { data: managerDomains, error: managerError } = await supabaseAdmin
      .from('domains')
      .select('*')
      .eq('manager_id', authData.user.id)

    if (managerError) {
      console.error('Manager domains fetch error:', managerError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch manager domains',
          details: managerError.message,
          code: managerError.code
        },
        { status: 500 }
      )
    }

    // Then get domains where user is team member
    const { data: teamDomains, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('domain:domains(*)')
      .eq('user_id', authData.user.id)

    if (teamError) {
      console.error('Team domains fetch error:', teamError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch team domains',
          details: teamError.message,
          code: teamError.code
        },
        { status: 500 }
      )
    }

    // Combine the results, removing duplicates
    const domainsData = [
      ...(managerDomains || []),
      ...(teamDomains?.map(t => t.domain) || [])
    ].filter((domain, index, self) => 
      index === self.findIndex(d => d.id === domain.id)
    )

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.getSession()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { 
          error: 'Failed to create session',
          details: sessionError.message,
          code: sessionError.status
        },
        { status: 500 }
      )
    }

    // Create response with session cookie
    const response = NextResponse.json(
      { 
        message: 'Sign in successful',
        user: profileData,
        domains: domainsData,
        session: sessionData.session
      },
      { status: 200 }
    )

    // Set the session cookie
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.setSession({
      access_token: sessionData.session?.access_token || '',
      refresh_token: sessionData.session?.refresh_token || '',
    })

    return response
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
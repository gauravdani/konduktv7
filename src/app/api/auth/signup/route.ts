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

    // Validate email format - more strict to match Supabase requirements
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { 
          error: 'Password too weak',
          details: 'Password must be at least 8 characters long'
        },
        { status: 400 }
      )
    }

    // Additional password strength checks
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      return NextResponse.json(
        {
          error: 'Password too weak',
          details: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
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
          persistSession: false
        }
      }
    )

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for testing
      user_metadata: {
        email_confirmed: true
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          details: authError.message,
          code: authError.status
        },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error('No user data returned from signup')
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 500 }
      )
    }

    // Create user profile in database with initial role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          role: 'team_member', // Initial role
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Attempt to delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { 
          error: 'Failed to create user profile',
          details: profileError.message,
          code: profileError.code
        },
        { status: 500 }
      )
    }

    // Create initial domain for the user
    const { data: domainData, error: domainError } = await supabaseAdmin
      .from('domains')
      .insert([
        {
          domain_name: email.split('@')[1], // Use email domain as initial domain
          manager_id: authData.user.id,
          subscription_status: 'trial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (domainError) {
      console.error('Domain creation error:', domainError)
      // Clean up user profile if domain creation fails
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { 
          error: 'Failed to create initial domain',
          details: domainError.message,
          code: domainError.code
        },
        { status: 500 }
      )
    }

    // Add user to their domain's team
    const { error: teamError } = await supabaseAdmin
      .from('teams')
      .insert([
        {
          domain_id: domainData.id,
          user_id: authData.user.id,
          role: 'manager', // User is manager of their own domain
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])

    if (teamError) {
      console.error('Team creation error:', teamError)
      // Clean up domain and user if team creation fails
      await supabaseAdmin.from('domains').delete().eq('id', domainData.id)
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { 
          error: 'Failed to create team membership',
          details: teamError.message,
          code: teamError.code
        },
        { status: 500 }
      )
    }

    // Create a session for the new user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

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

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: profileData,
        domain: domainData,
        session: sessionData.session
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 
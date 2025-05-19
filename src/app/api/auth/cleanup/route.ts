import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 5 // 5 requests per minute
const requestCounts = new Map<string, { count: number; timestamp: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const requestData = requestCounts.get(ip)

  if (!requestData) {
    requestCounts.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now })
    return false
  }

  if (requestData.count >= MAX_REQUESTS) {
    return true
  }

  requestData.count++
  return false
}

export async function DELETE(request: Request) {
  try {
    // Get client IP for rate limiting
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown'

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Verify request origin
    const origin = headersList.get('origin')
    if (origin && !origin.match(/^https?:\/\/(localhost:3000|konduktv\.com)/)) {
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      )
    }

    let email;
    try {
      const body = await request.json();
      email = body.email;
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Only allow test user cleanup
    if (!email.endsWith('@konduktv.com')) {
      return NextResponse.json(
        { error: 'Only test users can be cleaned up' },
        { status: 403 }
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
    );

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      filters: {
        email: email
      }
    });

    if (userError) {
      console.error('User lookup error:', userError);
      return NextResponse.json(
        { 
          error: 'Failed to lookup user',
          details: userError.message
        },
        { status: 500 }
      );
    }

    if (!userData?.users?.length) {
      return NextResponse.json(
        { message: 'No user found with this email' },
        { status: 200 }
      );
    }

    const user = userData.users[0];

    // Get user's domains
    const { data: domainsData, error: domainsError } = await supabaseAdmin
      .from('domains')
      .select('id')
      .eq('manager_id', user.id);

    if (domainsError) {
      console.error('Domain lookup error:', domainsError);
      return NextResponse.json(
        { 
          error: 'Failed to lookup user domains',
          details: domainsError.message
        },
        { status: 500 }
      );
    }

    // Delete user's teams first
    if (domainsData?.length) {
      const domainIds = domainsData.map(d => d.id);
      const { error: teamsError } = await supabaseAdmin
        .from('teams')
        .delete()
        .in('domain_id', domainIds);

      if (teamsError) {
        console.error('Team deletion error:', teamsError);
        return NextResponse.json(
          { 
            error: 'Failed to delete user teams',
            details: teamsError.message
          },
          { status: 500 }
        );
      }
    }

    // Delete user's domains
    const { error: domainsDeleteError } = await supabaseAdmin
      .from('domains')
      .delete()
      .eq('manager_id', user.id);

    if (domainsDeleteError) {
      console.error('Domain deletion error:', domainsDeleteError);
      return NextResponse.json(
        { 
          error: 'Failed to delete user domains',
          details: domainsDeleteError.message
        },
        { status: 500 }
      );
    }

    // Delete user's profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      return NextResponse.json(
        { 
          error: 'Failed to delete user profile',
          details: profileError.message
        },
        { status: 500 }
      );
    }

    // Delete user from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error('Auth deletion error:', authError);
      return NextResponse.json(
        { 
          error: 'Failed to delete user from auth',
          details: authError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'User and associated data deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/users - Get current user profile
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user profile
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { email, role = 'team_member' } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      options: {
        data: {
          role,
        },
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 400 });
    }
    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          role,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users - Update user profile
export async function PATCH(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();
    
    // Remove sensitive fields from updates
    delete updates.id;
    delete updates.email;
    delete updates.created_at;
    delete updates.updated_at;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in PATCH /api/users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete current user and associated data
export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify role
    const { data: profile, error: profileCheckError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileCheckError) {
      console.error('Profile check error:', profileCheckError);
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 500 });
    }

    // Prevent deletion of admin users
    if (profile.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin users cannot be deleted through this endpoint' },
        { status: 403 }
      );
    }

    // Get all domains where user is a manager
    const { data: domains, error: domainsError } = await supabaseAdmin
      .from('domains')
      .select('id')
      .eq('manager_id', user.id);

    if (domainsError) {
      console.error('Domains lookup error:', domainsError);
      return NextResponse.json({ error: 'Failed to lookup user domains' }, { status: 500 });
    }

    // Delete teams for each domain
    if (domains && domains.length > 0) {
      const domainIds = domains.map(d => d.id);
      const { error: teamsError } = await supabaseAdmin
        .from('teams')
        .delete()
        .in('domain_id', domainIds);

      if (teamsError) {
        console.error('Teams deletion error:', teamsError);
        return NextResponse.json({ error: 'Failed to delete user teams' }, { status: 500 });
      }

      // Delete domains
      const { error: domainsDeleteError } = await supabaseAdmin
        .from('domains')
        .delete()
        .in('id', domainIds);

      if (domainsDeleteError) {
        console.error('Domains deletion error:', domainsDeleteError);
        return NextResponse.json({ error: 'Failed to delete user domains' }, { status: 500 });
      }
    }

    // Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile deletion error:', profileError);
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 });
    }

    // Delete user from auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('Auth user deletion error:', authDeleteError);
      return NextResponse.json({ error: 'Failed to delete user from auth' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User and associated data deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
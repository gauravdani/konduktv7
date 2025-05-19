import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET /api/domains - Get all domains for current user
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

    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select(`
        *,
        teams!inner (
          user_id,
          role
        )
      `)
      .eq('teams.user_id', user.id);

    if (domainsError) {
      console.error('Domains error:', domainsError);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    return NextResponse.json(domains);
  } catch (error) {
    console.error('Error in GET /api/domains:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/domains - Create new domain
export async function POST(request: Request) {
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

    let domain_name;
    try {
      const body = await request.json();
      domain_name = body.domain_name;
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate input
    if (!domain_name) {
      return NextResponse.json(
        { error: 'Domain name is required' },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('id')
      .eq('domain_name', domain_name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Domain check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check domain existence' },
        { status: 500 }
      );
    }

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists' },
        { status: 400 }
      );
    }

    // Start a transaction
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .insert([
        {
          domain_name,
          manager_id: user.id,
          subscription_status: 'trial',
        },
      ])
      .select()
      .single();

    if (domainError) {
      console.error('Domain error:', domainError);
      return NextResponse.json(
        { 
          error: 'Failed to create domain',
          details: domainError.message
        },
        { status: 500 }
      );
    }

    // Add user as manager to the domain
    const { error: teamError } = await supabase
      .from('teams')
      .insert([
        {
          domain_id: domain.id,
          user_id: user.id,
          role: 'manager',
        },
      ]);

    if (teamError) {
      console.error('Team error:', teamError);
      // Clean up the domain if team creation fails
      await supabase
        .from('domains')
        .delete()
        .eq('id', domain.id);
      return NextResponse.json(
        { 
          error: 'Failed to create team',
          details: teamError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(domain, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/domains:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/domains/:id - Update domain
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    delete updates.created_at;
    delete updates.updated_at;

    // Verify user is manager of the domain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('role')
      .eq('domain_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (teamError) {
      console.error('Team error:', teamError);
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }
    if (!team || team.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only domain managers can update domain settings' },
        { status: 403 }
      );
    }

    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (domainError) {
      console.error('Domain error:', domainError);
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error('Error in PATCH /api/domains:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    console.error('Error in PATCH /api/domains/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/domains/:id - Delete domain
export async function DELETE(
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

    // Validate domain ID format
    if (!params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid domain ID format' },
        { status: 400 }
      );
    }

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
        { error: 'Only domain managers can delete domains' },
        { status: 403 }
      );
    }

    // Check if domain exists and belongs to user
    const { data: domain, error: domainCheckError } = await supabase
      .from('domains')
      .select('id, manager_id')
      .eq('id', params.id)
      .single();

    if (domainCheckError) {
      console.error('Domain check error:', domainCheckError);
      return NextResponse.json({ error: 'Failed to verify domain ownership' }, { status: 500 });
    }

    if (!domain || domain.manager_id !== user.id) {
      return NextResponse.json(
        { error: 'Domain not found or not owned by user' },
        { status: 404 }
      );
    }

    // Delete domain's teams first
    const { error: teamsError } = await supabase
      .from('teams')
      .delete()
      .eq('domain_id', params.id);

    if (teamsError) {
      console.error('Teams deletion error:', teamsError);
      return NextResponse.json({ error: 'Failed to delete domain teams' }, { status: 500 });
    }

    // Delete the domain
    const { error: domainError } = await supabase
      .from('domains')
      .delete()
      .eq('id', params.id);

    if (domainError) {
      console.error('Domain deletion error:', domainError);
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Domain deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/domains/[id]:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 
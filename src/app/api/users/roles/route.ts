import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema for role updates
const roleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['manager', 'team_member']),
});

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user's role
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUserError || currentUser.role !== 'manager') {
      return NextResponse.json(
        { error: 'Unauthorized - Only managers can view roles' },
        { status: 403 }
      );
    }

    // Get all users and their roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role');

    if (usersError) {
      return NextResponse.json(
        { error: usersError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user's role
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (currentUserError || currentUser.role !== 'manager') {
      return NextResponse.json(
        { error: 'Unauthorized - Only managers can update roles' },
        { status: 403 }
      );
    }

    // Validate input
    const validatedData = roleUpdateSchema.parse(body);
    
    // Update user role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role: validatedData.role })
      .eq('id', validatedData.userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
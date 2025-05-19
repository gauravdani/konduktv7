import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { POST } from '../signup/route'

// Mock the Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('Signup API', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        admin: {
          deleteUser: jest.fn(),
        },
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }

    // Mock the createRouteHandlerClient function
    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should create a new user with proper role and domain', async () => {
    // Mock successful auth signup
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@konduktv.com',
        },
        session: {
          access_token: 'test-token',
        },
      },
      error: null,
    })

    // Mock successful profile creation
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-user-id',
        email: 'test@konduktv.com',
        role: 'team_member',
      },
      error: null,
    })

    // Mock successful domain creation
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-domain-id',
        domain_name: 'konduktv.com',
        manager_id: 'test-user-id',
      },
      error: null,
    })

    // Mock successful team creation
    mockSupabase.insert.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@konduktv.com',
        password: 'Test@123456',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('User created successfully')
    expect(data.user.role).toBe('team_member')
    expect(data.domain.domain_name).toBe('konduktv.com')
    expect(data.domain.manager_id).toBe('test-user-id')
  })

  it('should handle invalid email format', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'Test@123456',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('should handle weak password', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@konduktv.com',
        password: 'weak',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password too weak')
  })

  it('should handle auth signup failure', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: {
        message: 'Email already registered',
        status: 400,
      },
    })

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@konduktv.com',
        password: 'Test@123456',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Failed to create user')
    expect(data.details).toBe('Email already registered')
  })

  it('should handle domain creation failure', async () => {
    // Mock successful auth signup
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@konduktv.com',
        },
        session: {
          access_token: 'test-token',
        },
      },
      error: null,
    })

    // Mock successful profile creation
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-user-id',
        email: 'test@konduktv.com',
        role: 'team_member',
      },
      error: null,
    })

    // Mock domain creation failure
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Domain already exists',
        code: '23505',
      },
    })

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@konduktv.com',
        password: 'Test@123456',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create initial domain')
    expect(data.details).toBe('Domain already exists')

    // Verify cleanup was attempted
    expect(mockSupabase.from).toHaveBeenCalledWith('users')
    expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id')
  })

  it('should handle team creation failure', async () => {
    // Mock successful auth signup
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@konduktv.com',
        },
        session: {
          access_token: 'test-token',
        },
      },
      error: null,
    })

    // Mock successful profile creation
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-user-id',
        email: 'test@konduktv.com',
        role: 'team_member',
      },
      error: null,
    })

    // Mock successful domain creation
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'test-domain-id',
        domain_name: 'konduktv.com',
        manager_id: 'test-user-id',
      },
      error: null,
    })

    // Mock team creation failure
    mockSupabase.insert.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Team creation failed',
        code: '23505',
      },
    })

    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@konduktv.com',
        password: 'Test@123456',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create team membership')
    expect(data.details).toBe('Team creation failed')

    // Verify cleanup was attempted
    expect(mockSupabase.from).toHaveBeenCalledWith('domains')
    expect(mockSupabase.from).toHaveBeenCalledWith('users')
    expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id')
  })
}) 
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Mock the NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ data, status: options?.status || 200 }))
  }
}))

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        or: jest.fn()
      }))
    }))
  }))
}))

describe('Signin Endpoint', () => {
  let mockRequest: Request
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup mock request
    mockRequest = {
      json: jest.fn().mockResolvedValue({
        email: 'test.user@konduktv.com',
        password: 'Test@123456'
      })
    } as any

    // Setup mock Supabase client
    mockSupabaseClient = createClient('mock-url', 'mock-key')
  })

  it('should return 400 for missing email or password', async () => {
    mockRequest.json.mockResolvedValueOnce({ email: '', password: '' })
    
    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Email and password are required'
      }),
      { status: 400 }
    )
  })

  it('should return 400 for invalid email format', async () => {
    mockRequest.json.mockResolvedValueOnce({
      email: 'invalid-email',
      password: 'Test@123456'
    })
    
    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid email format'
      }),
      { status: 400 }
    )
  })

  it('should return 401 for invalid credentials', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials', status: 401 }
    })

    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Authentication failed',
        details: 'Invalid login credentials'
      }),
      { status: 401 }
    )
  })

  it('should successfully sign in user and return profile data', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test.user@konduktv.com'
    }

    const mockProfile = {
      id: 'test-user-id',
      email: 'test.user@konduktv.com',
      full_name: 'Test User'
    }

    const mockDomains = [
      {
        id: 'test-domain-id',
        name: 'test.konduktv.com',
        manager_id: 'test-user-id'
      }
    ]

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token'
    }

    // Mock successful authentication
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    })

    // Mock profile fetch
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: mockProfile,
      error: null
    })

    // Mock domains fetch
    mockSupabaseClient.from().select().or.mockResolvedValueOnce({
      data: mockDomains,
      error: null
    })

    // Mock session creation
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null
    })

    const { POST } = require('../signin/route')
    const response = await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Sign in successful',
        user: mockProfile,
        domains: mockDomains,
        session: mockSession
      }),
      { status: 200 }
    )
  })

  it('should handle profile fetch error', async () => {
    // Mock successful authentication
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null
    })

    // Mock profile fetch error
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch profile', code: 'PGRST116' }
    })

    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to fetch user profile',
        details: 'Failed to fetch profile'
      }),
      { status: 500 }
    )
  })

  it('should handle domains fetch error', async () => {
    // Mock successful authentication
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null
    })

    // Mock successful profile fetch
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: { id: 'test-user-id' },
      error: null
    })

    // Mock domains fetch error
    mockSupabaseClient.from().select().or.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch domains', code: 'PGRST116' }
    })

    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to fetch user domains',
        details: 'Failed to fetch domains'
      }),
      { status: 500 }
    )
  })

  it('should handle session creation error', async () => {
    // Mock successful authentication
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
      error: null
    })

    // Mock successful profile fetch
    mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
      data: { id: 'test-user-id' },
      error: null
    })

    // Mock successful domains fetch
    mockSupabaseClient.from().select().or.mockResolvedValueOnce({
      data: [],
      error: null
    })

    // Mock session creation error
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to create session', status: 500 }
    })

    const { POST } = require('../signin/route')
    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to create session',
        details: 'Failed to create session'
      }),
      { status: 500 }
    )
  })
}) 
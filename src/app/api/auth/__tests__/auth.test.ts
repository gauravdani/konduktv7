import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { POST as signup } from '../signup/route'
import { POST as signin } from '../signin/route'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}))

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('Auth API', () => {
  let mockRequest: Request
  let mockSupabase: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
      },
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    }

    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Signup', () => {
    it('should create a new user successfully', async () => {
      // Mock successful auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'test-user-id' },
        },
        error: null,
      })

      // Mock successful profile creation
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'team_member',
        },
        error: null,
      })

      // Create request
      mockRequest = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
        }),
      })

      const response = await signup(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('User created successfully')
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('test-user-id')
    })

    it('should return 400 for missing email or password', async () => {
      mockRequest = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await signup(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
    })
  })

  describe('Signin', () => {
    it('should sign in user successfully', async () => {
      // Mock successful sign in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'test-user-id' },
          session: { access_token: 'test-token' },
        },
        error: null,
      })

      // Mock successful profile fetch
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'team_member',
        },
        error: null,
      })

      // Create request
      mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123',
        }),
      })

      const response = await signin(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Signed in successfully')
      expect(data.user).toBeDefined()
      expect(data.session).toBeDefined()
      expect(data.session.access_token).toBe('test-token')
    })

    it('should return 401 for invalid credentials', async () => {
      // Mock failed sign in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      mockRequest = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      })

      const response = await signin(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
    })
  })
}) 
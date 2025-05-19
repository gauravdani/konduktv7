import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// Mock the createRouteHandlerClient and createClient
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

// Mock the cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('Users API', () => {
  let mockSupabase: any
  let mockSupabaseAdmin: any
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }

    // Setup mock Supabase admin client
    mockSupabaseAdmin = {
      auth: {
        admin: {
          deleteUser: jest.fn(),
        },
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }

    // Mock the createRouteHandlerClient and createClient functions
    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseAdmin)
  })

  describe('DELETE /api/users', () => {
    it('should delete user and associated data successfully', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful domain lookup
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: [{ id: 'domain-1' }, { id: 'domain-2' }],
        error: null,
      })

      // Mock successful team deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful domain deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful profile deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful auth user deletion
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValueOnce({
        error: null,
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('User and associated data deleted successfully')
    })

    it('should handle domain lookup error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock domain lookup error
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to lookup domains' },
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to lookup user domains')
    })

    it('should handle team deletion error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful domain lookup
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: [{ id: 'domain-1' }],
        error: null,
      })

      // Mock team deletion error
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: { message: 'Failed to delete teams' },
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user teams')
    })

    it('should handle domain deletion error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful domain lookup
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: [{ id: 'domain-1' }],
        error: null,
      })

      // Mock successful team deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock domain deletion error
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: { message: 'Failed to delete domains' },
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user domains')
    })

    it('should handle profile deletion error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful domain lookup
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: [{ id: 'domain-1' }],
        error: null,
      })

      // Mock successful team deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful domain deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock profile deletion error
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: { message: 'Failed to delete profile' },
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user profile')
    })

    it('should handle auth user deletion error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful domain lookup
      mockSupabaseAdmin.select.mockResolvedValueOnce({
        data: [{ id: 'domain-1' }],
        error: null,
      })

      // Mock successful team deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful domain deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful profile deletion
      mockSupabaseAdmin.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock auth user deletion error
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValueOnce({
        error: { message: 'Failed to delete auth user' },
      })

      const { DELETE } = require('../route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete user from auth')
    })
  })
}) 
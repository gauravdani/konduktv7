import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Mock the createRouteHandlerClient
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}))

// Mock the cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('Domain ID Operations', () => {
  let mockSupabase: any
  let mockRequest: Request
  const mockDomainId = 'test-domain-id'
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
    }

    // Mock the createRouteHandlerClient function
    ;(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase)

    // Setup mock request
    mockRequest = new Request('http://localhost:3000/api/domains/' + mockDomainId, {
      method: 'PATCH',
      body: JSON.stringify({
        subscription_status: 'active',
      }),
    })
  })

  describe('PATCH /api/domains/[id]', () => {
    it('should update domain when user is manager', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful team verification
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'manager' },
        error: null,
      })

      // Mock successful domain update
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: mockDomainId,
          domain_name: 'test.konduktv.com',
          subscription_status: 'active',
        },
        error: null,
      })

      const { PATCH } = require('../[id]/route')
      const response = await PATCH(mockRequest, { params: { id: mockDomainId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subscription_status).toBe('active')
    })

    it('should return 403 when user is not manager', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock team verification - user is not manager
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'team_member' },
        error: null,
      })

      const { PATCH } = require('../[id]/route')
      const response = await PATCH(mockRequest, { params: { id: mockDomainId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only domain managers can update domain settings')
    })
  })

  describe('DELETE /api/domains/[id]', () => {
    beforeEach(() => {
      mockRequest = new Request('http://localhost:3000/api/domains/' + mockDomainId, {
        method: 'DELETE',
      })
    })

    it('should delete domain when user is manager', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful team verification
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'manager' },
        error: null,
      })

      // Mock successful team deletion
      mockSupabase.delete.mockResolvedValueOnce({
        error: null,
      })

      // Mock successful domain deletion
      mockSupabase.delete.mockResolvedValueOnce({
        error: null,
      })

      const { DELETE } = require('../[id]/route')
      const response = await DELETE(mockRequest, { params: { id: mockDomainId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Domain deleted successfully')
    })

    it('should return 403 when user is not manager', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock team verification - user is not manager
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'team_member' },
        error: null,
      })

      const { DELETE } = require('../[id]/route')
      const response = await DELETE(mockRequest, { params: { id: mockDomainId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only domain managers can delete domains')
    })

    it('should handle team deletion error', async () => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful team verification
      mockSupabase.single.mockResolvedValueOnce({
        data: { role: 'manager' },
        error: null,
      })

      // Mock team deletion error
      mockSupabase.delete.mockResolvedValueOnce({
        error: { message: 'Failed to delete teams' },
      })

      const { DELETE } = require('../[id]/route')
      const response = await DELETE(mockRequest, { params: { id: mockDomainId } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete domain teams')
    })
  })
}) 
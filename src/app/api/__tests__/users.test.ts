import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GET, POST, PATCH } from '../users/route';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('User API Endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signUp: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('GET /api/users', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockProfile = { id: '123', email: 'test@example.com', role: 'manager' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from().select().eq().single.mockResolvedValue({ data: mockProfile, error: null });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProfile);
    });

    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/users', () => {
    it('should create new user when valid data provided', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockProfile = { id: '123', email: 'test@example.com', role: 'team_member' };

      mockSupabase.auth.signUp.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from().insert().select().single.mockResolvedValue({ data: mockProfile, error: null });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockProfile);
    });

    it('should return 400 when email is missing', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email is required');
    });
  });

  describe('PATCH /api/users', () => {
    it('should update user profile when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockProfile = { id: '123', email: 'test@example.com', role: 'manager' };

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabase.from().update().eq().select().single.mockResolvedValue({ data: mockProfile, error: null });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockProfile);
    });

    it('should return 401 when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'manager' }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
}); 
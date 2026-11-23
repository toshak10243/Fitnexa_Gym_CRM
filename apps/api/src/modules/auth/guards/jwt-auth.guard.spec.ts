import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('Temporary password access policy', () => {
  const guard = new JwtAuthGuard(new Reflector());
  const context = (url: string) => ({ switchToHttp: () => ({ getRequest: () => ({ originalUrl: url }) }) }) as ExecutionContext;
  it.each(['/api/v1/members', '/api/v1/analytics/dashboard', '/api/v1/inventory/products'])('blocks %s until the password is changed', (url) => {
    expect(() => guard.handleRequest(null, { mustChangePassword: true }, null, context(url))).toThrow(ForbiddenException);
  });
  it.each(['/api/v1/auth/me', '/api/v1/auth/change-password', '/api/v1/auth/logout'])('allows %s during first login', (url) => {
    expect(guard.handleRequest(null, { mustChangePassword: true }, null, context(url))).toBeDefined();
  });
  it('allows ordinary dashboard access after password change', () => {
    expect(guard.handleRequest(null, { mustChangePassword: false }, null, context('/api/v1/analytics/dashboard'))).toBeDefined();
  });
});

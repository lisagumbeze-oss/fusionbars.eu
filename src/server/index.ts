import { AuthService } from '../domain/auth/AuthService';
import { RBACService } from '../domain/auth/RBACService';
import { RoleName } from '../types';

export interface ServerSession {
  userId: string;
  email: string;
  role: RoleName | 'CUSTOMER';
  name?: string | null;
}

export class ServerContext {
  /**
   * Verifies an inbound Authorization Bearer token or session cookie.
   */
  static verifyAuthToken(token: string | null | undefined): ServerSession | null {
    if (!token) return null;
    const session = AuthService.verifySessionToken(token);
    if (!session) return null;
    return {
      userId: session.id,
      email: session.email,
      role: session.role,
      name: session.name,
    };
  }

  /**
   * Checks if session has required permission.
   */
  static hasPermission(session: ServerSession | null, permissionCode: string): boolean {
    if (!session || session.role === 'CUSTOMER') return false;
    return RBACService.hasPermission(session.role, permissionCode);
  }
}

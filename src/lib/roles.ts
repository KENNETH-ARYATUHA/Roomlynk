// Where should each kind of user land after logging in?
// One function used by Welcome, VerifyOtp and anywhere else that redirects,
// so we never have three slightly different copies of this logic.

import type { User } from '@/types';

export function homePathFor(user: User): string {
  switch (user.role) {
    case 'student':
      return '/browse';
    case 'landlord':
      return '/landlord';
    case 'admin':
      return '/admin';
    default:
      // agent and finance workspaces are built in later phases.
      return '/coming-soon';
  }
}

// apps/api/src/auth/decorators/roles.decorator.ts
// Marks a route/controller with the role names allowed to access it (RolesGuard reads this).
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'betvision:roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

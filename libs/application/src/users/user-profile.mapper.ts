// libs/application/src/users/user-profile.mapper.ts
// Domain User aggregate -> contracts UserProfileDto (wire shape). Keeps the domain free of
// contract concerns; the explicit status map avoids `as` casts across the boundary.
import { User, UserStatus } from '@betvision/domain';
import type { UserProfileDto } from '@betvision/contracts';

const STATUS_MAP: Record<UserStatus, UserProfileDto['status']> = {
  [UserStatus.PendingVerification]: 'pending_verification',
  [UserStatus.Active]: 'active',
  [UserStatus.Suspended]: 'suspended',
  [UserStatus.SelfExcluded]: 'self_excluded',
  [UserStatus.Deleted]: 'deleted',
};

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email.value,
    role: user.roleName,
    locale: user.locale,
    status: STATUS_MAP[user.status],
    ageConfirmedAt: user.ageConfirmedAt,
    selfLimits: user.selfLimits ? { ...user.selfLimits } : null,
    settings: user.settings ? { ...user.settings } : null,
    createdAt: user.createdAt,
  };
}

// libs/domain/src/ports/notification.port.ts
import type { UserId, Locale } from './shared.dto';

export interface NotificationMessage {
  readonly to: UserId;
  readonly channel: 'email' | 'push';
  /** i18n key + params — localized at delivery, NOT in the domain. */
  readonly templateCode: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly locale: Locale;
}

export interface NotificationPort {
  send(message: NotificationMessage): Promise<void>;
}

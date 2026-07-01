// libs/infrastructure/src/notification/log-notification.adapter.ts
// NotificationPort placeholder for v1: logs that a notification was queued WITHOUT its
// params (which may contain secrets such as password-reset tokens). A real email/push
// adapter slots in behind the same port later.
import { Injectable, Logger } from '@nestjs/common';
import type { NotificationPort, NotificationMessage } from '@betvision/domain';

@Injectable()
export class LogNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(LogNotificationAdapter.name);

  async send(message: NotificationMessage): Promise<void> {
    // Deliberately omit `params` — never log token/secret material (SPEC §19).
    this.logger.log(
      `notification queued: template=${message.templateCode} channel=${message.channel} to=${message.to} locale=${message.locale}`,
    );
  }
}

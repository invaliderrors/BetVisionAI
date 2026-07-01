// libs/testing/src/fakes/fake-notification.port.ts
import type { NotificationPort, NotificationMessage } from '@betvision/domain';

/** Captures an in-memory outbox of sent notifications. */
export class FakeNotificationPort implements NotificationPort {
  readonly outbox: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<void> {
    this.outbox.push(message);
  }
}

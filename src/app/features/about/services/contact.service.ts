import { Injectable } from '@angular/core';

export interface ContactMessage {
  email: string;
  message: string;
  name: string;
  /** The hidden field only bots fill in; the server drops those messages. */
  website: string;
}

/** Sends a visitor's message to Santi through `/api/contact`, which keeps his address on the server. */
@Injectable({ providedIn: 'root' })
export class ContactService {
  /** True when the message was accepted; false when it was refused or the network failed. */
  async send(message: ContactMessage): Promise<boolean> {
    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify(message),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

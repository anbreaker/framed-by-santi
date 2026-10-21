import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  CONTACT_EMAIL_PATTERN,
  MAX_CONTACT_EMAIL_LENGTH,
  MAX_CONTACT_MESSAGE_LENGTH,
  MAX_CONTACT_NAME_LENGTH,
} from '@features/about/const/contact.const';
import { ContactService } from '@features/about/services/contact.service';
import { ScrollRevealDirective } from '@features/scroll-reveal/directives/scroll-reveal.directive';

type Field = 'email' | 'message' | 'name' | 'website';
type FieldError = Exclude<Field, 'website'>;
type Status = 'failed' | 'idle' | 'sending' | 'sent';

/** A short form to write to Santi; his address never reaches the page. */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollRevealDirective, TranslocoDirective],
  selector: 'app-contact-form',
  styleUrl: './contact-form.component.css',
  templateUrl: './contact-form.component.html',
})
export class ContactFormComponent {
  private readonly contactService = inject(ContactService);

  protected readonly maxEmail = MAX_CONTACT_EMAIL_LENGTH;
  protected readonly maxMessage = MAX_CONTACT_MESSAGE_LENGTH;
  protected readonly maxName = MAX_CONTACT_NAME_LENGTH;

  protected readonly email = signal('');
  protected readonly errors = signal<readonly FieldError[]>([]);
  protected readonly message = signal('');
  protected readonly name = signal('');
  protected readonly status = signal<Status>('idle');
  protected readonly website = signal('');

  protected hasError(field: FieldError): boolean {
    return this.errors().includes(field);
  }

  protected onText(field: Field, event: Event): void {
    this[field].set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.status() === 'sending') return;

    const errors = this.validate();
    this.errors.set(errors);
    if (errors.length > 0) return;

    this.status.set('sending');

    const sent = await this.contactService.send({
      email: this.email().trim(),
      message: this.message().trim(),
      name: this.name().trim(),
      website: this.website(),
    });

    if (sent) {
      this.name.set('');
      this.email.set('');
      this.message.set('');
    }

    this.status.set(sent ? 'sent' : 'failed');
  }

  private validate(): FieldError[] {
    const errors: FieldError[] = [];
    const name = this.name().trim();
    const email = this.email().trim();
    const message = this.message().trim();

    if (name === '' || name.length > MAX_CONTACT_NAME_LENGTH) errors.push('name');
    if (email.length > MAX_CONTACT_EMAIL_LENGTH || !CONTACT_EMAIL_PATTERN.test(email)) {
      errors.push('email');
    }
    if (message === '' || message.length > MAX_CONTACT_MESSAGE_LENGTH) errors.push('message');

    return errors;
  }
}

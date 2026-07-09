import { Component, output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent {
  // Modern Output
  send = output<string>();

  // Internal state as Signal
  inputText = signal('');

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text) return;
    this.send.emit(text);
    this.inputText.set('');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}

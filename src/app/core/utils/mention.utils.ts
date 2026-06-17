export class MentionUtils {
  /**
   * Detecta si el usuario está escribiendo una mención y retorna el término de búsqueda (query).
   * Retorna `null` si no hay mención activa en la posición del cursor.
   */
  static detectMentionQuery(text: string, cursorPos: number): string | null {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      return null;
    }

    const query = textBeforeCursor.substring(lastAtIndex + 1);

    // No activar si la query contiene espacios, saltos de línea o si la mención ya está confirmada (termina en \u200B)
    if (query.includes(' ') || query.includes('\n') || textBeforeCursor.endsWith('\u200B')) {
      return null;
    }

    return query;
  }

  /**
   * Inserta la mención seleccionada en el texto y retorna el nuevo valor de texto junto con la nueva posición del cursor.
   */
  static insertMentionIntoText(
    text: string,
    cursorPos: number,
    username: string
  ): { newText: string; newCursor: number } {
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      return { newText: text, newCursor: cursorPos };
    }

    const before = text.substring(0, lastAtIndex);
    const after = text.substring(cursorPos);
    const mention = `@${username}\u200B `;
    const newText = before + mention + after;
    const newCursor = lastAtIndex + mention.length;

    return { newText, newCursor };
  }
}

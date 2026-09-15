// Chat commands typed at the start of a message, such as "/image a developer coding at night".
// "\image" works too, since the backslash is an easy typo, and the direction marks that some
// right-to-left keyboards add before the text are ignored.

const LEADING_MARKS = /^[\s‎‏‪-‮⁦-⁩]*/;
const IMAGE_COMMAND = /^[/\\]image(?=\s|$)/i;
const TYPED_IMAGE_COMMAND = /^[/\\]image\s/i;

export type ParsedCommand = { command: 'image' | null; text: string };

/** Split a leading command from a message; `text` is the message without the command. */
export function parseCommand(value: string): ParsedCommand {
  const body = value.replace(LEADING_MARKS, '');
  const match = IMAGE_COMMAND.exec(body);
  if (!match) return { command: null, text: value };
  return { command: 'image', text: body.slice(match[0].length).trim() };
}

/** While typing: the text after the image command once a space follows it, otherwise null. */
export function typedImageCommand(value: string): string | null {
  const body = value.replace(LEADING_MARKS, '');
  const match = TYPED_IMAGE_COMMAND.exec(body);
  return match ? body.slice(match[0].length) : null;
}

/** How an image request is kept in the chat history. */
export const imageCommandMessage = (prompt: string) => `/image ${prompt}`;

// Letters of scripts written right to left (Hebrew, Arabic, Syriac, Thaana, NKo and their presentation forms).
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const STRONG_LETTER = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ֐-ࣿיִ-﷿ﹰ-﻿]/;

/** 'rtl' when the first letter of the text belongs to a right-to-left script such as Arabic. */
export function textDirection(text: string): 'rtl' | 'ltr' {
  const first = STRONG_LETTER.exec(text);
  return first && RTL_LETTER.test(first[0]) ? 'rtl' : 'ltr';
}

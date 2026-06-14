export type SseParseResult = {
  tokens: string[];
  done: boolean;
  rest: string;
};

export function parseSseLines(buffer: string): SseParseResult {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const tokens: string[] = [];
  let done = false;

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6);
    if (data === '[DONE]') {
      done = true;
      break;
    }
    tokens.push(JSON.parse(data) as string);
  }

  return { tokens, done, rest };
}

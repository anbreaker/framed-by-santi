/** Film-style position inside a set, for example `03 / 10`. Digits are the same in every site language. */
export function formatSetCounter(position: number, total: number): string {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${pad(position)} / ${pad(total)}`;
}

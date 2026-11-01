/**
 * The Mythic badge: our own laurel and star (PLAN-v1.md §11, P7). The data
 * supplies no icon, and Microsoft's artwork isn't used. Too fiddly below about
 * 24 px, and it stays off box art.
 */
export function Laurel({ size, label }: { size: number; /** Leave out when text beside it says the same. */ label?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ flex: 'none' }} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <g fill="var(--accent)">
        <path d="M32 60C14 58 4 44 5 24l6 2c0 15 8 26 21 28z" />
        <path d="M32 60c18-2 28-16 27-36l-6 2c0 15-8 26-21 28z" />
        <path d="M7 20c-3-5-2-10 1-14 4 4 5 9 3 14zM7 34c-5-2-7-7-7-12 5 1 9 5 10 10zM13 46c-5 0-9-3-11-8 5-1 10 1 13 5zM57 20c3-5 2-10-1-14-4 4-5 9-3 14zM57 34c5-2 7-7 7-12-5 1-9 5-10 10zM51 46c5 0 9-3 11-8-5-1-10 1-13 5z" />
      </g>
      <path fill="#ffc27a" d="M32 14l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />
    </svg>
  );
}

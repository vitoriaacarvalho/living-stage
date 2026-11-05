const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const dayAndMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });

// The overline style sets it in capitals: THURSDAY, 5 NOVEMBER.
export function todayLine(now: Date): string {
  return `${weekday.format(now)}, ${dayAndMonth.format(now)}`;
}

export function greeting(now: Date, userName: string): string {
  const hour = now.getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const firstName = userName.trim().split(/\s+/)[0];
  return firstName ? `Good ${part}, ${firstName}` : `Good ${part}`;
}

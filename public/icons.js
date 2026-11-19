const paths = {
  church:'<path d="M12 2v6m-3-3h6M3 22V12l9-6 9 6v10H3Z"/><path d="M9 22v-5a3 3 0 0 1 6 0v5"/>',
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-3-11a4 4 0 0 1 0 8"/><circle cx="9" cy="8" r="4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-11 5 2 2 4-4"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
  cake:'<path d="M4 17v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 21h18M4 17c2 0 2 1 4 1s2-1 4-1 2 1 4 1 2-1 4-1v4H4zm8-5V8m0-5c-2 2-2 4 0 4s2-2 0-4Z"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m10 3-.7 2.2-2 .9-2.1-.9-2 3.4 1.6 1.6v2.6l-1.6 1.6 2 3.5 2.1-.8 2 1 .7 2.2h4l.7-2.2 2-1 2.1.8 2-3.5-1.6-1.6v-2.6l1.6-1.6-2-3.4-2.1.9-2-.9L14 3z"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  down:'<path d="m6 9 6 6 6-6"/>', right:'<path d="M5 12h14m-6-6 6 6-6 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  trend:'<path d="m3 17 6-6 4 4 7-7m-5 0h5v5"/>', dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', close:'<path d="m6 6 12 12M18 6 6 18"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  check:'<path d="m5 12 4 4L19 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout:'<path d="M11 4H4v16h7m-1-8h11m-4-4 4 4-4 4"/>', phone:'<path d="M4 3h4l2 5-3 2c2 3 4 5 7 7l2-3 5 2v4c0 4-9 0-13-4S0 3 4 3Z"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>'
};
export const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;

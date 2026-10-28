import { socialLinks } from "@/data/social";

export function SocialLinks() {
  return (
    <ul className="mt-4 flex items-center justify-center gap-3">
      {socialLinks.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className="press inline-flex"
          >
            <SocialIcon id={link.id} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SocialIcon({ id }: { id: (typeof socialLinks)[number]["id"] }) {
  if (id === "instagram") return <InstagramIcon />;
  if (id === "facebook") return <FacebookIcon />;
  if (id === "tiktok") return <TikTokIcon />;
  return <WhatsAppIcon />;
}

function InstagramIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <defs>
        <radialGradient id="cabano-ig" cx="30%" cy="110%" r="130%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="30%" stopColor="#fa7e1e" />
          <stop offset="55%" stopColor="#d62976" />
          <stop offset="78%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="12" fill="url(#cabano-ig)" />
      <rect x="11" y="11" width="22" height="22" rx="6" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="22" cy="22" r="5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="29.2" cy="14.8" r="1.5" fill="#fff" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect width="44" height="44" rx="12" fill="#0866FF" />
      <path
        fill="#fff"
        d="M25.2 23.2h-2.7v9.3h-3.8v-9.3h-1.8v-3.2h1.8v-1.9c0-2.5 1.5-3.9 3.8-3.9.8 0 1.6.1 2.2.2v2.6h-1.5c-1.1 0-1.4.6-1.4 1.4v1.6h3l-.5 3.2z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect width="44" height="44" rx="12" fill="#111" />
      <path
        fill="#25F4EE"
        d="M24.2 13.2v11.6a4.1 4.1 0 1 1-4.1-4.1c.3 0 .6 0 .9.1v2.7a1.6 1.6 0 1 0 1.1 1.5V11h2.7a5.2 5.2 0 0 0 3.6 3.4v2.6a7.6 7.6 0 0 1-4.2-1.3v-2.5z"
        transform="translate(-1.2 0.6)"
      />
      <path
        fill="#FE2C55"
        d="M24.2 13.2v11.6a4.1 4.1 0 1 1-4.1-4.1c.3 0 .6 0 .9.1v2.7a1.6 1.6 0 1 0 1.1 1.5V11h2.7a5.2 5.2 0 0 0 3.6 3.4v2.6a7.6 7.6 0 0 1-4.2-1.3v-2.5z"
        transform="translate(1.1 -0.4)"
      />
      <path
        fill="#fff"
        d="M24.2 13.2v11.6a4.1 4.1 0 1 1-4.1-4.1c.3 0 .6 0 .9.1v2.7a1.6 1.6 0 1 0 1.1 1.5V11h2.7a5.2 5.2 0 0 0 3.6 3.4v2.6a7.6 7.6 0 0 1-4.2-1.3v-2.5z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect width="44" height="44" rx="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M22 11.2a9.6 9.6 0 0 0-8.3 14.4l-.6 3.3 3.4-.9A9.6 9.6 0 1 0 22 11.2zm5.4 13.6c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.2-1.9-.1-.4-.2-1-.4-1.7-.8-3-1.6-5-4.7-5.1-4.9-.2-.2-1.4-1.9-1.4-3.6s.9-2.6 1.2-2.9c.3-.3.7-.4.9-.4h.7c.2 0 .4 0 .6.5.3.7.9 2.3 1 2.5.1.2.1.4 0 .6-.1.3-.2.4-.4.7l-.3.4c-.1.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.2.5.1.7-.1.2-.2.8-1 1.1-1.3.2-.3.5-.3.8-.2.3.1 2 .9 2.3 1.1.3.2.5.3.6.4.1.3.1.8-.1 1.5z"
      />
    </svg>
  );
}

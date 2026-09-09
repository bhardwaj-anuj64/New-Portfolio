interface SocialLinkProps {
  href: string
  label: string
  iconId: string
}

// icons.svg symbols are drawn with a dark fill (#08060d), designed to sit on a light badge —
// hence the solid white circle here rather than the usual glass treatment.
export function SocialLink({ href, label, iconId }: SocialLinkProps) {
  return (
    <a
      href={href}
      aria-label={label}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/90 transition-colors hover:bg-white"
    >
      <svg className="h-4 w-4" aria-hidden="true">
        <use href={`/icons.svg#${iconId}`} />
      </svg>
    </a>
  )
}

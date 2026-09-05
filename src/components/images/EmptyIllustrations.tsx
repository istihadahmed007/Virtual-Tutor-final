/**
 * Educational SVG illustrations for empty states and visual sections.
 * These are abstract/geometric illustrations — NOT fake people.
 */

export function LearningJourneyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" fill="none" className={className} aria-hidden="true">
      {/* Desk/workspace */}
      <rect x="60" y="200" width="280" height="8" rx="4" fill="#E8E5E0" />
      <rect x="80" y="208" width="8" height="60" rx="2" fill="#D4CFC8" />
      <rect x="312" y="208" width="8" height="60" rx="2" fill="#D4CFC8" />

      {/* Monitor */}
      <rect x="120" y="100" width="160" height="100" rx="8" fill="#1A2332" />
      <rect x="126" y="106" width="148" height="84" rx="4" fill="#0D9488" opacity="0.15" />

      {/* Screen content - video call placeholder */}
      <rect x="132" y="112" width="66" height="46" rx="3" fill="#0D9488" opacity="0.3" />
      <rect x="204" y="112" width="66" height="46" rx="3" fill="#0D9488" opacity="0.2" />
      <rect x="132" y="164" width="138" height="20" rx="3" fill="#0D9488" opacity="0.1" />

      {/* Monitor stand */}
      <rect x="186" y="200" width="28" height="8" rx="2" fill="#1A2332" />
      <rect x="192" y="194" width="16" height="6" rx="2" fill="#1A2332" />

      {/* Floating elements */}
      <circle cx="100" cy="140" r="20" fill="#0D9488" opacity="0.1" />
      <circle cx="300" cy="120" r="16" fill="#F59E0B" opacity="0.15" />
      <circle cx="320" cy="170" r="12" fill="#0D9488" opacity="0.08" />

      {/* Chat bubbles */}
      <rect x="90" cy="160" y="155" width="40" height="20" rx="10" fill="#0D9488" opacity="0.2" />
      <rect x="280" y="145" width="50" height="18" rx="9" fill="#F59E0B" opacity="0.2" />

      {/* Stars/sparkles */}
      <path d="M340 90 l4 8 8 4 -8 4 -4 8 -4-8 -8-4 8-4z" fill="#F59E0B" opacity="0.3" />
      <path d="M80 100 l3 6 6 3 -6 3 -3 6 -3-6 -6-3 6-3z" fill="#0D9488" opacity="0.25" />

      {/* Notebook */}
      <rect x="300" y="210" width="50" height="60" rx="4" fill="white" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="310" y1="222" x2="340" y2="222" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="310" y1="232" x2="335" y2="232" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="310" y1="242" x2="330" y2="242" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="310" y1="252" x2="338" y2="252" stroke="#D4CFC8" strokeWidth="1" />

      {/* Coffee cup */}
      <rect x="50" y="185" width="22" height="20" rx="3" fill="white" stroke="#D4CFC8" strokeWidth="1" />
      <path d="M72 190 h6 a3 3 0 0 1 0 6 h-6" fill="none" stroke="#D4CFC8" strokeWidth="1" />
      <path d="M55 183 Q61 178 67 183" fill="none" stroke="#D4CFC8" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export function TeacherDiscoveryIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" fill="none" className={className} aria-hidden="true">
      {/* Search bar */}
      <rect x="60" y="40" width="280" height="44" rx="22" fill="white" stroke="#E8E5E0" strokeWidth="1.5" />
      <circle cx="90" cy="62" r="8" fill="#0D9488" opacity="0.15" />
      <line x1="106" y1="58" x2="160" y2="58" stroke="#D4CFC8" strokeWidth="1.5" strokeLinecap="round" />

      {/* Teacher cards */}
      <rect x="40" y="100" width="150" height="80" rx="12" fill="white" stroke="#E8E5E0" strokeWidth="1" />
      <circle cx="72" cy="130" r="16" fill="#0D9488" opacity="0.2" />
      <line x1="96" y1="124" x2="160" y2="124" stroke="#E8E5E0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="96" y1="134" x2="140" y2="134" stroke="#E8E5E0" strokeWidth="1" strokeLinecap="round" />
      <rect x="72" y="158" width="100" height="8" rx="4" fill="#0D9488" opacity="0.1" />

      <rect x="210" y="100" width="150" height="80" rx="12" fill="white" stroke="#E8E5E0" strokeWidth="1" />
      <circle cx="242" cy="130" r="16" fill="#F59E0B" opacity="0.2" />
      <line x1="266" y1="124" x2="330" y2="124" stroke="#E8E5E0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="266" y1="134" x2="310" y2="134" stroke="#E8E5E0" strokeWidth="1" strokeLinecap="round" />
      <rect x="242" y="158" width="100" height="8" rx="4" fill="#F59E0B" opacity="0.1" />

      <rect x="125" y="200" width="150" height="80" rx="12" fill="white" stroke="#E8E5E0" strokeWidth="1" />
      <circle cx="157" cy="230" r="16" fill="#6366F1" opacity="0.15" />
      <line x1="181" y1="224" x2="250" y2="224" stroke="#E8E5E0" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="181" y1="234" x2="230" y2="234" stroke="#E8E5E0" strokeWidth="1" strokeLinecap="round" />
      <rect x="157" y="258" width="100" height="8" rx="4" fill="#6366F1" opacity="0.08" />

      {/* Connection lines */}
      <path d="M190 140 Q 200 100 210 140" fill="none" stroke="#0D9488" strokeWidth="0.8" opacity="0.3" strokeDasharray="4 4" />
    </svg>
  );
}

export function LiveClassIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" fill="none" className={className} aria-hidden="true">
      {/* Main video area */}
      <rect x="40" y="30" width="240" height="160" rx="12" fill="#1A2332" />

      {/* Whiteboard content inside video */}
      <rect x="52" y="42" width="216" height="136" rx="6" fill="#F8FAF9" />

      {/* Whiteboard writing - equations */}
      <text x="70" y="75" fontFamily="serif" fontSize="14" fill="#1A2332" opacity="0.7">∫ f(x)dx = F(x) + C</text>
      <text x="70" y="100" fontFamily="serif" fontSize="12" fill="#0D9488" opacity="0.6">→ Step by step</text>

      {/* Drawing strokes */}
      <path d="M70 120 Q120 110 170 130 Q220 150 260 125" fill="none" stroke="#0D9488" strokeWidth="1.5" opacity="0.4" />
      <circle cx="170" cy="130" r="3" fill="#F59E0B" opacity="0.5" />

      {/* Pointer */}
      <path d="M200 145 L210 155 L206 148 Z" fill="#F59E0B" opacity="0.6" />

      {/* Participant thumbnails */}
      <rect x="300" y="30" width="80" height="45" rx="6" fill="#0D9488" opacity="0.15" />
      <rect x="300" y="85" width="80" height="45" rx="6" fill="#F59E0B" opacity="0.12" />
      <rect x="300" y="140" width="80" height="45" rx="6" fill="#6366F1" opacity="0.1" />

      {/* Participant icons */}
      <circle cx="340" cy="52" r="8" fill="#0D9488" opacity="0.25" />
      <circle cx="340" cy="107" r="8" fill="#F59E0B" opacity="0.2" />
      <circle cx="340" cy="162" r="8" fill="#6366F1" opacity="0.18" />

      {/* Chat panel */}
      <rect x="300" y="195" width="80" height="95" rx="6" fill="white" stroke="#E8E5E0" strokeWidth="1" />
      <rect x="308" y="205" width="50" height="10" rx="3" fill="#0D9488" opacity="0.1" />
      <rect x="316" y="222" width="54" height="10" rx="3" fill="#E8E5E0" />
      <rect x="308" y="240" width="40" height="10" rx="3" fill="#0D9488" opacity="0.08" />
      <rect x="318" y="258" width="50" height="10" rx="3" fill="#E8E5E0" />

      {/* Control bar */}
      <rect x="40" y="210" width="240" height="50" rx="8" fill="white" stroke="#E8E5E0" strokeWidth="1" />

      {/* Control buttons */}
      <circle cx="90" cy="235" r="14" fill="#0D9488" opacity="0.12" />
      <circle cx="130" cy="235" r="14" fill="#0D9488" opacity="0.12" />
      <circle cx="170" cy="235" r="14" fill="#F59E0B" opacity="0.12" />
      <circle cx="210" cy="235" r="14" fill="#0D9488" opacity="0.12" />
      <circle cx="250" cy="235" r="14" fill="#EF4444" opacity="0.12" />

      {/* Microphone icon */}
      <rect x="86" y="229" width="8" height="12" rx="4" fill="#0D9488" opacity="0.5" />

      {/* Hand raise icon */}
      <path d="M166 230 L170 224 L174 230" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function EmptyClassesIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" fill="none" className={className} aria-hidden="true">
      {/* Calendar */}
      <rect x="80" y="30" width="140" height="120" rx="8" fill="white" stroke="#E8E5E0" strokeWidth="1.5" />
      <rect x="80" y="30" width="140" height="28" rx="8" fill="#0D9488" opacity="0.1" />
      <rect x="80" y="50" width="140" height="8" fill="#0D9488" opacity="0.1" />

      {/* Calendar grid dots */}
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4, 5].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={105 + col * 20}
            cy={75 + row * 15}
            r="2"
            fill="#D4CFC8"
            opacity={row === 2 && col === 3 ? 0.8 : 0.3}
          />
        )),
      )}

      {/* Highlighted day */}
      <rect x="156" y="101" width="14" height="14" rx="3" fill="#0D9488" opacity="0.2" />

      {/* Floating clock */}
      <circle cx="240" cy="60" r="22" fill="white" stroke="#E8E5E0" strokeWidth="1" />
      <line x1="240" y1="48" x2="240" y2="60" stroke="#1A2332" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="240" y1="60" x2="250" y2="56" stroke="#0D9488" strokeWidth="1" strokeLinecap="round" />
      <circle cx="240" cy="60" r="2" fill="#0D9488" />

      {/* Plus button */}
      <circle cx="60" cy="150" r="18" fill="#0D9488" opacity="0.1" />
      <line x1="52" y1="150" x2="68" y2="150" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="60" y1="142" x2="60" y2="158" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

      {/* Arrow hint */}
      <path d="M78 148 Q90 140 100 130" fill="none" stroke="#D4CFC8" strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  );
}

export function EmptyMessagesIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" fill="none" className={className} aria-hidden="true">
      {/* Conversation bubbles */}
      <rect x="30" y="40" width="120" height="36" rx="18" fill="#0D9488" opacity="0.08" />
      <rect x="150" y="80" width="120" height="36" rx="18" fill="#F59E0B" opacity="0.08" />
      <rect x="50" y="124" width="100" height="30" rx="15" fill="#0D9488" opacity="0.05" />

      {/* Typing dots */}
      <circle cx="170" cy="180" r="3" fill="#D4CFC8" />
      <circle cx="180" cy="180" r="3" fill="#D4CFC8" opacity="0.7" />
      <circle cx="190" cy="180" r="3" fill="#D4CFC8" opacity="0.4" />
    </svg>
  );
}

export function EmptyCommunityIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" fill="none" className={className} aria-hidden="true">
      {/* People network - abstract circles connected */}
      <circle cx="150" cy="100" r="20" fill="#0D9488" opacity="0.12" />
      <circle cx="80" cy="70" r="14" fill="#F59E0B" opacity="0.1" />
      <circle cx="220" cy="70" r="14" fill="#6366F1" opacity="0.1" />
      <circle cx="100" cy="145" r="12" fill="#0D9488" opacity="0.08" />
      <circle cx="200" cy="145" r="12" fill="#F59E0B" opacity="0.08" />

      {/* Connection lines */}
      <line x1="130" y1="88" x2="94" y2="76" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="170" y1="88" x2="206" y2="76" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="140" y1="116" x2="112" y2="140" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="160" y1="116" x2="188" y2="140" stroke="#D4CFC8" strokeWidth="1" />
      <line x1="94" y1="84" x2="108" y2="134" stroke="#D4CFC8" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="206" y1="84" x2="192" y2="134" stroke="#D4CFC8" strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  );
}

export function EmptyProgressIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 200" fill="none" className={className} aria-hidden="true">
      {/* Chart area */}
      <rect x="40" y="30" width="220" height="140" rx="8" fill="white" stroke="#E8E5E0" strokeWidth="1" />

      {/* Grid lines */}
      <line x1="60" y1="60" x2="240" y2="60" stroke="#F0EDE8" strokeWidth="0.8" />
      <line x1="60" y1="90" x2="240" y2="90" stroke="#F0EDE8" strokeWidth="0.8" />
      <line x1="60" y1="120" x2="240" y2="120" stroke="#F0EDE8" strokeWidth="0.8" />
      <line x1="60" y1="150" x2="240" y2="150" stroke="#F0EDE8" strokeWidth="0.8" />

      {/* Upcoming trend line */}
      <path d="M70 145 Q110 130 140 110 Q170 90 200 80 Q220 73 240 70" fill="none" stroke="#0D9488" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />

      {/* Question mark */}
      <text x="140" y="115" fontFamily="system-ui" fontSize="28" fill="#0D9488" opacity="0.15" textAnchor="middle">?</text>
    </svg>
  );
}

export function CrayonBurst() {
  return (
    <svg className="crayon-burst" viewBox="0 0 560 480" role="presentation">
      <defs>
        <filter id="roughen"><feTurbulence baseFrequency="0.025" numOctaves="2" seed="8" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="4" /></filter>
        <pattern id="paper-lines" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 8.5 9 7" stroke="#14324a" strokeOpacity=".08" /></pattern>
      </defs>
      <path className="burst burst--blue" d="M145 62c59-45 170-37 230 11 39 31 68 100 38 148-30 49-84 35-118 78-35 43-28 102-83 113-62 12-125-37-143-96-17-58 19-92 21-137 2-44 15-87 55-117Z" />
      <path className="burst burst--coral" d="M298 73c51 5 113 42 126 91 12 45-32 70-27 111 4 35 43 70 15 105-30 37-104 33-143 6-44-30-34-79-65-111-34-35-94-45-86-96 9-59 111-113 180-106Z" />
      <path className="burst burst--yellow" d="M184 126c37-42 118-44 164-14 37 25 30 73 59 104 22 24 69 34 65 73-5 47-77 87-130 83-49-3-66-45-105-59-47-17-101 8-127-35-28-48 35-108 74-152Z" />
      <path className="motion-line" d="M75 125c-24 10-42 28-52 50M79 82 45 59M459 100l44-31M476 150l53-3M86 358l-48 29M453 357l45 37" />
      <g className="player player--one" transform="translate(128 105) rotate(-7)">
        <circle cx="84" cy="57" r="34" /><path d="M58 55c12-8 34-8 50 1M69 48h1M96 48h1M74 68c7 5 14 5 21 0" /><path className="shirt" d="M48 100c18-18 60-19 77 2l-7 101-67-1Z" /><path d="m51 108-41 66M121 108l51-60M10 174l-7 22m7-22 19 6M172 48l13-17m-13 17 20 8M66 202l-17 89M105 203l27 87M49 291l-28 5M132 290l27 4" />
      </g>
      <g className="player player--two" transform="translate(298 143) rotate(8)">
        <circle cx="70" cy="46" r="31" /><path d="M46 41c14-12 39-10 51 1M58 45h1M82 45h1M61 58c7 5 13 5 20-1" /><path className="shirt" d="M37 85c20-13 54-13 70 2l5 94-74 1Z" /><path d="M41 94 1 47M104 94l54 52M1 47l-1-20m1 20 20-3M158 146l11 17m-11-17 19-7M57 181l-9 83M91 181l19 82M48 264l-23 8M110 263l25 4" />
      </g>
      <path className="star" d="m89 235 8 17 19-1-14 13 6 18-17-9-15 11 3-19-15-11 19-3Z" />
      <path className="star star--small" d="m446 213 5 10 11-1-8 8 3 10-10-5-9 6 2-11-9-6 11-2Z" />
      <path className="ground" d="M83 422c93-17 298-13 388 2" /><rect width="560" height="480" fill="url(#paper-lines)" />
    </svg>
  )
}

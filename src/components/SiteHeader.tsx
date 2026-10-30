import styles from './SiteHeader.module.css'

/** Where the visitor is: the home page, the list of games, or inside one game. */
export type Section = 'home' | 'games' | 'game'

/** On every screen: the logo and name in the top-left corner, then the Home and Games tabs. */
export default function SiteHeader({ current }: Readonly<{ current: Section }>) {
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#/">
        <Logo />
        <span className={styles.names}>
          <span>Bharat Bhugol</span>
          <span className={styles.hindi} lang="hi" aria-hidden="true">
            भारत भूगोल
          </span>
        </span>
      </a>

      <nav className={styles.nav} aria-label="Main">
        <a className={styles.tab} href="#/" aria-current={current === 'home' ? 'page' : undefined}>
          Home
        </a>
        {/* Inside a game, Games stays lit: the game is one of its pages. */}
        <a
          className={`${styles.tab} ${current === 'game' ? styles.lit : ''}`}
          href="#/games"
          aria-current={current === 'games' ? 'page' : undefined}
        >
          Games
        </a>
      </nav>
    </header>
  )
}

// India's mainland, simplified to 64 units (the same shape as the favicon).
const INDIA =
  'M6 28.9L8.4 30.9L10.7 30.2L7.3 31.7L10.6 35.2L13 34.3L13.6 32.1L14.6 32.3L13.8 32.9L13.9 37L15 44.6L20.6 59.2L22.6 61L24.4 58.9L26.4 58.8L25.4 57.9L27.3 56.5L28.1 45.6L32 43.9L32 42.9L36.8 38.3L39.5 36.9L40.4 34.1L42.5 32.3L42.8 33.5L43.4 32.5L44.3 33.3L43.3 28.1L42 27.4L43.7 26.1L42 25.1L42.4 23.6L44.9 24.3L45.1 26L49.8 26.1L47.8 29.2L48.7 30.4L49.8 28.8L51.2 32.1L51.6 27.9L53.1 28.2L54.3 22.6L56.1 21L57.7 21.2L57.2 20.2L58 19.3L55.9 18.8L56.4 18L55.3 16.8L54.3 17.7L52.9 17.3L49.6 20.6L47.8 20.7L48.8 22.6L43.7 23.1L43 20.7L41.8 20.9L41.8 24.1L32.4 22.2L27.7 19.6L29.3 16.8L25.5 14.7L25 12.8L26.9 11.8L25.8 9.3L27.7 7.9L28 6.1L26.6 5.3L23.4 6.3L20 3L17.3 3.2L15.3 5.1L17.9 6.8L16.6 8.3L16.9 10.9L19.8 12.7L18.4 13.3L18.5 15L13.4 20.9L10.7 20.6L9.2 22.2L11.6 27.9L7.4 27.7Z'

/** The logo: a globe with India on it in the accent colour. The favicon is the same drawing. */
function Logo() {
  return (
    <svg className={styles.logo} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id="logo-globe">
          <circle cx="32" cy="32" r="28.5" />
        </clipPath>
      </defs>
      <circle className={styles.logoSea} cx="32" cy="32" r="28.5" />
      <g className={styles.logoGrid} clipPath="url(#logo-globe)">
        <ellipse cx="32" cy="32" rx="11" ry="29" />
        <ellipse cx="32" cy="32" rx="22" ry="29" />
        <path d="M32 3V61M3 32H61M6 19H58M6 45H58" />
      </g>
      <path className={styles.logoLand} d={INDIA} transform="translate(13.8 13.8) scale(0.6)" />
      <path className={styles.logoShine} d="M13 22A21 21 0 0 1 23 11" />
      <circle className={styles.logoRim} cx="32" cy="32" r="28.5" />
    </svg>
  )
}

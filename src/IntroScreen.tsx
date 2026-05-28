type IntroScreenProps = {
  exiting: boolean
  onStart: () => void
}

const FEATURES = [
  { title: 'Create live mixes', detail: 'Layer beats, bass, and leads on seven performers' },
  { title: 'Share your sound', detail: 'Save and copy a link to your exact mix' },
  { title: 'Curated packs', detail: 'Hand-picked loops that groove together' },
] as const

export function IntroScreen({ exiting, onStart }: IntroScreenProps) {
  return (
    <div
      className={`intro-screen ${exiting ? 'intro-screen--exit' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      aria-describedby="intro-tagline"
    >
      <div className="intro-screen__bg" aria-hidden="true">
        <span className="intro-screen__orb intro-screen__orb--pink" />
        <span className="intro-screen__orb intro-screen__orb--cyan" />
        <span className="intro-screen__orb intro-screen__orb--gold" />
        <span className="intro-screen__grid" />
        <span className="intro-screen__graffiti">BEAT<br />MIX<br />DROP</span>
      </div>

      <div className="intro-screen__content">
        <p className="intro-screen__eyebrow">Loop lab</p>
        <h1 id="intro-title" className="intro-screen__title">
          INCREDI<span className="intro-screen__title-accent">MIX</span>
        </h1>
        <p id="intro-tagline" className="intro-screen__tagline">
          Build synchronized street mixes. Perform, mute, and share in seconds.
        </p>

        <ul className="intro-screen__features">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="intro-screen__feature">
              <span className="intro-screen__feature-dot" aria-hidden="true" />
              <span>
                <strong>{feature.title}</strong>
                <span className="intro-screen__feature-detail">{feature.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <button type="button" className="intro-screen__cta" onClick={onStart}>
          START MIXING
        </button>
      </div>
    </div>
  )
}

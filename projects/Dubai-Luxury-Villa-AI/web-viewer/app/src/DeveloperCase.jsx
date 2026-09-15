const PILOT_URL = 'https://github.com/safal207/Architectural-AI-Lab/issues/new?title=5-day%20digital%20twin%20pilot&body=Property%20type%3A%0AAvailable%20source%20files%3A%0AKey%20space%20to%20visualize%3A%0ADesired%20viewer%20outcome%3A%0ATarget%20deadline%3A%0A%0APlease%20do%20not%20attach%20confidential%20materials%20to%20this%20public%20issue.';

const PROOFS = [
  ['Blender-native', 'Headless generation'],
  ['GLB 2.0', 'SHA-256 verified'],
  ['4 gates', 'Form → Material → Light → Life'],
  ['Live QA', 'Desktop + mobile']
];

export default function DeveloperCase() {
  return (
    <>
      <section className="sales-hero" aria-labelledby="sales-title">
        <div className="sales-hero__copy">
          <p className="eyebrow">Luxury real-estate digital twin · portfolio case</p>
          <h1 id="sales-title">Turn an architectural concept into an investor-ready interactive property story.</h1>
          <p className="sales-hero__lead">
            A focused prototype for developers and presentation teams who need more than static renders: a navigable 3D asset, room-linked metadata, presentation controls and a reproducible proof chain.
          </p>
          <div className="sales-hero__actions">
            <a className="cta cta--primary" href="#viewer">Explore the live twin</a>
            <a className="cta cta--secondary" href="#pilot">See the 5-day pilot</a>
          </div>
        </div>

        <div className="sales-hero__proof" aria-label="Verified project proof">
          <p className="sales-hero__proof-label">Verified in this case</p>
          <div className="proof-grid">
            {PROOFS.map(([value, label]) => (
              <div className="proof-card" key={value}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="sales-hero__boundary">
            Portfolio prototype only — not BIM, engineering, construction documentation or valuation.
          </p>
        </div>
      </section>

      <section className="case-story" aria-label="Developer case story">
        <article>
          <p className="eyebrow">The problem</p>
          <h2>Static images explain appearance. They do not prove the experience.</h2>
          <p>
            For a premium property pitch, a buyer or investor may need to understand spatial relationships, compare presentation variants and move between important zones without decoding a drawing set.
          </p>
        </article>
        <article>
          <p className="eyebrow">The response</p>
          <h2>One bounded digital-twin path, with evidence attached.</h2>
          <p>
            This case connects native Blender generation to a verified GLB, room anchors, gated visual development, a Three.js presentation layer and live browser QA. Each proof reduces the amount of trust required from the next step.
          </p>
        </article>
      </section>

      <section className="pilot-card" id="pilot" aria-labelledby="pilot-title">
        <div>
          <p className="eyebrow">Bounded engagement</p>
          <h2 id="pilot-title">Request a 5-day digital twin pilot</h2>
          <p>
            A small first engagement to test whether one property concept can become a useful interactive presentation before committing to a larger visualization programme.
          </p>
        </div>

        <div className="pilot-card__scope">
          <div><strong>01</strong><span>One property concept or one priority zone</span></div>
          <div><strong>02</strong><span>Blender → GLB → web viewer path</span></div>
          <div><strong>03</strong><span>Core interaction and room-linked metadata</span></div>
          <div><strong>04</strong><span>QA receipt with explicit claim boundaries</span></div>
        </div>

        <div className="pilot-card__action">
          <a className="cta cta--primary" href={PILOT_URL} target="_blank" rel="noreferrer">
            Request a 5-day pilot
          </a>
          <p>GitHub Issues is public. Do not include confidential plans, credentials or client materials in the request.</p>
        </div>
      </section>
    </>
  );
}

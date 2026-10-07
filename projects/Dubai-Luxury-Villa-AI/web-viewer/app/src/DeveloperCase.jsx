import './DeveloperCase.css';

const media = `${import.meta.env.BASE_URL}editorial/`;

/** Introduce the custom visualisation service while presenting this villa as a portfolio concept. */
export default function DeveloperCase({ onEnter }) {
  return (
    <section className="sales-hero sales-hero--service" aria-labelledby="sales-title" id="residence">
      <div className="sales-hero__copy">
        <div className="sales-hero__main">
          <h1 id="sales-title">Dubai residence.</h1>
        </div>
        <div className="hero-aside">
          <p className="sales-hero__lead">Interior concepts and interactive 3D visualisation.</p>
          <div className="sales-hero__actions">
            <button className="sales-hero__primary" type="button" onClick={onEnter}>Explore in 3D <span aria-hidden="true">↗</span></button>
            <a className="sales-hero__secondary" href="#contact">Contact us</a>
          </div>
        </div>
      </div>
      <div className="hero-image">
        <picture>
          <source type="image/webp" srcSet={`${media}residence-800.webp 800w, ${media}residence-1600.webp 1600w`} sizes="(max-width: 700px) 100vw, 94vw" />
          <img src={`${media}residence-1600.webp`} width="1600" height="900" fetchPriority="high" alt="Concept visualisation of a warm stone villa, glazed living spaces and a reflecting pool at evening" />
        </picture>
      </div>
      <div className="hero-foot"><span>Concept study · Not a completed property.</span></div>
    </section>
  );
}

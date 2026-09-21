const media = `${import.meta.env.BASE_URL}editorial/`;

export default function DeveloperCase({ onEnter }) {
  return (
    <section className="sales-hero" aria-labelledby="sales-title" id="residence">
      <div className="hero-index"><span>Selected residence / 001</span><span>Dubai, UAE · Concept study</span></div>
      <div className="sales-hero__copy">
        <h1 id="sales-title">Desert,<br /><em>distilled.</em></h1>
        <div className="hero-aside">
          <p className="sales-hero__lead">An exploration of light, material<br className="desktop-break" /> and the art of living slowly.</p>
          <div className="sales-hero__actions"><a className="text-link" href="#spaces">Discover the residence <span aria-hidden="true">↘</span></a></div>
        </div>
      </div>
      <div className="hero-image">
        <picture>
          <source type="image/webp" srcSet={`${media}residence-800.webp 800w, ${media}residence-1600.webp 1600w`} sizes="(max-width: 700px) 100vw, 94vw" />
          <img src={`${media}residence-1600.webp`} width="1600" height="900" fetchPriority="high" alt="Warm stone villa, glazed living spaces and a reflecting pool in evening light" />
        </picture>
        <div className="hero-image__caption"><span>01 / THE RESIDENCE</span><span>Stone. Shade. Stillness.</span></div>
        <button className="hero-enter" type="button" onClick={onEnter}><span className="hero-enter__icon" aria-hidden="true">↗</span><span>Enter the residence<small>Explore in 3D</small></span></button>
      </div>
      <div className="hero-foot"><span>Architecture & interiors</span><span>A continuous dialogue between inside and out</span><a href="#spaces" aria-label="Scroll to the spaces">↓</a></div>
    </section>
  );
}

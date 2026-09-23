import './DeveloperCase.css';

const media = `${import.meta.env.BASE_URL}editorial/`;

const possibilities = [
  {
    number: '01',
    title: 'Find the direction',
    description: 'Turn your references and priorities into a considered mood, palette and spatial idea.',
  },
  {
    number: '02',
    title: 'See the space',
    description: 'Visualise the key views so the atmosphere and proportions are easier to discuss.',
  },
  {
    number: '03',
    title: 'Compare the choices',
    description: 'Explore finishes and lighting where a 3D study helps you decide what feels right.',
  },
];

/** Introduce the custom visualisation service while presenting this villa as a portfolio concept. */
export default function DeveloperCase({ onEnter }) {
  return (
    <section className="sales-hero sales-hero--service" aria-labelledby="sales-title" id="residence">
      <div className="hero-index"><span>Architectural AI Lab / Interior concepts & 3D visualisation</span><span>Dubai residence / Portfolio study 001</span></div>
      <div className="sales-hero__copy">
        <div className="sales-hero__main">
          <p className="eyebrow sales-hero__kicker">A design service for your space</p>
          <h1 id="sales-title"><span>See your space</span><em>come to life.</em></h1>
        </div>
        <div className="hero-aside">
          <p className="sales-hero__lead">Custom interior concepts and 3D visualisations. Start with a kitchen or one room; this villa shows the possibilities.</p>
          <div className="sales-hero__actions">
            <a className="sales-hero__primary" href="#brief">Start your project <span aria-hidden="true">↗</span></a>
            <a className="sales-hero__secondary" href="#film"><span aria-hidden="true">▷</span> Watch the 18-second film</a>
          </div>
        </div>
      </div>
      <div className="hero-image">
        <picture>
          <source type="image/webp" srcSet={`${media}residence-800.webp 800w, ${media}residence-1600.webp 1600w`} sizes="(max-width: 700px) 100vw, 94vw" />
          <img src={`${media}residence-1600.webp`} width="1600" height="900" fetchPriority="high" alt="Concept visualisation of a warm stone villa, glazed living spaces and a reflecting pool at evening" />
        </picture>
        <div className="hero-image__caption"><span>01 / DESERT, DISTILLED. · CONCEPT STUDY</span><span>Imagine the spaces around your life.</span></div>
        <button className="hero-enter" type="button" onClick={onEnter}><span className="hero-enter__icon" aria-hidden="true">↗</span><span>Enter the residence<small>Explore this study in 3D</small></span></button>
      </div>
      <div className="hero-foot"><span>This is a design study, not a completed property.</span><a href="#service" aria-label="Explore what we can create for your space">↓</a></div>
      <div className="service-offer" id="service" aria-labelledby="service-offer-title">
        <div className="service-offer__intro">
          <p className="eyebrow">What we can create</p>
          <h2 id="service-offer-title">One room is<br /><em>enough to begin.</em></h2>
          <p>Bring a space, a few references and what matters to you. Together we can define the concept and the views that will make your next decision clearer.</p>
        </div>
        <div className="service-offer__details">
          <div className="service-offer__steps">
            {possibilities.map(({ number, title, description }) => (
              <div className="service-offer__step" key={number}>
                <span aria-hidden="true">{number}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </div>
            ))}
          </div>
          <p className="service-offer__scope">The scope and final set of visuals are agreed around your brief.</p>
          <a className="service-offer__link" href="#brief">Tell us about your space <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}

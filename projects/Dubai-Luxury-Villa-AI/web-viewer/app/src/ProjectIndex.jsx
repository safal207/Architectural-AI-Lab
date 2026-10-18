import './ProjectIndex.css';

export default function ProjectIndex() {
  return (
    <section className="project-index section-wrap" id="projects" aria-labelledby="projects-title">
      <div className="project-index__intro"><p className="eyebrow">From the lab</p><h2 id="projects-title">Another world<br /><em>to explore.</em></h2><p>Open-source studies in procedural architecture and interactive spaces.</p></div>
      <a className="project-index__card" href={`${import.meta.env.BASE_URL}athenaion/?lang=en`}>
        <img src={`${import.meta.env.BASE_URL}editorial/athenaion.webp`} alt="Athenaion: an ancient Greek temple above a cliffside city" width="1280" height="720" loading="lazy" />
        <div><span className="eyebrow">Three.js · Open-source adaptation</span><h3>Athenaion <span aria-hidden="true">↗</span></h3><p>Nine views of a world written in code. Explore the gallery or enter the interactive scene.</p><span className="project-index__credit">Original world and render: Leon Lin, MIT. Gallery, controls and publishing: Architectural AI Lab.</span></div>
      </a>
    </section>
  );
}

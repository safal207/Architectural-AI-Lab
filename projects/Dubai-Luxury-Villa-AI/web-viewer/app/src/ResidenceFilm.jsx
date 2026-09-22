import './ResidenceFilm.css';

const media = `${import.meta.env.BASE_URL}media/`;

export default function ResidenceFilm() {
  return (
    <section className="residence-film section-wrap" id="film" aria-labelledby="film-title">
      <header className="residence-film__intro">
        <div>
          <p className="residence-film__label">The residence in motion</p>
          <h2 id="film-title">A moment <em>at home.</em></h2>
        </div>
        <p id="film-description">Stone, water and evening light. An 18-second journey around the villa, with an original ambient soundtrack.</p>
      </header>
      <figure>
        <video
          className="residence-film__player"
          controls
          playsInline
          preload="none"
          width="1280"
          height="720"
          poster={`${media}desert-distilled-poster-v1.jpg`}
          aria-label="Desert, distilled — residence film"
          aria-describedby="film-description"
        >
          <source src={`${media}desert-distilled-film-v1.mp4`} type="video/mp4" />
          <a href={`${media}desert-distilled-film-v1.mp4`}>Watch the residence film</a>
        </video>
        <figcaption className="residence-film__caption">
          <span>Desert, distilled.</span>
          <span>Press play for picture & sound</span>
        </figcaption>
      </figure>
    </section>
  );
}

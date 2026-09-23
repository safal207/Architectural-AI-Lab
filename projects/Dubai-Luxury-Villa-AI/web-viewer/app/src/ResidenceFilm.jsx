import { useRef, useState } from 'react';
import './ResidenceFilm.css';

const media = `${import.meta.env.BASE_URL}media/`;

export default function ResidenceFilm() {
  const player = useRef(null);
  const [playing, setPlaying] = useState(false);

  /** Start sound and motion only after an explicit visitor action; native video controls remain available. */
  async function playFilm() {
    try { await player.current?.play(); }
    catch { player.current?.focus(); }
  }

  return (
    <section className="residence-film section-wrap" id="film" aria-labelledby="film-title">
      <header className="residence-film__intro">
        <div>
          <p className="residence-film__label">The idea in motion / 18 seconds</p>
          <h2 id="film-title">Picture an evening <em>here.</em></h2>
        </div>
        <p id="film-description">See the Dubai residence concept through stone, water and evening light. Press play to watch and hear the short film.</p>
      </header>
      <figure>
        <div className="residence-film__frame">
          <video
            ref={player}
            className="residence-film__player"
            controls
            playsInline
            preload="none"
            width="1280"
            height="720"
            poster={`${media}desert-distilled-poster-v1.jpg`}
            aria-label="Desert, distilled — residence concept film"
            aria-describedby="film-description"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          >
            <source src={`${media}desert-distilled-film-v1.mp4`} type="video/mp4" />
            <a href={`${media}desert-distilled-film-v1.mp4`}>Watch the residence concept film</a>
          </video>
          {!playing && <button className="residence-film__play" type="button" onClick={playFilm} aria-label="Play the 18-second residence concept film">
            <span className="residence-film__play-icon" aria-hidden="true">▶</span>
            <span>Watch the film<small>18 seconds · sound on play</small></span>
          </button>}
        </div>
        <figcaption className="residence-film__caption">
          <span>Desert, distilled. / Portfolio concept</span>
          <span>Visualisation of an imagined residence</span>
        </figcaption>
      </figure>
      <div className="residence-film__next"><p>Want to see your own space this clearly?</p><a href="#brief">Tell us about your project <span aria-hidden="true">↗</span></a></div>
    </section>
  );
}
